-- Migration 0009: Server-side OTP Generation, Hashing, Throttling & PIN Reset RPCs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Alter table to ensure hash column and usage tracking exist
ALTER TABLE pin_reset_requests ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE pin_reset_requests ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
ALTER TABLE pin_reset_requests ADD COLUMN IF NOT EXISTS max_otp_attempts INT DEFAULT 3;
ALTER TABLE pin_reset_requests ALTER COLUMN otp_code DROP NOT NULL;

-- Strict RLS on pin_reset_requests: drop insecure null uid policy
DROP POLICY IF EXISTS "Users can view and manage their own pin reset requests" ON pin_reset_requests;
DROP POLICY IF EXISTS "Users can only view their own pin reset requests" ON pin_reset_requests;

CREATE POLICY "Users can only view their own pin reset requests"
  ON pin_reset_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- 1. Server-side OTP request RPC with 15-minute rate limit throttling
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
BEGIN
  v_clean_email := lower(trim(p_email));
  IF v_clean_email = '' OR v_clean_email IS NULL THEN
    RAISE EXCEPTION 'Email is required for PIN recovery';
  END IF;

  IF p_role NOT IN ('admin', 'staff', 'vendor') THEN
    RAISE EXCEPTION 'Invalid role specified for PIN recovery';
  END IF;

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

  -- Enforce server-side rate limit: max 3 requests per 15 minutes
  SELECT count(*) INTO v_recent_count
  FROM pin_reset_requests
  WHERE email = v_clean_email
    AND created_at > (now() - INTERVAL '15 minutes');

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many OTP requests. Please wait 15 minutes before requesting another code.';
  END IF;

  -- Cryptographically generate 6-digit numeric OTP
  v_plain_otp := lpad((floor(random() * 900000) + 100000)::text, 6, '0');
  v_otp_hash := crypt(v_plain_otp, gen_salt('bf'));
  v_expires_at := now() + INTERVAL '10 minutes';

  -- Insert securely without plaintext otp_code in database
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

  -- Audit log request
  INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
  VALUES (
    v_user_id,
    v_user_id,
    'pin_reset_otp_requested',
    jsonb_build_object('role', p_role, 'reset_request_id', v_reset_id, 'expires_at', v_expires_at)
  );

  -- Return session info and plain OTP for backend mailer invocation
  RETURN jsonb_build_object(
    'success', true,
    'reset_request_id', v_reset_id,
    'expires_at', v_expires_at,
    'dispatch_token', v_plain_otp
  );
END;
$$;

-- 2. Server-side OTP verification with 3-attempt throttling
CREATE OR REPLACE FUNCTION verify_pin_reset_otp(p_reset_request_id UUID, p_otp_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_req RECORD;
  v_new_attempts INT;
BEGIN
  IF p_otp_code IS NULL OR length(trim(p_otp_code)) != 6 THEN
    RAISE EXCEPTION 'Verification code must be exactly 6 numeric digits';
  END IF;

  SELECT * INTO v_req FROM pin_reset_requests WHERE id = p_reset_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired recovery session';
  END IF;

  IF v_req.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'This recovery request has already been completed and cannot be reused';
  END IF;

  IF now() > v_req.otp_expires_at THEN
    RAISE EXCEPTION 'Verification code has expired. Please request a new code.';
  END IF;

  IF v_req.failed_otp_attempts >= 3 THEN
    INSERT INTO pin_security_locks (user_id, entity_type, failed_attempts, locked_until, last_attempt_at)
    VALUES (v_req.user_id, v_req.role, 3, now() + INTERVAL '30 minutes', now())
    ON CONFLICT (user_id, entity_type) DO UPDATE
      SET failed_attempts = 3,
          locked_until = now() + INTERVAL '30 minutes',
          last_attempt_at = now();

    RAISE EXCEPTION 'Maximum verification attempts exceeded (3/3). This recovery session is locked.';
  END IF;

  -- Secure cryptographic check
  IF crypt(trim(p_otp_code), v_req.otp_hash) != v_req.otp_hash THEN
    v_new_attempts := v_req.failed_otp_attempts + 1;
    UPDATE pin_reset_requests SET failed_otp_attempts = v_new_attempts WHERE id = p_reset_request_id;

    INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
    VALUES (
      v_req.user_id,
      v_req.user_id,
      'pin_reset_otp_failed',
      jsonb_build_object('attempt', v_new_attempts, 'reset_request_id', p_reset_request_id)
    );

    IF v_new_attempts >= 3 THEN
      INSERT INTO pin_security_locks (user_id, entity_type, failed_attempts, locked_until, last_attempt_at)
      VALUES (v_req.user_id, v_req.role, 3, now() + INTERVAL '30 minutes', now())
      ON CONFLICT (user_id, entity_type) DO UPDATE
        SET failed_attempts = 3,
            locked_until = now() + INTERVAL '30 minutes',
            last_attempt_at = now();

      RAISE EXCEPTION 'Incorrect verification code. Maximum attempts reached (3/3). Session locked.';
    ELSE
      RAISE EXCEPTION 'Incorrect verification code. % attempt(s) remaining.', (3 - v_new_attempts);
    END IF;
  END IF;

  -- Success: mark verified
  UPDATE pin_reset_requests
  SET otp_verified = TRUE
  WHERE id = p_reset_request_id;

  INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
  VALUES (
    v_req.user_id,
    v_req.user_id,
    'pin_reset_otp_verified',
    jsonb_build_object('reset_request_id', p_reset_request_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Verification code confirmed',
    'fee_kobo', v_req.fee_kobo
  );
END;
$$;

-- 3. Fee settlement RPC
CREATE OR REPLACE FUNCTION settle_pin_reset_fee(
  p_reset_request_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_req RECORD;
BEGIN
  SELECT * INTO v_req FROM pin_reset_requests WHERE id = p_reset_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recovery session not found';
  END IF;

  IF NOT v_req.otp_verified THEN
    RAISE EXCEPTION 'Cannot settle fee before OTP code has been verified';
  END IF;

  IF v_req.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Recovery session has already been finalized';
  END IF;

  UPDATE pin_reset_requests
  SET payment_status = 'paid',
      payment_method = p_payment_method,
      paystack_reference = p_payment_reference
  WHERE id = p_reset_request_id;

  INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
  VALUES (
    v_req.user_id,
    v_req.user_id,
    'pin_reset_fee_settled',
    jsonb_build_object('reset_request_id', p_reset_request_id, 'reference', p_payment_reference)
  );

  RETURN jsonb_build_object('success', true, 'payment_status', 'paid');
END;
$$;

-- 4. Complete PIN reset RPC with user binding & one-time use invalidation
CREATE OR REPLACE FUNCTION complete_pin_reset(
  p_reset_request_id UUID,
  p_new_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_req RECORD;
  v_calling_user UUID;
BEGIN
  IF p_new_pin IS NULL OR length(trim(p_new_pin)) != 6 OR p_new_pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 6 numeric digits';
  END IF;

  SELECT * INTO v_req FROM pin_reset_requests WHERE id = p_reset_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid recovery request';
  END IF;

  IF v_req.used_at IS NOT NULL OR v_req.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'This recovery session has already been used and is invalidated';
  END IF;

  IF NOT v_req.otp_verified THEN
    RAISE EXCEPTION 'Recovery OTP has not been verified';
  END IF;

  IF v_req.payment_status != 'paid' THEN
    RAISE EXCEPTION 'Regeneration fee must be paid before setting a new PIN';
  END IF;

  v_calling_user := auth.uid();
  IF v_calling_user IS NOT NULL AND v_calling_user != v_req.user_id THEN
    RAISE EXCEPTION 'Unauthorized: Authenticated account does not match this recovery request';
  END IF;

  IF v_req.role IN ('admin', 'staff') THEN
    UPDATE profiles
    SET dashboard_pin_hash = trim(p_new_pin)
    WHERE id = v_req.user_id;
  ELSIF v_req.role = 'vendor' THEN
    UPDATE vendors
    SET dashboard_pin_hash = trim(p_new_pin)
    WHERE user_id = v_req.user_id;
  END IF;

  UPDATE pin_reset_requests
  SET used_at = now(),
      completed_at = now()
  WHERE id = p_reset_request_id;

  DELETE FROM pin_security_locks WHERE user_id = v_req.user_id;

  INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
  VALUES (
    v_req.user_id,
    v_req.user_id,
    'pin_reset_completed',
    jsonb_build_object('role', v_req.role, 'reset_request_id', p_reset_request_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'PIN updated successfully and recovery request finalized'
  );
END;
$$;
