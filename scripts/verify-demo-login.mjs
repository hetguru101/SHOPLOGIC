/**
 * Diagnose demo login: same sign-in the browser uses, plus optional Auth user listing.
 *
 * Loads: .env.local then .env (same as seed scripts).
 *
 * Run: npm run verify:demo-login
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
loadDotEnvFile(resolve(root, '.env'));

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function mask(s) {
  if (!s || s.length < 12) return s ? '(set)' : '(missing)';
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

async function main() {
  console.log('--- ShopLogic verify:demo-login ---\n');
  console.log('VITE_SUPABASE_URL:     ', url || '(missing)');
  console.log('VITE_SUPABASE_ANON_KEY:', mask(anonKey));
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? mask(serviceKey) : '(missing — seed scripts will not work)\n');

  if (!url || !anonKey) {
    console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await anonClient.auth.signInWithPassword({
    email: DEMO_EMAIL.toLowerCase(),
    password: DEMO_PASSWORD,
  });

  if (error) {
    console.error('signInWithPassword failed:', error.message);
    console.error('\nTypical fixes:');
    console.error('  1. In Supabase Dashboard → Authentication → Users, confirm the account exists.');
    console.error('  2. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Settings → API → Secret / service_role).');
    console.error('  3. Run: npm run seed:owner   (creates demo users and resets password)');
    console.error('     or: npm run seed:platform-owner   (bootstrap owner only)\n');

    if (serviceKey) {
      const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) {
        console.error('Could not list Auth users (check service role key):', listErr.message);
      } else {
        const found = list.users.filter((u) => u.email?.toLowerCase() === DEMO_EMAIL);
        console.error(`Auth users matching ${DEMO_EMAIL}:`, found.length ? found.map((u) => u.id).join(', ') : 'none');
      }
    }
    process.exit(1);
  }

  console.log('signInWithPassword: OK');
  console.log('User id:', data.user?.id);
  await anonClient.auth.signOut();
  console.log('\nDemo credentials work for this project. If the browser still fails, restart Vite (npm run dev).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
