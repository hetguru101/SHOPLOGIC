import { supabase } from '@/core/supabase/client';
import { Job } from '@/core/types/models';

/**
 * Jobs Service
 * Handles all job-related database operations and business logic
 */

export const JobService = {
  /**
   * Fetch all jobs (with optional filters)
   */
  async fetchJobs(filters?: {
    customerId?: string;
    vehicleId?: string;
    techId?: string;
    status?: string;
    includeDeclined?: boolean;
  }): Promise<Job[]> {
    let query = supabase.from('jobs').select('*');

    if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
    if (filters?.techId) query = query.eq('assigned_tech_id', filters.techId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (!filters?.includeDeclined) query = query.eq('is_declined', false);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Job[];
  },

  /**
   * Fetch a single job by ID
   */
  async fetchJob(jobId: string): Promise<Job | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Job | null;
  },

  /**
   * Create a new job
   * Auto-generates work order number via Edge Function
   */
  async createJob(input: {
    customerId: string;
    vehicleId: string;
    description: string;
    assignedTechId?: string;
    estimatedCost?: number;
    estimatedMinutes?: number;
  }): Promise<Job> {
    // TODO: Call Edge Function to generate work order number
    // const { data: { work_order_number } } = await supabase.functions.invoke('generate-sequence', { body: { type: 'work_order' } });

    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        customer_id: input.customerId,
        vehicle_id: input.vehicleId,
        description: input.description,
        assigned_tech_id: input.assignedTechId || null,
        estimated_cost: input.estimatedCost || null,
        status: 'open',
        is_declined: false,
      }] as any)
      .select()
      .single();

    if (error) throw error;
    return data as Job;
  },

  /**
   * Update an existing job
   */
  async updateJob(
    jobId: string,
    input: Partial<{
      description: string;
      assignedTechId: string;
      estimatedCost: number;
      estimatedMinutes: number;
      status: 'open' | 'in-progress' | 'completed' | 'declined';
    }>
  ): Promise<Job> {
    const updateData: Record<string, any> = {};

    if (input.description !== undefined) updateData.description = input.description;
    if (input.assignedTechId !== undefined) updateData.assigned_tech_id = input.assignedTechId || null;
    if (input.estimatedCost !== undefined) updateData.estimated_cost = input.estimatedCost || null;
    if (input.estimatedMinutes !== undefined) updateData.estimated_minutes = input.estimatedMinutes || null;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await supabase
      .from('jobs')
      // @ts-expect-error Supabase type mismatch for partial updates
      .update(updateData)
      .eq('job_id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data as Job;
  },

  /**
   * Decline a job (mark as is_declined=true)
   */
  async declineJob(jobId: string, reason: string): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      // @ts-expect-error Supabase type mismatch for partial updates
      .update({
        is_declined: true,
        decline_reason: reason,
        status: 'declined',
      })
      .eq('job_id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data as Job;
  },

  /**
   * Close a job (mark as complete)
   */
  async closeJob(jobId: string): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      // @ts-expect-error Supabase type mismatch for partial updates
      .update({ status: 'completed' })
      .eq('job_id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data as Job;
  },

  /**
   * Fetch open jobs for a specific tech
   */
  async fetchOpenJobsForTech(techId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('assigned_tech_id', techId)
      .eq('status', 'open')
      .eq('is_declined', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Job[];
  },
};
