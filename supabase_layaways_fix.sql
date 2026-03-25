-- SCRIPT DE CORRECCIÓN PARA APARTADOS (LAYAWAYS)
-- Este script asegura que la tabla layaways exista y que el procedimiento process_sale
-- inserte correctamente los registros de apartados.

-- 1. Asegurar que la tabla layaways tenga la estructura correcta
CREATE TABLE IF NOT EXISTS layaways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear índice para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_layaways_sale_id ON layaways(sale_id);
CREATE INDEX IF NOT EXISTS idx_layaways_status ON layaways(status);

-- 3. Actualizar el procedimiento process_sale para manejar apartados
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

  -- 3. SI ES UN APARTADO, insertar en la tabla layaways
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
    );
  END IF;

  -- 4. Recalcular el turno si existe
  IF p_shift_id IS NOT NULL THEN
    PERFORM recalc_open_shift();
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- 4. MIGRACIÓN: Insertar apartados existentes que no estén en la tabla layaways
-- Esto asegura que las ventas de tipo 'layaway' previas aparezcan en el módulo.
INSERT INTO layaways (sale_id, deposit, balance, status, created_at)
SELECT 
    s.id as sale_id,
    s.total as deposit, -- Asumimos total como depósito si no tenemos el dato real de la migración
    0 as balance,
    'pending' as status,
    s.created_at
FROM sales s
LEFT JOIN layaways l ON s.id = l.sale_id
WHERE s.type = 'layaway' 
AND s.status = 'pending'
AND l.id IS NULL;
