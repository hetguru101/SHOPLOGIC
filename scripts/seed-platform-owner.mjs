/**
 * Creates an owner Auth user + public.users row with no shop_id so the in-app
 * "Create your shop" wizard can run (RLS-safe bootstrap).
 *
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run seed:platform-owner
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const DEMO_EMAIL = 'owner.bootstrap@shoplogic.test';
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
loadDotEnvFile(resolve(root, '.env'));

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL (or SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
        name: 'Platform Owner',
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
      user_metadata: { name: 'Platform Owner', role: 'owner' },
    });
    if (error) throw error;
    console.log('Auth user already existed; password reset:', userId);
  }

  const { data: existingProfile, error: profErr } = await admin
    .from('users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (profErr) throw profErr;

  if (!existingProfile) {
    const { error: insErr } = await admin.from('users').insert({
      user_id: userId,
      name: 'Platform Owner',
      role: 'owner',
      email: DEMO_EMAIL,
      labor_rate: 75,
      active: true,
      shop_id: null,
      default_location_id: null,
    });
    if (insErr) throw insErr;
  } else {
    const { error: upErr } = await admin
      .from('users')
      .update({
        email: DEMO_EMAIL,
        role: 'owner',
        name: 'Platform Owner',
        active: true,
        shop_id: null,
        default_location_id: null,
      })
      .eq('user_id', userId);
    if (upErr) throw upErr;
  }

  const { error: delUl } = await admin.from('user_locations').delete().eq('user_id', userId);
  if (delUl) throw delUl;

  console.log('\n--- Bootstrap owner (use wizard after login) ---');
  console.log('Email:   ', DEMO_EMAIL);
  console.log('Password:', DEMO_PASSWORD);
  console.log('-----------------------------------------------\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
