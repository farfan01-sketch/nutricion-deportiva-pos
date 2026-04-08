
-- Actualizar vista de estadísticas del dashboard v2
DROP VIEW IF EXISTS dashboard_stats_view;
CREATE OR REPLACE VIEW dashboard_stats_view AS
WITH daily_sales AS (
  SELECT 
    COALESCE(SUM(total), 0) as gross,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash,
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card,
    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END), 0) as transfer,
    COUNT(*) as tickets,
    COUNT(DISTINCT customer_id) as customers
  FROM sales 
  WHERE status = 'completed' AND type = 'sale' AND created_at::date = CURRENT_DATE
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
),
daily_profit AS (
  SELECT 
    COALESCE(SUM((si.price - COALESCE(si.cost, 0)) * si.quantity), 0) as sale_gross_profit,
    COALESCE(SUM(COALESCE(si.cost, 0) * si.quantity), 0) as sale_cogs
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.status = 'completed' AND s.type = 'sale' AND s.created_at::date = CURRENT_DATE
),
return_profit_loss AS (
  SELECT 
    COALESCE(SUM((ri.price - COALESCE(ri.cost, 0)) * ri.quantity), 0) as return_gross_profit_loss,
    COALESCE(SUM(COALESCE(ri.cost, 0) * ri.quantity), 0) as return_cogs_recovered
  FROM return_items ri
  JOIN sale_returns sr ON ri.return_id = sr.id
  WHERE sr.created_at::date = CURRENT_DATE
),
inventory_stats AS (
  SELECT 
    COUNT(*) as total_products,
    COALESCE(SUM(stock * cost), 0) as inventory_value
  FROM products
),
layaway_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COALESCE(SUM(balance) FILTER (WHERE status = 'pending'), 0) as total_pending_amount,
    COUNT(*) FILTER (WHERE status = 'paid' AND created_at::date = CURRENT_DATE) as completed_today
  FROM layaways
)
SELECT 
  (SELECT gross FROM daily_sales) as sales_gross_today,
  (SELECT total FROM daily_returns) as returns_today,
  ((SELECT gross FROM daily_sales) - (SELECT total FROM daily_returns)) as sales_net_today,
  (SELECT total FROM daily_expenses) as expenses_today,
  (SELECT total FROM daily_layaway_payments) as layaway_payments_today,
  (
    (SELECT sale_gross_profit FROM daily_profit) - 
    (SELECT return_gross_profit_loss FROM return_profit_loss) - 
    (SELECT total FROM daily_expenses)
  ) as profit_today,
  (
    CASE 
      WHEN ((SELECT gross FROM daily_sales) - (SELECT total FROM daily_returns)) > 0 
      THEN (
        ((SELECT sale_gross_profit FROM daily_profit) - (SELECT return_gross_profit_loss FROM return_profit_loss) - (SELECT total FROM daily_expenses)) / 
        ((SELECT gross FROM daily_sales) - (SELECT total FROM daily_returns)) * 100
      )
      ELSE 0 
    END
  ) as profit_margin_today,
  (SELECT tickets FROM daily_sales) as tickets_today,
  (SELECT customers FROM daily_sales) as customers_today,
  
  (SELECT cash FROM daily_sales) as sales_cash_today,
  (SELECT card FROM daily_sales) as sales_card_today,
  (SELECT transfer FROM daily_sales) as sales_transfer_today,
  
  (SELECT cash FROM daily_returns) as returns_cash_today,
  (SELECT card FROM daily_returns) as returns_card_today,
  (SELECT transfer FROM daily_returns) as returns_transfer_today,
  
  (SELECT cash FROM daily_layaway_payments) as layaway_cash_today,
  (SELECT card FROM daily_layaway_payments) as layaway_card_today,
  (SELECT transfer FROM daily_layaway_payments) as layaway_transfer_today,
  
  (SELECT COUNT(*) FROM products WHERE stock <= stock_min) as low_stock_count,
  (SELECT total_products FROM inventory_stats) as total_products,
  (SELECT inventory_value FROM inventory_stats) as inventory_value,
  
  (SELECT pending_count FROM layaway_stats) as pending_layaways,
  (SELECT total_pending_amount FROM layaway_stats) as total_pending_amount,
  (SELECT completed_today FROM layaway_stats) as layaways_completed_today;

-- Vista para tendencias de 7 días
DROP VIEW IF EXISTS weekly_trends_view;
CREATE OR REPLACE VIEW weekly_trends_view AS
WITH RECURSIVE dates AS (
  SELECT (CURRENT_DATE - INTERVAL '6 days')::date as date
  UNION ALL
  SELECT (date + INTERVAL '1 day')::date FROM dates WHERE date < CURRENT_DATE
),
daily_sales AS (
  SELECT created_at::date as date, SUM(total) as total FROM sales WHERE status = 'completed' AND type = 'sale' GROUP BY 1
),
daily_returns AS (
  SELECT created_at::date as date, SUM(total_returned) as total FROM sale_returns GROUP BY 1
),
daily_expenses AS (
  SELECT created_at::date as date, SUM(amount) as total FROM expenses GROUP BY 1
),
daily_layaway_payments AS (
  SELECT created_at::date as date, SUM(amount) as total FROM layaway_payments GROUP BY 1
)
SELECT 
  d.date,
  COALESCE(s.total, 0) as sales,
  COALESCE(r.total, 0) as returns,
  COALESCE(e.total, 0) as expenses,
  COALESCE(lp.total, 0) as layaway_payments,
  (COALESCE(s.total, 0) + COALESCE(lp.total, 0) - COALESCE(r.total, 0) - COALESCE(e.total, 0)) as net_cash_flow
FROM dates d
LEFT JOIN daily_sales s ON s.date = d.date
LEFT JOIN daily_returns r ON r.date = d.date
LEFT JOIN daily_expenses e ON e.date = d.date
LEFT JOIN daily_layaway_payments lp ON lp.date = d.date
ORDER BY d.date;
