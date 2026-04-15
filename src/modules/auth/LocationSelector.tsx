import { useAuth } from '@/core/hooks/useAuth';
import { Location } from '@/core/types/models';

interface LocationSelectorProps {
  locations: Location[];
  onLocationSelected: (locationId: string) => void;
}

export default function LocationSelector({ locations, onLocationSelected }: LocationSelectorProps) {
  const { currentShop, logout } = useAuth();

  const handleSelectLocation = (locationId: string) => {
    onLocationSelected(locationId);
  };

  if (!currentShop) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-700 to-sky-700 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Select Location</h1>
          <p className="text-gray-600 mt-2">Choose your work location</p>
          <p className="text-sm text-gray-500 mt-1">{currentShop.name}</p>
        </div>

        <div className="space-y-3 mb-6">
          {locations.map((location) => (
            <button
              key={location.location_id}
              onClick={() => handleSelectLocation(location.location_id)}
              className="w-full border-2 border-gray-300 hover:border-blue-600 hover:bg-blue-50 rounded-lg p-4 text-left transition-all"
            >
              <h3 className="font-semibold text-gray-900">{location.name}</h3>
              {location.address && (
                <p className="text-sm text-gray-600 mt-1">{location.address}</p>
              )}
              {location.city && location.state && (
                <p className="text-sm text-gray-600">
                  {location.city}, {location.state}
                </p>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={logout}
          className="w-full py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
