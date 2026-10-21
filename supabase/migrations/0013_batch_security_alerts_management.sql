-- Migration 0013: Batch Security Alert Management with Audit Logging
CREATE OR REPLACE FUNCTION admin_batch_manage_security_alerts(
  p_alert_ids UUID[],
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
  v_id UUID;
  v_processed INT := 0;
BEGIN
  v_calling_user := auth.uid();
  IF v_calling_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_calling_user;
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only full administrators can manage security alerts';
  END IF;

  IF p_action NOT IN ('acknowledge', 'resolve') THEN
    RAISE EXCEPTION 'Invalid action: must be acknowledge or resolve';
  END IF;

  FOREACH v_id IN ARRAY p_alert_ids
  LOOP
    SELECT * INTO v_alert FROM security_alerts WHERE id = v_id;
    IF FOUND THEN
      IF p_action = 'acknowledge' THEN
        UPDATE security_alerts
        SET acknowledged_at = COALESCE(acknowledged_at, now()),
            acknowledged_by = COALESCE(acknowledged_by, v_calling_user)
        WHERE id = v_id;

        INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
        VALUES (
          v_calling_user,
          COALESCE(v_alert.user_id, v_calling_user),
          'security_alert_acknowledged',
          jsonb_build_object('alert_id', v_id, 'action', 'acknowledge', 'batch', true)
        );
        v_processed := v_processed + 1;

      ELSIF p_action = 'resolve' THEN
        UPDATE security_alerts
        SET resolved = TRUE,
            resolved_at = COALESCE(resolved_at, now()),
            resolved_by = COALESCE(resolved_by, v_calling_user)
        WHERE id = v_id;

        INSERT INTO auth_audit_logs (actor_id, target_user_id, event_type, metadata)
        VALUES (
          v_calling_user,
          COALESCE(v_alert.user_id, v_calling_user),
          'security_alert_resolved',
          jsonb_build_object('alert_id', v_id, 'action', 'resolve', 'batch', true)
        );
        v_processed := v_processed + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'count', v_processed
  );
END;
$$;
