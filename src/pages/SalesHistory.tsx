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
  AlertCircle
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { saleService } from '../services/sales';
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
  
  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
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
      const [c] = await Promise.all([
        customerService.getAll()
      ]);
      setCustomers(c);
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
      const items = await saleService.getSaleItems(sale.id);
      setSaleItems(items);
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
    </div>
  );
};

export default SalesHistory;
