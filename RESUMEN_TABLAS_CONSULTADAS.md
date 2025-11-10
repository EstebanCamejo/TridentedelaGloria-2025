# RESUMEN COMPLETO: Tablas y Columnas Consultadas/Asignadas

## 📋 Tablas Principales Utilizadas

### 1. **`pedidos`** (Tabla Central)

#### **Columnas CONSULTADAS:**
- `id` - ID único del pedido
- `idCliente` - UUID del cliente que realizó el pedido
- `estado` - Estado actual del pedido ('pendiente', 'asignado a delivery', 'confirmado por delivery', 'entregado', etc.)
- `tipo_pedido` - 'mesa' o 'delivery'
- `direccion_entrega` - Dirección de entrega (solo delivery)
- `latitud` - Coordenada latitud (solo delivery)
- `longitud` - Coordenada longitud (solo delivery)
- `idDelivery` - UUID del usuario delivery asignado
- `tiempo_estimado` - Tiempo estimado de entrega/preparación
- `descuento_pct` - Porcentaje de descuento aplicado (legacy)
- `juego_premio_reclamado` - Booleano si se reclamó premio (legacy)
- `total` - Monto total del pedido
- `created_at` - Fecha de creación
- `updated_at` - Fecha de última actualización

#### **Columnas ASIGNADAS/ACTUALIZADAS:**
- `estado` - Se actualiza en múltiples puntos:
  - Admin confirma/rechaza: 'pedido en curso' / 'rechazado por admin'
  - Admin asigna delivery: 'asignado a delivery'
  - Delivery confirma recepción: 'confirmado por delivery'
  - Delivery entrega: 'entregado'
  - Cliente solicita cuenta: 'pendiente confirmacion pago'
  - Admin confirma pago: 'pagado'
- `idDelivery` - Se asigna cuando el admin asigna un delivery al pedido
- `tiempo_estimado` - Se asigna cuando el admin confirma el pedido delivery
- `updated_at` - Se actualiza en cada cambio de estado

#### **Servicios que la usan:**
- `DeliveryPedidosService` - Consulta y actualiza pedidos asignados y en camino
- `AdminDeliveryPedidosService` - Consulta y actualiza pedidos pendientes y listos
- `ChatService` - Consulta `tipo_pedido` e `idDelivery` para crear salas de chat
- `DeliveryRealtimeService` - Consulta para verificar asignación de pedidos
- `ClienteRealtimeService` - Consulta para obtener información de pedidos del cliente
- `SupabaseService.yaSeAplicoDescuento()` - Consulta `descuento_pct` y `juego_premio_reclamado`
- Componentes de juegos - Consultan `juego_premio_reclamado`

---

### 2. **`usuarios`**

#### **Columnas CONSULTADAS:**
- `auth_id` - UUID del usuario (clave primaria)
- `perfil` - Rol del usuario ('clienteReg', 'delivery', 'dueno', etc.)
- `email` - Correo electrónico
- `nombres` - Nombres del usuario
- `apellidos` - Apellidos del usuario

#### **Columnas ASIGNADAS/ACTUALIZADAS:**
- Ninguna (tabla de solo lectura desde el código de la aplicación)

#### **Servicios que la usan:**
- `DeliveryPedidosService` - Obtiene emails de clientes para mostrar en listados
- `DeliveryRealtimeService` - Obtiene información del cliente para notificaciones
- `SesionService` - Verifica el perfil del usuario logueado
- `DeliveryUsuariosService` - Lista usuarios delivery disponibles

---

### 3. **`chat_rooms`**

#### **Columnas CONSULTADAS:**
- `id` - ID único de la sala de chat
- `pedido_id` - ID del pedido asociado
- `cliente_uid` - UUID del cliente en la sala
- `delivery_uid` - UUID del delivery en la sala (NUEVO para delivery)
- `tipo_pedido` - 'mesa' o 'delivery' (NUEVO)
- `mesa_num` - Número de mesa (NULL para delivery)

#### **Columnas ASIGNADAS/ACTUALIZADAS:**
- **Inserción:** Se crean nuevas salas con:
  - `pedido_id`, `cliente_uid`, `delivery_uid` (para delivery)
  - `tipo_pedido: 'delivery'` o `'mesa'`
  - `mesa_num: null` (para delivery) o número de mesa
- **Actualización:** Se actualiza si una sala existe pero no tiene `delivery_uid` o `tipo_pedido` correcto

#### **Servicios que la usan:**
- `ChatService.ensureRoomByPedidoDelivery()` - Crea/obtiene salas de chat para delivery
- `ChatService.ensureRoomByPedido()` - Crea/obtiene salas de chat para mesa
- `ChatService.deliveryChats$()` - Lista chats de un delivery
- `DeliveryRealtimeService` - Consulta `delivery_uid` y `tipo_pedido` para filtrar mensajes

---

### 4. **`chat_messages`**

#### **Columnas CONSULTADAS:**
- `id` - ID único del mensaje
- `room_id` - ID de la sala de chat
- `from_uid` - UUID del usuario que envía el mensaje
- `text` - Contenido del mensaje
- `created_at` - Fecha de envío

#### **Columnas ASIGNADAS/ACTUALIZADAS:**
- **Inserción:** Se insertan nuevos mensajes con `room_id`, `from_uid`, `text`

#### **Servicios que la usan:**
- `ChatService.streamMessages()` - Consulta mensajes de una sala
- `ChatService.sendMessage()` - Inserta nuevos mensajes
- `DeliveryRealtimeService` - Escucha nuevos mensajes para notificaciones push
- `ClienteChatRealtimeService` - Escucha nuevos mensajes para notificaciones push

---

### 5. **`pedidos_descuentos`**

#### **Columnas CONSULTADAS:**
- `id` - ID único del registro de descuento
- `pedido_id` - ID del pedido al que se aplicó el descuento

#### **Columnas ASIGNADAS/ACTUALIZADAS:**
- **Inserción:** La función RPC `claim_game_discount` inserta un nuevo registro cuando se reclama un descuento

#### **Servicios que la usan:**
- `SupabaseService.yaSeAplicoDescuento()` - Consulta si ya existe un descuento para un pedido
- `claim_game_discount` (RPC) - Inserta registros de descuento

---

### 6. **`pedidos_detalles`**

#### **Columnas CONSULTADAS:**
- `id` - ID único del detalle
- `idPedido` - ID del pedido al que pertenece
- `cantidad` - Cantidad del producto
- `precioUnitario` - Precio unitario del producto
- `producto_id` - ID del producto (a veces consultado)

#### **Columnas ASIGNADAS/ACTUALIZADAS:**
- Ninguna (se crean al crear el pedido, no se modifican desde estos servicios)

#### **Servicios que la usan:**
- `DeliveryPedidosService` - Cuenta cantidad de items por pedido
- `AdminRealtimeService` - Calcula total del pedido si falta
- `ClienteDetalleCuentaComponent` - Muestra detalles de productos en la cuenta

---

## 🔧 Funciones RPC Utilizadas

### **`claim_game_discount`**
- **Parámetros:**
  - `p_pedido_id` (INTEGER) - ID del pedido
  - `p_juego` (TEXT) - Nombre del juego ('trivia', 'tap', 'memoria')
  - `p_score` (INTEGER) - Puntaje obtenido
- **Retorna:**
  - `applied` (BOOLEAN) - Si se aplicó el descuento
  - `pct` (NUMERIC) - Porcentaje de descuento aplicado
  - `total_final` (NUMERIC) - Total final con descuento
  - `reason` (TEXT) - Razón si no se aplicó
- **Usada en:**
  - `TapComponent.claim()`
  - `MemoriaComponent.claim()`
  - `TriviaComponent.claim()`
  - `SupabaseService.claimGameDiscount()`

---

## 🚨 Problemas Potenciales Identificados

### 1. **Columna `idDelivery` con mayúsculas/minúsculas**
- PostgreSQL puede crear columnas en minúsculas si no se usan comillas
- Verificar: Ejecutar `sql_verificar_todas_tablas_delivery.sql` y revisar la sección 9

### 2. **Falta `delivery_uid` en `chat_rooms`**
- Si no existe, el chat delivery no funcionará
- Verificar: Ejecutar `sql_verificar_todas_tablas_delivery.sql` sección 3

### 3. **Falta función RPC `claim_game_discount`**
- Si no existe, los juegos se congelarán al reclamar descuento
- Verificar: Ejecutar `sql_verificar_todas_tablas_delivery.sql` sección 7

### 4. **Falta tabla `pedidos_descuentos`**
- Si no existe, `yaSeAplicoDescuento()` fallará
- Verificar: Ejecutar `sql_verificar_todas_tablas_delivery.sql` sección 5

---

## 📝 Próximos Pasos

1. **Ejecutar `sql_verificar_todas_tablas_delivery.sql`** en Supabase SQL Editor
2. **Revisar los resultados** y verificar qué falta
3. **Aplicar las migraciones SQL faltantes** según los resultados
4. **Verificar permisos RLS** (Row Level Security) en Supabase para asegurar que los usuarios delivery y clientes puedan leer/escribir en las tablas necesarias

