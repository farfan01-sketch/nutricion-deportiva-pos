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
    return data;
  },

  async addStockWithPriceUpdate(
    movement: Partial<InventoryMovement>, 
    productUpdates: { cost: number; price_retail: number; price_wholesale: number }
  ): Promise<void> {
    // 1. Create movement (trigger will update stock)
    const { error: moveError } = await supabase
      .from('inventory_movements')
      .insert([movement]);
    
    if (moveError) throw moveError;

    // 2. Update product prices/cost
    const { error: prodError } = await supabase
      .from('products')
      .update(productUpdates)
      .eq('id', movement.product_id);
    
    if (prodError) throw prodError;
  },

  async getKardex(productId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, products(name, code, brand, cost, stock_min)')
      .eq('product_id', productId)
      .order('created_at', { ascending: true }); // Ascending for chronological balance calculation

    if (error) throw error;
    return data || [];
  }
};
