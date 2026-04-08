import { supabase } from '../lib/supabase';
import { Product, CatalogOrder, CatalogOrderItem } from '../types';

export const catalogService = {
  async getPublicProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .gt('stock', 0)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createOrder(order: Omit<CatalogOrder, 'id' | 'created_at' | 'status'>, items: Omit<CatalogOrderItem, 'id' | 'order_id' | 'created_at'>[]): Promise<CatalogOrder> {
    // 1. Create the order
    const { data: orderData, error: orderError } = await supabase
      .from('catalog_orders')
      .insert([{
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        notes: order.notes,
        total: order.total,
        status: 'pending'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create the items
    const itemsToInsert = items.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('catalog_order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Cleanup order if items fail
      await supabase.from('catalog_orders').delete().eq('id', orderData.id);
      throw itemsError;
    }

    return orderData;
  },

  async getOrders(): Promise<CatalogOrder[]> {
    const { data, error } = await supabase
      .from('catalog_orders')
      .select('*, items:catalog_order_items(*, product:products(*))')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateOrderStatus(id: string, status: CatalogOrder['status']): Promise<void> {
    const { error } = await supabase
      .from('catalog_orders')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }
};
