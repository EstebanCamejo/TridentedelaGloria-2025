-- =====================================================
-- SCRIPT DE VERIFICACIÓN Y ACTUALIZACIÓN DE ESTRUCTURA
-- Tabla: pedidos
-- Columnas: estado_sector_cocina, estado_sector_bar
-- =====================================================
-- Este script verifica si las columnas necesarias existen
-- y las crea/modifica si es necesario para el nuevo flujo
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR ESTRUCTURA ACTUAL
-- =====================================================
-- Ejecuta esto primero para ver qué columnas existen

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos'
  AND column_name IN ('estado_sector_cocina', 'estado_sector_bar', 'tipo_pedido')
ORDER BY column_name;

-- =====================================================
-- PASO 2: CREAR COLUMNAS SI NO EXISTEN
-- =====================================================
-- ⚠️ IMPORTANTE: Ejecuta solo si las columnas NO existen
-- Verifica primero con el PASO 1

-- Crear columna estado_sector_cocina si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pedidos' 
      AND column_name = 'estado_sector_cocina'
  ) THEN
    ALTER TABLE pedidos 
    ADD COLUMN estado_sector_cocina TEXT NULL;
    
    COMMENT ON COLUMN pedidos.estado_sector_cocina IS 
    'Estado del sector cocina: NULL (no aceptado), "en preparación", "listo para entregar"';
    
    RAISE NOTICE '✅ Columna estado_sector_cocina creada';
  ELSE
    RAISE NOTICE 'ℹ️ Columna estado_sector_cocina ya existe';
  END IF;
END $$;

-- Crear columna estado_sector_bar si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pedidos' 
      AND column_name = 'estado_sector_bar'
  ) THEN
    ALTER TABLE pedidos 
    ADD COLUMN estado_sector_bar TEXT NULL;
    
    COMMENT ON COLUMN pedidos.estado_sector_bar IS 
    'Estado del sector bar: NULL (no aceptado), "en preparación", "listo para entregar"';
    
    RAISE NOTICE '✅ Columna estado_sector_bar creada';
  ELSE
    RAISE NOTICE 'ℹ️ Columna estado_sector_bar ya existe';
  END IF;
END $$;

-- Verificar que tipo_pedido existe (debería existir ya)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pedidos' 
      AND column_name = 'tipo_pedido'
  ) THEN
    ALTER TABLE pedidos 
    ADD COLUMN tipo_pedido TEXT NULL 
    DEFAULT 'mesa';
    
    COMMENT ON COLUMN pedidos.tipo_pedido IS 
    'Tipo de pedido: "mesa" o "delivery"';
    
    RAISE NOTICE '✅ Columna tipo_pedido creada';
  ELSE
    RAISE NOTICE 'ℹ️ Columna tipo_pedido ya existe';
  END IF;
END $$;

-- =====================================================
-- PASO 3: VERIFICAR VALORES ACTUALES
-- =====================================================
-- Ver cuántos pedidos tienen valores NULL vs valores establecidos

SELECT 
  'estado_sector_cocina' as columna,
  COUNT(*) FILTER (WHERE estado_sector_cocina IS NULL) as valores_null,
  COUNT(*) FILTER (WHERE estado_sector_cocina IS NOT NULL) as valores_no_null,
  COUNT(DISTINCT estado_sector_cocina) FILTER (WHERE estado_sector_cocina IS NOT NULL) as valores_distintos
FROM pedidos
UNION ALL
SELECT 
  'estado_sector_bar' as columna,
  COUNT(*) FILTER (WHERE estado_sector_bar IS NULL) as valores_null,
  COUNT(*) FILTER (WHERE estado_sector_bar IS NOT NULL) as valores_no_null,
  COUNT(DISTINCT estado_sector_bar) FILTER (WHERE estado_sector_bar IS NOT NULL) as valores_distintos
FROM pedidos;

-- Ver valores únicos de cada columna
SELECT 
  'estado_sector_cocina' as columna,
  estado_sector_cocina as valor,
  COUNT(*) as cantidad
FROM pedidos
WHERE estado_sector_cocina IS NOT NULL
GROUP BY estado_sector_cocina
UNION ALL
SELECT 
  'estado_sector_bar' as columna,
  estado_sector_bar as valor,
  COUNT(*) as cantidad
FROM pedidos
WHERE estado_sector_bar IS NOT NULL
GROUP BY estado_sector_bar
ORDER BY columna, cantidad DESC;

-- =====================================================
-- PASO 4: CREAR ÍNDICES PARA MEJORAR RENDIMIENTO (OPCIONAL)
-- =====================================================
-- Estos índices ayudan a acelerar las consultas que filtran por estas columnas

-- Índice para estado_sector_cocina
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_sector_cocina 
ON pedidos(estado_sector_cocina)
WHERE estado_sector_cocina IS NOT NULL;

-- Índice para estado_sector_bar
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_sector_bar 
ON pedidos(estado_sector_bar)
WHERE estado_sector_bar IS NOT NULL;

-- Índice compuesto para consultas que filtran por estado y estado_sector
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_sectores 
ON pedidos(estado, estado_sector_cocina, estado_sector_bar)
WHERE estado IN ('pedido en curso', 'en preparación', 'en preparación parcial', 'listo para entregar');

-- =====================================================
-- PASO 4.5: VERIFICAR ESTRUCTURA DE pedidos_detalles
-- =====================================================
-- Primero verifica los nombres de las columnas en pedidos_detalles
-- para asegurarte de usar los nombres correctos en el PASO 5

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos_detalles'
ORDER BY column_name;

-- =====================================================
-- PASO 5: VERIFICAR PEDIDOS QUE NECESITAN ACTUALIZACIÓN
-- =====================================================
-- Pedidos en estados que deberían tener estado_sector pero no lo tienen
-- ✅ Nombres de columnas confirmados: idProducto, idPedido (camelCase)

SELECT 
  id,
  estado,
  tipo_pedido,
  estado_sector_cocina,
  estado_sector_bar,
  created_at,
  CASE 
    WHEN estado IN ('en preparación', 'en preparación parcial', 'listo para entregar') 
         AND estado_sector_cocina IS NULL 
         AND EXISTS (
           SELECT 1 FROM pedidos_detalles pd
           JOIN menu m ON m.id = pd."idProducto"
           WHERE pd."idPedido" = pedidos.id AND m.tipo = 'plato'
         )
    THEN '⚠️ Tiene platos pero estado_sector_cocina es NULL'
    WHEN estado IN ('en preparación', 'en preparación parcial', 'listo para entregar') 
         AND estado_sector_bar IS NULL 
         AND EXISTS (
           SELECT 1 FROM pedidos_detalles pd
           JOIN menu m ON m.id = pd."idProducto"
           WHERE pd."idPedido" = pedidos.id AND m.tipo = 'bebida'
         )
    THEN '⚠️ Tiene bebidas pero estado_sector_bar es NULL'
    ELSE '✅ OK'
  END as observacion
FROM pedidos
WHERE estado IN ('en preparación', 'en preparación parcial', 'listo para entregar')
  AND (
    (estado_sector_cocina IS NULL AND EXISTS (
      SELECT 1 FROM pedidos_detalles pd
      JOIN menu m ON m.id = pd."idProducto"
      WHERE pd."idPedido" = pedidos.id AND m.tipo = 'plato'
    ))
    OR
    (estado_sector_bar IS NULL AND EXISTS (
      SELECT 1 FROM pedidos_detalles pd
      JOIN menu m ON m.id = pd."idProducto"
      WHERE pd."idPedido" = pedidos.id AND m.tipo = 'bebida'
    ))
  )
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- PASO 6: CORREGIR PEDIDOS INCONSISTENTES (OPCIONAL)
-- =====================================================
-- Si el PASO 5 encontró pedidos inconsistentes, puedes corregirlos aquí
-- ⚠️ IMPORTANTE: Revisa cada pedido antes de ejecutar la actualización

-- Opción 1: Corregir un pedido específico (ejemplo: pedido ID 238)
-- Si el pedido está en "en preparación parcial" pero estado_sector_cocina es NULL,
-- significa que cocina nunca aceptó el pedido. Opciones:

-- A) Si cocina DEBE aceptar el pedido ahora:
-- UPDATE pedidos 
-- SET estado_sector_cocina = 'en preparación'
-- WHERE id = 238 
--   AND estado = 'en preparación parcial' 
--   AND estado_sector_cocina IS NULL
--   AND EXISTS (
--     SELECT 1 FROM pedidos_detalles pd
--     JOIN menu m ON m.id = pd."idProducto"
--     WHERE pd."idPedido" = 238 AND m.tipo = 'plato'
--   );

-- B) Si el pedido debe volver a "pedido en curso" (revertir):
-- UPDATE pedidos 
-- SET estado = 'pedido en curso',
--     estado_sector_bar = NULL
-- WHERE id = 238 
--   AND estado = 'en preparación parcial' 
--   AND estado_sector_cocina IS NULL;

-- Opción 2: Corregir TODOS los pedidos inconsistentes automáticamente
-- ⚠️ CUIDADO: Esto actualizará todos los pedidos encontrados en el PASO 5
-- Revisa primero qué pedidos se van a actualizar ejecutando el PASO 5

-- Para pedidos en "en preparación parcial" con estado_sector_cocina NULL:
-- UPDATE pedidos 
-- SET estado_sector_cocina = 'en preparación'
-- WHERE estado = 'en preparación parcial' 
--   AND estado_sector_cocina IS NULL
--   AND EXISTS (
--     SELECT 1 FROM pedidos_detalles pd
--     JOIN menu m ON m.id = pd."idProducto"
--     WHERE pd."idPedido" = pedidos.id AND m.tipo = 'plato'
--   );

-- Para pedidos en "en preparación parcial" con estado_sector_bar NULL:
-- UPDATE pedidos 
-- SET estado_sector_bar = 'en preparación'
-- WHERE estado = 'en preparación parcial' 
--   AND estado_sector_bar IS NULL
--   AND EXISTS (
--     SELECT 1 FROM pedidos_detalles pd
--     JOIN menu m ON m.id = pd."idProducto"
--     WHERE pd."idPedido" = pedidos.id AND m.tipo = 'bebida'
--   );

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Las columnas deben ser NULL por defecto (no aceptadas aún)
-- 2. Los valores válidos son:
--    - NULL: Sector no aceptado aún
--    - 'en preparación': Sector aceptado y en preparación
--    - 'listo para entregar': Sector terminado y listo
-- 3. Para pedidos nuevos, estas columnas deben empezar como NULL
-- 4. Los índices mejoran el rendimiento de las consultas
-- 5. Si encuentras pedidos inconsistentes, usa el PASO 6 para corregirlos
-- =====================================================

