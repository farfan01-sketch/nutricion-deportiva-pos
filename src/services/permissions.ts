import { supabase } from '../lib/supabase';
import { UserPermission, PermissionModule } from '../types';

export const permissionsService = {
  async getPermissionsByUserId(userId: string): Promise<UserPermission[]> {
    const { data, error } = await supabase
      .from('users_permissions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  async updatePermissions(userId: string, permissions: { module: PermissionModule; permission: string; enabled: boolean }[]) {
    const { error } = await supabase
      .from('users_permissions')
      .upsert(
        permissions.map(p => ({
          user_id: userId,
          module: p.module,
          permission: p.permission,
          enabled: p.enabled
        })),
        { onConflict: 'user_id,module,permission' }
      );

    if (error) {
      console.error('Error in updatePermissions:', error);
      throw new Error(error.message || 'Error al actualizar los permisos en la base de datos');
    }
  },

  async togglePermission(userId: string, module: PermissionModule, permission: string, enabled: boolean) {
    const { error } = await supabase
      .from('users_permissions')
      .upsert({
        user_id: userId,
        module,
        permission,
        enabled
      }, { onConflict: 'user_id,module,permission' });

    if (error) {
      console.error('Error in togglePermission:', error);
      throw new Error(error.message || 'Error al cambiar el permiso');
    }
  }
};
