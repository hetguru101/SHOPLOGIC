-- ShopLogic: Row Level Security policies (multi-tenant by shop_id)
--
-- PREREQUISITE: Staff must sign in with Supabase Auth so JWT.subject = public.users.user_id.
-- The browser client must use a session (not only the anon key) for these policies to allow rows.
-- Link profiles after signup, e.g. set public.users.user_id = auth.users.id for that account
-- (exact migration depends on whether you create the public.users row before or after Auth signup).
--
-- Column names follow 001_init_schema.sql + 002_multi_shop_support.sql (e.g. jobs.tech_id, settings.config).
--
-- DATA: Rows with NULL shop_id on customers, vehicles, jobs, or job_logs are not visible until you backfill:
--   UPDATE customers SET shop_id = '<shop>' WHERE shop_id IS NULL;  (and similarly for other tables)

-- ============================================================================
-- Helpers (SECURITY DEFINER avoids RLS recursion when policies read public.users)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.app_user_shop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.shop_id
  FROM public.users u
  WHERE u.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_user_is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = auth.uid()
      AND u.role IN ('manager', 'admin', 'supervisor', 'owner')
  );
$$;

REVOKE ALL ON FUNCTION public.app_user_shop_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_user_is_manager() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_user_shop_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_is_manager() TO authenticated;

-- ============================================================================
-- Enable RLS on all application tables
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markup_matrix ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS
-- ============================================================================

DROP POLICY IF EXISTS users_select_same_shop ON public.users;
CREATE POLICY users_select_same_shop
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.app_user_shop_id() IS NOT NULL
      AND shop_id IS NOT NULL
      AND shop_id = public.app_user_shop_id()
    )
  );

DROP POLICY IF EXISTS users_insert_manager ON public.users;
CREATE POLICY users_insert_manager
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_is_manager()
    AND shop_id IS NOT NULL
    AND shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS users_update_self_or_manager ON public.users;
CREATE POLICY users_update_self_or_manager
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.app_user_is_manager()
      AND shop_id IS NOT NULL
      AND shop_id = public.app_user_shop_id()
      AND users.shop_id = public.app_user_shop_id()
    )
  )
  WITH CHECK (
    (user_id = auth.uid())
    OR (
      public.app_user_is_manager()
      AND shop_id IS NOT NULL
      AND shop_id = public.app_user_shop_id()
    )
  );

DROP POLICY IF EXISTS users_delete_manager ON public.users;
CREATE POLICY users_delete_manager
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_role() = 'admin'
    AND shop_id IS NOT NULL
    AND shop_id = public.app_user_shop_id()
    AND user_id <> auth.uid()
  );

-- ============================================================================
-- SHOPS
-- ============================================================================

DROP POLICY IF EXISTS shops_select_member ON public.shops;
CREATE POLICY shops_select_member
  ON public.shops
  FOR SELECT
  TO authenticated
  USING (
    shop_id = public.app_user_shop_id()
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS shops_update_owner_manager ON public.shops;
CREATE POLICY shops_update_owner_manager
  ON public.shops
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (
      public.app_user_is_manager()
      AND shop_id = public.app_user_shop_id()
    )
  )
  WITH CHECK (
    shop_id = public.app_user_shop_id()
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS shops_insert_owner ON public.shops;
CREATE POLICY shops_insert_owner
  ON public.shops
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- ============================================================================
-- LOCATIONS
-- ============================================================================

DROP POLICY IF EXISTS locations_select_shop ON public.locations;
CREATE POLICY locations_select_shop
  ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    public.app_user_shop_id() IS NOT NULL
    AND shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS locations_insert_manager ON public.locations;
CREATE POLICY locations_insert_manager
  ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_is_manager()
    AND shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS locations_update_manager ON public.locations;
CREATE POLICY locations_update_manager
  ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND shop_id = public.app_user_shop_id()
  )
  WITH CHECK (shop_id = public.app_user_shop_id());

DROP POLICY IF EXISTS locations_delete_manager ON public.locations;
CREATE POLICY locations_delete_manager
  ON public.locations
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_role() = 'admin'
    AND shop_id = public.app_user_shop_id()
  );

-- ============================================================================
-- USER_LOCATIONS
-- ============================================================================

DROP POLICY IF EXISTS user_locations_select_shop ON public.user_locations;
CREATE POLICY user_locations_select_shop
  ON public.user_locations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.app_user_shop_id() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.locations l
        WHERE l.location_id = user_locations.location_id
          AND l.shop_id = public.app_user_shop_id()
      )
    )
  );

DROP POLICY IF EXISTS user_locations_insert_manager ON public.user_locations;
CREATE POLICY user_locations_insert_manager
  ON public.user_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_is_manager()
    AND EXISTS (
      SELECT 1
      FROM public.locations l
      WHERE l.location_id = user_locations.location_id
        AND l.shop_id = public.app_user_shop_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = user_locations.user_id
        AND u.shop_id = public.app_user_shop_id()
    )
  );

DROP POLICY IF EXISTS user_locations_update_manager ON public.user_locations;
CREATE POLICY user_locations_update_manager
  ON public.user_locations
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND EXISTS (
      SELECT 1
      FROM public.locations l
      WHERE l.location_id = user_locations.location_id
        AND l.shop_id = public.app_user_shop_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.locations l
      WHERE l.location_id = user_locations.location_id
        AND l.shop_id = public.app_user_shop_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = user_locations.user_id
        AND u.shop_id = public.app_user_shop_id()
    )
  );

DROP POLICY IF EXISTS user_locations_delete_manager ON public.user_locations;
CREATE POLICY user_locations_delete_manager
  ON public.user_locations
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND EXISTS (
      SELECT 1
      FROM public.locations l
      WHERE l.location_id = user_locations.location_id
        AND l.shop_id = public.app_user_shop_id()
    )
  );

-- ============================================================================
-- CUSTOMERS
-- ============================================================================

DROP POLICY IF EXISTS customers_select_shop ON public.customers;
CREATE POLICY customers_select_shop
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (
    public.app_user_shop_id() IS NOT NULL
    AND customers.shop_id IS NOT NULL
    AND customers.shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS customers_insert_shop ON public.customers;
CREATE POLICY customers_insert_shop
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_shop_id() IS NOT NULL
    AND customers.shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS customers_update_shop ON public.customers;
CREATE POLICY customers_update_shop
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_shop_id() IS NOT NULL
    AND customers.shop_id = public.app_user_shop_id()
  )
  WITH CHECK (customers.shop_id = public.app_user_shop_id());

DROP POLICY IF EXISTS customers_delete_manager ON public.customers;
CREATE POLICY customers_delete_manager
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND customers.shop_id = public.app_user_shop_id()
  );

-- ============================================================================
-- VEHICLES
-- ============================================================================

DROP POLICY IF EXISTS vehicles_select_shop ON public.vehicles;
CREATE POLICY vehicles_select_shop
  ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (
    public.app_user_shop_id() IS NOT NULL
    AND vehicles.shop_id IS NOT NULL
    AND vehicles.shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS vehicles_insert_shop ON public.vehicles;
CREATE POLICY vehicles_insert_shop
  ON public.vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_shop_id() IS NOT NULL
    AND vehicles.shop_id = public.app_user_shop_id()
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.customer_id = vehicles.customer_id
        AND c.shop_id = public.app_user_shop_id()
    )
  );

DROP POLICY IF EXISTS vehicles_update_shop ON public.vehicles;
CREATE POLICY vehicles_update_shop
  ON public.vehicles
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_shop_id() IS NOT NULL
    AND vehicles.shop_id = public.app_user_shop_id()
  )
  WITH CHECK (vehicles.shop_id = public.app_user_shop_id());

DROP POLICY IF EXISTS vehicles_delete_manager ON public.vehicles;
CREATE POLICY vehicles_delete_manager
  ON public.vehicles
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND vehicles.shop_id = public.app_user_shop_id()
  );

-- ============================================================================
-- JOBS (schema column: tech_id)
-- ============================================================================

DROP POLICY IF EXISTS jobs_select_shop ON public.jobs;
CREATE POLICY jobs_select_shop
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    public.app_user_shop_id() IS NOT NULL
    AND jobs.shop_id IS NOT NULL
    AND jobs.shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS jobs_insert_shop ON public.jobs;
CREATE POLICY jobs_insert_shop
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_shop_id() IS NOT NULL
    AND jobs.shop_id = public.app_user_shop_id()
    AND EXISTS (
      SELECT 1
      FROM public.vehicles v
      WHERE v.vehicle_id = jobs.vehicle_id
        AND v.shop_id = public.app_user_shop_id()
    )
  );

DROP POLICY IF EXISTS jobs_update_shop ON public.jobs;
CREATE POLICY jobs_update_shop
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_shop_id() IS NOT NULL
    AND jobs.shop_id = public.app_user_shop_id()
  )
  WITH CHECK (jobs.shop_id = public.app_user_shop_id());

DROP POLICY IF EXISTS jobs_delete_manager ON public.jobs;
CREATE POLICY jobs_delete_manager
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND jobs.shop_id = public.app_user_shop_id()
  );

-- ============================================================================
-- JOB_LOGS
-- ============================================================================

DROP POLICY IF EXISTS job_logs_select_shop ON public.job_logs;
CREATE POLICY job_logs_select_shop
  ON public.job_logs
  FOR SELECT
  TO authenticated
  USING (
    public.app_user_shop_id() IS NOT NULL
    AND job_logs.shop_id IS NOT NULL
    AND job_logs.shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS job_logs_insert_shop ON public.job_logs;
CREATE POLICY job_logs_insert_shop
  ON public.job_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_shop_id() IS NOT NULL
    AND job_logs.shop_id = public.app_user_shop_id()
    AND job_logs.tech_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.job_id = job_logs.job_id
        AND j.shop_id = public.app_user_shop_id()
    )
  );

DROP POLICY IF EXISTS job_logs_update_own_or_manager ON public.job_logs;
CREATE POLICY job_logs_update_own_or_manager
  ON public.job_logs
  FOR UPDATE
  TO authenticated
  USING (
    job_logs.shop_id = public.app_user_shop_id()
    AND (
      job_logs.tech_id = auth.uid()
      OR public.app_user_is_manager()
    )
  )
  WITH CHECK (job_logs.shop_id = public.app_user_shop_id());

DROP POLICY IF EXISTS job_logs_delete_manager ON public.job_logs;
CREATE POLICY job_logs_delete_manager
  ON public.job_logs
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND job_logs.shop_id = public.app_user_shop_id()
  );

-- ============================================================================
-- SETTINGS (001: setting_id + config JSONB; 002 adds optional shop_id)
-- ============================================================================

DROP POLICY IF EXISTS settings_select_shop ON public.settings;
CREATE POLICY settings_select_shop
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (
    shop_id IS NULL
    OR shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS settings_insert_manager ON public.settings;
CREATE POLICY settings_insert_manager
  ON public.settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_is_manager()
    AND (
      shop_id IS NULL
      OR shop_id = public.app_user_shop_id()
    )
  );

DROP POLICY IF EXISTS settings_update_manager ON public.settings;
CREATE POLICY settings_update_manager
  ON public.settings
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND (
      shop_id IS NULL
      OR shop_id = public.app_user_shop_id()
    )
  )
  WITH CHECK (
    shop_id IS NULL
    OR shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS settings_delete_admin ON public.settings;
CREATE POLICY settings_delete_admin
  ON public.settings
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_role() = 'admin'
    AND shop_id = public.app_user_shop_id()
  );

-- ============================================================================
-- MARKUP_MATRIX
-- ============================================================================

DROP POLICY IF EXISTS markup_matrix_select_shop ON public.markup_matrix;
CREATE POLICY markup_matrix_select_shop
  ON public.markup_matrix
  FOR SELECT
  TO authenticated
  USING (
    markup_matrix.shop_id IS NULL
    OR markup_matrix.shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS markup_matrix_insert_manager ON public.markup_matrix;
CREATE POLICY markup_matrix_insert_manager
  ON public.markup_matrix
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_user_is_manager()
    AND markup_matrix.shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS markup_matrix_update_manager ON public.markup_matrix;
CREATE POLICY markup_matrix_update_manager
  ON public.markup_matrix
  FOR UPDATE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND (
      markup_matrix.shop_id IS NULL
      OR markup_matrix.shop_id = public.app_user_shop_id()
    )
  )
  WITH CHECK (
    markup_matrix.shop_id IS NULL
    OR markup_matrix.shop_id = public.app_user_shop_id()
  );

DROP POLICY IF EXISTS markup_matrix_delete_manager ON public.markup_matrix;
CREATE POLICY markup_matrix_delete_manager
  ON public.markup_matrix
  FOR DELETE
  TO authenticated
  USING (
    public.app_user_is_manager()
    AND markup_matrix.shop_id = public.app_user_shop_id()
  );
