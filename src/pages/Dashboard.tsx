import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Receipt, 
  DollarSign,
  AlertTriangle,
  CreditCard,
  Wallet,
  ArrowUpRight,
  Clock,
  Users,
  ShoppingCart,
  RefreshCw,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { reportService } from '../services/reports';
import { shiftService } from '../services/shifts';
import { 
  DashboardStats, 
  WeeklyTrend, 
  TopProduct, 
  Shift,
  LowStockProduct
} from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<WeeklyTrend[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftTotals, setShiftTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [s, t, tp, ls, shift] = await Promise.all([
        reportService.getDashboardStats(),
        reportService.getWeeklyTrends(),
        reportService.getTopProducts(),
        reportService.getLowStock(),
        shiftService.getOpenShift()
      ]);

      setStats(s);
      setTrends(t);
      setTopProducts(tp.slice(0, 5));
      setLowStock(ls);
      setCurrentShift(shift);

      if (shift) {
        const totals = await shiftService.getShiftTotals(shift.id, shift.opened_at);
        setShiftTotals(totals);
      } else {
        setShiftTotals(null);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-slate-500 font-medium">Cargando dashboard profesional...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const paymentData = stats ? [
    { name: 'Efectivo', value: stats.sales_cash_today + stats.layaway_cash_today },
    { name: 'Tarjeta', value: stats.sales_card_today + stats.layaway_card_today },
    { name: 'Transferencia', value: stats.sales_transfer_today + stats.layaway_transfer_today },
  ].filter(item => item.value > 0) : [];

  const isShiftLong = currentShift && (new Date().getTime() - new Date(currentShift.opened_at).getTime()) > 12 * 60 * 60 * 1000;

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard de Negocio</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Calendar size={16} />
            {new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' }).format(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            disabled={refreshing}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className={cn(
            "px-4 py-2 rounded-xl flex items-center gap-2 border shadow-sm",
            currentShift 
              ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
              : "bg-amber-50 border-amber-100 text-amber-700"
          )}>
            <div className={cn("w-2 h-2 rounded-full animate-pulse", currentShift ? "bg-emerald-500" : "bg-amber-500")} />
            <span className="text-sm font-bold uppercase tracking-wider">
              {currentShift ? 'Turno Abierto' : 'Turno Cerrado'}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(lowStock.length > 0 || isShiftLong) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-amber-900">Alerta de Inventario</h4>
                <p className="text-sm text-amber-700">Hay {lowStock.length} productos con stock bajo el mínimo. Revisa el inventario pronto.</p>
              </div>
            </div>
          )}
          {isShiftLong && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="font-bold text-rose-900">Turno Prolongado</h4>
                <p className="text-sm text-rose-700">El turno actual lleva abierto más de 12 horas. Considera realizar un corte de caja.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          label="Ventas Brutas" 
          value={stats?.sales_gross_today || 0} 
          icon={TrendingUp} 
          color="emerald"
          subtext={`${stats?.tickets_today || 0} tickets hoy`}
        />
        <StatCard 
          label="Devoluciones" 
          value={stats?.returns_today || 0} 
          icon={TrendingDown} 
          color="rose"
          subtext="Impacto en ventas"
        />
        <StatCard 
          label="Ventas Netas" 
          value={stats?.sales_net_today || 0} 
          icon={ArrowUpRight} 
          color="blue"
          subtext="Brutas - Devoluciones"
        />
        <StatCard 
          label="Gastos" 
          value={stats?.expenses_today || 0} 
          icon={Wallet} 
          color="orange"
          subtext="Operativos hoy"
        />
        <StatCard 
          label="Abonos Apartados" 
          value={stats?.layaway_payments_today || 0} 
          icon={Receipt} 
          color="indigo"
          subtext="Ingresos por apartados"
        />
        <StatCard 
          label="Utilidad Est." 
          value={stats?.profit_today || 0} 
          icon={DollarSign} 
          color="primary"
          subtext="Margen bruto estimado"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Tendencia de Ventas (7 días)</h3>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-primary-500 rounded-full" /> Ventas
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-rose-500 rounded-full" /> Gastos
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [formatCurrency(val), '']}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg mb-6">Métodos de Pago</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {paymentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {paymentData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{item.name}</span>
                <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Caja del Turno Actual */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Caja del Turno Actual</h3>
            </div>
            {currentShift && (
              <span className="text-xs text-slate-500 font-medium">Abierto: {formatDate(currentShift.opened_at)}</span>
            )}
          </div>
          <div className="p-6">
            {currentShift ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <ShiftMetric label="Fondo Inicial" value={currentShift.opening_cash} />
                  <ShiftMetric label="Ventas Efectivo" value={shiftTotals?.cash_sales - shiftTotals?.layaway_cash_payments || 0} />
                  <ShiftMetric label="Abonos Efectivo" value={shiftTotals?.layaway_cash_payments || 0} />
                </div>
                <div className="space-y-4">
                  <ShiftMetric label="Devoluciones Efectivo" value={shiftTotals?.cash_returns || 0} color="rose" />
                  <ShiftMetric label="Gastos Efectivo" value={shiftTotals?.cash_expenses || 0} color="rose" />
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Efectivo Esperado</p>
                    <p className="text-2xl font-black text-primary-600">{formatCurrency(shiftTotals?.expected_cash || 0)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-400 italic">No hay un turno abierto actualmente.</p>
                <button className="mt-4 text-primary-600 font-bold hover:underline">Abrir turno ahora</button>
              </div>
            )}
          </div>
        </div>

        {/* Desglose por Método */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Desglose por Método (Hoy)</h3>
            </div>
          </div>
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-4">Método</th>
                  <th className="pb-4 text-right">Ventas</th>
                  <th className="pb-4 text-right">Abonos</th>
                  <th className="pb-4 text-right">Devol.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <MethodRow label="Efectivo" sales={stats?.sales_cash_today || 0} layaways={stats?.layaway_cash_today || 0} returns={stats?.returns_cash_today || 0} />
                <MethodRow label="Tarjeta" sales={stats?.sales_card_today || 0} layaways={stats?.layaway_card_today || 0} returns={stats?.returns_card_today || 0} />
                <MethodRow label="Transferencia" sales={stats?.sales_transfer_today || 0} layaways={stats?.layaway_transfer_today || 0} returns={stats?.returns_transfer_today || 0} />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Productos */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <Package size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Productos y Stock</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Valor Inventario</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(stats?.inventory_value || 0)}</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Top 5 Más Vendidos</h4>
              <div className="space-y-3">
                {topProducts.map((product, idx) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{product.name}</p>
                        <p className="text-[10px] text-slate-500">{product.brand}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary-600">{product.total_sold} u.</p>
                      <p className="text-[10px] text-slate-400">{formatCurrency(product.total_revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border border-primary-100">
              <div className="flex items-center gap-3">
                <Package className="text-primary-600" size={24} />
                <div>
                  <p className="text-sm font-bold text-primary-900">Total Productos</p>
                  <p className="text-xs text-primary-700">En catálogo activo</p>
                </div>
              </div>
              <p className="text-2xl font-black text-primary-600">{stats?.total_products || 0}</p>
            </div>
          </div>
        </div>

        {/* Apartados */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Receipt size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Control de Apartados</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Pendientes</p>
                <p className="text-3xl font-black text-indigo-600">{stats?.pending_layaways || 0}</p>
                <p className="text-xs text-indigo-700 mt-2 font-medium">Por cobrar: {formatCurrency(stats?.total_pending_amount || 0)}</p>
              </div>
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Liquidados Hoy</p>
                <p className="text-3xl font-black text-emerald-600">{stats?.layaways_completed_today || 0}</p>
                <p className="text-xs text-emerald-700 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Meta diaria: 5
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Métricas de Hoy</h4>
              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                    <Users size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Clientes Atendidos</span>
                </div>
                <span className="font-bold text-slate-900">{stats?.customers_today || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                    <ShoppingCart size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Tickets Emitidos</span>
                </div>
                <span className="font-bold text-slate-900">{stats?.tickets_today || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  icon: any;
  color: 'emerald' | 'rose' | 'blue' | 'orange' | 'indigo' | 'primary';
  subtext?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, subtext }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    primary: 'bg-primary-50 text-primary-600 border-primary-100',
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 border", colors[color])}>
        <Icon size={20} />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <h3 className="text-xl font-black text-slate-900 mt-1">{formatCurrency(value)}</h3>
      {subtext && <p className="text-[10px] text-slate-400 mt-1 font-medium italic">{subtext}</p>}
    </div>
  );
};

const ShiftMetric: React.FC<{ label: string; value: number; color?: 'primary' | 'rose' }> = ({ label, value, color = 'primary' }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    <p className={cn("text-lg font-bold", color === 'rose' ? 'text-rose-600' : 'text-slate-900')}>
      {formatCurrency(value)}
    </p>
  </div>
);

const MethodRow: React.FC<{ label: string; sales: number; layaways: number; returns: number }> = ({ label, sales, layaways, returns }) => (
  <tr className="hover:bg-slate-50 transition-colors">
    <td className="py-3 text-sm font-bold text-slate-700">{label}</td>
    <td className="py-3 text-sm text-right font-medium text-slate-900">{formatCurrency(sales)}</td>
    <td className="py-3 text-sm text-right font-medium text-indigo-600">{formatCurrency(layaways)}</td>
    <td className="py-3 text-sm text-right font-medium text-rose-600">{formatCurrency(returns)}</td>
  </tr>
);

export default Dashboard;
