import React, { useState, useEffect } from 'react';
import { Monitor, LogOut, Search } from 'lucide-react';
import { registerService } from '../services/registers';
import { CashRegister } from '../types';

interface RegisterSelectionProps {
  onSelect: (register: CashRegister) => void;
  onLogout: () => void;
}

const RegisterSelection: React.FC<RegisterSelectionProps> = ({ onSelect, onLogout }) => {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadRegisters = async () => {
      try {
        const data = await registerService.getActive();
        setRegisters(data);
      } catch (err) {
        console.error('Error loading registers:', err);
      } finally {
        setLoading(false);
      }
    };
    loadRegisters();
  }, []);

  const filteredRegisters = registers.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 bg-primary-600 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Seleccionar Caja</h1>
              <p className="text-primary-100 mt-1">Elige la terminal desde la que vas a operar</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              title="Cerrar Sesión"
            >
              <LogOut size={24} />
            </button>
          </div>

          <div className="p-8">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar caja por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium">Cargando cajas...</p>
              </div>
            ) : filteredRegisters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRegisters.map((register) => (
                  <button
                    key={register.id}
                    onClick={() => onSelect(register)}
                    className="flex items-center gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <Monitor size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{register.name}</h3>
                      <p className="text-sm text-slate-500">{register.code}</p>
                      {register.location && (
                        <p className="text-xs text-slate-400 mt-1">{register.location}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Monitor size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No se encontraron cajas</h3>
                <p className="text-slate-500">Intenta con otro término de búsqueda</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-slate-500 text-xs mt-8">
          &copy; 2026 Nutrición Deportiva. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default RegisterSelection;
