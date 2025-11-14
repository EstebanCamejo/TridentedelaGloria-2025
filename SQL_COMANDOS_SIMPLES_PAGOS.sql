-- =====================================================
-- COMANDOS SQL SIMPLES PARA DATOS DE PRUEBA
-- =====================================================
-- Ejecuta estos comandos en orden en tu base de datos Supabase
-- =====================================================

-- =====================================================
-- COMANDO 1: PEDIDO PARA MOZO (Mesa)
-- =====================================================
-- Crea un pedido de mesa con estado 'pendiente confirmacion pago'
-- Visible en: /mozo/confirmar-pago

-- 1.1. Crear/verificar usuario cliente
INSERT INTO usuarios (auth_id, email, nombres, apellidos, perfil, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'cliente.mesa@test.com', 'Juan', 'Pérez', 'cliente', NOW())
ON CONFLICT (auth_id) DO NOTHING;

-- 1.2. Crear/verificar mesa
INSERT INTO mesas (numero, capacidad, estado, created_at)
VALUES (5, 4, 'ocupada', NOW())
ON CONFLICT (numero) DO UPDATE SET estado = 'ocupada';

-- 1.3. Asignar cliente a mesa
INSERT INTO lista_espera (usuario_id, estado, numero_mesa, mesa_id, created_at)
SELECT u.id, 'asignado', 5, m.id, NOW()
FROM usuarios u, mesas m
WHERE u.auth_id = '00000000-0000-0000-0000-000000000001' AND m.numero = 5
ON CONFLICT DO NOTHING;

-- 1.4. Crear pedido
INSERT INTO pedidos (idCliente, estado, tipo_pedido, total, subtotal, descuento_pct, monto_descuento, propina_pct, propina_monto, created_at)
SELECT id, 'pendiente confirmacion pago', 'mesa', 5500.00, 5000.00, 0, 0, 10, 500.00, NOW()
FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000001'
RETURNING id;

-- 1.5. Agregar productos al pedido (ajusta los IDs de productos según tu menú)
-- NOTA: Reemplaza los IDs (1, 2, 3) con los IDs reales de tus productos
INSERT INTO pedidos_detalles (idPedido, idProducto, cantidad, precioUnitario)
SELECT 
  (SELECT id FROM pedidos WHERE idCliente = (SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000001') AND estado = 'pendiente confirmacion pago' ORDER BY created_at DESC LIMIT 1),
  id,
  CASE WHEN id = (SELECT id FROM menu WHERE nombre LIKE '%Milanesa%' LIMIT 1) THEN 1
       WHEN id = (SELECT id FROM menu WHERE nombre LIKE '%Coca%' LIMIT 1) THEN 2
       ELSE 1 END,
  precio
FROM menu 
WHERE nombre IN (SELECT nombre FROM menu WHERE tipo IN ('plato', 'bebida', 'postre') LIMIT 3)
LIMIT 3;

-- =====================================================
-- COMANDO 2: PEDIDO PARA CLIENTE (con Descuentos)
-- =====================================================
-- Crea un pedido delivery con descuentos de juegos
-- Visible en: /cliente/cliente-detalle-cuenta

-- 2.1. Crear/verificar usuario cliente
INSERT INTO usuarios (auth_id, email, nombres, apellidos, perfil, created_at)
VALUES ('00000000-0000-0000-0000-000000000002', 'cliente.delivery@test.com', 'María', 'González', 'cliente', NOW())
ON CONFLICT (auth_id) DO NOTHING;

-- 2.2. Crear pedido delivery con descuento
INSERT INTO pedidos (idCliente, estado, tipo_pedido, total, subtotal, descuento_pct, monto_descuento, descuento_fuente, juego_premio_reclamado, propina_pct, propina_monto, direccion_entrega, created_at)
SELECT id, 'pendiente confirmacion pago', 'delivery', 7200.00, 8000.00, 10, 800.00, 'juego', 'ruleta', 0, 0, 'Av. Corrientes 1234, CABA', NOW()
FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000002'
RETURNING id;

-- 2.3. Agregar productos al pedido
INSERT INTO pedidos_detalles (idPedido, idProducto, cantidad, precioUnitario)
SELECT 
  (SELECT id FROM pedidos WHERE idCliente = (SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000002') AND estado = 'pendiente confirmacion pago' ORDER BY created_at DESC LIMIT 1),
  id,
  CASE WHEN id = (SELECT id FROM menu WHERE nombre LIKE '%Milanesa%' LIMIT 1) THEN 2
       WHEN id = (SELECT id FROM menu WHERE nombre LIKE '%Coca%' LIMIT 1) THEN 2
       ELSE 1 END,
  precio
FROM menu 
WHERE nombre IN (SELECT nombre FROM menu WHERE tipo IN ('plato', 'bebida', 'postre') LIMIT 3)
LIMIT 3;

-- =====================================================
-- COMANDO 3: PEDIDO PARA ADMIN (Delivery)
-- =====================================================
-- Crea un pedido delivery con estado 'pendiente confirmacion pago'
-- Visible en: /admin/delivery-confirmar-pago

-- 3.1. Crear/verificar usuario cliente
INSERT INTO usuarios (auth_id, email, nombres, apellidos, perfil, created_at)
VALUES ('00000000-0000-0000-0000-000000000003', 'cliente.admin@test.com', 'Carlos', 'Rodríguez', 'cliente', NOW())
ON CONFLICT (auth_id) DO NOTHING;

-- 3.2. Crear pedido delivery
INSERT INTO pedidos (idCliente, estado, tipo_pedido, total, subtotal, descuento_pct, monto_descuento, propina_pct, propina_monto, direccion_entrega, latitud, longitud, created_at)
SELECT id, 'pendiente confirmacion pago', 'delivery', 8800.00, 8000.00, 0, 0, 10, 800.00, 'Av. Santa Fe 5678, CABA', -34.603722, -58.381592, NOW()
FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000003'
RETURNING id;

-- 3.3. Agregar productos al pedido
INSERT INTO pedidos_detalles (idPedido, idProducto, cantidad, precioUnitario)
SELECT 
  (SELECT id FROM pedidos WHERE idCliente = (SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000003') AND estado = 'pendiente confirmacion pago' ORDER BY created_at DESC LIMIT 1),
  id,
  CASE WHEN id = (SELECT id FROM menu WHERE nombre LIKE '%Milanesa%' LIMIT 1) THEN 2
       WHEN id = (SELECT id FROM menu WHERE nombre LIKE '%Coca%' LIMIT 1) THEN 3
       ELSE 2 END,
  precio
FROM menu 
WHERE nombre IN (SELECT nombre FROM menu WHERE tipo IN ('plato', 'bebida', 'postre') LIMIT 3)
LIMIT 3;

-- =====================================================
-- VERIFICACIÓN RÁPIDA
-- =====================================================
-- Ejecuta esto para ver los pedidos creados:

SELECT 
  p.id,
  p.estado,
  p.tipo_pedido,
  p.total,
  p.subtotal,
  p.propina_monto,
  u.email,
  u.nombres || ' ' || u.apellidos as cliente
FROM pedidos p
JOIN usuarios u ON p.idCliente = u.id
WHERE p.estado = 'pendiente confirmacion pago'
ORDER BY p.created_at DESC;

-- =====================================================
-- LIMPIEZA (Opcional - para eliminar datos de prueba)
-- =====================================================
-- Descomenta estas líneas si quieres eliminar los datos de prueba:

-- DELETE FROM pedidos_detalles WHERE idPedido IN (
--   SELECT id FROM pedidos WHERE idCliente IN (
--     SELECT id FROM usuarios WHERE auth_id LIKE '00000000-0000-0000-0000-00000000000%'
--   )
-- );
-- DELETE FROM pedidos WHERE idCliente IN (
--   SELECT id FROM usuarios WHERE auth_id LIKE '00000000-0000-0000-0000-00000000000%'
-- );
-- DELETE FROM lista_espera WHERE usuario_id IN (
--   SELECT id FROM usuarios WHERE auth_id LIKE '00000000-0000-0000-0000-00000000000%'
-- );
-- DELETE FROM usuarios WHERE auth_id LIKE '00000000-0000-0000-0000-00000000000%';

