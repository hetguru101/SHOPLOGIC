import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { supabase } from '@/core/supabase/client';
import type { User } from '@/core/types/models';

/**
 * Shop floor terminal: signed-in `kiosk` user picks a technician, optional PIN is verified server-side,
 * then `enterFloorSession` opens the work-order view without per-tech Supabase Auth.
 */
export default function KioskLoginScreen() {
  const { user, enterFloorSession, logout } = useAuth();
  const [techs, setTechs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadTechs = useCallback(async () => {
    if (!user?.shop_id) return;
    const { data, error: qErr } = await supabase
      .from('users')
      .select('*')
      .eq('shop_id', user.shop_id)
      .eq('role', 'tech')
      .eq('active', true)
      .order('name');

    if (qErr) throw qErr;
    setTechs((data as User[]) ?? []);
  }, [user?.shop_id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadTechs();
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError('Failed to load technicians');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTechs]);

  useEffect(() => {
    const channel = supabase
      .channel('kiosk-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        void loadTechs();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [loadTechs]);

  const confirmTech = async () => {
    if (!selectedTech) {
      setError('Select a technician');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('kiosk_verify_tech', {
        p_tech_id: selectedTech.user_id,
        p_pin: pin,
      });

      if (rpcErr) throw rpcErr;

      const result = data as { ok?: boolean; error?: string } | null;
      if (!result?.ok) {
        setError(result?.error === 'bad_pin' ? 'Invalid PIN' : result?.error || 'Verification failed');
        setPin('');
        return;
      }

      enterFloorSession(selectedTech);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
          <p className="text-lg">Loading kiosk…</p>
        </div>
      </div>
    );
  }

  if (selectedTech) {
    const needsPin = !!(selectedTech.pin && selectedTech.pin.trim());

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <button
            type="button"
            onClick={() => {
              setSelectedTech(null);
              setPin('');
              setError('');
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-4"
          >
            ← Back to roster
          </button>

          <h1 className="text-2xl font-bold text-center text-gray-900">{selectedTech.name}</h1>
          <p className="text-center text-gray-600 text-sm mt-1 mb-6">
            {needsPin ? 'Enter your PIN to open your work orders.' : 'Continue to your open work orders.'}
          </p>

          {error && <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded mb-4">{error}</div>}

          {needsPin && (
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-center text-lg tracking-widest"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={busy}
            />
          )}

          <button
            type="button"
            onClick={() => void confirmTech()}
            disabled={busy || (needsPin && !pin.trim())}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-800 to-slate-950 p-4">
      <header className="max-w-5xl mx-auto w-full flex justify-between items-center py-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Shop floor</h1>
          <p className="text-slate-300 text-sm">Tap your name, then enter your PIN if you have one.</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 text-sm font-medium"
        >
          Log out terminal
        </button>
      </header>

      <main className="max-w-5xl mx-auto w-full flex-1">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded mb-6 text-center">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {techs.map((tech) => (
            <button
              key={tech.user_id}
              type="button"
              onClick={() => {
                setSelectedTech(tech);
                setPin('');
                setError('');
              }}
              className="rounded-xl bg-white/95 text-slate-900 font-semibold shadow-lg hover:shadow-xl hover:bg-white transition p-6 text-center min-h-[100px] flex flex-col items-center justify-center"
            >
              <span className="text-2xl" aria-hidden>
                👤
              </span>
              <span className="mt-2">{tech.name}</span>
              {tech.pin ? <span className="text-xs text-slate-500 mt-1">PIN required</span> : null}
            </button>
          ))}
        </div>

        {techs.length === 0 && (
          <div className="bg-white/10 rounded-xl p-8 text-center text-slate-200 mt-8">
            <p className="text-lg">No active technicians for this shop.</p>
            <p className="text-sm mt-2 text-slate-400">Ask an owner or manager to add techs.</p>
          </div>
        )}
      </main>
    </div>
  );
}
