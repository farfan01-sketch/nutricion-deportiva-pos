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
  user?: { name: string };
}
