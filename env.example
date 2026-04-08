import React, { useState } from 'react';
import { Unlock, DollarSign, AlertCircle, LogOut } from 'lucide-react';
import { shiftService } from '../services/shifts';
import { User } from '../types';

interface ShiftOpeningProps {
  user: User;
  onOpen: () => void;
  onLogout: () => void;
}

const ShiftOpening: React.FC<ShiftOpeningProps> = ({ user, onOpen, onLogout }) => {
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cashAmount < 0) {
      setError('El monto inicial no puede ser negativo');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await shiftService.openShift(user.id, cashAmount, notes);
      onOpen();
    } catch (err: any) {
      setError(err.message || 'Error al abrir turno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 bg-emerald-600 text-white text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <Unlock size={32} />
            </div>
            <h1 className="text-2xl font-bold">Apertura de Turno</h1>
            <p className="text-emerald-100 mt-1">Hola, {user.name}. Por favor abre tu turno para comenzar.</p>
          </div>

          <form onSubmit={handleOpenShift} className="p-8 space-y-6">
            <div className="bg-emerald-50 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-emerald-600 shrink-0" size={20} />
              <p className="text-xs text-emerald-800 leading-relaxed">
                Ingresa el monto de efectivo con el que inicias el turno (fondo de caja).
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium border border-rose-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Fondo de Apertura</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Notas (Opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                placeholder="Ej: Cambio de turno..."
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-200"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Unlock size={20} />
                    Confirmar Apertura
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={onLogout}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          </form>
        </div>
        <p className="text-center text-slate-500 text-xs mt-8">
          &copy; 2026 Nutrición Deportiva. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default ShiftOpening;
