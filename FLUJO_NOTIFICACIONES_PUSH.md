# 📱 FLUJO DE NOTIFICACIONES PUSH - El Tridente de la Gloria

## 📋 ÍNDICE
1. [CLIENTE](#cliente)
2. [MOZO](#mozo)
3. [BARTENDER/COCINERO](#bartendercocinero)
4. [MAITRE](#maitre)
5. [ADMIN](#admin)
6. [DELIVERY/REPARTIDOR](#deliveryrepartidor)

---

## 👤 CLIENTE

### **Servicio:** `ClienteRealtimeService`

### **Notificaciones que RECIBE el Cliente:**

#### 1. **Mesa Asignada** 🪑
- **Trigger:** UPDATE en `lista_espera` cuando `estado` cambia a `'asignado'`
- **Quién lo dispara:** Maitre o Admin al asignar mesa
- **Mensaje:** `"¡Tu mesa está lista! - Mesa N° X - Por favor acercate al restaurant"`
- **Ruta:** `/home-cliente`

#### 2. **Pedido Entregado (Mesa)** 🍽️
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'pendiente aceptación'` (solo mesa)
- **Quién lo dispara:** Mozo al entregar pedido
- **Mensaje:** `"🍽️ Pedido entregado - Mesa X - ¿El pedido está correcto? Total: $X"`
- **Ruta:** `/cliente-pedido-en-curso`

#### 3. **Pedido Rechazado por Mozo** ❌
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'rechazado por mozo'`
- **Quién lo dispara:** Mozo al rechazar pedido
- **Mensaje:** `"❌ Pedido rechazado - Mesa X - El mozo rechazó tu pedido. Puedes modificarlo y enviarlo nuevamente."`
- **Ruta:** `/cliente-pedido-en-curso`

#### 4. **Pedido Delivery Confirmado por Admin** ✅
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia de `'pendiente'` a `'pedido en curso'` (solo delivery)
- **Quién lo dispara:** Admin al aceptar pedido delivery
- **Mensaje:** `"✅ Pedido delivery confirmado - Tu pedido delivery ha sido confirmado. Tiempo estimado: X minutos"`
- **Ruta:** `/cliente-pedido-en-curso`

#### 5. **Pedido Delivery Rechazado por Admin** ❌
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'rechazado por admin'` (solo delivery)
- **Quién lo dispara:** Admin al rechazar pedido delivery
- **Mensaje:** `"❌ Pedido delivery rechazado - Tu pedido delivery fue rechazado. Por favor, contacta al restaurante."`
- **Ruta:** `/home-cliente`

#### 6. **Pedido Delivery Asignado a Repartidor** 🚚
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'asignado a delivery'` (solo delivery)
- **Quién lo dispara:** Admin al asignar repartidor
- **Mensaje:** `"🚚 Pedido asignado a repartidor - Tu pedido delivery fue asignado a un repartidor. Pronto estará en camino."`
- **Ruta:** `/cliente-pedido-en-curso`

#### 7. **Repartidor en Camino** 📦
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'confirmado por delivery'` (solo delivery, verifica cambio real de estado)
- **Quién lo dispara:** Delivery al confirmar recepción del pedido
- **Mensaje:** `"📦 Repartidor en camino - El repartidor confirmó la recepción de tu pedido. Está en camino hacia tu dirección."`
- **Ruta:** `/cliente-pedido-en-curso`

#### 8. **Pedido Delivery Entregado** ✅
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'entregado'` (solo delivery, verifica cambio real de estado)
- **Quién lo dispara:** Delivery al confirmar entrega
- **Mensaje:** `"✅ Pedido delivery entregado - Tu pedido delivery fue entregado exitosamente. ¡Disfrutá tu comida!"`
- **Ruta:** `/cliente-pedido-en-curso`

#### 9. **Pago Confirmado** 💳
- **Trigger:** Broadcast `'pago_confirmado'` en canal `'notificacion_cliente_pago'`
- **Quién lo dispara:** Mozo (mesa) o Admin (delivery) al confirmar pago
- **Mensaje:** `"✅ Pago confirmado - Mesa X"` o `"✅ Pago confirmado - Delivery #X"`
- **Ruta:** `/home-cliente`

#### 10. **Factura Lista** 🧾
- **Trigger:** Broadcast `'factura_lista'` en canal `'notificacion_cliente_factura_{userId}'`
- **Quién lo dispara:** Función Supabase `generar-factura` (para clientes anónimos)
- **Mensaje:** `"Tu factura está lista - Descárgala tocando aquí"`
- **Ruta:** `/home-cliente`

#### 11. **Respuesta del Mozo/Repartidor (Chat)** 💬
- **Trigger:** INSERT en `chat_messages` cuando mozo/delivery responde
- **Quién lo dispara:** Mozo o Delivery al enviar mensaje en chat
- **Mensaje:** `"💬 Respuesta del mozo - Mesa X"` o `"💬 Respuesta del repartidor - Delivery #X"`
- **Ruta:** `/cliente/chat`

---

## 🍽️ MOZO

### **Servicio:** `MozoRealtimeService` + `MozoChatRealtimeService`

### **Notificaciones que RECIBE el Mozo:**

#### 1. **Nuevo Pedido Pendiente** 🍽️
- **Trigger:** UPDATE/INSERT en `pedidos` cuando `estado` es `'pendiente'` (solo mesa, con total > 0)
- **Quién lo dispara:** Cliente al realizar pedido
- **Mensaje:** `"🍽️ Nuevo pedido - Mesa X - Nuevo pedido recibido. Requiere confirmación."`
- **Ruta:** `/mozo/home`

#### 2. **Pedido Modificado y Reenviado** 🔄
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia de `'rechazado por mozo'` a `'pendiente'`
- **Quién lo dispara:** Cliente al modificar y reenviar pedido rechazado
- **Mensaje:** `"🔄 Pedido modificado - Mesa X - Cliente modificó y reenvió el pedido. Requiere confirmación."`
- **Ruta:** `/mozo/home`

#### 3. **Pedido Listo para Entregar** ✅
- **Trigger:** UPDATE en `pedidos` cuando:
  - `estado` cambia a `'listo para entregar'` O
  - `estado_sector_cocina` cambia a `'listo para entregar'` O
  - `estado_sector_bar` cambia a `'listo para entregar'` O
  - `estado` cambia a `'en preparación parcial'`
  - **IMPORTANTE:** Solo notifica cuando TODOS los sectores involucrados están listos
- **Quién lo dispara:** Bartender/Cocinero al marcar productos listos
- **Mensaje:** `"🍽️ Pedido listo - Mesa X - Pedido listo para entregar."`
- **Ruta:** `/mozo/home`

#### 4. **Pedido Aceptado por Cliente** ✅
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia de `'pendiente aceptación'` a `'entregado'`
- **Quién lo dispara:** Cliente al aceptar pedido entregado
- **Mensaje:** `"✅ PEDIDO ACEPTADO - Mesa X - El cliente confirmó la entrega correcta"`
- **Ruta:** `/mozo/home`

#### 5. **Pago Realizado por Cliente** 💳
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'pendiente confirmacion pago'` (solo mesa)
- **Quién lo dispara:** Cliente al solicitar cuenta y realizar pago
- **Mensaje:** `"💳 PAGO REALIZADO - Mesa X - Cliente realizó el pago. Requiere confirmación del mozo."`
- **Ruta:** `/mozo/confirmar-pago`
- **NOTA:** Se bloquea si el mozo está confirmando un pago (`mozoConfirmandoPago = true`)

#### 6. **Solicitud de Cuenta** 💳
- **Trigger:** Broadcast `'solicitud_cuenta'` en canal `'solicitud_cuenta_mozo'`
- **Quién lo dispara:** Cliente al presionar botón "PEDIR CUENTA"
- **Mensaje:** `"💳 Solicitud de cuenta - Mesa X - [mensaje del cliente]"`
- **Ruta:** `/mozo/confirmar-pago`
- **NOTA:** Se bloquea si el mozo está confirmando un pago

#### 7. **Nueva Consulta del Cliente (Chat)** 💬
- **Trigger:** INSERT en `chat_messages` cuando cliente envía mensaje (con `from_email`)
- **Quién lo dispara:** Cliente al enviar mensaje en chat
- **Mensaje:** `"💬 Nueva consulta - Mesa X - [fecha formateada]"`
- **Ruta:** `/mozo/chat`
- **NOTA:** Se envía a TODOS los mozos

---

## 🍺 BARTENDER/COCINERO

### **Servicio:** `BartenderCocineroRealtimeService`

### **Notificaciones que RECIBE Bartender/Cocinero:**

#### 1. **Nuevo Pedido en Curso** 🍽️
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'pedido en curso'` (mesa o delivery)
- **Quién lo dispara:** 
  - **Mesa:** Mozo al confirmar pedido
  - **Delivery:** Admin al aceptar pedido delivery
- **Mensaje:** 
  - Mesa: `"🍽️ Nuevo pedido en curso - Mesa X - Total: $X - Tiempo: X min"`
  - Delivery: `"🍽️ Nuevo pedido en curso - Delivery #X - Total: $X - Tiempo: X min"`
- **Ruta:** `/bartender-cocinero/home`

---

## 🎩 MAITRE

### **Servicio:** `MaitreRealtimeService`

### **Notificaciones que RECIBE el Maitre:**

#### 1. **Nuevo Cliente en Lista de Espera** 👥
- **Trigger:** 
  - INSERT en `lista_espera` cuando `estado` es `'esperando'` O
  - UPDATE en `lista_espera` cuando `estado` cambia a `'esperando'`
- **Quién lo dispara:** Cliente al registrarse en lista de espera
- **Mensaje:** `"Nuevo Cliente en lista de espera!! - (X comensales) esperando ingresar"`
- **Ruta:** (No especificada, probablemente `/maitre/lista-espera`)

---

## 👔 ADMIN

### **Servicio:** `AdminRealtimeService` + `AdminReservasRealtimeService`

### **Notificaciones que RECIBE el Admin:**

#### 1. **Mesa Liberada (Pago Realizado)** 💰
- **Trigger:** Broadcast `'mesa_liberada'` en canal `'notificacion_admin_pago'`
- **Quién lo dispara:** Mozo al confirmar pago de mesa
- **Mensaje:** `"💰 Pago realizado - Mesa X - [mensaje]"`
- **Ruta:** `/home-admin`

#### 2. **Nuevo Pedido Delivery Pendiente** 🚴
- **Trigger:** INSERT en `pedidos` cuando `tipo_pedido = 'delivery'` y `estado = 'pendiente'`
- **Quién lo dispara:** Cliente al realizar pedido delivery
- **Mensaje:** `"🚴 Nuevo pedido delivery #X - Cliente: [email] - Total: $X"`
- **Ruta:** `/admin/delivery-pedidos`

#### 3. **Pedido Delivery Listo para Entregar** ✅
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'listo para entregar'` (solo delivery)
- **Quién lo dispara:** Bartender/Cocinero al marcar productos listos
- **Mensaje:** `"✅ Listo pedido delivery NºX - El pedido está listo para asignar a un delivery"`
- **Ruta:** `/admin/delivery-pedidos` (tab: `'listos'`)

#### 4. **Solicitud de Cuenta Delivery** 💳
- **Trigger:** Broadcast `'solicitud_cuenta_delivery'` en canal `'notificacion_admin_delivery'`
- **Quién lo dispara:** Cliente al solicitar cuenta de pedido delivery
- **Mensaje:** `"💳 Solicitud de cuenta - Delivery #X - [mensaje]"`
- **Ruta:** `/admin/delivery-confirmar-pago`

#### 5. **Nueva Reserva Creada** 📅
- **Trigger:** INSERT en `reservas` cuando `estado = 'pendiente confirmacion'`
- **Quién lo dispara:** Cliente al crear reserva
- **Mensaje:** `"📅 Nueva Reserva Creada - [nombre] - [fecha] a las [hora] ([cant] personas)"`
- **Ruta:** `/admin/reservas`

---

## 🚚 DELIVERY/REPARTIDOR

### **Servicio:** `DeliveryRealtimeService`

### **Notificaciones que RECIBE el Delivery:**

#### 1. **Nuevo Pedido Asignado** 🚚
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'asignado a delivery'` y `idDelivery = [idDelivery actual]`
- **Quién lo dispara:** Admin al asignar pedido a repartidor
- **Mensaje:** `"🚚 Nuevo pedido asignado #X - Cliente: [email] - Dirección: [dirección] - Total: $X"`
- **Ruta:** `/home-delivery`

#### 2. **Pago Pendiente de Confirmación** 💰
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'pendiente confirmacion pago'` (solo delivery asignado)
- **Quién lo dispara:** Cliente al solicitar cuenta de pedido delivery
- **Mensaje:** `"💰 Pago pendiente - Pedido #X - El cliente solicita confirmar el pago"`
- **Ruta:** `/home-delivery`

#### 3. **Pago Confirmado por Admin** ✅
- **Trigger:** UPDATE en `pedidos` cuando `estado` cambia a `'pagado'` (solo delivery asignado)
- **Quién lo dispara:** Admin al confirmar pago de delivery
- **Mensaje:** `"✅ Pago confirmado - Pedido #X - El pago del cliente ha sido confirmado por el admin"`
- **Ruta:** `/home-delivery`

#### 4. **Mensaje del Cliente (Chat)** 💬
- **Trigger:** INSERT en `chat_messages` cuando cliente envía mensaje en sala de delivery
- **Quién lo dispara:** Cliente al enviar mensaje en chat de delivery
- **Mensaje:** `"💬 Mensaje del cliente - Pedido #X - [cliente] - [fecha]"`
- **Ruta:** `/delivery/chat`
- **NOTA:** Solo para pedidos asignados a este delivery

---

## 🔄 RESUMEN DE FLUJOS PRINCIPALES

### **FLUJO MESA:**
1. Cliente realiza pedido → **Mozo** recibe notificación
2. Mozo confirma pedido → **Bartender/Cocinero** recibe notificación
3. Bartender/Cocinero marca listo → **Mozo** recibe notificación
4. Mozo entrega pedido → **Cliente** recibe notificación
5. Cliente acepta pedido → **Mozo** recibe notificación
6. Cliente solicita cuenta → **Mozo** recibe notificación
7. Mozo confirma pago → **Admin** recibe notificación + **Cliente** recibe notificación

### **FLUJO DELIVERY:**
1. Cliente realiza pedido delivery → **Admin** recibe notificación
2. Admin acepta pedido → **Cliente** recibe notificación + **Bartender/Cocinero** recibe notificación
3. Bartender/Cocinero marca listo → **Admin** recibe notificación
4. Admin asigna repartidor → **Cliente** recibe notificación + **Delivery** recibe notificación
5. Delivery confirma recepción → **Cliente** recibe notificación
6. Delivery confirma entrega → **Cliente** recibe notificación
7. Cliente solicita cuenta → **Admin** recibe notificación + **Delivery** recibe notificación
8. Admin confirma pago → **Cliente** recibe notificación + **Delivery** recibe notificación

### **FLUJO LISTA DE ESPERA:**
1. Cliente se registra en lista → **Maitre** recibe notificación
2. Maitre asigna mesa → **Cliente** recibe notificación

### **FLUJO RESERVAS:**
1. Cliente crea reserva → **Admin** recibe notificación

### **FLUJO CHAT:**
1. Cliente envía mensaje (mesa) → **Mozo** recibe notificación (todos los mozos)
2. Mozo responde → **Cliente** recibe notificación
3. Cliente envía mensaje (delivery) → **Delivery** recibe notificación
4. Delivery responde → **Cliente** recibe notificación

---

## 📝 NOTAS IMPORTANTES

1. **Bloqueo de Notificaciones:** El mozo puede bloquear notificaciones cuando está confirmando un pago usando `setMozoConfirmandoPago(true)`

2. **Verificación de Cambio de Estado:** Para pedidos delivery, se verifica que el estado REALMENTE cambió (no solo otros campos como `total` o `descuento_pct`) para evitar notificaciones falsas cuando se aplican descuentos.

3. **Filtros por Tipo de Pedido:** Muchas notificaciones filtran por `tipo_pedido` para distinguir entre pedidos de mesa y delivery.

4. **Canales de Notificación:** Cada servicio crea sus propios canales de notificaciones locales con IDs específicos.

5. **Broadcast vs Postgres Changes:** 
   - `postgres_changes` se usa para cambios en tablas
   - `broadcast` se usa para eventos personalizados entre componentes

---

## 🔍 COMPONENTES QUE DISPARAN NOTIFICACIONES

### **Cliente:**
- `cliente-realiza-pedido`: Crea pedido → notifica a Mozo/Admin
- `cliente-detalle-cuenta`: Solicita cuenta → notifica a Mozo/Admin
- `cliente-pedido-en-curso`: Acepta/rechaza pedido → notifica a Mozo
- `registro-cliente`: Se registra en lista → notifica a Maitre
- `chat`: Envía mensaje → notifica a Mozo/Delivery

### **Mozo:**
- `confirmar-pago`: Confirma pago → notifica a Cliente y Admin
- `home-mozo`: Confirma pedido → notifica a Bartender/Cocinero
- `chat`: Responde mensaje → notifica a Cliente

### **Admin:**
- `delivery-pedidos`: Acepta/rechaza pedido delivery → notifica a Cliente
- `delivery-pedidos`: Asigna repartidor → notifica a Cliente y Delivery
- `delivery-confirmar-pago`: Confirma pago delivery → notifica a Cliente y Delivery

### **Bartender/Cocinero:**
- `home-bartender-cocinero`: Marca productos listos → notifica a Mozo/Admin

### **Maitre:**
- `lista-espera`: Asigna mesa → notifica a Cliente

### **Delivery:**
- `home-delivery`: Confirma recepción → notifica a Cliente
- `home-delivery`: Confirma entrega → notifica a Cliente
- `chat`: Responde mensaje → notifica a Cliente

---

**Última actualización:** 2025-01-XX
**Versión:** 1.0

