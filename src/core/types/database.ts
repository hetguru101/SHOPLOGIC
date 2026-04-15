/**
 * Supabase Generated Types
 * Auto-generate or manually sync with: npx supabase gen types typescript
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Supabase-generated shape expects this on each table for correct client inference. */
type EmptyRel = [];

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: {
      kiosk_verify_tech: {
        Args: { p_tech_id: string; p_pin: string };
        Returns: Json;
      };
      kiosk_clock_in: {
        Args: { p_tech_id: string; p_job_id: string };
        Returns: Json;
      };
      kiosk_clock_out: {
        Args: { p_log_id: string; p_elapsed_minutes: number };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      users: {
        Row: {
          user_id: string;
          name: string;
          role: 'tech' | 'manager' | 'supervisor' | 'owner' | 'admin' | 'kiosk';
          pin: string | null;
          email: string | null;
          shop_id: string | null;
          default_location_id: string | null;
          labor_rate: number;
          last_day_worked: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at' | 'user_id'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: EmptyRel;
      };
      shops: {
        Row: {
          shop_id: string;
          name: string;
          owner_id: string;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shops']['Row'], 'created_at' | 'updated_at' | 'shop_id'>;
        Update: Partial<Database['public']['Tables']['shops']['Insert']>;
        Relationships: EmptyRel;
      };
      locations: {
        Row: {
          location_id: string;
          shop_id: string;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          phone: string | null;
          manager_id: string | null;
          is_default: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'created_at' | 'updated_at' | 'location_id'>;
        Update: Partial<Database['public']['Tables']['locations']['Insert']>;
        Relationships: EmptyRel;
      };
      user_locations: {
        Row: {
          user_location_id: string;
          user_id: string;
          location_id: string;
          can_assign_jobs: boolean | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_locations']['Row'], 'created_at' | 'updated_at' | 'user_location_id'>;
        Update: Partial<Database['public']['Tables']['user_locations']['Insert']>;
        Relationships: EmptyRel;
      };
      customers: {
        Row: {
          customer_id: string;
          shop_id: string | null;
          location_id: string | null;
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
        Relationships: EmptyRel;
      };
      vehicles: {
        Row: {
          vehicle_id: string;
          shop_id: string | null;
          location_id: string | null;
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
        Relationships: EmptyRel;
      };
      jobs: {
        Row: {
          job_id: string;
          shop_id: string | null;
          location_id: string | null;
          job_number: string;
          vehicle_id: string;
          tech_id: string;
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
        Relationships: EmptyRel;
      };
      job_logs: {
        Row: {
          log_id: string;
          shop_id: string | null;
          location_id: string | null;
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
        Relationships: EmptyRel;
      };
      settings: {
        Row: {
          setting_id: string;
          shop_id: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'created_at' | 'updated_at' | 'setting_id'>;
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
        Relationships: EmptyRel;
      };
      markup_matrix: {
        Row: {
          matrix_id: string;
          shop_id: string | null;
          type: 'parts' | 'sublet';
          category: string | null;
          markup_percent: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['markup_matrix']['Row'], 'created_at' | 'updated_at' | 'matrix_id'>;
        Update: Partial<Database['public']['Tables']['markup_matrix']['Insert']>;
        Relationships: EmptyRel;
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
