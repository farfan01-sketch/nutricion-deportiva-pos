import { supabase } from '../lib/supabase';
import { Expense } from '../types';

export const expenseService = {
  async getAll(registerId?: string): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (registerId) {
      query = query.eq('register_id', registerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async create(expense: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    
    // Refresh open shift
    await supabase.rpc('recalc_open_shift', { p_register_id: expense.register_id });
    
    return data;
  },

  async delete(id: string, registerId?: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Refresh open shift
    await supabase.rpc('recalc_open_shift', { p_register_id: registerId });
  }
};
