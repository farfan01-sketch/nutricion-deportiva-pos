import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, AlertTriangle, History, Search, Filter, ArrowUpRight, 
  ArrowDownLeft, Plus, Settings2, FileText, Activity, 
  Printer, Download
} from 'lucide-react';
import { productService } from '../services/products';
import { reportService } from '../services/reports';
import { inventoryService } from '../services/inventory';
import { Product, LowStockProduct, InventoryMovement, User } from '../types';
import { formatDate, formatCurrency } from '../utils/format';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';

interface InventoryProps {
  user: User | null;
}

const Inventory: React.FC<InventoryProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Modals state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);

  const { hasPermission } = usePermissions(user);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, ls, m] = await Promise.all([
        productService.getAll(),
        reportService.getLowStock(),
        inventoryService.getMovements(10)
      ]);
      setProducts(p);
      setLowStock(ls);
      setMovements(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'entry': setShowEntryModal(true); break;
      case 'adjust': setShowAdjustModal(true); break;
      case 'low-stock': 
        // Filter table to show only low stock
        setSearch(''); 
        const lowStockIds = lowStock.map(ls => ls.id);
        setProducts(prev => prev.filter(p => lowStockIds.includes(p.id)));
        break;
      case 'reports': setShowReportsModal(true); break;
      case 'movements': setShowMovementsModal(true); break;
      case 'kardex': setShowKardexModal(true); break;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header & Quick Actions Bar */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Inventario</h1>
            <p className="text-slate-500">Control centralizado de existencias y movimientos.</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Total Almacén</p>
            <p className="text-xl font-black text-primary-600">
              {formatCurrency(products.reduce((acc, p) => acc + (p.stock * p.price_retail), 0))}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
          <button 
            onClick={() => handleQuickAction('entry')}
            disabled={!hasPermission('inventario', 'agregar_mercancia')}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm"
          >
            <Plus size={18} />
            Entrada Stock
          </button>
          
          <button 
            onClick={() => handleQuickAction('adjust')}
            disabled={!hasPermission('inventario', 'ajustar_inventario')}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm"
          >
            <Settings2 size={18} />
            Ajuste Manual
          </button>

          <button 
            onClick={() => handleQuickAction('low-stock')}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all font-bold text-sm relative"
          >
            <AlertTriangle size={18} />
            Stock Bajo
            {lowStock.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                {lowStock.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => handleQuickAction('reports')}
            disabled={!hasPermission('sistema', 'ver_reportes')}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm"
          >
            <FileText size={18} />
            Reportes
          </button>

          <button 
            onClick={() => handleQuickAction('movements')}
            disabled={!hasPermission('inventario', 'ver_movimientos')}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm"
          >
            <Activity size={18} />
            Movimientos
          </button>

          <button 
            onClick={() => handleQuickAction('kardex')}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition-all font-bold text-sm"
          >
            <History size={18} />
            Kardex
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Alerts & Recent */}
        <div className="lg:col-span-1 space-y-6">
          {/* Low Stock Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={18} />
                <h3 className="font-bold text-slate-800 text-sm">Alertas Críticas</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full">
                {lowStock.length} items
              </span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
              {lowStock.map((product) => (
                <div 
                  key={product.id} 
                  className="p-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                  onClick={() => setSearch(product.code)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-primary-600 transition-colors truncate pr-2">
                      {product.name}
                    </p>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 rounded">
                      {product.stock}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 uppercase">{product.brand}</span>
                    <span className="text-slate-400 font-medium tracking-tight">Mín: {product.stock_min}</span>
                  </div>
                </div>
              ))}
              {lowStock.length === 0 && (
                <div className="p-8 text-center">
                  <Package className="mx-auto text-slate-200 mb-2" size={32} />
                  <p className="text-xs text-slate-400">Todo en orden</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Movements Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="text-primary-500" size={18} />
                <h3 className="font-bold text-slate-800 text-sm">Actividad Reciente</h3>
              </div>
              <button 
                onClick={() => setShowMovementsModal(true)}
                className="text-[10px] font-bold text-primary-600 hover:underline"
              >
                Ver todo
              </button>
            </div>
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {movements.map((m) => (
                <div key={m.id} className="p-3 flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    m.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  )}>
                    {m.type === 'in' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">
                      {m.products?.name || 'Producto'}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate italic">{m.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-[11px] font-black",
                      m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                    )}>
                      {m.type === 'in' ? '+' : '-'}{m.quantity}
                    </p>
                    <p className="text-[8px] text-slate-400 font-medium">
                      {formatDate(m.created_at).split(',')[0]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Main Inventory Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, código o marca..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100 transition-all text-sm font-bold">
                  <Filter size={16} />
                  Filtros
                </button>
                <button 
                  onClick={loadData}
                  className="p-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-all"
                  title="Refrescar datos"
                >
                  <Activity size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4 border-b border-slate-100">Producto</th>
                    <th className="px-6 py-4 border-b border-slate-100">Código</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-center">Stock</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-right">Precio</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-right">Margen Est.</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                            <Package size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {product.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={cn(
                            "text-sm font-black px-2.5 py-1 rounded-lg",
                            product.stock <= product.stock_min 
                              ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' 
                              : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                          )}>
                            {product.stock}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-1 font-bold">Mín: {product.stock_min}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(product.price_retail)}</p>
                        <p className="text-[10px] text-slate-400">Costo: {formatCurrency(product.cost)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          {(((product.price_retail - product.cost) / product.price_retail) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowKardexModal(true);
                            }}
                            className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Ver Kardex"
                          >
                            <History size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowEntryModal(true);
                            }}
                            disabled={!hasPermission('inventario', 'agregar_mercancia')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30"
                            title="Entrada de Stock"
                          >
                            <Plus size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowAdjustModal(true);
                            }}
                            disabled={!hasPermission('inventario', 'ajustar_inventario')}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30"
                            title="Ajuste Manual"
                          >
                            <Settings2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StockEntryModal 
        isOpen={showEntryModal} 
        onClose={() => {
          setShowEntryModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={loadData}
        products={products}
        userId={user?.id || ''}
      />

      <StockAdjustModal 
        isOpen={showAdjustModal} 
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={loadData}
        products={products}
        userId={user?.id || ''}
      />

      <KardexModal 
        isOpen={showKardexModal} 
        onClose={() => {
          setShowKardexModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        products={products}
      />

      <ReportsModal 
        isOpen={showReportsModal} 
        onClose={() => setShowReportsModal(false)}
        products={products}
      />

      <MovementsModal 
        isOpen={showMovementsModal} 
        onClose={() => setShowMovementsModal(false)}
      />
    </div>
  );
};

// --- Sub-components for Modals ---

const StockEntryModal: React.FC<{
  isOpen: boolean; onClose: () => void; product: Product | null; onSuccess: () => void; products: Product[]; userId: string;
}> = ({ isOpen, onClose, product, onSuccess, products, userId }) => {
  const [selectedId, setSelectedId] = useState(product?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Compra de mercancía');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product) setSelectedId(product.id);
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || quantity <= 0) return;
    
    setSubmitting(true);
    try {
      await inventoryService.createMovement({
        product_id: selectedId,
        type: 'in',
        quantity,
        reason,
        reference_type: 'purchase',
        user_id: userId
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al registrar entrada');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Entrada de Mercancía">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Producto</label>
          <select 
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20"
            required
          >
            <option value="">Seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Cantidad</label>
            <input 
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Motivo</label>
            <input 
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20"
              required
            />
          </div>
        </div>
        <button 
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
        >
          {submitting ? 'Registrando...' : 'Confirmar Entrada'}
        </button>
      </form>
    </Modal>
  );
};

const StockAdjustModal: React.FC<{
  isOpen: boolean; onClose: () => void; product: Product | null; onSuccess: () => void; products: Product[]; userId: string;
}> = ({ isOpen, onClose, product, onSuccess, products, userId }) => {
  const [selectedId, setSelectedId] = useState(product?.id || '');
  const [newStock, setNewStock] = useState(product?.stock || 0);
  const [reason, setReason] = useState('Ajuste de inventario');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedId(product.id);
      setNewStock(product.stock);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    
    const selectedProduct = products.find(p => p.id === selectedId);
    if (!selectedProduct) return;

    const difference = newStock - selectedProduct.stock;
    if (difference === 0) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.createMovement({
        product_id: selectedId,
        type: difference > 0 ? 'in' : 'out',
        quantity: Math.abs(difference),
        reason: `${reason} (Ajuste: ${selectedProduct.stock} -> ${newStock})`,
        reference_type: 'adjustment',
        user_id: userId
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al realizar ajuste');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajuste de Inventario">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Producto</label>
          <select 
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              const p = products.find(prod => prod.id === e.target.value);
              if (p) setNewStock(p.stock);
            }}
            className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20"
            required
          >
            <option value="">Seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code}) - Actual: {p.stock}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nuevo Stock</label>
            <input 
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Diferencia</label>
            <div className={cn(
              "w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50 font-bold text-center",
              (newStock - (products.find(p => p.id === selectedId)?.stock || 0)) > 0 ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {(newStock - (products.find(p => p.id === selectedId)?.stock || 0)) > 0 ? '+' : ''}
              {newStock - (products.find(p => p.id === selectedId)?.stock || 0)}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Motivo del Ajuste</label>
          <input 
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20"
            required
          />
        </div>
        <button 
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all disabled:opacity-50"
        >
          {submitting ? 'Procesando...' : 'Guardar Ajuste'}
        </button>
      </form>
    </Modal>
  );
};

const KardexModal: React.FC<{
  isOpen: boolean; onClose: () => void; product: Product | null; products: Product[];
}> = ({ isOpen, onClose, product, products }) => {
  const [selectedId, setSelectedId] = useState(product?.id || '');
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) setSelectedId(product.id);
  }, [product]);

  useEffect(() => {
    if (isOpen && selectedId) {
      loadKardex(selectedId);
    } else if (!selectedId) {
      setMovements([]);
    }
  }, [isOpen, selectedId]);

  const loadKardex = async (id: string) => {
    setLoading(true);
    try {
      const data = await inventoryService.getKardex(id);
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentProduct = products.find(p => p.id === selectedId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kardex de Inventario" size="lg">
      <div className="p-6 space-y-6">
        {!product && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Seleccionar Producto</label>
            <select 
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Seleccione un producto para ver su historial...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
        )}

        {selectedId && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Stock Actual</p>
                <p className="text-2xl font-black text-slate-900">{currentProduct?.stock || 0}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-500 uppercase">Entradas Totales</p>
                <p className="text-2xl font-black text-emerald-600">
                  {movements.filter(m => m.type === 'in').reduce((acc, m) => acc + m.quantity, 0)}
                </p>
              </div>
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-bold text-rose-500 uppercase">Salidas Totales</p>
                <p className="text-2xl font-black text-rose-600">
                  {movements.filter(m => m.type === 'out' || m.type === 'waste').reduce((acc, m) => acc + m.quantity, 0)}
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando historial...</td></tr>
                  ) : movements.map((m) => (
                    <tr key={m.id} className="text-xs hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-600">{formatDate(m.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-bold text-[9px] uppercase",
                          m.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        )}>
                          {m.type === 'in' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className={cn(
                        "px-4 py-3 font-bold",
                        m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        {m.type === 'in' ? '+' : '-'}{m.quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{m.reason}</td>
                      <td className="px-4 py-3 text-slate-400 uppercase font-bold text-[9px]">{m.reference_type}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && !loading && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Sin movimientos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {!selectedId && !product && (
          <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <History className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-medium">Seleccione un producto para visualizar su historial de movimientos.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

const ReportsModal: React.FC<{ isOpen: boolean; onClose: () => void; products: Product[] }> = ({ isOpen, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reportes de Inventario">
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={handlePrint}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-500 shadow-sm">
                <FileText size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Existencias Actuales</p>
                <p className="text-[10px] text-slate-500">Listado completo con valoración de almacén.</p>
              </div>
            </div>
            <Printer className="text-slate-400 group-hover:text-primary-500" size={18} />
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Productos con Stock Bajo</p>
                <p className="text-[10px] text-slate-500">Solo items por debajo del mínimo establecido.</p>
              </div>
            </div>
            <Download className="text-slate-400 group-hover:text-rose-500" size={18} />
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                <ArrowUpRight size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Resumen de Entradas</p>
                <p className="text-[10px] text-slate-500">Historial de compras y reabastecimiento.</p>
              </div>
            </div>
            <FileText className="text-slate-400 group-hover:text-emerald-500" size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
};


const MovementsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadMovements();
  }, [isOpen]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMovements(100);
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Historial de Movimientos" size="lg">
      <div className="p-6">
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-center">Cantidad</th>
                  <th className="px-6 py-4">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-20 text-center text-slate-400">Cargando movimientos...</td></tr>
                ) : movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900">{m.products?.name}</p>
                      <p className="text-[9px] text-slate-400 uppercase">{m.products?.brand}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg font-black text-[9px] uppercase",
                        m.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      )}>
                        {m.type === 'in' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-xs font-black",
                        m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        {m.type === 'in' ? '+' : '-'}{m.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 italic">
                      {m.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default Inventory;
