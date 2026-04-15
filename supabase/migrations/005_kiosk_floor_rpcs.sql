-- Shop floor kiosk: one Auth user per shop (role = kiosk). Technicians use PIN + RPCs; no per-tech Auth.

-- ============================================================================
-- Role: kiosk
-- ============================================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('tech', 'manager', 'admin', 'supervisor', 'owner', 'kiosk'));

-- ============================================================================
-- Auth trigger: allow kiosk in user_metadata.role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.shoplogic_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  display_name text;
  desired_role text;
BEGIN
  display_name := COALESCE(
    NULLIF(trim(meta->>'full_name'), ''),
    NULLIF(trim(meta->>'name'), ''),
    split_part(COALESCE(NEW.email, 'user'), '@', 1)
  );

  desired_role := COALESCE(NULLIF(lower(trim(meta->>'role')), ''), 'tech');

  IF desired_role NOT IN ('tech', 'manager', 'admin', 'supervisor', 'owner', 'kiosk') THEN
    desired_role := 'tech';
  END IF;

  INSERT INTO public.users (user_id, name, role, email, labor_rate, active)
  VALUES (
    NEW.id,
    display_name,
    desired_role,
    NEW.email,
    75.00,
    true
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(public.users.name, EXCLUDED.name),
        updated_at = now();

  RETURN NEW;
END;
$$;

-- ============================================================================
-- RPC: verify kiosk session + tech PIN (server-side; do not trust client PIN alone)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.kiosk_verify_tech(p_tech_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me record;
  tech record;
BEGIN
  SELECT user_id, role, shop_id INTO me FROM public.users WHERE user_id = auth.uid();
  IF me.user_id IS NULL OR me.role IS DISTINCT FROM 'kiosk' OR me.shop_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_kiosk');
  END IF;

  SELECT user_id, shop_id, pin, active, role INTO tech FROM public.users WHERE user_id = p_tech_id;
  IF tech.user_id IS NULL OR tech.shop_id IS DISTINCT FROM me.shop_id OR NOT tech.active OR tech.role IS DISTINCT FROM 'tech' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tech');
  END IF;

  IF tech.pin IS NOT NULL AND btrim(tech.pin) <> '' THEN
    IF p_pin IS DISTINCT FROM tech.pin THEN
      RETURN jsonb_build_object('ok', false, 'error', 'bad_pin');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_verify_tech(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_verify_tech(uuid, text) TO authenticated;

-- ============================================================================
-- RPC: clock in as floor tech (bypasses job_logs RLS tech_id = auth.uid())
-- ============================================================================

CREATE OR REPLACE FUNCTION public.kiosk_clock_in(p_tech_id uuid, p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me record;
  tech record;
  j record;
  new_id uuid;
BEGIN
  SELECT user_id, role, shop_id INTO me FROM public.users WHERE user_id = auth.uid();
  IF me.user_id IS NULL OR me.role IS DISTINCT FROM 'kiosk' OR me.shop_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_kiosk');
  END IF;

  SELECT user_id, shop_id, active, role INTO tech FROM public.users WHERE user_id = p_tech_id;
  IF tech.user_id IS NULL OR tech.shop_id IS DISTINCT FROM me.shop_id OR NOT tech.active OR tech.role IS DISTINCT FROM 'tech' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tech');
  END IF;

  SELECT job_id, shop_id, location_id, status, is_declined
  INTO j
  FROM public.jobs
  WHERE job_id = p_job_id;

  IF j.job_id IS NULL OR j.shop_id IS DISTINCT FROM me.shop_id OR j.is_declined OR j.status IS DISTINCT FROM 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_job');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.job_logs jl WHERE jl.tech_id = p_tech_id AND jl.clock_out IS NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_clocked_in');
  END IF;

  INSERT INTO public.job_logs (job_id, tech_id, shop_id, location_id, clock_in)
  VALUES (p_job_id, p_tech_id, j.shop_id, j.location_id, now())
  RETURNING log_id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'log_id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_clock_in(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_clock_in(uuid, uuid) TO authenticated;

-- ============================================================================
-- RPC: clock out open log for a tech in this shop (kiosk session only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.kiosk_clock_out(p_log_id uuid, p_elapsed_minutes integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me record;
  jl_shop uuid;
  jl_tech uuid;
  jl_out timestamptz;
BEGIN
  SELECT user_id, role, shop_id INTO me FROM public.users WHERE user_id = auth.uid();
  IF me.user_id IS NULL OR me.role IS DISTINCT FROM 'kiosk' OR me.shop_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_kiosk');
  END IF;

  SELECT j.shop_id, jl.tech_id, jl.clock_out
  INTO jl_shop, jl_tech, jl_out
  FROM public.job_logs jl
  JOIN public.jobs j ON j.job_id = jl.job_id
  WHERE jl.log_id = p_log_id;

  IF jl_shop IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'log_not_found');
  END IF;

  IF jl_shop IS DISTINCT FROM me.shop_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_shop');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = jl_tech AND u.shop_id = me.shop_id AND u.role = 'tech'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tech');
  END IF;

  IF jl_out IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_clocked_out');
  END IF;

  UPDATE public.job_logs
  SET
    clock_out = now(),
    elapsed_minutes = COALESCE(p_elapsed_minutes, 0),
    updated_at = now()
  WHERE log_id = p_log_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.kiosk_clock_out(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kiosk_clock_out(uuid, integer) TO authenticated;
