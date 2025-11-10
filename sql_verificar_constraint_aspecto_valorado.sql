-- =====================================================
-- Verificar constraint chk_enc_resp_aspecto_valorado
-- =====================================================

-- Ver estructura de la tabla encuesta_respuesta
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'encuesta_respuesta'
  AND column_name = 'aspecto_valorado'
ORDER BY ordinal_position;

-- Ver constraints de la tabla encuesta_respuesta relacionados con aspecto_valorado
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'public.encuesta_respuesta'::regclass
  AND conname LIKE '%aspecto%'
ORDER BY conname;

-- Ver algunos registros para entender los valores permitidos
SELECT DISTINCT aspecto_valorado 
FROM encuesta_respuesta 
WHERE aspecto_valorado IS NOT NULL
ORDER BY aspecto_valorado;

