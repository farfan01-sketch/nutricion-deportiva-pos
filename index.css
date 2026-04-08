import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  History, 
  Receipt, 
  Wallet, 
  BarChart3, 
  UserCircle,
  LogOut,
  Clock,
  ShoppingBag
} from 'lucide-react';
import { User, PermissionModule } from '../types';
import { usePermissions } from '../hooks/usePermissions';

interface SidebarProps {
  user: User;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, currentView, onViewChange, onLogout }) => {
  const { hasPermission } = usePermissions(user);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'pos', label: 'Caja / POS', icon: ShoppingCart, roles: ['admin', 'staff'], module: 'ventas' as PermissionModule },
    { id: 'catalog-orders', label: 'Pedidos Web', icon: ShoppingBag, roles: ['admin', 'staff'], module: 'ventas' as PermissionModule },
    { id: 'sales-history', label: 'Historial', icon: History, roles: ['admin', 'staff'], module: 'ventas' as PermissionModule, permission: 'ver_historial_ventas' },
    { id: 'products', label: 'Productos', icon: Package, roles: ['admin', 'staff'], module: 'productos' as PermissionModule },
    { id: 'inventory', label: 'Inventario', icon: BarChart3, roles: ['admin', 'staff'], module: 'inventario' as PermissionModule },
    { id: 'customers', label: 'Clientes', icon: Users, roles: ['admin', 'staff'], module: 'clientes' as PermissionModule },
    { id: 'suppliers', label: 'Proveedores', icon: Truck, roles: ['admin'] },
    { id: 'layaways', label: 'Apartados', icon: Receipt, roles: ['admin', 'staff'], module: 'ventas' as PermissionModule },
    { id: 'expenses', label: 'Gastos', icon: Wallet, roles: ['admin', 'staff'], module: 'ventas' as PermissionModule },
    { id: 'shifts', label: 'Turnos', icon: Clock, roles: ['admin', 'staff'], module: 'sistema' as PermissionModule, permission: 'corte_turno_propio' },
    { id: 'reports', label: 'Reportes', icon: BarChart3, roles: ['admin', 'staff'], module: 'sistema' as PermissionModule, permission: 'ver_reportes' },
    { id: 'staff', label: 'Personal', icon: UserCircle, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => {
    // Primero verificar rol básico
    if (!item.roles.includes(user.role)) return false;
    
    // Si tiene módulo específico, verificar permisos
    if (item.module) {
      // Si tiene un permiso específico dentro del módulo
      if (item.permission) {
        return hasPermission(item.module, item.permission);
      }
      // Si no, solo verificar que tenga habilitado el módulo (al menos un permiso o acceso general)
      // Por simplicidad, si tiene el módulo definido, verificamos si tiene algún permiso habilitado en ese módulo
      // O simplemente permitimos si es admin o si tiene permisos en ese módulo.
      // En este sistema, hasPermission ya maneja el rol admin.
      // Para módulos enteros, podríamos agregar un permiso de "acceso_modulo" o similar, 
      // pero usaremos el primer permiso de la lista como proxy o simplemente permitiremos si tiene el módulo.
      return true; // Por ahora permitimos si el rol coincide, los permisos granulares van dentro de la página
    }
    
    return true;
  });

  return (
    <div className="w-64 bg-sidebar h-screen flex flex-col no-print">
      <div className="p-6">
        <h1 className="text-white text-xl font-bold flex items-center gap-2">
          <Package className="text-primary-400" />
          <span>ND POS v2</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">Nutrición Deportiva</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              currentView === item.id 
                ? 'bg-primary-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors text-sm font-medium"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
