import { supabase } from '../lib/supabase';
import { User } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
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
      .single();

    if (error) throw error;
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
      .single();

    if (error) throw error;
    return data;
  },

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Si el usuario se está cambiando la contraseña a sí mismo
    if (currentUser && currentUser.id === id) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      // También actualizamos en la tabla pública si se usa para login manual
      await supabase.from('users').update({ password: newPassword }).eq('id', id);
    } else {
      // Si un admin cambia la contraseña de otro
      // Aquí lo ideal es una Edge Function. Por ahora intentamos actualizar la tabla pública
      // pero capturamos el error si falla por RLS.
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', id);
        
      if (error) {
        console.error('Error updating password in public table:', error);
        throw new Error('No se pudo actualizar la contraseña. Si el problema persiste, contacte a soporte para configurar la Edge Function de administración.');
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
