# Guía de Configuración de Resend

Esta guía te ayudará a configurar Resend para reemplazar SendGrid en las funciones de email para clientes.

## 📋 Resumen de Cambios

Se migraron las siguientes funciones de **SendGrid** a **Resend**:
- ✅ `notificar-cliente` - Emails de aprobación/rechazo de registros y reservas
- ✅ `generar-factura` - Envío de facturas por email

**Nota:** Las funciones `notificar-mozo` y `notificar-bartender-cocinero` siguen usando SendGrid (son para empleados, no clientes).

## 🔑 Datos Necesarios de Resend

Para configurar Resend necesitas:

1. **API Key de Resend** - Se obtiene desde el dashboard de Resend
2. **Email "From" verificado** - Puede ser un email personal o de dominio

## 📝 Pasos para Configurar Resend

### Paso 1: Crear/Acceder a tu cuenta de Resend

1. Ve a https://resend.com
2. Inicia sesión o crea una cuenta nueva

### Paso 2: Verificar un dominio o email

**Opción A: Usar email personal (más rápido para empezar)**
- Resend permite usar emails personales como `eltridentedelagloria@gmail.com`
- Solo necesitas verificar el email haciendo clic en el enlace que te envían

**Opción B: Verificar un dominio (recomendado para producción)**
- Ve a "Domains" en el dashboard
- Agrega tu dominio (ej: `tridentedelagloria.com`)
- Configura los registros DNS que te indique Resend:
  - SPF record
  - DKIM record
  - DMARC record (opcional pero recomendado)

### Paso 3: Obtener tu API Key

1. Ve a **Settings** → **API Keys** en el dashboard de Resend
2. Haz clic en **"Create API Key"**
3. Dale un nombre descriptivo (ej: "Tridente de la Gloria - Producción")
4. Copia el API Key (solo se muestra una vez, guárdalo bien)

### Paso 4: Configurar variables de entorno en Supabase

Necesitas configurar estos secrets en Supabase:

```bash
# Reemplaza estos valores con los tuyos
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Tu API Key de Resend
RESEND_FROM="El Tridente de la Gloria <eltridentedelagloria@gmail.com>"  # Email verificado
```

**Cómo configurar secrets en Supabase:**

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **Settings** → **Edge Functions** → **Secrets**
3. Agrega los siguientes secrets:
   - `RESEND_API_KEY` = `tu_api_key_aqui`
   - `RESEND_FROM` = `El Tridente de la Gloria <tu_email@dominio.com>`

**Formato del RESEND_FROM:**
- Con nombre: `"El Tridente de la Gloria <email@dominio.com>"`
- Solo email: `"email@dominio.com"`

### Paso 5: Desplegar las funciones actualizadas

Las funciones ya están migradas en el código. Solo necesitas desplegarlas:

```bash
# Desde la raíz del proyecto
supabase functions deploy notificar-cliente
supabase functions deploy generar-factura
```

## 🧪 Probar la Configuración

### Probar notificar-cliente

Puedes probar desde la app:
1. Aprobar o rechazar un registro de cliente desde el panel de admin
2. Verificar que el email llegue correctamente

O desde la consola de Supabase:
```sql
-- Invocar manualmente (desde Supabase Dashboard → Edge Functions → notificar-cliente)
-- Body de ejemplo:
{
  "email": "cliente@ejemplo.com",
  "nombres": "Juan",
  "apellidos": "Pérez",
  "estado": "aprobado",
  "tipo": "registro"
}
```

### Probar generar-factura

1. Genera una factura desde la app (mozo confirma pago)
2. Verifica que el email con la factura llegue al cliente

## 🔍 Verificar Logs

Para ver los logs de las funciones:

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Selecciona la función (`notificar-cliente` o `generar-factura`)
3. Ve a la pestaña **Logs**
4. Busca mensajes como:
   - `🔑 Verificando configuración Resend...`
   - `📤 Enviando email a Resend...`
   - `✅ Email enviado exitosamente`

## ⚠️ Troubleshooting

### Error: "Missing RESEND_API_KEY or RESEND_FROM"
- Verifica que hayas configurado los secrets en Supabase
- Asegúrate de que los nombres sean exactos: `RESEND_API_KEY` y `RESEND_FROM`

### Error 401: "Unauthorized"
- Tu API Key es inválida o fue revocada
- Genera una nueva API Key en Resend y actualiza el secret

### Error: "Domain not verified"
- Si usas un dominio, verifica que esté correctamente configurado en Resend
- Si usas un email personal, verifica que hayas confirmado el email de verificación

### Los emails no llegan
- Revisa la carpeta de spam
- Verifica los logs de Resend en su dashboard
- Asegúrate de que el email "from" esté verificado

## 📊 Monitoreo en Resend

Resend tiene un dashboard donde puedes:
- Ver todos los emails enviados
- Ver estadísticas de entrega
- Ver bounces y errores
- Configurar webhooks para eventos

Accede desde: https://resend.com/emails

## 🔄 Migración desde SendGrid

Si ya tenías SendGrid configurado:

1. **NO elimines** las variables `SENDGRID_API_KEY` y `SENDGRID_FROM` todavía
2. Agrega las nuevas variables `RESEND_API_KEY` y `RESEND_FROM`
3. Despliega las funciones actualizadas
4. Prueba que todo funcione
5. Una vez confirmado, puedes eliminar las variables de SendGrid (las funciones de empleados aún las usan)

## 📚 Recursos

- Documentación de Resend: https://resend.com/docs
- API Reference: https://resend.com/docs/api-reference/emails/send-email
- Dashboard: https://resend.com/emails

## ✅ Checklist de Configuración

- [ ] Cuenta de Resend creada
- [ ] Email o dominio verificado
- [ ] API Key generada
- [ ] Secrets configurados en Supabase (`RESEND_API_KEY` y `RESEND_FROM`)
- [ ] Funciones desplegadas (`notificar-cliente` y `generar-factura`)
- [ ] Prueba de envío exitosa
- [ ] Verificación de logs sin errores

---

**¿Necesitas ayuda?** Revisa los logs de las funciones en Supabase o consulta la documentación de Resend.

