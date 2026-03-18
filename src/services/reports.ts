import { supabase } from '../lib/supabase';
import { DashboardStats, LowStockProduct, TopProduct, SaleProfit } from '../types';

export const reportService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data, error } = await supabase
      .from('dashboard_stats_view')
      .select('*')
      .single();

    if (error) {
      return {
        sales_today: 0,
        returns_today: 0,
        expenses_today: 0,
        low_stock_count: 0,
        pending_layaways: 0,
        profit_today: 0
      };
    }
    return data;
  },

  async getLowStock(): Promise<LowStockProduct[]> {
    const { data, error } = await supabase
      .from('low_stock_view')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async getTopProducts(): Promise<TopProduct[]> {
    const { data, error } = await supabase
      .from('top_products_view')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async getSalesProfit(startDate: string, endDate: string): Promise<SaleProfit[]> {
    const { data, error } = await supabase
      .from('sales_profit_view')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;
    return data || [];
  }
};
