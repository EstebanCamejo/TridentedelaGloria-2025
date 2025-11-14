# 📋 FLUJO COMPLETO DE ESTADOS DE PEDIDOS

Este documento describe todos los estados posibles de un pedido, cómo se transicionan entre ellos, y cómo afectan a cada tipo de usuario del sistema.

---

## 🍽️ PEDIDOS DE MESA

### Estados y Transiciones

```
1. 'pendiente' 
   ↓ (Mozo confirma)
2. 'pedido en curso'
   ↓ (Cocinero/Bartender acepta)
3. 'en preparación' o 'en preparación parcial'
   ↓ (Cocinero/Bartender marca listo)
4. 'listo para entregar'
   ↓ (Mozo entrega)
5. 'pendiente aceptación'
   ↓ (Cliente acepta)
6. 'entregado'
   ↓ (Cliente pide cuenta)
7. 'pendiente confirmacion pago'
   ↓ (Mozo confirma pago)
8. 'pagado'
```

### Detalle por Estado

#### 1. **'pendiente'** (Estado Inicial)
- **Quién lo crea:** Cliente al realizar pedido
- **Quién lo ve:**
  - ✅ **Mozo:** Ve en lista de pedidos pendientes
  - ❌ Cliente: No ve (está esperando confirmación)
  - ❌ Cocinero/Bartender: No ve
  - ❌ Admin: No ve
- **Acciones disponibles:**
  - **Mozo:** Puede confirmar o rechazar
- **Notificaciones:**
  - **Mozo:** Notificación push cuando se crea nuevo pedido pendiente
- **Transiciones posibles:**
  - → `'pedido en curso'` (Mozo confirma)
  - → `'rechazado por mozo'` (Mozo rechaza)

---

#### 2. **'pedido en curso'**
- **Quién lo crea:** Mozo al confirmar pedido pendiente
- **Quién lo ve:**
  - ✅ **Cocinero/Bartender:** Ve en lista de pedidos para preparar
  - ✅ **Mozo:** Ve en lista de pedidos en curso
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ❌ Admin: No ve
- **Acciones disponibles:**
  - **Cocinero/Bartender:** Puede aceptar para comenzar preparación
  - **Cliente:** Puede chatear con mozos (siempre habilitado)
- **Notificaciones:**
  - **Cliente:** Notificación cuando mozo confirma su pedido
  - **Cocinero/Bartender:** Notificación cuando hay nuevo pedido en curso
- **Transiciones posibles:**
  - → `'en preparación'` (Cocinero/Bartender acepta - pedido de un solo sector)
  - → `'en preparación parcial'` (Cocinero/Bartender acepta - pedido multi-sector)

---

#### 3. **'en preparación'** o **'en preparación parcial'**
- **Quién lo crea:** Cocinero/Bartender al aceptar pedido
- **Quién lo ve:**
  - ✅ **Cocinero/Bartender:** Ve en lista de pedidos en preparación
  - ✅ **Mozo:** Ve en lista de pedidos en curso
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ❌ Admin: No ve
- **Acciones disponibles:**
  - **Cocinero/Bartender:** Puede marcar como "listo para entregar"
  - **Cliente:** Puede chatear con mozos (siempre habilitado)
- **Notificaciones:**
  - **Cliente:** Notificación cuando comienza la preparación
- **Transiciones posibles:**
  - → `'listo para entregar'` (Cocinero/Bartender marca listo)
  - → `'en preparación parcial'` (Si es multi-sector y otro sector acepta)

---

#### 4. **'listo para entregar'**
- **Quién lo crea:** Cocinero/Bartender al marcar como listo
- **Quién lo ve:**
  - ✅ **Mozo:** Ve en lista de pedidos listos para entregar
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ❌ Cocinero/Bartender: Ya no lo ve (marcado como listo)
  - ❌ Admin: No ve
- **Acciones disponibles:**
  - **Mozo:** Puede entregar el pedido al cliente
  - **Cliente:** Puede chatear con mozos (siempre habilitado)
- **Notificaciones:**
  - **Mozo:** Notificación cuando pedido está listo para entregar
  - **Cliente:** Notificación cuando su pedido está listo
- **Transiciones posibles:**
  - → `'pendiente aceptación'` (Mozo entrega al cliente)

---

#### 5. **'pendiente aceptación'**
- **Quién lo crea:** Mozo al entregar pedido al cliente
- **Quién lo ve:**
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Mozo:** Ve en lista de pedidos en curso
  - ❌ Cocinero/Bartender: No ve
  - ❌ Admin: No ve
- **Acciones disponibles:**
  - **Cliente:** Puede aceptar o rechazar el pedido
  - **Cliente:** Puede chatear con mozos (siempre habilitado)
- **Notificaciones:**
  - **Cliente:** Notificación push: "Pedido entregado - ¿El pedido está correcto?"
- **Transiciones posibles:**
  - → `'entregado'` (Cliente acepta)
  - → `'rechazado por mozo'` (Cliente rechaza)

---

#### 6. **'entregado'**
- **Quién lo crea:** Cliente al aceptar pedido
- **Quién lo ve:**
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Mozo:** Ve en lista de pedidos en curso
  - ❌ Cocinero/Bartender: No ve
  - ❌ Admin: No ve
- **Acciones disponibles:**
  - **Cliente:** Puede pedir la cuenta
  - **Cliente:** Puede completar encuesta (si es registrado)
  - **Cliente:** Puede chatear con mozos (siempre habilitado)
  - **Cliente:** Puede jugar juegos (si es registrado y estado válido)
- **Notificaciones:**
  - **Mozo:** Notificación cuando cliente acepta pedido
- **Transiciones posibles:**
  - → `'pendiente confirmacion pago'` (Cliente pide cuenta)

---

#### 7. **'pendiente confirmacion pago'**
- **Quién lo crea:** Cliente al pedir la cuenta
- **Quién lo ve:**
  - ✅ **Mozo:** Ve en lista de pagos pendientes
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ❌ Cocinero/Bartender: No ve
  - ❌ Admin: No ve
- **Acciones disponibles:**
  - **Mozo:** Puede confirmar el pago
  - **Cliente:** Puede chatear con mozos (siempre habilitado)
- **Notificaciones:**
  - **Mozo:** Notificación cuando cliente pide la cuenta
- **Transiciones posibles:**
  - → `'pagado'` (Mozo confirma pago)

---

#### 8. **'pagado'** (Estado Final)
- **Quién lo crea:** Mozo al confirmar pago
- **Quién lo ve:**
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Mozo:** Ve en lista de pedidos en curso
  - ❌ Cocinero/Bartender: No ve
  - ❌ Admin: No ve
- **Acciones disponibles:**
  - **Cliente:** Puede completar encuesta (si es registrado y no la completó)
  - **Cliente:** Puede chatear con mozos (siempre habilitado)
- **Notificaciones:**
  - **Cliente:** Notificación push: "Pago confirmado"
- **Transiciones posibles:**
  - Ninguna (estado final)

---

### Estados Especiales (Mesa)

#### **'rechazado por mozo'**
- **Quién lo crea:** Mozo al rechazar pedido pendiente
- **Quién lo ve:**
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Mozo:** Ve en lista de pedidos pendientes
- **Acciones disponibles:**
  - **Cliente:** Puede editar y reenviar el pedido
- **Notificaciones:**
  - **Cliente:** Notificación: "Pedido rechazado - Puedes modificarlo y enviarlo nuevamente"
- **Transiciones posibles:**
  - → `'pendiente'` (Cliente edita y reenvía)

---

## 🚚 PEDIDOS DELIVERY

### Estados y Transiciones

```
1. 'pendiente'
   ↓ (Admin confirma)
2. 'pedido en curso'
   ↓ (Cocinero/Bartender acepta)
3. 'en preparación' o 'en preparación parcial'
   ↓ (Cocinero/Bartender marca listo)
4. 'listo para entregar'
   ↓ (Admin asigna repartidor)
5. 'asignado a delivery'
   ↓ (Repartidor confirma recepción)
6. 'confirmado por delivery'
   ↓ (Repartidor entrega)
7. 'pendiente aceptación'
   ↓ (Cliente acepta)
8. 'entregado'
   ↓ (Cliente pide cuenta)
9. 'pendiente confirmacion pago'
   ↓ (Mozo confirma pago)
10. 'pagado'
```

### Detalle por Estado

#### 1. **'pendiente'** (Estado Inicial)
- **Quién lo crea:** Cliente al realizar pedido delivery
- **Quién lo ve:**
  - ✅ **Admin:** Ve en lista de pedidos delivery pendientes
  - ❌ Cliente: No ve (está esperando confirmación)
  - ❌ Cocinero/Bartender: No ve
  - ❌ Mozo: No ve
  - ❌ Delivery: No ve
- **Acciones disponibles:**
  - **Admin:** Puede confirmar o rechazar
- **Notificaciones:**
  - **Admin:** Notificación cuando se crea nuevo pedido delivery pendiente
- **Transiciones posibles:**
  - → `'pedido en curso'` (Admin confirma)
  - → `'rechazado por admin'` (Admin rechaza)

---

#### 2. **'pedido en curso'**
- **Quién lo crea:** Admin al confirmar pedido delivery pendiente
- **Quién lo ve:**
  - ✅ **Cocinero/Bartender:** Ve en lista de pedidos para preparar
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Admin:** Ve en lista de pedidos delivery
  - ❌ Mozo: No ve
  - ❌ Delivery: No ve
- **Acciones disponibles:**
  - **Cocinero/Bartender:** Puede aceptar para comenzar preparación
  - **Cliente:** Puede chatear con repartidor (solo si ya está asignado)
- **Notificaciones:**
  - **Cliente:** Notificación: "Pedido delivery confirmado"
- **Transiciones posibles:**
  - → `'en preparación'` (Cocinero/Bartender acepta - pedido de un solo sector)
  - → `'en preparación parcial'` (Cocinero/Bartender acepta - pedido multi-sector)

---

#### 3. **'en preparación'** o **'en preparación parcial'**
- **Quién lo crea:** Cocinero/Bartender al aceptar pedido
- **Quién lo ve:**
  - ✅ **Cocinero/Bartender:** Ve en lista de pedidos en preparación
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Admin:** Ve en lista de pedidos delivery
  - ❌ Mozo: No ve
  - ❌ Delivery: No ve
- **Acciones disponibles:**
  - **Cocinero/Bartender:** Puede marcar como "listo para entregar"
  - **Cliente:** Puede chatear con repartidor (solo si ya está asignado)
- **Notificaciones:**
  - **Cliente:** Notificación cuando comienza la preparación
- **Transiciones posibles:**
  - → `'listo para entregar'` (Cocinero/Bartender marca listo)

---

#### 4. **'listo para entregar'**
- **Quién lo crea:** Cocinero/Bartender al marcar como listo
- **Quién lo ve:**
  - ✅ **Admin:** Ve en lista de pedidos listos para entregar
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ❌ Cocinero/Bartender: Ya no lo ve (marcado como listo)
  - ❌ Mozo: No ve
  - ❌ Delivery: No ve
- **Acciones disponibles:**
  - **Admin:** Puede asignar un repartidor al pedido
  - **Cliente:** Puede chatear con repartidor (solo si ya está asignado)
- **Notificaciones:**
  - **Admin:** Notificación cuando pedido está listo para entregar
  - **Cliente:** Notificación cuando su pedido está listo
- **Transiciones posibles:**
  - → `'asignado a delivery'` (Admin asigna repartidor)

---

#### 5. **'asignado a delivery'**
- **Quién lo crea:** Admin al asignar repartidor
- **Quién lo ve:**
  - ✅ **Delivery (asignado):** Ve en lista de pedidos asignados
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Admin:** Ve en lista de pedidos delivery
  - ❌ Cocinero/Bartender: No ve
  - ❌ Mozo: No ve
  - ❌ Delivery (otros): No ve
- **Acciones disponibles:**
  - **Delivery (asignado):** Puede confirmar recepción del pedido
  - **Cliente:** Puede chatear con repartidor asignado (ahora habilitado)
- **Notificaciones:**
  - **Delivery (asignado):** Notificación: "Nuevo pedido asignado"
  - **Cliente:** Notificación: "Pedido asignado a repartidor"
- **Transiciones posibles:**
  - → `'confirmado por delivery'` (Repartidor confirma recepción)

---

#### 6. **'confirmado por delivery'**
- **Quién lo crea:** Repartidor al confirmar recepción
- **Quién lo ve:**
  - ✅ **Delivery (asignado):** Ve en lista de pedidos en camino
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Admin:** Ve en lista de pedidos delivery
  - ❌ Cocinero/Bartender: No ve
  - ❌ Mozo: No ve
- **Acciones disponibles:**
  - **Delivery (asignado):** Puede entregar el pedido al cliente
  - **Cliente:** Puede chatear con repartidor asignado
- **Notificaciones:**
  - **Cliente:** Notificación: "Repartidor en camino"
- **Transiciones posibles:**
  - → `'pendiente aceptación'` (Repartidor entrega al cliente)

---

#### 7. **'pendiente aceptación'**
- **Quién lo crea:** Repartidor al entregar pedido al cliente
- **Quién lo ve:**
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Delivery (asignado):** Ve en lista de pedidos en camino
  - ✅ **Admin:** Ve en lista de pedidos delivery
  - ❌ Cocinero/Bartender: No ve
  - ❌ Mozo: No ve
- **Acciones disponibles:**
  - **Cliente:** Puede aceptar o rechazar el pedido
  - **Cliente:** Puede chatear con repartidor asignado
- **Notificaciones:**
  - **Cliente:** Notificación push: "Pedido delivery entregado - ¿El pedido está correcto?"
  - **Delivery (asignado):** Notificación cuando cliente acepta (via Supabase Realtime)
- **Transiciones posibles:**
  - → `'entregado'` (Cliente acepta)
  - → `'rechazado por mozo'` (Cliente rechaza - aunque dice "mozo", aplica también para delivery)

---

#### 8. **'entregado'**
- **Quién lo crea:** Cliente al aceptar pedido
- **Quién lo ve:**
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Delivery (asignado):** Ve en lista de pedidos en camino
  - ✅ **Admin:** Ve en lista de pedidos delivery
  - ❌ Cocinero/Bartender: No ve
  - ❌ Mozo: No ve
- **Acciones disponibles:**
  - **Cliente:** Puede pedir la cuenta
  - **Cliente:** Puede completar encuesta (si es registrado)
  - **Cliente:** Puede chatear con repartidor asignado
  - **Cliente:** Puede jugar juegos (si es registrado y estado válido)
- **Notificaciones:**
  - **Delivery (asignado):** Notificación cuando cliente acepta pedido
- **Transiciones posibles:**
  - → `'pendiente confirmacion pago'` (Cliente pide cuenta)

---

#### 9. **'pendiente confirmacion pago'**
- **Quién lo crea:** Cliente al pedir la cuenta
- **Quién lo ve:**
  - ✅ **Mozo:** Ve en lista de pagos pendientes (también para delivery)
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Delivery (asignado):** Ve notificación de pago pendiente
  - ✅ **Admin:** Ve en lista de pedidos delivery
  - ❌ Cocinero/Bartender: No ve
- **Acciones disponibles:**
  - **Mozo:** Puede confirmar el pago
  - **Cliente:** Puede chatear con repartidor asignado
- **Notificaciones:**
  - **Mozo:** Notificación cuando cliente pide la cuenta
  - **Delivery (asignado):** Notificación: "Pago pendiente - Pedido #X"
- **Transiciones posibles:**
  - → `'pagado'` (Mozo confirma pago)

---

#### 10. **'pagado'** (Estado Final)
- **Quién lo crea:** Mozo al confirmar pago
- **Quién lo ve:**
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Mozo:** Ve en lista de pedidos en curso
  - ✅ **Delivery (asignado):** Ve notificación de pago confirmado
  - ✅ **Admin:** Ve en lista de pedidos delivery
  - ❌ Cocinero/Bartender: No ve
- **Acciones disponibles:**
  - **Cliente:** Puede completar encuesta (si es registrado y no la completó)
  - **Cliente:** Puede chatear con repartidor asignado
- **Notificaciones:**
  - **Cliente:** Notificación push: "Pago confirmado - Delivery #X"
  - **Delivery (asignado):** Notificación: "Pago confirmado - Pedido #X"
- **Transiciones posibles:**
  - Ninguna (estado final)

---

### Estados Especiales (Delivery)

#### **'rechazado por admin'**
- **Quién lo crea:** Admin al rechazar pedido delivery pendiente
- **Quién lo ve:**
  - ✅ **Cliente:** Ve en su pantalla de pedido en curso
  - ✅ **Admin:** Ve en lista de pedidos delivery
- **Acciones disponibles:**
  - **Cliente:** Puede editar y reenviar el pedido
- **Notificaciones:**
  - **Cliente:** Notificación: "Pedido delivery rechazado - Por favor, contacta al restaurante"
- **Transiciones posibles:**
  - → `'pendiente'` (Cliente edita y reenvía)

---

## 📊 TABLA RESUMEN: QUIÉN VE QUÉ ESTADO

| Estado | Cliente | Mozo | Cocinero/Bartender | Admin | Delivery |
|--------|---------|------|-------------------|-------|----------|
| **MESA** |
| `pendiente` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `pedido en curso` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `en preparación` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `listo para entregar` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pendiente aceptación` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `entregado` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pendiente confirmacion pago` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pagado` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `rechazado por mozo` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **DELIVERY** |
| `pendiente` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `pedido en curso` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `en preparación` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `listo para entregar` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `asignado a delivery` | ✅ | ❌ | ❌ | ✅ | ✅ (asignado) |
| `confirmado por delivery` | ✅ | ❌ | ❌ | ✅ | ✅ (asignado) |
| `pendiente aceptación` | ✅ | ❌ | ❌ | ✅ | ✅ (asignado) |
| `entregado` | ✅ | ❌ | ❌ | ✅ | ✅ (asignado) |
| `pendiente confirmacion pago` | ✅ | ✅ | ❌ | ✅ | ✅ (asignado) |
| `pagado` | ✅ | ✅ | ❌ | ✅ | ✅ (asignado) |
| `rechazado por admin` | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## 🔔 NOTIFICACIONES POR USUARIO

### Cliente
- ✅ Pedido confirmado (mesa/delivery)
- ✅ Pedido rechazado (mesa/delivery)
- ✅ Comienza preparación
- ✅ Pedido listo para entregar
- ✅ Pedido entregado (pendiente aceptación)
- ✅ Repartidor asignado (solo delivery)
- ✅ Repartidor en camino (solo delivery)
- ✅ Pago confirmado
- ✅ Mensajes de chat (mozo/repartidor)

### Mozo
- ✅ Nuevo pedido pendiente (solo mesa)
- ✅ Pedido listo para entregar (solo mesa)
- ✅ Cliente acepta pedido (solo mesa)
- ✅ Cliente pide cuenta (mesa/delivery)
- ✅ Mensajes de chat de clientes (solo mesa)

### Cocinero/Bartender
- ✅ Nuevo pedido en curso (mesa/delivery)
- ✅ Pedido listo para entregar (mesa/delivery)

### Admin
- ✅ Nuevo pedido delivery pendiente
- ✅ Pedido delivery listo para entregar

### Delivery
- ✅ Nuevo pedido asignado
- ✅ Cliente acepta pedido
- ✅ Cliente pide cuenta
- ✅ Pago confirmado
- ✅ Mensajes de chat del cliente asignado

---

## 🎯 ACCIONES DISPONIBLES POR ESTADO Y USUARIO

### Cliente

| Estado | Chatear | Juegos | Encuesta | Pedir Cuenta | Editar Pedido |
|--------|---------|--------|----------|--------------|---------------|
| `pendiente` | ❌ | ❌ | ❌ | ❌ | ✅ (si rechazado) |
| `pedido en curso` | ✅ | ⚠️* | ❌ | ❌ | ❌ |
| `en preparación` | ✅ | ⚠️* | ❌ | ❌ | ❌ |
| `listo para entregar` | ✅ | ⚠️* | ❌ | ❌ | ❌ |
| `pendiente aceptación` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `entregado` | ✅ | ⚠️* | ⚠️** | ✅ | ❌ |
| `pendiente confirmacion pago` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `pagado` | ✅ | ❌ | ⚠️** | ❌ | ❌ |

*⚠️ Juegos: Solo si es cliente registrado y estado válido (no pendiente/rechazado)*
**⚠️ Encuesta: Solo si es cliente registrado y no la completó*

### Mozo

| Estado | Confirmar | Rechazar | Entregar | Confirmar Pago |
|--------|-----------|----------|----------|----------------|
| `pendiente` | ✅ | ✅ | ❌ | ❌ |
| `pedido en curso` | ❌ | ❌ | ❌ | ❌ |
| `en preparación` | ❌ | ❌ | ❌ | ❌ |
| `listo para entregar` | ❌ | ❌ | ✅ | ❌ |
| `pendiente aceptación` | ❌ | ❌ | ❌ | ❌ |
| `entregado` | ❌ | ❌ | ❌ | ❌ |
| `pendiente confirmacion pago` | ❌ | ❌ | ❌ | ✅ |
| `pagado` | ❌ | ❌ | ❌ | ❌ |

### Cocinero/Bartender

| Estado | Aceptar | Marcar Listo |
|--------|---------|--------------|
| `pedido en curso` | ✅ | ❌ |
| `en preparación` | ❌ | ✅ |
| `listo para entregar` | ❌ | ❌ |

### Admin

| Estado | Confirmar | Rechazar | Asignar Delivery |
|--------|-----------|----------|------------------|
| `pendiente` (delivery) | ✅ | ✅ | ❌ |
| `listo para entregar` (delivery) | ❌ | ❌ | ✅ |

### Delivery

| Estado | Confirmar Recepción | Entregar |
|--------|---------------------|----------|
| `asignado a delivery` | ✅ | ❌ |
| `confirmado por delivery` | ❌ | ✅ |
| `pendiente aceptación` | ❌ | ❌ |

---

## 🔄 FLUJOS ESPECIALES

### Pedidos Multi-Sector
Cuando un pedido tiene productos de cocina Y bar:
1. Estado inicial: `'pedido en curso'`
2. Si cocinero acepta primero: `'en preparación parcial'` (estado_sector_cocina = 'en preparación')
3. Si bartender acepta después: `'en preparación parcial'` (estado_sector_bar = 'en preparación')
4. Cuando ambos sectores marcan listo: `'listo para entregar'`

### Reclamo de Descuento (Juegos)
- Solo se puede reclamar **UNA VEZ** en la primera partida de cualquier juego
- Una vez reclamado, el cliente puede seguir jugando pero no puede reclamar más descuentos
- El descuento se aplica al `total` del pedido sin cambiar el `estado`

### Chat
- **Mesa:** Cliente puede chatear con **TODOS los mozos** en todo momento
- **Delivery:** Cliente solo puede chatear con el **repartidor asignado** (una vez asignado)

---

## 📝 NOTAS IMPORTANTES

1. **Estados de sector:** Además del estado principal, existen `estado_sector_cocina` y `estado_sector_bar` para manejar pedidos multi-sector.

2. **Tiempo estimado:** Se calcula cuando el mozo/admin confirma el pedido y se muestra al cliente.

3. **Notificaciones en tiempo real:** Todas las transiciones de estado disparan notificaciones push a los usuarios relevantes mediante Supabase Realtime.

4. **Permisos RLS:** Cada usuario solo puede ver y modificar pedidos según las políticas de Row Level Security configuradas en Supabase.

5. **Estados finales:** `'pagado'` es el estado final. Después de esto, el pedido queda archivado.

