-- 1. Agregar columna return_method a sale_returns
ALTER TABLE sale_returns 
ADD COLUMN IF NOT EXISTS return_method TEXT DEFAULT 'cash' 
CHECK (return_method IN ('cash', 'card', 'transfer'));

-- 2. Actualizar función process_partial_return para incluir return_method
CREATE OR REPLACE FUNCTION process_partial_return(
  p_sale_id UUID,
  p_user_id UUID,
  p_shift_id UUID,
  p_reason TEXT,
  p_return_method TEXT,
  p_items JSONB
) RETURNS UUID AS $$
DECLARE
  v_return_id UUID;
  v_total_returned DECIMAL(12,2) := 0;
  v_item RECORD;
BEGIN
  -- Calcular total de la devolución
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, price DECIMAL(12,2))
  LOOP
    v_total_returned := v_total_returned + (v_item.quantity * v_item.price);
  END LOOP;

  -- Insertar cabecera de devolución
  INSERT INTO sale_returns (
    sale_id,
    user_id,
    shift_id,
    reason,
    return_method,
    total_returned
  ) VALUES (
    p_sale_id,
    p_user_id,
    p_shift_id,
    p_reason,
    p_return_method,
    v_total_returned
  ) RETURNING id INTO v_return_id;

  -- Insertar items de devolución y actualizar stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, price DECIMAL(12,2))
  LOOP
    INSERT INTO return_items (
      return_id,
      product_id,
      quantity,
      price
    ) VALUES (
      v_return_id,
      v_item.product_id,
      v_item.quantity,
      v_item.price
    );

    -- Devolver al inventario
    UPDATE products 
    SET stock = stock + v_item.quantity 
    WHERE id = v_item.product_id;
  END LOOP;

  -- Recalcular turno si aplica
  IF p_shift_id IS NOT NULL THEN
    PERFORM recalc_open_shift();
  END IF;

  RETURN v_return_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar recalc_open_shift para considerar solo devoluciones en efectivo
CREATE OR REPLACE FUNCTION recalc_open_shift() RETURNS VOID AS $$
DECLARE
  v_shift_id UUID;
  v_opening_cash DECIMAL(12,2);
  v_cash_sales DECIMAL(12,2);
  v_cash_expenses DECIMAL(12,2);
  v_cash_returns DECIMAL(12,2);
BEGIN
  -- Obtener el turno abierto
  SELECT id, opening_cash INTO v_shift_id, v_opening_cash 
  FROM shifts WHERE status = 'open' LIMIT 1;

  IF v_shift_id IS NOT NULL THEN
    -- Sumar ventas en efectivo
    SELECT COALESCE(SUM(total), 0) INTO v_cash_sales 
    FROM sales 
    WHERE shift_id = v_shift_id AND status = 'completed' AND payment_method = 'cash';

    -- Restar gastos en efectivo
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_expenses 
    FROM expenses 
    WHERE shift_id = v_shift_id AND (method = 'cash' OR method IS NULL);

    -- Restar devoluciones en efectivo
    SELECT COALESCE(SUM(total_returned), 0) INTO v_cash_returns 
    FROM sale_returns 
    WHERE shift_id = v_shift_id AND return_method = 'cash';

    -- Actualizar el turno
    UPDATE shifts SET 
      expected_cash = v_opening_cash + v_cash_sales - v_cash_expenses - v_cash_returns,
      total_sales = (SELECT COALESCE(SUM(total), 0) FROM sales WHERE shift_id = v_shift_id AND status = 'completed'),
      total_expenses = (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE shift_id = v_shift_id)
    WHERE id = v_shift_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Actualizar vista de estadísticas del dashboard
CREATE OR REPLACE VIEW dashboard_stats_view AS
SELECT 
  (SELECT COALESCE(SUM(total), 0) FROM sales WHERE status = 'completed' AND created_at::date = CURRENT_DATE) as sales_today,
  (SELECT COALESCE(SUM(total_returned), 0) FROM sale_returns WHERE created_at::date = CURRENT_DATE) as returns_today,
  (SELECT COALESCE(SUM(total_returned), 0) FROM sale_returns WHERE created_at::date = CURRENT_DATE AND return_method = 'cash') as cash_returns_today,
  (SELECT COALESCE(SUM(total_returned), 0) FROM sale_returns WHERE created_at::date = CURRENT_DATE AND return_method = 'card') as card_returns_today,
  (SELECT COALESCE(SUM(total_returned), 0) FROM sale_returns WHERE created_at::date = CURRENT_DATE AND return_method = 'transfer') as transfer_returns_today,
  (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE created_at::date = CURRENT_DATE) as expenses_today,
  (SELECT COUNT(*) FROM products WHERE stock <= stock_min) as low_stock_count,
  (SELECT COUNT(*) FROM layaways WHERE status = 'pending') as pending_layaways,
  (
    (SELECT COALESCE(SUM(total), 0) FROM sales WHERE status = 'completed' AND created_at::date = CURRENT_DATE) - 
    (SELECT COALESCE(SUM(total_returned), 0) FROM sale_returns WHERE created_at::date = CURRENT_DATE) -
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE created_at::date = CURRENT_DATE)
  ) as profit_today;
