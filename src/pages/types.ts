export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  cost: number;
  price_retail: number;
  price_wholesale: number;
  stock: number;
  stock_min: number;
  type: 'supplement' | 'clothing' | 'accessory';
  variants?: Variant[];
}

export interface Variant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'retail' | 'wholesale';
  notes: string;
}

export interface SaleItem {
  product_id: string;
  variant_id?: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
}

export interface Sale {
  id?: string;
  user_id: string;
  customer_id?: string;
  total: number;
  subtotal: number;
  discount: number;
  payment_method: 'cash' | 'transfer' | 'card' | 'mixed';
  type: 'sale' | 'layaway';
  items: SaleItem[];
  deposit?: number;
  created_at?: string;
}

export interface DashboardStats {
  sales_today: number;
  expenses_today: number;
  low_stock: number;
  pending_layaways: number;
}

export interface Settings {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_rfc: string;
  ticket_footer: string;
  wholesale_min_qty: string;
}
