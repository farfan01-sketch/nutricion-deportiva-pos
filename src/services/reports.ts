import { supabase } from '../lib/supabase';
import { DashboardStats, LowStockProduct, TopProduct, SaleProfit, WeeklyTrend } from '../types';

export const reportService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data, error } = await supabase
      .from('dashboard_stats_view')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        sales_gross_today: 0,
        returns_today: 0,
        sales_net_today: 0,
        expenses_today: 0,
        layaway_payments_today: 0,
        profit_today: 0,
        profit_margin_today: 0,
        tickets_today: 0,
        customers_today: 0,
        sales_cash_today: 0,
        sales_card_today: 0,
        sales_transfer_today: 0,
        returns_cash_today: 0,
        returns_card_today: 0,
        returns_transfer_today: 0,
        layaway_cash_today: 0,
        layaway_card_today: 0,
        layaway_transfer_today: 0,
        low_stock_count: 0,
        total_products: 0,
        inventory_value: 0,
        pending_layaways: 0,
        total_pending_amount: 0,
        layaways_completed_today: 0
      };
    }

    return data;
  },

  async getWeeklyTrends(): Promise<WeeklyTrend[]> {
    const { data, error } = await supabase
      .from('weekly_trends_view')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
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
