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

  async openShift(userId: string, openingCash: number): Promise<Shift> {
    const { data, error } = await supabase
      .from('shifts')
      .insert([{
        user_id: userId,
        opening_cash: openingCash,
        status: 'open',
        opened_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async closeShift(id: string, closingCash: number): Promise<Shift> {
    const { data, error } = await supabase
      .from('shifts')
      .update({
        closing_cash: closingCash,
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getHistory(): Promise<Shift[]> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('opened_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async recalcOpenShift(): Promise<void> {
    await supabase.rpc('recalc_open_shift');
  }
};
