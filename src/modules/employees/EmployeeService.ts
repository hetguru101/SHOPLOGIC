import { supabase } from '@/core/supabase/client';
import { User } from '@/core/types/models';

/**
 * Employees (Tech) Service
 * Handles tech-specific operations:
 * - Fetch all techs
 * - Get time clock audit history
 * - Calculate daily/weekly hours
 */

export const EmployeeService = {
  /**
   * Fetch all active techs
   */
  async fetchActiveTechs(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'tech')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as User[];
  },

  /**
   * Fetch all users (including inactive)
   */
  async fetchAllTechs(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'tech')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as User[];
  },

  /**
   * Fetch a single tech by ID
   */
  async fetchTech(techId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', techId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as User | null;
  },

  /**
   * Update a tech's information
   */
  async updateTech(
    techId: string,
    input: Partial<{
      name: string;
      laborRateOverride: number;
      pin: string;
      active: boolean;
    }>
  ): Promise<User> {
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.laborRateOverride !== undefined) updateData.labor_rate_override = input.laborRateOverride || null;
    if (input.pin !== undefined) updateData.pin = input.pin || null;
    if (input.active !== undefined) updateData.active = input.active;

    const { data, error } = await supabase
      .from('users')
      // @ts-expect-error Supabase type mismatch for partial updates
      .update(updateData)
      .eq('user_id', techId)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  },

  /**
   * Get time clock audit for a tech within date range
   * Returns: List of all clock in/out events
   */
  async getTimeclockAudit(
    techId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    jobId: string;
    jobNumber: string;
    clockIn: Date;
    clockOut: Date | null;
    elapsedMinutes: number;
    idleMinutes: number;
  }>> {
    const { data, error } = await supabase
      .from('job_logs')
      .select(
        `
        log_id,
        job_id,
        clock_in,
        clock_out,
        elapsed_minutes,
        idle_minutes
      `
      )
      .eq('tech_id', techId)
      .gte('clock_in', startDate.toISOString())
      .lte('clock_in', endDate.toISOString())
      .order('clock_in', { ascending: false });

    if (error) throw error;

    return (data || []).map((log: any) => ({
      jobId: log.job_id,
      jobNumber: 'N/A', // TODO: fetch job number via join
      clockIn: new Date(log.clock_in),
      clockOut: log.clock_out ? new Date(log.clock_out) : null,
      elapsedMinutes: log.elapsed_minutes || 0,
      idleMinutes: log.idle_minutes || 0,
    }));
  },

  /**
   * Calculate total hours worked in date range
   */
  async calculateTotalHours(techId: string, startDate: Date, endDate: Date): Promise<number> {
    const { data, error } = await supabase
      .from('job_logs')
      .select('elapsed_minutes')
      .eq('tech_id', techId)
      .gte('clock_in', startDate.toISOString())
      .lte('clock_in', endDate.toISOString());

    if (error) throw error;

    const totalMinutes = (data || []).reduce((sum, log: any) => sum + (log.elapsed_minutes || 0), 0);
    return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
  },

  /**
   * Get last clock-in time for a tech (for "Last worked" display)
   */
  async getLastClockInTime(techId: string): Promise<Date | null> {
    const { data, error } = await supabase
      .from('job_logs')
      .select('clock_in')
      .eq('tech_id', techId)
      .neq('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? new Date((data as any).clock_in) : null;
  },

  /**
   * Get last ongoing clock-in (still clocked in)
   */
  async getActiveClockIn(techId: string) {
    const { data, error } = await supabase
      .from('job_logs')
      .select('log_id, job_id, clock_in')
      .eq('tech_id', techId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },
};
