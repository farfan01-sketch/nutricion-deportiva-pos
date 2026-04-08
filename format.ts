import { supabase } from '../lib/supabase';
import { Customer } from '../types';

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(customer: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, customer: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
