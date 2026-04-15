/**
 * Invite a staff member: creates Auth user + links public.users to the inviter's shop.
 * Deploy: supabase functions deploy invite-staff --no-verify-jwt is NOT used; verify_jwt stays on.
 *
 * Secrets: auto-injected SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVITE_ROLES = ['tech', 'manager', 'supervisor', 'admin'] as const;
type InviteRole = (typeof INVITE_ROLES)[number];

const MANAGER_ROLES = ['owner', 'admin', 'manager', 'supervisor'] as const;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateTempPassword(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `ShopLogic-${hex}!`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: 'Server configuration error' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'Missing or invalid Authorization header' });
  }

  let body: { email?: string; role?: string; name?: string; password?: string; shop_id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const roleRaw = typeof body.role === 'string' ? body.role.trim().toLowerCase() : 'tech';
  const displayName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : email.split('@')[0] || 'Staff';
  const passwordIn = typeof body.password === 'string' && body.password.length >= 8 ? body.password : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Valid email is required' });
  }

  if (!INVITE_ROLES.includes(roleRaw as InviteRole)) {
    return json(400, { error: `Role must be one of: ${INVITE_ROLES.join(', ')}` });
  }
  const role = roleRaw as InviteRole;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: authUser },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !authUser) {
    return json(401, { error: 'Invalid session' });
  }

  const { data: inviter, error: inviterErr } = await userClient
    .from('users')
    .select('user_id, shop_id, role')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (inviterErr || !inviter) {
    return json(403, { error: 'No staff profile for this account' });
  }

  if (!MANAGER_ROLES.includes(inviter.role as (typeof MANAGER_ROLES)[number]) || !inviter.shop_id) {
    return json(403, { error: 'Only shop managers can invite staff' });
  }

  const targetShopId = typeof body.shop_id === 'string' && body.shop_id ? body.shop_id : inviter.shop_id;
  if (targetShopId !== inviter.shop_id) {
    return json(403, { error: 'You can only invite users to your own shop' });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: loc, error: locErr } = await admin
    .from('locations')
    .select('location_id')
    .eq('shop_id', targetShopId)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (locErr) {
    return json(500, { error: locErr.message });
  }
  if (!loc?.location_id) {
    return json(400, { error: 'No active location for this shop. Add a location first.' });
  }

  const password = passwordIn || generateTempPassword();
  const generatedPassword = passwordIn ? undefined : password;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: displayName, role },
  });

  if (createErr) {
    const msg = createErr.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return json(409, { error: 'An account with this email already exists' });
    }
    return json(400, { error: createErr.message });
  }

  const newUserId = created.user.id;

  const { error: upErr } = await admin
    .from('users')
    .update({
      shop_id: targetShopId,
      role,
      name: displayName,
      email,
      active: true,
      default_location_id: loc.location_id,
    })
    .eq('user_id', newUserId);

  if (upErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return json(500, { error: upErr.message });
  }

  const { error: ulErr } = await admin.from('user_locations').insert({
    user_id: newUserId,
    location_id: loc.location_id,
    can_assign_jobs: true,
    active: true,
  });

  if (ulErr) {
    const dup = String(ulErr.message || '').toLowerCase().includes('duplicate');
    if (!dup) {
      await admin.auth.admin.deleteUser(newUserId);
      return json(500, { error: ulErr.message });
    }
  }

  return json(200, {
    user_id: newUserId,
    email,
    role,
    temporary_password: generatedPassword,
    message: generatedPassword
      ? 'User created. Share the temporary password securely; they should change it after first login.'
      : 'User created.',
  });
});
