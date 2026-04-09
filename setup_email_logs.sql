-- Tabla para historial de envíos de correos de corte
CREATE TABLE IF NOT EXISTS shift_email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    recipients TEXT[] NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'error'
    error_message TEXT,
    resend_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE shift_email_logs ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden ver los logs
CREATE POLICY "Admins gestionan logs de correos" 
ON shift_email_logs FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);
