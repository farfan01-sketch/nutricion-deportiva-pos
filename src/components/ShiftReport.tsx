import { forwardRef } from 'react';
import { Shift, User } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { Package, Clock, User as UserIcon, DollarSign, Receipt, Wallet, ArrowRightLeft } from 'lucide-react';

interface ShiftReportProps {
  shift: Shift;
  totals: {
    total_sales: number;
    cash_sales: number;
    transfer_sales: number;
    card_sales: number;
    mixed_sales: number;
    layaways: number;
    total_expenses: number;
    cash_expenses: number;
    total_returns: number;
    cash_returns: number;
    card_returns: number;
    transfer_returns: number;
    expected_cash: number;
  };
  user: User;
}

const ShiftReport = forwardRef<HTMLDivElement, ShiftReportProps>(({ shift, totals, user }, ref) => {
  const difference = (shift.closing_cash || 0) - totals.expected_cash;
  
  const getStatusColor = () => {
    if (shift.status === 'open') return 'text-emerald-600';
    if (Math.abs(difference) < 0.01) return 'text-emerald-600';
    return difference > 0 ? 'text-blue-600' : 'text-rose-600';
  };

  const getStatusText = () => {
    if (shift.status === 'open') return 'Turno Abierto';
    if (Math.abs(difference) < 0.01) return 'Cuadre Exacto';
    return difference > 0 ? `Sobrante: ${formatCurrency(difference)}` : `Faltante: ${formatCurrency(Math.abs(difference))}`;
  };

  return (
    <div ref={ref} className="bg-white p-8 max-w-2xl mx-auto border border-slate-100 shadow-sm print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white">
            <Package size={24} />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Corte de Caja</h2>
        <p className="text-slate-500 text-sm font-medium">Nutrición Deportiva POS</p>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8 py-6 border-y border-slate-100">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Apertura</p>
              <p className="text-xs font-bold text-slate-900">{formatDate(shift.opened_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Cierre</p>
              <p className="text-xs font-bold text-slate-900">{shift.closed_at ? formatDate(shift.closed_at) : 'En curso...'}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
              <UserIcon size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Cajero</p>
              <p className="text-xs font-bold text-slate-900">{shift.user?.name || user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
              <DollarSign size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Fondo Inicial</p>
              <p className="text-xs font-bold text-slate-900">{formatCurrency(shift.opening_cash)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Breakdown */}
      <div className="space-y-4 mb-8">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Receipt size={14} className="text-primary-600" />
          Resumen de Ventas
        </h3>
        <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Ventas en Efectivo</span>
            <span className="font-bold text-slate-900">{formatCurrency(totals.cash_sales)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Ventas Transferencia</span>
            <span className="font-bold text-slate-900">{formatCurrency(totals.transfer_sales)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Ventas Tarjeta</span>
            <span className="font-bold text-slate-900">{formatCurrency(totals.card_sales)}</span>
          </div>
          {totals.mixed_sales > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ventas Mixtas</span>
              <span className="font-bold text-slate-900">{formatCurrency(totals.mixed_sales)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t border-slate-200/50">
            <span className="text-slate-500">Apartados (Anticipos)</span>
            <span className="font-bold text-slate-900">{formatCurrency(totals.layaways)}</span>
          </div>
          <div className="flex justify-between text-sm text-amber-600 font-bold pt-2 border-t border-slate-200/50">
            <span>Devoluciones Totales</span>
            <span>- {formatCurrency(totals.total_returns)}</span>
          </div>
          {totals.cash_returns > 0 && (
            <div className="flex justify-between text-[10px] text-amber-500 pl-4">
              <span>Efectivo</span>
              <span>- {formatCurrency(totals.cash_returns)}</span>
            </div>
          )}
          {totals.card_returns > 0 && (
            <div className="flex justify-between text-[10px] text-amber-500 pl-4">
              <span>Tarjeta</span>
              <span>- {formatCurrency(totals.card_returns)}</span>
            </div>
          )}
          {totals.transfer_returns > 0 && (
            <div className="flex justify-between text-[10px] text-amber-500 pl-4">
              <span>Transferencia</span>
              <span>- {formatCurrency(totals.transfer_returns)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-slate-200 flex justify-between text-base">
            <span className="font-bold text-slate-900">Ventas Netas</span>
            <span className="font-black text-primary-600">{formatCurrency(totals.total_sales - totals.total_returns)}</span>
          </div>
        </div>
      </div>

      {/* Expenses & Cash */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Wallet size={14} className="text-rose-600" />
            Gastos en Efectivo
          </h3>
          <div className="bg-rose-50 rounded-2xl p-6">
            <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Total Gastos</p>
            <p className="text-xl font-black text-rose-600">{formatCurrency(totals.total_expenses)}</p>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <ArrowRightLeft size={14} className="text-emerald-600" />
            Caja Física
          </h3>
          <div className="bg-emerald-50 rounded-2xl p-6">
            <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Efectivo Esperado</p>
            <p className="text-xl font-black text-emerald-600">{formatCurrency(totals.expected_cash)}</p>
          </div>
        </div>
      </div>

      {/* Final Result */}
      {shift.status === 'closed' && (
        <div className="pt-8 border-t border-slate-100 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Efectivo Real</p>
              <p className="text-xl font-black text-slate-900">{formatCurrency(shift.closing_cash || 0)}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Diferencia</p>
              <p className={`text-xl font-black ${getStatusColor()}`}>
                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
              </p>
            </div>
          </div>
          <div className={`text-center py-4 rounded-xl font-black uppercase tracking-widest border-2 ${getStatusColor().replace('text-', 'border-').replace('text-', 'bg-').replace('600', '50')}`}>
            {getStatusText()}
          </div>
        </div>
      )}

      {shift.notes && (
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notas</p>
          <p className="text-xs text-slate-600 italic">"{shift.notes}"</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-slate-100 text-center space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase">Comprobante de Corte de Caja</p>
        <p className="text-[10px] text-slate-300">ID: {shift.id}</p>
      </div>
    </div>
  );
});

ShiftReport.displayName = 'ShiftReport';

export default ShiftReport;
