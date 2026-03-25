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
        cash_returns_today: 0,
        card_returns_today: 0,
        transfer_returns_today: 0,
        expenses_today: 0,
        low_stock_count: 0,
        pending_layaways: 0,
        profit_today: 0,
        layaway_payments_today: 0,
        layaway_cash_payments_today: 0,
        layaway_card_payments_today: 0,
        layaway_transfer_payments_today: 0
      };
    }

    return {
      ...data,
      cash_returns_today: data.cash_returns_today || 0,
      card_returns_today: data.card_returns_today || 0,
      transfer_returns_today: data.transfer_returns_today || 0,
      layaway_payments_today: data.layaway_payments_today || 0,
      layaway_cash_payments_today: data.layaway_cash_payments_today || 0,
      layaway_card_payments_today: data.layaway_card_payments_today || 0,
      layaway_transfer_payments_today: data.layaway_transfer_payments_today || 0
    };
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
