-- 1. Crear tabla de pagos de apartados
CREATE TABLE IF NOT EXISTS layaway_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    layaway_id UUID NOT NULL REFERENCES layaways(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
    user_id UUID NOT NULL REFERENCES users(id),
    shift_id UUID REFERENCES shifts(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_layaway_payments_layaway_id ON layaway_payments(layaway_id);
CREATE INDEX IF NOT EXISTS idx_layaway_payments_shift_id ON layaway_payments(shift_id);

-- 3. Actualizar recalc_open_shift para considerar abonos de apartados
CREATE OR REPLACE FUNCTION recalc_open_shift() RETURNS VOID AS $$
DECLARE
  v_shift_id UUID;
  v_opening_cash DECIMAL(12,2);
  v_cash_sales DECIMAL(12,2);
  v_cash_expenses DECIMAL(12,2);
  v_cash_returns DECIMAL(12,2);
  v_cash_layaway_payments DECIMAL(12,2);
BEGIN
  -- Obtener el turno abierto
  SELECT id, opening_cash INTO v_shift_id, v_opening_cash 
  FROM shifts WHERE status = 'open' LIMIT 1;

  IF v_shift_id IS NOT NULL THEN
    -- Sumar ventas en efectivo (solo ventas normales, los apartados se cuentan por sus abonos)
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

    -- Actualizar el turno
    UPDATE shifts SET 
      expected_cash = v_opening_cash + v_cash_sales + v_cash_layaway_payments - v_cash_expenses - v_cash_returns,
      total_sales = (
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE shift_id = v_shift_id AND status = 'completed' AND type = 'sale') +
        (SELECT COALESCE(SUM(amount), 0) FROM layaway_payments WHERE shift_id = v_shift_id)
      ),
      total_expenses = (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE shift_id = v_shift_id)
    WHERE id = v_shift_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para registrar pagos de apartados
CREATE OR REPLACE FUNCTION register_layaway_payment(
  p_layaway_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_user_id UUID,
  p_shift_id UUID,
  p_notes TEXT
) RETURNS VOID AS $$
DECLARE
  v_sale_id UUID;
  v_new_balance DECIMAL;
BEGIN
  -- 1. Insertar el pago
  INSERT INTO layaway_payments (
    layaway_id,
    amount,
    payment_method,
    user_id,
    shift_id,
    notes
  ) VALUES (
    p_layaway_id,
    p_amount,
    p_payment_method,
    p_user_id,
    p_shift_id,
    p_notes
  );

  -- 2. Actualizar el apartado
  UPDATE layaways SET
    deposit = deposit + p_amount,
    balance = balance - p_amount
  WHERE id = p_layaway_id
  RETURNING sale_id, balance INTO v_sale_id, v_new_balance;

  -- 3. Si el saldo es 0 o menos, marcar como pagado
  IF v_new_balance <= 0 THEN
    UPDATE layaways SET status = 'paid', balance = 0 WHERE id = p_layaway_id;
    UPDATE sales SET status = 'completed' WHERE id = v_sale_id;
  END IF;

  -- 4. Recalcular el turno si existe
  IF p_shift_id IS NOT NULL THEN
    PERFORM recalc_open_shift();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar process_sale para registrar el depósito inicial en layaway_payments
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
BEGIN
  -- Obtener siguiente número de ticket
  SELECT COALESCE(MAX(ticket_number), 0) + 1 INTO v_ticket_number FROM sales;

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
    CASE WHEN p_type = 'layaway' THEN 'pending' ELSE 'completed' END,
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
      'pending'
    ) RETURNING id INTO v_layaway_id;

    -- Registrar el depósito inicial como el primer pago en layaway_payments
    IF p_deposit > 0 THEN
      INSERT INTO layaway_payments (
        layaway_id,
        amount,
        payment_method,
        user_id,
        shift_id,
        notes
      ) VALUES (
        v_layaway_id,
        p_deposit,
        p_payment_method,
        p_user_id,
        p_shift_id,
        'Depósito inicial'
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

-- 6. MIGRACIÓN: Para apartados existentes, crear su primer pago si no tienen ninguno
INSERT INTO layaway_payments (layaway_id, amount, payment_method, user_id, shift_id, notes, created_at)
SELECT 
    l.id,
    l.deposit,
    s.payment_method,
    s.user_id,
    s.shift_id,
    'Migración: Depósito inicial',
    l.created_at
FROM layaways l
JOIN sales s ON l.sale_id = s.id
LEFT JOIN layaway_payments lp ON l.id = lp.layaway_id
WHERE lp.id IS NULL AND l.deposit > 0;
