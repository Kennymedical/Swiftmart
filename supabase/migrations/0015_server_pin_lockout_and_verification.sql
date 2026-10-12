-- Migration 0015: Server-Side PIN Lockout, Verification RPCs, and Multi-Step Vendor KYC
-- Ensures all columns and recovery tables exist idempotently.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Ensure KYC and Lockout Columns Exist on vendors
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS full_legal_name text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS residential_address text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS nin text,
ADD COLUMN IF NOT EXISTS nin_verified_by_paystack boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kyc_id_type text DEFAULT 'nin',
ADD COLUMN IF NOT EXISTS kyc_id_number text,
ADD COLUMN IF NOT EXISTS kyc_document_url text,
ADD COLUMN IF NOT EXISTS address_proof_type text,
ADD COLUMN IF NOT EXISTS address_proof_url text,
ADD COLUMN IF NOT EXISTS failed_pin_attempts int DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz DEFAULT NULL;

-- 2. Ensure Lockout Columns Exist on profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS failed_pin_attempts int DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz DEFAULT NULL;

-- 3. Ensure pin_reset_requests Table and Columns Exist
CREATE TABLE IF NOT EXISTS pin_reset_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'vendor', 'staff')),
  otp_code text,
  otp_hash text,
  otp_expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  failed_attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  status text NOT NULL DEFAULT 'otp_sent' CHECK (status IN ('otp_sent', 'otp_verified', 'fee_paid', 'completed', 'expired', 'locked')),
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  fee_amount numeric(12,2) NOT NULL DEFAULT 1000.00,
  paid_fee_reference text,
  fee_settled boolean DEFAULT false,
  fee_settled_at timestamptz
);

ALTER TABLE pin_reset_requests
ADD COLUMN IF NOT EXISTS otp_hash text,
ADD COLUMN IF NOT EXISTS fee_amount numeric(12,2) DEFAULT 1000.00,
ADD COLUMN IF NOT EXISTS paid_fee_reference text,
ADD COLUMN IF NOT EXISTS fee_settled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fee_settled_at timestamptz,
ADD COLUMN IF NOT EXISTS failed_attempts int DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts int DEFAULT 3,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'otp_sent';

ALTER TABLE pin_reset_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pin_reset_requests' AND policyname = 'Admins can manage all pin reset requests'
  ) THEN
    CREATE POLICY "Admins can manage all pin reset requests" ON pin_reset_requests
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pin_reset_requests' AND policyname = 'Users can view their own reset requests'
  ) THEN
    CREATE POLICY "Users can view their own reset requests" ON pin_reset_requests
      FOR SELECT USING (
        user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      );
  END IF;
END $$;

-- 4. Server-Side PIN Verification with Persistent 3-Attempt Lockout
CREATE OR REPLACE FUNCTION verify_dashboard_pin(
  p_role text,
  p_pin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_stored_pin text;
  v_failed_attempts int;
  v_locked_until timestamptz;
  v_new_attempts int;
  v_will_lock boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'locked', false,
      'attempts', 0,
      'message', 'Authentication required. Please sign in.'
    );
  END IF;

  IF p_role = 'vendor' THEN
    SELECT dashboard_pin_hash, COALESCE(failed_pin_attempts, 0), pin_locked_until
    INTO v_stored_pin, v_failed_attempts, v_locked_until
    FROM vendors
    WHERE user_id = v_uid;

    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'locked', false,
        'attempts', 0,
        'message', 'No approved merchant profile associated with this account.'
      );
    END IF;

    IF (v_locked_until IS NOT NULL AND v_locked_until > now()) OR v_failed_attempts >= 3 THEN
      RETURN json_build_object(
        'success', false,
        'locked', true,
        'attempts', v_failed_attempts,
        'message', 'PIN is locked due to 3 failed attempts. Paid recovery via email OTP is required.'
      );
    END IF;

    IF v_stored_pin IS NULL OR v_stored_pin = '' THEN
      RETURN json_build_object(
        'success', false,
        'locked', false,
        'attempts', 0,
        'message', 'No Security PIN established yet. Please create your 6-digit PIN.'
      );
    END IF;

    IF v_stored_pin = p_pin THEN
      UPDATE vendors
      SET failed_pin_attempts = 0,
          pin_locked_until = NULL
      WHERE user_id = v_uid;

      RETURN json_build_object(
        'success', true,
        'locked', false,
        'attempts', 0,
        'message', 'PIN verified successfully.'
      );
    ELSE
      v_new_attempts := v_failed_attempts + 1;
      v_will_lock := v_new_attempts >= 3;

      UPDATE vendors
      SET failed_pin_attempts = v_new_attempts,
          pin_locked_until = CASE WHEN v_will_lock THEN now() + INTERVAL '24 hours' ELSE NULL END
      WHERE user_id = v_uid;

      IF v_will_lock THEN
        RETURN json_build_object(
          'success', false,
          'locked', true,
          'attempts', 3,
          'message', 'PIN locked after 3 failed attempts. Paid recovery via email OTP is required.'
        );
      ELSE
        RETURN json_build_object(
          'success', false,
          'locked', false,
          'attempts', v_new_attempts,
          'message', format('Incorrect PIN (%s/3 attempts used).', v_new_attempts)
        );
      END IF;
    END IF;

  ELSE -- admin or staff
    SELECT dashboard_pin_hash, COALESCE(failed_pin_attempts, 0), pin_locked_until
    INTO v_stored_pin, v_failed_attempts, v_locked_until
    FROM profiles
    WHERE id = v_uid;

    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'locked', false,
        'attempts', 0,
        'message', 'Staff or admin profile not found.'
      );
    END IF;

    IF (v_locked_until IS NOT NULL AND v_locked_until > now()) OR v_failed_attempts >= 3 THEN
      RETURN json_build_object(
        'success', false,
        'locked', true,
        'attempts', v_failed_attempts,
        'message', 'PIN is locked due to 3 failed attempts. Paid recovery via email OTP is required.'
      );
    END IF;

    IF v_stored_pin IS NULL OR v_stored_pin = '' THEN
      RETURN json_build_object(
        'success', false,
        'locked', false,
        'attempts', 0,
        'message', 'No Security PIN established yet. Please create your 6-digit PIN.'
      );
    END IF;

    IF v_stored_pin = p_pin THEN
      UPDATE profiles
      SET failed_pin_attempts = 0,
          pin_locked_until = NULL
      WHERE id = v_uid;

      RETURN json_build_object(
        'success', true,
        'locked', false,
        'attempts', 0,
        'message', 'PIN verified successfully.'
      );
    ELSE
      v_new_attempts := v_failed_attempts + 1;
      v_will_lock := v_new_attempts >= 3;

      UPDATE profiles
      SET failed_pin_attempts = v_new_attempts,
          pin_locked_until = CASE WHEN v_will_lock THEN now() + INTERVAL '24 hours' ELSE NULL END
      WHERE id = v_uid;

      IF v_will_lock THEN
        RETURN json_build_object(
          'success', false,
          'locked', true,
          'attempts', 3,
          'message', 'PIN locked after 3 failed attempts. Paid recovery via email OTP is required.'
        );
      ELSE
        RETURN json_build_object(
          'success', false,
          'locked', false,
          'attempts', v_new_attempts,
          'message', format('Incorrect PIN (%s/3 attempts used).', v_new_attempts)
        );
      END IF;
    END IF;
  END IF;
END;
$$;

-- 5. Request PIN Reset OTP Function
CREATE OR REPLACE FUNCTION request_pin_reset_otp(
  p_email text,
  p_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_raw_otp text;
  v_otp_hash text;
  v_req_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE lower(email) = lower(trim(p_email));

  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id
    FROM auth.users au
    JOIN vendors v ON v.user_id = au.id
    WHERE lower(au.email) = lower(trim(p_email))
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'If this email is associated with a portal account, a verification code has been dispatched.'
    );
  END IF;

  v_raw_otp := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
  v_otp_hash := encode(digest(v_raw_otp || 'swiftmart_salt', 'sha256'), 'hex');

  INSERT INTO pin_reset_requests (
    user_id,
    email,
    role,
    otp_code,
    otp_hash,
    otp_expires_at,
    status
  )
  VALUES (
    v_user_id,
    lower(trim(p_email)),
    p_role,
    v_raw_otp,
    v_otp_hash,
    now() + INTERVAL '15 minutes',
    'otp_sent'
  )
  RETURNING id INTO v_req_id;

  RETURN json_build_object(
    'success', true,
    'request_id', v_req_id,
    'dispatch_token', v_raw_otp,
    'message', 'Verification code dispatched to your registered email.'
  );
END;
$$;

-- 6. Verify PIN Reset OTP Function
CREATE OR REPLACE FUNCTION verify_pin_reset_otp(
  p_request_id uuid,
  p_otp text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req pin_reset_requests%ROWTYPE;
  v_candidate_hash text;
BEGIN
  SELECT * INTO v_req
  FROM pin_reset_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired reset session.');
  END IF;

  IF v_req.otp_expires_at < now() THEN
    UPDATE pin_reset_requests SET status = 'expired' WHERE id = p_request_id;
    RETURN json_build_object('success', false, 'message', 'Verification code has expired. Please request a new code.');
  END IF;

  IF v_req.failed_attempts >= v_req.max_attempts THEN
    UPDATE pin_reset_requests SET status = 'locked' WHERE id = p_request_id;
    RETURN json_build_object('success', false, 'message', 'Too many invalid attempts. Session locked.');
  END IF;

  v_candidate_hash := encode(digest(trim(p_otp) || 'swiftmart_salt', 'sha256'), 'hex');

  IF v_req.otp_hash = v_candidate_hash OR v_req.otp_code = trim(p_otp) THEN
    UPDATE pin_reset_requests
    SET verified = true,
        status = 'otp_verified'
    WHERE id = p_request_id;

    RETURN json_build_object(
      'success', true,
      'status', 'otp_verified',
      'fee_required', true,
      'fee_amount', 1000.00,
      'message', 'Email verified. Please settle the ₦1,000 regeneration fee.'
    );
  ELSE
    UPDATE pin_reset_requests
    SET failed_attempts = failed_attempts + 1
    WHERE id = p_request_id;

    RETURN json_build_object(
      'success', false,
      'message', format('Invalid OTP code (%s/%s attempts used).', v_req.failed_attempts + 1, v_req.max_attempts)
    );
  END IF;
END;
$$;

-- 7. Settle PIN Reset Fee Function
CREATE OR REPLACE FUNCTION settle_pin_reset_fee(
  p_request_id uuid,
  p_payment_reference text,
  p_channel text DEFAULT 'paystack'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pin_reset_requests
  SET status = 'fee_paid',
      fee_settled = true,
      fee_settled_at = now(),
      paid_fee_reference = p_payment_reference
  WHERE id = p_request_id
    AND status IN ('otp_verified', 'otp_sent');

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Unable to record fee settlement for this session.');
  END IF;

  RETURN json_build_object(
    'success', true,
    'status', 'fee_paid',
    'message', 'Fee settled successfully. You may now establish a new Security PIN.'
  );
END;
$$;

-- 8. Complete PIN Reset Function
CREATE OR REPLACE FUNCTION complete_pin_reset(
  p_request_id uuid,
  p_new_pin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req pin_reset_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req
  FROM pin_reset_requests
  WHERE id = p_request_id;

  IF NOT FOUND OR v_req.status <> 'fee_paid' THEN
    RAISE EXCEPTION 'PIN recovery fee must be settled before setting a new PIN.';
  END IF;

  IF length(trim(p_new_pin)) <> 6 THEN
    RAISE EXCEPTION 'Security PIN must be exactly 6 digits.';
  END IF;

  IF v_req.role = 'vendor' THEN
    UPDATE vendors
    SET dashboard_pin_hash = trim(p_new_pin),
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE user_id = v_req.user_id;
  ELSE
    UPDATE profiles
    SET dashboard_pin_hash = trim(p_new_pin),
        failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_req.user_id;
  END IF;

  UPDATE pin_reset_requests
  SET status = 'completed',
      used_at = now()
  WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'message', 'New Security PIN established successfully.');
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION verify_dashboard_pin(text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION request_pin_reset_otp(text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION verify_pin_reset_otp(uuid, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION settle_pin_reset_fee(uuid, text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION complete_pin_reset(uuid, text) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
