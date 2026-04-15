-- ShopLogic Database Schema
-- Copy and paste into Supabase SQL Editor to create all tables

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('tech', 'manager', 'admin')) DEFAULT 'tech',
  pin TEXT UNIQUE,
  labor_rate DECIMAL(10, 2) NOT NULL DEFAULT 75.00,
  last_day_worked DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_active ON users(active);

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  labor_rate_override DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_customers_name ON customers(name);

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  vin TEXT NOT NULL UNIQUE,
  make TEXT,
  model TEXT,
  year INTEGER,
  body_type TEXT,
  gvwr INTEGER,
  mileage INTEGER,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'sold')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- ============================================================================
-- JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  tech_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('open', 'in-progress', 'completed', 'declined')) DEFAULT 'open',
  is_declined BOOLEAN NOT NULL DEFAULT false,
  decline_reason TEXT,
  estimated_cost DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX idx_jobs_job_number ON jobs(job_number);
CREATE INDEX idx_jobs_vehicle_id ON jobs(vehicle_id);
CREATE INDEX idx_jobs_tech_id ON jobs(tech_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_is_declined ON jobs(is_declined);

-- ============================================================================
-- JOB_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  tech_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  elapsed_minutes INTEGER,
  idle_minutes INTEGER,
  notes TEXT,
  work_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX idx_job_logs_tech_id ON job_logs(tech_id);
CREATE INDEX idx_job_logs_clock_in ON job_logs(clock_in);

-- ============================================================================
-- SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL DEFAULT '{
    "default_labor_rate": 75,
    "work_order_sequence": {
      "format": "WO-{YYYY}-{SEQUENCE}",
      "next_number": 1001,
      "reset_yearly": true
    },
    "tech_id_sequence": {
      "format": "T-{SEQUENCE}",
      "next_number": 1,
      "reset_yearly": false
    },
    "po_sequence": {
      "format": "PO-{YYYY}-{SEQUENCE}",
      "next_number": 5001,
      "reset_yearly": true
    }
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- MARKUP_MATRIX TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS markup_matrix (
  matrix_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('parts', 'sublet')),
  category TEXT,
  markup_percent DECIMAL(5, 2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_markup_matrix_type ON markup_matrix(type);
CREATE INDEX idx_markup_matrix_active ON markup_matrix(active);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER customers_update_timestamp
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER vehicles_update_timestamp
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER jobs_update_timestamp
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER job_logs_update_timestamp
BEFORE UPDATE ON job_logs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER settings_update_timestamp
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER markup_matrix_update_timestamp
BEFORE UPDATE ON markup_matrix
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- INITIAL DATA (Sample Shop Configuration)
-- ============================================================================
INSERT INTO settings (config) VALUES (
  '{
    "default_labor_rate": 75,
    "work_order_sequence": {
      "format": "WO-{YYYY}-{SEQUENCE}",
      "next_number": 1001,
      "reset_yearly": true
    },
    "tech_id_sequence": {
      "format": "T-{SEQUENCE}",
      "next_number": 1,
      "reset_yearly": false
    },
    "po_sequence": {
      "format": "PO-{YYYY}-{SEQUENCE}",
      "next_number": 5001,
      "reset_yearly": true
    }
  }'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO markup_matrix (type, markup_percent, active) VALUES
  ('parts', 25.0, true),
  ('sublet', 20.0, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE DATA (For Development)
-- Uncomment to populate test data
-- ============================================================================
/*
-- Insert sample users
INSERT INTO users (name, role, pin, labor_rate, active) VALUES
  ('Admin User', 'admin', 'admin1234', 150.00, true),
  ('John Smith', 'tech', '1234', 85.00, true),
  ('Sarah Johnson', 'tech', '5678', 80.00, true),
  ('Mike Brown', 'tech', NULL, 75.00, true),
  ('Manager Mary', 'manager', 'manager1234', 120.00, true);

-- Insert sample customers
INSERT INTO customers (name, contact_person, email, phone, labor_rate_override) VALUES
  ('Reliable Logistics', 'Bob Davis', 'bob@reliable.com', '555-0001', 95.00),
  ('Big Rig Inc', 'Sarah Lee', 'sarah@bigrig.com', '555-0002', NULL),
  ('Midwest Transport', 'Tom Johnson', 'tom@midwest.com', '555-0003', 90.00);

-- Insert sample vehicles
INSERT INTO vehicles (customer_id, vin, make, model, year, body_type, gvwr, mileage, status) 
SELECT 
  (SELECT customer_id FROM customers WHERE name = 'Reliable Logistics' LIMIT 1),
  '1HSCM21606A123456',
  'Peterbilt',
  '579',
  2023,
  'Tractor Unit',
  36000,
  145000,
  'active'
UNION ALL
SELECT
  (SELECT customer_id FROM customers WHERE name = 'Big Rig Inc' LIMIT 1),
  '1HSCM21606A123457',
  'Peterbilt',
  'PB',
  2022,
  'Tractor Unit',
  34000,
  198000,
  'active'
UNION ALL
SELECT
  (SELECT customer_id FROM customers WHERE name = 'Midwest Transport' LIMIT 1),
  '2T1BH4KE0BC567890',
  'Toyota',
  'Tundra',
  2021,
  'Truck',
  12000,
  89000,
  'active';

-- Insert sample jobs
INSERT INTO jobs (job_number, vehicle_id, tech_id, description, status, estimated_cost)
SELECT 
  'WO-2025-1001',
  (SELECT vehicle_id FROM vehicles WHERE vin = '1HSCM21606A123456' LIMIT 1),
  (SELECT user_id FROM users WHERE name = 'John Smith' LIMIT 1),
  'Engine diagnostics and inspection',
  'in-progress',
  450.00
UNION ALL
SELECT
  'WO-2025-1002',
  (SELECT vehicle_id FROM vehicles WHERE vin = '1HSCM21606A123457' LIMIT 1),
  (SELECT user_id FROM users WHERE name = 'Sarah Johnson' LIMIT 1),
  '100K mile service with fluid changes',
  'open',
  750.00
UNION ALL
SELECT
  'WO-2025-1003',
  (SELECT vehicle_id FROM vehicles WHERE vin = '2T1BH4KE0BC567890' LIMIT 1),
  (SELECT user_id FROM users WHERE name = 'Mike Brown' LIMIT 1),
  'Transmission repair - possible rebuild',
  'open',
  1200.00;
*/

-- ============================================================================
-- HELPFUL QUERIES
-- ============================================================================
/* Get all open jobs for a specific tech:
SELECT j.* FROM jobs j
WHERE j.tech_id = 'user-uuid-here'
  AND j.status = 'open'
  AND j.is_declined = false
ORDER BY j.created_at DESC;
*/

/* Get job with customer and vehicle info:
SELECT 
  j.*,
  v.vin,
  v.make,
  v.model,
  c.name as customer_name
FROM jobs j
JOIN vehicles v ON j.vehicle_id = v.vehicle_id
JOIN customers c ON v.customer_id = c.customer_id
WHERE j.job_id = 'job-uuid-here';
*/

/* Get clock history for a tech:
SELECT 
  jl.log_id,
  jl.clock_in,
  jl.clock_out,
  jl.elapsed_minutes,
  j.job_number
FROM job_logs jl
JOIN jobs j ON jl.job_id = j.job_id
WHERE jl.tech_id = 'tech-uuid-here'
ORDER BY jl.clock_in DESC;
*/
