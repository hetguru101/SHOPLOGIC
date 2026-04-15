import { useEffect, useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { supabase } from '@/core/supabase/client';
import { Job } from '@/core/types/models';

export default function TechDashboard() {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Fetch open jobs for this tech
  useEffect(() => {
    if (!user) return;

    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('tech_id', user.user_id)
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

    fetchJobs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Timer for active job
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
    try {
      const { data, error } = await supabase
        .from('job_logs')
        .insert([
          {
            job_id: jobId,
            tech_id: user!.user_id,
            clock_in: new Date().toISOString(),
          },
        ] as any)
        .select()
        .single();

      if (error) throw error;

      setActiveLog((data as any)?.log_id);
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

      const { error } = await supabase
        .from('job_logs')
        // @ts-expect-error Supabase type mismatch for partial updates
        .update({
          clock_out: clockOutTime.toISOString(),
          elapsed_minutes: elapsedMinutes,
        })
        .eq('log_id', activeLog);

      if (error) throw error;

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

  if (loading) {
    return (
      <div className="flex-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ShopLogic</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Hello, {user?.name}!</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Active job display */}
        {activeLog && (
          <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 rounded">
            <h2 className="text-xl font-bold text-green-800 mb-4">⏱️ Clocked In</h2>
            <div className="text-5xl font-mono font-bold text-green-700 mb-4 text-center">
              {formatElapsed(elapsedSeconds)}
            </div>
            <button
              onClick={handleClockOut}
              className="w-full text-touch btn-danger"
            >
              Clock Out
            </button>
          </div>
        )}

        {/* Jobs list */}
        <div className="grid gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Open Work Orders</h2>

          {jobs.length === 0 ? (
            <div className="bg-white rounded shadow p-6 text-center">
              <p className="text-gray-600 text-lg">No open work orders</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.job_id}
                className="bg-white rounded shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{job.job_number}</h3>
                    <p className="text-gray-600">Job ID: {job.job_id}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {job.status}
                  </span>
                </div>

                {job.description && (
                  <p className="text-gray-700 mb-4">{job.description}</p>
                )}

                <button
                  onClick={() => handleClockIn(job.job_id)}
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
