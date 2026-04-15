/**
 * Supabase Generated Types
 * Auto-generate or manually sync with: npx supabase gen types typescript
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          name: string;
          role: 'tech' | 'manager' | 'admin';
          pin: string | null;
          labor_rate: number;
          last_day_worked: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at' | 'user_id'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      customers: {
        Row: {
          customer_id: string;
          name: string;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          labor_rate_override: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'created_at' | 'updated_at' | 'customer_id'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      vehicles: {
        Row: {
          vehicle_id: string;
          customer_id: string;
          vin: string;
          make: string | null;
          model: string | null;
          year: number | null;
          body_type: string | null;
          gvwr: number | null;
          mileage: number | null;
          unit_number: string | null;
          status: 'active' | 'inactive' | 'sold';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'created_at' | 'updated_at' | 'vehicle_id'>;
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      jobs: {
        Row: {
          job_id: string;
          job_number: string;
          vehicle_id: string;
          assigned_tech_id: string | null;
          description: string | null;
          status: 'open' | 'in-progress' | 'completed' | 'declined';
          is_declined: boolean;
          decline_reason: string | null;
          estimated_cost: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'created_at' | 'updated_at' | 'job_id'>;
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
      };
      job_logs: {
        Row: {
          log_id: string;
          job_id: string;
          tech_id: string;
          clock_in: string;
          clock_out: string | null;
          elapsed_minutes: number | null;
          idle_minutes: number | null;
          notes: string | null;
          work_category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['job_logs']['Row'], 'created_at' | 'updated_at' | 'log_id'>;
        Update: Partial<Database['public']['Tables']['job_logs']['Insert']>;
      };
      settings: {
        Row: {
          setting_key: string;
          setting_value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
      };
      markup_matrix: {
        Row: {
          matrix_id: string;
          type: 'parts' | 'sublet';
          category: string | null;
          markup_percent: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['markup_matrix']['Row'], 'created_at' | 'updated_at' | 'matrix_id'>;
        Update: Partial<Database['public']['Tables']['markup_matrix']['Insert']>;
      };
    };
  };
}
