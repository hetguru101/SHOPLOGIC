import { supabase } from '@/core/supabase/client';
import { Customer } from '@/core/types/models';

/**
 * Customers Service
 * Handles all customer-related database operations and business logic
 */

export const CustomerService = {
  /**
   * Fetch all customers (active and inactive)
   */
  async fetchCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Customer[];
  },

  /**
   * Fetch a single customer by ID
   */
  async fetchCustomer(customerId: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data as Customer | null;
  },

  /**
   * Create a new customer
   */
  async createCustomer(input: {
    customerName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    laborRateOverride?: number;
  }): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: input.customerName,
        contact_person: input.contactPerson || null,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null,
        labor_rate_override: input.laborRateOverride || null,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  /**
   * Update an existing customer
   */
  async updateCustomer(
    customerId: string,
    input: Partial<{
      customerName: string;
      contactPerson: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      laborRateOverride: number;
    }>
  ): Promise<Customer> {
    const updateData: any = {};

    if (input.customerName !== undefined) updateData.name = input.customerName;
    if (input.contactPerson !== undefined) updateData.contact_person = input.contactPerson || null;
    if (input.email !== undefined) updateData.email = input.email || null;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.address !== undefined) updateData.address = input.address || null;
    if (input.city !== undefined) updateData.city = input.city || null;
    if (input.state !== undefined) updateData.state = input.state || null;
    if (input.zip !== undefined) updateData.zip = input.zip || null;
    if (input.laborRateOverride !== undefined) updateData.labor_rate_override = input.laborRateOverride || null;

    const { data, error } = await supabase
      .from('customers')
      // @ts-expect-error Supabase type mismatch for partial updates
      .update(updateData)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  /**
   * Delete a customer
   * Note: Typically best to archive (soft delete) rather than hard delete to preserve job history
   */
  async deleteCustomer(customerId: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('customer_id', customerId);

    if (error) throw error;
  },

  /**
   * Resolve effective labor rate for a customer
   * Priority: customer override > default shop rate
   */
  async resolveEffectiveLaborrRate(customerId: string): Promise<number> {
    const customer = await this.fetchCustomer(customerId);
    if (customer?.labor_rate_override) {
      return customer.labor_rate_override;
    }

    // TODO: Fetch default shop labor rate from settings table
    return 55.0; // Placeholder
  },
};
