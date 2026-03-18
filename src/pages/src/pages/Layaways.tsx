import React, { useState, useEffect } from 'react';
import { Receipt, Search, Filter, Calendar, User, Clock } from 'lucide-react';
import { saleService } from '../services/sales';
import { formatCurrency, formatDate } from '../utils/format';

const Layaways: React.FC = () => {
  const [layaways, setLayaways] = useState<any[]>([]);
  const [search, setSearch] = useState('');

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
                      <User size={16} className="text-slate-400" />
                      <span>ID: {layaway.sales?.customer_id || 'N/A'}</span>
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
                    <button className="text-primary-600 text-xs font-bold hover:underline">
                      Registrar Pago
                    </button>
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
    </div>
  );
};

export default Layaways;
