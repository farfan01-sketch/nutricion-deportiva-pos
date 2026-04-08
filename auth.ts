import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Download,
  DollarSign,
  RotateCcw,
  Receipt
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { reportService } from '../services/reports';
import { formatCurrency } from '../utils/format';

const Reports: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const [s, tp, pd] = await Promise.all([
        reportService.getDashboardStats(),
        reportService.getTopProducts(),
        reportService.getSalesProfit(thirtyDaysAgo.toISOString(), now.toISOString())
      ]);
      setStats(s);
      setTopProducts(tp);
      setProfitData(pd);
    } catch (err) {
      console.error(err);
    }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes y Estadísticas</h1>
          <p className="text-slate-500">Análisis detallado del rendimiento de tu negocio.</p>
        </div>
        <button className="bg-white text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all">
          <Download size={18} />
          Exportar PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas Brutas Hoy</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(stats?.sales_gross_today || 0)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <RotateCcw size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Devoluciones Hoy</p>
          <h3 className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(stats?.returns_today || 0)}</h3>
          {(stats?.returns_cash_today > 0 || stats?.returns_card_today > 0 || stats?.returns_transfer_today > 0) && (
            <div className="mt-2 pt-2 border-t border-slate-50 space-y-1">
              {stats?.returns_cash_today > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Efectivo:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(stats.returns_cash_today)}</span>
                </div>
              )}
              {stats?.returns_card_today > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Tarjeta:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(stats.returns_card_today)}</span>
                </div>
              )}
              {stats?.returns_transfer_today > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Transf:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(stats.returns_transfer_today)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Receipt size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonos Apartados Hoy</p>
          <h3 className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(stats?.layaway_payments_today || 0)}</h3>
          {(stats?.layaway_cash_today > 0 || stats?.layaway_card_today > 0 || stats?.layaway_transfer_today > 0) && (
            <div className="mt-2 pt-2 border-t border-slate-50 space-y-1">
              {stats?.layaway_cash_today > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Efectivo:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(stats.layaway_cash_today)}</span>
                </div>
              )}
              {stats?.layaway_card_today > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Tarjeta:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(stats.layaway_card_today)}</span>
                </div>
              )}
              {stats?.layaway_transfer_today > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Transf:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(stats.layaway_transfer_today)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas Netas Hoy</p>
          <h3 className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(stats?.sales_net_today || 0)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos Hoy</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(stats?.expenses_today || 0)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Performance Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary-500" />
              Rendimiento de Ventas
            </h3>
            <select className="text-xs font-bold text-slate-500 bg-slate-50 border-none rounded-lg focus:ring-0">
              <option>Últimos 7 días</option>
              <option>Este mes</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(profitData || []).slice(0, 7)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="created_at" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: '#94a3b8'}}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('es-MX', { weekday: 'short' })}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: '#94a3b8'}}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  formatter={(val: number) => [formatCurrency(val), 'Venta']}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <PieChart size={20} className="text-emerald-500" />
              Productos Más Vendidos
            </h3>
          </div>
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total_sold"
                  nameKey="name"
                >
                  {topProducts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="w-1/2 space-y-3">
              {(topProducts || []).slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">{p.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{p.total_sold} ud.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
