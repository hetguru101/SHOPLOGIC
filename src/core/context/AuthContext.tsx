import React, { createContext, useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { User, Shop, Location } from '../types/models';

export interface AuthContextType {
  user: User | null;
  currentShop: Shop | null;
  currentLocation: Location | null;
  availableLocations: Location[];
  /** When the signed-in user is `kiosk`, the technician currently using the floor session (no extra Auth). */
  floorTech: User | null;
  /** Owner/admin signed in but not yet linked to a shop (first-time tenant setup). */
  needsShopOnboarding: boolean;
  loading: boolean;
  error: Error | null;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  /** After server-side PIN check, start a floor session for this tech (kiosk user only). */
  enterFloorSession: (tech: User) => void;
  /** Return to the name-card kiosk without signing out the shop terminal. */
  leaveFloorSession: () => void;
  selectLocation: (locationId: string) => Promise<void>;
  /** Reload profile + shop/locations from the current Supabase session (e.g. after creating a shop). */
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STAFF_ROLES_LOGIN = ['tech', 'manager', 'supervisor', 'owner', 'admin', 'kiosk'] as const;

function isOwnerOrAdminRole(role: string): boolean {
  return role === 'owner' || role === 'admin';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [floorTech, setFloorTech] = useState<User | null>(null);
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

    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('shop_id', userData.shop_id)
      .single();

    if (shopError || !shopData) {
      throw new Error('Shop not found');
    }

    setCurrentShop(shopData as Shop);

    const { data: rawUserLocs, error: locError } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', userData.user_id)
      .eq('active', true);

    if (locError) {
      console.error('user_locations query error:', locError);
    }

    const userLocRows = (rawUserLocs ?? []) as { location_id: string }[];

    if (userLocRows.length > 0) {
      const locationIds = userLocRows.map((ul) => ul.location_id);
      const { data: rawLocations, error: fetchLocError } = await supabase
        .from('locations')
        .select('*')
        .in('location_id', locationIds)
        .eq('active', true);

      if (fetchLocError) {
        console.error('Locations fetch error:', fetchLocError);
      }

      const locationsData = (rawLocations ?? []) as Location[];

      if (locationsData.length > 0) {
        setAvailableLocations(locationsData);

        if (storedLocationId) {
          const selectedLoc = locationsData.find((l) => l.location_id === storedLocationId);
          if (selectedLoc) {
            setCurrentLocation(selectedLoc);
            return;
          }
        }

        if (locationsData.length === 1) {
          setCurrentLocation(locationsData[0]);
          localStorage.setItem('shoplogic_location_id', locationsData[0].location_id);
        } else if (userData.default_location_id) {
          const defaultLoc = locationsData.find((l) => l.location_id === userData.default_location_id);
          if (defaultLoc) {
            setCurrentLocation(defaultLoc);
            localStorage.setItem('shoplogic_location_id', defaultLoc.location_id);
          }
        } else {
          setCurrentLocation(locationsData[0]);
          localStorage.setItem('shoplogic_location_id', locationsData[0].location_id);
        }
        return;
      }
    }

    const { data: rawShopLocs, error: shopLocError } = await supabase
      .from('locations')
      .select('*')
      .eq('shop_id', userData.shop_id)
      .eq('active', true);

    if (shopLocError) {
      console.error('Shop locations query error:', shopLocError);
    }

    const shopLocations = (rawShopLocs ?? []) as Location[];

    if (shopLocations.length > 0) {
      setAvailableLocations(shopLocations);

      if (storedLocationId) {
        const selectedLoc = shopLocations.find((l) => l.location_id === storedLocationId);
        if (selectedLoc) {
          setCurrentLocation(selectedLoc);
          return;
        }
      }

      if (shopLocations.length === 1) {
        setCurrentLocation(shopLocations[0]);
        localStorage.setItem('shoplogic_location_id', shopLocations[0].location_id);
      } else if (userData.default_location_id) {
        const defaultLoc = shopLocations.find((l) => l.location_id === userData.default_location_id);
        if (defaultLoc) {
          setCurrentLocation(defaultLoc);
          localStorage.setItem('shoplogic_location_id', defaultLoc.location_id);
        } else {
          setCurrentLocation(shopLocations[0]);
          localStorage.setItem('shoplogic_location_id', shopLocations[0].location_id);
        }
      } else {
        setCurrentLocation(shopLocations[0]);
        localStorage.setItem('shoplogic_location_id', shopLocations[0].location_id);
      }
    }
  }, []);

  const loadProfileAndEstablishSession = useCallback(
    async (authUserId: string, storedLocationId: string | null) => {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', authUserId)
        .single();

      if (profileError || !profile) {
        throw new Error(
          'No staff profile is linked to this login. Run database migrations and npm run seed:owner, or ask an admin to link your Auth user to public.users.'
        );
      }

      const userData = profile as User;

      if (!STAFF_ROLES_LOGIN.includes(userData.role as (typeof STAFF_ROLES_LOGIN)[number])) {
        throw new Error('Invalid user role for this application');
      }

      if (!userData.active) {
        throw new Error('User account is inactive');
      }

      setFloorTech(null);

      if (!userData.shop_id && isOwnerOrAdminRole(userData.role)) {
        setUser(userData);
        setCurrentShop(null);
        setCurrentLocation(null);
        setAvailableLocations([]);
        return;
      }

      await establishSession(userData, storedLocationId);
    },
    [establishSession]
  );

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const storedLocationId = localStorage.getItem('shoplogic_location_id');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      await loadProfileAndEstablishSession(session.user.id, storedLocationId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh session'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProfileAndEstablishSession]);

  const enterFloorSession = useCallback((tech: User) => {
    setFloorTech(tech);
  }, []);

  const leaveFloorSession = useCallback(() => {
    setFloorTech(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const storedLocationId = localStorage.getItem('shoplogic_location_id');
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session?.user) {
          await loadProfileAndEstablishSession(session.user.id, storedLocationId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Auth initialization failed'));
          console.error('Auth init error:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setFloorTech(null);
        setCurrentShop(null);
        setCurrentLocation(null);
        setAvailableLocations([]);
        setError(null);
        localStorage.removeItem('shoplogic_location_id');
        return;
      }

      if (!session?.user) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        try {
          setError(null);
          const storedLocationId = localStorage.getItem('shoplogic_location_id');
          await loadProfileAndEstablishSession(session.user.id, storedLocationId);
        } catch (err) {
          console.error('Auth state change error:', err);
          setError(err instanceof Error ? err : new Error('Failed to restore session'));
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfileAndEstablishSession]);

  const loginWithCredentials = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError(new Error('Email and password are required'));
      throw new Error('Email and password are required');
    }

    try {
      setLoading(true);
      setError(null);

      const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signError) {
        const invalid =
          signError.message === 'Invalid login credentials' ||
          /invalid login credentials/i.test(signError.message);
        const devHint =
          import.meta.env.DEV && invalid
            ? ' Run npm run seed:owner (or seed:platform-owner) using the same Supabase project as VITE_SUPABASE_URL in .env.local.'
            : '';
        throw new Error(
          invalid ? `Invalid email or password.${devHint}` : signError.message
        );
      }

      if (!signData.user) {
        throw new Error('Sign-in succeeded but no user was returned');
      }

      try {
        await loadProfileAndEstablishSession(signData.user.id, null);
      } catch (profileErr) {
        await supabase.auth.signOut();
        throw profileErr;
      }
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
      setFloorTech(null);
      await supabase.auth.signOut();
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

  const needsShopOnboarding =
    user !== null && isOwnerOrAdminRole(user.role) && (user.shop_id === null || user.shop_id === '');

  const value: AuthContextType = {
    user,
    floorTech,
    currentShop,
    currentLocation,
    availableLocations,
    needsShopOnboarding,
    loading,
    error,
    loginWithCredentials,
    enterFloorSession,
    leaveFloorSession,
    selectLocation,
    refreshSession,
    logout,
    isAuthenticated: user !== null && currentLocation !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
