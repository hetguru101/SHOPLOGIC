import { supabase } from '@/core/supabase/client';
import { Vehicle } from '@/core/types/models';

/**
 * Vehicles Service
 * Handles all vehicle-related database operations and business logic
 */

export const VehicleService = {
  /**
   * Fetch all vehicles for a customer
   */
  async fetchVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .order('year', { ascending: false });

    if (error) throw error;
    return (data || []) as Vehicle[];
  },

  /**
   * Fetch a single vehicle by ID
   */
  async fetchVehicle(vehicleId: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Vehicle | null;
  },

  /**
   * Create a new vehicle
   */
  async createVehicle(input: {
    customerId: string;
    vin: string;
    year?: number;
    make?: string;
    model?: string;
    gvwr?: number;
    unitNumber?: string;
  }): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([{
        customer_id: input.customerId,
        vin: input.vin.toUpperCase(),
        year: input.year || null,
        make: input.make || null,
        model: input.model || null,
        gvwr: input.gvwr || null,
        unit_number: input.unitNumber || null,
      }] as any)
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  },

  /**
   * Update an existing vehicle
   */
  async updateVehicle(
    vehicleId: string,
    input: Partial<{
      vin: string;
      year: number;
      make: string;
      model: string;
      gvwr: number;
      unitNumber: string;
    }>
  ): Promise<Vehicle> {
    const updateData: Record<string, any> = {};

    if (input.vin !== undefined) updateData.vin = input.vin.toUpperCase();
    if (input.year !== undefined) updateData.year = input.year || null;
    if (input.make !== undefined) updateData.make = input.make || null;
    if (input.model !== undefined) updateData.model = input.model || null;
    if (input.gvwr !== undefined) updateData.gvwr = input.gvwr || null;
    if (input.unitNumber !== undefined) updateData.unit_number = input.unitNumber || null;

    const { data, error } = await supabase
      .from('vehicles')
      // @ts-expect-error Supabase type mismatch for partial updates
      .update(updateData)
      .eq('vehicle_id', vehicleId)
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  },

  /**
   * Delete a vehicle
   */
  async deleteVehicle(vehicleId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('vehicle_id', vehicleId);

    if (error) throw error;
  },

  /**
   * Decode VIN using NHTSA API
   * Calls Edge Function: supabase/functions/vin-decoder
   * Returns: { year, make, model, gvwr }
   */
  async decodeVIN(vin: string): Promise<{
    year?: number;
    make?: string;
    model?: string;
    gvwr?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('vin-decoder', {
        body: { vin },
      });

      if (error) throw error;
      return data || {};
    } catch (err) {
      console.error('VIN decode failed:', err);
      return {}; // Return empty object if decode fails
    }
  },
};
