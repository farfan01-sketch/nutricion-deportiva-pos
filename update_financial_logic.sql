-- 1. Actualizar recalc_open_shift para incluir abonos de apartados
CREATE OR REPLACE FUNCTION recalc_open_shift() RETURNS VOID AS $$
DECLARE
  v_shift_id UUID;
  v_opening_cash DECIMAL(12,2);
  v_cash_sales DECIMAL(12,2);
  v_cash_layaway_payments DECIMAL(12,2);
  v_cash_expenses DECIMAL(12,2);
  v_cash_returns DECIMAL(12,2);
  v_total_sales DECIMAL(12,2);
  v_total_layaway_payments DECIMAL(12,2);
BEGIN
  -- Obtener el turno abierto
  SELECT id, opening_cash INTO v_shift_id, v_opening_cash 
  FROM shifts WHERE status = 'open' LIMIT 1;

  IF v_shift_id IS NOT NULL THEN
    -- Sumar ventas en efectivo (solo ventas normales, los apartados se cuentan por abonos)
    SELECT COALESCE(SUM(total), 0) INTO v_cash_sales 
    FROM sales 
    WHERE shift_id = v_shift_id AND status = 'completed' AND payment_method = 'cash' AND type = 'sale';

    -- Sumar abonos de apartados en efectivo
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_layaway_payments
    FROM layaway_payments
    WHERE shift_id = v_shift_id AND payment_method = 'cash';

    -- Restar gastos en efectivo
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_expenses 
    FROM expenses 
    WHERE shift_id = v_shift_id AND (method = 'cash' OR method IS NULL);

    -- Restar devoluciones en efectivo
    SELECT COALESCE(SUM(total_returned), 0) INTO v_cash_returns 
    FROM sale_returns 
    WHERE shift_id = v_shift_id AND return_method = 'cash';

    -- Calcular ventas totales del turno (Ventas normales + Abonos de apartados)
    SELECT COALESCE(SUM(total), 0) INTO v_total_sales
    FROM sales
    WHERE shift_id = v_shift_id AND status = 'completed' AND type = 'sale';

    SELECT COALESCE(SUM(amount), 0) INTO v_total_layaway_payments
    FROM layaway_payments
    WHERE shift_id = v_shift_id;

    -- Actualizar el turno
    UPDATE shifts SET 
      expected_cash = v_opening_cash + v_cash_sales + v_cash_layaway_payments - v_cash_expenses - v_cash_returns,
      total_sales = v_total_sales + v_total_layaway_payments,
      total_expenses = (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE shift_id = v_shift_id)
    WHERE id = v_shift_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Actualizar vista de estadísticas del dashboard para incluir abonos por método
DROP VIEW IF EXISTS dashboard_stats_view;
CREATE OR REPLACE VIEW dashboard_stats_view AS
WITH daily_sales AS (
  SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE status = 'completed' AND type = 'sale' AND created_at::date = CURRENT_DATE
),
daily_returns AS (
  SELECT 
    COALESCE(SUM(total_returned), 0) as total,
    COALESCE(SUM(CASE WHEN return_method = 'cash' THEN total_returned ELSE 0 END), 0) as cash,
    COALESCE(SUM(CASE WHEN return_method = 'card' THEN total_returned ELSE 0 END), 0) as card,
    COALESCE(SUM(CASE WHEN return_method = 'transfer' THEN total_returned ELSE 0 END), 0) as transfer
  FROM sale_returns WHERE created_at::date = CURRENT_DATE
),
daily_expenses AS (
  SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_at::date = CURRENT_DATE
),
daily_layaway_payments AS (
  SELECT 
    COALESCE(SUM(amount), 0) as total,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash,
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0) as card,
    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END), 0) as transfer
  FROM layaway_payments WHERE created_at::date = CURRENT_DATE
)
SELECT 
  (SELECT total FROM daily_sales) as sales_today,
  (SELECT total FROM daily_returns) as returns_today,
  (SELECT cash FROM daily_returns) as cash_returns_today,
  (SELECT card FROM daily_returns) as card_returns_today,
  (SELECT transfer FROM daily_returns) as transfer_returns_today,
  (SELECT total FROM daily_expenses) as expenses_today,
  (SELECT COUNT(*) FROM products WHERE stock <= stock_min) as low_stock_count,
  (SELECT COUNT(*) FROM layaways WHERE status = 'pending') as pending_layaways,
  (SELECT total FROM daily_layaway_payments) as layaway_payments_today,
  (SELECT cash FROM daily_layaway_payments) as layaway_cash_payments_today,
  (SELECT card FROM daily_layaway_payments) as layaway_card_payments_today,
  (SELECT transfer FROM daily_layaway_payments) as layaway_transfer_payments_today,
  (
    (SELECT total FROM daily_sales) + 
    (SELECT total FROM daily_layaway_payments) - 
    (SELECT total FROM daily_returns) -
    (SELECT total FROM daily_expenses)
  ) as profit_today;
