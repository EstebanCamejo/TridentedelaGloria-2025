-- =====================================================
-- FIX: Crear encuesta para delivery en tabla encuesta
-- =====================================================
-- PROBLEMA: encuesta_id '00000000-0000-0000-0000-000000000002' no existe
-- SOLUCIÓN: Insertar el registro de encuesta delivery

-- PASO 1: Verificar estructura de la tabla encuesta
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'encuesta'
ORDER BY ordinal_position;

-- PASO 2: Ver si ya existe el registro
SELECT * FROM encuesta
WHERE id = '00000000-0000-0000-0000-000000000002';

-- PASO 3: Ver un ejemplo de registro existente para entender la estructura
SELECT * FROM encuesta LIMIT 1;

-- PASO 4: Insertar encuesta delivery (solo si no existe)
-- Estructura: id (uuid), titulo (text NOT NULL), activa (boolean), created_at (timestamp)
INSERT INTO encuesta (
  id,
  titulo,
  activa,
  created_at
)
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Encuesta de Delivery',
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM encuesta WHERE id = '00000000-0000-0000-0000-000000000002'
);

-- PASO 5: Verificar que se creó correctamente
SELECT * FROM encuesta
WHERE id = '00000000-0000-0000-0000-000000000002';

