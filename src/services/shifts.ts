import { supabase } from '../lib/supabase';
import { Shift } from '../types';

export const shiftService = {
  async getOpenShift(): Promise<Shift | null> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .maybeSingle();
    if (error) return null;
    return data;
  },

  async getShiftTotals(shiftId: string, openedAt: string, closedAt?: string): Promise<any> {
    const end = closedAt || new Date().toISOString();
    
    let salesQuery = supabase.from('sales').select('total, payment_method, type').eq('status', 'completed');
    if (shiftId) { salesQuery = salesQuery.eq('shift_id', shiftId); } 
    else { salesQuery = salesQuery.gte('created_at', openedAt).lte('created_at', end); }

    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    let expensesQuery = supabase.from('expenses').select('amount, method');
    if (shiftId) { expensesQuery = expensesQuery.eq('shift_id', shiftId); } 
    else { expensesQuery = expensesQuery.gte('created_at', openedAt).lte('created_at', end); }

    const { data: expenses, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;

    const totals = { total_sales: 0, cash_sales: 0, transfer_sales: 0, card_sales: 0, mixed_sales: 0, total_expenses: 0, cash_expenses: 0, expected_cash: 0 };

    sales?.forEach(sale => {
      totals.total_sales += sale.total;
      if (sale.payment_method === 'cash') totals.cash_sales += sale.total;
      else if (sale.payment_method === 'transfer') totals.transfer_sales += sale.total;
      else if (sale.payment_method === 'card') totals.card_sales += sale.total;
      else if (sale.payment_method === 'mixed') totals.mixed_sales += sale.total;
    });

    expenses?.forEach(exp => {
      totals.total_expenses += exp.amount;
      if (exp.method === 'cash') totals.cash_expenses += exp.amount;
    });

    return totals;
  }
};
