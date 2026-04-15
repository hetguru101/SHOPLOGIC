/**
 * Creates a Supabase Auth user and links public.users to an existing shop (service role).
 * Prefer the deployed Edge Function `invite-staff` from the app UI when available.
 *
 * Usage:
 *   node scripts/invite-staff.mjs --email tech1@shop.test --role tech --password 'TempPass123!'
 *
 * Optional: --shop-id <uuid> (defaults to shop of owner@shoplogic.test if present)
 *
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run invite:staff -- --email ... --role tech --password ...
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

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

function parseArgs() {
  const a = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--email') out.email = a[++i];
    else if (a[i] === '--role') out.role = a[++i];
    else if (a[i] === '--password') out.password = a[++i];
    else if (a[i] === '--shop-id') out.shopId = a[++i];
    else if (a[i] === '--name') out.name = a[++i];
  }
  return out;
}

const ROLES = new Set(['tech', 'manager', 'admin', 'supervisor', 'owner']);

async function main() {
  const { email, role, password, shopId: shopIdArg, name } = parseArgs();
  if (!url || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  if (!email || !password) {
    console.error('Usage: node scripts/invite-staff.mjs --email you@x.com --role tech --password "..." [--shop-id UUID] [--name "Display"]');
    process.exit(1);
  }
  const roleNorm = (role || 'tech').toLowerCase();
  if (!ROLES.has(roleNorm)) {
    console.error('Invalid --role. Use tech | manager | supervisor | admin | owner');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let shopId = shopIdArg || null;
  if (!shopId) {
    const anchorEmail = process.env.INVITE_SHOP_OWNER_EMAIL || 'owner@shoplogic.test';
    const { data: anchor, error: aErr } = await admin
      .from('users')
      .select('shop_id')
      .eq('email', anchorEmail)
      .maybeSingle();
    if (aErr) throw aErr;
    shopId = anchor?.shop_id ?? null;
  }
  if (!shopId) {
    console.error('Could not resolve shop_id. Pass --shop-id or set INVITE_SHOP_OWNER_EMAIL to a user with a shop.');
    process.exit(1);
  }

  const { data: loc, error: lErr } = await admin
    .from('locations')
    .select('location_id')
    .eq('shop_id', shopId)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (lErr) throw lErr;
  const locationId = loc?.location_id;
  if (!locationId) {
    console.error('No active location for shop', shopId);
    process.exit(1);
  }

  const displayName = name || email.split('@')[0];

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: displayName, role: roleNorm },
  });
  if (cErr) throw cErr;
  const userId = created.user.id;

  const { error: uErr } = await admin
    .from('users')
    .update({
      shop_id: shopId,
      role: roleNorm,
      name: displayName,
      email,
      active: true,
      default_location_id: locationId,
    })
    .eq('user_id', userId);
  if (uErr) throw uErr;

  const { error: ulErr } = await admin.from('user_locations').insert({
    user_id: userId,
    location_id: locationId,
    can_assign_jobs: true,
    active: true,
  });
  if (ulErr && !String(ulErr.message || '').toLowerCase().includes('duplicate')) throw ulErr;

  console.log('Created staff user', userId, '→ shop', shopId, 'role', roleNorm);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
