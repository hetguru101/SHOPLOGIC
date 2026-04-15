/**
 * Creates a demo Supabase Auth user + shop + default location, and links public.users.
 *
 * Requires in .env.local (or environment):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Dashboard → Settings → API → service_role — never ship to clients)
 *
 * Run: npm run seed:owner
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const DEMO_EMAIL = 'owner@shoplogic.test';
const DEMO_PASSWORD = 'ShopLogic-Owner-Test-2026!';
const KIOSK_EMAIL = 'floor.kiosk@shoplogic.test';
/** Same Auth password as owner for local demo; PIN is for kiosk name-card step only. */
const DEMO_TECH_EMAIL = 'demo.kiosktech@shoplogic.test';
const DEMO_TECH_PIN = '1234';

function loadDotEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnvFile(resolve(root, '.env.local'));
loadDotEnvFile(resolve(root, '.env'));

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL (or SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env.local (from Supabase Dashboard → Settings → API).');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthStaffUser({ email, password, displayName, role }) {
  let userId = await findAuthUserIdByEmail(email);
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: displayName, role },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Created Auth user:', email);
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { name: displayName, role },
    });
    if (error) throw error;
    console.log('Updated Auth user:', email);
  }
  return userId;
}

async function linkStaffToShop(userId, shopId, locationId, profilePatch) {
  const { error } = await admin
    .from('users')
    .update({ shop_id: shopId, default_location_id: locationId, ...profilePatch })
    .eq('user_id', userId);
  if (error) throw error;

  const { data: ul } = await admin
    .from('user_locations')
    .select('user_location_id')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .maybeSingle();

  if (!ul) {
    const { error: ulErr } = await admin.from('user_locations').insert({
      user_id: userId,
      location_id: locationId,
      active: true,
    });
    if (ulErr) throw ulErr;
  }
}

async function findAuthUserIdByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  let userId = await findAuthUserIdByEmail(DEMO_EMAIL);

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: 'Demo Owner',
        role: 'owner',
      },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Created Auth user:', userId);
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Demo Owner', role: 'owner' },
    });
    if (error) throw error;
    console.log('Auth user already existed; password and metadata reset:', userId);
  }

  const { data: existingProfile, error: profErr } = await admin
    .from('users')
    .select('user_id, shop_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (profErr) throw profErr;

  if (!existingProfile) {
    const { error: insErr } = await admin.from('users').insert({
      user_id: userId,
      name: 'Demo Owner',
      role: 'owner',
      email: DEMO_EMAIL,
      labor_rate: 75,
      active: true,
    });
    if (insErr) throw insErr;
    console.log('Inserted public.users row (trigger may have failed or was added after user).');
  } else {
    const { error: upErr } = await admin
      .from('users')
      .update({ email: DEMO_EMAIL, role: 'owner', name: 'Demo Owner', active: true })
      .eq('user_id', userId);
    if (upErr) throw upErr;
  }

  let shopId = existingProfile?.shop_id ?? null;
  if (!shopId) {
    const { data: shop, error: shopErr } = await admin
      .from('shops')
      .insert({
        name: 'Demo Shop',
        owner_id: userId,
        email: DEMO_EMAIL,
        phone: '(555) 010-0000',
        address: '1 Main Street',
        active: true,
      })
      .select('shop_id')
      .single();
    if (shopErr) throw shopErr;
    shopId = shop.shop_id;
    console.log('Created shop:', shopId);
  } else {
    console.log('User already had shop_id:', shopId);
  }

  const { data: locs } = await admin.from('locations').select('location_id').eq('shop_id', shopId).limit(1);
  let locationId = locs?.[0]?.location_id ?? null;

  if (!locationId) {
    const { data: loc, error: locErr } = await admin
      .from('locations')
      .insert({
        shop_id: shopId,
        name: 'Main',
        is_default: true,
        active: true,
      })
      .select('location_id')
      .single();
    if (locErr) throw locErr;
    locationId = loc.location_id;
    console.log('Created default location:', locationId);
  }

  const { error: linkErr } = await admin
    .from('users')
    .update({ shop_id: shopId, default_location_id: locationId })
    .eq('user_id', userId);
  if (linkErr) throw linkErr;

  const kioskAuthId = await ensureAuthStaffUser({
    email: KIOSK_EMAIL,
    password: DEMO_PASSWORD,
    displayName: 'Floor Kiosk',
    role: 'kiosk',
  });
  await linkStaffToShop(kioskAuthId, shopId, locationId, {
    email: KIOSK_EMAIL,
    role: 'kiosk',
    name: 'Floor Kiosk',
    active: true,
  });

  const demoTechAuthId = await ensureAuthStaffUser({
    email: DEMO_TECH_EMAIL,
    password: DEMO_PASSWORD,
    displayName: 'Demo Kiosk Tech',
    role: 'tech',
  });
  await linkStaffToShop(demoTechAuthId, shopId, locationId, {
    email: DEMO_TECH_EMAIL,
    role: 'tech',
    name: 'Demo Kiosk Tech',
    pin: DEMO_TECH_PIN,
    active: true,
    labor_rate: 75,
  });

  console.log('\n--- Demo owner (use on Login screen) ---');
  console.log('Email:   ', DEMO_EMAIL);
  console.log('Password:', DEMO_PASSWORD);
  console.log('Floor kiosk (shop terminal):', KIOSK_EMAIL, '/', DEMO_PASSWORD);
  console.log('Demo tech (name card + PIN):', DEMO_TECH_EMAIL, '— PIN:', DEMO_TECH_PIN);
  console.log('Optional: npm run seed:platform-owner → owner without a shop (in-app "Create your shop" wizard).');
  console.log('----------------------------------------\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
