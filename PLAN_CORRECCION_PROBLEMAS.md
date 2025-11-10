# 🔧 PLAN DE CORRECCIÓN: Problemas Identificados

## 📋 RESUMEN DE PROBLEMAS

### **1. ❌ Chat no funciona**
**Error:** `null value in column "mesa_num" of relation "chat_rooms" violates not-null constraint`
**Causa:** La columna `mesa_num` en `chat_rooms` tiene constraint `NOT NULL`, pero para delivery se intenta insertar `null`.
**Solución:** Hacer `mesa_num` nullable en la tabla `chat_rooms`.

---

### **2. ❌ Descuentos solo se aplican después de entregado**
**Error:** `El pedido no está en un estado elegible para descuentos`
**Causa:** La función RPC `claim_game_discount` en Supabase valida que el pedido esté en un estado específico (probablemente "entregado").
**Solución:** Modificar la función RPC para permitir descuentos cuando el pedido está en "pedido en curso" o estados posteriores (después de que admin confirma).

---

### **3. ⚠️ Botón de encuestas muy abajo y no se puede scrollear**
**Causa:** El botón está dentro de `action-stack` pero el `padding-bottom` del contenedor puede no ser suficiente, o el scroll no está funcionando correctamente.
**Solución:** Ajustar CSS para asegurar scroll correcto y suficiente espacio al final.

---

### **4. ❌ Encuesta no se envía - Error en inglés**
**Error:** `Key (encuesta_id)=(00000000-0000-0000-0000-000000000002) is not present in table "encuesta"`
**Causa:** El `encuesta_id` para delivery (`00000000-0000-0000-0000-000000000002`) no existe en la tabla `encuesta`.
**Solución:** Crear el registro de encuesta para delivery en la tabla `encuesta`.

---

### **5. ⚠️ yaCompletoEncuesta TEMPORALMENTE DESHABILITADO**
**Causa:** El código está comentado y siempre retorna `FALSE`, lo que puede causar problemas en la validación de encuestas.
**Solución:** Habilitar la lógica correcta para delivery (usando `pedido_id` en lugar de `lista_espera_id`).

---

## 🎯 ORDEN DE CORRECCIÓN

1. **Chat (CRÍTICO)** - Script SQL para hacer `mesa_num` nullable
2. **Encuesta (CRÍTICO)** - Script SQL para crear encuesta delivery
3. **Descuentos (IMPORTANTE)** - Script SQL para modificar función RPC
4. **yaCompletoEncuesta** - Habilitar lógica correcta en código
5. **Scroll de encuestas** - Ajustar CSS

---

## 📝 SCRIPTS SQL NECESARIOS

### Script 1: Hacer `mesa_num` nullable en `chat_rooms`
### Script 2: Crear encuesta delivery en tabla `encuesta`
### Script 3: Modificar función RPC `claim_game_discount` para permitir descuentos en "pedido en curso"

---

## 🔍 ARCHIVOS A MODIFICAR

1. `src/app/services/chat.service.ts` - Ya está intentando insertar `mesa_num: null`, el problema es la BD
2. `src/app/services/supabase.service.ts` - Habilitar `yaCompletoEncuesta` para delivery
3. `src/app/services/encuestas.service.ts` - Ya tiene lógica para delivery, pero necesita que exista la encuesta
4. `src/app/components/cliente-pedido-en-curso/cliente-pedido-en-curso.component.scss` - Mejorar scroll

