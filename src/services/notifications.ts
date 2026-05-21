import { Appointment, AppointmentSettings } from '../types/appointments';

// Helper de Evolution API de WhatsApp
export const notificationService = {
  /**
   * Reemplaza variables en una plantilla de mensaje
   */
  interpolateTemplate(
    template: string,
    data: { clientName: string; serviceName: string; date: string; time: string }
  ): string {
    return template
      .replace(/{{cliente}}/g, data.clientName)
      .replace(/{{service}}/g, data.serviceName)
      .replace(/{{date}}/g, data.date)
      .replace(/{{time}}/g, data.time)
      .replace(/{{client}}/g, data.clientName)
      .replace(/{{servicio}}/g, data.serviceName)
      .replace(/{{fecha}}/g, data.date)
      .replace(/{{hora}}/g, data.time);
  },

  /**
   * Envía un mensaje de texto plano usando la Evolution API de WhatsApp configurada
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

    const { evolution_api_url, evolution_api_key, evolution_api_instance } = settings;

    if (!evolution_api_url || !evolution_api_key || !evolution_api_instance) {
      console.warn('⚠️ Evolution API details are incomplete. URL:', evolution_api_url, 'Instance:', evolution_api_instance);
      return false;
    }

    try {
      // Limpiar el número telefónico para formato internacional
      // Por ejemplo, quitar caracteres y espacios, y garantizar que tenga código de país.
      let cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        // En México, agregar código de país 52 por defecto (521 + número para WhatsApp o 52)
        cleanPhone = '52' + cleanPhone;
      }

      // La url suele terminar en / o no. Corregir formato.
      const baseUrl = evolution_api_url.endsWith('/') ? evolution_api_url : evolution_api_url + '/';
      const endpoint = `${baseUrl}message/sendText/${evolution_api_instance}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolution_api_key,
        },
        body: JSON.stringify({
          number: cleanPhone,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: false,
          },
          text: messageText,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Error response from Evolution API:', errText);
        return false;
      }

      const resData = await response.json();
      console.log('Notification sent successfully through Evolution API ✅', resData);
      return true;
    } catch (err) {
      console.error('Failed to dispatch notification to Evolution API:', err);
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

    let template = '';
    switch (type) {
      case 'create':
        // Notificación de creación (pendiente por ahora o confirmada según prefiera el POS)
        template = settings.whatsapp_template_confirmation || '¡Hola! Su cita para {{service}} está confirmada para el día {{date}} a las {{time}}.';
        break;
      case 'confirm':
        template = settings.whatsapp_template_confirmation || '¡Hola! Su cita para {{service}} está confirmada para el día {{date}} a las {{time}}.';
        break;
      case 'cancel':
        template = settings.whatsapp_template_cancellation || 'Hola, le informamos que su cita para {{service}} el día {{date}} a las {{time}} ha sido cancelada.';
        break;
      case 'remind':
        template = settings.whatsapp_template_reminder || 'Recordatorio: Su cita para {{service}} es el día {{date}} a las {{time}}.';
        break;
    }

    if (!template) return false;

    // Formatear fecha legible
    let formattedDate = appointment.appointment_date;
    try {
      const parts = appointment.appointment_date.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
      }
    } catch (_) {}

    const message = this.interpolateTemplate(template, {
      clientName: appointment.client_name,
      serviceName: serviceName,
      date: formattedDate,
      time: appointment.appointment_time,
    });

    console.log(`Sending WhatsApp (${type}) message to ${appointment.client_phone}: ${message}`);
    return this.sendWhatsAppMessage(settings, appointment.client_phone, message);
  }
};
