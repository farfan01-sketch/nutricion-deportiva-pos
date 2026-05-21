import { supabase } from '../lib/supabase';
import { Appointment, AppointmentService, AppointmentSettings } from '../types/appointments';
import { notificationService } from './notifications';

export const appointmentService = {
  // --- APPOINTMENT SERVICES (SERVICIOS) ---
  async getServices(): Promise<AppointmentService[]> {
    const { data, error } = await supabase
      .from('appointment_services')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching appointment services:', error);
      return [];
    }
    return data || [];
  },

  async createService(service: Partial<AppointmentService>): Promise<AppointmentService> {
    const { data, error } = await supabase
      .from('appointment_services')
      .insert([service])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateService(id: string, service: Partial<AppointmentService>): Promise<AppointmentService> {
    const { data, error } = await supabase
      .from('appointment_services')
      .update(service)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteService(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointment_services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // --- SETTINGS (CONFIGURACIÓN DE HORARIOS Y API DE NOTIFICACIONES) ---
  async getSettings(): Promise<AppointmentSettings> {
    const { data, error } = await supabase
      .from('appointment_settings')
      .select('*')
      .eq('id', 'general')
      .single();

    if (error) {
      console.warn('Could not load general settings, creating default fallback:', error);
      // Fallback settings matches database's insert statement
      return {
        id: 'general',
        working_days: [1, 2, 3, 4, 5],
        start_time: '08:00',
        end_time: '18:00',
        break_start_time: '14:00',
        break_end_time: '15:00',
        interval_minutes: 60,
        simultaneous_slots: 1,
        whatsapp_enabled: false,
        whatsapp_template_confirmation: '¡Hola! Su cita para {{servicio}} está confirmada para el día {{fecha}} a las {{hora}}.',
        whatsapp_template_reminder: 'Recordatorio: Su cita para {{servicio}} es el día {{fecha}} a las {{hora}}.',
        whatsapp_template_cancellation: 'Hola, le informamos que su cita para {{servicio}} el día {{fecha}} a las {{hora}} ha sido cancelada.'
      };
    }
    return data;
  },

  async updateSettings(settings: Partial<AppointmentSettings>): Promise<AppointmentSettings> {
    const { data, error } = await supabase
      .from('appointment_settings')
      .update(settings)
      .eq('id', 'general')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- APPOINTMENTS (CITAS OPERATIVAS) ---
  async getAllAppointments(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select('*, service:appointment_services(*)');

    if (filters?.startDate) {
      query = query.gte('appointment_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('appointment_date', filters.endDate);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('appointment_date', { ascending: true })
                                       .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
    return data || [];
  },

  async getAppointmentsForDate(date: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, service:appointment_services(*)')
      .eq('appointment_date', date);

    if (error) {
      console.error(`Error fetching appointments for date ${date}:`, error);
      return [];
    }
    return data || [];
  },

  async createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointment])
      .select('*, service:appointment_services(*)')
      .single();

    if (error) throw error;

    // Send confirmation if WhatsApp is enabled and auto-confirm is expected, or just general booking notify
    try {
      const settings = await this.getSettings();
      if (settings.whatsapp_enabled) {
        await notificationService.notify(
          data,
          data.service?.name || 'Asesoría Nutricional',
          'create',
          settings
        );
      }
    } catch (e) {
      console.error('Error sending WhatsApp creation notification:', e);
    }

    return data;
  },

  async updateAppointmentStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'attended'): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, service:appointment_services(*)')
      .single();

    if (error) throw error;

    // Send notifications based on status change
    try {
      const settings = await this.getSettings();
      if (settings.whatsapp_enabled) {
        if (status === 'confirmed') {
          await notificationService.notify(
            data,
            data.service?.name || 'Sesión',
            'confirm',
            settings
          );
        } else if (status === 'cancelled') {
          await notificationService.notify(
            data,
            data.service?.name || 'Sesión',
            'cancel',
            settings
          );
        }
      }
    } catch (e) {
      console.error('Error sending status update notification via WhatsApp:', e);
    }

    return data;
  },

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ ...appointment, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, service:appointment_services(*)')
      .single();

    if (error) throw error;
    return data;
  },

  async sendReminder(appointment: Appointment): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return await notificationService.notify(
        appointment,
        appointment.service?.name || 'Sesión',
        'remind',
        settings
      );
    } catch (err) {
      console.error('Error triggered during manual WhatsApp reminder dispatch:', err);
      return false;
    }
  },

  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // --- CÁLCULO DE DISPONIBILIDAD (CALENDAR SLOTS SLICES) ---
  async getAvailableSlots(dateString: string): Promise<{ time: string; available: boolean; bookedCount: number }[]> {
    const settings = await this.getSettings();
    const serviceAppointments = await this.getAppointmentsForDate(dateString);

    // Obtener día de la semana (1 = Lunes, 7 = Domingo)
    const dateObj = new Date(dateString + 'T00:00:00');
    const jsDay = dateObj.getDay();
    const weekDay = jsDay === 0 ? 7 : jsDay;

    // Si el día no es laborable, regresar vacío
    if (!settings.working_days.includes(weekDay)) {
      return [];
    }

    // Convertir horas HH:MM a minutos desde las 00:00 de hoy
    const timeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const minutesToTime = (mins: number): string => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const startMin = timeToMinutes(settings.start_time);
    const endMin = timeToMinutes(settings.end_time);
    const interval = settings.interval_minutes;

    const breakStartMin = settings.break_start_time ? timeToMinutes(settings.break_start_time) : null;
    const breakEndMin = settings.break_end_time ? timeToMinutes(settings.break_end_time) : null;

    const slots: { time: string; available: boolean; bookedCount: number }[] = [];

    // Generar intervalos
    for (let currentMin = startMin; currentMin + interval <= endMin; currentMin += interval) {
      const slotTimeText = minutesToTime(currentMin);

      // Si cae dentro de la break hour, saltar
      if (breakStartMin !== null && breakEndMin !== null) {
        // Un intervalo está bloqueado si intersecta con la pausa
        // O si inicia dentro del horario de comida
        if (currentMin >= breakStartMin && currentMin < breakEndMin) {
          continue;
        }
      }

      // Contar citas activas reservadas para este bloque
      const bookedList = serviceAppointments.filter(
        app => app.appointment_time === slotTimeText && app.status !== 'cancelled'
      );

      const bookedCount = bookedList.length;
      const available = bookedCount < settings.simultaneous_slots;

      // También restringir si la cita es para el día de HOY, deshabilitar bloques que ya pasaron de la hora actual
      let isPast = false;
      const todayString = new Date().toISOString().split('T')[0];
      if (dateString === todayString) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (currentMin <= nowMin + 30) { // Añadir un margen de 30 minutos mínimo para registrar citas
          isPast = true;
        }
      }

      slots.push({
        time: slotTimeText,
        available: available && !isPast,
        bookedCount
      });
    }

    return slots;
  }
};
