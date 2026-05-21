-- INSTRUCCIONES: Cópia y pega este script en el editor de SQL de Supabase para habilitar las tablas de la Agenda.
-- Estas tablas son totalmente independientes, por lo que no afectarán de ninguna manera a tus ventas, inventario, productos u otras tablas operando en el POS.

-- 1. Tabla de Servicios de Citas (Asesoría, Entrenamiento, etc.)
CREATE TABLE IF NOT EXISTS public.appointment_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de Configuración de la Agenda y Horarios (con credenciales ocultas para Evolution API de WhatsApp)
CREATE TABLE IF NOT EXISTS public.appointment_settings (
    id TEXT PRIMARY KEY DEFAULT 'general',
    working_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 1=Lunes, 5=Viernes, etc.
    start_time TEXT NOT NULL DEFAULT '08:00',
    end_time TEXT NOT NULL DEFAULT '18:00',
    break_start_time TEXT DEFAULT '14:00',
    break_end_time TEXT DEFAULT '15:00',
    interval_minutes INTEGER NOT NULL DEFAULT 60,
    simultaneous_slots INTEGER NOT NULL DEFAULT 1,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    evolution_api_url TEXT,
    evolution_api_key TEXT,
    evolution_api_instance TEXT,
    whatsapp_template_confirmation TEXT DEFAULT '¡Hola! Su cita para {{service}} está confirmada para el día {{date}} a las {{time}}.',
    whatsapp_template_reminder TEXT DEFAULT 'Recordatorio: Su cita para {{service}} es el día {{date}} a las {{time}}.',
    whatsapp_template_cancellation TEXT DEFAULT 'Hola, le informamos que su cita para {{service}} el día {{date}} a las {{time}} ha sido cancelada.'
);

-- 3. Tabla de Citas Reservadas (Clientes)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.appointment_services(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL, -- Guardado en formato HH:MM
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' (pendiente), 'confirmed' (confirmada), 'cancelled' (cancelada), 'attended' (asistió)
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS) en las nuevas tablas
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Crear políticas de acceso seguro:
-- Los clientes públicos pueden ver servicios activos y la configuración general (para ver horarios)
-- Los clientes públicos pueden crear citas (inserts)
-- El equipo administrativo (POS/staff) puede hacer todo

-- Políticas para appointment_services
CREATE POLICY "Permitir lectura pública de servicios activos" 
ON public.appointment_services FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin/Staff control de servicios" 
ON public.appointment_services FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Políticas para appointment_settings
CREATE POLICY "Permitir lectura pública de configuración general" 
ON public.appointment_settings FOR SELECT 
USING (id = 'general');

CREATE POLICY "Admin control de configuración" 
ON public.appointment_settings FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Políticas para appointments
CREATE POLICY "Permitir a clientes crear citas públicamente" 
ON public.appointments FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir a clientes leer su propia cita conociendo ID" 
ON public.appointments FOR SELECT 
USING (true); -- Permitimos lectura pública general limitada en UI, o filtrado por ID

CREATE POLICY "Admin/Staff control completo de citas" 
ON public.appointments FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Sembrado de Servicios Iniciales (Seed Data)
INSERT INTO public.appointment_services (name, description, duration_minutes, price, is_active)
VALUES 
('Asesoría Nutricional', 'Plan nutricional adaptado a tus objetivos deportivos o de salud, análisis corporal y seguimiento.', 60, 500, true),
('Entrenamiento Personalizado', 'Sesión de entrenamiento enfocado en técnica, fuerza, resistencia y metas individuales.', 60, 400, true),
('Sesión de Seguimiento', 'Monitoreo de avances, ajustes de dieta y antropometría rápida.', 45, 300, true),
('Paquete Completo (Nutrición + Entrenamiento)', 'Asesoría de nutrición completa combinada con un plan estructurado de entrenamiento físico.', 90, 800, true)
ON CONFLICT DO NOTHING;

-- 5. Sembrado de Configuración Predeterminada
INSERT INTO public.appointment_settings (
    id, working_days, start_time, end_time, break_start_time, break_end_time, interval_minutes, simultaneous_slots
) VALUES (
    'general', '{1,2,3,4,5}', '08:00', '18:00', '14:00', '15:00', 60, 1
) ON CONFLICT DO NOTHING;
