import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/core/supabase/client';
import { Customer } from '@/core/types/models';
import { CustomerService } from './CustomerService';

/**
 * Customers Module Hooks
 * Handle all customer-related state management and API calls
 */

/**
 * Hook: Fetch list of all customers with realtime updates
 */
export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        const data = await CustomerService.fetchCustomers();
        setCustomers(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('customers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setCustomers((prev) => [...prev, payload.new as Customer]);
          } else if (payload.eventType === 'UPDATE') {
            setCustomers((prev) =>
              prev.map((c) =>
                c.customer_id === payload.new.customer_id ? (payload.new as Customer) : c
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCustomers((prev) => prev.filter((c) => c.customer_id !== payload.old.customer_id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { customers, loading, error };
};

/**
 * Hook: Fetch a single customer by ID
 */
export const useCustomer = (customerId: string | null) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(!!customerId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!customerId) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    const loadCustomer = async () => {
      try {
        setLoading(true);
        const data = await CustomerService.fetchCustomer(customerId);
        setCustomer(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();

    // Subscribe to realtime updates for this customer
    const channel = supabase
      .channel(`customer-${customerId}-realtime`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customers' },
        (payload: any) => {
          if (payload.new.customer_id === customerId) {
            setCustomer(payload.new as Customer);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [customerId]);

  return { customer, loading, error };
};

/**
 * Hook: Create a new customer
 */
export const useCreateCustomer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCustomer = useCallback(
    async (input: Parameters<typeof CustomerService.createCustomer>[0]) => {
      try {
        setLoading(true);
        const customer = await CustomerService.createCustomer(input);
        setError(null);
        return customer;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createCustomer, loading, error };
};

/**
 * Hook: Update an existing customer
 */
export const useUpdateCustomer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateCustomer = useCallback(
    async (customerId: string, input: Parameters<typeof CustomerService.updateCustomer>[1]) => {
      try {
        setLoading(true);
        const customer = await CustomerService.updateCustomer(customerId, input);
        setError(null);
        return customer;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { updateCustomer, loading, error };
};

/**
 * Hook: Delete a customer
 */
export const useDeleteCustomer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteCustomer = useCallback(async (customerId: string) => {
    try {
      setLoading(true);
      await CustomerService.deleteCustomer(customerId);
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteCustomer, loading, error };
};
