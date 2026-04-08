import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  MapPin,
  Hash
} from 'lucide-react';
import { registerService } from '../services/registers';
import { CashRegister } from '../types';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast';

const Registers: React.FC = () => {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);
  const [formData, setFormData] = useState<Partial<CashRegister>>({
    name: '',
    code: '',
    location: '',
    is_active: true
  });

  useEffect(() => {
    loadRegisters();
  }, []);

  const loadRegisters = async () => {
    try {
      const data = await registerService.getAll();
      setRegisters(data);
    } catch (err) {
      toast.error('Error al cargar cajas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (register?: CashRegister) => {
    if (register) {
      setEditingRegister(register);
      setFormData({
        name: register.name,
        code: register.code,
        location: register.location || '',
        is_active: register.is_active
      });
    } else {
      setEditingRegister(null);
      setFormData({
        name: '',
        code: '',
        location: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRegister) {
        await registerService.update(editingRegister.id, formData);
        toast.success('Caja actualizada correctamente');
      } else {
        await registerService.create(formData);
        toast.success('Caja creada correctamente');
      }
      setIsModalOpen(false);
      loadRegisters();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar caja');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta caja? Esta acción no se puede deshacer si hay transacciones vinculadas.')) {
      try {
        await registerService.delete(id);
        toast.success('Caja eliminada correctamente');
        loadRegisters();
      } catch (err: any) {
        toast.error('No se puede eliminar la caja porque tiene transacciones asociadas. Intenta desactivarla en su lugar.');
      }
    }
  };

  const toggleStatus = async (register: CashRegister) => {
    try {
      await registerService.update(register.id, { is_active: !register.is_active });
      toast.success(`Caja ${register.is_active ? 'desactivada' : 'activada'} correctamente`);
      loadRegisters();
    } catch (err) {
      toast.error('Error al cambiar estado');
    }
  };

  const filteredRegisters = registers.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Cajas</h1>
          <p className="text-slate-500">Administra las terminales de punto de venta del sistema.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary-200"
        >
          <Plus size={20} />
          Nueva Caja
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nombre / Código</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha Registro</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="w-8 h-8 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredRegisters.map((register) => (
                <tr key={register.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${register.is_active ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Monitor size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{register.name}</p>
                        <p className="text-xs text-slate-500">{register.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-sm">{register.location || 'No especificada'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(register)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                        register.is_active 
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {register.is_active ? (
                        <><CheckCircle2 size={12} /> Activa</>
                      ) : (
                        <><XCircle size={12} /> Inactiva</>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{new Date(register.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(register)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(register.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredRegisters.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                    No se encontraron cajas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRegister ? 'Editar Caja' : 'Nueva Caja'}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nombre de la Caja</label>
              <div className="relative">
                <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ej: Caja Gym"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Código / Identificador</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ej: CAJA-01"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Ubicación (Opcional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ej: Planta Alta, Mostrador Principal..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
              Esta caja está activa y disponible para operar
            </label>
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
              className="flex-1 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
            >
              {editingRegister ? 'Actualizar Caja' : 'Crear Caja'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Registers;
