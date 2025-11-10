-- =====================================================
-- AGREGAR COLUMNA delivery_uid A chat_rooms
-- =====================================================
-- Esta columna es necesaria para los chats de delivery
-- Ejecutar en Supabase SQL Editor

-- Agregar columna delivery_uid (UUID para vincular con usuarios.auth_id del delivery)
ALTER TABLE chat_rooms
ADD COLUMN IF NOT EXISTS delivery_uid UUID;

-- Agregar comentario explicativo
COMMENT ON COLUMN chat_rooms.delivery_uid IS 'UUID del usuario delivery asignado al chat (referencia a usuarios.auth_id donde perfil = delivery). Solo aplica para chats de tipo delivery.';

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_chat_rooms_delivery_uid ON chat_rooms(delivery_uid);

-- Verificar que se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_rooms' 
  AND column_name = 'delivery_uid';

