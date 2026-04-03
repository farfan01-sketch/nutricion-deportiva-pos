import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Check, X, AlertCircle } from 'lucide-react';
import { User, PermissionModule, PERMISSIONS_BY_MODULE, UserPermission } from '../../types';
import { permissionsService } from '../../services/permissions';
import { cn } from '../../lib/utils';

interface PermissionsFormProps {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

const PermissionsForm: React.FC<PermissionsFormProps> = ({ user, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<PermissionModule>('ventas');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const userPerms = await permissionsService.getPermissionsByUserId(user.id);
      const permsMap: Record<string, boolean> = {};
      
      // Inicializar todos los permisos posibles como false
      Object.keys(PERMISSIONS_BY_MODULE).forEach(module => {
        PERMISSIONS_BY_MODULE[module as PermissionModule].forEach(p => {
          permsMap[`${module}:${p.id}`] = false;
        });
      });

      // Marcar los que el usuario tiene habilitados
      userPerms.forEach(p => {
        if (p.enabled) {
          permsMap[`${p.module}:${p.permission}`] = true;
        }
      });

      setPermissions(permsMap);
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError('No se pudieron cargar los permisos');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const handleToggle = (module: PermissionModule, permissionId: string) => {
    const key = `${module}:${permissionId}`;
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const permissionsToUpdate = Object.entries(permissions).map(([key, enabled]) => {
        const [module, permission] = key.split(':');
        return {
          module: module as PermissionModule,
          permission,
          enabled
        };
      });

      await permissionsService.updatePermissions(user.id, permissionsToUpdate);
      onSave();
    } catch (err) {
      console.error('Error saving permissions:', err);
      setError('Error al guardar los permisos');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = (module: PermissionModule, select: boolean) => {
    const newPerms = { ...permissions };
    PERMISSIONS_BY_MODULE[module].forEach(p => {
      newPerms[`${module}:${p.id}`] = select;
    });
    setPermissions(newPerms);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Cargando permisos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
          <Shield size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Permisos de {user.name}</h3>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            Rol: {user.role === 'admin' ? 'Administrador' : 'Personal'}
          </p>
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-700">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-xs font-medium">
            Los administradores tienen acceso total al sistema. Los permisos granulares se aplican principalmente a usuarios con rol "Personal".
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {(Object.keys(PERMISSIONS_BY_MODULE) as PermissionModule[]).map(module => (
          <button
            key={module}
            onClick={() => setActiveTab(module)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === module 
                ? "bg-primary-600 text-white shadow-lg shadow-primary-100" 
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {module}
          </button>
        ))}
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
            Módulo: {activeTab}
          </h4>
          <div className="flex gap-2">
            <button 
              onClick={() => handleSelectAll(activeTab, true)}
              className="text-[10px] font-bold text-primary-600 hover:underline uppercase"
            >
              Marcar Todo
            </button>
            <span className="text-slate-300">|</span>
            <button 
              onClick={() => handleSelectAll(activeTab, false)}
              className="text-[10px] font-bold text-slate-400 hover:underline uppercase"
            >
              Desmarcar Todo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PERMISSIONS_BY_MODULE[activeTab].map(p => {
            const isEnabled = permissions[`${activeTab}:${p.id}`];
            return (
              <label
                key={p.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all group",
                  isEnabled 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                )}
              >
                <span className="text-sm font-medium">{p.label}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isEnabled}
                    onChange={() => handleToggle(activeTab, p.id)}
                  />
                  <div className={cn(
                    "w-10 h-6 rounded-full transition-colors flex items-center px-1",
                    isEnabled ? "bg-emerald-500" : "bg-slate-200"
                  )}>
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                      isEnabled ? "translate-x-4" : "translate-x-0"
                    )} />
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-100">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Guardando...
            </>
          ) : (
            <>
              <Check size={20} />
              Guardar Permisos
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PermissionsForm;
