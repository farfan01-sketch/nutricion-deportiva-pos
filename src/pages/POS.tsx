import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  ShoppingCart,
  Receipt,
  Printer,
  Package
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { productService } from '../services/products';
import { customerService } from '../services/customers';
import { saleService } from '../services/sales';
import { shiftService } from '../services/shifts';
import { Product, Customer, Shift } from '../types';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import Ticket from '../components/Ticket';

interface POSProps {
  user: any;
}

const POS: React.FC<POSProps> = ({ user }) => {
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

  const ticketRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [p, c, s] = await Promise.all([
        productService.getAll(),
        customerService.getAll(),
        shiftService.getOpenShift()
      ]);
      setProducts(p);
      setCustomers(c);
      setOpenShift(s);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.price_retail,
        cost: product.cost,
        quantity: 1
      }]);
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

  const handleProcessSale = async () => {
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
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost
        })),
        p_payment_method: paymentMethod,
        p_subtotal: subtotal,
        p_total: total,
        p_type: saleType,
        p_user_id: user.id
      });

      const customer = customers.find(c => c.id === selectedCustomer);
      setLastSaleData({
        id: result.sale_id,
        ticket_number: result.ticket_number,
        created_at: new Date().toISOString(),
        user_name: user.name,
        customer_name: customer?.name,
        subtotal,
        discount,
        total,
        payment_method: paymentMethod,
        type: saleType
      });

      setCart([]);
      setDiscount(0);
      setDeposit(0);
      setSelectedCustomer(null);
      setShowTicket(true);
      loadInitialData(); // Refresh stock and shift
    } catch (err: any) {
      alert(err.message || 'Error al procesar la venta');
    }
  };

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
    <div className="h-full flex overflow-hidden">
      {/* Products Section */}
      <div className="flex-1 flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
        <div className="p-4 bg-white border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
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
              <div className="aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-slate-300 group-hover:text-primary-500 transition-colors">
                <Package size={40} />
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
                <button 
                  onClick={() => removeFromCart(item.product_id)}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                >
                  <Trash2 size={16} />
                </button>
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
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none"
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
            disabled={loading || cart.length === 0}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard size={20} />
                Procesar {saleType === 'sale' ? 'Venta' : 'Apartado'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ticket Modal */}
      <Modal
        isOpen={showTicket}
        onClose={() => setShowTicket(false)}
        title="Venta Exitosa"
        size="sm"
      >
        <div className="space-y-6">
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

export default POS;
