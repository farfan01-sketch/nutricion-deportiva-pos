import React, { useState, useEffect } from 'react';
import { User } from './types';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import ShiftOpening from './pages/ShiftOpening';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Layaways from './pages/Layaways';
import Expenses from './pages/Expenses';
import Shifts from './pages/Shifts';
import Reports from './pages/Reports';
import UsersPage from './pages/UsersPage';
import SalesHistory from './pages/SalesHistory';
import PublicCatalog from './pages/PublicCatalog';
import CatalogOrders from './pages/CatalogOrders';
import { shiftService } from './services/shifts';
import LogoutWithShiftModal from './components/auth/LogoutWithShiftModal';
import AdminGuard from './components/auth/AdminGuard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [requiresShiftOpening, setRequiresShiftOpening] = useState(false);
  const [checkingShift, setCheckingShift] = useState(false);
  
  // Simple path-based routing for public catalog
  const isPublicCatalog = window.location.pathname === '/catalog' || window.location.pathname === '/catalogo';

  // Logout with shift states
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [openShiftForLogout, setOpenShiftForLogout] = useState<any>(null);

  const checkUserShift = async (userData: User) => {
    setCheckingShift(true);
    try {
      // Verificamos si el usuario ya tiene un turno abierto
      const openShift = await shiftService.getOpenShift(userData.id);
      
      if (openShift) {
        setRequiresShiftOpening(false);
      } else {
        // Aquí podrías agregar lógica para verificar si el rol/permisos requieren caja
        // Por ahora, asumimos que todos los usuarios (admin/staff) manejan caja
        setRequiresShiftOpening(true);
      }
    } catch (err) {
      console.error('Error checking shift status:', err);
      // En caso de error, por seguridad pedimos apertura si es staff
      setRequiresShiftOpening(userData.role === 'staff');
    } finally {
      setCheckingShift(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        checkUserShift(parsedUser);
      } catch (e) {
        localStorage.removeItem('pos_user');
      }
    }
    setIsAuthReady(true);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('pos_user', JSON.stringify(userData));
    checkUserShift(userData);
    setCurrentView(userData.role === 'admin' ? 'dashboard' : 'pos');
  };

  const handleLogoutClick = async () => {
    if (!user) return;
    
    setCheckingShift(true);
    try {
      const openShift = await shiftService.getOpenShift(user.id);
      if (openShift) {
        setOpenShiftForLogout(openShift);
        setIsLogoutModalOpen(true);
      } else {
        performLogout();
      }
    } catch (err) {
      console.error('Error checking shift before logout:', err);
      performLogout(); // Salir por seguridad si falla la verificación
    } finally {
      setCheckingShift(false);
    }
  };

  const performLogout = () => {
    setUser(null);
    setRequiresShiftOpening(false);
    setIsLogoutModalOpen(false);
    setOpenShiftForLogout(null);
    localStorage.removeItem('pos_user');
    setCurrentView('dashboard');
  };

  const handleShiftOpened = () => {
    setRequiresShiftOpening(false);
  };

  if (isPublicCatalog) {
    return <PublicCatalog />;
  }

  if (!isAuthReady || checkingShift) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <div className="text-slate-600 font-bold text-lg">Verificando sesión...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Interceptamos con la pantalla de apertura si es necesario
  if (requiresShiftOpening) {
    return <ShiftOpening user={user} onOpen={handleShiftOpened} onLogout={handleLogoutClick} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return (
        <AdminGuard user={user!}>
          <Dashboard />
        </AdminGuard>
      );
      case 'pos': return <POS user={user!} />;
      case 'sales-history': return <SalesHistory user={user} />;
      case 'products': return <Products user={user} />;
      case 'inventory': return <Inventory user={user} />;
      case 'customers': return <Customers />;
      case 'suppliers': return <Suppliers />;
      case 'layaways': return <Layaways user={user} />;
      case 'expenses': return <Expenses />;
      case 'shifts': return <Shifts user={user} />;
      case 'reports': return (
        <AdminGuard user={user!}>
          <Reports />
        </AdminGuard>
      );
      case 'staff': return (
        <AdminGuard user={user!}>
          <UsersPage />
        </AdminGuard>
      );
      case 'catalog-orders': return <CatalogOrders user={user!} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        user={user} 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLogout={handleLogoutClick} 
      />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>

      {user && openShiftForLogout && (
        <LogoutWithShiftModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          openShift={openShiftForLogout}
          onConfirmLogout={performLogout}
        />
      )}
    </div>
  );
};

export default App;
