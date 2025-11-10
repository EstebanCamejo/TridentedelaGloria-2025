-- ============================================
-- MIGRACIÓN SQL: ENCUESTAS PARA DELIVERY
-- ============================================
-- Este script agrega soporte para encuestas de pedidos delivery
-- ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Agregar campo pedido_id a encuesta_respuesta para vincular encuestas con pedidos delivery
-- Este campo permite verificar exactamente si un pedido delivery específico ya tiene encuesta

ALTER TABLE encuesta_respuesta
ADD COLUMN IF NOT EXISTS pedido_id INTEGER;

-- 2. Agregar foreign key constraint (opcional pero recomendado)
-- Esto asegura que pedido_id siempre referencia a un pedido válido
-- Primero eliminar el constraint si ya existe (para evitar errores en re-ejecución)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_encuesta_respuesta_pedido'
  ) THEN
    ALTER TABLE encuesta_respuesta 
    DROP CONSTRAINT fk_encuesta_respuesta_pedido;
  END IF;
END $$;

ALTER TABLE encuesta_respuesta
ADD CONSTRAINT fk_encuesta_respuesta_pedido 
FOREIGN KEY (pedido_id) 
REFERENCES pedidos(id) 
ON DELETE SET NULL;

-- 3. Crear índice para mejorar consultas de verificación de encuestas por pedido
CREATE INDEX IF NOT EXISTS idx_encuesta_respuesta_pedido_id 
ON encuesta_respuesta(pedido_id);

-- 4. Crear índice compuesto para verificación rápida de encuestas delivery
-- Útil para: WHERE encuesta_id = 'delivery_id' AND pedido_id = X
CREATE INDEX IF NOT EXISTS idx_encuesta_respuesta_delivery 
ON encuesta_respuesta(encuesta_id, pedido_id) 
WHERE pedido_id IS NOT NULL;

-- 5. Comentario en la columna para documentación
COMMENT ON COLUMN encuesta_respuesta.pedido_id IS 
'ID del pedido asociado (para pedidos delivery, permite verificar si ya se completó encuesta para ese pedido específico)';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecutar para verificar que la columna se agregó correctamente:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'encuesta_respuesta' AND column_name = 'pedido_id';

-- ============================================
-- NOTAS
-- ============================================
-- - El campo pedido_id es opcional (NULL) para mantener compatibilidad con encuestas existentes de mesa
-- - Para pedidos de mesa, pedido_id será NULL (se usa lista_espera_id)
-- - Para pedidos delivery, pedido_id contendrá el ID del pedido
-- - El índice compuesto mejora el rendimiento de la verificación en yaCompletoEncuestaDelivery()

