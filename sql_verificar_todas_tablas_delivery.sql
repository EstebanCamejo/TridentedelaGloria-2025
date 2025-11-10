-- =====================================================
-- VERIFICACIÓN COMPLETA DE TABLAS Y COLUMNAS
-- Para el flujo de Delivery, Chat y Descuentos
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor
-- Este script verifica que TODAS las tablas y columnas
-- que usa el código de la aplicación existan en la BD

-- =====================================================
-- 1. TABLA: pedidos
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TABLA: pedidos ===';
END $$;

-- Verificar que la tabla existe
SELECT 
  'TABLA pedidos' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

-- Verificar columnas críticas
SELECT 
  column_name as columna,
  data_type as tipo_dato,
  is_nullable as nullable,
  column_default as valor_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos'
  AND column_name IN (
    'id',
    'idCliente',
    'estado',
    'tipo_pedido',
    'direccion_entrega',
    'latitud',
    'longitud',
    'idDelivery',
    'tiempo_estimado',
    'descuento_pct',
    'juego_premio_reclamado',
    'total',
    'created_at',
    'updated_at'
  )
ORDER BY column_name;

-- Verificar constraint check_tipo_pedido
SELECT 
  'CONSTRAINT check_tipo_pedido' as tipo,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.pedidos'::regclass 
      AND conname = 'check_tipo_pedido'
    )
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

-- =====================================================
-- 2. TABLA: usuarios
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TABLA: usuarios ===';
END $$;

SELECT 
  'TABLA usuarios' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

SELECT 
  column_name as columna,
  data_type as tipo_dato,
  is_nullable as nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name IN (
    'auth_id',
    'perfil',
    'email',
    'nombres',
    'apellidos'
  )
ORDER BY column_name;

-- Verificar que 'delivery' está en el ENUM rol_usuario
SELECT 
  'ENUM rol_usuario incluye delivery' as tipo,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'delivery' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'rol_usuario')
    )
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

-- =====================================================
-- 3. TABLA: chat_rooms
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TABLA: chat_rooms ===';
END $$;

SELECT 
  'TABLA chat_rooms' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_rooms')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

SELECT 
  column_name as columna,
  data_type as tipo_dato,
  is_nullable as nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_rooms'
  AND column_name IN (
    'id',
    'pedido_id',
    'cliente_uid',
    'delivery_uid',
    'tipo_pedido',
    'mesa_num'
  )
ORDER BY column_name;

-- Verificar índice de delivery_uid
SELECT 
  'ÍNDICE idx_chat_rooms_delivery_uid' as tipo,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'chat_rooms' 
      AND indexname = 'idx_chat_rooms_delivery_uid'
    )
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

-- =====================================================
-- 4. TABLA: chat_messages
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TABLA: chat_messages ===';
END $$;

SELECT 
  'TABLA chat_messages' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

SELECT 
  column_name as columna,
  data_type as tipo_dato,
  is_nullable as nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_messages'
  AND column_name IN (
    'id',
    'room_id',
    'from_uid',
    'text',
    'created_at'
  )
ORDER BY column_name;

-- =====================================================
-- 5. TABLA: pedidos_descuentos
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TABLA: pedidos_descuentos ===';
END $$;

SELECT 
  'TABLA pedidos_descuentos' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos_descuentos')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

SELECT 
  column_name as columna,
  data_type as tipo_dato,
  is_nullable as nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos_descuentos'
  AND column_name IN (
    'id',
    'pedido_id',
    'descuento_pct',
    'juego_id',
    'created_at'
  )
ORDER BY column_name;

-- =====================================================
-- 6. TABLA: pedidos_detalles
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TABLA: pedidos_detalles ===';
END $$;

SELECT 
  'TABLA pedidos_detalles' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos_detalles')
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

SELECT 
  column_name as columna,
  data_type as tipo_dato,
  is_nullable as nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos_detalles'
  AND column_name IN (
    'id',
    'idPedido',
    'cantidad',
    'precioUnitario',
    'producto_id'
  )
ORDER BY column_name;

-- =====================================================
-- 7. FUNCIÓN RPC: claim_game_discount
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO FUNCIÓN RPC: claim_game_discount ===';
END $$;

SELECT 
  'FUNCIÓN claim_game_discount' as tipo,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'claim_game_discount'
    )
    THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado;

-- =====================================================
-- 8. RESUMEN DE VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '=== RESUMEN DE VERIFICACIÓN ===';
  
  -- Contar tablas críticas
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('pedidos', 'usuarios', 'chat_rooms', 'chat_messages', 'pedidos_descuentos', 'pedidos_detalles');
  
  RAISE NOTICE 'Tablas críticas encontradas: % de 6', v_count;
  
  -- Verificar columnas críticas de pedidos
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pedidos'
    AND column_name IN ('idDelivery', 'tipo_pedido', 'direccion_entrega', 'latitud', 'longitud');
  
  RAISE NOTICE 'Columnas críticas de delivery en pedidos: % de 5', v_count;
  
  -- Verificar delivery_uid en chat_rooms
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'chat_rooms'
    AND column_name = 'delivery_uid';
  
  RAISE NOTICE 'Columna delivery_uid en chat_rooms: %', CASE WHEN v_count > 0 THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
  
END $$;

-- =====================================================
-- 9. VERIFICACIÓN DE CASO SENSITIVO (idDelivery)
-- =====================================================
-- PostgreSQL puede crear columnas en minúsculas si no se usan comillas
-- Verificar que idDelivery existe con el nombre correcto

SELECT 
  'VERIFICACIÓN idDelivery (case sensitive)' as tipo,
  column_name as nombre_columna,
  CASE 
    WHEN column_name = 'idDelivery' THEN '✅ CORRECTO (camelCase)'
    WHEN column_name = 'iddelivery' THEN '⚠️ INCORRECTO (minúsculas) - Necesita renombrar'
    ELSE '⚠️ NO ENCONTRADO'
  END as estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos'
  AND LOWER(column_name) = 'iddelivery';

