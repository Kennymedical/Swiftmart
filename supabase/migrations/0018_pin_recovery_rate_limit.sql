-- Atomic, server-only throttling for PIN recovery email requests.
-- The application stores only an HMAC of the normalized email, never the email itself.
CREATE TABLE IF NOT EXISTS public.pin_recovery_rate_limits (
  email_hash text PRIMARY KEY CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_recovery_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pin_recovery_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pin_recovery_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_pin_recovery_request(
  p_email_hash text,
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
  v_row public.pin_recovery_rate_limits%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_email_hash IS NULL OR p_email_hash !~ '^[0-9a-f]{64}$' OR
     p_max_attempts < 1 OR p_window_seconds < 1 OR p_lock_seconds < 1 THEN
    RAISE EXCEPTION 'invalid recovery rate-limit arguments' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.pin_recovery_rate_limits(email_hash, attempts, window_started_at, locked_until, updated_at)
  VALUES (p_email_hash, 1, v_now, NULL, v_now)
  ON CONFLICT (email_hash) DO UPDATE SET
    attempts = CASE
      WHEN pin_recovery_rate_limits.locked_until IS NOT NULL AND pin_recovery_rate_limits.locked_until > v_now
        THEN pin_recovery_rate_limits.attempts
      WHEN pin_recovery_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        THEN 1
      WHEN pin_recovery_rate_limits.attempts >= p_max_attempts
        THEN pin_recovery_rate_limits.attempts
      ELSE pin_recovery_rate_limits.attempts + 1
    END,
    window_started_at = CASE
      WHEN pin_recovery_rate_limits.locked_until IS NOT NULL AND pin_recovery_rate_limits.locked_until > v_now
        THEN pin_recovery_rate_limits.window_started_at
      WHEN pin_recovery_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        THEN v_now
      ELSE pin_recovery_rate_limits.window_started_at
    END,
    locked_until = CASE
      WHEN pin_recovery_rate_limits.locked_until IS NOT NULL AND pin_recovery_rate_limits.locked_until > v_now
        THEN pin_recovery_rate_limits.locked_until
      WHEN pin_recovery_rate_limits.window_started_at > v_now - make_interval(secs => p_window_seconds)
           AND pin_recovery_rate_limits.attempts >= p_max_attempts
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

CREATE OR REPLACE FUNCTION public.reset_pin_recovery_request_limit(p_email_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_email_hash IS NULL OR p_email_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid recovery rate-limit key' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.pin_recovery_rate_limits WHERE email_hash = p_email_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_pin_recovery_request(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_pin_recovery_request(text, integer, integer, integer) TO service_role;
REVOKE ALL ON FUNCTION public.reset_pin_recovery_request_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_pin_recovery_request_limit(text) TO service_role;
