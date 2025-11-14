-- =====================================================
-- SQL PARA DATOS DE PRUEBA - VISTAS DE PAGOS
-- =====================================================
-- Este archivo contiene 3 scripts SQL para crear datos de prueba
-- que permiten visualizar las vistas de pagos en la aplicación
-- =====================================================

-- =====================================================
-- SCRIPT 1: DATOS PARA MOZO (Pedido de Mesa)
-- =====================================================
-- Crea un pedido de mesa con estado 'pendiente confirmacion pago'
-- para visualizar en /mozo/confirmar-pago
-- =====================================================

-- Paso 1: Crear usuario cliente (si no existe)
-- NOTA: Ajusta el auth_id según tu usuario de prueba
INSERT INTO usuarios (auth_id, email, nombres, apellidos, perfil, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'cliente.mesa@test.com', 'Juan', 'Pérez', 'cliente', NOW())
ON CONFLICT (auth_id) DO NOTHING;

-- Paso 2: Crear mesa (si no existe)
INSERT INTO mesas (numero, capacidad, estado, created_at)
VALUES (5, 4, 'ocupada', NOW())
ON CONFLICT (numero) DO UPDATE SET estado = 'ocupada';

-- Paso 3: Crear lista_espera (cliente en mesa)
INSERT INTO lista_espera (usuario_id, estado, numero_mesa, mesa_id, created_at)
SELECT 
  u.id,
  'asignado',
  5,
  m.id,
  NOW()
FROM usuarios u, mesas m
WHERE u.auth_id = '00000000-0000-0000-0000-000000000001'
  AND m.numero = 5
ON CONFLICT DO NOTHING;

-- Paso 4: Obtener productos del menú (ajusta los IDs según tu menú)
-- Asumiendo que tienes productos con IDs 1, 2, 3
-- Si no, primero crea productos de prueba:
INSERT INTO menu (nombre, descripcion, precio, tipo, sector, activo, created_at)
VALUES 
  ('Milanesa Napolitana', 'Milanesa con jamón, queso y salsa', 3500.00, 'plato', 'cocina', true, NOW()),
  ('Coca Cola 500ml', 'Bebida gaseosa', 800.00, 'bebida', 'bar', true, NOW()),
  ('Tiramisú', 'Postre italiano', 1200.00, 'postre', 'cocina', true, NOW())
ON CONFLICT DO NOTHING;

-- Paso 5: Crear pedido de mesa con estado 'pendiente confirmacion pago'
WITH cliente_data AS (
  SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000001'
),
productos_data AS (
  SELECT id, precio FROM menu WHERE nombre IN ('Milanesa Napolitana', 'Coca Cola 500ml', 'Tiramisú') LIMIT 3
)
INSERT INTO pedidos (
  idCliente,
  estado,
  tipo_pedido,
  total,
  subtotal,
  descuento_pct,
  monto_descuento,
  propina_pct,
  propina_monto,
  created_at
)
SELECT 
  c.id,
  'pendiente confirmacion pago',
  'mesa',
  5500.00,  -- total
  5000.00,  -- subtotal
  0,        -- descuento_pct
  0,        -- monto_descuento
  10,       -- propina_pct (10%)
  500.00,   -- propina_monto
  NOW()
FROM cliente_data c
RETURNING id;

-- Paso 6: Crear detalles del pedido
-- NOTA: Ajusta el pedido_id según el ID retornado en el paso anterior
-- O usa una subconsulta para obtenerlo automáticamente
WITH pedido_data AS (
  SELECT id FROM pedidos 
  WHERE idCliente = (SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000001')
    AND estado = 'pendiente confirmacion pago'
    AND tipo_pedido = 'mesa'
  ORDER BY created_at DESC LIMIT 1
),
productos_data AS (
  SELECT id, precio FROM menu WHERE nombre IN ('Milanesa Napolitana', 'Coca Cola 500ml', 'Tiramisú')
)
INSERT INTO pedidos_detalles (idPedido, idProducto, cantidad, precioUnitario)
SELECT 
  p.id,
  pr.id,
  CASE 
    WHEN pr.nombre = 'Milanesa Napolitana' THEN 1
    WHEN pr.nombre = 'Coca Cola 500ml' THEN 2
    WHEN pr.nombre = 'Tiramisú' THEN 1
  END,
  pr.precio
FROM pedido_data p
CROSS JOIN productos_data pr
WHERE pr.nombre IN ('Milanesa Napolitana', 'Coca Cola 500ml', 'Tiramisú');

-- =====================================================
-- SCRIPT 2: DATOS PARA CLIENTE (Pedido con Descuentos)
-- =====================================================
-- Crea un pedido (mesa o delivery) con descuentos de juegos
-- para visualizar en /cliente/cliente-detalle-cuenta
-- =====================================================

-- Paso 1: Crear usuario cliente para delivery (si no existe)
INSERT INTO usuarios (auth_id, email, nombres, apellidos, perfil, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'cliente.delivery@test.com', 'María', 'González', 'cliente', NOW())
ON CONFLICT (auth_id) DO NOTHING;

-- Paso 2: Crear pedido delivery con descuentos
WITH cliente_data AS (
  SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000002'
)
INSERT INTO pedidos (
  idCliente,
  estado,
  tipo_pedido,
  total,
  subtotal,
  descuento_pct,
  monto_descuento,
  descuento_fuente,
  juego_premio_reclamado,
  propina_pct,
  propina_monto,
  direccion_entrega,
  created_at
)
SELECT 
  c.id,
  'pendiente confirmacion pago',
  'delivery',
  7200.00,  -- total (después de descuento)
  8000.00,  -- subtotal
  10,       -- descuento_pct (10%)
  800.00,   -- monto_descuento
  'juego',  -- descuento_fuente
  'ruleta', -- juego_premio_reclamado
  0,        -- propina_pct (aún no seleccionada)
  0,        -- propina_monto
  'Av. Corrientes 1234, CABA',
  NOW()
FROM cliente_data c
RETURNING id;

-- Paso 3: Crear detalles del pedido delivery
WITH pedido_data AS (
  SELECT id FROM pedidos 
  WHERE idCliente = (SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000002')
    AND estado = 'pendiente confirmacion pago'
    AND tipo_pedido = 'delivery'
  ORDER BY created_at DESC LIMIT 1
),
productos_data AS (
  SELECT id, precio FROM menu WHERE nombre IN ('Milanesa Napolitana', 'Coca Cola 500ml', 'Tiramisú')
)
INSERT INTO pedidos_detalles (idPedido, idProducto, cantidad, precioUnitario)
SELECT 
  p.id,
  pr.id,
  CASE 
    WHEN pr.nombre = 'Milanesa Napolitana' THEN 2
    WHEN pr.nombre = 'Coca Cola 500ml' THEN 2
    WHEN pr.nombre = 'Tiramisú' THEN 1
  END,
  pr.precio
FROM pedido_data p
CROSS JOIN productos_data pr
WHERE pr.nombre IN ('Milanesa Napolitana', 'Coca Cola 500ml', 'Tiramisú');

-- =====================================================
-- SCRIPT 3: DATOS PARA ADMIN (Pedido Delivery)
-- =====================================================
-- Crea un pedido delivery con estado 'pendiente confirmacion pago'
-- para visualizar en /admin/delivery-confirmar-pago
-- =====================================================

-- Paso 1: Crear usuario cliente para admin (si no existe)
INSERT INTO usuarios (auth_id, email, nombres, apellidos, perfil, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000003', 'cliente.admin@test.com', 'Carlos', 'Rodríguez', 'cliente', NOW())
ON CONFLICT (auth_id) DO NOTHING;

-- Paso 2: Crear pedido delivery para admin
WITH cliente_data AS (
  SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000003'
)
INSERT INTO pedidos (
  idCliente,
  estado,
  tipo_pedido,
  total,
  subtotal,
  descuento_pct,
  monto_descuento,
  propina_pct,
  propina_monto,
  direccion_entrega,
  latitud,
  longitud,
  created_at
)
SELECT 
  c.id,
  'pendiente confirmacion pago',
  'delivery',
  8800.00,  -- total
  8000.00,  -- subtotal
  0,        -- descuento_pct
  0,        -- monto_descuento
  10,       -- propina_pct (10%)
  800.00,   -- propina_monto
  'Av. Santa Fe 5678, CABA',
  -34.603722,
  -58.381592,
  NOW()
FROM cliente_data c
RETURNING id;

-- Paso 3: Crear detalles del pedido delivery para admin
WITH pedido_data AS (
  SELECT id FROM pedidos 
  WHERE idCliente = (SELECT id FROM usuarios WHERE auth_id = '00000000-0000-0000-0000-000000000003')
    AND estado = 'pendiente confirmacion pago'
    AND tipo_pedido = 'delivery'
  ORDER BY created_at DESC LIMIT 1
),
productos_data AS (
  SELECT id, precio FROM menu WHERE nombre IN ('Milanesa Napolitana', 'Coca Cola 500ml', 'Tiramisú')
)
INSERT INTO pedidos_detalles (idPedido, idProducto, cantidad, precioUnitario)
SELECT 
  p.id,
  pr.id,
  CASE 
    WHEN pr.nombre = 'Milanesa Napolitana' THEN 2
    WHEN pr.nombre = 'Coca Cola 500ml' THEN 3
    WHEN pr.nombre = 'Tiramisú' THEN 2
  END,
  pr.precio
FROM pedido_data p
CROSS JOIN productos_data pr
WHERE pr.nombre IN ('Milanesa Napolitana', 'Coca Cola 500ml', 'Tiramisú');

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Ajusta los auth_id según tus usuarios de prueba
-- 2. Ajusta los IDs de productos del menú según tu base de datos
-- 3. Si los productos no existen, el script los crea automáticamente
-- 4. Los estados de los pedidos son 'pendiente confirmacion pago'
--    para que aparezcan en las vistas de confirmación
-- 5. Para el cliente, el pedido puede tener descuentos de juegos
-- 6. Todos los pedidos tienen propina configurada (excepto cliente que puede no tenerla aún)
-- =====================================================

-- =====================================================
-- VERIFICACIÓN: Consultas para verificar los datos
-- =====================================================

-- Ver pedidos creados para MOZO
SELECT 
  p.id,
  p.estado,
  p.tipo_pedido,
  p.total,
  p.subtotal,
  p.propina_monto,
  u.nombres || ' ' || u.apellidos as cliente_nombre,
  le.numero_mesa
FROM pedidos p
JOIN usuarios u ON p.idCliente = u.id
LEFT JOIN lista_espera le ON le.usuario_id = u.id AND le.estado = 'asignado'
WHERE p.estado = 'pendiente confirmacion pago'
  AND p.tipo_pedido = 'mesa'
ORDER BY p.created_at DESC;

-- Ver pedidos creados para CLIENTE
SELECT 
  p.id,
  p.estado,
  p.tipo_pedido,
  p.total,
  p.subtotal,
  p.descuento_pct,
  p.monto_descuento,
  p.descuento_fuente,
  p.propina_monto,
  u.nombres || ' ' || u.apellidos as cliente_nombre
FROM pedidos p
JOIN usuarios u ON p.idCliente = u.id
WHERE p.estado = 'pendiente confirmacion pago'
  AND u.auth_id IN ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003')
ORDER BY p.created_at DESC;

-- Ver pedidos creados para ADMIN (delivery)
SELECT 
  p.id,
  p.estado,
  p.tipo_pedido,
  p.total,
  p.subtotal,
  p.propina_monto,
  u.email as cliente_email,
  u.nombres || ' ' || u.apellidos as cliente_nombre,
  p.direccion_entrega
FROM pedidos p
JOIN usuarios u ON p.idCliente = u.id
WHERE p.estado = 'pendiente confirmacion pago'
  AND p.tipo_pedido = 'delivery'
ORDER BY p.created_at DESC;

-- Ver detalles de un pedido específico
SELECT 
  pd.id,
  pd.cantidad,
  pd.precioUnitario,
  pd.cantidad * pd.precioUnitario as subtotal,
  m.nombre as producto_nombre,
  m.tipo as producto_tipo
FROM pedidos_detalles pd
JOIN menu m ON pd.idProducto = m.id
WHERE pd.idPedido = (SELECT id FROM pedidos WHERE estado = 'pendiente confirmacion pago' LIMIT 1)
ORDER BY m.tipo, m.nombre;

