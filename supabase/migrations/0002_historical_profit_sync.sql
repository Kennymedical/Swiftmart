-- Function to calculate and backfill all past platform profits into platform_treasury and platform_revenue
CREATE OR REPLACE FUNCTION sync_historical_platform_profits()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_commission BIGINT := 0;
  v_total_shipping BIGINT := 0;
  v_total_profit BIGINT := 0;
  v_new_balance BIGINT := 0;
BEGIN
  -- Sum up commissions from all paid orders
  SELECT COALESCE(SUM(commission_kobo), 0)
  INTO v_total_commission
  FROM orders
  WHERE status = 'paid';

  -- Calculate shipping margins (up to 500 NGN = 50000 kobo per order with shipping)
  SELECT COALESCE(SUM(LEAST(shipping_kobo, 50000)), 0)
  INTO v_total_shipping
  FROM orders
  WHERE status = 'paid' AND shipping_kobo > 0;

  v_total_profit := v_total_commission + v_total_shipping;

  IF v_total_profit > 0 THEN
    -- Update treasury balance
    UPDATE platform_treasury
    SET balance_kobo = balance_kobo + v_total_profit,
        updated_at = NOW()
    RETURNING balance_kobo INTO v_new_balance;

    -- Record sync entry in platform_revenue ledger
    INSERT INTO platform_revenue (
      source,
      amount_kobo,
      balance_after_kobo,
      description
    ) VALUES (
      'commission',
      v_total_profit,
      v_new_balance,
      'Calculated & synced historical platform profits (commissions + shipping margins)'
    );
  ELSE
    SELECT balance_kobo INTO v_new_balance FROM platform_treasury LIMIT 1;
  END IF;

  RETURN v_new_balance;
END;
$$;
