import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Unlock, 
  Lock, 
  DollarSign, 
  History, 
  AlertCircle
} from 'lucide-react';
import { shiftService } from '../services/shifts';
import { Shift, User } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';

interface ShiftsProps {
  user: User;
}

const Shifts: React.FC<ShiftsProps> = ({ user }) => {
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [current, past] = await Promise.all([
        shiftService.getOpenShift(),
        shiftService.getHistory()
      ]);
      setOpenShift(current);
      setHistory(past);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await shiftService.openShift(user.id, cashAmount);
      setIsModalOpen(false);
      setCashAmount(0);
      loadData();
    } catch (err) {
      alert('Error al abrir turno');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openShift) return;
    try {
      await shiftService.closeShift(openShift.id, cashAmount);
      setIsModalOpen(false);
      setCashAmount(0);
      loadData();
    } catch (err) {
      alert('Error al cerrar turno');
    }
  };

  const openModal = (closing: boolean) => {
    setIsClosing(closing);
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
            onClick={() => openModal(false)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-200"
          >
            <Unlock size={20} />
            Abrir Turno
          </button>
        ) : (
          <button
            onClick={() => openModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-200"
          >
            <Lock size={20} />
            Cerrar Turno
          </button>
        )}
      </div>

      {openShift && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fondo Inicial</p>
            <h3 className="text-xl font-bold text-slate-900">{formatCurrency(openShift.opening_cash)}</h3>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <Clock size={12} /> Abierto: {formatDate(openShift.opened_at)}
            </div>
          </div>
          <div className="bg-primary-600 p-6 rounded-2xl shadow-lg shadow-primary-100 text-white">
            <p className="text-xs font-bold text-primary-100 uppercase tracking-wider mb-1">Efectivo Esperado</p>
            <h3 className="text-2xl font-black">{formatCurrency(openShift.expected_cash || 0)}</h3>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-2">
          <History className="text-slate-400" size={20} />
          <h3 className="font-bold text-slate-900">Historial de Turnos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Apertura / Cierre</th>
                <th className="px-6 py-4">Fondo Inicial</th>
                <th className="px-6 py-4">Esperado</th>
                <th className="px-6 py-4">Real</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((shift) => (
                <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900">A: {formatDate(shift.opened_at)}</p>
                      {shift.closed_at && <p className="text-[10px] text-slate-500">C: {formatDate(shift.closed_at)}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {formatCurrency(shift.opening_cash)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {formatCurrency(shift.expected_cash || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {shift.closing_cash !== null ? formatCurrency(shift.closing_cash) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                      shift.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {shift.status === 'open' ? 'Abierto' : 'Cerrado'}
                    </span>
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
        title={isClosing ? 'Cerrar Turno' : 'Abrir Turno'}
      >
        <form onSubmit={isClosing ? handleCloseShift : handleOpenShift} className="space-y-6">
          <div className="bg-primary-50 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-primary-600 shrink-0" size={20} />
            <p className="text-xs text-primary-800 leading-relaxed">
              {isClosing 
                ? 'Ingresa el efectivo real contado en caja para finalizar el turno.'
                : 'Ingresa el monto de efectivo con el que inicias el turno (fondo de caja).'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {isClosing ? 'Efectivo Real en Caja' : 'Fondo de Apertura'}
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
              className={`flex-1 px-6 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${
                isClosing ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {isClosing ? 'Confirmar Cierre' : 'Confirmar Apertura'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shifts;
