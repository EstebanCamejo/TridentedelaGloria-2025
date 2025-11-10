-- =====================================================
-- RENOMBRAR COLUMNA: iddelivery → idDelivery
-- =====================================================
-- PostgreSQL convierte automáticamente a minúsculas si no usas comillas
-- Este script renombra la columna para usar camelCase correctamente

-- Renombrar la columna de iddelivery a idDelivery (con comillas para preservar mayúsculas)
ALTER TABLE pedidos
RENAME COLUMN iddelivery TO "idDelivery";

-- Verificar que se renombró correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos' 
  AND column_name IN ('tipo_pedido', 'idDelivery', 'direccion_entrega', 'latitud', 'longitud')
ORDER BY column_name;

-- Si la verificación muestra "idDelivery" (con mayúscula D), entonces está correcto ✅

