# 🔧 RESUMEN DE CORRECCIONES APLICADAS

## 📋 PROBLEMAS IDENTIFICADOS Y SOLUCIONADOS

### ✅ **1. Chat no funciona**
**Error:** `null value in column "mesa_num" of relation "chat_rooms" violates not-null constraint`

**Solución:**
- ✅ Script SQL creado: `sql_fix_chat_mesa_num_nullable.sql`
- ✅ Hace `mesa_num` nullable en la tabla `chat_rooms`
- ✅ Actualiza registros existentes de delivery que tengan `mesa_num` incorrecto

**Archivo:** `sql_fix_chat_mesa_num_nullable.sql`

---

### ✅ **2. Descuentos solo se aplican después de entregado**
**Error:** `El pedido no está en un estado elegible para descuentos`

**Solución:**
- ✅ Script SQL creado: `sql_modificar_claim_game_discount.sql`
- ✅ Modifica la función RPC `claim_game_discount` para permitir descuentos cuando el pedido está en "pedido en curso" o estados posteriores
- ✅ Aplica tanto para pedidos de mesa como delivery

**Archivo:** `sql_modificar_claim_game_discount.sql`

**Estados válidos ahora:**
- `pedido en curso`
- `en preparación`
- `en preparación parcial`
- `listo para entregar`
- `asignado a delivery`
- `confirmado por delivery`
- `en camino`
- `entregado`
- `pendiente confirmacion pago`
- `pagado`

---

### ✅ **3. Encuesta no se envía - Error en inglés**
**Error:** `Key (encuesta_id)=(00000000-0000-0000-0000-000000000002) is not present in table "encuesta"`

**Solución:**
- ✅ Script SQL creado: `sql_crear_encuesta_delivery.sql`
- ✅ Crea el registro de encuesta para delivery en la tabla `encuesta`
- ✅ Verifica si ya existe antes de insertar (idempotente)

**Archivo:** `sql_crear_encuesta_delivery.sql`

---

### ✅ **4. yaCompletoEncuesta habilitado para delivery**
**Problema:** La lógica estaba deshabilitada temporalmente y no funcionaba para delivery

**Solución:**
- ✅ Modificado `cliente-pedido-en-curso.component.ts`:
  - Inyectado `EncuestasService`
  - Modificado `verificarEstadoEncuesta()` para usar `yaCompletoEncuestaDelivery()` cuando es delivery
  - Mantiene lógica original para pedidos de mesa

**Archivos modificados:**
- `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`

---

### ✅ **5. Botón de encuestas muy abajo y no se puede scrollear**
**Problema:** El botón quedaba fuera de la vista cuando se habilitaba

**Solución:**
- ✅ Aumentado `padding-bottom` en `.client-wrap` de `clamp(140px, 18svh, 200px)` a `clamp(200px, 25svh, 300px)`
- ✅ Agregado `overflow-y: auto !important` y `height: 100%` en `.client-content`
- ✅ Implementado scroll automático al botón cuando se habilita:
  - Agregado `@ViewChild` para referencia al botón
  - Agregado método `scrollToEncuestaButton()`
  - Implementado `ngAfterViewChecked()` para detectar cuando se habilita el botón
  - Agregado `#botonEncuesta` en el template HTML

**Archivos modificados:**
- `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`
- `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.html`
- `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.scss`

---

## 📝 SCRIPTS SQL A EJECUTAR (EN ORDEN)

1. **`sql_fix_chat_mesa_num_nullable.sql`** - Hacer `mesa_num` nullable
2. **`sql_crear_encuesta_delivery.sql`** - Crear encuesta delivery
3. **`sql_modificar_claim_game_discount.sql`** - Modificar función RPC para descuentos

---

## 🔍 ARCHIVOS MODIFICADOS

### TypeScript:
- `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.ts`
  - Agregado import de `EncuestasService`
  - Inyectado `EncuestasService` en constructor
  - Modificado `verificarEstadoEncuesta()` para usar `yaCompletoEncuestaDelivery()` cuando es delivery
  - Agregado `@ViewChild` para referencia al botón de encuesta
  - Agregado método `scrollToEncuestaButton()`
  - Implementado `ngAfterViewChecked()` para scroll automático

### HTML:
- `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.html`
  - Agregado `#botonEncuesta` al botón de encuesta

### SCSS:
- `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.scss`
  - Aumentado `padding-bottom` en `.client-wrap`
  - Mejorado scroll en `.client-content`

### SQL (NUEVOS):
- `sql_fix_chat_mesa_num_nullable.sql`
- `sql_crear_encuesta_delivery.sql`
- `sql_modificar_claim_game_discount.sql`

---

## ✅ PRÓXIMOS PASOS

1. **Ejecutar los 3 scripts SQL en Supabase** (en el orden indicado)
2. **Compilar y probar:**
   - Chat con delivery (debe funcionar sin error de `mesa_num`)
   - Descuentos de juegos (debe permitir reclamar cuando el pedido está en "pedido en curso")
   - Encuesta delivery (debe enviarse correctamente)
   - Scroll al botón de encuestas (debe hacer scroll automático cuando se habilita)

---

## 🐛 DEBUGGING

Si algún problema persiste después de aplicar estos cambios:

1. **Chat:** Verificar en consola que `mesa_num` sea `null` para delivery
2. **Descuentos:** Verificar en consola el estado del pedido cuando se intenta reclamar
3. **Encuesta:** Verificar que el `encuesta_id` `00000000-0000-0000-0000-000000000002` existe en la tabla `encuesta`
4. **Scroll:** Verificar en consola los logs de `[ClientePedidoEnCurso] ✅ Scroll al botón de encuesta realizado`

