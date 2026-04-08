import { useState, useEffect, useCallback } from 'react';
import { permissionsService } from '../services/permissions';
import { UserPermission, PermissionModule, User } from '../types';

export const usePermissions = (user: User | null) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await permissionsService.getPermissionsByUserId(user.id);
      setPermissions(data);
    } catch (err) {
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback((module: PermissionModule, permission: string): boolean => {
    // Los administradores tienen todos los permisos por defecto
    if (user?.role === 'admin') return true;
    
    const perm = permissions.find(p => p.module === module && p.permission === permission);
    return perm ? perm.enabled : false;
  }, [permissions, user]);

  const getPermissionsByModule = useCallback((module: PermissionModule): UserPermission[] => {
    return permissions.filter(p => p.module === module);
  }, [permissions]);

  return {
    permissions,
    loading,
    hasPermission,
    getPermissionsByModule,
    refreshPermissions: loadPermissions
  };
};
