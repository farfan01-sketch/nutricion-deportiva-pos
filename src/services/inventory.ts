import { supabase } from '../lib/supabase';
import { InventoryMovement } from '../types';

export const inventoryService = {
  async getMovements(limit = 50): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, products(name, code, brand)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async createMovement(movement: Partial<InventoryMovement>): Promise<InventoryMovement> {
    // Si el usuario ya ejecutó el SQL del TRIGGER, esto es suficiente.
    // Si no, el stock no se actualizará automáticamente en la tabla 'products'.
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert([movement])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getKardex(productId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, products(name, code, brand)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
