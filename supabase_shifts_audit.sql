-- 1. Agregar columnas detalladas a la tabla shifts
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS cash_sales DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_sales DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfer_sales DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS layaway_cash DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS layaway_card DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS layaway_transfer DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_expenses DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_returns DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_returns DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfer_returns DECIMAL(12,2) DEFAULT 0;

-- 2. Actualizar recalc_open_shift para considerar todas las métricas
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
  
  -- Devoluciones
  v_cash_returns DECIMAL(12,2);
  v_card_returns DECIMAL(12,2);
  v_transfer_returns DECIMAL(12,2);
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

    -- 3. Gastos (solo efectivo)
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_expenses FROM expenses 
    WHERE shift_id = v_shift_id AND (method = 'cash' OR method IS NULL);

    -- 4. Devoluciones
    SELECT COALESCE(SUM(total_returned), 0) INTO v_cash_returns FROM sale_returns 
    WHERE shift_id = v_shift_id AND return_method = 'cash';
    
    SELECT COALESCE(SUM(total_returned), 0) INTO v_card_returns FROM sale_returns 
    WHERE shift_id = v_shift_id AND return_method = 'card';
    
    SELECT COALESCE(SUM(total_returned), 0) INTO v_transfer_returns FROM sale_returns 
    WHERE shift_id = v_shift_id AND return_method = 'transfer';

    -- Actualizar el turno
    UPDATE shifts SET 
      -- Fórmula de efectivo esperado: Fondo + Ventas Cash + Layaway Cash - Gastos Cash - Devoluciones Cash
      expected_cash = v_opening_cash + v_cash_sales + v_layaway_cash - v_cash_expenses - v_cash_returns,
      
      -- Totales generales
      total_sales = (v_cash_sales + v_card_sales + v_transfer_sales + v_layaway_cash + v_layaway_card + v_layaway_transfer),
      total_expenses = (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE shift_id = v_shift_id),
      
      -- Desglose para auditoría
      cash_sales = v_cash_sales,
      card_sales = v_card_sales,
      transfer_sales = v_transfer_sales,
      layaway_cash = v_layaway_cash,
      layaway_card = v_layaway_card,
      layaway_transfer = v_layaway_transfer,
      cash_expenses = v_cash_expenses,
      cash_returns = v_cash_returns,
      card_returns = v_card_returns,
      transfer_returns = v_transfer_returns
    WHERE id = v_shift_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
