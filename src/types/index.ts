export type UserRole = 'admin' | 'cashier';

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
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'retail' | 'wholesale';
  notes: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  conditions: string;
  notes: string;
  created_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'transfer' | 'card' | 'mixed';
  type: 'sale' | 'layaway';
  status: 'completed' | 'pending' | 'cancelled';
  ticket_number: string;
  notes: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price: number;
  cost: number;
  created_at: string;
  product?: {
    name: string;
  };
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  method: string;
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
  expected_cash: number;
  total_sales: number;
  total_expenses: number;
  difference: number;
  status: 'open' | 'closed';
  notes: string;
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
}

// Views
export interface DashboardStats {
  sales_today: number;
  expenses_today: number;
  low_stock_count: number;
  pending_layaways: number;
  profit_today: number;
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
  discount: number;
  payment_method: string;
  type: string;
  status: string;
  profit: number;
}
