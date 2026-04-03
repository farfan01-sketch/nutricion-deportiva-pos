-- Tabla de permisos de usuarios
CREATE TABLE IF NOT EXISTS users_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    permission TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module, permission)
);

-- Habilitar RLS
ALTER TABLE users_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Permitir lectura a todos los usuarios autenticados" 
ON users_permissions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir gestión total a administradores" 
ON users_permissions FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_permissions_updated_at
    BEFORE UPDATE ON users_permissions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
