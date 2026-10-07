-- Migration 0011: Security Alert Management Columns & Audit Controls
ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id);
ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts (resolved, acknowledged_at, created_at DESC);
