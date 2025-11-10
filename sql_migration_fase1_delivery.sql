-- =====================================================
-- MIGRACIÓN FASE 1: DELIVERY - Campos en tabla pedidos
-- =====================================================
-- Aplicar este SQL en Supabase SQL Editor PASO A PASO
-- Fecha: 2025-01-XX
-- Descripción: Agrega campos necesarios para soportar pedidos delivery
-- =====================================================

-- =====================================================
-- PASO 1: Agregar campo tipo_pedido (mesa o delivery)
-- =====================================================
-- ✅ ESTE PASO YA LO EJECUTASTE - CONTINUAR CON PASO 2
-- ALTER TABLE pedidos
-- ADD COLUMN IF NOT EXISTS tipo_pedido TEXT DEFAULT 'mesa' NOT NULL;

-- =====================================================
-- PASO 2: Agregar constraint para tipo_pedido
-- =====================================================
-- Ejecutar este bloque completo:
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS check_tipo_pedido;

ALTER TABLE pedidos
ADD CONSTRAINT check_tipo_pedido 
CHECK (tipo_pedido IN ('mesa', 'delivery'));

-- =====================================================
-- PASO 3: Agregar campo idDelivery (UUID para asignar repartidor)
-- =====================================================
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS idDelivery UUID;

-- Agregar comentario explicativo (opcional)
COMMENT ON COLUMN pedidos.idDelivery IS 'UUID del usuario delivery asignado al pedido (referencia a usuarios.auth_id donde perfil = delivery)';

-- =====================================================
-- PASO 4: Agregar campo direccion_entrega
-- =====================================================
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS direccion_entrega TEXT;

-- Agregar comentario explicativo (opcional)
COMMENT ON COLUMN pedidos.direccion_entrega IS 'Dirección de entrega para pedidos delivery (obligatorio cuando tipo_pedido = delivery)';

-- =====================================================
-- PASO 5: Agregar campo latitud (coordenada geográfica)
-- =====================================================
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 8);

-- Agregar comentario explicativo (opcional)
COMMENT ON COLUMN pedidos.latitud IS 'Latitud de la dirección de entrega (coordenada del mapa)';

-- =====================================================
-- PASO 6: Agregar campo longitud (coordenada geográfica)
-- =====================================================
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS longitud NUMERIC(11, 8);

-- Agregar comentario explicativo (opcional)
COMMENT ON COLUMN pedidos.longitud IS 'Longitud de la dirección de entrega (coordenada del mapa)';

-- =====================================================
-- PASO 7: Agregar índice en idDelivery (opcional pero recomendado)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_idDelivery ON pedidos(idDelivery);

-- =====================================================
-- VERIFICACIÓN (opcional - ejecutar para verificar)
-- =====================================================
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable, 
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'pedidos' 
--   AND column_name IN ('tipo_pedido', 'idDelivery', 'direccion_entrega', 'latitud', 'longitud')
-- ORDER BY column_name;

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. Todos los campos nuevos son NULLABLE (excepto tipo_pedido que tiene default 'mesa')
--    Esto asegura compatibilidad con pedidos existentes
-- 2. idDelivery referencia a usuarios.auth_id (no a usuarios.id)
--    porque auth_id es UUID y es el identificador del usuario en auth
-- 3. Los estados nuevos ('asignado a delivery', 'confirmado por delivery', etc.)
--    no requieren cambios en BD ya que el campo 'estado' es TEXT
-- =====================================================
