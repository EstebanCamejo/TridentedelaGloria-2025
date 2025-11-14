-- =====================================================
-- CONSULTAS RÁPIDAS - CLIENTES QUE DEBEN PEDIR CUENTA
-- =====================================================
-- Comandos SQL simples y directos para identificar rápidamente
-- qué clientes necesitan pedir la cuenta
-- =====================================================

-- =====================================================
-- CONSULTA RÁPIDA 1: Clientes en MESA listos para pedir cuenta
-- =====================================================
SELECT 
  u.email,
  u.nombres || ' ' || u.apellidos as cliente,
  le.numero_mesa as mesa,
  p.id as pedido_id,
  p.estado,
  p.total,
  CASE 
    WHEN p.estado = 'entregado' THEN '✅ LISTO PARA PEDIR CUENTA'
    WHEN p.estado = 'listo para entregar' THEN '🍽️ ESPERAR ENTREGA'
    ELSE '❓ ' || p.estado
  END as accion
FROM usuarios u
JOIN lista_espera le ON le.usuario_id = u.id AND le.estado = 'asignado'
JOIN pedidos p ON p.idCliente = u.id 
  AND (p.tipo_pedido = 'mesa' OR p.tipo_pedido IS NULL)
  AND p.estado IN ('entregado', 'listo para entregar')
  AND p.estado != 'pendiente confirmacion pago'
WHERE u.perfil = 'cliente'
ORDER BY 
  CASE p.estado WHEN 'entregado' THEN 1 ELSE 2 END,
  p.created_at DESC;

-- =====================================================
-- CONSULTA RÁPIDA 2: Clientes con DELIVERY listos para pedir cuenta
-- =====================================================
SELECT 
  u.email,
  u.nombres || ' ' || u.apellidos as cliente,
  'Delivery #' || p.id::text as pedido,
  p.estado,
  p.total,
  p.direccion_entrega,
  CASE 
    WHEN p.estado = 'entregado' THEN '✅ LISTO PARA PEDIR CUENTA'
    WHEN p.estado = 'listo para entregar' THEN '🍽️ ESPERAR ENTREGA'
    ELSE '❓ ' || p.estado
  END as accion
FROM usuarios u
JOIN pedidos p ON p.idCliente = u.id 
  AND p.tipo_pedido = 'delivery'
  AND p.estado IN ('entregado', 'listo para entregar')
  AND p.estado != 'pendiente confirmacion pago'
WHERE u.perfil = 'cliente'
ORDER BY 
  CASE p.estado WHEN 'entregado' THEN 1 ELSE 2 END,
  p.created_at DESC;

-- =====================================================
-- CONSULTA RÁPIDA 3: TODOS los clientes que deben pedir cuenta (MESA + DELIVERY)
-- =====================================================
SELECT 
  u.email,
  u.nombres || ' ' || u.apellidos as cliente,
  CASE 
    WHEN p.tipo_pedido = 'delivery' THEN 'DELIVERY #' || p.id::text
    ELSE 'MESA ' || COALESCE(le.numero_mesa::text, '?')
  END as identificador,
  p.estado,
  p.total,
  CASE 
    WHEN p.estado = 'entregado' THEN '✅ LISTO PARA PEDIR CUENTA'
    WHEN p.estado = 'listo para entregar' THEN '🍽️ ESPERAR ENTREGA'
    ELSE '❓ ' || p.estado
  END as accion
FROM usuarios u
JOIN pedidos p ON p.idCliente = u.id 
  AND p.estado IN ('entregado', 'listo para entregar')
  AND p.estado != 'pendiente confirmacion pago'
LEFT JOIN lista_espera le ON le.usuario_id = u.id AND le.estado = 'asignado'
WHERE u.perfil = 'cliente'
ORDER BY 
  CASE p.estado WHEN 'entregado' THEN 1 ELSE 2 END,
  p.created_at DESC;

-- =====================================================
-- CONSULTA RÁPIDA 4: Clientes que YA pidieron cuenta (esperando confirmación)
-- =====================================================
SELECT 
  u.email,
  u.nombres || ' ' || u.apellidos as cliente,
  CASE 
    WHEN p.tipo_pedido = 'delivery' THEN 'DELIVERY #' || p.id::text
    ELSE 'MESA ' || COALESCE(le.numero_mesa::text, '?')
  END as identificador,
  p.total,
  ROUND(EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 60) as minutos_esperando,
  CASE 
    WHEN p.tipo_pedido = 'delivery' THEN '⏳ ESPERANDO ADMIN'
    ELSE '⏳ ESPERANDO MOZO'
  END as esperando
FROM usuarios u
JOIN pedidos p ON p.idCliente = u.id 
  AND p.estado = 'pendiente confirmacion pago'
LEFT JOIN lista_espera le ON le.usuario_id = u.id AND le.estado = 'asignado'
WHERE u.perfil = 'cliente'
ORDER BY p.updated_at ASC;  -- Los más antiguos primero

-- =====================================================
-- CONSULTA RÁPIDA 5: Contar pedidos por estado
-- =====================================================
SELECT 
  COALESCE(tipo_pedido, 'mesa') as tipo,
  estado,
  COUNT(*) as cantidad,
  SUM(total) as total_acumulado
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
ORDER BY tipo, estado;

-- =====================================================
-- CONSULTA RÁPIDA 6: Clientes con pedidos entregados hace más de X minutos
-- =====================================================
-- Útil para identificar clientes que deberían haber pedido cuenta ya
-- Ajusta el número de minutos según tu necesidad (ej: 30 minutos)
SELECT 
  u.email,
  u.nombres || ' ' || u.apellidos as cliente,
  CASE 
    WHEN p.tipo_pedido = 'delivery' THEN 'DELIVERY #' || p.id::text
    ELSE 'MESA ' || COALESCE(le.numero_mesa::text, '?')
  END as identificador,
  p.estado,
  p.total,
  ROUND(EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 60) as minutos_desde_entrega,
  '⚠️ PEDIDO ENTREGADO HACE ' || ROUND(EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 60) || ' MINUTOS' as alerta
FROM usuarios u
JOIN pedidos p ON p.idCliente = u.id 
  AND p.estado = 'entregado'
  AND p.estado != 'pendiente confirmacion pago'
LEFT JOIN lista_espera le ON le.usuario_id = u.id AND le.estado = 'asignado'
WHERE u.perfil = 'cliente'
  AND EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 60 > 30  -- Más de 30 minutos
ORDER BY p.updated_at ASC;

-- =====================================================
-- CONSULTA RÁPIDA 7: Resumen ejecutivo
-- =====================================================
-- Vista rápida de la situación general
SELECT 
  'PEDIDOS LISTOS PARA PEDIR CUENTA' as categoria,
  COUNT(*) as cantidad,
  SUM(total) as total_acumulado
FROM pedidos
WHERE estado IN ('entregado', 'listo para entregar')
  AND estado != 'pendiente confirmacion pago'
UNION ALL
SELECT 
  'PEDIDOS ESPERANDO CONFIRMACIÓN DE PAGO' as categoria,
  COUNT(*) as cantidad,
  SUM(total) as total_acumulado
FROM pedidos
WHERE estado = 'pendiente confirmacion pago'
UNION ALL
SELECT 
  'PEDIDOS EN PREPARACIÓN' as categoria,
  COUNT(*) as cantidad,
  SUM(total) as total_acumulado
FROM pedidos
WHERE estado IN ('en preparación', 'pedido en curso', 'listo para entregar')
  AND estado != 'pendiente confirmacion pago'
ORDER BY categoria;

-- =====================================================
-- USO RÁPIDO:
-- =====================================================
-- 1. Ejecuta CONSULTA RÁPIDA 3 para ver todos los clientes que deben pedir cuenta
-- 2. Ejecuta CONSULTA RÁPIDA 4 para ver quiénes ya pidieron y esperan confirmación
-- 3. Ejecuta CONSULTA RÁPIDA 7 para un resumen ejecutivo
-- =====================================================

