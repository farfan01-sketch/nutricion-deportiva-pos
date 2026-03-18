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
    p_shift_id: string | null;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('process_sale', params);

    if (error) throw error;
    return data;
  },

  async getRecentSales(limit = 10): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(name), user:users(name)')
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
    return (data as any) || [];
  },

  async getPendingLayaways(): Promise<Layaway[]> {
    const { data, error } = await supabase
      .from('layaways')
      .select(`
        *,
        sales (
          *,
          customer:customers (
            name
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending layaways:', error);
      return [];
    }
    return (data as any) || [];
  },

  async getHistory(filters?: {
    startDate?: string;
    endDate?: string;
    ticketNumber?: string;
    customerId?: string;
  }): Promise<Sale[]> {
    let query = supabase
      .from('sales')
      .select(`
        *,
        customer:customers (name),
        user:users (name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', `${filters.startDate}T00:00:00`);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', `${filters.endDate}T23:59:59`);
    }
    if (filters?.ticketNumber) {
      query = query.eq('ticket_number', filters.ticketNumber);
    }
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getSaleById(id: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(name), user:users(name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async cancelSale(saleId: string, reason: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_sale', {
      p_sale_id: saleId,
      p_reason: reason,
      p_user_id: userId
    });

    if (error) throw error;
  },

  async processPartialReturn(params: {
    p_sale_id: string;
    p_user_id: string;
    p_shift_id: string | null;
    p_reason: string;
    p_return_method: 'cash' | 'card' | 'transfer';
    p_items: { product_id: string; quantity: number; price: number }[];
  }): Promise<string> {
    const { data, error } = await supabase.rpc('process_partial_return', params);

    if (error) throw error;
    return data;
  }
};
