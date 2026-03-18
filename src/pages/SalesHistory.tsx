import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Calendar, 
  Printer, 
  Eye, 
  Filter,
  X,
  User as UserIcon,
  XCircle,
  AlertCircle,
  RotateCcw,
  Minus,
  Plus
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../lib/supabase';
import { saleService } from '../services/sales';
import { shiftService } from '../services/shifts';
import { customerService } from '../services/customers';
import { Customer, Sale, SaleItem, User } from '../types';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import Ticket from '../components/Ticket';

interface SalesHistoryProps {
  user: User;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ user }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTicket, setShowTicket] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedSaleReturns, setSelectedSaleReturns] = useState<any[]>([]);
  
  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Partial Return state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [saleToReturn, setSaleToReturn] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ product_id: string; name: string; quantity: number; max: number; price: number; toReturn: number }[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);
  
  const [openShift, setOpenShift] = useState<any>(null);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    ticketNumber: '',
    customerId: ''
  });

  const ticketRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
  });

  const loadSales = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await saleService.getHistory(filters);
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadInitialData = React.useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        customerService.getAll(),
        shiftService.getOpenShift()
      ]);
      setCustomers(c);
      setOpenShift(s);
      loadSales();
    } catch (err) {
      console.error(err);
    }
  }, [loadSales]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleViewTicket = async (sale: Sale) => {
    try {
      const [items, returns] = await Promise.all([
        saleService.getSaleItems(sale.id),
        supabase.from('sale_returns').select('*, items:return_items(quantity, price, product:products(name))').eq('sale_id', sale.id)
      ]);
      setSaleItems(items);
      setSelectedSaleReturns(returns.data || []);
      setSelectedSale({
        ...sale,
        customer_name: sale.customer?.name,
        user_name: sale.user?.name
      });
      setShowTicket(true);
    } catch (err) {
      alert('Error al cargar detalles de la venta');
    }
  };

  const handleOpenCancelModal = (sale: Sale) => {
    setSaleToCancel(sale);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToCancel) return;
    
    setCancelling(true);
    try {
      await saleService.cancelSale(saleToCancel.id, cancelReason, user.id);
      setShowCancelModal(false);
      loadSales();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar la venta');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenReturnModal = async (sale: Sale) => {
    try {
      const [items, returns] = await Promise.all([
        saleService.getSaleItems(sale.id),
        supabase.from('sale_returns').select('*, items:return_items(*)').eq('sale_id', sale.id)
      ]);

      // Calculate already returned quantities
      const returnedQtys: Record<string, number> = {};
      returns.data?.forEach(ret => {
        ret.items?.forEach((ri: any) => {
          returnedQtys[ri.product_id] = (returnedQtys[ri.product_id] || 0) + ri.quantity;
        });
      });

      setSaleToReturn(sale);
      setReturnItems(items.map(item => {
        const alreadyReturned = returnedQtys[item.product_id] || 0;
        return {
          product_id: item.product_id,
          name: item.product?.name || 'Producto',
          quantity: item.quantity,
          max: item.quantity - alreadyReturned,
          price: item.price,
          toReturn: 0
        };
      }));
      setReturnReason('');
      setShowReturnModal(true);
    } catch (err) {
      alert('Error al cargar productos de la venta');
    }
  };

  const handleUpdateReturnQty = (productId: string, delta: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newVal = Math.max(0, Math.min(item.max, item.toReturn + delta));
        return { ...item, toReturn: newVal };
      }
      return item;
    }));
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToReturn) return;
    
    const itemsToReturn = returnItems.filter(i => i.toReturn > 0);
    if (itemsToReturn.length === 0) {
      alert('Selecciona al menos un producto para devolver');
      return;
    }

    setReturning(true);
    try {
      await saleService.processPartialReturn({
        p_sale_id: saleToReturn.id,
        p_user_id: user.id,
        p_shift_id: openShift?.id || null,
        p_reason: returnReason,
        p_items: itemsToReturn.map(i => ({
          product_id: i.product_id,
          quantity: i.toReturn,
          price: i.price
        }))
      });
      setShowReturnModal(false);
      loadSales();
      alert('Devolución procesada exitosamente');
    } catch (err: any) {
      alert(err.message || 'Error al procesar la devolución');
    } finally {
      setReturning(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      ticketNumber: '',
      customerId: ''
    });
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de Ventas</h1>
          <p className="text-slate-500">Consulta y reimprime tickets de ventas anteriores.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Ticket</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar ticket..."
              value={filters.ticketNumber}
              onChange={(e) => setFilters({...filters, ticketNumber: e.target.value})}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Desde</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Cliente</label>
          <select
            value={filters.customerId}
            onChange={(e) => setFilters({...filters, customerId: e.target.value})}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          >
            <option value="">Todos los clientes</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSales}
            className="flex-1 bg-primary-600 text-white font-bold py-2 rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
          >
            <Filter size={18} />
            Filtrar
          </button>
          <button
            onClick={resetFilters}
            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Ticket</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Atendió</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Cargando historial...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No se encontraron ventas.
                  </td>
                </tr>
              ) : sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-primary-600">
                      {sale.ticket_number 
                        ? `ND-${String(sale.ticket_number).padStart(6, '0')}`
                        : (sale.id ? `ND-${sale.id.slice(0, 6).toUpperCase()}` : '...')
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{new Date(sale.created_at).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-500">{new Date(sale.created_at).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{sale.customer?.name || 'Público General'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserIcon size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-600">{sale.user?.name || 'Sistema'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full capitalize">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(sale.total)}</span>
                    {sale.notes?.includes('DEVOLUCIÓN PARCIAL') && (
                      <div className="flex items-center gap-1 text-[8px] font-bold text-amber-600 uppercase mt-1">
                        <RotateCcw size={8} />
                        Devolución
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                      sale.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                      sale.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleViewTicket(sale)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        title="Ver Ticket"
                      >
                        <Eye size={18} />
                      </button>
                      {sale.status === 'completed' && (
                        <button 
                          onClick={() => handleOpenReturnModal(sale)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Devolución Parcial"
                        >
                          <RotateCcw size={18} />
                        </button>
                      )}
                      {sale.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleOpenCancelModal(sale)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Cancelar Venta"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Modal */}
      <Modal
        isOpen={showTicket}
        onClose={() => setShowTicket(false)}
        title="Reimpresión de Ticket"
        size="sm"
      >
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 overflow-hidden">
            <Ticket ref={ticketRef} sale={selectedSale} items={saleItems} />
          </div>

          {selectedSaleReturns.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <RotateCcw size={14} />
                Historial de Devoluciones
              </h4>
              <div className="space-y-2">
                {selectedSaleReturns.map((ret) => (
                  <div key={ret.id} className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px]">
                    <div className="flex justify-between font-bold text-amber-900 mb-1">
                      <span>{new Date(ret.created_at).toLocaleString()}</span>
                      <span>Total: {formatCurrency(ret.total_returned)}</span>
                    </div>
                    <p className="text-amber-700 italic mb-2">"{ret.reason}"</p>
                    <div className="space-y-1">
                      {ret.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-amber-800">
                          <span>{item.quantity}x {item.product?.name}</span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

      {/* Cancellation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => !cancelling && setShowCancelModal(false)}
        title="Cancelar Venta"
        size="sm"
      >
        <form onSubmit={handleCancelSale} className="space-y-6">
          <div className="bg-rose-50 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-rose-600 shrink-0" size={20} />
            <p className="text-xs text-rose-800 leading-relaxed">
              Esta acción devolverá los productos al inventario y marcará la venta como cancelada. Esta acción no se puede deshacer.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Motivo de Cancelación</label>
            <textarea
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm"
              placeholder="Ej: Error en el cobro, el cliente ya no quiso el producto..."
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              disabled={cancelling}
              onClick={() => setShowCancelModal(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              No, Volver
            </button>
            <button
              type="submit"
              disabled={cancelling}
              className="flex-1 px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {cancelling ? 'Cancelando...' : 'Sí, Cancelar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Partial Return Modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => !returning && setShowReturnModal(false)}
        title="Devolución Parcial"
        size="md"
      >
        <form onSubmit={handleProcessReturn} className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0" size={20} />
            <p className="text-xs text-amber-800 leading-relaxed">
              Selecciona los productos y cantidades que el cliente está devolviendo. El stock se actualizará automáticamente.
            </p>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
            {returnItems.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-500">Vendido: {item.max} | Precio: {formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdateReturnQty(item.product_id, -1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-slate-900">{item.toReturn}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateReturnQty(item.product_id, 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Motivo de Devolución</label>
            <textarea
              required
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
              placeholder="Ej: Producto defectuoso, talla incorrecta..."
              rows={2}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              disabled={returning}
              onClick={() => setShowReturnModal(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={returning}
              className="flex-1 px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 disabled:opacity-50"
            >
              {returning ? 'Procesando...' : 'Procesar Devolución'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SalesHistory;
