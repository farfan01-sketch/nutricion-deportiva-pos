import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, History, Search, Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { productService } from '../services/products';
import { reportService } from '../services/reports';
import { supabase } from '../lib/supabase';
import { Product, LowStockProduct, InventoryMovement } from '../types';
import { formatDate } from '../utils/format';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, ls, m] = await Promise.all([
        productService.getAll(),
        reportService.getLowStock(),
        supabase.from('inventory_movements').select('*, products(name)').order('created_at', { ascending: false }).limit(20)
      ]);
      setProducts(p);
      setLowStock(ls);
      setMovements(m.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Control de Inventario</h1>
        <p className="text-slate-500">Monitorea existencias y movimientos de almacén.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              <h3 className="font-bold text-slate-900">Alertas de Stock Bajo</h3>
            </div>
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {lowStock.map((product) => (
                <div key={product.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{product.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{product.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-600">{product.stock} disp.</p>
                    <p className="text-[10px] text-slate-400">Mín: {product.stock_min}</p>
                  </div>
                </div>
              ))}
              {lowStock.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">Sin alertas pendientes.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-2">
              <History className="text-primary-500" size={20} />
              <h3 className="font-bold text-slate-900">Últimos Movimientos</h3>
            </div>
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {movements.map((m: any) => (
                <div key={m.id} className="p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    m.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {m.type === 'in' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{m.products?.name}</p>
                    <p className="text-[10px] text-slate-500">{m.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.type === 'in' ? '+' : '-'}{m.quantity}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDate(m.created_at).split(',')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Inventory List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            <button className="px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 flex items-center gap-2 hover:bg-slate-100 transition-all">
              <Filter size={18} />
              Filtros
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Stock Actual</th>
                  <th className="px-6 py-4">Mínimo</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <Package size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{product.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {product.code}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${product.stock <= product.stock_min ? 'text-rose-600' : 'text-slate-900'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {product.stock_min}
                    </td>
                    <td className="px-6 py-4">
                      {product.stock <= product.stock_min ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 uppercase">
                          <AlertTriangle size={12} /> Reabastecer
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">
                          Suficiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
