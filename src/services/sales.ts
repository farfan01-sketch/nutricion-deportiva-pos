import { supabase } from '../lib/supabase';
import { Sale, SaleItem } from '../types';

export const saleService = {
  async processSale(params: {
    p_customer_id: string | null;
    p_deposit: number;
    p_discount: number;
    p_items: any[];
    p_payment_method: string;
    p_subtotal: number;
    p_total: number;
    p_type: 'sale' | 'layaway';
    p_user_id: string;
    p_shift_id: string | null;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('process_sale', params);
    if (error) throw error;
    return data;
  },

  async getSaleById(id: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(name), user:users(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};
