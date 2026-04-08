import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Truck, 
  Edit2, 
  Trash2,
  FileText
} from 'lucide-react';
import { supplierService } from '../services/suppliers';
import { Supplier } from '../types';
import Modal from '../components/Modal';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    contact: '',
    conditions: '',
    notes: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getAll();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, formData);
      } else {
        await supplierService.create(formData);
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
      setFormData({ name: '', contact: '', conditions: '', notes: '' });
      loadSuppliers();
    } catch (err) {
      alert('Error al guardar proveedor');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      conditions: supplier.conditions,
      notes: supplier.notes
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      await supplierService.delete(id);
      loadSuppliers();
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-slate-500">Gestiona tus contactos de suministro y compras.</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            setFormData({ name: '', contact: '', conditions: '', notes: '' });
            setIsModalOpen(true);
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary-200"
        >
          <Plus size={20} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Condiciones</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                        <Truck size={20} />
                      </div>
                      <span className="font-bold text-slate-900">{supplier.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{supplier.contact || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{supplier.conditions || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                    No se encontraron proveedores.
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
        title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Nombre del Proveedor</label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ej: Distribuidora Central"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Persona de Contacto</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({...formData, contact: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Condiciones</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={formData.conditions}
                  onChange={(e) => setFormData({...formData, conditions: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ej: Crédito 30 días"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Notas</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Información adicional..."
              />
            </div>
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
              {editingSupplier ? 'Actualizar' : 'Guardar Proveedor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Suppliers;
