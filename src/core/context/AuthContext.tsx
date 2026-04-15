import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { User, Shop, Location } from '../types/models';

export interface AuthContextType {
  user: User | null;
  currentShop: Shop | null;
  currentLocation: Location | null;
  availableLocations: Location[];
  loading: boolean;
  error: Error | null;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  selectLocation: (locationId: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUserId = localStorage.getItem('shoplogic_user_id');
        const storedLocationId = localStorage.getItem('shoplogic_location_id');
        
        if (storedUserId) {
          const { data, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', storedUserId)
            .single();

          if (fetchError || !data) {
            localStorage.removeItem('shoplogic_user_id');
            localStorage.removeItem('shoplogic_location_id');
            throw new Error('User not found');
          }

          const userData = data as User;

          if (!userData.active) {
            throw new Error('User account is inactive');
          }

          setUser(userData);

          // Load shop
          const { data: shopData, error: shopError } = await supabase
            .from('shops')
            .select('*')
            .eq('shop_id', userData.shop_id)
            .single();

          if (shopError || !shopData) {
            throw new Error('Shop not found');
          }

          setCurrentShop(shopData as Shop);

          // Load available locations for this user
          const { data: locationData, error: locError } = await supabase
            .from('user_locations')
            .select('location_id')
            .eq('user_id', userData.user_id)
            .eq('active', true);

          if (!locError && locationData) {
            const locationIds = locationData.map(ul => ul.location_id);
            const { data: locationsData } = await supabase
              .from('locations')
              .select('*')
              .in('location_id', locationIds)
              .eq('active', true);

            if (locationsData) {
              setAvailableLocations(locationsData as Location[]);

              // Set current location
              if (storedLocationId) {
                const selectedLoc = locationsData.find(l => l.location_id === storedLocationId);
                if (selectedLoc) {
                  setCurrentLocation(selectedLoc as Location);
                }
              } else if (userData.default_location_id) {
                const defaultLoc = locationsData.find(l => l.location_id === userData.default_location_id);
                if (defaultLoc) {
                  setCurrentLocation(defaultLoc as Location);
                }
              } else if (locationsData.length > 0) {
                setCurrentLocation(locationsData[0] as Location);
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Auth initialization failed'));
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginWithCredentials = async (email: string, password: string) => {
    if (!email || !password) {
      setError(new Error('Email and password are required'));
      throw new Error('Email and password are required');
    }

    try {
      setLoading(true);
      setError(null);

      // Search for user by email
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();

      if (fetchError || !data) {
        throw new Error('User not found');
      }

      const userData = data as User;

      // Validate user
      if (!['tech', 'manager', 'supervisor', 'owner', 'admin'].includes(userData.role)) {
        throw new Error('Invalid user role');
      }

      if (!userData.active) {
        throw new Error('User account is inactive');
      }

      // TODO: Implement proper password verification with bcryt or Supabase Auth
      // For now, just check that user exists and password is provided
      console.warn('Password verification not fully implemented - implement proper password hashing');

      setUser(userData);
      localStorage.setItem('shoplogic_user_id', userData.user_id);

      // Load shop
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('shop_id', userData.shop_id)
        .single();

      if (shopError || !shopData) {
        console.error('Shop load error:', shopError);
        throw new Error('Shop not found');
      }

      setCurrentShop(shopData as Shop);

      // Load available locations for this user
      const { data: locationData, error: locError } = await supabase
        .from('user_locations')
        .select('location_id')
        .eq('user_id', userData.user_id)
        .eq('active', true);

      console.log('Location data:', locationData, 'Error:', locError);

      if (locError) {
        console.error('user_locations query error:', locError);
      }

      if (locationData && locationData.length > 0) {
        const locationIds = locationData.map(ul => ul.location_id);
        console.log('Location IDs to fetch:', locationIds);

        const { data: locationsData, error: fetchLocError } = await supabase
          .from('locations')
          .select('*')
          .in('location_id', locationIds)
          .eq('active', true);

        if (fetchLocError) {
          console.error('Locations fetch error:', fetchLocError);
        }

        console.log('Loaded locations:', locationsData);

        if (locationsData && locationsData.length > 0) {
          setAvailableLocations(locationsData as Location[]);

          // Auto-select location based on priority:
          // 1. If only one location, select it
          // 2. If user has default location, select it
          // 3. Otherwise, let user choose from location selector
          if (locationsData.length === 1) {
            console.log('Auto-selecting single location');
            setCurrentLocation(locationsData[0] as Location);
            localStorage.setItem('shoplogic_location_id', locationsData[0].location_id);
          } else if (userData.default_location_id) {
            const defaultLoc = locationsData.find(l => l.location_id === userData.default_location_id);
            if (defaultLoc) {
              console.log('Using default location');
              setCurrentLocation(defaultLoc as Location);
              localStorage.setItem('shoplogic_location_id', defaultLoc.location_id);
            } else {
              console.log('Multiple locations available - show selector');
            }
          } else {
            console.log('Multiple locations available - show selector');
          }
        } else {
          console.warn('No locations found for user');
        }
      } else {
        console.warn('No user_locations records found - checking shop locations');
        
        // Fallback: Get all locations for the shop
        const { data: shopLocations, error: shopLocError } = await supabase
          .from('locations')
          .select('*')
          .eq('shop_id', userData.shop_id)
          .eq('active', true);

        if (shopLocError) {
          console.error('Shop locations query error:', shopLocError);
        }

        if (shopLocations && shopLocations.length > 0) {
          console.log('Using shop locations as fallback');
          setAvailableLocations(shopLocations as Location[]);
          
          if (shopLocations.length === 1) {
            setCurrentLocation(shopLocations[0] as Location);
            localStorage.setItem('shoplogic_location_id', shopLocations[0].location_id);
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = async (locationId: string) => {
    try {
      const location = availableLocations.find(l => l.location_id === locationId);
      if (!location) {
        throw new Error('Location not found');
      }
      setCurrentLocation(location);
      localStorage.setItem('shoplogic_location_id', locationId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to select location');
      setError(error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('shoplogic_user_id');
      localStorage.removeItem('shoplogic_location_id');
      setUser(null);
      setCurrentShop(null);
      setCurrentLocation(null);
      setAvailableLocations([]);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value: AuthContextType = {
    user,
    currentShop,
    currentLocation,
    availableLocations,
    loading,
    error,
    loginWithCredentials,
    selectLocation,
    logout,
    isAuthenticated: user !== null && currentLocation !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}