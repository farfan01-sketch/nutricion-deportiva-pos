import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Receipt, 
  DollarSign,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { reportService } from '../services/reports';
import { saleService } from '../services/sales';
import { DashboardStats, Sale, LowStockProduct } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, rs, ls] = await Promise.all([
          reportService.getDashboardStats(),
          saleService.getRecentSales(5),
          reportService.getLowStock()
        ]);
        setStats(s);
        setRecentSales(rs);
        setLowStock(ls);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="p-8">Cargando dashboard...</div>;

  const cards = [
    { label: 'Ventas Hoy', value: stats?.sales_today || 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Gastos Hoy', value: stats?.expenses_today || 0, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Utilidad Hoy', value: stats?.profit_today || 0, icon: DollarSign, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Stock Bajo', value: stats?.low_stock_count || 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', unit: 'items' },
    { label: 'Apartados', value: stats?.pending_layaways || 0, icon: Receipt, color: 'text-indigo-600', bg: 'bg-indigo-50', unit: 'pendientes' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resumen General</h1>
        <p className="text-slate-500">Bienvenido al panel de control de Nutrición Deportiva.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-xl flex items-center justify-center mb-4`}>
              <card.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {card.unit ? card.value : formatCurrency(card.value)}
              {card.unit && <span className="text-xs font-normal text-slate-400 ml-1">{card.unit}</span>}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sales */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Ventas Recientes</h3>
            <button className="text-primary-600 text-sm font-semibold flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight size={16} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentSales.map((sale) => (
              <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">#{sale.ticket_number || sale.id.slice(0, 8)}</p>
                    <p className="text-xs text-slate-500">{formatDate(sale.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(sale.total)}</p>
                  <p className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                    sale.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {sale.status}
                  </p>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No hay ventas registradas hoy.</div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Alertas de Inventario</h3>
            <button className="text-primary-600 text-sm font-semibold flex items-center gap-1 hover:underline">
              Inventario <ArrowRight size={16} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {lowStock.map((product) => (
              <div key={product.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.brand} • {product.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-600">{product.stock} en stock</p>
                  <p className="text-[10px] text-slate-400 uppercase">Mínimo: {product.stock_min}</p>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">Todo el inventario está en niveles óptimos.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
