import { useState } from 'react';
import { useAuth } from './core/hooks/useAuth';
import LoginScreen from './modules/auth/LoginScreen';
import LocationSelector from './modules/auth/LocationSelector';
import TechDashboard from './modules/tech/TechDashboard';
import CustomerList from './modules/customers/CustomerList';

function App() {
  const { user, currentLocation, availableLocations, loading, selectLocation } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading ShopLogic...</p>
        </div>
      </div>
    );
  }

  // If not authenticatedshow login screen
  if (!user) {
    return <LoginScreen />;
  }

  // If authenticated but no location selected, show location selector
  if (!currentLocation && availableLocations.length > 1) {
    console.log('Showing location selector with', availableLocations.length, 'locations');
    return <LocationSelector locations={availableLocations} onLocationSelected={selectLocation} />;
  }

  // If authenticated and location selected (or auto-selected), show dashboard
  if (currentLocation) {
    console.log('Showing dashboard for role:', user.role, 'location:', currentLocation.name);
    // Route based on role
    switch (user.role) {
      case 'tech':
        return <TechDashboard user={user} location={currentLocation} />;
      
      case 'manager':
        return <ManagerDashboard user={user} location={currentLocation} />;
      
      case 'supervisor':
        return <SupervisorDashboard user={user} location={currentLocation} />;
      
      case 'owner':
      case 'admin':
        return <OwnerDashboard user={user} location={currentLocation} />;
      
      default:
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Unknown Role</h2>
              <p className="text-gray-600">Your role '{user.role}' is not recognized.</p>
            </div>
          </div>
        );
    }
  }

  // Fallback - show error
  console.log('Fallback: user =', user, 'currentLocation =', currentLocation, 'availableLocations =', availableLocations);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <p className="text-gray-600 mb-4">⚠️ Location loading issue</p>
        <p className="text-sm text-gray-500 mb-4">Check browser console for errors</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

interface DashboardProps {
  user: {
    user_id: string;
    name: string;
    email: string;
    role: string;
    labor_rate?: number;
    shop_id: string;
  };
  location: {
    location_id: string;
    name: string;
    shop_id: string;
  };
}

function ManagerDashboard({ user, location }: DashboardProps) {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState<'home' | 'customers' | 'jobs' | 'employees' | 'settings'>('home');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ShopLogic Manager</h1>
            <p className="text-gray-600 text-sm">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Manager</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {activeSection === 'home' ? (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Manager Dashboard</h2>
            <p className="text-gray-700 mb-6">Pick a workspace to begin managing your shop.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => setActiveSection('customers')}
                className="text-left border rounded-lg p-6 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <h3 className="font-semibold text-gray-900">Customers</h3>
                <p className="text-gray-600 text-sm">View and manage customers.</p>
              </button>
              <div className="border rounded-lg p-6 bg-white hover:bg-gray-50">
                <h3 className="font-semibold text-gray-900">Jobs</h3>
                <p className="text-gray-600 text-sm">Manage work orders (coming soon).</p>
              </div>
              <div className="border rounded-lg p-6 bg-white hover:bg-gray-50">
                <h3 className="font-semibold text-gray-900">Employees</h3>
                <p className="text-gray-600 text-sm">Manage techs and labor rates.</p>
              </div>
              <div className="border rounded-lg p-6 bg-white hover:bg-gray-50">
                <h3 className="font-semibold text-gray-900">Settings</h3>
                <p className="text-gray-600 text-sm">Configure sequences and markups.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {activeSection === 'customers' && 'Customer Management'}
                  {activeSection === 'jobs' && 'Job Management'}
                  {activeSection === 'employees' && 'Employee Management'}
                  {activeSection === 'settings' && 'Settings'}
                </h2>
                <p className="text-gray-600">Manage your shop data.</p>
              </div>
              <button
                onClick={() => setActiveSection('home')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                ← Back
              </button>
            </div>
            {activeSection === 'customers' && <CustomerList />}
            {activeSection === 'jobs' && <div className="bg-white p-6 rounded shadow">Job management coming soon...</div>}
            {activeSection === 'employees' && <div className="bg-white p-6 rounded shadow">Employee management coming soon...</div>}
            {activeSection === 'settings' && <div className="bg-white p-6 rounded shadow">Settings coming soon...</div>}
          </div>
        )}
      </main>
    </div>
  );
}

function SupervisorDashboard({ user }: DashboardProps) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ShopLogic Supervisor</h1>
            <p className="text-gray-600 text-sm">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Supervisor</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Supervisor Dashboard</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-6 bg-blue-50">
              <h3 className="font-semibold text-gray-900">Active Jobs</h3>
              <p className="text-gray-600 text-sm">Monitor ongoing jobs and technician performance.</p>
            </div>
            <div className="border rounded-lg p-6 bg-blue-50">
              <h3 className="font-semibold text-gray-900">Tech Dashboard</h3>
              <p className="text-gray-600 text-sm">View technician schedules and assignments.</p>
            </div>
            <div className="border rounded-lg p-6 bg-blue-50">
              <h3 className="font-semibold text-gray-900">Reports</h3>
              <p className="text-gray-600 text-sm">View daily and weekly performance reports.</p>
            </div>
            <div className="border rounded-lg p-6 bg-blue-50">
              <h3 className="font-semibold text-gray-900">Quality Control</h3>
              <p className="text-gray-600 text-sm">Review and approve completed jobs.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function OwnerDashboard({ user }: DashboardProps) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ShopLogic Owner</h1>
            <p className="text-gray-600 text-sm">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">Owner/Admin</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Owner Dashboard</h2>
          <p className="text-gray-600 mb-6">Full access to all systems and analytics.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-6 bg-purple-50">
              <h3 className="font-semibold text-gray-900">Business Analytics</h3>
              <p className="text-gray-600 text-sm">Revenue, profitability, and KPIs.</p>
            </div>
            <div className="border rounded-lg p-6 bg-purple-50">
              <h3 className="font-semibold text-gray-900">Team Management</h3>
              <p className="text-gray-600 text-sm">Manage all users and permissions.</p>
            </div>
            <div className="border rounded-lg p-6 bg-purple-50">
              <h3 className="font-semibold text-gray-900">System Settings</h3>
              <p className="text-gray-600 text-sm">Configure sequences, markups, and integrations.</p>
            </div>
            <div className="border rounded-lg p-6 bg-purple-50">
              <h3 className="font-semibold text-gray-900">Financial Reports</h3>
              <p className="text-gray-600 text-sm">Detailed financial and operational data.</p>
            </div>
            <div className="border rounded-lg p-6 bg-purple-50">
              <h3 className="font-semibold text-gray-900">Audit Logs</h3>
              <p className="text-gray-600 text-sm">Track all system activities and changes.</p>
            </div>
            <div className="border rounded-lg p-6 bg-purple-50">
              <h3 className="font-semibold text-gray-900">Backup & Recovery</h3>
              <p className="text-gray-600 text-sm">Manage system backups and data recovery.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
