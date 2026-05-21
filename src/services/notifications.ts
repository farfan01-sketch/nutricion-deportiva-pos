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
    _settings: AppointmentSettings | null | undefined,
    phoneNumber: string,
    messageText: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-order-whatsapp', {
        body: {
          type: 'appointment_direct',
          clientPhone: phoneNumber,
          clientMessage: messageText
        }
      });

      if (error) {
        console.error('Error invoking send-order-whatsapp for direct message:', error);
        throw new Error(error.message || JSON.stringify(error));
      }

      console.log('Direct notification dispatched through Edge Function ✅', data);
      if (data && data.success === false) {
        throw new Error(data.error || 'La función Edge devolvió un error al intentar enviar.');
      }
      return data?.success ?? true;
    } catch (err) {
      console.error('Failed to dispatch direct notification to Edge Function:', err);
      throw err;
    }
  },

  /**
   * Dispara una plantilla de WhatsApp específica para un evento de cita
   */
  async notify(
    appointment: Appointment,
    serviceName: string,
    type: 'create' | 'confirm' | 'cancel' | 'remind',
    settings?: AppointmentSettings | null
  ): Promise<boolean> {
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
      const confirmTemplate = settings?.whatsapp_template_confirmation || 'Hola {{cliente}}, tu cita para {{servicio}} ha sido confirmada para el día {{fecha}} a las {{hora}}. Te esperamos en Nutrición Deportiva Istmo.';
      clientMessage = this.interpolateTemplate(confirmTemplate, data);
    } 
    else if (type === 'cancel') {
      // 4. Al cancelar
      const cancelTemplate = settings?.whatsapp_template_cancellation || 'Hola {{cliente}}, le informamos que su cita para {{servicio}} el día {{fecha}} a las {{hora}} ha sido cancelada.';
      clientMessage = this.interpolateTemplate(cancelTemplate, data);
    } 
    else if (type === 'remind') {
      // 5. Recordatorio
      const remindTemplate = settings?.whatsapp_template_reminder || 'Recordatorio: Su cita para {{servicio}} es el día {{fecha}} a las {{hora}}.';
      clientMessage = this.interpolateTemplate(remindTemplate, data);
    }

    let payloadType = `appointment_${type}`;
    if (type === 'create') {
      payloadType = 'appointment_new';
    } else if (type === 'confirm') {
      payloadType = 'appointment_confirmed';
    } else if (type === 'remind') {
      payloadType = 'appointment_remind';
    } else if (type === 'cancel') {
      payloadType = 'appointment_cancelled';
    }

    try {
      console.log(`Sending WhatsApp (${payloadType}) message through Edge Function. Client phone: ${appointment.client_phone}`);
      
      const { data: resData, error } = await supabase.functions.invoke('send-order-whatsapp', {
        body: {
          type: payloadType,
          appointmentId: appointment.id,
          clientPhone: appointment.client_phone,
          clientName: appointment.client_name,
          serviceName: serviceName,
          appointmentDate: formattedDate,
          appointmentTime: appointment.appointment_time,
          clientMessage: clientMessage || undefined,
          adminMessage: adminMessage || undefined,
          notifyAdmin: type === 'create'
        }
      });

      if (error) {
        console.error('Error invoking send-order-whatsapp for appointment event:', error);
        throw new Error(error.message || JSON.stringify(error));
      }

      console.log('Notification response from Edge Function:', resData);
      
      if (!resData || resData.success === false) {
        let errMsg = resData?.error || '';
        if (resData?.clientDetails && !resData.clientDetails.ok) {
          const detail = typeof resData.clientDetails.data === 'object'
            ? JSON.stringify(resData.clientDetails.data)
            : resData.clientDetails.data || resData.clientDetails.error;
          errMsg += ` (WhatsApp Cliente: ${detail})`;
        }
        if (resData?.adminDetails && !resData.adminDetails.ok) {
          const detail = typeof resData.adminDetails.data === 'object'
            ? JSON.stringify(resData.adminDetails.data)
            : resData.adminDetails.data || resData.adminDetails.error;
          errMsg += ` (WhatsApp Administrador: ${detail})`;
        }
        if (!errMsg) {
          errMsg = 'Respuesta de función Edge indica fallo en el envío de WhatsApp.';
        }
        console.error('Edge Function failed to send message:', errMsg, resData);
        throw new Error(errMsg);
      }

      return true;
    } catch (err) {
      console.error('Failed to dispatch notification to Edge Function:', err);
      throw err;
    }
  }
};
