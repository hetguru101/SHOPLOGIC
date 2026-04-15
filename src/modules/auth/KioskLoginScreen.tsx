import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { supabase } from '@/core/supabase/client';
import { User } from '@/core/types/models';

export default function KioskLoginScreen() {
  const { loginWithTechId, loading: authLoading } = useAuth();
  const [techs, setTechs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Fetch active techs
  useEffect(() => {
    const fetchTechs = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('active', true)
          .in('role', ['tech', 'manager', 'admin']);

        if (error) throw error;
        setTechs((data as User[]) || []);
      } catch (err) {
        console.error('Error fetching techs:', err);
        setError('Failed to load technicians');
      } finally {
        setLoading(false);
      }
    };

    fetchTechs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchTechs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleTechSelect = (tech: User) => {
    setSelectedTech(tech);
    setPin('');
    setError('');
  };

  const handlePINEntry = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handlePinClear = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = async () => {
    if (!selectedTech) {
      setError('Please select a technician');
      return;
    }

    // Validate PIN if required
    if (selectedTech.pin && pin !== selectedTech.pin) {
      setError('Invalid PIN');
      setPin('');
      return;
    }

    try {
      await loginWithTechId(selectedTech.user_id);
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    }
  };

  if (loading) {
    return (
      <div className="flex-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg">Loading ShopLogic...</p>
        </div>
      </div>
    );
  }

  // PIN entry screen
  if (selectedTech) {
    return (
      <div className="flex-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <button
            onClick={() => {
              setSelectedTech(null);
              setPin('');
              setError('');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm mb-4"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-bold text-center mb-2">{selectedTech.name}</h1>
          <p className="text-center text-gray-600 mb-6">Enter PIN (or leave blank)</p>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          {selectedTech.pin && (
            <>
              <div className="bg-gray-100 rounded p-4 mb-6 text-center">
                <div className="text-4xl font-mono tracking-widest">{pin.replace(/./g, '●') || '−'}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handlePINEntry(digit.toString())}
                    disabled={pin.length >= 6}
                    className="text-touch bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    {digit}
                  </button>
                ))}

                <button
                  onClick={() => handlePINEntry('0')}
                  disabled={pin.length >= 6}
                  className="col-span-2 text-touch bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  0
                </button>

                <button
                  onClick={handlePinClear}
                  className="text-touch bg-red-600 text-white rounded hover:bg-red-700"
                >
                  ← Delete
                </button>
              </div>
            </>
          )}

          <button
            onClick={handleLogin}
            disabled={authLoading || (!!selectedTech?.pin && pin.length !== selectedTech.pin.length)}
            className="w-full text-touch btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  // Tech selection screen
  return (
    <div className="flex-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-white text-center mb-2">ShopLogic</h1>
        <p className="text-blue-100 text-center mb-8">Class 8 Diesel Truck & Trailer Repair</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {techs.map((tech) => (
            <button
              key={tech.user_id}
              onClick={() => handleTechSelect(tech)}
              className="text-touch bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 shadow-lg hover:shadow-xl transition-shadow p-6 text-center"
            >
              <div className="text-2xl">👤</div>
              <div className="mt-2">{tech.name}</div>
            </button>
          ))}
        </div>

        {techs.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 text-lg">No active technicians found</p>
            <p className="text-gray-500 text-sm mt-2">Contact your administrator</p>
          </div>
        )}
      </div>
    </div>
  );
}
