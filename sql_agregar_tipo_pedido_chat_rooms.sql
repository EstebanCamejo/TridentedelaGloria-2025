-- =====================================================
-- AGREGAR COLUMNA tipo_pedido A chat_rooms
-- =====================================================
-- Esta columna diferencia entre chats de mesa y delivery
-- Es crítica para el funcionamiento del chat delivery

-- Agregar columna tipo_pedido si no existe
ALTER TABLE public.chat_rooms
ADD COLUMN IF NOT EXISTS tipo_pedido TEXT NOT NULL DEFAULT 'mesa';

-- Agregar constraint para validar valores
ALTER TABLE public.chat_rooms
DROP CONSTRAINT IF EXISTS check_chat_rooms_tipo_pedido;

ALTER TABLE public.chat_rooms
ADD CONSTRAINT check_chat_rooms_tipo_pedido
CHECK (tipo_pedido IN ('mesa', 'delivery'));

-- Actualizar chats existentes que tienen delivery_uid pero no tienen tipo_pedido correcto
-- Si un chat tiene delivery_uid, debe ser tipo 'delivery'
UPDATE public.chat_rooms
SET tipo_pedido = 'delivery'
WHERE delivery_uid IS NOT NULL
  AND tipo_pedido = 'mesa';

-- Crear índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_chat_rooms_tipo_pedido 
  ON public.chat_rooms(tipo_pedido);

-- Crear índice para delivery_uid (si no existe)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_delivery_uid 
  ON public.chat_rooms(delivery_uid);

-- Comentarios para documentación
COMMENT ON COLUMN public.chat_rooms.tipo_pedido IS 'Tipo de pedido: mesa o delivery';

-- Verificar que se agregó correctamente
SELECT 
  'COLUMNA tipo_pedido en chat_rooms' as tipo,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_rooms' 
      AND column_name = 'tipo_pedido'
    )
    THEN '✅ AGREGADA EXITOSAMENTE'
    ELSE '❌ ERROR AL AGREGAR'
  END as estado;

-- Mostrar estructura actualizada de chat_rooms
SELECT 
  column_name as columna,
  data_type as tipo_dato,
  is_nullable as nullable,
  column_default as valor_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_rooms'
  AND column_name IN ('id', 'pedido_id', 'cliente_uid', 'delivery_uid', 'tipo_pedido', 'mesa_num')
ORDER BY column_name;

-- Verificar índices
SELECT 
  indexname as nombre_indice,
  indexdef as definicion
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'chat_rooms'
  AND indexname IN ('idx_chat_rooms_tipo_pedido', 'idx_chat_rooms_delivery_uid');

