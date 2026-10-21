-- Persistent, atomic account-level PIN attempt limiter. The functions are callable
-- only with the service role; the browser must never execute them directly.
CREATE TABLE IF NOT EXISTS public.dashboard_pin_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'vendor')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.dashboard_pin_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dashboard_pin_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.dashboard_pin_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_dashboard_pin_attempt(
  p_user_id uuid,
  p_role text,
  p_max_attempts integer DEFAULT 3,
  p_window_seconds integer DEFAULT 900,
  p_lock_seconds integer DEFAULT 900
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.dashboard_pin_rate_limits%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_role NOT IN ('admin', 'vendor') OR
     p_max_attempts < 1 OR p_window_seconds < 1 OR p_lock_seconds < 1 THEN
    RAISE EXCEPTION 'invalid PIN rate-limit arguments' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.dashboard_pin_rate_limits(user_id, role, attempts, window_started_at, locked_until, updated_at)
  VALUES (p_user_id, p_role, 1, v_now, NULL, v_now)
  ON CONFLICT (user_id, role) DO UPDATE SET
    attempts = CASE
      WHEN dashboard_pin_rate_limits.locked_until IS NOT NULL AND dashboard_pin_rate_limits.locked_until > v_now
        THEN dashboard_pin_rate_limits.attempts
      WHEN dashboard_pin_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        THEN 1
      WHEN dashboard_pin_rate_limits.attempts >= p_max_attempts
        THEN dashboard_pin_rate_limits.attempts
      ELSE dashboard_pin_rate_limits.attempts + 1
    END,
    window_started_at = CASE
      WHEN dashboard_pin_rate_limits.locked_until IS NOT NULL AND dashboard_pin_rate_limits.locked_until > v_now
        THEN dashboard_pin_rate_limits.window_started_at
      WHEN dashboard_pin_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        THEN v_now
      ELSE dashboard_pin_rate_limits.window_started_at
    END,
    locked_until = CASE
      WHEN dashboard_pin_rate_limits.locked_until IS NOT NULL AND dashboard_pin_rate_limits.locked_until > v_now
        THEN dashboard_pin_rate_limits.locked_until
      WHEN dashboard_pin_rate_limits.window_started_at > v_now - make_interval(secs => p_window_seconds)
           AND dashboard_pin_rate_limits.attempts >= p_max_attempts
        THEN v_now + make_interval(secs => p_lock_seconds)
      ELSE NULL
    END,
    updated_at = v_now
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'allowed', v_row.locked_until IS NULL OR v_row.locked_until <= v_now,
    'attempts', v_row.attempts,
    'locked_until', v_row.locked_until
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_dashboard_pin_attempts(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_role NOT IN ('admin', 'vendor') THEN
    RAISE EXCEPTION 'invalid PIN rate-limit arguments' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.dashboard_pin_rate_limits WHERE user_id = p_user_id AND role = p_role;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_dashboard_pin_attempt(uuid, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_dashboard_pin_attempt(uuid, text, integer, integer, integer) TO service_role;
REVOKE ALL ON FUNCTION public.reset_dashboard_pin_attempts(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_dashboard_pin_attempts(uuid, text) TO service_role;
