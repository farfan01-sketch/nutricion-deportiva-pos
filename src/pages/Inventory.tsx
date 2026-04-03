import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Package, AlertTriangle, History, Search, Filter, ArrowUpRight, 
  ArrowDownLeft, Plus, Settings2, FileText, Activity, 
  Printer, Download, Barcode, RefreshCw, Save, Trash2,
  ChevronRight, MoreVertical, Eye
} from 'lucide-react';
import { productService } from '../services/products';
import { reportService } from '../services/reports';
import { inventoryService } from '../services/inventory';
import { Product, LowStockProduct, InventoryMovement, User } from '../types';
import { formatDate, formatCurrency } from '../utils/format';
import { usePermissions } from '../hooks/usePermissions';
import { cn } from '../lib/utils';

type InventoryView = 'ADD' | 'ADJUST' | 'LOW_STOCK' | 'REPORT_INV' | 'REPORT_MOV' | 'KARDEX';

interface InventoryProps {
  user: User | null;
}

const Inventory: React.FC<InventoryProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<InventoryView>('ADD');
  const { hasPermission } = usePermissions(user);

  // Renderizado condicional de vistas
  const renderView = () => {
    switch (currentView) {
      case 'ADD': return <AddInventoryView user={user} />;
      case 'ADJUST': return <AdjustInventoryView user={user} />;
      case 'LOW_STOCK': return <LowStockView />;
      case 'REPORT_INV': return <InventoryReportView />;
      case 'REPORT_MOV': return <MovementsReportView />;
      case 'KARDEX': return <KardexView />;
      default: return <AddInventoryView user={user} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Barra de Acciones Superior */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="bg-primary-600 p-2 rounded-lg text-white">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">Inventario</h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Operación de Almacén</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <NavButton 
            active={currentView === 'ADD'} 
            onClick={() => setCurrentView('ADD')}
            icon={<Plus size={16} />}
            label="Agregar"
            disabled={!hasPermission('inventario', 'agregar_mercancia')}
          />
          <NavButton 
            active={currentView === 'ADJUST'} 
            onClick={() => setCurrentView('ADJUST')}
            icon={<Settings2 size={16} />}
            label="Ajustar"
            disabled={!hasPermission('inventario', 'ajustar_inventario')}
          />
          <NavButton 
            active={currentView === 'LOW_STOCK'} 
            onClick={() => setCurrentView('LOW_STOCK')}
            icon={<AlertTriangle size={16} />}
            label="Bajos"
          />
          <NavButton 
            active={currentView === 'REPORT_INV'} 
            onClick={() => setCurrentView('REPORT_INV')}
            icon={<FileText size={16} />}
            label="Reporte Inv."
          />
          <NavButton 
            active={currentView === 'REPORT_MOV'} 
            onClick={() => setCurrentView('REPORT_MOV')}
            icon={<Activity size={16} />}
            label="Movimientos"
            disabled={!hasPermission('inventario', 'ver_movimientos')}
          />
          <NavButton 
            active={currentView === 'KARDEX'} 
            onClick={() => setCurrentView('KARDEX')}
            icon={<History size={16} />}
            label="Kardex"
          />
        </div>
      </div>

      {/* Contenido de la Vista */}
      <div className="flex-1 overflow-auto">
        {renderView()}
      </div>
    </div>
  );
};

// --- Componentes de Soporte ---

const NavButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  disabled?: boolean;
}> = ({ active, onClick, icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
      active 
        ? "bg-white text-primary-600 shadow-sm ring-1 ring-slate-200" 
        : "text-slate-500 hover:bg-slate-200 hover:text-slate-700",
      disabled && "opacity-40 cursor-not-allowed grayscale"
    )}
  >
    {icon}
    <span className="hidden md:inline">{label}</span>
  </button>
);

// --- VISTA: AGREGAR INVENTARIO ---
const AddInventoryView: React.FC<{ user: User | null }> = ({ user }) => {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [priceRetail, setPriceRetail] = useState<number>(0);
  const [priceWholesale, setPriceWholesale] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const p = await productService.getByCode(barcode);
      if (p) {
        setProduct(p);
        setCost(p.cost);
        setPriceRetail(p.price_retail);
        setPriceWholesale(p.price_wholesale);
        setQuantity(0);
        // Focus quantity input after a small delay
        setTimeout(() => qtyRef.current?.focus(), 100);
      } else {
        setError('Producto no encontrado. Verifique el código.');
        setProduct(null);
      }
    } catch (err) {
      setError('Error al buscar producto.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || quantity <= 0) return;

    setLoading(true);
    try {
      await inventoryService.addStockWithPriceUpdate(
        {
          product_id: product.id,
          type: 'in',
          quantity,
          reason: 'Entrada de mercancía / Compra',
          reference_type: 'purchase',
          user_id: user?.id || ''
        },
        {
          cost,
          price_retail: priceRetail,
          price_wholesale: priceWholesale
        }
      );

      alert('Inventario agregado correctamente.');
      setProduct(null);
      setBarcode('');
      barcodeRef.current?.focus();
    } catch (err) {
      alert('Error al procesar la entrada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Agregar Inventario</h2>
          <p className="text-xs text-slate-500">Escanee el código de barras para iniciar la carga.</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Buscador */}
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                ref={barcodeRef}
                type="text"
                placeholder="Escanee o escriba el código de barras..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-primary-500 outline-none transition-all text-lg font-mono"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="px-8 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
              Buscar
            </button>
          </form>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {product && (
            <form onSubmit={handleSave} className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
              {/* Info Producto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="md:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Descripción</p>
                  <p className="text-xl font-black text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{product.brand} | {product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Existencia Actual</p>
                  <p className={cn(
                    "text-3xl font-black",
                    product.stock <= product.stock_min ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {product.stock}
                  </p>
                </div>
              </div>

              {/* Formulario de Carga */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Cantidad a Agregar</label>
                  <input
                    ref={qtyRef}
                    type="number"
                    min="1"
                    value={quantity || ''}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 outline-none transition-all text-xl font-black text-emerald-600"
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Costo Unitario</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-primary-500 outline-none transition-all text-xl font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Precio Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceRetail}
                    onChange={(e) => setPriceRetail(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-primary-500 outline-none transition-all text-xl font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Precio Mayoreo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceWholesale}
                    onChange={(e) => setPriceWholesale(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-primary-500 outline-none transition-all text-xl font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading || quantity <= 0}
                  className="w-full md:w-auto px-12 py-4 bg-emerald-600 text-white rounded-xl font-black text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                >
                  <Save size={24} />
                  Agregar cantidad a inventario
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// --- VISTA: AJUSTAR INVENTARIO ---
const AdjustInventoryView: React.FC<{ user: User | null }> = ({ user }) => {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const adjustRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const p = await productService.getByCode(barcode);
      if (p) {
        setProduct(p);
        setNewStock(p.stock);
        setReason('');
        setTimeout(() => adjustRef.current?.focus(), 100);
      } else {
        setError('Producto no encontrado.');
        setProduct(null);
      }
    } catch (err) {
      setError('Error al buscar producto.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reason.trim()) return;

    const diff = newStock - product.stock;
    if (diff === 0) return;

    setLoading(true);
    try {
      await inventoryService.createMovement({
        product_id: product.id,
        type: diff > 0 ? 'in' : 'out',
        quantity: Math.abs(diff),
        reason: `Ajuste manual: ${reason}`,
        reference_type: 'adjustment',
        user_id: user?.id || ''
      });

      alert('Ajuste realizado correctamente.');
      setProduct(null);
      setBarcode('');
      barcodeRef.current?.focus();
    } catch (err) {
      alert('Error al procesar el ajuste.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Ajustar Inventario</h2>
          <p className="text-xs text-slate-500">Corrija existencias por mermas, errores o auditoría.</p>
        </div>

        <div className="p-8 space-y-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                ref={barcodeRef}
                type="text"
                placeholder="Código de barras..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 outline-none transition-all text-lg font-mono"
                autoFocus
              />
            </div>
            <button type="submit" className="px-8 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
              Buscar
            </button>
          </form>

          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm">{error}</div>}

          {product && (
            <form onSubmit={handleAdjust} className="space-y-8 animate-in fade-in zoom-in-95">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xl font-black text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.brand} | {product.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Actual</p>
                  <p className="text-3xl font-black text-slate-900">{product.stock}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nueva Cantidad (Existencia Real)</label>
                  <input
                    ref={adjustRef}
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 outline-none transition-all text-2xl font-black text-slate-800"
                    required
                  />
                  <p className={cn(
                    "text-xs font-bold mt-2",
                    newStock - product.stock > 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    Diferencia: {newStock - product.stock > 0 ? '+' : ''}{newStock - product.stock} unidades
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Motivo del Ajuste</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Error de conteo, producto dañado, etc..."
                    className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 outline-none transition-all text-sm min-h-[100px]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !reason.trim() || newStock === product.stock}
                className="w-full py-4 bg-amber-600 text-white rounded-xl font-black text-lg hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Settings2 size={24} />
                Realizar ajuste de inventario
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// --- VISTA: PRODUCTOS BAJOS EN INVENTARIO ---
const LowStockView: React.FC = () => {
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLowStock = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportService.getLowStock();
      setLowStock(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLowStock();
  }, [loadLowStock]);

  return (
    <div className="p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Productos con Stock Bajo</h2>
            <p className="text-xs text-slate-500">Items que requieren reabastecimiento inmediato.</p>
          </div>
          <button onClick={loadLowStock} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4 text-center">Existencia</th>
                <th className="px-6 py-4 text-center">Mínimo</th>
                <th className="px-6 py-4 text-center">Déficit</th>
                <th className="px-6 py-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : lowStock.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{p.code}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{p.brand}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg font-black text-sm border border-rose-100">
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-slate-600">{p.stock_min}</td>
                  <td className="px-6 py-4 text-center text-sm font-black text-rose-500">
                    -{p.stock_min - p.stock}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-[10px] font-black uppercase text-primary-600 hover:underline">
                      Reabastecer
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && lowStock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No hay productos con stock bajo actualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- VISTA: REPORTE DE INVENTARIO ---
const InventoryReportView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalCost = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-6 print:p-0">
      {/* Totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Costo Total Inventario</p>
          <p className="text-3xl font-black text-primary-600">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cantidad Total Items</p>
          <p className="text-3xl font-black text-slate-900">{totalStock}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-4">
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Printer size={16} /> Imprimir
          </button>
          <button className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
        <div className="p-6 border-b border-slate-100 hidden print:block">
          <h1 className="text-2xl font-bold">Reporte de Inventario</h1>
          <p className="text-sm text-slate-500">Fecha: {formatDate(new Date().toISOString())}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <p><strong>Costo Total:</strong> {formatCurrency(totalCost)}</p>
            <p><strong>Items Totales:</strong> {totalStock}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4 text-right">Costo</th>
                <th className="px-6 py-4 text-right">P. Venta</th>
                <th className="px-6 py-4 text-center">Existencia</th>
                <th className="px-6 py-4 text-center">Mín/Máx</th>
                <th className="px-6 py-4 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center text-slate-400">Cargando...</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                  <td className="px-6 py-4 font-mono font-bold text-slate-500">{p.code}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{p.brand}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(p.cost)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(p.price_retail)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "font-black",
                      p.stock <= p.stock_min ? "text-rose-600" : "text-slate-900"
                    )}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400 font-bold">
                    {p.stock_min} / -
                  </td>
                  <td className="px-6 py-4 text-right font-black text-primary-600">
                    {formatCurrency(p.cost * p.stock)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- VISTA: REPORTE DE MOVIMIENTOS ---
const MovementsReportView: React.FC = () => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMovements(200);
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const filteredMovements = movements.filter(m => {
    if (filterType === 'all') return true;
    return m.type === filterType;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Stock Ant.', 'Stock Post.', 'Motivo', 'Usuario'];
    const rows = filteredMovements.map(m => [
      formatDate(m.created_at),
      m.products?.name || '',
      m.type === 'in' ? 'Entrada' : 'Salida',
      m.quantity,
      m.stock_before || '-',
      m.stock_after || '-',
      m.reason,
      'Admin'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `movimientos_inventario_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 print:p-0">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
        <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/50 print:bg-white gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Historial de Movimientos</h2>
            <p className="text-xs text-slate-500">Trazabilidad completa de entradas, salidas y ajustes.</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-bold p-2 rounded-lg border border-slate-200 bg-white outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="in">Entradas</option>
              <option value="out">Salidas</option>
              <option value="waste">Mermas</option>
            </select>
            <button onClick={handlePrint} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Imprimir">
              <Printer size={20} />
            </button>
            <button onClick={handleExport} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Exportar CSV">
              <Download size={20} />
            </button>
            <button onClick={loadMovements} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-center">Cant.</th>
                <th className="px-6 py-4 text-center">Stock Ant.</th>
                <th className="px-6 py-4 text-center">Stock Post.</th>
                <th className="px-6 py-4">Motivo / Referencia</th>
                <th className="px-6 py-4">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400">Cargando...</td></tr>
              ) : filteredMovements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                  <td className="px-6 py-4 text-slate-500 font-medium">{formatDate(m.created_at)}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{m.products?.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{m.products?.code}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-black text-[9px] uppercase",
                      m.type === 'in' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {m.type === 'in' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-center font-black",
                    m.type === 'in' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400 font-bold">{m.stock_before ?? '-'}</td>
                  <td className="px-6 py-4 text-center text-slate-900 font-black">{m.stock_after ?? '-'}</td>
                  <td className="px-6 py-4 text-slate-500 italic">{m.reason}</td>
                  <td className="px-6 py-4 font-bold text-slate-700 uppercase text-[9px]">Admin</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- VISTA: KARDEX DE INVENTARIO ---
const KardexView: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const p = await productService.getByCode(barcode);
      if (p) {
        setProduct(p);
        const history = await inventoryService.getKardex(p.id);
        setMovements(history);
      } else {
        setError('Producto no encontrado.');
        setProduct(null);
        setMovements([]);
      }
    } catch (err) {
      setError('Error al cargar Kardex.');
    } finally {
      setLoading(false);
    }
  };

  // Reconstrucción de existencias acumuladas para el Kardex
  let runningStock = 0;
  const kardexData = movements.map(m => {
    const prevStock = runningStock;
    if (m.type === 'in') runningStock += m.quantity;
    else runningStock -= m.quantity;
    return { ...m, balance: runningStock, prevStock };
  }).reverse(); // Show latest first in table

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 print:p-0">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 print:bg-white">
          <h2 className="text-lg font-bold text-slate-900">Kardex de Inventario</h2>
          <p className="text-xs text-slate-500">Consulta el historial cronológico de existencias por producto.</p>
        </div>

        <div className="p-8 space-y-8">
          <form onSubmit={handleSearch} className="flex gap-4 print:hidden">
            <div className="relative flex-1">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                ref={barcodeRef}
                type="text"
                placeholder="Escanee el código para ver el Kardex..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-primary-500 outline-none transition-all text-lg font-mono"
                autoFocus
              />
            </div>
            <button type="submit" className="px-8 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
              Consultar
            </button>
          </form>

          {product && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-end print:bg-white">
                <div>
                  <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Producto Seleccionado</p>
                  <p className="text-2xl font-black text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{product.brand} | {product.code} | {product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Actual</p>
                  <p className="text-4xl font-black text-slate-900">{product.stock}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Detalle / Motivo</th>
                      <th className="px-6 py-4 text-center">Entradas</th>
                      <th className="px-6 py-4 text-center">Salidas</th>
                      <th className="px-6 py-4 text-center">Existencias</th>
                      <th className="px-6 py-4 text-right">Costo Unit.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kardexData.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                        <td className="px-6 py-4 text-slate-500">{formatDate(m.created_at)}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{m.reason}</td>
                        <td className="px-6 py-4 text-center">
                          {m.type === 'in' ? <span className="text-emerald-600 font-black">+{m.quantity}</span> : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {m.type !== 'in' ? <span className="text-rose-600 font-black">-{m.quantity}</span> : '-'}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-slate-900 bg-slate-50/30">
                          {m.balance}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500">
                          {formatCurrency(product.cost)}
                        </td>
                      </tr>
                    ))}
                    {kardexData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No hay movimientos registrados para este producto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!product && !loading && (
            <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-3xl print:hidden">
              <History className="mx-auto text-slate-200 mb-4" size={64} />
              <p className="text-slate-400 font-medium">Ingrese un código para visualizar el historial cronológico.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
