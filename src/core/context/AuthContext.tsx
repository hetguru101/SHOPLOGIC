import React, { createContext, useCallback, useEffect, useState } from 'react';
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
  /** Kiosk: after PIN check, load session for this user id (tech / manager / admin). */
  loginWithTechId: (userId: string) => Promise<void>;
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

  const establishSession = useCallback(async (userData: User, storedLocationId: string | null) => {
    if (!userData.shop_id) {
      throw new Error('User has no shop assigned');
    }

    setUser(userData);
    localStorage.setItem('shoplogic_user_id', userData.user_id);

    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('shop_id', userData.shop_id)
      .single();

    if (shopError || !shopData) {
      throw new Error('Shop not found');
    }

    setCurrentShop(shopData as Shop);

    const { data: locationData, error: locError } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', userData.user_id)
      .eq('active', true);

    if (locError) {
      console.error('user_locations query error:', locError);
    }

    if (locationData && locationData.length > 0) {
      const locationIds = locationData.map((ul) => ul.location_id);
      const { data: locationsData, error: fetchLocError } = await supabase
        .from('locations')
        .select('*')
        .in('location_id', locationIds)
        .eq('active', true);

      if (fetchLocError) {
        console.error('Locations fetch error:', fetchLocError);
      }

      if (locationsData && locationsData.length > 0) {
        setAvailableLocations(locationsData as Location[]);

        if (storedLocationId) {
          const selectedLoc = locationsData.find((l) => l.location_id === storedLocationId);
          if (selectedLoc) {
            setCurrentLocation(selectedLoc as Location);
            return;
          }
        }

        if (locationsData.length === 1) {
          setCurrentLocation(locationsData[0] as Location);
          localStorage.setItem('shoplogic_location_id', locationsData[0].location_id);
        } else if (userData.default_location_id) {
          const defaultLoc = locationsData.find((l) => l.location_id === userData.default_location_id);
          if (defaultLoc) {
            setCurrentLocation(defaultLoc as Location);
            localStorage.setItem('shoplogic_location_id', defaultLoc.location_id);
          }
        }
        return;
      }
    }

    const { data: shopLocations, error: shopLocError } = await supabase
      .from('locations')
      .select('*')
      .eq('shop_id', userData.shop_id)
      .eq('active', true);

    if (shopLocError) {
      console.error('Shop locations query error:', shopLocError);
    }

    if (shopLocations && shopLocations.length > 0) {
      setAvailableLocations(shopLocations as Location[]);

      if (storedLocationId) {
        const selectedLoc = shopLocations.find((l) => l.location_id === storedLocationId);
        if (selectedLoc) {
          setCurrentLocation(selectedLoc as Location);
          return;
        }
      }

      if (shopLocations.length === 1) {
        setCurrentLocation(shopLocations[0] as Location);
        localStorage.setItem('shoplogic_location_id', shopLocations[0].location_id);
      }
    }
  }, []);

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

          await establishSession(userData, storedLocationId);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Auth initialization failed'));
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [establishSession]);

  const loginWithCredentials = async (email: string, password: string) => {
    if (!email || !password) {
      setError(new Error('Email and password are required'));
      throw new Error('Email and password are required');
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();

      if (fetchError || !data) {
        throw new Error('User not found');
      }

      const userData = data as User;

      if (!['tech', 'manager', 'supervisor', 'owner', 'admin'].includes(userData.role)) {
        throw new Error('Invalid user role');
      }

      if (!userData.active) {
        throw new Error('User account is inactive');
      }

      console.warn('Password verification not fully implemented - implement proper password hashing');

      await establishSession(userData, null);
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Login failed');
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  };

  const loginWithTechId = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError || !data) {
        throw new Error('User not found');
      }

      const userData = data as User;

      if (!['tech', 'manager', 'admin'].includes(userData.role)) {
        throw new Error('This login is only for floor technicians and shop staff');
      }

      if (!userData.active) {
        throw new Error('User account is inactive');
      }

      await establishSession(userData, null);
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Login failed');
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = async (locationId: string) => {
    try {
      const location = availableLocations.find((l) => l.location_id === locationId);
      if (!location) {
        throw new Error('Location not found');
      }
      setCurrentLocation(location);
      localStorage.setItem('shoplogic_location_id', locationId);
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Failed to select location');
      setError(nextError);
      throw nextError;
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
    loginWithTechId,
    selectLocation,
    logout,
    isAuthenticated: user !== null && currentLocation !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
