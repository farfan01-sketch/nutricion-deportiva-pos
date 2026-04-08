import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Receipt, Search, Filter, Calendar, User as UserIcon, Clock, XCircle, AlertCircle, DollarSign, CreditCard, Send, CheckCircle2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { saleService } from '../services/sales';
import { shiftService } from '../services/shifts';
import { formatCurrency, formatDate } from '../utils/format';
import { User, CashRegister } from '../types';
import Modal from '../components/Modal';
import LayawayPaymentTicket from '../components/LayawayPaymentTicket';

interface LayawaysProps {
  user: User;
  register: CashRegister;
}

const Layaways: React.FC<LayawaysProps> = ({ user, register }) => {
  const [layaways, setLayaways] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [layawayToCancel, setLayawayToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLayaway, setSelectedLayaway] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [registering, setRegistering] = useState(false);
  const [openShift, setOpenShift] = useState<any>(null);

  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPaymentData, setLastPaymentData] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Recibo-AB-${lastPaymentData?.receipt_number || 'Abono'}`,
    removeAfterPrint: true,
    suppressErrors: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [layawaysData, shiftData] = await Promise.all([
        saleService.getPendingLayaways(register.id),
        shiftService.getOpenShift(user.id, register.id)
      ]);
      setLayaways(layawaysData);
      setOpenShift(shiftData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id, register.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenPaymentModal = (layaway: any) => {
    setSelectedLayaway(layaway);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLayaway || !openShift) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    if (amount > selectedLayaway.balance) {
      alert('El monto no puede ser mayor al saldo pendiente');
      return;
    }

    setRegistering(true);
    try {
      const result = await saleService.registerLayawayPayment({
        p_layaway_id: selectedLayaway.id,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_user_id: user.id,
        p_shift_id: openShift.id,
        p_register_id: register.id,
        p_notes: paymentNotes
      });
      
      setLastPaymentData(result);
      setShowPaymentModal(false);
      setShowReceipt(true);
      loadData();
    } catch (err: any) {
      console.error('Error registering payment:', err);
      alert(err.message || 'Error al registrar el pago');
    } finally {
      setRegistering(false);
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
      await saleService.cancelSale(layawayToCancel.sale_id, cancelReason, user.id);
      setShowCancelModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar el apartado');
    } finally {
      setCancelling(false);
    }
  };

  const filteredLayaways = layaways.filter(l => {
    const ticketStr = l.sales?.ticket_number ? String(l.sales.ticket_number) : '';
    const customerName = l.sales?.customer?.name?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    
    return ticketStr.toLowerCase().includes(searchLower) ||
           customerName.includes(searchLower) ||
           l.id.toLowerCase().includes(searchLower);
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Apartados Pendientes</h1>
          <p className="text-slate-500">Gestiona las ventas con pagos parciales y saldos pendientes.</p>
        </div>
        {!openShift && (
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center gap-3 text-amber-800 animate-pulse">
            <AlertCircle size={20} />
            <p className="text-xs font-medium">Debes abrir caja para registrar pagos.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por ticket, cliente o ID..."
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
                <th className="px-6 py-4">Abonado</th>
                <th className="px-6 py-4">Saldo Pendiente</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 text-sm">
                    Cargando apartados...
                  </td>
                </tr>
              ) : filteredLayaways.map((layaway) => (
                <tr key={layaway.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">#{layaway.sales?.ticket_number || layaway.id.slice(0, 8)}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(layaway.created_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <UserIcon size={16} className="text-slate-400" />
                      <span>{layaway.sales?.customer?.name || 'Cliente General'}</span>
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
                    {layaway.balance <= 0 ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                        <CheckCircle2 size={12} /> Completado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                        <Clock size={12} /> Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleOpenPaymentModal(layaway)}
                        disabled={!openShift}
                        className="text-primary-600 text-xs font-bold hover:underline disabled:opacity-30 disabled:no-underline"
                      >
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
              {!loading && filteredLayaways.length === 0 && (
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

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => !registering && setShowPaymentModal(false)}
        title="Registrar Pago de Apartado"
        size="md"
      >
        {selectedLayaway && (
          <form onSubmit={handleRegisterPayment} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Saldo Pendiente</p>
                <p className="text-2xl font-black text-rose-600">{formatCurrency(selectedLayaway.balance)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Venta</p>
                <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedLayaway.sales?.total || 0)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Monto del Abono</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedLayaway.balance}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xl font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Método de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'cash', label: 'Efectivo', icon: DollarSign },
                    { id: 'card', label: 'Tarjeta', icon: CreditCard },
                    { id: 'transfer', label: 'Transferencia', icon: Send }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <method.icon size={24} />
                      <span className="text-xs font-bold">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Notas (Opcional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Ej: Pago parcial de quincena..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                disabled={registering}
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={registering || !openShift}
                className="flex-1 px-6 py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {registering ? (
                  'Registrando...'
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Confirmar Pago
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        title="Pago Registrado"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">¡Abono Registrado!</h3>
            <p className="text-sm text-slate-500">
              Folio: <span className="font-mono font-bold text-primary-600">
                {lastPaymentData?.receipt_number 
                  ? `AB-${String(lastPaymentData.receipt_number).padStart(6, '0')}`
                  : (lastPaymentData?.id ? `AB-${lastPaymentData.id.slice(0, 6).toUpperCase()}` : '...')
                }
              </span>
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 overflow-hidden">
            <LayawayPaymentTicket 
              ref={receiptRef} 
              payment={lastPaymentData} 
              layaway={selectedLayaway} 
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handlePrint}
              className="flex-1 bg-primary-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Printer size={20} />
              Imprimir Recibo
            </button>
            <button
              onClick={() => setShowReceipt(false)}
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
