-- =====================================================
-- FIX: Actualizar constraint chk_enc_resp_aspecto_valorado para incluir valores de delivery
-- =====================================================

-- PASO 1: Verificar constraint actual
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'public.encuesta_respuesta'::regclass
  AND conname LIKE '%aspecto%'
ORDER BY conname;

-- PASO 2: Eliminar constraint existente (si existe)
ALTER TABLE public.encuesta_respuesta 
DROP CONSTRAINT IF EXISTS chk_enc_resp_aspecto_valorado;

-- PASO 3: Crear nuevo constraint que incluye valores de mesa Y delivery
ALTER TABLE public.encuesta_respuesta
ADD CONSTRAINT chk_enc_resp_aspecto_valorado 
CHECK (
  aspecto_valorado IS NULL OR
  aspecto_valorado IN (
    -- Valores para mesa
    'atencion_personal',
    'calidad_comida',
    'tiempos_espera',
    'ambiente_musica',
    -- Valores para delivery
    'tiempo_entrega',
    'atencion_repartidor',
    'temperatura_comida'
    -- Nota: 'calidad_comida' está en ambos grupos, pero solo se lista una vez
  )
);

-- PASO 4: Verificar que se creó correctamente
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'public.encuesta_respuesta'::regclass
  AND conname = 'chk_enc_resp_aspecto_valorado';

