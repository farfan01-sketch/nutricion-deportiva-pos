export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  type: string;
  cost: number;
  price_retail: number;
  price_wholesale: number;
  stock: number;
  stock_min: number;
  image_url?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'retail' | 'wholesale';
  notes?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  conditions: string;
  notes?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_id: string | null;
  subtotal: number;
  total: number;
  payment_method: 'cash' | 'transfer' | 'card' | 'mixed';
  type: 'sale' | 'layaway';
  status: 'completed' | 'pending' | 'cancelled';
  ticket_number: string;
  shift_id?: string;
  notes?: string;
  created_at: string;
  // Joins
  customer?: { name: string };
  user?: { name: string };
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price: number;
  cost: number;
  created_at: string;
  product?: { name: string };
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  method: string;
  shift_id?: string;
  note: string;
  created_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  total_sales: number;
  total_expenses: number;
  difference: number;
  status: 'open' | 'closed';
  notes?: string;
  created_at: string;
  
  // Audit columns
  cash_sales?: number;
  card_sales?: number;
  transfer_sales?: number;
  layaway_cash?: number;
  layaway_card?: number;
  layaway_transfer?: number;
  cash_expenses?: number;
  cash_returns?: number;
  card_returns?: number;
  transfer_returns?: number;
  real_profit?: number;
  total_cogs?: number;

  // Joins
  user?: { name: string };
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: 'in' | 'out' | 'waste';
  quantity: number;
  reason: string;
  user_id: string;
  created_at: string;
}

export interface Layaway {
  id: string;
  sale_id: string;
  deposit: number;
  balance: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  sales?: Sale;
}

export interface LayawayPayment {
  id: string;
  layaway_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer';
  user_id: string;
  shift_id?: string;
  notes?: string;
  receipt_number?: number;
  created_at: string;
}

export interface SaleReturn {
  id: string;
  sale_id: string;
  user_id: string;
  shift_id?: string;
  reason: string;
  return_method: 'cash' | 'card' | 'transfer';
  total_returned: number;
  created_at: string;
  // Joins
  sale?: Sale;
  user?: { name: string };
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  price: number;
  cost: number;
  created_at: string;
  // Joins
  product?: { name: string };
}

// Views
export interface DashboardStats {
  // Resumen del día
  sales_gross_today: number;
  returns_today: number;
  sales_net_today: number;
  expenses_today: number;
  layaway_payments_today: number;
  profit_today: number;
  profit_margin_today: number;
  tickets_today: number;
  customers_today: number;

  // Desglose por método (Ventas)
  sales_cash_today: number;
  sales_card_today: number;
  sales_transfer_today: number;

  // Desglose por método (Devoluciones)
  returns_cash_today: number;
  returns_card_today: number;
  returns_transfer_today: number;

  // Desglose por método (Abonos)
  layaway_cash_today: number;
  layaway_card_today: number;
  layaway_transfer_today: number;

  // Productos
  low_stock_count: number;
  total_products: number;
  inventory_value: number;

  // Apartados
  pending_layaways: number;
  total_pending_amount: number;
  layaways_completed_today: number;
}

export interface WeeklyTrend {
  date: string;
  sales: number;
  returns: number;
  expenses: number;
  layaway_payments: number;
  net_cash_flow: number;
}

export interface LowStockProduct {
  id: string;
  code: string;
  name: string;
  brand: string;
  stock: number;
  stock_min: number;
}

export interface TopProduct {
  id: string;
  name: string;
  code: string;
  brand: string;
  total_sold: number;
  total_revenue: number;
}

export interface SaleProfit {
  sale_id: string;
  created_at: string;
  user_id: string;
  customer_id: string | null;
  total: number;
  subtotal: number;
  payment_method: string;
  type: string;
  status: string;
  profit: number;
}
