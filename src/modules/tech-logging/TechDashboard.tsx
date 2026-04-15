import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { supabase } from '@/core/supabase/client';
import { Job } from '@/core/types/models';

type RpcOk = { ok?: boolean; error?: string; log_id?: string };

export default function TechDashboard() {
  const { user, floorTech, logout, leaveFloorSession, currentLocation } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isKioskFloor = user?.role === 'kiosk' && floorTech !== null;
  const worker = isKioskFloor && floorTech ? floorTech : user;

  useEffect(() => {
    if (!worker) return;

    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('tech_id', worker.user_id)
          .eq('status', 'open')
          .eq('is_declined', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setJobs((data as Job[]) || []);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchJobs();

    const channel = supabase
      .channel('jobs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        void fetchJobs();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [worker]);

  useEffect(() => {
    if (!clockInTime) return;

    const timer = setInterval(() => {
      const now = new Date();
      const seconds = Math.floor((now.getTime() - clockInTime.getTime()) / 1000);
      setElapsedSeconds(seconds);
    }, 1000);

    return () => clearInterval(timer);
  }, [clockInTime]);

  const handleClockIn = async (jobId: string) => {
    if (!worker?.shop_id || !currentLocation?.location_id) {
      console.error('Clock-in requires shop and location context.');
      return;
    }

    try {
      if (isKioskFloor && floorTech) {
        const { data, error } = await supabase.rpc('kiosk_clock_in', {
          p_tech_id: floorTech.user_id,
          p_job_id: jobId,
        });
        if (error) throw error;
        const result = data as RpcOk;
        if (!result?.ok) {
          throw new Error(result?.error || 'Clock in failed');
        }
        if (result.log_id) {
          setActiveLog(result.log_id);
          setClockInTime(new Date());
          setElapsedSeconds(0);
        }
        return;
      }

      const { data, error } = await supabase
        .from('job_logs')
        .insert([
          {
            job_id: jobId,
            tech_id: worker.user_id,
            shop_id: worker.shop_id,
            location_id: currentLocation.location_id,
            clock_in: new Date().toISOString(),
          },
        ] as never)
        .select()
        .single();

      if (error) throw error;

      setActiveLog((data as { log_id: string })?.log_id);
      setClockInTime(new Date());
      setElapsedSeconds(0);
    } catch (err) {
      console.error('Error clocking in:', err);
    }
  };

  const handleClockOut = async () => {
    if (!activeLog) return;

    try {
      const clockOutTime = new Date();
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);

      if (isKioskFloor) {
        const { data, error } = await supabase.rpc('kiosk_clock_out', {
          p_log_id: activeLog,
          p_elapsed_minutes: elapsedMinutes,
        });
        if (error) throw error;
        const result = data as RpcOk;
        if (!result?.ok) {
          throw new Error(result?.error || 'Clock out failed');
        }
      } else {
        const { error } = await supabase
          .from('job_logs')
          .update({
            clock_out: clockOutTime.toISOString(),
            elapsed_minutes: elapsedMinutes,
          })
          .eq('log_id', activeLog);

        if (error) throw error;
      }

      setActiveLog(null);
      setClockInTime(null);
      setElapsedSeconds(0);
    } catch (err) {
      console.error('Error clocking out:', err);
    }
  };

  const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  if (!worker) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ShopLogic</h1>
            {isKioskFloor ? (
              <p className="text-gray-600 text-sm">
                Floor session: <span className="font-medium text-gray-900">{worker.name}</span>
              </p>
            ) : (
              <p className="text-gray-600 text-sm">Hello, {worker.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isKioskFloor && (
              <button
                type="button"
                onClick={() => leaveFloorSession()}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 text-sm font-medium"
              >
                Back to kiosk
              </button>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
            >
              {isKioskFloor ? 'Log out terminal' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {activeLog && (
          <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 rounded">
            <h2 className="text-xl font-bold text-green-800 mb-4">⏱️ Clocked In</h2>
            <div className="text-5xl font-mono font-bold text-green-700 mb-4 text-center">
              {formatElapsed(elapsedSeconds)}
            </div>
            <button type="button" onClick={() => void handleClockOut()} className="w-full text-touch btn-danger">
              Clock Out
            </button>
          </div>
        )}

        <div className="grid gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Open Work Orders</h2>

          {jobs.length === 0 ? (
            <div className="bg-white rounded shadow p-6 text-center">
              <p className="text-gray-600 text-lg">No open work orders</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.job_id} className="bg-white rounded shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{job.job_number}</h3>
                    <p className="text-gray-600">Job ID: {job.job_id}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{job.status}</span>
                </div>

                {job.description && <p className="text-gray-700 mb-4">{job.description}</p>}

                <button
                  type="button"
                  onClick={() => void handleClockIn(job.job_id)}
                  disabled={activeLog !== null}
                  className="text-touch btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeLog ? 'Currently Clocked In' : 'Clock In'}
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
