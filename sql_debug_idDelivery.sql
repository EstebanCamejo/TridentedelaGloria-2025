-- =====================================================
-- DEBUG: Verificar estado de idDelivery
-- =====================================================
-- Ejecutar este script para diagnosticar el problema

-- 1. Verificar si la columna existe (buscar en diferentes formas)
SELECT 
  'Búsqueda exacta' as tipo,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos' 
  AND column_name = 'idDelivery';

-- 2. Verificar si existe con mayúsculas/minúsculas diferentes
SELECT 
  'Todas las columnas de pedidos' as tipo,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos' 
  AND LOWER(column_name) LIKE '%delivery%'
ORDER BY column_name;

-- 3. Verificar estructura completa de la tabla
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos'
ORDER BY ordinal_position;

-- 4. Verificar permisos del usuario actual
SELECT 
  current_user as usuario_actual,
  current_database() as base_datos_actual;

-- 5. Verificar si hay constraints relacionados
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'public.pedidos'::regclass
  AND conname LIKE '%delivery%';

