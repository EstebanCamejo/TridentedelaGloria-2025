# 🧪 Probar Envío de Email con Resend

## ✅ Tu Email en Resend

Tu email `estebaneduardocamejo@gmail.com` está registrado en Resend y aparece en **Settings → Team**. Esto es correcto.

## 🔍 Verificar si Funciona

En Resend, cuando usas un **email personal** (como Gmail), normalmente **NO necesitas verificación explícita** para empezar a enviar. Resend permite enviar desde emails personales en el plan gratuito.

La mejor forma de verificar si todo funciona es **probando el envío real**.

## 🧪 Opción 1: Probar desde la App (Recomendado)

1. **Abre tu app** como administrador
2. Ve a la sección de **clientes pendientes**
3. **Aprueba o rechaza** un cliente
4. **Verifica** que el email llegue al cliente

Si el email llega → ✅ **Todo funciona correctamente**

## 🧪 Opción 2: Probar desde Supabase Dashboard

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Selecciona la función **`notificar-cliente`**
3. Haz clic en **"Invoke"** o **"Test"** (si está disponible)
4. Usa este body de prueba:
```json
{
  "email": "estebaneduardocamejo@gmail.com",
  "nombres": "Test",
  "apellidos": "Usuario",
  "estado": "aprobado",
  "tipo": "registro"
}
```
5. Haz clic en **"Invoke"**
6. Revisa tu bandeja de entrada por el email

## 🧪 Opción 3: Verificar Logs

1. Ve a **Supabase Dashboard** → **Edge Functions** → **`notificar-cliente`**
2. Ve a la pestaña **"Logs"**
3. Busca mensajes como:
   - `🔑 Verificando configuración Resend...`
   - `📤 Enviando email a Resend...`
   - `✅ Email enviado exitosamente`
   - O errores si algo falla

## 📊 Verificar en Resend Dashboard

Después de enviar un email:

1. Ve a **Resend Dashboard** → **Emails**
2. Deberías ver el email que enviaste listado ahí
3. Verás el estado:
   - ✅ **Delivered** (Entregado)
   - ⏳ **Pending** (Pendiente)
   - ❌ **Failed** (Fallido)

## ⚠️ Si Hay Errores

### Error: "Domain not verified"
- Esto es normal si usas un email personal
- Resend permite enviar desde emails personales sin verificar dominio
- Si ves este error, puede ser un límite del plan gratuito

### Error: "Unauthorized" (401)
- Verifica que `RESEND_API_KEY` sea correcto
- Asegúrate de que la API Key no haya sido revocada

### Los emails no llegan
- Revisa la carpeta de **spam**
- Verifica los logs en Supabase
- Revisa el dashboard de Resend para ver el estado

## ✅ Próximos Pasos

1. **Prueba enviar un email** desde tu app (aprobando/rechazando un cliente)
2. **Revisa tu bandeja** (y spam) por el email
3. **Revisa los logs** en Supabase para confirmar que se envió
4. **Revisa el dashboard de Resend** → **Emails** para ver el estado

---

**¿Quieres que te ayude a hacer una prueba ahora mismo?** Puedo guiarte paso a paso.

