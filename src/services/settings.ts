import { supabase } from '../lib/supabase';
import { NotificationEmail, NotificationStatus } from '../types';

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

  async sendShiftClosingEmail(shiftId: string): Promise<NotificationStatus> {
    try {
      const { data, error } = await supabase.functions.invoke('send-shift-report', {
        body: { shiftId }
      });

      if (error) throw error;

      // Parsear whatsappResult si viene como string
      let whatsappResult = data?.whatsappResult;
      if (typeof whatsappResult === 'string') {
        try {
          whatsappResult = JSON.parse(whatsappResult);
        } catch (e) {
          console.warn('Error parsing whatsappResult:', e);
        }
      }

      return { 
        success: data?.success ?? true, 
        message: data?.message || 'Notificaciones procesadas',
        emailResult: data?.emailResult || data?.resendData,
        whatsappResult: whatsappResult,
        error: data?.error,
        detail: data?.detail
      };
    } catch (err: any) {
      console.error('Error sending shift email:', err);
      return { 
        success: false, 
        message: 'El turno se cerró pero no se pudo enviar el correo de notificación.',
        error: err.message
      };
    }
  }
};
