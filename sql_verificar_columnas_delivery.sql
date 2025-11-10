-- =====================================================
-- VERIFICACIÓN: Columnas delivery en tabla pedidos
-- =====================================================
-- Ejecutar este SQL en Supabase SQL Editor para verificar
-- si las columnas existen

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'pedidos' 
  AND column_name IN ('tipo_pedido', 'idDelivery', 'direccion_entrega', 'latitud', 'longitud')
ORDER BY column_name;

-- Si alguna columna NO aparece, ejecutar: sql_migration_fase1_delivery.sql

