-- 1. Actualizar restricción de estado en la tabla layaways
ALTER TABLE layaways DROP CONSTRAINT IF EXISTS layaways_status_check;
ALTER TABLE layaways ADD CONSTRAINT layaways_status_check CHECK (status IN ('pending', 'completed', 'cancelled', 'paid'));

-- 2. Migrar estados existentes
UPDATE layaways SET status = 'completed' WHERE status = 'paid' OR balance <= 0;
UPDATE sales SET status = 'completed' 
WHERE id IN (SELECT sale_id FROM layaways WHERE status = 'completed') 
AND status = 'pending';

-- 3. Actualizar función register_layaway_payment
CREATE OR REPLACE FUNCTION register_layaway_payment(
  p_layaway_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_user_id UUID,
  p_shift_id UUID,
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
    notes,
    receipt_number
  ) VALUES (
    p_layaway_id,
    p_amount,
    p_payment_method,
    p_user_id,
    p_shift_id,
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
    PERFORM recalc_open_shift();
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

-- 4. Actualizar función process_sale
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
  p_shift_id UUID
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
        notes,
        receipt_number
      ) VALUES (
        v_layaway_id,
        p_deposit,
        p_payment_method,
        p_user_id,
        p_shift_id,
        'Depósito inicial',
        v_receipt_number
      );
    END IF;
  END IF;

  -- 4. Recalcular el turno si existe
  IF p_shift_id IS NOT NULL THEN
    PERFORM recalc_open_shift();
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;
