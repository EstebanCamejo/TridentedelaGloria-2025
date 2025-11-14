-- =====================================================
-- COMANDOS SQL PARA IDENTIFICAR CLIENTES QUE DEBEN PEDIR LA CUENTA
-- =====================================================
-- Estos comandos ayudan a identificar qué clientes tienen pedidos
-- que están listos para solicitar la cuenta
-- =====================================================

-- =====================================================
-- CONSULTA 1: CLIENTES EN MESA QUE DEBEN PEDIR LA CUENTA
-- =====================================================
-- Identifica clientes en mesa con pedidos entregados o listos
-- que aún NO han solicitado la cuenta (no tienen estado 'pendiente confirmacion pago')
-- =====================================================

SELECT 
  u.id as cliente_id,
  u.auth_id,
  u.email,
  u.nombres || ' ' || u.apellidos as cliente_nombre,
  le.numero_mesa,
  m.numero as mesa_numero,
  p.id as pedido_id,
  p.estado as estado_pedido,
  p.tipo_pedido,
  p.total,
  p.subtotal,
  p.propina_monto,
  p.created_at as fecha_pedido,
  CASE 
    WHEN p.estado = 'entregado' THEN '✅ PEDIDO ENTREGADO - Puede pedir cuenta'
    WHEN p.estado = 'listo para entregar' THEN '🍽️ PEDIDO LISTO - Puede pedir cuenta después de recibirlo'
    WHEN p.estado = 'en preparación' THEN '⏳ EN PREPARACIÓN - Esperando que esté listo'
    WHEN p.estado = 'pendiente' THEN '⏸️ PENDIENTE - Esperando confirmación del mozo'
    ELSE '❓ ESTADO: ' || p.estado
  END as estado_descripcion,
  COUNT(pd.id) as cantidad_productos,
  SUM(pd.cantidad * pd.precioUnitario) as total_calculado
FROM usuarios u
JOIN lista_espera le ON le.usuario_id = u.id AND le.estado = 'asignado'
JOIN mesas m ON m.id = le.mesa_id
JOIN pedidos p ON p.idCliente = u.id 
  AND (p.tipo_pedido = 'mesa' OR p.tipo_pedido IS NULL)
  AND p.estado IN ('entregado', 'listo para entregar', 'en preparación', 'pendiente')
  AND p.estado != 'pendiente confirmacion pago'  -- Excluir los que ya pidieron cuenta
LEFT JOIN pedidos_detalles pd ON pd.idPedido = p.id
WHERE u.perfil = 'cliente'
GROUP BY 
  u.id, u.auth_id, u.email, u.nombres, u.apellidos,
  le.numero_mesa, m.numero, p.id, p.estado, p.tipo_pedido,
  p.total, p.subtotal, p.propina_monto, p.created_at
ORDER BY 
  CASE p.estado
    WHEN 'entregado' THEN 1
    WHEN 'listo para entregar' THEN 2
    WHEN 'en preparación' THEN 3
    WHEN 'pendiente' THEN 4
    ELSE 5
  END,
  p.created_at DESC;

-- =====================================================
-- CONSULTA 2: CLIENTES CON DELIVERY QUE DEBEN PEDIR LA CUENTA
-- =====================================================
-- Identifica clientes con pedidos delivery entregados o listos
-- que aún NO han solicitado la cuenta
-- =====================================================

SELECT 
  u.id as cliente_id,
  u.auth_id,
  u.email,
  u.nombres || ' ' || u.apellidos as cliente_nombre,
  p.id as pedido_id,
  p.estado as estado_pedido,
  p.tipo_pedido,
  p.total,
  p.subtotal,
  p.propina_monto,
  p.direccion_entrega,
  p.created_at as fecha_pedido,
  CASE 
    WHEN p.estado = 'entregado' THEN '✅ PEDIDO ENTREGADO - Puede pedir cuenta'
    WHEN p.estado = 'listo para entregar' THEN '🍽️ PEDIDO LISTO - Puede pedir cuenta después de recibirlo'
    WHEN p.estado = 'confirmado por delivery' THEN '🚚 REPARTIDOR EN CAMINO - Esperando entrega'
    WHEN p.estado = 'asignado a delivery' THEN '📦 ASIGNADO A REPARTIDOR - Esperando confirmación'
    WHEN p.estado = 'en preparación' THEN '⏳ EN PREPARACIÓN - Esperando que esté listo'
    WHEN p.estado = 'pedido en curso' THEN '✅ PEDIDO CONFIRMADO - En preparación'
    WHEN p.estado = 'pendiente' THEN '⏸️ PENDIENTE - Esperando confirmación del admin'
    ELSE '❓ ESTADO: ' || p.estado
  END as estado_descripcion,
  COUNT(pd.id) as cantidad_productos,
  SUM(pd.cantidad * pd.precioUnitario) as total_calculado,
  d.nombres || ' ' || d.apellidos as repartidor_nombre,
  d.email as repartidor_email
FROM usuarios u
JOIN pedidos p ON p.idCliente = u.id 
  AND p.tipo_pedido = 'delivery'
  AND p.estado IN ('entregado', 'listo para entregar', 'confirmado por delivery', 'asignado a delivery', 'en preparación', 'pedido en curso', 'pendiente')
  AND p.estado != 'pendiente confirmacion pago'  -- Excluir los que ya pidieron cuenta
LEFT JOIN pedidos_detalles pd ON pd.idPedido = p.id
LEFT JOIN usuarios d ON d.id = (SELECT id FROM usuarios WHERE auth_id = p.idDelivery LIMIT 1)
WHERE u.perfil = 'cliente'
GROUP BY 
  u.id, u.auth_id, u.email, u.nombres, u.apellidos,
  p.id, p.estado, p.tipo_pedido, p.total, p.subtotal,
  p.propina_monto, p.direccion_entrega, p.created_at,
  d.nombres, d.apellidos, d.email
ORDER BY 
  CASE p.estado
    WHEN 'entregado' THEN 1
    WHEN 'listo para entregar' THEN 2
    WHEN 'confirmado por delivery' THEN 3
    WHEN 'asignado a delivery' THEN 4
    WHEN 'en preparación' THEN 5
    WHEN 'pedido en curso' THEN 6
    WHEN 'pendiente' THEN 7
    ELSE 8
  END,
  p.created_at DESC;

-- =====================================================
-- CONSULTA 3: RESUMEN GENERAL - TODOS LOS CLIENTES QUE DEBEN PEDIR CUENTA
-- =====================================================
-- Vista consolidada de todos los clientes (mesa + delivery)
-- que tienen pedidos listos para solicitar cuenta
-- =====================================================

WITH clientes_mesa AS (
  SELECT 
    u.id as cliente_id,
    u.email,
    u.nombres || ' ' || u.apellidos as cliente_nombre,
    'MESA' as tipo,
    le.numero_mesa as identificador,
    p.id as pedido_id,
    p.estado,
    p.total,
    p.created_at
  FROM usuarios u
  JOIN lista_espera le ON le.usuario_id = u.id AND le.estado = 'asignado'
  JOIN pedidos p ON p.idCliente = u.id 
    AND (p.tipo_pedido = 'mesa' OR p.tipo_pedido IS NULL)
    AND p.estado IN ('entregado', 'listo para entregar')
    AND p.estado != 'pendiente confirmacion pago'
  WHERE u.perfil = 'cliente'
),
clientes_delivery AS (
  SELECT 
    u.id as cliente_id,
    u.email,
    u.nombres || ' ' || u.apellidos as cliente_nombre,
    'DELIVERY' as tipo,
    'Delivery #' || p.id::text as identificador,
    p.id as pedido_id,
    p.estado,
    p.total,
    p.created_at
  FROM usuarios u
  JOIN pedidos p ON p.idCliente = u.id 
    AND p.tipo_pedido = 'delivery'
    AND p.estado IN ('entregado', 'listo para entregar')
    AND p.estado != 'pendiente confirmacion pago'
  WHERE u.perfil = 'cliente'
)
SELECT 
  cliente_id,
  email,
  cliente_nombre,
  tipo,
  identificador,
  pedido_id,
  estado,
  total,
  created_at as fecha_pedido,
  CASE 
    WHEN estado = 'entregado' THEN '✅ LISTO PARA PEDIR CUENTA'
    WHEN estado = 'listo para entregar' THEN '🍽️ LISTO (esperar entrega)'
    ELSE '❓ ' || estado
  END as accion_requerida
FROM (
  SELECT * FROM clientes_mesa
  UNION ALL
  SELECT * FROM clientes_delivery
) todos
ORDER BY 
  CASE estado
    WHEN 'entregado' THEN 1
    WHEN 'listo para entregar' THEN 2
    ELSE 3
  END,
  created_at DESC;

-- =====================================================
-- CONSULTA 4: CLIENTES QUE YA PIDIERON LA CUENTA (PENDIENTES DE CONFIRMACIÓN)
-- =====================================================
-- Identifica clientes que ya solicitaron la cuenta
-- y están esperando confirmación del mozo/admin
-- =====================================================

SELECT 
  u.id as cliente_id,
  u.email,
  u.nombres || ' ' || u.apellidos as cliente_nombre,
  CASE 
    WHEN p.tipo_pedido = 'delivery' THEN 'DELIVERY'
    ELSE 'MESA'
  END as tipo,
  CASE 
    WHEN p.tipo_pedido = 'delivery' THEN 'Delivery #' || p.id::text
    ELSE 'Mesa ' || COALESCE(le.numero_mesa::text, '?')
  END as identificador,
  p.id as pedido_id,
  p.estado,
  p.total,
  p.subtotal,
  p.propina_monto,
  p.created_at as fecha_pedido,
  p.updated_at as fecha_solicitud_cuenta,
  EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 60 as minutos_esperando,
  CASE 
    WHEN p.tipo_pedido = 'delivery' THEN '⏳ ESPERANDO CONFIRMACIÓN DEL ADMIN'
    ELSE '⏳ ESPERANDO CONFIRMACIÓN DEL MOZO'
  END as estado_descripcion
FROM usuarios u
JOIN pedidos p ON p.idCliente = u.id 
  AND p.estado = 'pendiente confirmacion pago'
LEFT JOIN lista_espera le ON le.usuario_id = u.id AND le.estado = 'asignado'
WHERE u.perfil = 'cliente'
ORDER BY p.updated_at ASC;  -- Los más antiguos primero

-- =====================================================
-- CONSULTA 5: ESTADÍSTICAS DE PEDIDOS POR ESTADO
-- =====================================================
-- Resumen de cuántos pedidos hay en cada estado
-- para entender la situación general
-- =====================================================

SELECT 
  COALESCE(tipo_pedido, 'mesa') as tipo_pedido,
  estado,
  COUNT(*) as cantidad_pedidos,
  SUM(total) as total_acumulado,
  AVG(total) as promedio_pedido,
  MIN(created_at) as pedido_mas_antiguo,
  MAX(created_at) as pedido_mas_reciente
FROM pedidos
WHERE estado IN (
  'pendiente',
  'pedido en curso',
  'en preparación',
  'listo para entregar',
  'entregado',
  'pendiente confirmacion pago',
  'pagado'
)
GROUP BY tipo_pedido, estado
ORDER BY 
  tipo_pedido,
  CASE estado
    WHEN 'pendiente' THEN 1
    WHEN 'pedido en curso' THEN 2
    WHEN 'en preparación' THEN 3
    WHEN 'listo para entregar' THEN 4
    WHEN 'entregado' THEN 5
    WHEN 'pendiente confirmacion pago' THEN 6
    WHEN 'pagado' THEN 7
    ELSE 8
  END;

-- =====================================================
-- CONSULTA 6: CLIENTES CON MÚLTIPLES PEDIDOS PENDIENTES
-- =====================================================
-- Identifica clientes que tienen varios pedidos
-- que podrían necesitar atención
-- =====================================================

SELECT 
  u.id as cliente_id,
  u.email,
  u.nombres || ' ' || u.apellidos as cliente_nombre,
  COUNT(p.id) as cantidad_pedidos_pendientes,
  STRING_AGG(p.estado, ', ' ORDER BY p.created_at DESC) as estados,
  SUM(p.total) as total_acumulado,
  MAX(p.created_at) as ultimo_pedido
FROM usuarios u
JOIN pedidos p ON p.idCliente = u.id
WHERE u.perfil = 'cliente'
  AND p.estado NOT IN ('pagado', 'cancelado', 'rechazado por admin', 'rechazado por mozo')
GROUP BY u.id, u.email, u.nombres, u.apellidos
HAVING COUNT(p.id) > 1
ORDER BY cantidad_pedidos_pendientes DESC, ultimo_pedido DESC;

-- =====================================================
-- NOTAS DE USO:
-- =====================================================
-- 1. CONSULTA 1: Usa para ver clientes en mesa que deben pedir cuenta
-- 2. CONSULTA 2: Usa para ver clientes con delivery que deben pedir cuenta
-- 3. CONSULTA 3: Vista general de todos los clientes (mesa + delivery)
-- 4. CONSULTA 4: Clientes que ya pidieron cuenta y esperan confirmación
-- 5. CONSULTA 5: Estadísticas generales de pedidos
-- 6. CONSULTA 6: Clientes con múltiples pedidos pendientes
-- =====================================================

