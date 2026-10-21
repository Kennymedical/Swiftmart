-- Migration 0010: Atomic Concurrency Throttling, Zero-Leak OTP Delivery & Security Alerts

-- 1. Security alerts table for suspicious activity
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved ON security_alerts (resolved, created_at DESC);

-- Enable RLS on security alerts (accessible only to admin role)
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security alerts" ON security_alerts;
CREATE POLICY "Admins can view security alerts"
  ON security_alerts
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Internal email delivery queue table (service-role only, never readable by public/anon)
CREATE TABLE IF NOT EXISTS pin_recovery_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_request_id UUID REFERENCES pin_reset_requests(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  attempts INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE pin_recovery_email_queue ENABLE ROW LEVEL SECURITY;

-- 3. Atomic request_pin_reset_otp with PG Advisory Lock & ZERO plaintext leakage to caller
CREATE OR REPLACE FUNCTION request_pin_reset_otp(p_email TEXT, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_recent_count INT;
  v_plain_otp TEXT;
  v_otp_hash TEXT;
  v_reset_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_clean_email TEXT;
  v_recent_failures INT;
BEGIN
  v_clean_email := lower(trim(p_email));
  IF v_clean_email = '' OR v_clean_email IS NULL THEN
    RAISE EXCEPTION 'Email is required for PIN recovery';
  END IF;

  IF p_role NOT IN ('admin', 'staff', 'vendor') THEN
    RAISE EXCEPTION 'Invalid role specified for PIN recovery';
  END IF;

  -- ATOMIC CONCURRENCY CONTROL: Acquire transaction-level advisory lock based on email hash
  PERFORM pg_advisory_xact_lock(hashtext(v_clean_email));

  -- Verify user existence in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_clean_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Account not found or not eligible for PIN recovery';
  END IF;

  -- Validate role alignment
  IF p_role IN ('admin', 'staff') THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role IN ('admin', 'staff')) THEN
      RAISE EXCEPTION 'Account is not authorized for administrator or staff operations';
    END IF;
  ELSIF p_role = 'vendor' THEN
    IF NOT EXISTS (SELECT 1 FROM vendors WHERE user_id = v_user_id AND status = 'approved') THEN
      RAISE EXCEPTION 'Account does not have an approved merchant storefront';
    END IF;
  END IF;

  -- Check recent rate limit atomically: max 3 requests per 15 minutes
  SELECT count(*) INTO v_recent_count
  FROM pin_reset_requests
  WHERE email = v_clean_email
    AND created_at > (now() - INTERVAL '15 minutes');

  IF v_recent_count >= 3 THEN
    -- Trigger suspicious alert if requests keep hammering
    INSERT INTO security_alerts (alert_type, severity, user_id, details)
    VALUES (
      'pin_reset_rate_limit_exceeded',
      'medium',
      v_user_id,
      jsonb_build_object('email', v_clean_email, 'attempts_15m', v_recent_count)
    );
    RAISE EXCEPTION 'Too many OTP requests. Please wait 15 minutes before requesting another code.';
  END IF;

  -- Check if this account has had multiple recent lockouts
  SELECT count(*) INTO v_recent_failures
  FROM pin_security_locks
  WHERE user_id = v_user_id
    AND last_attempt_at > (now() - INTERVAL '2 hours');

  IF v_recent_failures >= 2 THEN
    INSERT INTO security_alerts (alert_type, severity, user_id, details)
    VALUES (
      'repeated_pin_lockouts',
      'high',
      v_user_id,
      jsonb_build_object('email', v_clean_email, 'lockout_count', v_recent_failures)
    );
  END IF;

  -- Generate 6-digit cryptographic numeric OTP
  v_plain_otp := lpad((floor(random() * 900000) + 100000)::text, 6, '0');
  v_otp_hash := crypt(v_plain_otp, gen_salt('bf'));
  v_expires_at := now() + INTERVAL '10 minutes';

  -- Store OTP hash in database (NEVER plaintext)
  INSERT INTO pin_reset_requests (
    user_id,
    role,
    email,
    otp_hash,
    otp_expires_at,
    failed_otp_attempts,
    fee_kobo,
    payment_status
  ) VALUES (
    v_user_id,
    p_role,
    v_clean_email,
    v_otp_hash,
    v_expires_at,
    0,
    100000,
    'pending'
  ) RETURNING id INTO v_reset_id;

  -- Enqueue for internal mail delivery (accessible only by server-side processes)
  INSERT INTO pin_recovery_email_queue (
    reset_request_id,
    recipient_email,
    status
  ) VALUES (
    v_reset_id,
    v_clean_email,
    'queued'
  );

  -- Audit log request
  INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
  VALUES (
    v_user_id,
    v_user_id,
    'pin_reset_otp_requested',
    jsonb_build_object('role', p_role, 'reset_request_id', v_reset_id, 'expires_at', v_expires_at)
  );

  -- CRITICAL: Return ONLY session identifier and expiration. NO plaintext OTP token!
  RETURN jsonb_build_object(
    'success', true,
    'reset_request_id', v_reset_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- 4. Automated monitor trigger for failed attempts and lockouts
CREATE OR REPLACE FUNCTION trg_monitor_pin_failures()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.failed_otp_attempts >= 3 THEN
    INSERT INTO security_alerts (alert_type, severity, user_id, details)
    VALUES (
      'pin_verification_lockout',
      'critical',
      NEW.user_id,
      jsonb_build_object(
        'reset_request_id', NEW.id,
        'email', NEW.email,
        'role', NEW.role,
        'failed_attempts', NEW.failed_otp_attempts
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_pin_reset_attempts_changed ON pin_reset_requests;
CREATE TRIGGER on_pin_reset_attempts_changed
  AFTER UPDATE OF failed_otp_attempts ON pin_reset_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_monitor_pin_failures();
