-- Migration 0007: PIN attempt lockouts and Staff permission audit logs
CREATE TABLE IF NOT EXISTS pin_security_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'admin', 'vendor', 'staff'
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type)
);

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'pin_failed', 'pin_locked', 'pin_verified', 'role_change', 'permission_change'
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for speedy lockout checks and audit trail display
CREATE INDEX IF NOT EXISTS idx_pin_locks_user ON pin_security_locks(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_target_event ON auth_audit_logs(event_type, created_at DESC);
