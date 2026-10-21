-- Migration 0014: Session Security, Rate Limits, Device Audit, and Vendor Approval Workflow

-- Ensure audit log columns and indexes
ALTER TABLE auth_audit_logs 
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS device_model text;

-- Add previous device memory to pin_security_locks
ALTER TABLE pin_security_locks
  ADD COLUMN IF NOT EXISTS known_devices text[] DEFAULT ARRAY[]::text[];

-- RPC: Record auth attempt, enforce server-side lockouts, track device fingerprints
CREATE OR REPLACE FUNCTION record_auth_attempt(
  p_user_id uuid,
  p_entity_type text,
  p_success boolean,
  p_event_type text,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_model text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock record;
  v_is_locked boolean := false;
  v_device_identifier text;
  v_device_mismatch boolean := false;
  v_new_attempts int := 0;
BEGIN
  v_device_identifier := COALESCE(p_device_model, p_user_agent, 'unknown_device');

  -- Get or initialize lock record
  SELECT * INTO v_lock FROM pin_security_locks
  WHERE user_id = p_user_id AND entity_type = p_entity_type;

  IF NOT FOUND THEN
    INSERT INTO pin_security_locks (user_id, entity_type, failed_attempts, last_attempt_at, known_devices)
    VALUES (p_user_id, p_entity_type, 0, now(), ARRAY[v_device_identifier])
    RETURNING * INTO v_lock;
  END IF;

  -- Check if currently locked
  IF v_lock.locked_until IS NOT NULL AND v_lock.locked_until > now() THEN
    -- Audit rejected locked attempt
    INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, ip_address, user_agent, device_model, metadata)
    VALUES (p_user_id, p_user_id, 'pin_locked_attempt', p_ip, p_user_agent, p_device_model, p_metadata || jsonb_build_object('locked_until', v_lock.locked_until));
    
    RETURN jsonb_build_object(
      'allowed', false,
      'is_locked', true,
      'locked_until', v_lock.locked_until,
      'message', 'Account temporarily locked due to repeated failed attempts. Please wait or use paid recovery.'
    );
  END IF;

  IF p_success THEN
    -- Check if device is new
    IF v_lock.known_devices IS NOT NULL AND array_length(v_lock.known_devices, 1) > 0 THEN
      IF NOT (v_device_identifier = ANY(v_lock.known_devices)) THEN
        v_device_mismatch := true;
      END IF;
    END IF;

    -- Add device to known devices and reset failed attempts
    UPDATE pin_security_locks
    SET failed_attempts = 0,
        locked_until = NULL,
        last_attempt_at = now(),
        known_devices = array_append(
          array_remove(COALESCE(known_devices, ARRAY[]::text[]), v_device_identifier),
          v_device_identifier
        )
    WHERE user_id = p_user_id AND entity_type = p_entity_type;

    -- Log successful sign in
    INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, ip_address, user_agent, device_model, metadata)
    VALUES (p_user_id, p_user_id, p_event_type, p_ip, p_user_agent, p_device_model, p_metadata || jsonb_build_object('device_mismatch', v_device_mismatch));

    RETURN jsonb_build_object(
      'allowed', true,
      'is_locked', false,
      'device_mismatch', v_device_mismatch
    );
  ELSE
    -- Increment failed attempts
    v_new_attempts := v_lock.failed_attempts + 1;
    IF v_new_attempts >= 3 THEN
      UPDATE pin_security_locks
      SET failed_attempts = v_new_attempts,
          locked_until = now() + interval '15 minutes',
          last_attempt_at = now()
      WHERE user_id = p_user_id AND entity_type = p_entity_type;

      -- Audit lockout
      INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, ip_address, user_agent, device_model, metadata)
      VALUES (p_user_id, p_user_id, 'pin_locked', p_ip, p_user_agent, p_device_model, p_metadata || jsonb_build_object('failed_attempts', v_new_attempts));

      RETURN jsonb_build_object(
        'allowed', false,
        'is_locked', true,
        'locked_until', now() + interval '15 minutes',
        'failed_attempts', v_new_attempts,
        'message', '3 failed attempts reached. Account locked for 15 minutes.'
      );
    ELSE
      UPDATE pin_security_locks
      SET failed_attempts = v_new_attempts,
          last_attempt_at = now()
      WHERE user_id = p_user_id AND entity_type = p_entity_type;

      -- Audit failed attempt
      INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, ip_address, user_agent, device_model, metadata)
      VALUES (p_user_id, p_user_id, 'pin_failed', p_ip, p_user_agent, p_device_model, p_metadata || jsonb_build_object('failed_attempts', v_new_attempts));

      RETURN jsonb_build_object(
        'allowed', false,
        'is_locked', false,
        'failed_attempts', v_new_attempts,
        'remaining_attempts', 3 - v_new_attempts,
        'message', format('Incorrect PIN. %s attempts remaining.', 3 - v_new_attempts)
      );
    END IF;
  END IF;
END;
$$;

-- RPC: Admin review vendor, update status, and dispatch next-step notification
CREATE OR REPLACE FUNCTION admin_review_vendor(
  p_vendor_id uuid,
  p_decision text, -- 'approved' or 'rejected'
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_role text;
  v_vendor record;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role INTO v_admin_role FROM profiles WHERE id = v_admin_id;
  IF v_admin_role NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'Administrative permissions required to review vendors';
  END IF;

  SELECT * INTO v_vendor FROM vendors WHERE id = p_vendor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor record not found';
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE vendors
    SET status = 'approved',
        updated_at = now()
    WHERE id = p_vendor_id;

    -- Send notification with next step
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      v_vendor.user_id,
      'vendor_application_approved',
      'Vendor Application Approved!',
      'Congratulations! Your SwiftMart merchant store "' || v_vendor.business_name || '" has been approved. Next step: Sign in to your merchant portal and establish your Security PIN.',
      '/vendor/login'
    );

    -- Log audit
    INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
    VALUES (
      v_admin_id,
      v_vendor.user_id,
      'vendor_approval',
      jsonb_build_object('vendor_id', p_vendor_id, 'business_name', v_vendor.business_name)
    );

    RETURN jsonb_build_object('success', true, 'status', 'approved');

  ELSIF p_decision = 'rejected' THEN
    UPDATE vendors
    SET status = 'rejected',
        updated_at = now()
    WHERE id = p_vendor_id;

    -- Send notification with next step
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      v_vendor.user_id,
      'vendor_application_rejected',
      'Vendor Application Update',
      COALESCE(p_reason, 'Your vendor application requires revisions. Next step: Review your NIN and settlement bank credentials, then reapply.'),
      '/become-a-vendor'
    );

    -- Log audit
    INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
    VALUES (
      v_admin_id,
      v_vendor.user_id,
      'vendor_rejection',
      jsonb_build_object('vendor_id', p_vendor_id, 'reason', p_reason)
    );

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  ELSE
    RAISE EXCEPTION 'Invalid review decision. Must be approved or rejected.';
  END IF;
END;
$$;
