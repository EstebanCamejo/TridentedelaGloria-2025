-- =====================================================
-- Verificar constraint uniq_juego_premio_global en juego_sesiones
-- =====================================================

-- Ver estructura de la tabla juego_sesiones
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'juego_sesiones'
ORDER BY ordinal_position;

-- Ver constraints de la tabla
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'public.juego_sesiones'::regclass
ORDER BY conname;

-- Ver algunos registros para entender la estructura
SELECT * FROM juego_sesiones LIMIT 5;

