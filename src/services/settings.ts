import { supabase } from '../lib/supabase';
import { NotificationEmail } from '../types';

export const settingsService = {
  async getNotificationEmails(): Promise<NotificationEmail[]> {
    const { data, error } = await supabase
      .from('notification_emails')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addNotificationEmail(email: string, name?: string): Promise<NotificationEmail> {
    const { data, error } = await supabase
      .from('notification_emails')
      .insert([{ email, name, enabled: true }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateNotificationEmail(id: string, updates: Partial<NotificationEmail>): Promise<NotificationEmail> {
    const { data, error } = await supabase
      .from('notification_emails')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteNotificationEmail(id: string): Promise<void> {
    const { error } = await supabase
      .from('notification_emails')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async sendShiftClosingEmail(shiftId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Aquí llamaríamos a una Edge Function de Supabase
      // La función se encargaría de:
      // 1. Obtener los datos del turno (shiftId)
      // 2. Obtener los correos activos de notification_emails
      // 3. Generar el HTML del reporte
      // 4. Enviar vía Resend/SendGrid
      
      const { error } = await supabase.functions.invoke('send-shift-report', {
        body: { shiftId }
      });

      if (error) throw error;
      return { success: true, message: 'Correo enviado correctamente' };
    } catch (err: any) {
      console.error('Error sending shift email:', err);
      return { 
        success: false, 
        message: 'El turno se cerró pero no se pudo enviar el correo de notificación.' 
      };
    }
  }
};
