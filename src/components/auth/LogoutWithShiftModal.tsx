import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Lock, AlertCircle, DollarSign, ArrowRight } from 'lucide-react';
import { Shift } from '../../types';
import { shiftService } from '../../services/shifts';
import { formatCurrency } from '../../utils/format';
import Modal from '../Modal';

interface LogoutWithShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  openShift: Shift;
  onConfirmLogout: () => void;
}

const LogoutWithShiftModal: React.FC<LogoutWithShiftModalProps> = ({ 
  isOpen, 
  onClose, 
  openShift, 
  onConfirmLogout 
}) => {
  const [step, setStep] = useState<'options' | 'closing'>('options');
  const [loading, setLoading] = useState(false);
  const [shiftTotals, setShiftTotals] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [error, setError] = useState('');

  const loadTotals = useCallback(async () => {
    try {
      const totals = await shiftService.getShiftTotals(openShift.id, openShift.opened_at);
      const initialCash = openShift.opening_cash || 0;
      totals.expected_cash = initialCash + totals.cash_sales - totals.cash_expenses - (totals.cash_returns || 0);
      setShiftTotals(totals);
    } catch (err) {
      console.error('Error loading totals:', err);
    }
  }, [openShift.id, openShift.opened_at, openShift.opening_cash]);

  useEffect(() => {
    if (isOpen && openShift) {
      loadTotals();
    } else {
      setStep('options');
      setError('');
      setCashAmount(0);
    }
  }, [isOpen, openShift, loadTotals]);

  const handleCloseAndLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftTotals) return;
    
    setLoading(true);
    setError('');
    try {
      const { emailStatus } = await shiftService.closeShift(openShift.id, cashAmount, shiftTotals);
      if (emailStatus) {
        const emailSuccess = !!emailStatus.emailResult?.id;
        const whatsappStatus = emailStatus.whatsappResult?.status;
        const whatsappSuccess = ['queued', 'sent', 'delivered'].includes(whatsappStatus);

        let message = '';
        if (emailSuccess && whatsappSuccess) {
          message = "Turno cerrado correctamente. Correo enviado y WhatsApp en cola/envío exitoso.";
        } else if (emailSuccess && !whatsappSuccess) {
          message = "Turno cerrado correctamente. Correo enviado, pero WhatsApp no pudo enviarse.";
        } else if (!emailSuccess && whatsappSuccess) {
          message = "Turno cerrado correctamente. WhatsApp enviado, pero el correo no pudo enviarse.";
        } else if (!emailSuccess && !whatsappSuccess) {
          message = "Turno cerrado correctamente, pero no se pudieron enviar las notificaciones.";
        } else {
          message = emailStatus.error || emailStatus.detail || emailStatus.message || 'Turno cerrado correctamente.';
        }
        alert(message);
      }
      onConfirmLogout();
    } catch (err: any) {
      setError('Error al cerrar el turno. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Turno Abierto Detectado"
      size={step === 'closing' ? 'md' : 'sm'}
    >
      {step === 'options' ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Tienes un turno abierto</h3>
              <p className="text-sm text-slate-500 mt-1">
                ¿Qué deseas hacer antes de cerrar sesión?
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setStep('closing')}
              className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 group-hover:bg-rose-100">
                  <Lock size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">Cerrar turno y salir</p>
                  <p className="text-xs text-slate-500">Realiza el corte de caja ahora</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-primary-500" />
            </button>

            <button
              onClick={onConfirmLogout}
              className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 group-hover:bg-amber-100">
                  <LogOut size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">Salir y dejar turno abierto</p>
                  <p className="text-xs text-slate-500">Podrás continuar después</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-amber-500" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <form onSubmit={handleCloseAndLogout} className="space-y-6">
          <div className="bg-primary-50 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-primary-600 shrink-0" size={20} />
            <p className="text-xs text-primary-800 leading-relaxed">
              Ingresa el efectivo real contado en caja para finalizar el turno y cerrar sesión.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium border border-rose-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Efectivo Real en Caja</label>
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

          {shiftTotals && (
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

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={() => setStep('options')}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={loading || !shiftTotals}
              className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={18} />
                  Cerrar y Salir
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default LogoutWithShiftModal;
