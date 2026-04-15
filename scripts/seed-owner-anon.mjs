/**
 * Creates demo owner: signUp (or signIn), then creates shop/location using the session (RLS).
 * Requires: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const DEMO_EMAIL = 'owner@shoplogic.test';
const DEMO_PASSWORD = 'ShopLogic-Owner-Test-2026!';

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

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  let { error: upErr } = await supabase.auth.signUp({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    options: { data: { name: 'Demo Owner', role: 'owner' } },
  });
  if (upErr && !String(upErr.message).toLowerCase().includes('already')) {
    console.warn('signUp note:', upErr.message);
  }

  const { data: sessionData, error: inErr } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (inErr || !sessionData.user) {
    console.error('Sign-in failed:', inErr?.message);
    console.error('If the user is new, disable email confirmation (Auth → Providers → Email) for dev, or use npm run seed:owner with SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const userId = sessionData.user.id;

  const { data: profile, error: pErr } = await supabase.from('users').select('user_id, shop_id').eq('user_id', userId).maybeSingle();
  if (pErr) throw pErr;

  if (!profile) {
    const { error: insErr } = await supabase.from('users').insert({
      user_id: userId,
      name: 'Demo Owner',
      role: 'owner',
      email: DEMO_EMAIL,
      labor_rate: 75,
      active: true,
    });
    if (insErr) throw insErr;
  } else {
    await supabase.from('users').update({ email: DEMO_EMAIL, role: 'owner', name: 'Demo Owner', active: true }).eq('user_id', userId);
  }

  const { data: row } = await supabase.from('users').select('shop_id').eq('user_id', userId).single();
  let shopId = row?.shop_id;

  if (!shopId) {
    const { data: shop, error: sErr } = await supabase
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
    if (sErr) throw sErr;
    shopId = shop.shop_id;
  }

  const { data: locs } = await supabase.from('locations').select('location_id').eq('shop_id', shopId).limit(1);
  let locationId = locs?.[0]?.location_id;

  if (!locationId) {
    const { data: loc, error: lErr } = await supabase
      .from('locations')
      .insert({ shop_id: shopId, name: 'Main', is_default: true, active: true })
      .select('location_id')
      .single();
    if (lErr) throw lErr;
    locationId = loc.location_id;
  }

  const { error: linkErr } = await supabase
    .from('users')
    .update({ shop_id: shopId, default_location_id: locationId })
    .eq('user_id', userId);
  if (linkErr) throw linkErr;

  await supabase.auth.signOut();

  console.log('\n--- Demo owner ---');
  console.log('Email:   ', DEMO_EMAIL);
  console.log('Password:', DEMO_PASSWORD);
  console.log('------------------\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
