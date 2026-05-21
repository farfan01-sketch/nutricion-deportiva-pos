import { supabase } from '../lib/supabase';
import { Appointment, AppointmentSettings } from '../types/appointments';

// Helper de Evolution API de WhatsApp que reutiliza la función Edge existente de Supabase
export const notificationService = {
  /**
   * Reemplaza variables en una plantilla de mensaje
   */
  interpolateTemplate(
    template: string,
    data: { clientName: string; clientPhone?: string; serviceName: string; date: string; time: string }
  ): string {
    return template
      .replace(/{{cliente}}/g, data.clientName)
      .replace(/{{telefono}}/g, data.clientPhone || '')
      .replace(/{{service}}/g, data.serviceName)
      .replace(/{{servicio}}/g, data.serviceName)
      .replace(/{{date}}/g, data.date)
      .replace(/{{fecha}}/g, data.date)
      .replace(/{{time}}/g, data.time)
      .replace(/{{hora}}/g, data.time)
      .replace(/{{client}}/g, data.clientName);
  },

  /**
   * Envía un mensaje de texto plano usando la Cloud/Edge Function send-order-whatsapp
   */
  async sendWhatsAppMessage(
    settings: AppointmentSettings,
    phoneNumber: string,
    messageText: string
  ): Promise<boolean> {
    if (!settings.whatsapp_enabled) {
      console.log('WhatsApp notifications are disabled by settings.');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-order-whatsapp', {
        body: {
          type: 'appointment_direct',
          clientPhone: phoneNumber,
          clientMessage: messageText
        }
      });

      if (error) {
        console.error('Error resorting to Edge Function for direct message:', error);
        return false;
      }

      console.log('Direct notification dispatched through Edge Function ✅', data);
      return data?.success ?? true;
    } catch (err) {
      console.error('Failed to dispatch direct notification to Edge Function:', err);
      return false;
    }
  },

  /**
   * Dispara una plantilla de WhatsApp específica para un evento de cita
   */
  async notify(
    appointment: Appointment,
    serviceName: string,
    type: 'create' | 'confirm' | 'cancel' | 'remind',
    settings: AppointmentSettings
  ): Promise<boolean> {
    if (!settings || !settings.whatsapp_enabled) return false;

    // Formatear fecha legible (DD/MM/YYYY)
    let formattedDate = appointment.appointment_date;
    try {
      const parts = appointment.appointment_date.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
      }
    } catch (_) {}

    const data = {
      clientName: appointment.client_name,
      clientPhone: appointment.client_phone,
      serviceName: serviceName,
      date: formattedDate,
      time: appointment.appointment_time,
    };

    let clientMessage = '';
    let adminMessage = '';

    if (type === 'create') {
      // 1. Al agendar, mensaje al cliente
      const clientTemplate = 'Hola {{cliente}}, recibimos tu solicitud de cita para {{servicio}} el día {{fecha}} a las {{hora}}. En breve confirmaremos tu cita. Nutrición Deportiva Istmo.';
      clientMessage = this.interpolateTemplate(clientTemplate, data);

      // 2. Al agendar, mensaje al administrador
      const adminTemplate = 'Nueva cita agendada: {{cliente}} - {{telefono}} - {{servicio}} - {{fecha}} {{hora}}.';
      adminMessage = this.interpolateTemplate(adminTemplate, data);
    } 
    else if (type === 'confirm') {
      // 3. Al confirmar, mensaje al cliente
      const confirmTemplate = settings.whatsapp_template_confirmation || 'Hola {{cliente}}, tu cita para {{servicio}} ha sido confirmada para el día {{fecha}} a las {{hora}}. Te esperamos en Nutrición Deportiva Istmo.';
      clientMessage = this.interpolateTemplate(confirmTemplate, data);
    } 
    else if (type === 'cancel') {
      // 4. Al cancelar
      const cancelTemplate = settings.whatsapp_template_cancellation || 'Hola {{cliente}}, le informamos que su cita para {{servicio}} el día {{fecha}} a las {{hora}} ha sido cancelada.';
      clientMessage = this.interpolateTemplate(cancelTemplate, data);
    } 
    else if (type === 'remind') {
      // 5. Recordatorio
      const remindTemplate = settings.whatsapp_template_reminder || 'Recordatorio: Su cita para {{servicio}} es el día {{fecha}} a las {{hora}}.';
      clientMessage = this.interpolateTemplate(remindTemplate, data);
    }

    try {
      console.log(`Sending WhatsApp (${type}) message through Edge Function. Client phone: ${appointment.client_phone}`);
      
      const { data: resData, error } = await supabase.functions.invoke('send-order-whatsapp', {
        body: {
          type: `appointment_${type}`,
          clientPhone: appointment.client_phone,
          clientMessage: clientMessage || undefined,
          adminMessage: adminMessage || undefined
        }
      });

      if (error) {
        console.error('Error invoking send-order-whatsapp for appointment event:', error);
        return false;
      }

      console.log('Notification sent successfully through Edge Function ✅', resData);
      return resData?.success ?? true;
    } catch (err) {
      console.error('Failed to dispatch notification to Edge Function:', err);
      return false;
    }
  }
};
