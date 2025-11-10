-- =====================================================
-- Verificar estructura de la tabla encuesta
-- =====================================================

-- Ver todas las columnas de la tabla encuesta
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'encuesta'
ORDER BY ordinal_position;

-- Ver algunos registros existentes para entender la estructura
SELECT * FROM encuesta LIMIT 5;

