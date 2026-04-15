/**
 * Domain Models
 * Business entities used throughout the app
 */

// ============================================================================
// SHOP & LOCATION
// ============================================================================

export interface Shop {
  shop_id: string;
  name: string;
  owner_id: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  location_id: string;
  shop_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  manager_id?: string;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USER
// ============================================================================

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'tech' | 'manager' | 'supervisor' | 'owner' | 'admin';
  labor_rate: number;
  shop_id: string;
  default_location_id?: string;
  last_day_worked?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLocation {
  user_location_id: string;
  user_id: string;
  location_id: string;
  can_assign_jobs: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CUSTOMER
// ============================================================================

export interface Customer {
  customer_id: string;
  shop_id: string;
  location_id?: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  labor_rate_override?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VEHICLE
// ============================================================================

export interface Vehicle {
  vehicle_id: string;
  shop_id: string;
  location_id?: string;
  customer_id: string;
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  body_type?: string;
  gvwr?: number;
  mileage?: number;
  unit_number?: string;
  status: 'active' | 'inactive' | 'sold';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// JOB
// ============================================================================

export interface Job {
  job_id: string;
  shop_id: string;
  location_id?: string;
  job_number: string;
  vehicle_id: string;
  tech_id?: string | null;
  description?: string;
  status: 'open' | 'in-progress' | 'completed' | 'declined';
  is_declined: boolean;
  decline_reason?: string;
  estimated_cost?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// JOB LOG
// ============================================================================

export interface JobLog {
  log_id: string;
  shop_id: string;
  location_id?: string;
  job_id: string;
  tech_id: string;
  clock_in: string;
  clock_out?: string;
  elapsed_minutes?: number;
  idle_minutes?: number;
  notes?: string;
  work_category?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SETTINGS
// ============================================================================

export interface Settings {
  setting_id: string;
  shop_id: string;
  config: {
    default_labor_rate?: number;
    work_order_sequence?: {
      format: string;
      next_number: number;
      reset_yearly?: boolean;
    };
    tech_id_sequence?: {
      format: string;
      next_number: number;
      reset_yearly?: boolean;
    };
    po_sequence?: {
      format: string;
      next_number: number;
      reset_yearly?: boolean;
    };
  };
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MARKUP RULE
// ============================================================================

export interface MarkupRule {
  matrix_id: string;
  shop_id: string;
  category?: string;
  markup_percent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
