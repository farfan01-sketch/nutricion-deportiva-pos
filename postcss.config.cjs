-- Agregar columnas de utilidad real y COGS a la tabla shifts para auditoría
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS real_profit DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cogs DECIMAL(12,2) DEFAULT 0;

-- Actualizar la función recalc_open_shift para incluir COGS y Utilidad Real
CREATE OR REPLACE FUNCTION recalc_open_shift() RETURNS VOID AS $$
DECLARE
  v_shift_id UUID;
  v_opening_cash DECIMAL(12,2);
  
  -- Ventas normales
  v_cash_sales DECIMAL(12,2);
  v_card_sales DECIMAL(12,2);
  v_transfer_sales DECIMAL(12,2);
  
  -- Abonos de apartados
  v_layaway_cash DECIMAL(12,2);
  v_layaway_card DECIMAL(12,2);
  v_layaway_transfer DECIMAL(12,2);
  
  -- Gastos
  v_cash_expenses DECIMAL(12,2);
  v_total_expenses DECIMAL(12,2);
  
  -- Devoluciones
  v_cash_returns DECIMAL(12,2);
  v_card_returns DECIMAL(12,2);
  v_transfer_returns DECIMAL(12,2);
  v_total_returns DECIMAL(12,2);

  -- COGS y Utilidad
  v_total_cogs DECIMAL(12,2);
  v_recovered_cogs DECIMAL(12,2);
  v_total_sales DECIMAL(12,2);
BEGIN
  -- Obtener el turno abierto
  SELECT id, opening_cash INTO v_shift_id, v_opening_cash 
  FROM shifts WHERE status = 'open' LIMIT 1;

  IF v_shift_id IS NOT NULL THEN
    -- 1. Ventas normales (solo tipo 'sale')
    SELECT COALESCE(SUM(total), 0) INTO v_cash_sales FROM sales 
    WHERE shift_id = v_shift_id AND status = 'completed' AND payment_method = 'cash' AND type = 'sale';
    
    SELECT COALESCE(SUM(total), 0) INTO v_card_sales FROM sales 
    WHERE shift_id = v_shift_id AND status = 'completed' AND payment_method = 'card' AND type = 'sale';
    
    SELECT COALESCE(SUM(total), 0) INTO v_transfer_sales FROM sales 
    WHERE shift_id = v_shift_id AND status = 'completed' AND payment_method = 'transfer' AND type = 'sale';

    -- 2. Abonos de apartados
    SELECT COALESCE(SUM(amount), 0) INTO v_layaway_cash FROM layaway_payments
    WHERE shift_id = v_shift_id AND payment_method = 'cash';
    
    SELECT COALESCE(SUM(amount), 0) INTO v_layaway_card FROM layaway_payments
    WHERE shift_id = v_shift_id AND payment_method = 'card';
    
    SELECT COALESCE(SUM(amount), 0) INTO v_layaway_transfer FROM layaway_payments
    WHERE shift_id = v_shift_id AND payment_method = 'transfer';

    -- 3. Gastos
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses FROM expenses WHERE shift_id = v_shift_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_expenses FROM expenses 
    WHERE shift_id = v_shift_id AND (method = 'cash' OR method IS NULL);

    -- 4. Devoluciones
    SELECT COALESCE(SUM(total_returned), 0) INTO v_total_returns FROM sale_returns WHERE shift_id = v_shift_id;
    SELECT COALESCE(SUM(total_returned), 0) INTO v_cash_returns FROM sale_returns 
    WHERE shift_id = v_shift_id AND return_method = 'cash';
    
    SELECT COALESCE(SUM(total_returned), 0) INTO v_card_returns FROM sale_returns 
    WHERE shift_id = v_shift_id AND return_method = 'card';
    
    SELECT COALESCE(SUM(total_returned), 0) INTO v_transfer_returns FROM sale_returns 
    WHERE shift_id = v_shift_id AND return_method = 'transfer';

    -- 5. COGS (Costo de lo vendido)
    SELECT COALESCE(SUM(COALESCE(si.cost, 0) * si.quantity), 0) INTO v_total_cogs
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.shift_id = v_shift_id AND s.status = 'completed' AND s.type = 'sale';

    -- 6. COGS Recuperado (Costo de lo devuelto)
    SELECT COALESCE(SUM(COALESCE(ri.cost, 0) * ri.quantity), 0) INTO v_recovered_cogs
    FROM return_items ri
    JOIN sale_returns sr ON ri.return_id = sr.id
    WHERE sr.shift_id = v_shift_id;

    v_total_sales := (v_cash_sales + v_card_sales + v_transfer_sales + v_layaway_cash + v_layaway_card + v_layaway_transfer);

    -- Actualizar el turno
    UPDATE shifts SET 
      expected_cash = v_opening_cash + v_cash_sales + v_layaway_cash - v_cash_expenses - v_cash_returns,
      total_sales = v_total_sales,
      total_expenses = v_total_expenses,
      
      -- Auditoría detallada
      cash_sales = v_cash_sales,
      card_sales = v_card_sales,
      transfer_sales = v_transfer_sales,
      layaway_cash = v_layaway_cash,
      layaway_card = v_layaway_card,
      layaway_transfer = v_layaway_transfer,
      cash_expenses = v_cash_expenses,
      cash_returns = v_cash_returns,
      card_returns = v_card_returns,
      transfer_returns = v_transfer_returns,
      
      -- Nuevas columnas de utilidad
      total_cogs = (v_total_cogs - v_recovered_cogs),
      real_profit = (v_total_sales - v_total_returns) - (v_total_cogs - v_recovered_cogs) - v_total_expenses
    WHERE id = v_shift_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
