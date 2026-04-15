import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/core/supabase/client';
import type { Shop, User } from '@/core/types/models';
import { inviteStaffViaEdge } from '@/modules/owner/inviteStaffEdge';

type StaffRow = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
};

const ASSIGNABLE_ROLES = ['tech', 'manager', 'supervisor', 'admin'] as const;

interface StaffTeamPanelProps {
  shop: Shop;
  currentUserId: string;
}

/**
 * Lists staff in the current shop, invites new staff via Edge Function, and updates roles (RLS).
 */
export default function StaffTeamPanel({ shop, currentUserId }: StaffTeamPanelProps) {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('tech');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<{ temporary_password?: string; email: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('users')
        .select('user_id, name, email, role, active')
        .eq('shop_id', shop.shop_id)
        .order('name');

      if (qErr) throw qErr;
      setRows((data as StaffRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [shop.shop_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRole = async (userId: string, role: string) => {
    setError(null);
    try {
      const { error: uErr } = await supabase
        .from('users')
        .update({ role: role as User['role'] })
        .eq('user_id', userId);
      if (uErr) throw uErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const toggleActive = async (userId: string, active: boolean) => {
    setError(null);
    try {
      const { error: uErr } = await supabase.from('users').update({ active }).eq('user_id', userId);
      if (uErr) throw uErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteSuccess(null);
    const email = inviteEmail.trim();
    if (!email) {
      setError('Email is required.');
      return;
    }
    if (invitePassword && invitePassword.length < 8) {
      setError('Password must be at least 8 characters, or leave blank for an auto-generated one.');
      return;
    }
    setInviteBusy(true);
    try {
      const result = await inviteStaffViaEdge({
        email,
        role: inviteRole,
        name: inviteName.trim() || undefined,
        password: invitePassword || undefined,
        shop_id: shop.shop_id,
      });
      setInviteSuccess({
        email: result.email,
        temporary_password: result.temporary_password,
      });
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className="bg-white rounded shadow p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Team &amp; roles</h3>
        <p className="text-sm text-gray-600 mt-1">
          Owners and managers can invite staff via the <code className="text-xs bg-gray-100 px-1 rounded">invite-staff</code>{' '}
          Edge Function (deploy it to your Supabase project). Alternatively run{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">npm run invite:staff</code> from a trusted machine with the service
          role key.
        </p>
      </div>

      <form onSubmit={submitInvite} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-900">Invite user</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">Email</label>
            <input
              type="email"
              className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm"
              value={inviteEmail}
              onChange={(ev) => setInviteEmail(ev.target.value)}
              disabled={inviteBusy}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Display name (optional)</label>
            <input
              type="text"
              className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm"
              value={inviteName}
              onChange={(ev) => setInviteName(ev.target.value)}
              disabled={inviteBusy}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Role</label>
            <select
              className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm"
              value={inviteRole}
              onChange={(ev) => setInviteRole(ev.target.value)}
              disabled={inviteBusy}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Password (optional, min 8)</label>
            <input
              type="password"
              className="mt-0.5 w-full border rounded px-2 py-1.5 text-sm"
              value={invitePassword}
              onChange={(ev) => setInvitePassword(ev.target.value)}
              disabled={inviteBusy}
              placeholder="Auto-generated if empty"
              autoComplete="new-password"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={inviteBusy}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {inviteBusy ? 'Sending invite…' : 'Send invite'}
        </button>
      </form>

      {inviteSuccess && (
        <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded p-3 space-y-1">
          <p>Invited {inviteSuccess.email}.</p>
          {inviteSuccess.temporary_password ? (
            <p>
              Temporary password (copy now; not shown again):{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border text-green-900">{inviteSuccess.temporary_password}</code>
            </p>
          ) : (
            <p>They can sign in with the password you set.</p>
          )}
        </div>
      )}

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded p-2">{error}</div>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500 text-sm">No users in this shop yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSelf = r.user_id === currentUserId;
                const isOwnerRole = r.role === 'owner';
                return (
                  <tr key={r.user_id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-900">{r.name}</td>
                    <td className="py-2 pr-4 text-gray-600">{r.email ?? '—'}</td>
                    <td className="py-2 pr-4">
                      {isOwnerRole ? (
                        <span className="text-gray-700">owner</span>
                      ) : (
                        <select
                          className="border rounded px-2 py-1"
                          value={ASSIGNABLE_ROLES.includes(r.role as (typeof ASSIGNABLE_ROLES)[number]) ? r.role : 'tech'}
                          disabled={isSelf}
                          onChange={(ev) => void updateRole(r.user_id, ev.target.value)}
                        >
                          {ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={r.active}
                        disabled={isSelf}
                        onChange={(ev) => void toggleActive(r.user_id, ev.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
