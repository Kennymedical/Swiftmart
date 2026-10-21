-- Migration 0006: Staff Roles and Dashboard PIN Management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'user_role' AND pg_enum.enumlabel = 'staff'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'staff';
  END IF;
END $$;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dashboard_pin_hash text,
ADD COLUMN IF NOT EXISTS staff_permissions jsonb DEFAULT jsonb_build_object(
  'manage_orders', true,
  'manage_kyc', true,
  'manage_posts', true,
  'manage_payouts', false,
  'manage_commissions', false
);

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS dashboard_pin_hash text;
