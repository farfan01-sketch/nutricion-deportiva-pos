import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Shield, 
  Mail, 
  User as UserIcon, 
  Key, 
  Trash2, 
  Edit2, 
  Search,
  CheckCircle2,
  Lock,
  UserCheck
} from 'lucide-react';
import { authService } from '../services/auth';
import { User } from '../types';
import Modal from '../components/Modal';
import PermissionsForm from '../components/users/PermissionsForm';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    password: '',
    role: 'staff',
    name: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await authService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await authService.updateUser(editingUser.id, formData);
      } else {
        await authService.createUser(formData as any);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'staff', name: '' });
      loadUsers();
    } catch (err) {
      alert('Error al guardar usuario');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      role: user.role,
      name: user.name
    });
    setIsModalOpen(true);
  };

  const handlePermissions = (user: User) => {
    setSelectedUserForPermissions(user);
    setIsPermissionsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      await authService.deleteUser(id);
      loadUsers();
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="text-primary-600" size={28} />
            Administración de Cajeros y Personal
          </h1>
          <p className="text-slate-500">Administra el personal y sus niveles de acceso granulares al sistema.</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ username: '', password: '', role: 'staff', name: '' });
            setIsModalOpen(true);
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary-200"
        >
          <UserPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o usuario..."
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
                <th className="px-6 py-4">Nombre / Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha Registro</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                      user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' : 'Personal'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                      <CheckCircle2 size={12} /> Activo
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handlePermissions(user)}
                        title="Gestionar Permisos"
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Lock size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(user)}
                        title="Editar Datos"
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        title="Eliminar Usuario"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Nombre Completo</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ej: Juan Pérez"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nombre de Usuario</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="usuario123"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Rol de Acceso</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                >
                  <option value="staff">Personal</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="••••••••"
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
              {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        title="Gestión de Permisos Granulares"
      >
        {selectedUserForPermissions && (
          <PermissionsForm 
            user={selectedUserForPermissions}
            onClose={() => setIsPermissionsModalOpen(false)}
            onSave={() => {
              setIsPermissionsModalOpen(false);
              loadUsers();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;
