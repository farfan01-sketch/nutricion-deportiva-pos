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
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert([movement])
      .select()
      .single();

    if (error) throw error;

    // Actualizar el stock del producto si no hay un trigger en la DB
    // En este proyecto asumimos que hay un trigger o que debemos hacerlo manualmente
    // Vamos a intentar actualizarlo manualmente por seguridad si no estamos seguros del trigger
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', movement.product_id)
      .single();

    if (product) {
      let newStock = product.stock;
      if (movement.type === 'in') newStock += movement.quantity;
      else if (movement.type === 'out' || movement.type === 'waste') newStock -= movement.quantity;

      await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', movement.product_id);
    }

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
