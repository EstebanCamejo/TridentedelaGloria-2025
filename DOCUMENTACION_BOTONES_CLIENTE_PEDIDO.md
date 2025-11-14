# Documentación: Botones del Componente Cliente-Pedido-En-Curso

## Variables de Control

- `estado`: Estado actual del pedido (ej: 'pendiente', 'pendiente aceptación', 'entregado', etc.)
- `yaRealizoPedido`: `true` si el cliente ya realizó un pedido
- `esClienteAnonimo`: `true` si el cliente es anónimo
- `esDelivery`: `true` si el pedido es de tipo delivery
- `repartidorInfo`: Información del repartidor (solo para delivery)
- `yaCompletoEncuesta`: `true` si el cliente ya completó la encuesta

---

## Botones en la Card de Pedido (Recuadro Negro)

### 1. **"✅ ACEPTAR PEDIDO"**
**Condición de visibilidad:**
```html
*ngIf="estado === 'pendiente aceptación'"
```

**Funcionamiento:**
- **Aparece cuando:** El mozo/delivery entrega el pedido (estado cambia a 'pendiente aceptación')
- **Aplica para:** ✅ Mesa (anónimo y registrado) | ✅ Delivery (anónimo y registrado)
- **Acción:** Cambia el estado a 'entregado' y notifica al delivery si es delivery
- **Después:** Desaparece y aparece el botón "PEDIR LA CUENTA"

---

### 2. **"PEDIR LA CUENTA"**
**Condición de visibilidad:**
```html
*ngIf="estado === 'entregado'"
```

**Funcionamiento:**
- **Aparece cuando:** El cliente acepta el pedido (estado = 'entregado')
- **Aplica para:** ✅ Mesa (anónimo y registrado) | ✅ Delivery (anónimo y registrado)
- **Acción:** 
  - Para mesa: Intenta obtener número de mesa y envía notificación al mozo
  - Para delivery: Navega directamente a la cuenta sin buscar mesa
- **Nota:** Funciona incluso si no se puede obtener la mesa (navega igual)

---

## Botones en la Zona de Acciones (Debajo de la Card)

### 3. **"VER MENÚ Y PEDIR"**
**Condición de visibilidad:**
```html
*ngIf="!yaRealizoPedido"
```

**Funcionamiento:**
- **Aparece cuando:** El cliente NO ha realizado ningún pedido aún
- **Aplica para:** ✅ Mesa (anónimo y registrado) | ✅ Delivery (anónimo y registrado)
- **Acción:** Navega a `/cliente/cliente-realiza-pedido`
- **Desaparece cuando:** El cliente realiza su primer pedido

---

### 4. **"EDITAR PEDIDO"**
**Condición de visibilidad:**
```html
*ngIf="estado === 'rechazado por mozo'"
```

**Funcionamiento:**
- **Aparece cuando:** El mozo rechaza el pedido
- **Aplica para:** ✅ Mesa (anónimo y registrado) | ❌ Delivery (no aplica)
- **Acción:** Navega a editar el pedido rechazado
- **Nota:** Solo para pedidos de mesa, no para delivery

---

### 5. **"CONSULTAS A LOS MOZOS" / "CONSULTAS AL REPARTIDOR"**
**Condición de visibilidad:**
```html
Siempre visible, pero puede estar deshabilitado
[disabled]="esDelivery && !repartidorInfo"
```

**Funcionamiento:**
- **Texto dinámico:**
  - Mesa: "CONSULTAS A LOS MOZOS"
  - Delivery: "CONSULTAS AL REPARTIDOR"
- **Deshabilitado cuando:**
  - Es delivery Y no hay repartidor asignado (`!repartidorInfo`)
- **Aplica para:** 
  - ✅ Mesa (anónimo y registrado): **SIEMPRE HABILITADO** - puede chatear en todo momento hasta que termina el flujo
  - ✅ Delivery (anónimo y registrado): Solo habilitado cuando hay repartidor asignado por el admin
- **Acción:** Navega al chat con mozo/repartidor
- **Nota importante:** 
  - Para pedidos de mesa, el cliente puede chatear en **TODO momento** (incluso si el pedido está pendiente o rechazado)
  - Para delivery, solo puede chatear una vez que el admin asigna un repartidor al pedido

---

### 6. **"JUEGOS"**
**Condición de visibilidad:**
```html
Siempre visible, pero puede estar deshabilitado
[disabled]="esClienteAnonimo || estado === 'pendiente' || estado === 'rechazado por admin'"
```

**Funcionamiento:**
- **Deshabilitado cuando:**
  - Cliente es anónimo (`esClienteAnonimo`)
  - Estado es 'pendiente'
  - Estado es 'rechazado por admin'
- **Aplica para:** 
  - ✅ Mesa (solo registrado) | ❌ Mesa (anónimo - deshabilitado)
  - ✅ Delivery (solo registrado) | ❌ Delivery (anónimo - deshabilitado)
- **Acción:** Navega a `/cliente/cliente-juegos`
- **Nota:** Los clientes anónimos NO pueden acceder a juegos

**⚠️ IMPORTANTE - RECLAMO DE DESCUENTO:**
- El descuento solo se puede reclamar **UNA VEZ** en la primera partida de **cualquier juego**
- Una vez reclamado el descuento, el cliente puede seguir jugando todos los juegos que quiera
- Pero **NO puede reclamar más descuentos** (el botón "Reclamar descuento" queda deshabilitado)
- La validación se hace tanto en el frontend (verificando `yaSeAplicoDescuento` y `juego_premio_reclamado`) como en el backend (función RPC `claim_game_discount`)

---

### 7. **"COMPLETAR ENCUESTA"**
**Condición de visibilidad:**
```html
*ngIf="estado === 'entregado'"
[disabled]="yaCompletoEncuesta || esClienteAnonimo"
```

**Funcionamiento:**
- **Aparece cuando:** El pedido está entregado (después de aceptar)
- **Deshabilitado cuando:**
  - Cliente ya completó la encuesta (`yaCompletoEncuesta`)
  - Cliente es anónimo (`esClienteAnonimo`)
- **Aplica para:**
  - ✅ Mesa (solo registrado) | ❌ Mesa (anónimo - deshabilitado)
  - ✅ Delivery (solo registrado) | ❌ Delivery (anónimo - deshabilitado)
- **Acción:** Navega a `/form-encuesta`
- **Nota:** Los clientes anónimos NO pueden completar encuestas

---

## Resumen por Escenario

### 📍 **PEDIDO DE MESA - CLIENTE ANÓNIMO**

| Botón | Visible | Habilitado | Notas |
|-------|---------|------------|-------|
| ACEPTAR PEDIDO | ✅ Si estado = 'pendiente aceptación' | ✅ Siempre | Aparece cuando mozo entrega |
| PEDIR LA CUENTA | ✅ Si estado = 'entregado' | ✅ Siempre | Después de aceptar |
| VER MENÚ Y PEDIR | ✅ Si no hay pedido | ✅ Siempre | Solo si no ha pedido |
| EDITAR PEDIDO | ✅ Si rechazado por mozo | ✅ Siempre | Solo si fue rechazado |
| CONSULTAS A MOZOS | ✅ Siempre | ✅ SIEMPRE HABILITADO | Puede chatear en todo momento |
| JUEGOS | ✅ Siempre | ❌ DESHABILITADO | Anónimos no pueden jugar |
| COMPLETAR ENCUESTA | ✅ Si entregado | ❌ DESHABILITADO | Anónimos no pueden encuestar |

---

### 📍 **PEDIDO DE MESA - CLIENTE REGISTRADO**

| Botón | Visible | Habilitado | Notas |
|-------|---------|------------|-------|
| ACEPTAR PEDIDO | ✅ Si estado = 'pendiente aceptación' | ✅ Siempre | Aparece cuando mozo entrega |
| PEDIR LA CUENTA | ✅ Si estado = 'entregado' | ✅ Siempre | Después de aceptar |
| VER MENÚ Y PEDIR | ✅ Si no hay pedido | ✅ Siempre | Solo si no ha pedido |
| EDITAR PEDIDO | ✅ Si rechazado por mozo | ✅ Siempre | Solo si fue rechazado |
| CONSULTAS A MOZOS | ✅ Siempre | ✅ SIEMPRE HABILITADO | Puede chatear en todo momento |
| JUEGOS | ✅ Siempre | ⚠️ Si estado válido | Deshabilitado si pendiente/rechazado/anónimo. Descuento solo 1 vez |
| COMPLETAR ENCUESTA | ✅ Si entregado | ⚠️ Si no completó | Deshabilitado si ya completó |

---

### 🚚 **PEDIDO DELIVERY - CLIENTE ANÓNIMO**

| Botón | Visible | Habilitado | Notas |
|-------|---------|------------|-------|
| ACEPTAR PEDIDO | ✅ Si estado = 'pendiente aceptación' | ✅ Siempre | Aparece cuando delivery entrega |
| PEDIR LA CUENTA | ✅ Si estado = 'entregado' | ✅ Siempre | Después de aceptar |
| VER MENÚ Y PEDIR | ✅ Si no hay pedido | ✅ Siempre | Solo si no ha pedido |
| EDITAR PEDIDO | ❌ NUNCA | ❌ | No aplica para delivery |
| CONSULTAS AL REPARTIDOR | ✅ Siempre | ⚠️ Si hay repartidor | Solo habilitado cuando admin asigna repartidor |
| JUEGOS | ✅ Siempre | ❌ DESHABILITADO | Anónimos no pueden jugar |
| COMPLETAR ENCUESTA | ✅ Si entregado | ❌ DESHABILITADO | Anónimos no pueden encuestar |

---

### 🚚 **PEDIDO DELIVERY - CLIENTE REGISTRADO**

| Botón | Visible | Habilitado | Notas |
|-------|---------|------------|-------|
| ACEPTAR PEDIDO | ✅ Si estado = 'pendiente aceptación' | ✅ Siempre | Aparece cuando delivery entrega |
| PEDIR LA CUENTA | ✅ Si estado = 'entregado' | ✅ Siempre | Después de aceptar |
| VER MENÚ Y PEDIR | ✅ Si no hay pedido | ✅ Siempre | Solo si no ha pedido |
| EDITAR PEDIDO | ❌ NUNCA | ❌ | No aplica para delivery |
| CONSULTAS AL REPARTIDOR | ✅ Siempre | ⚠️ Si hay repartidor | Solo habilitado cuando admin asigna repartidor |
| JUEGOS | ✅ Siempre | ⚠️ Si estado válido | Deshabilitado si pendiente/rechazado. Descuento solo 1 vez |
| COMPLETAR ENCUESTA | ✅ Si entregado | ⚠️ Si no completó | Deshabilitado si ya completó |

---

## Flujo de Estados

```
1. Cliente realiza pedido
   ↓
2. Estado: 'pendiente' → Botón "VER MENÚ Y PEDIR" desaparece
   ↓
3. Mozo/Delivery entrega
   ↓
4. Estado: 'pendiente aceptación' → Aparece botón "ACEPTAR PEDIDO"
   ↓
5. Cliente acepta
   ↓
6. Estado: 'entregado' → Aparece "PEDIR LA CUENTA" y "COMPLETAR ENCUESTA"
```

---

## Diferencias Clave: Mesa vs Delivery

1. **EDITAR PEDIDO:** Solo existe para mesa, no para delivery
2. **CHAT:** 
   - Mesa: "CONSULTAS A LOS MOZOS" - **SIEMPRE HABILITADO** (puede chatear en todo momento)
   - Delivery: "CONSULTAS AL REPARTIDOR" (solo habilitado cuando admin asigna repartidor)
3. **PEDIR CUENTA:**
   - Mesa: Busca mesa y envía notificación al mozo
   - Delivery: Navega directamente sin buscar mesa

---

## Diferencias Clave: Anónimo vs Registrado

1. **JUEGOS:** Anónimos NO pueden acceder (siempre deshabilitado)
2. **ENCUESTA:** Anónimos NO pueden completar (siempre deshabilitado)
3. **Resto de funcionalidades:** Igual para ambos tipos de cliente

