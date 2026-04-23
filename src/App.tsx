import React, { useState, useEffect } from 'react';
import { User, CashRegister } from './types';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import RegisterSelection from './pages/RegisterSelection';
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
import Registers from './pages/Registers';
import Settings from './pages/Settings';
import SalesHistory from './pages/SalesHistory';
import PublicCatalog from './pages/PublicCatalog';
import CatalogOrders from './pages/CatalogOrders';
import { shiftService } from './services/shifts';
import LogoutWithShiftModal from './components/auth/LogoutWithShiftModal';
import AdminGuard from './components/auth/AdminGuard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [requiresRegisterSelection, setRequiresRegisterSelection] = useState(false);
  const [requiresShiftOpening, setRequiresShiftOpening] = useState(false);
  const [checkingShift, setCheckingShift] = useState(false);
  
  // Path and Hostname based routing
  const hostname = window.location.hostname;
  const path = window.location.pathname;

  // Root domains that should default to the store/catalog
  const STORE_DOMAINS = ['nutriciondeportivaistmo.com', 'www.nutriciondeportivaistmo.com'];
  
  // Logic to determine if we should show the public catalog
  const isPublicCatalog = 
    path === '/catalog' || 
    path === '/catalogo' || 
    (STORE_DOMAINS.includes(hostname) && path === '/');

  // Logout with shift states
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [openShiftForLogout, setOpenShiftForLogout] = useState<any>(null);

  const checkUserShift = async (userData: User, registerData: CashRegister) => {
    setCheckingShift(true);
    try {
      // Verificamos si el usuario ya tiene un turno abierto en esta caja
      const openShift = await shiftService.getOpenShift(userData.id, registerData.id);
      
      if (openShift) {
        setRequiresShiftOpening(false);
      } else {
        setRequiresShiftOpening(true);
      }
    } catch (err) {
      console.error('Error checking shift status:', err);
      setRequiresShiftOpening(true);
    } finally {
      setCheckingShift(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('pos_user');
    const savedRegister = localStorage.getItem('pos_register');
    
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        if (savedRegister) {
          const parsedRegister = JSON.parse(savedRegister);
          setSelectedRegister(parsedRegister);
          checkUserShift(parsedUser, parsedRegister);
        } else {
          setRequiresRegisterSelection(true);
        }
      } catch (e) {
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_register');
      }
    }
    setIsAuthReady(true);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('pos_user', JSON.stringify(userData));
    setRequiresRegisterSelection(true);
    setCurrentView(userData.role === 'admin' ? 'dashboard' : 'pos');
  };

  const handleRegisterSelect = (registerData: CashRegister) => {
    setSelectedRegister(registerData);
    localStorage.setItem('pos_register', JSON.stringify(registerData));
    setRequiresRegisterSelection(false);
    if (user) {
      checkUserShift(user, registerData);
    }
  };

  const handleLogoutClick = async () => {
    if (!user || !selectedRegister) {
      performLogout();
      return;
    }
    
    setCheckingShift(true);
    try {
      const openShift = await shiftService.getOpenShift(user.id, selectedRegister.id);
      if (openShift) {
        setOpenShiftForLogout(openShift);
        setIsLogoutModalOpen(true);
      } else {
        performLogout();
      }
    } catch (err) {
      console.error('Error checking shift before logout:', err);
      performLogout();
    } finally {
      setCheckingShift(false);
    }
  };

  const performLogout = () => {
    setUser(null);
    setSelectedRegister(null);
    setRequiresRegisterSelection(false);
    setRequiresShiftOpening(false);
    setIsLogoutModalOpen(false);
    setOpenShiftForLogout(null);
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_register');
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

  if (requiresRegisterSelection) {
    return <RegisterSelection onSelect={handleRegisterSelect} onLogout={performLogout} />;
  }

  // Interceptamos con la pantalla de apertura si es necesario
  if (requiresShiftOpening) {
    return <ShiftOpening user={user} register={selectedRegister!} onOpen={handleShiftOpened} onLogout={handleLogoutClick} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return (
        <AdminGuard user={user!}>
          <Dashboard user={user!} register={selectedRegister!} />
        </AdminGuard>
      );
      case 'pos': return <POS user={user!} register={selectedRegister!} />;
      case 'sales-history': return <SalesHistory user={user!} register={selectedRegister!} />;
      case 'products': return <Products user={user!} />;
      case 'inventory': return <Inventory user={user!} />;
      case 'customers': return <Customers />;
      case 'suppliers': return <Suppliers />;
      case 'layaways': return <Layaways user={user!} register={selectedRegister!} />;
      case 'expenses': return <Expenses register={selectedRegister!} />;
      case 'shifts': return <Shifts user={user!} register={selectedRegister!} />;
      case 'registers': return (
        <AdminGuard user={user!}>
          <Registers />
        </AdminGuard>
      );
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
      case 'settings': return (
        <AdminGuard user={user!}>
          <Settings />
        </AdminGuard>
      );
      case 'catalog-orders': return <CatalogOrders user={user!} register={selectedRegister!} />;
      default: return <Dashboard user={user!} register={selectedRegister!} />;
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
