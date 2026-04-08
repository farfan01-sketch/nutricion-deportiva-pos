import { supabase } from '../lib/supabase';
import { CashRegister } from '../types';

export const registerService = {
  async getAll(): Promise<CashRegister[]> {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getActive(): Promise<CashRegister[]> {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(register: Partial<CashRegister>): Promise<CashRegister> {
    const { data, error } = await supabase
      .from('cash_registers')
      .insert([register])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, register: Partial<CashRegister>): Promise<CashRegister> {
    const { data, error } = await supabase
      .from('cash_registers')
      .update(register)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('cash_registers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
