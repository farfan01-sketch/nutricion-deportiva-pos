import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  ShoppingCart,
  Receipt,
  Printer,
  Package,
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
  UserPlus,
  Tag,
  Eye,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { productService } from '../services/products';
import { customerService } from '../services/customers';
import { saleService } from '../services/sales';
import { shiftService } from '../services/shifts';
import { expenseService } from '../services/expenses';
import { Product, Customer, Shift, User, CashRegister } from '../types';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import Ticket from '../components/Ticket';
import { usePermissions } from '../hooks/usePermissions';
import { cn } from '../lib/utils';

interface POSProps {
  user: User;
  register: CashRegister;
}

const POS: React.FC<POSProps> = ({ user, register }) => {
  const { hasPermission } = usePermissions(user);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card' | 'mixed'>('cash');
  const [saleType, setSaleType] = useState<'sale' | 'layaway'>('sale');
  const [deposit, setDeposit] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  
  // New Modals State
  const [showCommonProductModal, setShowCommonProductModal] = useState(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [cashMovementType, setCashMovementType] = useState<'in' | 'out'>('in');
  const [showPriceChecker, setShowPriceChecker] = useState(false);
  const [showDailySales, setShowDailySales] = useState(false);
  const [dailyTotals, setDailyTotals] = useState<any>(null);
  
  // Form States
  const [commonProductForm, setCommonProductForm] = useState({ name: '', price: 0 });
  const [cashMovementForm, setCashMovementForm] = useState({ amount: 0, note: '', category: 'Varios' });
  const [priceCheckerSearch, setPriceCheckerSearch] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: `Ticket-ND-${lastSaleData?.ticket_number || 'Sale'}`,
    removeAfterPrint: true,
    suppressErrors: true,
  });

  const loadInitialData = useCallback(async () => {
    try {
      const [p, c, s] = await Promise.all([
        productService.getAll(),
        customerService.getAll(),
        shiftService.getOpenShift(user.id, register.id)
      ]);
      setProducts(p);
      setCustomers(c);
      setOpenShift(s);
    } catch (err) {
      console.error(err);
    }
  }, [user.id, register.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product, customPrice?: number) => {
    const existing = cart.find(item => item.product_id === product.id);
    const price = customPrice !== undefined ? customPrice : product.price_retail;
    
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1, price } 
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: price,
        cost: product.cost,
        quantity: 1
      }]);
    }
  };

  const handleCommonProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const tempId = `common-${Date.now()}`;
    setCart([...cart, {
      product_id: tempId,
      name: commonProductForm.name || 'Producto Común',
      price: commonProductForm.price,
      cost: 0,
      quantity: 1,
      is_common: true
    }]);
    setShowCommonProductModal(false);
    setCommonProductForm({ name: '', price: 0 });
  };

  const handleWholesale = () => {
    if (cart.length === 0) return;
    // Apply wholesale price to all items that have it
    const newCart = cart.map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product && product.price_wholesale > 0) {
        return { ...item, price: product.price_wholesale };
      }
      return item;
    });
    setCart(newCart);
  };

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openShift) return;
    
    try {
      setLoading(true);
      await expenseService.create({
        amount: cashMovementType === 'in' ? -cashMovementForm.amount : cashMovementForm.amount,
        category: cashMovementForm.category,
        note: `${cashMovementType === 'in' ? 'ENTRADA' : 'SALIDA'}: ${cashMovementForm.note}`,
        shift_id: openShift.id,
        method: 'cash'
      });
      setShowCashMovementModal(false);
      setCashMovementForm({ amount: 0, note: '', category: 'Varios' });
      loadInitialData();
    } catch (err) {
      alert('Error al registrar movimiento');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyTotals = async () => {
    if (!openShift) return;
    try {
      const totals = await shiftService.getShiftTotals(openShift.id, openShift.opened_at);
      setDailyTotals(totals);
      setShowDailySales(true);
    } catch (err) {
      console.error(err);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal - discount;

  const handleProcessSale = useCallback(async () => {
    if (!openShift) {
      alert('Debes abrir un turno antes de realizar ventas.');
      return;
    }
    if (cart.length === 0) return;
    if (saleType === 'layaway' && !selectedCustomer) {
      alert('Los apartados requieren seleccionar un cliente.');
      return;
    }

    setLoading(true);
    try {
      const result = await saleService.processSale({
        p_customer_id: selectedCustomer,
        p_deposit: saleType === 'layaway' ? deposit : total,
        p_discount: discount,
        p_items: cart.map(item => ({
          product_id: item.product_id.startsWith('common-') ? null : item.product_id,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost,
          name: item.is_common ? item.name : undefined
        })),
        p_payment_method: paymentMethod,
        p_subtotal: subtotal,
        p_total: total,
        p_type: saleType,
        p_user_id: user.id,
        p_shift_id: openShift.id,
        p_register_id: register.id
      });

      const saleRecord = await saleService.getSaleById(result);

      setLastSaleData({
        ...saleRecord,
        items: [...cart]
      });

      setCart([]);
      setDiscount(0);
      setDeposit(0);
      setSelectedCustomer(null);
      setShowTicket(true);
      loadInitialData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  }, [openShift, cart, saleType, selectedCustomer, deposit, total, discount, paymentMethod, subtotal, user.id, register.id, loadInitialData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0 && hasPermission('ventas', 'cobrar_ticket')) handleProcessSale();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (hasPermission('ventas', 'usar_producto_comun')) setShowCommonProductModal(true);
      }
      if (e.key === 'F6') {
        e.preventDefault();
        setShowPriceChecker(true);
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (lastSaleData) handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, hasPermission, lastSaleData, handlePrint, handleProcessSale]);

  if (!openShift) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full space-y-4">
        <Receipt size={64} className="text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">Caja Cerrada</h2>
        <p className="text-slate-500">Abre un turno para comenzar a vender.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* Shortcut Bar */}
      <div className="bg-white border-b border-slate-200 p-2 flex flex-wrap gap-2 shadow-sm z-20">
        <ShortcutButton 
          icon={<Zap size={18} />} 
          label="Prod. Común" 
          shortcut="F4" 
          onClick={() => setShowCommonProductModal(true)}
          disabled={!hasPermission('ventas', 'usar_producto_comun')}
        />
        <ShortcutButton 
          icon={<Search size={18} />} 
          label="Buscar" 
          shortcut="F3" 
          onClick={() => searchInputRef.current?.focus()}
          disabled={!hasPermission('ventas', 'usar_buscador_productos')}
        />
        <ShortcutButton 
          icon={<Tag size={18} />} 
          label="Mayoreo" 
          shortcut="F5" 
          onClick={handleWholesale}
          disabled={!hasPermission('ventas', 'aplicar_mayoreo')}
        />
        <div className="w-px h-8 bg-slate-200 mx-1 self-center" />
        <ShortcutButton 
          icon={<ArrowUpCircle size={18} className="text-emerald-500" />} 
          label="Entrada" 
          onClick={() => { setCashMovementType('in'); setShowCashMovementModal(true); }}
          disabled={!hasPermission('ventas', 'registrar_entradas_efectivo')}
        />
        <ShortcutButton 
          icon={<ArrowDownCircle size={18} className="text-rose-500" />} 
          label="Salida" 
          onClick={() => { setCashMovementType('out'); setShowCashMovementModal(true); }}
          disabled={!hasPermission('ventas', 'registrar_salidas_efectivo')}
        />
        <div className="w-px h-8 bg-slate-200 mx-1 self-center" />
        <ShortcutButton 
          icon={<Eye size={18} />} 
          label="Verificador" 
          shortcut="F6" 
          onClick={() => setShowPriceChecker(true)}
        />
        <ShortcutButton 
          icon={<UserPlus size={18} />} 
          label="Cliente" 
          shortcut="F7" 
          onClick={() => document.getElementById('customer-select')?.focus()}
          disabled={!hasPermission('clientes', 'asignar_cliente_venta')}
        />
        <ShortcutButton 
          icon={<RefreshCw size={18} />} 
          label="Reimprimir" 
          shortcut="F9" 
          onClick={handlePrint}
          disabled={!lastSaleData}
        />
        <ShortcutButton 
          icon={<DollarSign size={18} />} 
          label="Ventas Hoy" 
          shortcut="F10" 
          onClick={loadDailyTotals}
          disabled={!hasPermission('sistema', 'ver_ganancia_dia')}
        />
        <div className="flex-1" />
        <ShortcutButton 
          icon={<CreditCard size={18} />} 
          label="COBRAR" 
          shortcut="F2" 
          primary
          onClick={handleProcessSale}
          disabled={cart.length === 0 || !hasPermission('ventas', 'cobrar_ticket')}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
          <div className="p-4 bg-white border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={hasPermission('ventas', 'usar_buscador_productos') ? "Buscar por nombre o código..." : "Buscador deshabilitado"}
                disabled={!hasPermission('ventas', 'usar_buscador_productos')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-left hover:border-primary-500 transition-all group disabled:opacity-50"
              >
                <div className="aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-slate-300 group-hover:text-primary-500 transition-colors overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Package size={40} />
                  )}
                </div>
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wider">{product.brand}</p>
                <h4 className="font-bold text-slate-900 truncate">{product.name}</h4>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(product.price_retail)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    product.stock > 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {product.stock} disp.
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-[400px] bg-white flex flex-col shadow-xl z-10 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary-600" />
              Carrito de Venta
            </h3>
            <span className="bg-primary-50 text-primary-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {cart.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.map(item => (
              <div key={item.product_id} className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(item.price)} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item.product_id, -1)}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.product_id, 1)}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                  {hasPermission('ventas', 'eliminar_articulos') && (
                    <button 
                      onClick={() => removeFromCart(item.product_id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                <ShoppingCart size={48} className="opacity-20" />
                <p className="text-sm">El carrito está vacío</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cliente</label>
                <select 
                  id="customer-select"
                  value={selectedCustomer || ''} 
                  onChange={(e) => setSelectedCustomer(e.target.value || null)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none"
                >
                  <option value="">Público General</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                <select 
                  value={saleType} 
                  onChange={(e) => setSaleType(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none"
                >
                  <option value="sale">Venta Directa</option>
                  <option value="layaway">Apartado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Pago</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                  <option value="mixed">Mixto</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Descuento</label>
                <input 
                  type="number"
                  value={discount}
                  disabled={!hasPermission('ventas', 'aplicar_descuento')}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {saleType === 'layaway' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Anticipo</label>
                <input 
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none"
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Descuento</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between text-xl font-black text-slate-900 pt-2">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleProcessSale}
              disabled={loading || cart.length === 0 || !hasPermission('ventas', 'cobrar_ticket')}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard size={20} />
                  {!hasPermission('ventas', 'cobrar_ticket') ? 'Sin Permiso para Cobrar' : `Procesar ${saleType === 'sale' ? 'Venta' : 'Apartado'}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Common Product Modal */}
      <Modal
        isOpen={showCommonProductModal}
        onClose={() => setShowCommonProductModal(false)}
        title="Producto Común"
      >
        <form onSubmit={handleCommonProduct} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Descripción</label>
            <input 
              type="text"
              required
              autoFocus
              value={commonProductForm.name}
              onChange={(e) => setCommonProductForm({...commonProductForm, name: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: Artículo vario"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Precio</label>
            <input 
              type="number"
              required
              step="0.01"
              value={commonProductForm.price}
              onChange={(e) => setCommonProductForm({...commonProductForm, price: Number(e.target.value)})}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button type="submit" className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl">
            Agregar al Carrito
          </button>
        </form>
      </Modal>

      {/* Cash Movement Modal */}
      <Modal
        isOpen={showCashMovementModal}
        onClose={() => setShowCashMovementModal(false)}
        title={cashMovementType === 'in' ? 'Entrada de Efectivo' : 'Salida de Efectivo'}
      >
        <form onSubmit={handleCashMovement} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Monto</label>
            <input 
              type="number"
              required
              autoFocus
              step="0.01"
              value={cashMovementForm.amount}
              onChange={(e) => setCashMovementForm({...cashMovementForm, amount: Number(e.target.value)})}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Concepto / Nota</label>
            <textarea 
              required
              value={cashMovementForm.note}
              onChange={(e) => setCashMovementForm({...cashMovementForm, note: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 h-24"
              placeholder="Ej: Pago de luz, Cambio inicial, etc."
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Registrar Movimiento'}
          </button>
        </form>
      </Modal>

      {/* Price Checker Modal */}
      <Modal
        isOpen={showPriceChecker}
        onClose={() => setShowPriceChecker(false)}
        title="Verificador de Precios y Stock"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              autoFocus
              value={priceCheckerSearch}
              onChange={(e) => setPriceCheckerSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Escanea o busca producto..."
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {products.filter(p => 
              p.name.toLowerCase().includes(priceCheckerSearch.toLowerCase()) || 
              p.code.toLowerCase().includes(priceCheckerSearch.toLowerCase())
            ).slice(0, 5).map(p => (
              <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.code} | {p.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary-600">{formatCurrency(p.price_retail)}</p>
                  <p className={`text-xs font-bold ${p.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Stock: {p.stock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Daily Sales Modal */}
      <Modal
        isOpen={showDailySales}
        onClose={() => setShowDailySales(false)}
        title="Resumen de Ventas del Día"
      >
        {dailyTotals && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                <p className="text-[10px] font-bold text-primary-600 uppercase">Ventas Brutas</p>
                <p className="text-xl font-black text-primary-700">{formatCurrency(dailyTotals.total_sales)}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-bold text-rose-600 uppercase">Gastos / Salidas</p>
                <p className="text-xl font-black text-rose-700">{formatCurrency(dailyTotals.total_expenses)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Desglose de Efectivo</h4>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ventas en Efectivo</span>
                <span className="font-bold">{formatCurrency(dailyTotals.cash_sales)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Gastos en Efectivo</span>
                <span className="font-bold text-rose-600">-{formatCurrency(dailyTotals.cash_expenses)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Devoluciones Efectivo</span>
                <span className="font-bold text-rose-600">-{formatCurrency(dailyTotals.cash_returns)}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                <span>Efectivo Esperado</span>
                <span>{formatCurrency(dailyTotals.expected_cash)}</span>
              </div>
            </div>
            <button onClick={() => setShowDailySales(false)} className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">
              Cerrar
            </button>
          </div>
        )}
      </Modal>

      {/* Ticket Modal */}
      <Modal
        isOpen={showTicket}
        onClose={() => setShowTicket(false)}
        title="Venta Exitosa"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Receipt size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">¡Venta Exitosa!</h3>
            <p className="text-sm text-slate-500">
              Ticket: <span className="font-mono font-bold text-primary-600">
                {lastSaleData?.ticket_number 
                  ? `ND-${String(lastSaleData.ticket_number).padStart(6, '0')}`
                  : (lastSaleData?.id ? `ND-${lastSaleData.id.slice(0, 6).toUpperCase()}` : '...')
                }
              </span>
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 overflow-hidden">
            <Ticket ref={ticketRef} sale={lastSaleData} items={lastSaleData?.items || cart} />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handlePrint}
              className="flex-1 bg-primary-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Printer size={20} />
              Imprimir Ticket
            </button>
            <button
              onClick={() => setShowTicket(false)}
              className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

interface ShortcutButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}

const ShortcutButton: React.FC<ShortcutButtonProps> = ({ icon, label, shortcut, onClick, primary, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex flex-col items-center justify-center min-w-[80px] p-2 rounded-xl transition-all group relative",
      primary 
        ? "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200" 
        : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100 hover:border-primary-200",
      disabled && "opacity-40 grayscale cursor-not-allowed"
    )}
  >
    <div className={cn(
      "mb-1 transition-transform group-hover:scale-110",
      primary ? "text-white" : "text-primary-600"
    )}>
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    {shortcut && (
      <span className={cn(
        "absolute -top-1 -right-1 text-[8px] font-black px-1 rounded-md border",
        primary ? "bg-white text-primary-600 border-primary-600" : "bg-slate-100 text-slate-400 border-slate-200"
      )}>
        {shortcut}
      </span>
    )}
  </button>
);

export default POS;
