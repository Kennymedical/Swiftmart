-- Migration 0012: Strict Admin Authorization & Audit for Security Alerts
CREATE OR REPLACE FUNCTION admin_manage_security_alert(
  p_alert_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_calling_user UUID;
  v_role TEXT;
  v_alert RECORD;
BEGIN
  v_calling_user := auth.uid();
  IF v_calling_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Server-side strict authorization: only 'admin' role allowed
  SELECT role INTO v_role FROM profiles WHERE id = v_calling_user;
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only full administrators can view, acknowledge, or resolve security alerts';
  END IF;

  SELECT * INTO v_alert FROM security_alerts WHERE id = p_alert_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Security alert not found';
  END IF;

  IF p_action = 'acknowledge' THEN
    UPDATE security_alerts
    SET acknowledged_at = now(),
        acknowledged_by = v_calling_user
    WHERE id = p_alert_id;

    INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
    VALUES (
      v_calling_user,
      COALESCE(v_alert.user_id, v_calling_user),
      'security_alert_acknowledged',
      jsonb_build_object('alert_id', p_alert_id, 'action', 'acknowledge')
    );
  ELSIF p_action = 'resolve' THEN
    UPDATE security_alerts
    SET resolved = TRUE,
        resolved_at = now(),
        resolved_by = v_calling_user
    WHERE id = p_alert_id;

    INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
    VALUES (
      v_calling_user,
      COALESCE(v_alert.user_id, v_calling_user),
      'security_alert_resolved',
      jsonb_build_object('alert_id', p_alert_id, 'action', 'resolve')
    );
  ELSE
    RAISE EXCEPTION 'Invalid action: must be acknowledge or resolve';
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action, 'alert_id', p_alert_id);
END;
$$;
