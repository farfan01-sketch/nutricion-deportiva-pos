import { supabase } from '../lib/supabase';
import { User } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error('Credenciales inválidas');
    }

    return data as User;
  },

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createUser(user: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error('No se pudo crear el registro del usuario en la tabla pública.');
    }
    return data;
  },

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    // No enviamos el password en la actualización de perfil
    const { password, ...profileData } = user;
    
    const { data, error } = await supabase
      .from('users')
      .update(profileData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '42501') {
        throw new Error('No tienes permisos para actualizar este usuario (Error de RLS).');
      }
      throw error;
    }

    if (!data) {
      throw new Error(`No se encontró el registro del usuario en la tabla pública (ID: ${id}). Es posible que el registro no exista o no tengas permisos para modificarlo.`);
    }

    return data;
  },

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Si el usuario se está cambiando la contraseña a sí mismo
    if (currentUser && currentUser.id === id) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      // También actualizamos en la tabla pública si se usa para login manual
      const { error: dbError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', id);
        
      if (dbError) console.error('Error sincronizando password en tabla pública:', dbError);
    } else {
      // Si un admin cambia la contraseña de otro
      // Intentamos actualizar la tabla pública (requiere que el admin tenga permisos de escritura)
      const { data, error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', id)
        .select();
        
      if (error) {
        console.error('Error updating password in public table:', error);
        throw new Error('Error de base de datos al actualizar la contraseña. Verifique los permisos de administrador.');
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar la contraseña: El usuario no existe en la tabla pública.');
      }
    }
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
