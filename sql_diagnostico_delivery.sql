-- =====================================================
-- DIAGNÓSTICO DE PROBLEMAS DELIVERY
-- =====================================================
-- Este script ayuda a diagnosticar problemas específicos
-- con pedidos delivery, chat y descuentos

-- =====================================================
-- 1. VERIFICAR PEDIDOS DELIVERY Y SUS ESTADOS
-- =====================================================
SELECT 
  p.id as pedido_id,
  p.estado,
  p.tipo_pedido,
  p."idDelivery" as idDelivery,
  p.direccion_entrega,
  CASE 
    WHEN p.latitud IS NULL OR p.longitud IS NULL THEN '❌ Sin coordenadas'
    ELSE '✅ Con coordenadas'
  END as coordenadas,
  u_delivery.email as delivery_email,
  u_cliente.email as cliente_email,
  p.created_at,
  p.updated_at
FROM pedidos p
LEFT JOIN usuarios u_delivery ON u_delivery.auth_id = p."idDelivery"
LEFT JOIN usuarios u_cliente ON u_cliente.auth_id = p."idCliente"
WHERE p.tipo_pedido = 'delivery'
ORDER BY p.created_at DESC
LIMIT 10;

-- =====================================================
-- 2. VERIFICAR CHAT ROOMS DE DELIVERY
-- =====================================================
-- NOTA: Si cr.tipo_pedido no existe, esta consulta fallará
-- Primero verificar si existe la columna
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_rooms' 
      AND column_name = 'tipo_pedido'
    )
    THEN '✅ Columna tipo_pedido existe'
    ELSE '❌ Columna tipo_pedido NO existe - Ejecutar sql_agregar_tipo_pedido_chat_rooms.sql'
  END as estado_columna;

-- Si la columna existe, mostrar chat rooms de delivery
-- Si no existe, mostrar todos los chat rooms con delivery_uid
SELECT 
  cr.id as room_id,
  cr.pedido_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_rooms' 
      AND column_name = 'tipo_pedido'
    )
    THEN cr.tipo_pedido
    ELSE CASE WHEN cr."delivery_uid" IS NOT NULL THEN 'delivery (inferido)' ELSE 'mesa (inferido)' END
  END as tipo_pedido,
  cr."delivery_uid" as delivery_uid,
  cr.cliente_uid,
  u_delivery.email as delivery_email,
  u_cliente.email as cliente_email,
  COUNT(cm.id) as cantidad_mensajes,
  MAX(cm.created_at) as ultimo_mensaje
FROM chat_rooms cr
LEFT JOIN usuarios u_delivery ON u_delivery.auth_id = cr."delivery_uid"
LEFT JOIN usuarios u_cliente ON u_cliente.auth_id = cr.cliente_uid
LEFT JOIN chat_messages cm ON cm.room_id = cr.id
WHERE cr."delivery_uid" IS NOT NULL
GROUP BY cr.id, cr.pedido_id, cr."delivery_uid", cr.cliente_uid, u_delivery.email, u_cliente.email
ORDER BY MAX(cm.created_at) DESC NULLS LAST
LIMIT 10;

-- =====================================================
-- 3. VERIFICAR DESCUENTOS APLICADOS
-- =====================================================
-- Verificar si la tabla existe primero
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'pedidos_descuentos'
    )
    THEN '✅ Tabla pedidos_descuentos existe'
    ELSE '❌ Tabla pedidos_descuentos NO existe - Ejecutar sql_crear_pedidos_descuentos.sql'
  END as estado_tabla;

-- Si la tabla existe, mostrar descuentos
-- Si no existe, mostrar descuentos desde la tabla pedidos (legacy)
SELECT 
  p.id as pedido_id,
  p.tipo_pedido,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'pedidos_descuentos'
    )
    THEN pd.descuento_pct
    ELSE p.descuento_pct
  END as descuento_pct,
  p.juego_premio_reclamado,
  p."idDelivery" as pedido_idDelivery,
  u_delivery.email as delivery_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'pedidos_descuentos'
    )
    THEN pd.created_at
    ELSE p.updated_at
  END as fecha_descuento
FROM pedidos p
LEFT JOIN usuarios u_delivery ON u_delivery.auth_id = p."idDelivery"
LEFT JOIN pedidos_descuentos pd ON pd.pedido_id = p.id
WHERE p.tipo_pedido = 'delivery'
  AND (
    (p.descuento_pct > 0 OR p.juego_premio_reclamado = true)
    OR (pd.id IS NOT NULL)
  )
ORDER BY 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'pedidos_descuentos'
    )
    THEN pd.created_at
    ELSE p.updated_at
  END DESC NULLS LAST
LIMIT 10;

-- =====================================================
-- 4. VERIFICAR USUARIOS DELIVERY
-- =====================================================
SELECT 
  u.auth_id,
  u.email,
  u.perfil,
  u.nombres,
  u.apellidos,
  COUNT(DISTINCT p.id) as pedidos_asignados,
  COUNT(DISTINCT CASE WHEN p.estado = 'asignado a delivery' THEN p.id END) as pendientes_confirmar,
  COUNT(DISTINCT CASE WHEN p.estado = 'confirmado por delivery' THEN p.id END) as en_camino,
  COUNT(DISTINCT CASE WHEN p.estado = 'entregado' THEN p.id END) as entregados
FROM usuarios u
LEFT JOIN pedidos p ON p."idDelivery" = u.auth_id AND p.tipo_pedido = 'delivery'
WHERE u.perfil = 'delivery'
GROUP BY u.auth_id, u.email, u.perfil, u.nombres, u.apellidos;

-- =====================================================
-- 5. VERIFICAR PROBLEMAS COMUNES
-- =====================================================

-- Pedidos delivery sin idDelivery asignado
SELECT 
  '❌ Pedidos delivery sin repartidor asignado' as problema,
  COUNT(*) as cantidad
FROM pedidos
WHERE tipo_pedido = 'delivery'
  AND estado IN ('asignado a delivery', 'confirmado por delivery', 'en camino', 'listo para entregar')
  AND "idDelivery" IS NULL;

-- Pedidos delivery sin coordenadas
SELECT 
  '❌ Pedidos delivery sin coordenadas' as problema,
  COUNT(*) as cantidad
FROM pedidos
WHERE tipo_pedido = 'delivery'
  AND (latitud IS NULL OR longitud IS NULL);

-- Chat rooms sin delivery_uid
-- Verificar si existe tipo_pedido primero
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_rooms' 
      AND column_name = 'tipo_pedido'
    )
    THEN '❌ Chat rooms delivery sin delivery_uid (con tipo_pedido)'
    ELSE '❌ Chat rooms con delivery_uid NULL (sin columna tipo_pedido)'
  END as problema,
  COUNT(*) as cantidad
FROM chat_rooms
WHERE 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_rooms' 
      AND column_name = 'tipo_pedido'
    )
    THEN tipo_pedido = 'delivery' AND "delivery_uid" IS NULL
    ELSE "delivery_uid" IS NULL
  END;

-- Pedidos con idDelivery que no existe en usuarios
SELECT 
  '❌ Pedidos con idDelivery inexistente o perfil incorrecto' as problema,
  COUNT(*) as cantidad,
  STRING_AGG(p.id::TEXT, ', ') as pedidos_ids
FROM pedidos p
WHERE p.tipo_pedido = 'delivery'
  AND p."idDelivery" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.auth_id = p."idDelivery" 
    AND u.perfil::TEXT = 'delivery'
  );

-- =====================================================
-- 6. VERIFICAR FUNCIÓN RPC claim_game_discount
-- =====================================================
SELECT 
  p.proname as nombre_funcion,
  pg_get_function_arguments(p.oid) as argumentos,
  pg_get_function_result(p.oid) as tipo_retorno,
  CASE 
    WHEN p.proname = 'claim_game_discount' THEN '✅ Función existe'
    ELSE '❌ Función NO existe'
  END as estado
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'claim_game_discount';

