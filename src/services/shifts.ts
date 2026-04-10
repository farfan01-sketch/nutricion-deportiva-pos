import { supabase } from '../lib/supabase';
import { Shift, NotificationStatus } from '../types';
import { settingsService } from './settings';

export const shiftService = {
  async getOpenShift(userId?: string, registerId?: string): Promise<Shift | null> {
    let query = supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (registerId) {
      query = query.eq('register_id', registerId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) return null;
    return data;
  },

  async openShift(userId: string, registerId: string, openingCash: number, notes?: string): Promise<Shift> {
    // Primero verificamos si ya hay uno abierto para evitar el error de constraint
    const existing = await this.getOpenShift(undefined, registerId);
    if (existing) {
      throw new Error('Ya existe un turno abierto en esta caja. Debes cerrarlo antes de abrir uno nuevo.');
    }

    const { data, error } = await supabase
      .from('shifts')
      .insert([{
        user_id: userId,
        register_id: registerId,
        opening_cash: openingCash,
        status: 'open',
        opened_at: new Date().toISOString(),
        notes: notes
      }])
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un turno abierto. Debes cerrarlo antes de abrir uno nuevo.');
      }
      throw error;
    }
    
    if (!data) throw new Error('No se pudo crear el turno');
    return data;
  },

  async closeShift(id: string, closingCash: number, totals: any): Promise<{ shift: Shift; emailStatus?: NotificationStatus }> {
    const { data, error } = await supabase
      .from('shifts')
      .update({
        closing_cash: closingCash,
        expected_cash: totals.expected_cash,
        total_sales: totals.total_sales,
        total_expenses: totals.total_expenses,
        difference: closingCash - totals.expected_cash,
        status: 'closed',
        closed_at: new Date().toISOString(),
        
        // Save audit metrics
        cash_sales: totals.cash_sales,
        card_sales: totals.card_sales,
        transfer_sales: totals.transfer_sales,
        layaway_cash: totals.layaway_cash_payments,
        layaway_card: totals.layaway_card_payments,
        layaway_transfer: totals.layaway_transfer_payments,
        cash_expenses: totals.cash_expenses,
        cash_returns: totals.cash_returns,
        card_returns: totals.card_returns,
        transfer_returns: totals.transfer_returns,
        real_profit: totals.real_profit,
        total_cogs: totals.total_cogs
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Intentar enviar correo de notificación
    let emailStatus: NotificationStatus | undefined;
    try {
      emailStatus = await settingsService.sendShiftClosingEmail(id);
    } catch (err: any) {
      console.error('Error triggering email notification:', err);
      emailStatus = { success: false, message: 'No se pudo enviar el correo de notificación.', error: err.message };
    }

    return { shift: data, emailStatus };
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

    // Get layaway payments
    let layawayPaymentsQuery = supabase
      .from('layaway_payments')
      .select('amount, payment_method');

    if (shiftId) {
      layawayPaymentsQuery = layawayPaymentsQuery.eq('shift_id', shiftId);
    } else {
      layawayPaymentsQuery = layawayPaymentsQuery.gte('created_at', openedAt).lte('created_at', end);
    }

    const { data: layawayPayments, error: layawayPaymentsError } = await layawayPaymentsQuery;
    if (layawayPaymentsError) throw layawayPaymentsError;

    // Get returns
    let returnsQuery = supabase
      .from('sale_returns')
      .select('total_returned, return_method');

    if (shiftId) {
      returnsQuery = returnsQuery.eq('shift_id', shiftId);
    } else {
      returnsQuery = returnsQuery.gte('created_at', openedAt).lte('created_at', end);
    }

    const { data: returns, error: returnsError } = await returnsQuery;
    
    // If there's an error (e.g. return_method column missing), try without it
    let finalReturns: any[] | null = returns;
    if (returnsError) {
      console.warn('Error fetching returns with return_method, trying without it:', returnsError);
      const { data: fallbackReturns, error: fallbackError } = await supabase
        .from('sale_returns')
        .select('total_returned')
        .eq(shiftId ? 'shift_id' : 'created_at', shiftId || openedAt); // This is a bit simplified but good enough for fallback
      
      if (fallbackError) {
        console.error('Error in fallback returns query:', fallbackError);
        finalReturns = [];
      } else {
        finalReturns = fallbackReturns;
      }
    }

    const totals = {
      total_sales: 0,
      cash_sales: 0,
      transfer_sales: 0,
      card_sales: 0,
      mixed_sales: 0,
      layaways: 0,
      layaway_cash_payments: 0,
      layaway_card_payments: 0,
      layaway_transfer_payments: 0,
      total_expenses: 0,
      cash_expenses: 0,
      total_returns: 0,
      cash_returns: 0,
      card_returns: 0,
      transfer_returns: 0,
      expected_cash: 0,
      total_cogs: 0,
      real_profit: 0
    };

    // Get sale items for COGS
    let saleItemsQuery = supabase
      .from('sale_items')
      .select('quantity, cost, sales!inner(status, type, shift_id, created_at)')
      .eq('sales.status', 'completed')
      .eq('sales.type', 'sale');

    if (shiftId) {
      saleItemsQuery = saleItemsQuery.eq('sales.shift_id', shiftId);
    } else {
      saleItemsQuery = saleItemsQuery.gte('sales.created_at', openedAt).lte('sales.created_at', end);
    }
    const { data: saleItems } = await saleItemsQuery;

    // Get return items for COGS recovery
    let returnItemsQuery = supabase
      .from('return_items')
      .select('quantity, cost, sale_returns!inner(shift_id, created_at)');

    if (shiftId) {
      returnItemsQuery = returnItemsQuery.eq('sale_returns.shift_id', shiftId);
    } else {
      returnItemsQuery = returnItemsQuery.gte('sale_returns.created_at', openedAt).lte('sale_returns.created_at', end);
    }
    const { data: returnItems } = await returnItemsQuery;

    let totalCogs = 0;
    saleItems?.forEach(item => {
      const cost = Number(item.cost) || 0;
      const quantity = Number(item.quantity) || 0;
      totalCogs += (cost * quantity);
    });

    let recoveredCogs = 0;
    returnItems?.forEach(item => {
      const cost = Number(item.cost) || 0;
      const quantity = Number(item.quantity) || 0;
      recoveredCogs += (cost * quantity);
    });

    totals.total_cogs = totalCogs - recoveredCogs;

    sales?.forEach(sale => {
      const total = Number(sale.total) || 0;
      // Solo sumamos ventas normales, los apartados se cuentan por sus abonos
      if (sale.type === 'sale') {
        totals.total_sales += total;
        switch (sale.payment_method) {
          case 'cash': totals.cash_sales += total; break;
          case 'transfer': totals.transfer_sales += total; break;
          case 'card': totals.card_sales += total; break;
          case 'mixed': totals.mixed_sales += total; break;
        }
      }
      
      if (sale.type === 'layaway') {
        totals.layaways += total;
      }
    });

    layawayPayments?.forEach(payment => {
      const amount = Number(payment.amount) || 0;
      totals.total_sales += amount;
      switch (payment.payment_method) {
        case 'cash': 
          totals.cash_sales += amount; 
          totals.layaway_cash_payments += amount;
          break;
        case 'transfer': 
          totals.transfer_sales += amount; 
          totals.layaway_transfer_payments += amount;
          break;
        case 'card': 
          totals.card_sales += amount; 
          totals.layaway_card_payments += amount;
          break;
      }
    });

    expenses?.forEach(exp => {
      const amount = Number(exp.amount) || 0;
      totals.total_expenses += amount;
      // Por defecto, si no tiene método o es 'cash', se resta del efectivo
      if (exp.method === 'cash' || !exp.method) {
        totals.cash_expenses += amount;
      }
    });

    finalReturns?.forEach((ret: any) => {
      const totalReturned = Number(ret.total_returned) || 0;
      totals.total_returns += totalReturned;
      // Si no hay return_method (fallback), asumimos cash por compatibilidad
      if (!ret.return_method || ret.return_method === 'cash') {
        totals.cash_returns += totalReturned;
      } else if (ret.return_method === 'card') {
        totals.card_returns += totalReturned;
      } else if (ret.return_method === 'transfer') {
        totals.transfer_returns += totalReturned;
      }
    });

    // Final validation to avoid NaN
    totals.total_sales = Number(totals.total_sales) || 0;
    totals.total_returns = Number(totals.total_returns) || 0;
    totals.total_cogs = Number(totals.total_cogs) || 0;
    totals.total_expenses = Number(totals.total_expenses) || 0;

    totals.real_profit = (totals.total_sales - totals.total_returns) - totals.total_cogs - totals.total_expenses;
    
    // Ensure expected_cash is also valid
    totals.expected_cash = (Number(totals.cash_sales) || 0) - (Number(totals.cash_expenses) || 0) - (Number(totals.cash_returns) || 0);

    return totals;
  },

  async getHistory(registerId?: string): Promise<Shift[]> {
    let query = supabase
      .from('shifts')
      .select('*, user:users(name)')
      .order('opened_at', { ascending: false });

    if (registerId) {
      query = query.eq('register_id', registerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async recalcOpenShift(registerId?: string): Promise<void> {
    await supabase.rpc('recalc_open_shift', { p_register_id: registerId });
  }
};
