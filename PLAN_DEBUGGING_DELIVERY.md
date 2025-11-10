# 🐛 PLAN DE DEBUGGING: Flujo Delivery Completo

## 📱 SETUP DE DISPOSITIVOS

### **Configuración Recomendada:**
1. **Localhost (Chrome Desktop):** Usuario **Admin**
2. **Teléfono 1 (Chrome DevTools Remote):** Usuario **Cliente**
3. **Teléfono 2 (Chrome DevTools Remote):** Usuario **Delivery**

### **Cómo conectar Chrome DevTools a MÚLTIPLES teléfonos:**

#### **PASO 1: Habilitar Depuración USB en ambos teléfonos**

**Teléfono 1 y Teléfono 2:**
1. Ir a `Configuración` → `Acerca del teléfono`
2. Presionar 7 veces sobre "Número de compilación" (activar opciones de desarrollador)
3. Volver a `Configuración` → `Opciones de desarrollador`
4. Activar **"Depuración USB"**
5. Activar **"Permitir siempre desde este equipo"** (cuando aparezca el diálogo)

#### **PASO 2: Conectar teléfonos a la PC**

1. Conectar **Teléfono 1** por USB
2. Aceptar el diálogo de "Permitir depuración USB" en el teléfono
3. Conectar **Teléfono 2** por USB
4. Aceptar el diálogo de "Permitir depuración USB" en el teléfono

#### **PASO 3: Abrir Chrome DevTools para cada dispositivo**

1. Abrir Chrome Desktop en la PC
2. Ir a `chrome://inspect/#devices`
3. Deberías ver algo como:

```
Devices:
✅ [Teléfono 1] - Android Device
   📱 Chrome - file:///.../index.html
   🔗 inspect

✅ [Teléfono 2] - Android Device  
   📱 Chrome - file:///.../index.html
   🔗 inspect
```

4. **Hacer clic en "inspect" del Teléfono 1** → Se abre una ventana de DevTools
5. **Hacer clic en "inspect" del Teléfono 2** → Se abre OTRA ventana de DevTools

**Resultado:** Tendrás 3 ventanas de Chrome DevTools:
- **Ventana 1:** Teléfono 1 (Cliente) - **Mantener abierta**
- **Ventana 2:** Teléfono 2 (Delivery) - **Mantener abierta**
- **Ventana 3:** Localhost (Admin) - Abrir con `F12` en la ventana del navegador

#### **PASO 4: Organizar las ventanas (Recomendado)**

**Para mejor visualización:**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  LOCALHOST      │  │  TELÉFONO 1     │  │  TELÉFONO 2     │
│  (Admin)        │  │  (Cliente)      │  │  (Delivery)     │
│                 │  │                 │  │                 │
│  DevTools F12   │  │  DevTools       │  │  DevTools       │
│  (ventana app)  │  │  (inspect)      │  │  (inspect)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Alternativa con 2 pantallas:**
- Pantalla 1: Localhost (Admin)
- Pantalla 2: Teléfono 1 (Cliente) y Teléfono 2 (Delivery) lado a lado

#### **PASO 5: Verificar conexión**

En cada ventana de DevTools:
1. Ir a la pestaña **Console**
2. Verificar que los logs aparecen
3. Probar escribir `console.log('Test desde [dispositivo]')` y verificar que aparece

**Si no ves los dispositivos:**
- Verificar que la depuración USB está activada
- Reiniciar Chrome Desktop
- Desconectar y reconectar los USB
- Verificar que los drivers USB están instalados

#### **PASO 6: Alternativa - WiFi Debugging (si USB no funciona)**

**Para cada teléfono:**
1. Conectar teléfono y PC a la misma red WiFi
2. En Chrome Desktop: `chrome://inspect/#devices`
3. Activar **"Discover USB devices"** (también funciona por WiFi)
4. En el teléfono: Ir a `chrome://inspect` (en Chrome del teléfono)
5. Verificar que aparece en la lista de dispositivos

**Nota:** WiFi debugging puede ser más lento que USB, pero es útil si tienes problemas con USB.

---

## 🔍 FLUJO COMPLETO DE DEBUGGING

**IMPORTANTE:** Mantén las 3 ventanas de DevTools abiertas simultáneamente:
- Localhost (Admin)
- Teléfono 1 (Cliente)
- Teléfono 2 (Delivery)

---

### **PASO 1: Cliente hace pedido delivery**

**Dispositivo:** Teléfono 1 (Cliente)

**En Chrome DevTools Console (ventana del Teléfono 1), buscar:**
```
[ClienteRealizaPedidoComponent]
```

**Verificar:**
1. ✅ `tipoPedido` se establece como `'delivery'`
2. ✅ `direccionDelivery` se captura correctamente
3. ✅ `crearPedido()` se llama con `tipoPedido: 'delivery'`
4. ✅ Pedido se crea en BD con `tipo_pedido: 'delivery'`

**En Network tab:**
- Filtrar por `pedidos`
- Verificar que el `INSERT` incluye `tipo_pedido: 'delivery'` y `direccion_entrega`

**En Supabase Dashboard:**
- Verificar que el pedido se creó con estado `'pendiente'`
- Verificar que `tipo_pedido = 'delivery'`
- Verificar que `direccion_entrega` está presente

---

### **PASO 2: Admin acepta pedido**

**Dispositivo:** Localhost (Admin)

**En Chrome DevTools Console (ventana de Localhost), buscar:**
```
[AdminDeliveryPedidosService]
[AdminDeliveryPedidosComponent]
```

**Verificar:**
1. ✅ Admin puede ver el pedido en "Pendientes"
2. ✅ Push notification llega al admin
3. ✅ Al confirmar, se muestra `AlertController` para tiempo estimado
4. ✅ `confirmarPedidoDelivery()` se ejecuta con `tiempoEstimado`
5. ✅ Pedido se actualiza a estado `'pedido en curso'`

**En Network tab:**
- Filtrar por `pedidos`
- Verificar que el `UPDATE` incluye:
  - `estado: 'pedido en curso'`
  - `tiempo_estimado: [valor ingresado]`

**En Supabase Dashboard:**
- Verificar que el pedido cambió a `estado: 'pedido en curso'`
- Verificar que `tiempo_estimado` tiene el valor ingresado

---

### **PASO 3: Admin asigna delivery**

**Dispositivo:** Localhost (Admin)

**En Chrome DevTools Console (ventana de Localhost), buscar:**
```
[AdminDeliveryPedidosService] asignarPedidoADelivery
[SelectDeliveryComponent]
```

**Verificar:**
1. ✅ Pedido aparece en "Listos para Entregar"
2. ✅ Al seleccionar "Asignar Delivery", se muestra modal con lista de delivery
3. ✅ Al seleccionar un delivery, se ejecuta `asignarPedidoADelivery()`
4. ✅ No hay error `PGRST204` (columna idDelivery no existe)

**En Network tab:**
- Filtrar por `pedidos`
- Verificar que el `UPDATE` incluye:
  - `estado: 'asignado a delivery'`
  - `idDelivery: [UUID del delivery seleccionado]`

**En Supabase Dashboard:**
- Verificar que el pedido tiene `idDelivery` asignado
- Verificar que el estado es `'asignado a delivery'`

---

### **PASO 4: Delivery confirma recepción**

**Dispositivo:** Teléfono 2 (Delivery)

**En Chrome DevTools Console (ventana del Teléfono 2), buscar:**
```
[HomeDeliveryComponent]
[DeliveryPedidosService] confirmarRecepcionPedido
```

**Verificar:**
1. ✅ Delivery ve el pedido en "Asignados"
2. ✅ Push notification llega al delivery
3. ✅ Al presionar "Confirmar Recepción", se ejecuta correctamente
4. ✅ Pedido se mueve a "En Camino"

**En Network tab:**
- Filtrar por `pedidos`
- Verificar que el `UPDATE` cambia estado a `'confirmado por delivery'`

**En Supabase Dashboard:**
- Verificar que el estado es `'confirmado por delivery'`

---

### **PASO 5: Cocinero/Bartender termina preparación**

**Dispositivo:** Localhost (Admin) - Simular desde Supabase

**En Supabase Dashboard:**
- Ir a tabla `pedidos`
- Buscar el pedido delivery
- Cambiar `estado` a `'listo para entregar'`

**Verificar:**
1. ✅ Admin recibe push notification: "Listo pedido delivery Nºxxx"
2. ✅ El pedido aparece en "Listos para Entregar" del admin

---

### **PASO 6: Cliente accede a juegos**

**Dispositivo:** Teléfono 1 (Cliente)

**En Chrome DevTools Console (ventana del Teléfono 1), buscar:**
```
[TAP] o [MEMORIA] o [DEBUG TRIVIA]
[SupabaseService] yaSeAplicoDescuento
```

**Verificar:**
1. ✅ Cliente puede acceder a juegos (después de que admin acepte)
2. ✅ Al terminar juego, se muestra descuento
3. ✅ Al presionar "Reclamar descuento", se ejecuta `claim()`
4. ✅ No se congela la app
5. ✅ Se llama a RPC `claim_game_discount`

**En Network tab:**
- Filtrar por `rpc/claim_game_discount`
- Verificar que se envía:
  - `p_pedido_id: [número]`
  - `p_juego: 'tap'/'memoria'/'trivia'`
  - `p_score: [número]`
- Verificar la respuesta:
  - `applied: true/false`
  - `pct: [número]`
  - `reason: [string]`

**En Supabase Dashboard:**
- Verificar que el pedido tiene:
  - `descuento_pct > 0` (si aplicó)
  - `juego_premio_reclamado: true` (si aplicó)

**Errores comunes a buscar:**
- ❌ "Error al verificar descuento aplicado" → Revisar `yaSeAplicoDescuento()`
- ❌ "Error en RPC" → Verificar función `claim_game_discount` en Supabase
- ❌ "No se aplicó descuento" con `reason` → Verificar lógica del RPC

---

### **PASO 7: Cliente intenta chatear**

**Dispositivo:** Teléfono 1 (Cliente)

**En Chrome DevTools Console (ventana del Teléfono 1), buscar:**
```
[ChatComponent] ===== INICIANDO CREACIÓN/OBTENCIÓN DE SALA =====
[ChatService] ===== INICIANDO ensureRoomByPedidoDelivery =====
```

**Verificar:**
1. ✅ Cliente puede presionar botón "Consultas al repartidor"
2. ✅ Se consulta el pedido y se detecta `tipo_pedido: 'delivery'`
3. ✅ Se verifica que `idDelivery` existe
4. ✅ Se llama a `ensureRoomByPedidoDelivery()`
5. ✅ Se crea/obtiene la sala de chat
6. ✅ Se suscribe a mensajes

**En Network tab:**
- Filtrar por `chat_rooms`
- Verificar que se consulta por `pedido_id`
- Si se crea nueva sala, verificar que el `INSERT` incluye:
  - `tipo_pedido: 'delivery'`
  - `delivery_uid: [UUID]`
  - `cliente_uid: [UUID]`
  - `mesa_num: null`

**En Supabase Dashboard:**
- Verificar que existe una fila en `chat_rooms` con:
  - `pedido_id = [ID del pedido]`
  - `tipo_pedido = 'delivery'`
  - `delivery_uid = [UUID del delivery]`

**Errores comunes a buscar:**
- ❌ "Pedido delivery SIN repartidor asignado" → Verificar que admin asignó delivery
- ❌ "Error al crear sala de chat delivery" → Verificar permisos RLS
- ❌ "column tipo_pedido does not exist" → Ejecutar `sql_agregar_tipo_pedido_chat_rooms.sql`

---

### **PASO 8: Cliente envía mensaje**

**Dispositivo:** Teléfono 1 (Cliente)

**En Chrome DevTools Console (ventana del Teléfono 1), buscar:**
```
[ChatComponent] 📤 Intentando enviar mensaje
[ChatService] 📤 ===== INICIANDO ENVÍO DE MENSAJE =====
```

**Verificar:**
1. ✅ Cliente puede escribir mensaje
2. ✅ Al enviar, se ejecuta `send()`
3. ✅ Mensaje se inserta en BD
4. ✅ Mensaje aparece en la UI

**En Network tab:**
- Filtrar por `chat_messages`
- Verificar que el `INSERT` incluye:
  - `room_id: [número]`
  - `from_uid: [UUID del cliente]`
  - `text: [mensaje]`

**En Supabase Dashboard:**
- Verificar que el mensaje se insertó en `chat_messages`

---

### **PASO 9: Delivery recibe mensaje**

**Dispositivo:** Teléfono 2 (Delivery)

**IMPORTANTE:** Observa AMBAS ventanas de DevTools simultáneamente:
- **Teléfono 1 (Cliente):** Verás logs de envío
- **Teléfono 2 (Delivery):** Verás logs de recepción

**En Chrome DevTools Console (ventana del Teléfono 2), buscar:**
```
[DeliveryRealtimeService] 📨 Nuevo mensaje detectado
[DeliveryRealtimeService] ✅ Sala de delivery encontrada
```

**Verificar:**
1. ✅ Delivery recibe push notification del mensaje
2. ✅ Al abrir el chat, ve el mensaje del cliente
3. ✅ La suscripción realtime está activa

**En Network tab:**
- Verificar que hay suscripción activa al canal `delivery_chat_[UUID]`

**Errores comunes a buscar:**
- ❌ "Mensaje no pertenece a sala de delivery asignada" → Verificar `delivery_uid` en `chat_rooms`
- ❌ No llega push notification → Verificar permisos de notificaciones en el dispositivo
- ❌ No se suscribe al canal → Verificar que `DeliveryRealtimeService.init()` se ejecutó

---

### **PASO 10: Delivery envía mensaje**

**Dispositivo:** Teléfono 2 (Delivery)

**IMPORTANTE:** Observa AMBAS ventanas de DevTools simultáneamente:
- **Teléfono 2 (Delivery):** Verás logs de envío
- **Teléfono 1 (Cliente):** Verás logs de recepción en tiempo real

**En Chrome DevTools Console (ventana del Teléfono 2), verificar:**
1. ✅ Delivery puede escribir y enviar mensaje
2. ✅ Cliente recibe el mensaje en tiempo real

**En Network tab:**
- Verificar `INSERT` en `chat_messages`
- Verificar que `from_uid` es el UUID del delivery

---

### **PASO 11: Delivery intenta entregar pedido**

**Dispositivo:** Teléfono 2 (Delivery)

**En Chrome DevTools Console (ventana del Teléfono 2), buscar:**
```
[HomeDeliveryComponent] Entregando pedido
[DeliveryPedidosService] ===== INICIANDO entregarPedidoAlCliente =====
```

**Verificar:**
1. ✅ Delivery ve el pedido en "En Camino"
2. ✅ Al presionar "ENTREGAR AL CLIENTE", se ejecuta `procesarEntrega()`
3. ✅ Se llama a `entregarPedidoAlCliente()`
4. ✅ Se verifica que el pedido existe y está asignado
5. ✅ Se actualiza el estado a `'entregado'`

**En Network tab:**
- Filtrar por `pedidos`
- Verificar que el `UPDATE` incluye:
  - `estado: 'entregado'`
  - Filtros: `.eq('id', pedidoId).eq('idDelivery', idDelivery).eq('tipo_pedido', 'delivery')`

**En Supabase Dashboard:**
- Verificar que el estado cambió a `'entregado'`

**Errores comunes a buscar:**
- ❌ "No se pudo actualizar el pedido" → Verificar permisos RLS
- ❌ "El pedido no está asignado a este delivery" → Verificar que `idDelivery` coincide
- ❌ "Este pedido no es de tipo delivery" → Verificar `tipo_pedido` en BD

---

### **PASO 12: Cliente confirma recepción**

**Dispositivo:** Teléfono 1 (Cliente)

**En Chrome DevTools Console (ventana del Teléfono 1), buscar:**
```
[ClientePedidoEnCurso] Confirmando recepción del pedido delivery
```

**Verificar:**
1. ✅ Cliente ve el botón "Confirmar Recepción del Pedido"
2. ✅ Al presionar, se ejecuta `confirmarRecepcionDelivery()`
3. ✅ Se verifica que el estado es `'entregado'`
4. ✅ Se envía notificación al delivery
5. ✅ Se habilita acceso a juegos, encuesta y cuenta

**En Network tab:**
- Verificar que se envía broadcast a canal `notificacion_delivery_recepcion_[UUID]`

---

## 📊 CHECKLIST DE VERIFICACIÓN

### **Descuentos:**
- [ ] Cliente puede jugar después de que admin acepte
- [ ] Al reclamar descuento, no se congela
- [ ] RPC `claim_game_discount` se ejecuta correctamente
- [ ] `descuento_pct` se actualiza en `pedidos`
- [ ] `juego_premio_reclamado` se actualiza a `true`
- [ ] Solo se puede reclamar una vez (sin importar el juego)

### **Chat:**
- [ ] Cliente puede abrir chat después de que admin asigne delivery
- [ ] Sala de chat se crea correctamente con `tipo_pedido: 'delivery'`
- [ ] Cliente puede enviar mensajes
- [ ] Delivery recibe push notification de nuevos mensajes
- [ ] Delivery puede ver y responder mensajes
- [ ] Cliente recibe mensajes del delivery en tiempo real
- [ ] Delivery puede ver sus chats en pestaña "Consultas"

### **Entrega:**
- [ ] Delivery puede ver pedidos "En Camino"
- [ ] Al presionar "ENTREGAR AL CLIENTE", se actualiza el estado
- [ ] No hay errores de permisos RLS
- [ ] El pedido se actualiza correctamente en BD

---

## 🔧 HERRAMIENTAS DE CHROME DEVTOOLS

### **Console Tab (en cada ventana de DevTools):**

**Para Teléfono 1 (Cliente):**
- Filtrar por `[TAP]`, `[MEMORIA]`, `[DEBUG TRIVIA]` para juegos
- Filtrar por `[ChatService]`, `[ChatComponent]` para chat
- Filtrar por `[ClientePedidoEnCurso]` para recepción

**Para Teléfono 2 (Delivery):**
- Filtrar por `[ChatService]`, `[ChatComponent]` para chat
- Filtrar por `[DeliveryPedidosService]` para entrega
- Filtrar por `[DeliveryRealtimeService]` para notificaciones
- Filtrar por `[HomeDeliveryComponent]` para acciones

**Para Localhost (Admin):**
- Filtrar por `[AdminDeliveryPedidosService]` para gestión
- Filtrar por `[AdminRealtimeService]` para notificaciones

**Tip:** Usar `console.clear()` antes de cada prueba en cada ventana

### **Network Tab:**
- Filtrar por `pedidos` para ver operaciones de pedidos
- Filtrar por `chat_rooms` para ver operaciones de chat
- Filtrar por `rpc/claim_game_discount` para ver llamadas RPC
- Verificar Status codes (200 = OK, 4xx = error cliente, 5xx = error servidor)
- Ver Request Payload y Response

### **Application Tab:**
- **Local Storage:** Verificar datos de sesión
- **IndexedDB:** Verificar caché de Supabase
- **Service Workers:** Verificar notificaciones push

### **Sources Tab (en cada ventana de DevTools):**

**Para Teléfono 1 (Cliente):**
- Poner breakpoints en:
  - `claim()` en juegos (tap.component.ts, memoria.component.ts, trivia.component.ts)
  - `ensureRoomByPedidoDelivery()` en ChatComponent

**Para Teléfono 2 (Delivery):**
- Poner breakpoints en:
  - `entregarPedidoAlCliente()` en DeliveryPedidosService
  - `irAChat()` en HomeDeliveryComponent

**Para Localhost (Admin):**
- Poner breakpoints en:
  - `confirmarPedidoDelivery()` en AdminDeliveryPedidosService
  - `asignarPedidoADelivery()` en AdminDeliveryPedidosService

**Tip:** Puedes tener breakpoints activos en múltiples ventanas simultáneamente

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### **Error: "Error al verificar descuento aplicado"**
**Causa:** `yaSeAplicoDescuento()` falla al consultar `pedidos`
**Solución:** Verificar que el `pedidoId` es válido y que el pedido existe

### **Error: "El chat estará disponible cuando se asigne un repartidor"**
**Causa:** `idDelivery` es `null` en el pedido
**Solución:** Admin debe asignar un delivery al pedido

### **Error: "column tipo_pedido does not exist"**
**Causa:** No se ejecutó `sql_agregar_tipo_pedido_chat_rooms.sql`
**Solución:** Ejecutar el script SQL

### **Error: "No se pudo actualizar el pedido"**
**Causa:** Permisos RLS bloqueando UPDATE
**Solución:** Verificar políticas RLS en Supabase para tabla `pedidos` y perfil `delivery`

### **Error: RPC `claim_game_discount` falla**
**Causa:** Función RPC no existe o tiene errores
**Solución:** Verificar que la función existe en Supabase y funciona correctamente

---

## 📝 NOTAS IMPORTANTES

1. **Mantener las 3 ventanas de DevTools abiertas simultáneamente** durante todo el flujo
2. **Siempre limpiar la consola** antes de cada prueba (en cada ventana)
3. **Guardar screenshots** de errores importantes (de la ventana correspondiente)
4. **Copiar logs completos** de errores críticos (indicar de qué dispositivo)
5. **Verificar en Supabase Dashboard** después de cada operación
6. **Probar un flujo completo** sin interrupciones
7. **Observar logs en múltiples ventanas** simultáneamente para ver la comunicación entre dispositivos
8. **Nombrar las ventanas** (arrastrar la pestaña para renombrar) para no confundirlas:
   - "DevTools - Cliente"
   - "DevTools - Delivery"
   - "DevTools - Admin"

---

## ✅ ORDEN DE PRUEBA RECOMENDADO

1. **Primero:** Probar descuentos (más simple, solo cliente)
2. **Segundo:** Probar chat (requiere cliente + delivery)
3. **Tercero:** Probar entrega (requiere cliente + delivery + admin)

Cada prueba debe ser **completa** y **aislada** para facilitar el debugging.

