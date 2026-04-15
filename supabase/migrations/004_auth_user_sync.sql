-- Align public.users roles with app + RLS helpers, and sync new Supabase Auth users into public.users.

-- ============================================================================
-- Widen users.role (must run before any row uses owner/supervisor)
-- ============================================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('tech', 'manager', 'admin', 'supervisor', 'owner'));

-- ============================================================================
-- On new Auth user: create matching public.users row (user_id = auth.users.id)
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

  IF desired_role NOT IN ('tech', 'manager', 'admin', 'supervisor', 'owner') THEN
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

DROP TRIGGER IF EXISTS shoplogic_on_auth_user_created ON auth.users;

CREATE TRIGGER shoplogic_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.shoplogic_handle_new_auth_user();
