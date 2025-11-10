-- =====================================================
-- FIX: Crear encuesta COMPLETA para delivery
-- =====================================================
-- Incluye: encuesta, preguntas y opciones
-- Basado en la estructura de la encuesta de mesa

-- =====================================================
-- PASO 1: Crear el registro de encuesta
-- =====================================================
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

-- =====================================================
-- PASO 2: Crear preguntas para la encuesta de delivery
-- =====================================================
-- Pregunta 1: Limpieza (rating 1-5)
INSERT INTO encuesta_pregunta (
  id,
  encuesta_id,
  clave,
  tipo,
  texto,
  orden
)
SELECT 
  '00000000-0000-0000-0000-000000000201'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'limpieza',
  'rating',
  '¿Cómo calificás la limpieza y presentación del pedido?',
  '1'
WHERE NOT EXISTS (
  SELECT 1 FROM encuesta_pregunta WHERE id = '00000000-0000-0000-0000-000000000201'
);

-- Pregunta 2: Aspecto valorado (single choice)
INSERT INTO encuesta_pregunta (
  id,
  encuesta_id,
  clave,
  tipo,
  texto,
  orden
)
SELECT 
  '00000000-0000-0000-0000-000000000202'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'aspecto_valorado',
  'single',
  '¿Qué aspecto valoraste más del servicio de delivery?',
  '2'
WHERE NOT EXISTS (
  SELECT 1 FROM encuesta_pregunta WHERE id = '00000000-0000-0000-0000-000000000202'
);

-- Pregunta 3: Servicios adicionales (multiple choice)
INSERT INTO encuesta_pregunta (
  id,
  encuesta_id,
  clave,
  tipo,
  texto,
  orden
)
SELECT 
  '00000000-0000-0000-0000-000000000203'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'servicios_extra',
  'multi',
  '¿Qué servicios adicionales te gustaría que ofrezcamos?',
  '3'
WHERE NOT EXISTS (
  SELECT 1 FROM encuesta_pregunta WHERE id = '00000000-0000-0000-0000-000000000203'
);

-- =====================================================
-- PASO 3: Crear opciones para las preguntas
-- =====================================================

-- Opciones para Pregunta 1 (Limpieza - Rating 1-5)
INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000301'::uuid, '00000000-0000-0000-0000-000000000201'::uuid, '1', '1', '1'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000301');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000302'::uuid, '00000000-0000-0000-0000-000000000201'::uuid, '2', '2', '2'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000302');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000303'::uuid, '00000000-0000-0000-0000-000000000201'::uuid, '3', '3', '3'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000303');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000304'::uuid, '00000000-0000-0000-0000-000000000201'::uuid, '4', '4', '4'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000304');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000305'::uuid, '00000000-0000-0000-0000-000000000201'::uuid, '5', '5', '5'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000305');

-- Opciones para Pregunta 2 (Aspecto valorado - Single choice)
INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000306'::uuid, '00000000-0000-0000-0000-000000000202'::uuid, 'Puntualidad en la entrega', null, '1'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000306');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000307'::uuid, '00000000-0000-0000-0000-000000000202'::uuid, 'Calidad de la comida', null, '2'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000307');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000308'::uuid, '00000000-0000-0000-0000-000000000202'::uuid, 'Comunicación con el repartidor', null, '3'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000308');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000309'::uuid, '00000000-0000-0000-0000-000000000202'::uuid, 'Empaque adecuado', null, '4'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000309');

-- Opciones para Pregunta 3 (Servicios adicionales - Multiple choice)
INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000310'::uuid, '00000000-0000-0000-0000-000000000203'::uuid, 'Empaque adecuado', null, '1'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000310');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000311'::uuid, '00000000-0000-0000-0000-000000000203'::uuid, 'Comunicación con repartidor', null, '2'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000311');

INSERT INTO encuesta_opcion (id, pregunta_id, texto, valor, orden)
SELECT '00000000-0000-0000-0000-000000000312'::uuid, '00000000-0000-0000-0000-000000000203'::uuid, 'Puntualidad', null, '3'
WHERE NOT EXISTS (SELECT 1 FROM encuesta_opcion WHERE id = '00000000-0000-0000-0000-000000000312');

-- =====================================================
-- PASO 4: Verificar que todo se creó correctamente
-- =====================================================

-- Verificar encuesta
SELECT * FROM encuesta WHERE id = '00000000-0000-0000-0000-000000000002';

-- Verificar preguntas
SELECT * FROM encuesta_pregunta WHERE encuesta_id = '00000000-0000-0000-0000-000000000002' ORDER BY orden;

-- Verificar opciones
SELECT eo.* 
FROM encuesta_opcion eo
JOIN encuesta_pregunta ep ON eo.pregunta_id = ep.id
WHERE ep.encuesta_id = '00000000-0000-0000-0000-000000000002'
ORDER BY ep.orden, eo.orden;

