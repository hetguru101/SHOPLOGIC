import { useState } from 'react';
import { supabase } from '@/core/supabase/client';
import { useAuth } from '@/core/hooks/useAuth';

const DEFAULT_SETTINGS_CONFIG = {
  default_labor_rate: 75,
  work_order_sequence: {
    format: 'WO-{YYYY}-{SEQUENCE}',
    next_number: 1001,
    reset_yearly: true,
  },
  tech_id_sequence: {
    format: 'T-{SEQUENCE}',
    next_number: 1,
    reset_yearly: false,
  },
  po_sequence: {
    format: 'PO-{YYYY}-{SEQUENCE}',
    next_number: 5001,
    reset_yearly: true,
  },
} as const;

/**
 * First shop + default location for an owner/admin with no `users.shop_id` yet.
 * Order: insert shop → link profile → insert location → user_locations → default settings row.
 */
export default function ShopOnboardingWizard() {
  const { user, refreshSession } = useAuth();
  const [shopName, setShopName] = useState('');
  const [businessEmail, setBusinessEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locationName, setLocationName] = useState('Main');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.user_id) {
      setError('Session expired. Sign in again.');
      return;
    }

    const name = shopName.trim();
    const email = businessEmail.trim();
    if (!name || !email) {
      setError('Shop name and business email are required.');
      return;
    }

    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || session.user.id !== user.user_id) {
        throw new Error('Not signed in.');
      }

      const { data: shopRow, error: shopErr } = await supabase
        .from('shops')
        .insert({
          name,
          owner_id: user.user_id,
          email,
          phone: phone.trim() || null,
          address: address.trim() || null,
          city: null,
          state: null,
          zip: null,
          active: true,
        })
        .select('shop_id')
        .single();

      if (shopErr) throw shopErr;
      const shopId = shopRow.shop_id as string;

      const { error: userErr } = await supabase.from('users').update({ shop_id: shopId }).eq('user_id', user.user_id);

      if (userErr) throw userErr;

      const { data: locRow, error: locErr } = await supabase
        .from('locations')
        .insert({
          shop_id: shopId,
          name: locationName.trim() || 'Main',
          address: null,
          city: null,
          state: null,
          zip: null,
          phone: null,
          manager_id: null,
          is_default: true,
          active: true,
        })
        .select('location_id')
        .single();

      if (locErr) throw locErr;
      const locationId = locRow.location_id as string;

      const { error: ulErr } = await supabase.from('user_locations').insert({
        user_id: user.user_id,
        location_id: locationId,
        can_assign_jobs: true,
        active: true,
      });

      if (ulErr) throw ulErr;

      const { error: defLocErr } = await supabase
        .from('users')
        .update({ default_location_id: locationId })
        .eq('user_id', user.user_id);

      if (defLocErr) throw defLocErr;

      const { error: settingsErr } = await supabase.from('settings').insert({
        shop_id: shopId,
        config: DEFAULT_SETTINGS_CONFIG,
      });

      if (settingsErr) throw settingsErr;

      const { error: markupErr } = await supabase.from('markup_matrix').insert([
        { shop_id: shopId, type: 'parts' as const, category: null, markup_percent: 25, active: true },
        { shop_id: shopId, type: 'sublet' as const, category: null, markup_percent: 20, active: true },
      ]);

      if (markupErr) throw markupErr;

      localStorage.setItem('shoplogic_location_id', locationId);
      await refreshSession();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create shop.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900">Create your shop</h1>
        <p className="text-gray-600 text-sm mt-2">
          You are signed in as an owner. Set up your first shop and default location to continue.
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded p-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Shop name</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={shopName}
              onChange={(ev) => setShopName(ev.target.value)}
              disabled={busy}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Business email (unique per shop)</label>
            <input
              type="email"
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={businessEmail}
              onChange={(ev) => setBusinessEmail(ev.target.value)}
              disabled={busy}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone (optional)</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address (optional)</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={address}
              onChange={(ev) => setAddress(ev.target.value)}
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">First location name</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={locationName}
              onChange={(ev) => setLocationName(ev.target.value)}
              disabled={busy}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create shop & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
