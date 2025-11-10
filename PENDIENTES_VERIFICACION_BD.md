# 📋 PENDIENTES: Verificación de Base de Datos

**Fecha de verificación:** Según resultados de `sql_verificar_todas_tablas_delivery.sql`

---

## ✅ **LO QUE ESTÁ CORRECTO** (No requiere acción)

### 1. **Tabla `pedidos`** ✅
- ✅ Tabla existe
- ✅ Todas las columnas críticas existen:
  - `id`, `idCliente`, `estado`, `tipo_pedido`
  - `direccion_entrega`, `latitud`, `longitud`
  - `idDelivery` (en camelCase correcto) ✅
  - `tiempo_estimado`, `total`, `descuento_pct`, `juego_premio_reclamado`
  - `created_at`, `updated_at`
- ✅ Constraint `check_tipo_pedido` existe

### 2. **Tabla `usuarios`** ✅
- ✅ Tabla existe
- ✅ Todas las columnas necesarias existen:
  - `auth_id`, `perfil`, `email`, `nombres`, `apellidos`
- ✅ ENUM `rol_usuario` incluye 'delivery' ✅

### 3. **Tabla `chat_rooms`** ⚠️ PARCIAL
- ✅ Tabla existe
- ✅ Columnas encontradas:
  - `id`, `pedido_id`, `cliente_uid`, `delivery_uid`, `mesa_num`
- ⚠️ **FALTA:** `tipo_pedido` - **NO apareció en los resultados**
- ❌ **FALTA:** Índice `idx_chat_rooms_delivery_uid` - **NO apareció en los resultados**

### 4. **Tabla `chat_messages`** ✅
- ✅ Tabla existe
- ✅ Todas las columnas necesarias existen (se asume, no se mostraron en resultados pero no hubo error)

### 5. **Tabla `pedidos_detalles`** ✅
- ✅ Tabla existe
- ✅ Columnas críticas existen:
  - `id`, `idPedido`, `cantidad`, `precioUnitario`

### 6. **Función RPC `claim_game_discount`** ✅
- ✅ Función existe

### 7. **Columna `idDelivery` (case sensitive)** ✅
- ✅ Existe en camelCase correcto (`idDelivery`)

---

## ❌ **PROBLEMAS CRÍTICOS ENCONTRADOS** (Requieren acción)

### 1. **Tabla `pedidos_descuentos` NO EXISTE** ❌
**Impacto:** 
- El método `yaSeAplicoDescuento()` en `supabase.service.ts` consulta esta tabla
- Si no existe, los juegos se congelarán al intentar verificar si ya se aplicó un descuento
- La función RPC `claim_game_discount` probablemente intenta insertar aquí

**Acción requerida:**
- Crear la tabla `pedidos_descuentos` con las columnas:
  - `id` (BIGSERIAL PRIMARY KEY)
  - `pedido_id` (BIGINT, FK a `pedidos.id`)
  - `descuento_pct` (NUMERIC)
  - `juego_id` (TEXT) - opcional, para saber qué juego dio el descuento
  - `created_at` (TIMESTAMP)

**Código que la usa:**
- `src/app/services/supabase.service.ts` línea 905-910
- Función RPC `claim_game_discount` (probablemente)

---

### 2. **Columna `tipo_pedido` FALTA en `chat_rooms`** ❌
**Impacto:**
- El código consulta `tipo_pedido` en `chat_rooms` para diferenciar chats de mesa vs delivery
- `ChatService.ensureRoomByPedidoDelivery()` establece `tipo_pedido: 'delivery'`
- `DeliveryRealtimeService` filtra mensajes por `tipo_pedido: 'delivery'`
- Si no existe, el chat delivery no funcionará correctamente

**Acción requerida:**
- Agregar columna `tipo_pedido` (TEXT) a `chat_rooms`
- Default: 'mesa' para chats existentes
- Constraint: CHECK (tipo_pedido IN ('mesa', 'delivery'))

**Código que la usa:**
- `src/app/services/chat.service.ts` líneas 58, 80, 111, 231
- `src/app/services/delivery-realtime.service.ts` líneas 183, 186

---

### 3. **Índice `idx_chat_rooms_delivery_uid` FALTA** ⚠️
**Impacto:**
- Impacto menor (performance), pero recomendado para consultas frecuentes
- El código consulta `chat_rooms` por `delivery_uid` frecuentemente

**Acción requerida:**
- Crear índice `CREATE INDEX idx_chat_rooms_delivery_uid ON chat_rooms(delivery_uid);`

**Código que la usa:**
- `src/app/services/chat.service.ts` línea 232
- `src/app/services/delivery-realtime.service.ts` línea 185

---

## 📝 **RESUMEN DE ACCIONES PENDIENTES**

### **PRIORIDAD ALTA (Bloquean funcionalidad):**

1. **Crear tabla `pedidos_descuentos`**
   - Impacto: Juegos se congelan al reclamar descuento
   - Archivo SQL necesario: `sql_crear_pedidos_descuentos.sql`

2. **Agregar columna `tipo_pedido` a `chat_rooms`**
   - Impacto: Chat delivery no funciona correctamente
   - Archivo SQL necesario: `sql_agregar_tipo_pedido_chat_rooms.sql`

### **PRIORIDAD MEDIA (Mejora performance):**

3. **Crear índice `idx_chat_rooms_delivery_uid`**
   - Impacto: Consultas más lentas, pero funcional
   - Puede incluirse en el mismo script de `tipo_pedido`

---

## 🔍 **VERIFICACIÓN ADICIONAL RECOMENDADA**

Ejecutar también `sql_diagnostico_delivery.sql` para ver:
- Pedidos delivery reales y sus estados
- Chat rooms de delivery existentes
- Descuentos aplicados
- Problemas comunes (sin repartidor, sin coordenadas, etc.)

---

## 📌 **NOTAS**

- ⚠️ **IMPORTANTE:** En los resultados del diagnóstico, la columna `idDelivery` aparece como `"iddelivery"` (minúsculas) en el JSON, pero esto es solo cómo PostgreSQL lo devuelve. La verificación anterior confirmó que está en camelCase correcto (`idDelivery`).
- El script de diagnóstico ha sido actualizado para manejar la ausencia de `tipo_pedido` y `pedidos_descuentos`
- Hay 3 pedidos en estado "listo para entregar" que necesitan que el admin asigne un delivery
- Hay 5 pedidos sin coordenadas (esto puede ser normal si el cliente solo ingresó dirección manual)

---

---

## 📊 **ANÁLISIS DE DATOS REALES** (Resultados de `sql_diagnostico_delivery.sql`)

### **Pedidos Delivery Existentes:**

**Pedidos Activos (en curso):**
- **Pedido #198** - Estado: `confirmado por delivery` ✅
  - Delivery asignado: `delivery2@test.com`
  - Con coordenadas: ✅
  - Dirección: "balcarce 301"
  
- **Pedido #197** - Estado: `confirmado por delivery` ✅
  - Delivery asignado: `delivery1@test.com`
  - Con coordenadas: ✅
  - Dirección: "lavalle 462"

- **Pedido #196** - Estado: `confirmado por delivery` ✅
  - Delivery asignado: `delivery1@test.com`
  - Sin coordenadas: ❌
  - Dirección: "Lavalleja 1234"

**Pedidos Pendientes (necesitan acción del admin):**
- **Pedido #195** - Estado: `listo para entregar` ⚠️
  - **SIN delivery asignado** (`idDelivery: null`)
  - Con coordenadas: ✅
  
- **Pedido #193** - Estado: `listo para entregar` ⚠️
  - **SIN delivery asignado** (`idDelivery: null`)
  - Sin coordenadas: ❌

- **Pedido #192** - Estado: `listo para entregar` ⚠️
  - **SIN delivery asignado** (`idDelivery: null`)
  - Sin coordenadas: ❌

**Pedidos Rechazados:**
- Pedidos #194, #191, #190, #189 - Estado: `rechazado por admin`

### **Usuarios Delivery:**
- ✅ `delivery1@test.com` (Juan Pérez) - 2 pedidos en camino
- ✅ `delivery2@test.com` (María González) - 1 pedido en camino
- ✅ `delivery3@test.com` (Carlos Rodríguez) - 0 pedidos

### **Problemas Identificados en Datos:**

1. **3 pedidos en estado "listo para entregar" SIN delivery asignado** ⚠️
   - Pedidos #195, #193, #192
   - Acción: El admin debe asignar un delivery a estos pedidos

2. **5 pedidos SIN coordenadas** ⚠️
   - Pedidos: #196, #193, #192, #191, #190
   - Impacto: El delivery no podrá usar "VER MAPA" ni navegación
   - Nota: Esto puede ser porque el cliente solo ingresó dirección manual sin marcar en el mapa

3. **Columna `tipo_pedido` NO EXISTE en `chat_rooms`** ❌ (Confirmado por error)
   - Error: `column cr.tipo_pedido does not exist`
   - Impacto: Chat delivery no funciona correctamente

4. **Tabla `pedidos_descuentos` NO EXISTE** ❌ (Confirmado por error)
   - Error: `relation "pedidos_descuentos" does not exist`
   - Impacto: Juegos se congelan al reclamar descuento

---

## ✅ **PRÓXIMOS PASOS**

### **PRIORIDAD CRÍTICA (Bloquean funcionalidad):**

1. ✅ **Tabla `pedidos_descuentos`** - **CREAR** (Confirmado que NO existe)
   - Script: `sql_crear_pedidos_descuentos.sql`

2. ✅ **Columna `tipo_pedido` en `chat_rooms`** - **AGREGAR** (Confirmado que NO existe)
   - Script: `sql_agregar_tipo_pedido_chat_rooms.sql`

3. ✅ **Índice `idx_chat_rooms_delivery_uid`** - **CREAR**
   - Incluido en el script anterior

### **PRIORIDAD MEDIA (Datos inconsistentes):**

4. ⚠️ **Asignar delivery a pedidos "listo para entregar"** (3 pedidos)
   - Pedidos #195, #193, #192 necesitan que el admin asigne un delivery

5. ⚠️ **Verificar coordenadas faltantes** (5 pedidos)
   - Los pedidos sin coordenadas pueden ser normales si el cliente solo ingresó dirección manual
   - No es crítico, pero afecta la funcionalidad de mapa

6. Revisar permisos RLS (Row Level Security) en Supabase para asegurar que delivery y clientes puedan leer/escribir

