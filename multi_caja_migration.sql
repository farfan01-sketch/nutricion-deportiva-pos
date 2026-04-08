-- 1. Crear tabla de cajas/terminales
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar una caja por defecto si no hay ninguna
INSERT INTO cash_registers (name, code, location)
VALUES ('Caja Principal', 'CAJA-01', 'Mostrador')
ON CONFLICT (code) DO NOTHING;

-- 2. Agregar register_id a las tablas necesarias
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES cash_registers(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES cash_registers(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES cash_registers(id);
ALTER TABLE layaway_payments ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES cash_registers(id);
ALTER TABLE sale_returns ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES cash_registers(id);

-- 3. Actualizar datos existentes
DO $$
DECLARE
    v_register_id UUID;
BEGIN
    SELECT id INTO v_register_id FROM cash_registers LIMIT 1;
    IF v_register_id IS NOT NULL THEN
        UPDATE shifts SET register_id = v_register_id WHERE register_id IS NULL;
        UPDATE sales SET register_id = v_register_id WHERE register_id IS NULL;
        UPDATE expenses SET register_id = v_register_id WHERE register_id IS NULL;
        UPDATE layaway_payments SET register_id = v_register_id WHERE register_id IS NULL;
        UPDATE sale_returns SET register_id = v_register_id WHERE register_id IS NULL;
    END IF;
END $$;

-- 4. Actualizar recalc_open_shift para ser por caja
CREATE OR REPLACE FUNCTION recalc_open_shift(p_register_id UUID DEFAULT NULL) RETURNS VOID AS $$
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
  -- Si se pasa p_register_id, buscamos el turno abierto de esa caja
  IF p_register_id IS NOT NULL THEN
    SELECT id, opening_cash INTO v_shift_id, v_opening_cash 
    FROM shifts WHERE status = 'open' AND register_id = p_register_id LIMIT 1;
  ELSE
    SELECT id, opening_cash INTO v_shift_id, v_opening_cash 
    FROM shifts WHERE status = 'open' LIMIT 1;
  END IF;

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
      expected_cash = v_opening_cash + v_cash_sales + v_layaway_cash - v_cash_expenses - v_cash_returns,
      total_sales = (v_cash_sales + v_card_sales + v_transfer_sales + v_layaway_cash + v_layaway_card + v_layaway_transfer),
      total_expenses = (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE shift_id = v_shift_id),
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

-- 5. Actualizar process_sale para incluir register_id
CREATE OR REPLACE FUNCTION process_sale(
  p_customer_id UUID,
  p_deposit DECIMAL,
  p_discount DECIMAL,
  p_items JSONB,
  p_payment_method TEXT,
  p_subtotal DECIMAL,
  p_total DECIMAL,
  p_type TEXT,
  p_user_id UUID,
  p_shift_id UUID,
  p_register_id UUID
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_layaway_id UUID;
  v_item RECORD;
  v_ticket_number BIGINT;
  v_receipt_number BIGINT;
  v_status TEXT;
BEGIN
  -- Obtener siguiente número de ticket
  SELECT COALESCE(MAX(ticket_number), 0) + 1 INTO v_ticket_number FROM sales;

  -- Determinar estado inicial
  IF p_type = 'layaway' THEN
    IF (p_total - p_deposit) <= 0 THEN
      v_status := 'completed';
    ELSE
      v_status := 'pending';
    END IF;
  ELSE
    v_status := 'completed';
  END IF;

  -- 1. Insertar la venta
  INSERT INTO sales (
    customer_id,
    subtotal,
    total,
    payment_method,
    type,
    status,
    user_id,
    shift_id,
    register_id,
    ticket_number
  ) VALUES (
    p_customer_id,
    p_subtotal,
    p_total,
    p_payment_method,
    p_type,
    v_status,
    p_user_id,
    p_shift_id,
    p_register_id,
    v_ticket_number
  ) RETURNING id INTO v_sale_id;

  -- 2. Insertar los items de la venta y actualizar stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, price DECIMAL, cost DECIMAL)
  LOOP
    INSERT INTO sale_items (
      sale_id,
      product_id,
      quantity,
      price,
      cost
    ) VALUES (
      v_sale_id,
      v_item.product_id,
      v_item.quantity,
      v_item.price,
      v_item.cost
    );

    -- Actualizar stock del producto
    UPDATE products 
    SET stock = stock - v_item.quantity 
    WHERE id = v_item.product_id;
  END LOOP;

  -- 3. SI ES UN APARTADO, insertar en la tabla layaways y registrar el primer pago
  IF p_type = 'layaway' THEN
    INSERT INTO layaways (
      sale_id,
      deposit,
      balance,
      status
    ) VALUES (
      v_sale_id,
      p_deposit,
      p_total - p_deposit,
      v_status
    ) RETURNING id INTO v_layaway_id;

    -- Registrar el depósito inicial como el primer pago en layaway_payments
    IF p_deposit > 0 THEN
      v_receipt_number := nextval('layaway_payment_receipt_seq');
      
      INSERT INTO layaway_payments (
        layaway_id,
        amount,
        payment_method,
        user_id,
        shift_id,
        register_id,
        notes,
        receipt_number
      ) VALUES (
        v_layaway_id,
        p_deposit,
        p_payment_method,
        p_user_id,
        p_shift_id,
        p_register_id,
        'Depósito inicial',
        v_receipt_number
      );
    END IF;
  END IF;

  -- 4. Recalcular el turno si existe
  IF p_shift_id IS NOT NULL THEN
    PERFORM recalc_open_shift(p_register_id);
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Actualizar register_layaway_payment para incluir register_id
CREATE OR REPLACE FUNCTION register_layaway_payment(
  p_layaway_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_user_id UUID,
  p_shift_id UUID,
  p_register_id UUID,
  p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
  v_sale_id UUID;
  v_new_balance DECIMAL;
  v_receipt_number BIGINT;
  v_payment_id UUID;
  v_result JSONB;
  v_user_name TEXT;
BEGIN
  -- Obtener siguiente número de recibo
  v_receipt_number := nextval('layaway_payment_receipt_seq');

  -- Obtener nombre del usuario
  SELECT name INTO v_user_name FROM users WHERE id = p_user_id;

  -- 1. Insertar el pago
  INSERT INTO layaway_payments (
    layaway_id,
    amount,
    payment_method,
    user_id,
    shift_id,
    register_id,
    notes,
    receipt_number
  ) VALUES (
    p_layaway_id,
    p_amount,
    p_payment_method,
    p_user_id,
    p_shift_id,
    p_register_id,
    p_notes,
    v_receipt_number
  ) RETURNING id INTO v_payment_id;

  -- 2. Actualizar el apartado
  UPDATE layaways SET
    deposit = deposit + p_amount,
    balance = balance - p_amount
  WHERE id = p_layaway_id
  RETURNING sale_id, balance INTO v_sale_id, v_new_balance;

  -- 3. Si el saldo es 0 o menos, marcar como COMPLETADO
  IF v_new_balance <= 0 THEN
    UPDATE layaways SET status = 'completed', balance = 0 WHERE id = p_layaway_id;
    UPDATE sales SET status = 'completed' WHERE id = v_sale_id;
  END IF;

  -- 4. Recalcular el turno si existe
  IF p_shift_id IS NOT NULL THEN
    PERFORM recalc_open_shift(p_register_id);
  END IF;

  -- 5. Construir resultado detallado para el recibo
  SELECT jsonb_build_object(
    'id', lp.id,
    'receipt_number', lp.receipt_number,
    'amount', lp.amount,
    'payment_method', lp.payment_method,
    'created_at', lp.created_at,
    'notes', lp.notes,
    'layaway_id', lp.layaway_id,
    'new_balance', v_new_balance,
    'previous_balance', v_new_balance + p_amount,
    'sale_id', v_sale_id,
    'user_name', v_user_name
  ) INTO v_result
  FROM layaway_payments lp
  WHERE lp.id = v_payment_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 7. Actualizar process_partial_return para incluir register_id
CREATE OR REPLACE FUNCTION process_partial_return(
  p_sale_id UUID,
  p_user_id UUID,
  p_shift_id UUID,
  p_register_id UUID,
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
    register_id,
    reason,
    return_method,
    total_returned
  ) VALUES (
    p_sale_id,
    p_user_id,
    p_shift_id,
    p_register_id,
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
    PERFORM recalc_open_shift(p_register_id);
  END IF;

  RETURN v_return_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Actualizar cancel_sale para incluir register_id
CREATE OR REPLACE FUNCTION cancel_sale(
  p_sale_id UUID,
  p_reason TEXT,
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_shift_id UUID;
  v_register_id UUID;
  v_item RECORD;
BEGIN
  -- Obtener shift_id y register_id de la venta
  SELECT shift_id, register_id INTO v_shift_id, v_register_id FROM sales WHERE id = p_sale_id;

  -- 1. Actualizar estado de la venta
  UPDATE sales SET 
    status = 'cancelled',
    notes = COALESCE(notes, '') || ' | Cancelación: ' || p_reason
  WHERE id = p_sale_id;

  -- 2. Devolver stock
  FOR v_item IN SELECT product_id, quantity FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- 3. Si era apartado, cancelar apartado
  UPDATE layaways SET status = 'cancelled' WHERE sale_id = p_sale_id;

  -- 4. Recalcular turno si existe
  IF v_shift_id IS NOT NULL THEN
    PERFORM recalc_open_shift(v_register_id);
  END IF;
END;
$$ LANGUAGE plpgsql;
