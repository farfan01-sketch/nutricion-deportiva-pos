import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Clock, 
  Unlock, 
  Lock, 
  DollarSign, 
  History, 
  AlertCircle,
  Printer,
  Eye,
  TrendingUp
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { shiftService } from '../services/shifts';
import { Shift, User, CashRegister } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import ShiftReport from '../components/ShiftReport';

interface ShiftsProps {
  user: User;
  register: CashRegister;
}

const Shifts: React.FC<ShiftsProps> = ({ user, register }) => {
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'open' | 'close' | 'view'>('open');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [shiftTotals, setShiftTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [cashAmount, setCashAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => reportRef.current,
    documentTitle: `Corte-Caja-${selectedShift?.id || 'Shift'}`,
    removeAfterPrint: true,
    suppressErrors: true,
  });

  const loadData = useCallback(async () => {
    try {
      const [current, past] = await Promise.all([
        shiftService.getOpenShift(user.id, register.id),
        shiftService.getHistory(register.id)
      ]);
      setOpenShift(current);
      setHistory(past);
    } catch (err) {
      console.error(err);
    }
  }, [user.id, register.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadShiftTotals = React.useCallback(async (shiftId: string, openedAt: string, closedAt?: string) => {
    try {
      const totals = await shiftService.getShiftTotals(shiftId, openedAt, closedAt);
      const initialCash = openShift?.opening_cash || selectedShift?.opening_cash || 0;
      
      // Fórmula de efectivo esperado:
      // Fondo inicial + Ventas en efectivo + Abonos en efectivo - Gastos en efectivo - Devoluciones en efectivo
      // Nota: totals.cash_sales ya incluye abonos en efectivo según shiftService.getShiftTotals
      totals.expected_cash = initialCash + totals.cash_sales - totals.cash_expenses - (totals.cash_returns || 0);
      setShiftTotals(totals);
    } catch (err) {
      console.error(err);
    }
  }, [openShift?.opening_cash, selectedShift?.opening_cash]);

  useEffect(() => {
    if (openShift) {
      loadShiftTotals(openShift.id, openShift.opened_at);
    } else {
      setShiftTotals(null);
    }
  }, [openShift, loadShiftTotals]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await shiftService.openShift(user.id, register.id, cashAmount, notes);
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      alert('Error al abrir turno');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openShift || !shiftTotals) return;
    setLoading(true);
    try {
      const { emailStatus } = await shiftService.closeShift(openShift.id, cashAmount, shiftTotals);
      setIsModalOpen(false);
      resetForm();
      loadData();
      
      if (emailStatus) {
        const emailOk = !!emailStatus.emailResult?.id;
        let whatsappOk = false;

        try {
          const parsed = typeof emailStatus.whatsappResult === "string"
            ? JSON.parse(emailStatus.whatsappResult)
            : emailStatus.whatsappResult;

          console.log("WhatsApp parsed:", parsed);

          if (
            parsed &&
            (
              parsed.status === "queued" ||
              parsed.status === "sent" ||
              parsed.status === "delivered"
            )
          ) {
            whatsappOk = true;
          }
        } catch (e) {
          console.error("Error parsing whatsappResult:", e);
        }

        let message = "";
        if (emailOk && whatsappOk) {
          message = "Turno cerrado correctamente. Correo y WhatsApp enviados.";
        } else if (emailOk && !whatsappOk) {
          message = "Turno cerrado correctamente. Correo enviado, pero WhatsApp no pudo enviarse.";
        } else if (!emailOk && whatsappOk) {
          message = "Turno cerrado correctamente. WhatsApp enviado, pero el correo no pudo enviarse.";
        } else {
          message = "Turno cerrado correctamente, pero no se pudieron enviar las notificaciones.";
        }
        alert(message);
      } else {
        alert('Turno cerrado correctamente.');
      }
    } catch (err) {
      alert('Error al cerrar turno');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCashAmount(0);
    setNotes('');
    setSelectedShift(null);
  };

  const openViewModal = async (shift: Shift) => {
    setSelectedShift(shift);
    setModalType('view');
    setIsModalOpen(true);
    
    setLoading(true);
    try {
      // Siempre calculamos los totales para asegurar que tenemos la utilidad real y el COGS
      const totals = await shiftService.getShiftTotals(shift.id, shift.opened_at, shift.closed_at || undefined);
      
      // Si el turno está cerrado, usamos el efectivo esperado guardado si existe
      if (shift.status === 'closed' && shift.expected_cash !== null) {
        totals.expected_cash = shift.expected_cash;
      } else {
        const initialCash = shift.opening_cash || 0;
        totals.expected_cash = initialCash + totals.cash_sales - totals.cash_expenses - (totals.cash_returns || 0);
      }
      
      setShiftTotals(totals);
    } catch (err) {
      console.error('Error loading shift totals:', err);
      // Fallback a los datos de auditoría si falla el cálculo detallado
      if (shift.status === 'closed' && shift.cash_sales !== undefined) {
        const totals = {
          total_sales: Number(shift.total_sales) || 0,
          cash_sales: Number(shift.cash_sales) || 0,
          card_sales: Number(shift.card_sales) || 0,
          transfer_sales: Number(shift.transfer_sales) || 0,
          layaway_cash_payments: Number(shift.layaway_cash) || 0,
          layaway_card_payments: Number(shift.layaway_card) || 0,
          layaway_transfer_payments: Number(shift.layaway_transfer) || 0,
          total_expenses: Number(shift.total_expenses) || 0,
          cash_expenses: Number(shift.cash_expenses) || 0,
          total_returns: (Number(shift.cash_returns) || 0) + (Number(shift.card_returns) || 0) + (Number(shift.transfer_returns) || 0),
          cash_returns: Number(shift.cash_returns) || 0,
          card_returns: Number(shift.card_returns) || 0,
          transfer_returns: Number(shift.transfer_returns) || 0,
          expected_cash: Number(shift.expected_cash) || 0,
          real_profit: Number(shift.real_profit) || 0
        };
        setShiftTotals(totals as any);
      }
    } finally {
      setLoading(false);
    }
  };

  const openCloseModal = () => {
    setModalType('close');
    setCashAmount(0);
    setIsModalOpen(true);
  };

  const openOpenModal = () => {
    setModalType('open');
    setCashAmount(0);
    setNotes('');
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cortes de Caja</h1>
          <p className="text-slate-500">Administra los turnos y el flujo de efectivo diario.</p>
        </div>
        {!openShift ? (
          <button
            onClick={openOpenModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-200"
          >
            <Unlock size={20} />
            Abrir Turno
          </button>
        ) : (
          <button
            onClick={openCloseModal}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-200"
          >
            <Lock size={20} />
            Cerrar Turno
          </button>
        )}
      </div>

      {openShift && shiftTotals && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fondo Inicial</p>
              <h3 className="text-xl font-bold text-slate-900">{formatCurrency(openShift.opening_cash)}</h3>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <Clock size={12} /> {formatDate(openShift.opened_at)}
              </div>
            </div>
            <div className="bg-primary-600 p-6 rounded-2xl shadow-lg shadow-primary-100 text-white">
              <p className="text-[10px] font-bold text-primary-100 uppercase tracking-wider mb-1">Ventas Totales</p>
              <h3 className="text-xl font-black">{formatCurrency(shiftTotals.total_sales)}</h3>
            </div>
            <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-100 text-white">
              <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Utilidad Real</p>
              <h3 className="text-xl font-black">{formatCurrency(shiftTotals.real_profit)}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Efectivo Esperado</p>
              <h3 className="text-xl font-bold text-emerald-600">{formatCurrency(shiftTotals.expected_cash)}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gastos</p>
              <h3 className="text-xl font-bold text-rose-600">{formatCurrency(shiftTotals.total_expenses)}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Devoluciones</p>
              <h3 className="text-xl font-bold text-amber-600">{formatCurrency(shiftTotals.total_returns || 0)}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary-600" />
                Resumen del Turno Actual
              </h3>
              <button 
                onClick={() => openShift && loadShiftTotals(openShift.id, openShift.opened_at)}
                className="text-xs font-bold text-primary-600 hover:text-primary-700"
              >
                Actualizar Datos
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ventas Efectivo</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrency(shiftTotals.cash_sales - shiftTotals.layaway_cash_payments)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ventas Transf/Tarj</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrency(shiftTotals.transfer_sales + shiftTotals.card_sales - shiftTotals.layaway_transfer_payments - shiftTotals.layaway_card_payments)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Abonos Apartados</p>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(shiftTotals.layaway_cash_payments + shiftTotals.layaway_card_payments + shiftTotals.layaway_transfer_payments)}</p>
                  <div className="flex flex-col text-[9px] text-slate-500">
                    {shiftTotals.layaway_cash_payments > 0 && <span>Efectivo: {formatCurrency(shiftTotals.layaway_cash_payments)}</span>}
                    {(shiftTotals.layaway_card_payments > 0 || shiftTotals.layaway_transfer_payments > 0) && (
                      <span>Otros: {formatCurrency(shiftTotals.layaway_card_payments + shiftTotals.layaway_transfer_payments)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Gastos (Efectivo)</p>
                <p className="text-sm font-bold text-rose-600">{formatCurrency(shiftTotals.total_expenses)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Devoluciones (Efectivo)</p>
                <p className="text-sm font-bold text-amber-600">{formatCurrency(shiftTotals.cash_returns || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="text-slate-400" size={20} />
            <h3 className="font-bold text-slate-900">Historial de Cortes</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Apertura / Cierre</th>
                <th className="px-6 py-4">Cajero</th>
                <th className="px-6 py-4">Ventas</th>
                <th className="px-6 py-4">Esperado</th>
                <th className="px-6 py-4">Real</th>
                <th className="px-6 py-4">Diferencia</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((shift) => (
                <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900">{formatDate(shift.opened_at)}</p>
                      {shift.closed_at && <p className="text-[10px] text-slate-500">{formatDate(shift.closed_at)}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {shift.user?.name || 'Sistema'}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-900">
                    {formatCurrency(shift.total_sales)}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-900">
                    {formatCurrency(shift.expected_cash || 0)}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-900">
                    {shift.closing_cash !== null ? formatCurrency(shift.closing_cash) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {shift.status === 'closed' && (
                      <span className={`text-xs font-bold ${
                        Math.abs(shift.difference) < 0.01 ? 'text-emerald-600' : shift.difference > 0 ? 'text-blue-600' : 'text-rose-600'
                      }`}>
                        {shift.difference > 0 ? '+' : ''}{formatCurrency(shift.difference)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                      shift.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {shift.status === 'open' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openViewModal(shift)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalType === 'open' ? 'Abrir Turno' : 
          modalType === 'close' ? 'Cerrar Turno' : 
          'Detalle de Corte'
        }
        size={modalType === 'view' ? 'lg' : 'md'}
      >
        {modalType === 'view' && selectedShift && shiftTotals ? (
          <div className="space-y-6">
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <ShiftReport ref={reportRef} shift={selectedShift} totals={shiftTotals} user={user} />
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button
                onClick={handlePrint}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={20} />
                Imprimir Corte
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={modalType === 'close' ? handleCloseShift : handleOpenShift} className="space-y-6">
            <div className="bg-primary-50 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-primary-600 shrink-0" size={20} />
              <p className="text-xs text-primary-800 leading-relaxed">
                {modalType === 'close' 
                  ? 'Ingresa el efectivo real contado en caja para finalizar el turno. El sistema calculará la diferencia automáticamente.'
                  : 'Ingresa el monto de efectivo con el que inicias el turno (fondo de caja).'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                {modalType === 'close' ? 'Efectivo Real en Caja' : 'Fondo de Apertura'}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Notas (Opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                placeholder="Ej: Cambio de turno, fondo inicial ajustado..."
              />
            </div>

            {modalType === 'close' && shiftTotals && (
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Efectivo Esperado:</span>
                  <span className="font-bold">{formatCurrency(shiftTotals.expected_cash)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Diferencia:</span>
                  <span className={`font-bold ${cashAmount - shiftTotals.expected_cash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(cashAmount - shiftTotals.expected_cash)}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-6 py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  modalType === 'close' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {modalType === 'close' ? <Lock size={18} /> : <Unlock size={18} />}
                    {modalType === 'close' ? 'Confirmar Cierre' : 'Confirmar Apertura'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Shifts;
