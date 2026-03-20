import React, { useState, useEffect } from 'react';
import { Receipt, Search, Filter, Calendar, User as UserIcon, Clock, XCircle, AlertCircle } from 'lucide-react';
import { saleService } from '../services/sales';
import { formatCurrency, formatDate } from '../utils/format';
import { User } from '../types';
import Modal from '../components/Modal';

interface LayawaysProps {
  user: User;
}

const Layaways: React.FC<LayawaysProps> = ({ user }) => {
  const [layaways, setLayaways] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [layawayToCancel, setLayawayToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadLayaways();
  }, []);

  const loadLayaways = async () => {
    try {
      const data = await saleService.getPendingLayaways();
      setLayaways(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCancelModal = (layaway: any) => {
    setLayawayToCancel(layaway);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelLayaway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!layawayToCancel) return;
    
    setCancelling(true);
    try {
      // Usamos el sale_id del apartado para cancelar la venta relacionada
      await saleService.cancelSale(layawayToCancel.sale_id, cancelReason, user.id);
      setShowCancelModal(false);
      loadLayaways();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar el apartado');
    } finally {
      setCancelling(false);
    }
  };

  const filteredLayaways = layaways.filter(l => 
    l.sales?.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
    l.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Apartados Pendientes</h1>
        <p className="text-slate-500">Gestiona las ventas con pagos parciales y saldos pendientes.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por ticket o ID..."
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
                <th className="px-6 py-4">Ticket / Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Total Venta</th>
                <th className="px-6 py-4">Anticipo</th>
                <th className="px-6 py-4">Saldo Pendiente</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLayaways.map((layaway) => (
                <tr key={layaway.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">#{layaway.sales?.ticket_number || (layaway.id ? layaway.id.slice(0, 8) : '...')}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(layaway.created_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <UserIcon size={16} className="text-slate-400" />
                      <span>{layaway.sales?.customer?.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {formatCurrency(layaway.sales?.total || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                    {formatCurrency(layaway.deposit)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-rose-600">{formatCurrency(layaway.balance)}</span>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${(layaway.deposit / (layaway.sales?.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                      <Clock size={12} /> Pendiente
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="text-primary-600 text-xs font-bold hover:underline">
                        Registrar Pago
                      </button>
                      <button 
                        onClick={() => handleOpenCancelModal(layaway)}
                        className="text-rose-600 hover:text-rose-700 p-1 rounded-lg transition-all"
                        title="Cancelar Apartado"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLayaways.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 text-sm">
                    No hay apartados pendientes en este momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => !cancelling && setShowCancelModal(false)}
        title="Cancelar Apartado"
        size="sm"
      >
        <form onSubmit={handleCancelLayaway} className="space-y-6">
          <div className="bg-rose-50 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-rose-600 shrink-0" size={20} />
            <p className="text-xs text-rose-800 leading-relaxed">
              Esta acción devolverá los productos al inventario y marcará tanto el apartado como la venta como cancelados.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Motivo de Cancelación</label>
            <textarea
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm"
              placeholder="Ej: El cliente ya no regresó por el producto..."
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

export default Layaways;
