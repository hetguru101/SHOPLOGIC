import { useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';

interface TechDashboardProps {
  user: {
    user_id: string;
    name: string;
    role: string;
    labor_rate: number;
    active: boolean;
  };
  location: {
    location_id: string;
    name: string;
    shop_id: string;
  };
}

export default function TechDashboard({ user, location }: TechDashboardProps) {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState<'home' | 'jobs' | 'time-tracking' | 'profile'>('home');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tech Dashboard</h1>
            <p className="text-blue-100 text-sm mt-1">Welcome, {user.name}</p>
            <p className="text-blue-200 text-xs mt-1">{location.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">Technician</span>
            <button
              onClick={logout}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveSection('home')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'home'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveSection('jobs')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'jobs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Jobs
            </button>
            <button
              onClick={() => setActiveSection('time-tracking')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'time-tracking'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Time Tracking
            </button>
            <button
              onClick={() => setActiveSection('profile')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeSection === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Profile
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {activeSection === 'home' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Today's Hours</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">0h</p>
                  </div>
                  <div className="text-4xl text-blue-600">⏱️</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Active Jobs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                  </div>
                  <div className="text-4xl text-green-600">📋</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Rate Per Hour</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${user.labor_rate}</p>
                  </div>
                  <div className="text-4xl text-purple-600">💰</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Status</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">Available</p>
                  </div>
                  <div className="text-4xl">🟢</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                  Start Job
                </button>
                <button className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                  Clock In
                </button>
                <button className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                  Take Break
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'jobs' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Jobs</h2>
            <div className="text-center py-12">
              <p className="text-gray-600">No active jobs at the moment.</p>
              <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors">
                Request New Job
              </button>
            </div>
          </div>
        )}

        {activeSection === 'time-tracking' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Time Tracking</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Clock In/Out</h3>
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Current Status: Not Clocked In</p>
                  <button className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded transition-colors">
                    Clock In
                  </button>
                </div>
              </div>
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Today's Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hours Worked</span>
                    <span className="font-semibold">0h 0m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Break Time</span>
                    <span className="font-semibold">0h 0m</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="text-gray-900 font-semibold">Total Earning</span>
                    <span className="font-bold text-green-600">$0.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Technician Profile</h2>
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-lg text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <p className="mt-1 text-lg text-gray-900">{user.user_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Labor Rate</label>
                  <p className="mt-1 text-lg text-gray-900">${user.labor_rate} / hour</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-lg text-green-600 font-semibold">Active</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}