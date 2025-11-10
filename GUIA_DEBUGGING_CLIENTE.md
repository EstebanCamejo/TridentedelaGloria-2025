# 🔍 GUÍA DE DEBUGGING - CLIENTE (Delivery)

## 📋 QUÉ ENVIAR

### ✅ **ENVIAR SOLO:**
1. **Errores en rojo** (cualquier error que aparezca)
2. **Warnings importantes** (amarillos que indiquen problemas)
3. **Logs específicos** con estos prefijos (solo si hay problemas):
   - `[ClientePedidoEnCurso]` - Estado del pedido, encuesta, recepción
   - `[TAP]` / `[MEMORIA]` / `[TRIVIA]` - Solo cuando hay problemas con descuentos
   - `[ChatService]` / `[ChatComponent]` - Solo cuando el chat no funciona
   - `[ClienteRealtimeService]` - Solo cuando no llegan notificaciones push
   - `[EncuestasService]` - Solo cuando la encuesta no se envía

### ❌ **NO ENVIAR:**
- Logs de éxito normales (✅, 🔔, etc.)
- Logs de navegación rutinaria
- Logs de carga de datos exitosos
- Más de 5-10 capturas por problema

---

## 🎯 PROBLEMAS ESPECÍFICOS A VERIFICAR

### **1. CHAT NO FUNCIONA**
**Buscar en consola:**
```
[ChatService] ❌
[ChatComponent] ❌
Error: null value in column "mesa_num"
Error: chat_rooms
```

**Qué hacer:**
- Intentar enviar un mensaje
- Capturar SOLO el error que aparece
- No enviar logs de éxito

---

### **2. DESCUENTOS NO SE APLICAN**
**Buscar en consola:**
```
[TAP] ❌ ERROR
[MEMORIA] ❌ ERROR
[TRIVIA] ❌ ERROR
claim_game_discount
El pedido no está en un estado elegible
Ya se reclamó un descuento
```

**Qué hacer:**
- Jugar un juego y intentar reclamar descuento
- Capturar SOLO el error o el log que dice por qué no se aplicó
- Verificar que el pedido esté en "pedido en curso" o posterior

---

### **3. ENCUESTA NO SE ENVÍA**
**Buscar en consola:**
```
[EncuestasService] ❌
[DEBUG ENCUESTA] ❌
Error: Key (encuesta_id)
Error: encuesta_respuesta
```

**Qué hacer:**
- Completar la encuesta y enviarla
- Capturar SOLO el error que aparece al enviar
- No enviar logs de carga del formulario

---

### **4. PUSH NOTIFICACIONES NO LLEGAN**
**Buscar en consola:**
```
[ClienteRealtimeService] ❌
Error: LocalNotifications
Error: channel
```

**Qué hacer:**
- Verificar que el pedido cambió de estado
- Capturar SOLO si no llega la notificación esperada
- No enviar logs de notificaciones que sí llegaron

---

### **5. PEDIDO NO SE PUEDE ENTREGAR**
**Buscar en consola:**
```
[ClientePedidoEnCurso] ❌
confirmarRecepcionDelivery
Error: pedidos
```

**Qué hacer:**
- Intentar confirmar recepción
- Capturar SOLO el error que aparece
- Verificar el estado actual del pedido

---

## 📝 FORMATO RECOMENDADO

### **Opción 1: Solo Errores (RECOMENDADO)**
1. Filtrar consola por "Error" o "❌"
2. Capturar solo las líneas con errores
3. Incluir 2-3 líneas de contexto antes del error

### **Opción 2: Errores + Logs Específicos**
1. Filtrar por prefijos críticos: `[ChatService]`, `[TAP]`, `[EncuestasService]`
2. Capturar solo cuando hay problemas
3. Máximo 5-10 capturas por problema

---

## 🔍 COMANDOS ÚTILES EN CHROME DEVTOOLS

### **Filtrar solo errores:**
```
En la consola, escribir: -info -log -warn
O usar el filtro: "Errors only"
```

### **Filtrar por prefijo:**
```
En la consola, escribir: [ChatService] o [TAP] o [EncuestasService]
```

### **Limpiar consola antes de probar:**
```
Click en el ícono de "limpiar" (🚫) o Ctrl+L
```

---

## ✅ CHECKLIST ANTES DE ENVIAR

- [ ] ¿Hay errores en rojo? → **SÍ, enviar**
- [ ] ¿El problema es específico? → **Enviar solo logs relacionados**
- [ ] ¿Son más de 10 capturas? → **Filtrar y enviar solo lo crítico**
- [ ] ¿Los logs son de éxito? → **NO enviar, solo si hay problema**

---

## 🎯 RESUMEN: QUÉ ENVIAR

**ENVIAR:**
- ✅ Errores (rojos)
- ✅ Warnings críticos
- ✅ Logs de prefijos específicos cuando hay problemas

**NO ENVIAR:**
- ❌ Logs de éxito normales
- ❌ Más de 10 capturas
- ❌ Logs no relacionados con el problema

---

## 📱 FLUJO DE PRUEBA SUGERIDO

1. **Limpiar consola** (Ctrl+L)
2. **Reproducir el problema** (ej: intentar chatear)
3. **Filtrar por errores** (solo rojos)
4. **Capturar 1-3 screenshots** máximo
5. **Enviar con descripción breve** del problema

---

## 💡 TIP

Si hay muchos logs, usa el filtro de Chrome DevTools:
- Click en el ícono de filtro (🔍)
- Escribe: `Error` o `❌` o el prefijo específico
- Solo verás lo relevante

