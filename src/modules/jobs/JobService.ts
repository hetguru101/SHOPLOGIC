import { supabase } from '@/core/supabase/client';
import { Job } from '@/core/types/models';

/**
 * Jobs Service — DB column is `tech_id` (see 001_init_schema.sql + RLS).
 */
export const JobService = {
  async fetchJobs(filters?: {
    vehicleId?: string;
    techId?: string;
    status?: string;
    includeDeclined?: boolean;
  }): Promise<Job[]> {
    let query = supabase.from('jobs').select('*');

    if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
    if (filters?.techId) query = query.eq('tech_id', filters.techId);
    if (filters?.status) query = query.eq('status', filters.status as Job['status']);
    if (!filters?.includeDeclined) query = query.eq('is_declined', false);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Job[];
  },

  async fetchJob(jobId: string): Promise<Job | null> {
    const { data, error } = await supabase.from('jobs').select('*').eq('job_id', jobId).single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Job | null;
  },

  /**
   * Requires shop_id / location_id for RLS; `job_number` must be unique (caller or Edge Function).
   */
  async createJob(input: {
    shopId: string;
    locationId: string;
    jobNumber: string;
    vehicleId: string;
    description: string;
    techId: string;
    estimatedCost?: number;
  }): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .insert([
        {
          shop_id: input.shopId,
          location_id: input.locationId,
          job_number: input.jobNumber,
          vehicle_id: input.vehicleId,
          description: input.description,
          tech_id: input.techId,
          estimated_cost: input.estimatedCost ?? null,
          status: 'open',
          is_declined: false,
        },
      ] as any)
      .select()
      .single();

    if (error) throw error;
    return data as Job;
  },

  async updateJob(
    jobId: string,
    input: Partial<{
      description: string;
      techId: string;
      estimatedCost: number;
      status: 'open' | 'in-progress' | 'completed' | 'declined';
    }>
  ): Promise<Job> {
    const updateData: Record<string, unknown> = {};

    if (input.description !== undefined) updateData.description = input.description;
    if (input.techId !== undefined) updateData.tech_id = input.techId || null;
    if (input.estimatedCost !== undefined) updateData.estimated_cost = input.estimatedCost ?? null;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await supabase.from('jobs').update(updateData as never)
      .eq('job_id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data as Job;
  },

  async declineJob(jobId: string, reason: string): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
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

  async closeJob(jobId: string): Promise<Job> {
    const { data, error } = await supabase.from('jobs').update({ status: 'completed' })
      .eq('job_id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data as Job;
  },

  async fetchOpenJobsForTech(techId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('tech_id', techId)
      .eq('status', 'open')
      .eq('is_declined', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Job[];
  },
};
