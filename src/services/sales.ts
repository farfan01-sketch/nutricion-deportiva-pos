import { supabase } from '../lib/supabase';
import { Sale, SaleItem, Layaway } from '../types';

type ProcessSaleParams = {
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
};

export const saleService = {
  async processSale(params: ProcessSaleParams): Promise<string> {
    const safeParams = {
      ...params,
      // Fuerza un payload JSON limpio para evitar problemas entre json y jsonb
      p_items: JSON.parse(JSON.stringify(params.p_items || [])),
    };

    const { data, error } = await supabase.rpc('process_sale', safeParams);

    if (error) {
      console.error('processSale error:', error);
      throw error;
    }

    return data as string;
  },

  async getRecentSales(limit = 10): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(name), user:users(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as Sale[]) || [];
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
    return (data as SaleItem[]) || [];
  },

  async getPendingLayaways(): Promise<Layaway[]> {
    const { data, error } = await supabase
      .from('layaways')
      .select('*, sales(*, customer:customers(name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Layaway[]) || [];
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
    return (data as Sale[]) || [];
  },

  async getSaleById(id: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(name), user:users(name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Sale;
  }
};
