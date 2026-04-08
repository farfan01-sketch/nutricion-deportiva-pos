import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  History, 
  DollarSign, 
  Tag, 
  FileText, 
  Trash2,
  AlertCircle,
  TrendingDown
} from 'lucide-react';
import { expenseService } from '../services/expenses';
import { shiftService } from '../services/shifts';
import { Expense, Shift } from '../types';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({
    category: '',
    amount: 0,
    method: 'cash',
    note: ''
  });

  useEffect(() => {
    loadExpenses();
    loadOpenShift();
  }, []);

  const loadOpenShift = async () => {
    try {
      const shift = await shiftService.getOpenShift();
      setOpenShift(shift);
    } catch (err) {
      console.error(err);
    }
  };

  const loadExpenses = async () => {
    try {
      const data = await expenseService.getAll();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openShift) {
      alert('Debes abrir un turno antes de registrar gastos.');
      return;
    }
    try {
      await expenseService.create({ ...formData, shift_id: openShift.id });
      setIsModalOpen(false);
      setFormData({ category: '', amount: 0, method: 'cash', note: '' });
      loadExpenses();
    } catch (err) {
      alert('Error al registrar gasto');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este registro de gasto?')) {
      await expenseService.delete(id);
      loadExpenses();
    }
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control de Gastos</h1>
          <p className="text-slate-500">Registra y monitorea las salidas de efectivo de la caja.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-200"
        >
          <Plus size={20} />
          Registrar Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <TrendingDown size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500">Total Gastos</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalExpenses)}</h3>
            <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider">Histórico acumulado</p>
          </div>

          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Importante</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Todos los gastos registrados afectan directamente el flujo de caja del turno actual.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center gap-2">
            <History className="text-slate-400" size={20} />
            <h3 className="font-bold text-slate-900">Historial de Gastos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Fecha / Hora</th>
                  <th className="px-6 py-4">Monto</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4">Nota</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <Tag size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{expense.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{new Date(expense.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-500">{new Date(expense.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-rose-600">
                      -{formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase text-slate-500">{expense.method}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                      {expense.note || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                      No hay gastos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nuevo Gasto"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Categoría del Gasto</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none appearance-none"
              >
                <option value="">Selecciona una categoría</option>
                <option value="Servicios">Servicios (Luz, Agua, Internet)</option>
                <option value="Renta">Renta</option>
                <option value="Sueldos">Sueldos / Comisiones</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Papelería">Papelería / Insumos</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Publicidad">Publicidad</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Monto</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Método de Pago</label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({...formData, method: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="cash">Efectivo de Caja</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Nota / Concepto</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
              <textarea
                rows={3}
                required
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
                placeholder="Describe el motivo del gasto..."
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
            >
              Guardar Gasto
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
