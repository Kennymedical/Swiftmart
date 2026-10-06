-- Migration 0008: Paid PIN Reset and Expiring Email OTPs
CREATE TABLE IF NOT EXISTS pin_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'vendor')),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  otp_verified BOOLEAN DEFAULT FALSE,
  failed_otp_attempts INT DEFAULT 0,
  fee_kobo BIGINT DEFAULT 100000, -- ₦1,000 standard recovery fee
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_method TEXT CHECK (payment_method IN ('wallet', 'paystack', 'admin_override')),
  paystack_reference TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookup speed and rate limiting
CREATE INDEX IF NOT EXISTS idx_pin_reset_lookup ON pin_reset_requests(user_id, email, otp_expires_at);

-- RLS setup
ALTER TABLE pin_reset_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view and manage their own pin reset requests"
    ON pin_reset_requests
    FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
