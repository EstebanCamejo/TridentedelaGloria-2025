-- =====================================================
-- FIX: Hacer mesa_num nullable en chat_rooms para delivery
-- =====================================================
-- PROBLEMA: mesa_num tiene constraint NOT NULL, pero delivery no tiene mesa
-- SOLUCIÓN: Hacer mesa_num nullable

-- PASO 1: Verificar constraint actual
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'public.chat_rooms'::regclass
  AND conname LIKE '%mesa_num%';

-- PASO 2: Eliminar constraint NOT NULL si existe
ALTER TABLE chat_rooms
ALTER COLUMN mesa_num DROP NOT NULL;

-- PASO 3: Verificar que se aplicó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_rooms' 
  AND column_name = 'mesa_num';

-- PASO 4: Actualizar registros existentes de delivery que puedan tener mesa_num incorrecto
UPDATE chat_rooms
SET mesa_num = NULL
WHERE tipo_pedido = 'delivery' AND mesa_num IS NOT NULL;

-- Verificar actualización
SELECT 
  id,
  pedido_id,
  tipo_pedido,
  mesa_num,
  delivery_uid
FROM chat_rooms
WHERE tipo_pedido = 'delivery'
LIMIT 5;

