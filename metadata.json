import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { User } from '../../types';

interface AdminGuardProps {
  user: User;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AdminGuard: React.FC<AdminGuardProps> = ({ user, children, fallback }) => {
  const isAdmin = user.role === 'admin';

  if (!isAdmin) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-6">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          No tienes permisos para acceder a este módulo. Esta sección está reservada exclusivamente para administradores.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
