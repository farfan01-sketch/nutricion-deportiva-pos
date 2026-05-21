export interface AppointmentService {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at?: string;
}

export interface AppointmentSettings {
  id: string; // 'general'
  working_days: number[]; // [1, 2, 3, 4, 5] (1=Lunes, 7=Domingo o 0=Domingo dependiendo de JS/Postgres)
  start_time: string; // '08:00'
  end_time: string; // '18:00'
  break_start_time?: string; // '14:00'
  break_end_time?: string; // '15:00'
  interval_minutes: number; // 60
  simultaneous_slots: number; // 1
  whatsapp_enabled: boolean;
  evolution_api_url?: string;
  evolution_api_key?: string;
  evolution_api_instance?: string;
  whatsapp_template_confirmation?: string;
  whatsapp_template_reminder?: string;
  whatsapp_template_cancellation?: string;
}

export interface Appointment {
  id: string;
  service_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  appointment_date: string; // 'YYYY-MM-DD'
  appointment_time: string; // 'HH:MM'
  status: 'pending' | 'confirmed' | 'cancelled' | 'attended';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Joins
  service?: AppointmentService;
}
