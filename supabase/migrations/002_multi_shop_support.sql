-- ShopLogic Multi-Shop Support Migration
-- Run this in Supabase SQL Editor to add multi-shop functionality

-- ============================================================================
-- SHOPS TABLE (Tenant/Shop)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shops (
  shop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_email ON shops(email);
CREATE INDEX idx_shops_active ON shops(active);

-- ============================================================================
-- LOCATIONS TABLE (Multiple locations per shop)
-- ============================================================================
CREATE TABLE IF NOT EXISTS locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(shop_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  manager_id UUID REFERENCES users(user_id),
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_locations_shop_id ON locations(shop_id);
CREATE INDEX idx_locations_active ON locations(active);

-- ============================================================================
-- ALTER USERS TABLE - Add multi-shop support
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(shop_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES locations(location_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- USER_LOCATIONS TABLE (Techs can work at multiple locations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_locations (
  user_location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
  can_assign_jobs BOOLEAN DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, location_id)
);

CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_location_id ON user_locations(location_id);

-- ============================================================================
-- ALTER CUSTOMERS TABLE - Add shop and location
-- ============================================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(shop_id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(location_id);

CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);

-- ============================================================================
-- ALTER VEHICLES TABLE - Add shop and location
-- ============================================================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(shop_id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(location_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_shop_id ON vehicles(shop_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_location_id ON vehicles(location_id);

-- ============================================================================
-- ALTER JOBS TABLE - Add shop and location
-- ============================================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(shop_id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(location_id);

CREATE INDEX IF NOT EXISTS idx_jobs_shop_id ON jobs(shop_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location_id ON jobs(location_id);

-- ============================================================================
-- ALTER JOB_LOGS TABLE - Add shop and location
-- ============================================================================
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(shop_id);
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(location_id);

CREATE INDEX IF NOT EXISTS idx_job_logs_shop_id ON job_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_location_id ON job_logs(location_id);

-- ============================================================================
-- ALTER SETTINGS TABLE - Add shop-specific settings
-- ============================================================================
ALTER TABLE settings ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(shop_id);

CREATE INDEX IF NOT EXISTS idx_settings_shop_id ON settings(shop_id);

-- ============================================================================
-- ALTER MARKUP_MATRIX TABLE - Add shop-specific markups
-- ============================================================================
ALTER TABLE markup_matrix ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(shop_id);

CREATE INDEX IF NOT EXISTS idx_markup_matrix_shop_id ON markup_matrix(shop_id);

-- ============================================================================
-- INSERT DEFAULT SHOP (for existing data migration)
-- ============================================================================
-- This is a placeholder. After migration, assign all existing users to a default shop.
-- You'll need to:
-- 1. Create a shop record manually
-- 2. Create locations for that shop
-- 3. Update all existing users with shop_id

-- Example:
-- INSERT INTO shops (name, owner_id, email, phone, address) 
-- VALUES ('Default Shop', existing_user_uuid, 'shop@example.com', '(555) 123-4567', '123 Main St');
