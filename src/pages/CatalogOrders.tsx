import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Phone, 
  MapPin, 
  User as UserIcon, 
  FileText,
  ShoppingCart,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { CatalogOrder, User } from '../types';
import { catalogService } from '../services/catalog';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import ProcessWebOrderToSaleModal from '../components/orders/ProcessWebOrderToSaleModal';

interface CatalogOrdersProps {
  user: User;
}

const CatalogOrders: React.FC<CatalogOrdersProps> = ({ user }) => {
  const [orders, setOrders] = useState<CatalogOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<CatalogOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await catalogService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: CatalogOrder['status']) => {
    try {
      setProcessing(true);
      await catalogService.updateOrderStatus(id, status);
      await loadOrders();
      setIsDetailsOpen(false);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error al actualizar el estado.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_phone.includes(search);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: CatalogOrder['status']) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><Clock size={12} /> Pendiente</span>;
      case 'confirmed':
        return <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> Confirmado</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><ShoppingCart size={12} /> Convertido</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle size={12} /> Cancelado</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <ShoppingBag className="text-primary-600" size={32} />
            Pedidos del Catálogo
          </h1>
          <p className="text-slate-500">Gestiona los pedidos recibidos desde tu catálogo web público.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none appearance-none transition-all"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="confirmed">Confirmados</option>
            <option value="completed">Convertidos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
        <button 
          onClick={loadOrders}
          className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
        >
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      <span className="text-slate-400 font-medium">Cargando pedidos...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingBag size={48} className="text-slate-200" />
                      <span className="text-slate-400 font-medium">No se encontraron pedidos.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                          {order.customer_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{order.customer_name}</p>
                          <p className="text-xs text-slate-500">{order.customer_phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{formatDate(order.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(order.total)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        title="Ver detalles"
                      >
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Detalles del Pedido Web"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Información del Cliente</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <UserIcon size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone size={18} className="text-slate-400" />
                    <span className="text-sm font-medium">{selectedOrder.customer_phone}</span>
                  </div>
                  {selectedOrder.customer_address && (
                    <div className="flex items-start gap-3 text-slate-600">
                      <MapPin size={18} className="text-slate-400 mt-0.5" />
                      <span className="text-sm font-medium">{selectedOrder.customer_address}</span>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div className="flex items-start gap-3 text-slate-600">
                      <FileText size={18} className="text-slate-400 mt-0.5" />
                      <span className="text-sm font-medium italic">"{selectedOrder.notes}"</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Estado y Resumen</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Estado Actual:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Fecha de Pedido:</span>
                    <span className="text-sm font-medium text-slate-900">{formatDate(selectedOrder.created_at)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <span className="text-sm font-bold text-slate-900">Total:</span>
                    <span className="text-xl font-black text-primary-600">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Productos Solicitados</h4>
              <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50">
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Producto</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Cant.</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Precio</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map(item => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-slate-900">{item.product?.name || 'Producto no encontrado'}</p>
                          <p className="text-[10px] text-slate-400">{item.product?.brand}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold text-slate-700">{item.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-slate-600">{formatCurrency(item.price)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
              {selectedOrder.status === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}
                  disabled={processing}
                  className="flex-1 min-w-[150px] px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-100 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  Confirmar Pedido
                </button>
              )}
              
              {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') && (
                <>
                  <button
                    onClick={() => {
                      setIsDetailsOpen(false);
                      setIsProcessModalOpen(true);
                    }}
                    disabled={processing}
                    className="flex-1 min-w-[150px] px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    <Receipt size={18} />
                    Procesar como Venta
                  </button>
                  
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    disabled={processing}
                    className="flex-1 min-w-[150px] px-6 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    Cancelar Pedido
                  </button>
                </>
              )}

              {selectedOrder.status === 'completed' && (
                <div className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">Este pedido ya ha sido procesado como una venta.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {selectedOrder && (
        <ProcessWebOrderToSaleModal
          isOpen={isProcessModalOpen}
          onClose={() => setIsProcessModalOpen(false)}
          order={selectedOrder}
          user={user}
          onSuccess={loadOrders}
        />
      )}
    </div>
  );
};

export default CatalogOrders;
