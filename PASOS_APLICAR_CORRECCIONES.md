# 📋 PASOS PARA APLICAR CORRECCIONES

## ✅ **PASO 1: Ejecutar SQL Fix para Descuentos**

1. Abrir **Supabase Dashboard** → **SQL Editor**
2. Abrir el archivo: `sql_fix_claim_game_discount_constraint.sql`
3. **Copiar TODO el contenido** del archivo
4. **Pegar en el SQL Editor** de Supabase
5. **Ejecutar** (botón "Run" o F5)
6. **Verificar** que todos los pasos muestren "Success" o resultados esperados

### 🔍 **Qué verificar después del SQL:**
- Debe aparecer la función `claim_game_discount` con los argumentos correctos
- No debe haber errores en rojo

---

## ✅ **PASO 2: Compilar/Buildear la Aplicación**

```bash
# En la terminal del proyecto
npm run build
# O si usas Ionic:
ionic build
```

### ⚠️ **Si hay errores de compilación:**
- Revisar los errores en la consola
- Verificar que todos los archivos modificados estén guardados
- Si hay errores de TypeScript, reportarlos

---

## ✅ **PASO 3: Probar las Correcciones**

### **3.1. Probar Descuentos (Cliente)**
1. **Login como cliente registrado**
2. **Hacer un pedido delivery** (o usar uno existente en "pedido en curso")
3. **Ir a Juegos** → Jugar cualquier juego (Tap, Memoria, Trivia)
4. **Intentar reclamar descuento**
5. **Verificar:**
   - ✅ No debe aparecer error `uniq_juego_premio_global`
   - ✅ El descuento se aplica correctamente
   - ✅ El total del pedido se actualiza
   - ✅ Puede reclamar descuento **1 sola vez por pedido**

### **3.2. Probar Scroll de Encuestas (Cliente)**
1. **Login como cliente**
2. **Tener un pedido en estado "entregado"**
3. **Confirmar recepción** (si es delivery)
4. **Verificar:**
   - ✅ El botón de encuesta aparece
   - ✅ **Hace scroll automático** al botón de encuesta
   - ✅ Los botones se ven más pequeños cuando hay 4 botones (incluyendo encuesta)
   - ✅ Puede hacer scroll manual si es necesario

### **3.3. Probar Push a Cocinero/Bartender (Admin → Cocinero/Bartender)**
1. **Login como Admin** en un dispositivo/navegador
2. **Login como Cocinero/Bartender** en otro dispositivo/navegador
3. **Como Admin:**
   - Ir a "Pedidos Delivery"
   - Aceptar un pedido delivery pendiente
   - Ingresar tiempo estimado
4. **Como Cocinero/Bartender:**
   - ✅ Debe recibir **push notification** con título: "🍽️ Nuevo pedido en curso - Delivery #ID"
   - ✅ El pedido debe aparecer en su lista de pedidos

---

## ✅ **PASO 4: Verificar Consola (Si hay Problemas)**

### **Para Descuentos:**
- Filtrar consola por: `[DEBUG TRIVIA]`, `[DEBUG TAP]`, `[DEBUG MEMORIA]`
- Buscar errores en rojo
- Verificar que el RPC retorne `applied: true`

### **Para Scroll:**
- Filtrar consola por: `[ClientePedidoEnCurso]`
- Buscar: "Scroll al botón de encuesta realizado"

### **Para Push Notifications:**
- Filtrar consola por: `[BartenderCocineroRealtimeService]`
- Buscar: "Notificación LOCAL enviada"
- Verificar que detecte el cambio de estado

---

## 📝 **CHECKLIST FINAL**

- [ ] SQL ejecutado correctamente
- [ ] Aplicación compilada sin errores
- [ ] Descuentos funcionan (sin error de constraint)
- [ ] Scroll de encuestas funciona
- [ ] Push notifications a cocinero/bartender funcionan
- [ ] No hay errores en consola

---

## 🚨 **SI ALGO NO FUNCIONA:**

1. **Revisar consola** (usar filtros según el problema)
2. **Capturar solo errores** (rojos) o logs específicos del problema
3. **Reportar:**
   - Qué paso falló
   - Qué error aparece en consola
   - Screenshot del error (máximo 3-5 capturas)

---

## 💡 **NOTAS IMPORTANTES:**

- **Descuentos:** Solo se pueden reclamar **1 vez por pedido**, no importa qué juego
- **Scroll:** Se activa automáticamente cuando el pedido está "entregado" y la encuesta está habilitada
- **Push:** Solo se envía cuando el admin **acepta** el pedido (cambia de "pendiente" a "pedido en curso")

