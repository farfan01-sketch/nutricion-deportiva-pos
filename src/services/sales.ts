import { supabase } from '../lib/supabase';
import { Sale, SaleItem, Layaway } from '../types';

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
  }): Promise<{ sale_id: string; ticket_number: string }> {
    const { data, error } = await supabase.rpc('process_sale', params);

    if (error) throw error;
    return data;
  },

  async getRecentSales(limit = 10): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    const { data, error } = await supabase
      .from('sale_items')
      .select(`
        *,
        product:products (
          name
        )
      `)
      .eq('sale_id', saleId);

    if (error) throw error;
    return data || [];
  },

  async getPendingLayaways(): Promise<Layaway[]> {
    const { data, error } = await supabase
      .from('layaways')
      .select('*, sales(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
