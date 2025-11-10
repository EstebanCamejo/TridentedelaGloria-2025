# 📋 PLAN ESTRATÉGICO COMPLETO: FLUJO DE DELIVERY CON USUARIO DELIVERY

## 🔄 FLUJO PROPUESTO COMPLETO

1. **Empleado registrado** crea pedido delivery → estado `'pendiente'` (marcado como delivery, con dirección)
2. **Admin/Dueño** recibe notificación push → confirma pedido delivery → estado `'pedido en curso'` (delivery)
3. **Cliente** recibe notificación push → "Tu pedido delivery ha sido confirmado"
4. **Cocina/Bartender** procesan → estado `'listo para entregar'` (delivery)
5. **Admin/Dueño** recibe notificación → asigna pedido a usuario **DELIVERY** → estado `'asignado a delivery'` (con `idDelivery`)
6. **Usuario DELIVERY** recibe notificación → confirma recepción del pedido → estado `'confirmado por delivery'`
7. **Usuario DELIVERY** entrega al cliente → estado `'entregado'` (delivery)
8. **Cliente** pide cuenta → **Admin/Dueño** confirma pago → estado `'pagado'` (delivery)

---

## 📊 FASE 1: BASE DE DATOS Y TIPOS DE USUARIO

### Fase 1.1: Agregar Tipo de Usuario DELIVERY
- **Modificar** `src/app/enumerados/tipo-usuario.ts`:
  - Agregar `delivery = 'delivery'`
- **Modificar** `src/app/services/sesion.service.ts`:
  - Agregar `esDelivery(): boolean`
  - Agregar `esEmpleado(): boolean` (para detectar empleados que pueden hacer delivery)

### Fase 1.2: Campos en Base de Datos - Tipo de Pedido
- Agregar campo `tipo_pedido: 'mesa' | 'delivery'` o `es_delivery: boolean` en tabla `pedidos`
- Default: `'mesa'` o `false`
- Agregar campo `idDelivery` (opcional, UUID) para asignar repartidor

### Fase 1.3: Campos en Base de Datos - Dirección de Entrega
- Agregar en tabla `pedidos`:
  - `direccion_entrega: text` (obligatorio para delivery)
  - `latitud: decimal` (opcional, para coordenadas del mapa)
  - `longitud: decimal` (opcional, para coordenadas del mapa)

### Fase 1.4: Estados Adicionales
- Estados nuevos:
  - `'asignado a delivery'` - Admin asignó el pedido al repartidor
  - `'confirmado por delivery'` - Repartidor confirmó recepción
  - `'en camino'` (opcional) - Repartidor en ruta hacia el cliente
- Estados de rechazo:
  - `'rechazado por admin'` - Si admin rechaza pedido delivery pendiente

---

## 📊 FASE 2: VALIDACIÓN DE CLIENTE REGISTRADO

### Fase 2.1: Validación en Botón de Delivery
- **Modificar** `src/app/components/home-cliente/home-cliente.component.ts`:
  - En método `hacerPedidoDelivery()`:
    - Verificar que `esClienteRegistrado === true`
    - Si no es registrado, mostrar mensaje: "Solo los clientes registrados pueden hacer pedidos delivery"
    - Bloquear navegación si no es registrado

### Fase 2.2: Validación en Componente de Realizar Pedido
- **Modificar** `src/app/components/cliente/cliente-realiza-pedido/cliente-realiza-pedido.component.ts`:
  - En `ngOnInit()`:
    - Leer `queryParams.tipo === 'delivery'`
    - Si es delivery, verificar que es cliente registrado (usar `SesionService.esCliente()`)
    - Si no es registrado, redirigir a home-cliente con mensaje de error

---

## 📊 FASE 3: COMPONENTE DE DIRECCIÓN CON LEAFLET

### Fase 3.1: Instalación de Dependencias
- Instalar Leaflet:
  ```bash
  npm install leaflet
  npm install @types/leaflet
  ```
- Agregar estilos de Leaflet en `angular.json` o `index.html`:
  ```json
  "styles": [
    "node_modules/leaflet/dist/leaflet.css"
  ]
  ```

### Fase 3.2: Crear Componente de Dirección
- **Crear** `src/app/components/cliente/direccion-delivery/direccion-delivery.component.ts/html/scss`:
  - **Características:**
    - Input de texto para dirección manual
    - Mapa Leaflet interactivo para seleccionar ubicación
    - Botón "Confirmar dirección"
    - Guardar: dirección (string), latitud (opcional), longitud (opcional)
    - Validación: dirección es obligatoria
  - **Funcionalidad:**
    - Permite escribir dirección manualmente
    - Permite hacer clic en mapa para seleccionar ubicación
    - Actualiza coordenadas cuando se selecciona en mapa
    - Actualiza dirección cuando se escribe manualmente (geocoding opcional)

### Fase 3.3: Integración en Flujo de Pedido
- **Modificar** `src/app/components/cliente/cliente-realiza-pedido/cliente-realiza-pedido.component.ts`:
  - Antes de `finalizarPedido()`, si `tipo === 'delivery'`:
    - Mostrar modal/componente de dirección
    - Esperar confirmación de dirección
    - Guardar dirección en variable temporal
  - Al crear pedido, incluir dirección en el payload

### Fase 3.4: Agregar Ruta
- **Modificar** `src/app/app.routes.ts`:
  - Agregar ruta para componente de dirección (si es necesario)

---

## 📊 FASE 4: CREACIÓN DE PEDIDO DELIVERY

### Fase 4.1: Modificar Servicio de Menú
- **Modificar** `src/app/services/menu.service.ts`:
  - Modificar `crearPedido()` para aceptar:
    ```typescript
    crearPedido(pedido: {
      idCliente: string;
      productos: { id: number; cantidad: number; precio_unitario: number }[];
      tipoPedido?: 'mesa' | 'delivery';
      direccionEntrega?: string;
      latitud?: number;
      longitud?: number;
    })
    ```
  - Al insertar pedido:
    ```typescript
    insert([{
      idCliente: pedido.idCliente,
      estado: 'pendiente',
      tipo_pedido: pedido.tipoPedido || 'mesa',
      direccion_entrega: pedido.direccionEntrega || null,
      latitud: pedido.latitud || null,
      longitud: pedido.longitud || null
    }])
    ```

### Fase 4.2: Modificar Componente de Realizar Pedido
- **Modificar** `src/app/components/cliente/cliente-realiza-pedido/cliente-realiza-pedido.component.ts`:
  - Leer `queryParams.tipo === 'delivery'`
  - Si es delivery, mostrar componente de dirección antes de finalizar
  - Incluir dirección en el payload al crear pedido

---

## 📊 FASE 5: SERVICIO PARA ADMIN (REEMPLAZA AL MOZO EN CONFIRMACIÓN INICIAL)

### Fase 5.1: Crear Servicio Admin-Delivery-Pedidos
- **Crear** `src/app/services/admin-delivery-pedidos.service.ts`:
  - Métodos similares a `MozoPedidosService` pero filtrando por `tipo_pedido = 'delivery'`:
    - `getPedidosDeliveryPendientes()` - Pedidos con `tipo_pedido = 'delivery'` y `estado = 'pendiente'`
    - `confirmarPedidoDelivery(pedidoId)` - Cambiar estado a `'pedido en curso'`
    - `rechazarPedidoDelivery(pedidoId)` - Cambiar estado a `'rechazado por admin'`
    - `asignarPedidoADelivery(pedidoId, idDelivery)` - Cambiar estado a `'asignado a delivery'` y asignar repartidor
    - `getPedidosListosParaEntregar()` - Pedidos con `tipo_pedido = 'delivery'` y `estado = 'listo para entregar'`
    - `pedidosDeliveryPendientes$()` - Observable en tiempo real
    - `pedidosListosParaEntregar$()` - Observable en tiempo real
  - Nota: Delivery no tiene mesa, usar campo alternativo o mostrar "Delivery" en lugar de mesa

---

## 📊 FASE 6: SERVICIO PARA USUARIO DELIVERY

### Fase 6.1: Crear Servicio Delivery-Pedidos
- **Crear** `src/app/services/delivery-pedidos.service.ts`:
  - Similar a `MozoPedidosService` pero para repartidores:
    - `getPedidosAsignados()` - Pedidos con `estado = 'asignado a delivery'` y `idDelivery = usuario actual`
    - `confirmarRecepcionPedido(pedidoId)` - Cambiar estado a `'confirmado por delivery'`
    - `entregarPedidoAlCliente(pedidoId)` - Cambiar estado a `'entregado'`
    - `getPedidosEnCamino()` - Pedidos con `estado = 'confirmado por delivery'` y `idDelivery = usuario actual`
    - `pedidosAsignados$()` - Observable en tiempo real
    - `pedidosEnCamino$()` - Observable para pedidos confirmados

---

## 📊 FASE 7: COMPONENTE ADMIN PARA DELIVERY (REEMPLAZA AL MOZO EN CONFIRMACIÓN INICIAL)

### Fase 7.1: Crear Componente Admin-Delivery-Pedidos
- **Crear** `src/app/components/admin/delivery-pedidos/delivery-pedidos.component.ts/html/scss`:
  - Estructura similar a `home-mozo.component`:
    - **Tab "Pendientes":**
      - Lista de pedidos delivery con `estado = 'pendiente'`
      - Mostrar: Cliente/Empleado, productos, total, tiempo estimado, **dirección de entrega**
      - Botones: Confirmar / Rechazar
    - **Tab "Listos para Entregar":**
      - Lista de pedidos delivery con `estado = 'listo para entregar'`
      - Mostrar: Cliente, dirección, productos, total
      - Botón "Asignar a Delivery" que abre modal/selector de repartidores
      - Mostrar lista de usuarios DELIVERY disponibles
    - **Tab "En Curso" (opcional):**
      - Pedidos asignados a delivery pero aún no entregados
  - **Funciones:**
    - `confirmarPedidoDelivery(pedido)`
    - `rechazarPedidoDelivery(pedido)`
    - `asignarPedidoADelivery(pedido, idDelivery)`

### Fase 7.2: Agregar Ruta
- **Modificar** `src/app/app.routes.ts`:
  - Agregar ruta: `/admin/delivery-pedidos`

### Fase 7.3: Agregar Acceso en Home-Admin
- **Modificar** `src/app/components/home-admin/home-admin.component.html`:
  - Agregar botón/card para acceder a pedidos delivery

---

## 📊 FASE 8: COMPONENTE PARA USUARIO DELIVERY

### Fase 8.1: Crear Home-Delivery
- **Crear** `src/app/components/home-delivery/home-delivery.component.ts/html/scss`:
  - Similar a `home-mozo.component`:
    - **Tab "Pedidos Asignados":**
      - Lista de pedidos con `estado = 'asignado a delivery'` y `idDelivery = usuario actual`
      - Mostrar: Cliente, dirección, productos, total, tiempo estimado
      - Botón "Confirmar Recepción" → cambia a `'confirmado por delivery'`
      - **Push notification** cuando hay nuevo pedido asignado (manejado por delivery-realtime.service)
    - **Tab "En Camino":**
      - Lista de pedidos con `estado = 'confirmado por delivery'` y `idDelivery = usuario actual`
      - Mostrar: Cliente, dirección, productos, total
      - **Visualización del mapa con ruta hacia el cliente** (usando Leaflet o Google Maps)
        - Mostrar ubicación actual del delivery (GPS)
        - Mostrar ubicación del cliente (dirección de entrega con coordenadas)
        - Mostrar ruta calculada entre ambos puntos
        - Botón para abrir en app de navegación externa (Google Maps, Waze, etc.)
      - Botón "Entregar al Cliente" → cambia a `'entregado'`
      - Botón "Abrir Chat" → habilita sala de conversación con el cliente
  - **Funciones:**
    - `confirmarRecepcionPedido(pedido)`
    - `entregarPedidoAlCliente(pedido)`
    - `verMapaRuta(pedido)` - Abre mapa con ruta hacia cliente
    - `irAChat(pedido)` - Navega a chat con el cliente

### Fase 8.2: Agregar Ruta
- **Modificar** `src/app/app.routes.ts`:
  - Agregar ruta: `/home-delivery`

---

## 📊 FASE 9: SELECTOR DE REPARTIDORES DISPONIBLES

### Fase 9.1: Crear Servicio de Usuarios Delivery
- **Crear** `src/app/services/delivery-usuarios.service.ts`:
  - `getDeliveryUsuariosDisponibles()` - Obtener usuarios con `perfil = 'delivery'` y `estado = 'activo'`
  - Método para verificar disponibilidad de un repartidor

### Fase 9.2: Crear Modal/Componente para Seleccionar Delivery
- **Crear** `src/app/components/admin/select-delivery/select-delivery.component.ts/html/scss`:
  - Modal que muestra lista de repartidores disponibles
  - Mostrar: nombre, email, estado (disponible/ocupado)
  - Al seleccionar, emitir evento con `idDelivery`
  - Integrar en `admin-delivery-pedidos.component`

---

## 📊 FASE 10: REALTIME SERVICES

### Fase 10.1: Modificar Admin-Realtime-Service
- **Modificar** `src/app/services/admin-realtime.service.ts`:
  - Agregar suscripciones para delivery:
    - Notificar cuando hay nuevo pedido delivery con `estado = 'pendiente'`
    - Notificar cuando pedido delivery cambia a `'listo para entregar'`
    - Notificar cuando pedido delivery cambia a `'pendiente confirmacion pago'`

### Fase 10.2: Crear Delivery-Realtime-Service
- **Crear** `src/app/services/delivery-realtime.service.ts`:
  - Similar a `mozo-realtime.service.ts`:
    - Notificar cuando hay pedido asignado (`estado = 'asignado a delivery'` y `idDelivery = usuario actual`)
      - **Push notification**: "🚚 Nuevo pedido asignado para delivery"
      - Incluir información: cliente, dirección, total
    - Notificar cambios de estado en pedidos asignados
    - Notificar cuando cliente envía mensaje en chat (similar a mozo-chat-realtime)

### Fase 10.3: Modificar Cliente-Realtime-Service (NUEVO)
- **Modificar** `src/app/services/cliente-realtime.service.ts`:
  - Agregar suscripción a cambios en pedidos delivery:
    - Cuando `estado` cambia de `'pendiente'` a `'pedido en curso'` y `tipo_pedido = 'delivery'`:
      - Enviar notificación push: "✅ Tu pedido delivery ha sido confirmado"
      - **Incluir tiempo de espera aproximado** en el mensaje: "Tiempo estimado: X minutos"
      - Obtener `tiempo_estimado` del pedido para incluirlo en la notificación
    - Cuando `estado` cambia a `'rechazado por admin'` y `tipo_pedido = 'delivery'`:
      - Enviar notificación push: "❌ Tu pedido delivery fue rechazado"
      - **Incluir tiempo de espera aproximado** si se proporciona motivo o tiempo estimado
    - Cuando `estado` cambia a `'asignado a delivery'`: "🚚 Tu pedido fue asignado a un repartidor"
    - Cuando `estado` cambia a `'confirmado por delivery'`: "📦 El repartidor confirmó la recepción de tu pedido"
    - Cuando `estado` cambia a `'entregado'`: "✅ Tu pedido delivery fue entregado"

---

## 📊 FASE 11: VISTA DE ESTADO DEL PEDIDO DELIVERY PARA CLIENTE

### Fase 11.1: Modificar Cliente-Pedido-En-Curso
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`:
  - Detectar si el pedido es delivery (`tipo_pedido = 'delivery'`)
  - Si es delivery:
    - Mostrar dirección de entrega
    - Mostrar estados específicos de delivery:
      - "Pendiente confirmación" → cuando `estado = 'pendiente'`
      - "Confirmado - En preparación" → cuando `estado = 'pedido en curso'`
      - "Listo para entregar" → cuando `estado = 'listo para entregar'`
      - "Asignado a repartidor" → cuando `estado = 'asignado a delivery'`
      - "Repartidor en camino" → cuando `estado = 'confirmado por delivery'`
      - "Entregado" → cuando `estado = 'entregado'`
    - Mostrar información del repartidor (si está asignado):
      - Nombre del repartidor
      - Estado actual del repartidor
    - Mostrar mapa con ubicación de entrega (opcional)

### Fase 11.2: Modificar Template HTML
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.html`:
  - Agregar sección para información de delivery:
    - Dirección de entrega
    - Estado específico de delivery
    - Información del repartidor (si asignado)
    - Mapa con ubicación (opcional)

---

## 📊 FASE 12: COMPONENTE DE CONFIRMAR PAGO PARA DELIVERY

### Fase 12.1: Crear Componente Admin-Delivery-Confirmar-Pago
- **Crear** `src/app/components/admin/delivery-confirmar-pago/delivery-confirmar-pago.component.ts/html/scss`:
  - Similar a `mozo/confirmar-pago.component`
  - Filtrar pedidos con `tipo_pedido = 'delivery'` y `estado = 'pendiente confirmacion pago'`
  - Funcionalidad igual: confirmar pago, marcar como `'pagado'`

### Fase 12.2: Agregar Ruta
- **Modificar** `src/app/app.routes.ts`:
  - Agregar ruta: `/admin/delivery-confirmar-pago`

---

## 📊 FASE 13: FILTROS EN SERVICIOS EXISTENTES

### Fase 13.1: Modificar Mozo-Pedidos-Service
- **Modificar** `src/app/services/mozo-pedidos.service.ts`:
  - Filtrar pedidos normales: excluir `tipo_pedido = 'delivery'` en todas las queries
  - Asegurar que `getPedidosPendientes()` y `getPedidosEnCurso()` solo muestren pedidos de mesa
  - Agregar filtro: `.neq('tipo_pedido', 'delivery')` o `.eq('tipo_pedido', 'mesa')`

### Fase 13.2: Modificar Servicios de Cocina/Bartender para Delivery
- **Modificar** `src/app/services/menu.service.ts`:
  - Asegurar que `obtenerPedidosCocina()` y `obtenerPedidosBartender()` incluyan pedidos delivery
  - No filtrar por tipo de pedido (procesan igual tanto mesa como delivery)
  - **Modificar respuesta** para incluir `tipo_pedido` y `numero_mesa` o indicador de delivery
  - Si `tipo_pedido = 'delivery'`, retornar `numero_mesa = null` o `numero_mesa = 0` y agregar flag `es_delivery: true`

### Fase 13.3: Modificar Componentes Cocina/Bartender para Mostrar "Delivery"
- **Modificar** `src/app/components/bartender-cocinero/verificar-pendientes-cocinero/verificar-pendientes-cocinero.component.html`:
  - Cambiar: `Mesa {{ pedido.numero_mesa }}` 
  - Por: `{{ pedido.tipo_pedido === 'delivery' ? 'Delivery #' + pedido.id : 'Mesa ' + pedido.numero_mesa }}`
  - Verificar que fecha muestre hora, minutos y segundos: `date:'medium'` o `date:'dd/MM/yyyy HH:mm:ss'`
  
- **Modificar** `src/app/components/bartender-cocinero/verificar-pendientes-bartender/verificar-pendientes-bartender.component.html`:
  - Cambiar: `Mesa {{ pedido.numero_mesa }}`
  - Por: `{{ pedido.tipo_pedido === 'delivery' ? 'Delivery #' + pedido.id : 'Mesa ' + pedido.numero_mesa }}`
  - Verificar que fecha muestre hora, minutos y segundos: `date:'medium'` o `date:'dd/MM/yyyy HH:mm:ss'`
  
- **Modificar** `src/app/components/bartender-cocinero/verificar-pendientes-cocinero/verificar-pendientes-cocinero.component.ts`:
  - Asegurar que el servicio retorne `tipo_pedido` en los datos del pedido
  
- **Modificar** `src/app/components/bartender-cocinero/verificar-pendientes-bartender/verificar-pendientes-bartender.component.ts`:
  - Asegurar que el servicio retorne `tipo_pedido` en los datos del pedido

---

## 📊 FASE 14: MAPA CON RUTA PARA DELIVERY

### Fase 14.1: Servicio de Mapa y Navegación
- **Crear** `src/app/services/delivery-mapa.service.ts`:
  - Métodos para:
    - Obtener ubicación actual del delivery (GPS)
    - Obtener coordenadas de dirección de entrega del pedido
    - Calcular ruta entre dos puntos (usando Leaflet Routing Machine o API de Google Maps)
    - Abrir app de navegación externa (Google Maps, Waze) con coordenadas

### Fase 14.2: Componente de Mapa con Ruta
- **Crear** `src/app/components/delivery/mapa-ruta/mapa-ruta.component.ts/html/scss`:
  - Mapa interactivo usando Leaflet
  - Mostrar:
    - Marcador de ubicación actual del delivery (GPS en tiempo real opcional)
    - Marcador de ubicación del cliente (dirección de entrega)
    - Ruta calculada entre ambos puntos
  - Botones:
    - "Abrir en Google Maps" - Abre app externa con navegación
    - "Abrir en Waze" - Abre app externa con navegación
    - "Cerrar" - Volver a lista de pedidos

### Fase 14.3: Integración en Home-Delivery
- **Modificar** `src/app/components/home-delivery/home-delivery.component.ts`:
  - Agregar método `verMapaRuta(pedido)`:
    - Obtener dirección y coordenadas del pedido
    - Obtener ubicación actual del delivery (GPS)
    - Abrir modal/componente de mapa con ruta
    - O mostrar mapa integrado en la misma vista

### Fase 14.4: Permisos de Geolocalización
- Solicitar permisos de geolocalización cuando delivery inicia sesión
- Usar `@capacitor/geolocation` para obtener ubicación actual
- Guardar ubicación actual periódicamente (opcional, para tracking)

---

## 📊 FASE 15: CHAT ENTRE DELIVERY Y CLIENTE

### Fase 15.1: Modificar Chat Service para Delivery
- **Modificar** `src/app/services/chat.service.ts`:
  - Agregar método `ensureRoomByPedidoDelivery(pedidoId: number, cliente_uid: string, delivery_uid: string)`:
    - Similar a `ensureRoomByPedido()` pero para delivery
    - Crear/obtener sala de chat asociada a pedido delivery
    - Guardar `tipo_chat: 'delivery'` o campo similar para diferenciar de chat con mozo
  - Agregar método `deliveryChats$()`:
    - Similar a `mozoChats$()` pero para delivery
    - Retornar lista de chats donde `delivery_uid = usuario actual`

### Fase 15.2: Modificar Chat Component para Delivery
- **Modificar** `src/app/components/chat/chat.component.ts`:
  - Agregar detección de modo DELIVERY: `/delivery/chat/:roomId`
  - Si es modo delivery, mostrar título "Chat con Cliente"
  - Funcionalidad igual que modo mozo: enviar/recibir mensajes

### Fase 15.3: Crear Delivery-Chat-Realtime-Service
- **Crear** `src/app/services/delivery-chat-realtime.service.ts`:
  - Similar a `mozo-chat-realtime.service.ts`:
    - Notificar cuando cliente envía mensaje en chat de delivery
    - Notificar solo si el mensaje es del cliente (no del propio delivery)
    - Incluir información: nombre del cliente, pedido, dirección

### Fase 15.4: Modificar Cliente-Chat-Realtime-Service para Delivery
- **Modificar** `src/app/services/cliente-chat-realtime.service.ts`:
  - Agregar detección de mensajes de delivery:
    - Verificar si el mensaje es de un usuario con `perfil = 'delivery'`
    - Notificar: "💬 Respuesta del repartidor"
    - Incluir información del delivery: nombre, pedido

### Fase 15.5: Habilitar Chat en Home-Delivery
- **Modificar** `src/app/components/home-delivery/home-delivery.component.ts`:
  - Agregar método `irAChat(pedido)`:
    - Obtener o crear sala de chat para el pedido
    - Navegar a `/delivery/chat/:roomId`
  - Mostrar botón "Abrir Chat" cuando `estado = 'confirmado por delivery'` o superior

### Fase 15.6: Habilitar Chat en Cliente-Pedido-En-Curso para Delivery
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`:
  - Modificar método `irAChat()`:
    - Detectar si el pedido es delivery (`tipo_pedido = 'delivery'`)
    - Si es delivery, habilitar chat con delivery cuando `estado = 'confirmado por delivery'` o superior
    - Cambiar texto del botón: "Consultas al repartidor" en lugar de "Consultas a los mozos"
  - Modificar template HTML:
    - Cambiar texto del botón según tipo de pedido

### Fase 15.7: Agregar Rutas de Chat para Delivery
- **Modificar** `src/app/app.routes.ts`:
  - Agregar ruta: `/delivery/chat/:roomId`
  - Usar el mismo componente `ChatComponent` pero con modo delivery

---

## 📊 FASE 16: JUEGOS Y DESCUENTOS PARA DELIVERY

### Fase 16.1: Verificar Funcionamiento de Juegos para Delivery
- **Verificar** que los juegos funcionen igual para pedidos delivery:
  - El cliente puede acceder a juegos cuando el pedido está en estado `'pedido en curso'` o superior
  - Solo se aplica un descuento (el primero), solo si pudo ganar en el primer intento (YA IMPLEMENTADO ✅)
  - Una vez obtenido el beneficio, se pueden acceder libremente a todos los juegos (YA IMPLEMENTADO ✅)
  - Los descuentos se aplican al pedido delivery igual que a pedidos normales

### Fase 16.2: Modificar Componente Cliente-Pedido-En-Curso para Delivery
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`:
  - Verificar que botón de juegos esté habilitado para pedidos delivery cuando `estado = 'pedido en curso'` o superior
  - Verificar que el sistema de descuentos funcione igual para delivery
  - Asegurar que `pedidosSvc.setPedidoActual()` se ejecute también para pedidos delivery

### Fase 16.3: Verificar Servicio de Descuentos
- **Verificar** `src/app/services/supabase.service.ts`:
  - Método `claimGameDiscountTotalOnly()` debe funcionar para pedidos delivery
  - Método `yaSeAplicoDescuento()` debe funcionar para pedidos delivery
  - No debe haber filtros que excluyan pedidos delivery

---

## 📊 FASE 17: ESTADOS Y TRANSICIONES

### Flujo de Estados del Delivery:
1. `'pendiente'` (delivery) → Admin confirma → `'pedido en curso'` (delivery)
2. `'pedido en curso'` (delivery) → Cocina/Bartender → `'listo para entregar'` (delivery)
3. `'listo para entregar'` (delivery) → Admin asigna a delivery → `'asignado a delivery'` (delivery, con `idDelivery`)
4. `'asignado a delivery'` → Delivery confirma recepción → `'confirmado por delivery'`
5. `'confirmado por delivery'` → Delivery entrega al cliente → `'entregado'` (delivery)
6. `'entregado'` (delivery) → Cliente pide cuenta → `'pendiente confirmacion pago'` (delivery)
7. `'pendiente confirmacion pago'` (delivery) → Admin confirma pago → `'pagado'` (delivery)

### Estados de Rechazo:
- `'rechazado por admin'` - Si admin rechaza pedido delivery pendiente

---

## 📊 ARCHIVOS A CREAR/MODIFICAR

### Crear:
1. `src/app/enumerados/tipo-usuario.ts` - Agregar `delivery` ✅
2. `src/app/services/admin-delivery-pedidos.service.ts`
3. `src/app/services/delivery-pedidos.service.ts`
4. `src/app/services/delivery-realtime.service.ts`
5. `src/app/services/delivery-chat-realtime.service.ts`
6. `src/app/services/delivery-mapa.service.ts`
7. `src/app/services/delivery-usuarios.service.ts`
8. `src/app/components/admin/delivery-pedidos/delivery-pedidos.component.ts/html/scss`
9. `src/app/components/admin/delivery-confirmar-pago/delivery-confirmar-pago.component.ts/html/scss`
10. `src/app/components/home-delivery/home-delivery.component.ts/html/scss`
11. `src/app/components/admin/select-delivery/select-delivery.component.ts/html/scss` (modal selector)
12. `src/app/components/cliente/direccion-delivery/direccion-delivery.component.ts/html/scss`
13. `src/app/components/delivery/mapa-ruta/mapa-ruta.component.ts/html/scss`

### Modificar:
1. `src/app/services/sesion.service.ts` - Agregar `esDelivery()` y `esEmpleado()`
2. `src/app/services/menu.service.ts` - Modificar `crearPedido()` para soportar delivery y dirección
3. `src/app/services/menu.service.ts` - Modificar `obtenerPedidosCocina()` y `obtenerPedidosBartender()` para incluir `tipo_pedido`
4. `src/app/components/cliente/cliente-realiza-pedido/cliente-realiza-pedido.component.ts` - Detectar tipo delivery y mostrar dirección
5. `src/app/components/home-cliente/home-cliente.component.ts` - Validar cliente registrado
6. `src/app/components/home-admin/home-admin.component.html` - Agregar botón acceso
7. `src/app/services/admin-realtime.service.ts` - Agregar suscripción a delivery
8. `src/app/services/cliente-realtime.service.ts` - Agregar notificaciones de delivery con tiempo de espera
9. `src/app/services/mozo-pedidos.service.ts` - Filtrar para excluir delivery
10. `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts/html` - Mostrar info de delivery, habilitar juegos y chat con delivery
11. `src/app/components/bartender-cocinero/verificar-pendientes-cocinero/verificar-pendientes-cocinero.component.ts/html` - Mostrar "Delivery" en lugar de mesa
12. `src/app/components/bartender-cocinero/verificar-pendientes-bartender/verificar-pendientes-bartender.component.ts/html` - Mostrar "Delivery" en lugar de mesa
13. `src/app/services/chat.service.ts` - Agregar métodos para chat delivery-cliente
14. `src/app/components/chat/chat.component.ts` - Agregar modo delivery
15. `src/app/services/cliente-chat-realtime.service.ts` - Agregar notificaciones de mensajes de delivery
16. `src/app/app.routes.ts` - Agregar rutas (incluyendo `/delivery/chat/:roomId`)

---

## 📊 ORDEN DE IMPLEMENTACIÓN SUGERIDO

1. **Fase 1**: Base de datos + tipos de usuario + detección
2. **Fase 2**: Validación de cliente registrado
3. **Fase 3**: Componente de dirección con Leaflet
4. **Fase 4**: Creación de pedido delivery (con dirección)
5. **Fase 5**: Servicio admin-delivery-pedidos
6. **Fase 7**: Componente admin delivery-pedidos (confirmación inicial)
7. **Fase 10.1**: Realtime service admin
8. **Fase 10.3**: Notificación push al cliente cuando admin acepta
9. **Fase 9**: Selector de repartidores
10. **Fase 6**: Servicio delivery-pedidos
11. **Fase 8**: Componente home-delivery
12. **Fase 10.2**: Realtime service delivery
13. **Fase 12**: Componente confirmar pago delivery
14. **Fase 11**: Vista de estado del pedido delivery para cliente
15. **Fase 13**: Filtros en servicios existentes
16. **Fase 13.3**: Modificar componentes cocina/bartender para mostrar "Delivery"
17. **Fase 10.2**: Realtime service delivery (completo con notificaciones)
18. **Fase 14**: Mapa con ruta para delivery
19. **Fase 15**: Chat entre delivery y cliente
20. **Fase 16**: Verificar juegos y descuentos para delivery
21. **Fase 17**: Ajustes de estados

---

## 📊 CONSIDERACIONES IMPORTANTES

### 1. Asignación de Delivery
- Campo `idDelivery` en tabla `pedidos` para asignar repartidor
- Modal/selector para elegir repartidor disponible
- Verificar disponibilidad del repartidor antes de asignar

### 2. Notificaciones Push
- **Admin**: nuevo pedido delivery pendiente
- **Cliente**: admin confirmó pedido delivery
- **Admin**: pedido listo para entregar
- **Delivery**: pedido asignado
- **Cliente**: pedido asignado a repartidor
- **Cliente**: repartidor confirmó recepción
- **Cliente**: repartidor en camino
- **Cliente**: pedido entregado
- **Admin**: cliente solicita pago

### 3. Permisos
- Solo **cliente registrado** puede crear pedido delivery
- Solo **admin/dueno** pueden confirmar pedidos delivery pendientes
- Solo **admin/dueno** pueden asignar pedidos a repartidores
- Solo **delivery** puede confirmar recepción y entregar
- Solo **admin/dueno** pueden confirmar pagos de delivery

### 4. Reutilización de Código
- Reutilizar lógica de `MozoPedidosService` en ambos servicios
- Reutilizar estructura de `home-mozo` en ambos componentes
- Reutilizar lógica de notificaciones realtime

### 5. Dirección de Entrega
- Dirección es **obligatoria** para pedidos delivery
- Coordenadas (latitud/longitud) son **opcionales** pero recomendadas
- Mostrar dirección en todos los componentes relevantes
- Validar que la dirección no esté vacía antes de crear pedido

### 6. Integración Leaflet
- Usar Leaflet para mapa interactivo
- Permitir selección de ubicación en mapa
- Opcionalmente, usar geocoding para convertir dirección a coordenadas
- Opcionalmente, usar reverse geocoding para convertir coordenadas a dirección
- Para rutas: usar Leaflet Routing Machine o API de Google Maps Directions

### 7. Chat Delivery-Cliente
- Replicar funcionalidad de chat mozo-cliente
- Crear salas de chat específicas para delivery
- Notificaciones push cuando hay mensajes nuevos
- Diferenciar visualmente chat con delivery vs chat con mozo

### 8. Mapa y Navegación
- Solicitar permisos de geolocalización para delivery
- Mostrar ubicación actual del delivery en tiempo real (opcional)
- Calcular y mostrar ruta hacia el cliente
- Integración con apps de navegación externas (Google Maps, Waze)

---

## ✅ CHECKLIST DE VALIDACIÓN (PRIMERA Y SEGUNDA PARTE DE LA CONSIGNA)

### PRIMERA PARTE:
- [x] Verificar que el pedido por Delivery sólo la puede realizar un cliente registrado
- [x] El cliente tiene la posibilidad de ingresar una dirección o marcarla en un mapa (Leaflet)
- [x] El cliente realiza un pedido (YA IMPLEMENTADO)
  - [x] Se pueden elegir los productos con cantidades (YA IMPLEMENTADO)
  - [x] Verificar que en todo momento esté visible el importe acumulado (YA IMPLEMENTADO)
  - [x] Mostrar el tiempo total estimado de realización del pedido (YA IMPLEMENTADO)
- [x] El cliente termina el pedido y espera la confirmación por parte del ADMIN/DUENO
  - [x] Push notification para el admin cuando le llega el pedido
  - [x] Push notification para el cliente cuando se lo aceptan
- [x] El pedido no debe ser derivado a sus respectivos sectores hasta que el admin no confirme el pedido
- [x] El cliente podrá acceder a ver el estado de su pedido en el apartado delivery pedido

### SEGUNDA PARTE:
- [x] El dueño o admin confirmará el pedido
  - [x] Verificar que el pedido se visualice en el listado correspondiente (push notification)
  - [x] Al confirmar (o no) el pedido, se le informará al cliente informando el tiempo de espera aproximado
  - [x] Si es confirmado, el Admin confirma el pedido, y este es derivado a los sectores correspondientes (cocina y bar)
  - [x] Verificar que las distintas partes del pedido se visualicen en dichos sectores (push notification) (YA IMPLEMENTADO ✅)
  - [x] Al aceptarle el pedido, el cliente podrá acceder a los juegos y aplicar los descuentos tal como funciona actualmente, además de visualizar el estado de su pedido EN EL APARTADO DELIVERY
- [x] El cliente accede a los juegos en busca de descuentos
  - [x] Verificar que solo se aplicará un descuento (el primero), solo si pudo ganar en el primer intento (YA IMPLEMENTADO ✅)
  - [x] Verificar que, una vez obtenido el beneficio, se puedan acceder libremente a todos los juegos, las veces que se quiera (YA IMPLEMENTADO ✅)
- [x] El sector cocina y/o bartender recibe los productos correspondientes
  - [x] Verificar que se visualice en el listado de pedidos pendientes:
    - [x] Número de mesa o número de Delivery
    - [x] Fecha (con hora, minutos y segundos)
    - [x] Los ítems que se deben elaborar en el sector
  - [x] El cliente verifica el cambio de estado en su pedido (IGUAL QUE CON EL FLUJO ACTUAL)

### TERCERA PARTE:
- [x] El Delivery confirma la recepción del pedido
  - [x] Verificar que el pedido se visualice en el listado del Delivery (push notification)
  - [x] Verificar la visualización del mapa (con la ruta) hacia el cliente
  - [x] Se habilita la 'sala de conversación' entre el Delivery y el cliente (REPLICAR EL CHAT CON EL MOZO)

### CUARTA PARTE:
- [ ] El Delivery entrega el pedido
  - [ ] El cliente confirma la recepción de su pedido
  - [ ] El cliente verifica el cambio de estado en su pedido (escaneando el QR de delivery)
  - [ ] El cliente vuelve a escanear el código QR de delivery y podrá acceder a los juegos, a la encuesta y a la opción de 'pedir la cuenta'
- [ ] El cliente accede a la encuesta adaptada para delivery
  - [ ] Verificar que la encuesta tenga el mismo formato pero con preguntas y valoraciones diferentes según si el pedido es de delivery
  - [ ] Verificar que sólo se pueda acceder una vez para poder agregar una encuesta nueva (una por pedido delivery)
- [ ] El cliente solicita la cuenta al delivery
  - [ ] Push notification al delivery cuando el cliente solicita la cuenta
  - [ ] Se habilita, mediante la lectura del código QR correspondiente, el ingreso de la propina (YA IMPLEMENTADO ✅)
  - [ ] El detalle de la cuenta tendrá:
    - [ ] Los pedidos realizados (con precios unitarios) con su respectivo importe (YA IMPLEMENTADO ✅)
    - [ ] Los descuentos correspondientes a los juegos (sólo si gana en el primer intento) (YA IMPLEMENTADO ✅)
    - [ ] El grado de satisfacción del cliente (propina) (YA IMPLEMENTADO ✅)
    - [ ] El TOTAL a abonar (grande y claro) (YA IMPLEMENTADO ✅)
- [ ] Generar boleta en formato PDF
  - [ ] Formato SIMILAR A LA CUENTA que se le muestra al cliente a la hora de pagar
  - [ ] Debe tener el detalle del pago, fecha, número de boleta
  - [ ] Logo del tridente
  - [ ] Dirección hardcodeada que usamos en la factura
  - [ ] Enviar por correo electrónico automáticamente (correo electrónico automático)

---

## 📊 FASE 16: ENTREGA DEL PEDIDO Y CONFIRMACIÓN DEL CLIENTE

### Fase 16.1: Delivery Marca Pedido como Entregado
- **Modificar** `src/app/components/home-delivery/home-delivery.component.ts`:
  - Agregar método `entregarPedidoAlCliente(pedidoId: number)`:
    - Cambiar estado del pedido a `'entregado'`
    - Notificar al cliente que el pedido fue entregado
    - Enviar push notification al cliente
- **Modificar** `src/app/services/delivery-pedidos.service.ts`:
  - Agregar método `entregarPedido(pedidoId: number)`:
    - Actualizar estado en BD
    - Notificar cliente vía realtime

### Fase 16.2: Cliente Confirma Recepción del Pedido
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`:
  - Agregar método `confirmarRecepcionDelivery()`:
    - Verificar que el pedido es delivery y está en estado `'entregado'`
    - Mostrar botón "Confirmar Recepción" solo para delivery entregado
    - Actualizar estado del pedido (opcional: agregar estado `'recibido por cliente'` o mantener `'entregado'`)
    - Notificar al delivery que el cliente confirmó recepción
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.html`:
  - Agregar botón de confirmación de recepción solo para delivery

### Fase 16.3: QR para Delivery (Escaneo Post-Entrega)
- **Modificar** `src/app/services/qr-html5.service.ts`:
  - Agregar tipo `QrDelivery`:
    ```typescript
    export type QrDelivery = { t: 'delivery'; pedido_id: number };
    ```
  - Actualizar `QrPayload` para incluir `QrDelivery`
- **Modificar** `src/app/components/home-cliente/home-cliente.component.ts`:
  - Agregar método `handleDeliveryScan(pedidoId: number)`:
    - Verificar que el pedido pertenece al cliente actual
    - Verificar que el pedido está entregado
    - Habilitar acceso a juegos, encuesta y pedir cuenta
    - Guardar estado de "QR escaneado" para este pedido
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`:
  - Agregar método `escanearQRDelivery()`:
    - Escanear QR de delivery
    - Verificar que corresponde al pedido actual
    - Habilitar funcionalidades post-entrega

---

## 📊 FASE 17: ENCUESTA ADAPTADA PARA DELIVERY

### Fase 17.1: Modificar Servicio de Encuestas
- **Modificar** `src/app/services/encuestas.service.ts`:
  - Agregar método `enviarEncuestaDelivery()`:
    - Similar a `enviarEncuesta()` pero adaptado para delivery
    - Validar que el pedido es delivery
    - Validar que no se haya completado encuesta para este pedido delivery
  - **Modificar** `EnviarEncuestaPayload`:
    - Agregar campo opcional `pedido_id?: number` para delivery
    - Agregar campo opcional `tipo_pedido?: 'mesa' | 'delivery'`
  - **Modificar** validación `puedeCompletarEncuesta()`:
    - Agregar lógica para delivery: verificar que tiene pedido delivery entregado
  - **Modificar** validación `yaCompletoEncuesta()`:
    - Agregar lógica para delivery: verificar que no haya completado encuesta para este pedido delivery

### Fase 17.2: Modificar Componente de Encuesta
- **Modificar** `src/app/components/pagina-formulario-encuesta/pagina-formulario-encuesta.ts`:
  - Detectar si el pedido es delivery o mesa
  - Mostrar preguntas diferentes según el tipo:
    - **Para mesa**: Limpieza del salón, aspecto valorado, servicios adicionales
    - **Para delivery**: 
      - Tiempo de entrega (1-5)
      - Calidad del empaque (1-5)
      - Actitud del repartidor (1-5)
      - Aspecto valorado (calidad_comida, tiempo_entrega, atencion_repartidor, etc.)
      - Servicios adicionales (empaque_adecuado, temperatura_correcta, etc.)
  - Adaptar labels y opciones según tipo de pedido
- **Modificar** `src/app/components/pagina-formulario-encuesta/pagina-formulario-encuesta.html`:
  - Mostrar campos condicionales según tipo de pedido
  - Adaptar textos según si es delivery o mesa

### Fase 17.3: Acceso a Encuesta desde Cliente
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`:
  - Agregar método `irAEncuestaDelivery()`:
    - Verificar que el pedido es delivery y está entregado
    - Verificar que no se haya completado encuesta para este pedido
    - Navegar a `/form-encuesta` con query params `tipo=delivery&pedido_id=...`
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.html`:
  - Mostrar botón "Completar Encuesta" solo para delivery entregado y si no se completó

---

## 📊 FASE 18: SOLICITUD DE CUENTA AL DELIVERY

### Fase 18.1: Cliente Solicita Cuenta al Delivery
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`:
  - **Modificar** método `pedirCuenta()`:
    - Detectar si el pedido es delivery
    - Si es delivery, enviar notificación al delivery (no al mozo)
    - Si es mesa, mantener comportamiento actual (enviar al mozo)
  - Agregar método `pedirCuentaDelivery()`:
    - Obtener información del pedido delivery
    - Enviar notificación al delivery vía realtime
    - Navegar al detalle de cuenta
- **Modificar** `src/app/services/cliente-realtime.service.ts`:
  - Agregar método `solicitarCuentaDelivery(pedidoId: number)`:
    - Enviar broadcast a canal `solicitud_cuenta_delivery`
    - Incluir información del pedido y cliente

### Fase 18.2: Delivery Recibe Notificación de Solicitud de Cuenta
- **Modificar** `src/app/services/delivery-realtime.service.ts`:
  - Agregar observable `solicitudCuenta$`:
    - Suscribirse a canal `solicitud_cuenta_delivery`
    - Emitir eventos cuando cliente solicita cuenta
    - Incluir información del pedido
- **Modificar** `src/app/components/home-delivery/home-delivery.component.ts`:
  - Suscribirse a `solicitudCuenta$` del `DeliveryRealtimeService`
  - Mostrar notificación push cuando cliente solicita cuenta
  - Mostrar badge/indicador en pedido correspondiente

### Fase 18.3: QR de Propina para Delivery
- **Modificar** `src/app/components/cliente/cliente-detalle-cuenta/cliente-detalle-cuenta.component.ts`:
  - **Modificar** método `escanearQRPropina()`:
    - Funcionará igual que para mesa (ya implementado)
    - El QR de propina es genérico y funciona para ambos tipos
  - **Modificar** método `cargarDetalleCuenta()`:
    - Detectar si el pedido es delivery
    - Mostrar información del delivery en lugar de mesa
    - Adaptar mensajes según tipo de pedido

---

## 📊 FASE 19: GENERACIÓN DE BOLETA PDF Y ENVÍO POR EMAIL

### Fase 19.1: Crear Edge Function para Generar Boleta
- **Crear** `supabase/functions/generar-boleta-delivery/index.ts`:
  - Similar a `generar-factura` pero adaptado para delivery
  - **Características:**
    - Generar PDF de boleta (no factura)
    - Formato similar a la cuenta que se muestra al cliente
    - Incluir: detalle del pago, fecha, número de boleta, logo del tridente, dirección hardcodeada
    - Enviar por email automáticamente al cliente
  - **Datos a incluir en PDF:**
    - Logo del tridente
    - Dirección del restaurante (hardcodeada, igual que en factura)
    - Número de boleta (formato: "BOLETA NºXXX")
    - Fecha y hora
    - Datos del cliente
    - Items del pedido (con precios unitarios)
    - Descuentos aplicados
    - Propina
    - Total final
    - Dirección de entrega (solo para delivery)

### Fase 19.2: Modificar Edge Function de Factura
- **Opcional**: Modificar `supabase/functions/generar-factura/index.ts`:
  - Agregar lógica para detectar si es delivery
  - Si es delivery, generar boleta en lugar de factura
  - O crear función separada (recomendado)

### Fase 19.3: Integración con Confirmación de Pago
- **Modificar** `src/app/components/admin/delivery-confirmar-pago/delivery-confirmar-pago.component.ts`:
  - **Modificar** método `confirmarPagoDelivery()`:
    - Después de marcar pedido como pagado
    - Llamar a edge function `generar-boleta-delivery`
    - Pasar `pedido_id` como parámetro
    - La función generará PDF y enviará por email automáticamente
  - Agregar manejo de errores y notificaciones

### Fase 19.4: Template de Boleta PDF
- **Crear** función `generarPDFBoleta()` en `supabase/functions/generar-boleta-delivery/index.ts`:
  - Usar `pdf-lib` (igual que factura)
  - **Estructura del PDF:**
    - Header: Logo del tridente, nombre del restaurante, dirección hardcodeada
    - Título: "BOLETA DE ENTREGA"
    - Número de boleta
    - Fecha y hora
    - Datos del cliente
    - Dirección de entrega (solo delivery)
    - Tabla de items: nombre, cantidad, precio unitario, subtotal
    - Sección de descuentos
    - Sección de propina
    - Total final (destacado)
    - Footer: información de contacto

### Fase 19.5: Envío de Email Automático
- **Integrar** en `generar-boleta-delivery`:
  - Después de generar PDF y subirlo a Storage
  - Obtener email del cliente desde `usuarios`
  - Enviar email con:
    - Asunto: "Tu boleta de entrega - El Tridente de la Gloria"
    - Cuerpo HTML con resumen de la boleta
    - Adjunto: PDF de la boleta
  - Usar SendGrid (igual que en otras funciones)
  - Incluir logo del tridente en el email

### Fase 19.6: Notificación al Cliente
- **Modificar** `src/app/services/cliente-realtime.service.ts`:
  - Agregar observable `boletaRecibida$`:
    - Suscribirse a canal `boleta_delivery_lista`
    - Emitir cuando boleta está lista
    - Incluir URL del PDF
- **Modificar** `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`:
  - Suscribirse a `boletaRecibida$`
  - Mostrar notificación push cuando boleta está lista
  - Mostrar mensaje con link para descargar boleta

---

## 📊 FASE 20: INTEGRACIÓN Y AJUSTES FINALES

### Fase 20.1: Estados de Pedido para Delivery
- **Verificar** que todos los estados estén correctamente implementados:
  - `'pendiente'` → Cliente crea pedido delivery
  - `'rechazado por admin'` → Admin rechaza pedido
  - `'pedido en curso'` → Admin confirma pedido
  - `'en preparación parcial'` → Cocina/Bartender en proceso
  - `'listo para entregar'` → Pedido listo
  - `'asignado a delivery'` → Admin asignó a delivery
  - `'confirmado por delivery'` → Delivery confirmó recepción
  - `'en camino'` (opcional) → Delivery en ruta
  - `'entregado'` → Delivery entregó al cliente
  - `'pendiente confirmacion pago'` → Cliente pagó, esperando confirmación
  - `'pagado'` → Admin confirmó pago

### Fase 20.2: Validaciones de Acceso Post-Entrega
- **Crear** servicio `src/app/services/delivery-access.service.ts` (opcional):
  - Métodos para validar acceso a funcionalidades post-entrega:
    - `puedeAccederAJuegos(pedidoId: number): Promise<boolean>`
    - `puedeAccederAEncuesta(pedidoId: number): Promise<boolean>`
    - `puedePedirCuenta(pedidoId: number): Promise<boolean>`
  - Validar que el pedido está entregado y pertenece al cliente

### Fase 20.3: UI/UX Mejoras
- **Mejorar** visualización de estados de delivery en `cliente-pedido-en-curso`
- **Agregar** iconos diferenciados para delivery vs mesa
- **Mejorar** mensajes de notificaciones push para delivery
- **Agregar** información del delivery en pantalla del cliente (nombre, teléfono opcional)

---

**Última actualización**: Plan completo con validaciones, dirección con Leaflet, notificaciones push con tiempo de espera, ajustes para cocina/bartender, juegos, mapa con ruta para delivery, chat delivery-cliente, entrega del pedido, confirmación del cliente, QR post-entrega, encuesta adaptada para delivery, solicitud de cuenta al delivery, y generación de boleta PDF con envío automático por email

