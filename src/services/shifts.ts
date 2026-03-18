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

  async openShift(userId: string, openingCash: number, notes?: string): Promise<Shift> {
    const { data, error } = await supabase
      .from('shifts')
      .insert([{
        user_id: userId,
        opening_cash: openingCash,
        status: 'open',
        opened_at: new Date().toISOString(),
        notes: notes
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async closeShift(id: string, closingCash: number, totals: any): Promise<Shift> {
    const { data, error } = await supabase
      .from('shifts')
      .update({
        closing_cash: closingCash,
        expected_cash: totals.expected_cash,
        total_sales: totals.total_sales,
        total_expenses: totals.total_expenses,
        difference: closingCash - totals.expected_cash,
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getShiftTotals(shiftId: string, openedAt: string, closedAt?: string): Promise<any> {
    const end = closedAt || new Date().toISOString();
    
    // Get sales
    let salesQuery = supabase
      .from('sales')
      .select('total, payment_method, type')
      .eq('status', 'completed');

    if (shiftId) {
      salesQuery = salesQuery.eq('shift_id', shiftId);
    } else {
      salesQuery = salesQuery.gte('created_at', openedAt).lte('created_at', end);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) throw salesError;

    // Get expenses
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, method');

    if (shiftId) {
      expensesQuery = expensesQuery.eq('shift_id', shiftId);
    } else {
      expensesQuery = expensesQuery.gte('created_at', openedAt).lte('created_at', end);
    }

    const { data: expenses, error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;

    const totals = {
      total_sales: 0,
      cash_sales: 0,
      transfer_sales: 0,
      card_sales: 0,
      mixed_sales: 0,
      layaways: 0,
      total_expenses: 0,
      cash_expenses: 0,
      expected_cash: 0
    };

    sales?.forEach(sale => {
      totals.total_sales += sale.total;
      if (sale.type === 'layaway') {
        // For layaways, we only count the deposit in this shift if it was created now
        // But the process_sale RPC handles this. 
        // Actually, the user says "anticipos/apartados en efectivo".
        // In this system, a 'layaway' sale type has a 'total' which is the deposit amount?
        // Let's check POS.tsx handleProcessSale
      }

      switch (sale.payment_method) {
        case 'cash': totals.cash_sales += sale.total; break;
        case 'transfer': totals.transfer_sales += sale.total; break;
        case 'card': totals.card_sales += sale.total; break;
        case 'mixed': totals.mixed_sales += sale.total; break;
      }
    });

    expenses?.forEach(exp => {
      totals.total_expenses += exp.amount;
      if (exp.method === 'cash' || !exp.method) {
        totals.cash_expenses += exp.amount;
      }
    });

    return totals;
  },

  async getHistory(): Promise<Shift[]> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*, user:users(name)')
      .order('opened_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async recalcOpenShift(): Promise<void> {
    await supabase.rpc('recalc_open_shift');
  }
};
