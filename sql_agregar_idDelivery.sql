-- =====================================================
-- AGREGAR SOLO LA COLUMNA idDelivery
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor
-- Si la columna ya existe, no dará error gracias a IF NOT EXISTS

-- PASO 3: Agregar campo idDelivery (UUID para asignar repartidor)
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS idDelivery UUID;

-- Agregar comentario explicativo
COMMENT ON COLUMN pedidos.idDelivery IS 'UUID del usuario delivery asignado al pedido (referencia a usuarios.auth_id donde perfil = delivery)';

-- Agregar índice para mejorar consultas (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_pedidos_idDelivery ON pedidos(idDelivery);

-- Verificar que se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'pedidos' 
  AND column_name = 'idDelivery';

