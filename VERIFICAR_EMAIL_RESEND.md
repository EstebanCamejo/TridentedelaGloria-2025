# 🔍 Cómo Verificar tu Email en Resend

## 📍 Acceder al Dashboard de Resend

1. **Ve a:** https://resend.com
2. **Haz clic en "Sign In"** (Iniciar Sesión) en la esquina superior derecha
3. **Inicia sesión** con tu email: `estebaneduardocamejo@gmail.com`
4. Una vez dentro, estarás en el **Dashboard principal**

## 🔍 Verificar si tu Email está Verificado

### Opción 1: Desde el Dashboard Principal

1. Una vez que inicies sesión, el dashboard te mostrará:
   - **Emails enviados**
   - **Dominios verificados** (si tienes alguno)
   - **API Keys** (ya tienes una: "Tridente de la Gloria - Producción")

2. Si tu email está verificado, normalmente verás un indicador verde o un check ✅

### Opción 2: Desde Settings → Profile

1. En el menú lateral izquierdo, busca **"Settings"** (Configuración) ⚙️
2. Haz clic en **"Profile"** (Perfil)
3. Verás tu email: `estebaneduardocamejo@gmail.com`
4. Si está verificado, verás un indicador como:
   - ✅ "Verified" (Verificado)
   - Un check verde
   - O simplemente el email sin advertencias

### Opción 3: Intentar Enviar un Email de Prueba

Si tu email NO está verificado, Resend te mostrará un error cuando intentes enviar.

## ✅ Si tu Email NO está Verificado

### Paso 1: Verificar desde el Dashboard

1. Ve a **Settings** → **Profile**
2. Si ves tu email pero NO tiene un check ✅, haz clic en **"Verify Email"** o **"Resend Verification"**
3. Revisa tu bandeja de entrada (y spam) por el email de verificación

### Paso 2: Verificar desde el Email de Bienvenida

Los emails de bienvenida de Resend a veces incluyen un enlace de verificación. Revisa:
- El email de bienvenida que recibiste
- Busca botones o enlaces que digan "Verify Email" o "Confirm Email"

### Paso 3: Verificar Manualmente

1. Ve a **Settings** → **Profile**
2. Busca la sección de **"Email Verification"**
3. Haz clic en **"Send Verification Email"** o **"Verify"**
4. Revisa tu bandeja de entrada por el email de verificación
5. Haz clic en el enlace del email

## 🧪 Probar si Funciona

La mejor forma de saber si tu email está verificado es **intentar enviar un email de prueba**:

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Selecciona `notificar-cliente`
3. Haz clic en **"Invoke"** o **"Test"**
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

5. Si el email está verificado, deberías recibir el email
6. Si NO está verificado, verás un error en los logs

## 📧 Buscar el Email de Verificación

Si no encuentras el email de verificación:

1. **Revisa la carpeta de Spam/Correo no deseado**
2. **Busca en tu bandeja de entrada** por:
   - "Resend"
   - "Verify"
   - "Confirm"
   - "verification"
3. **Revisa todas las carpetas** de Gmail (Promociones, Social, etc.)

## 🔄 Reenviar el Email de Verificación

Si no encuentras el email:

1. Ve a **Resend Dashboard** → **Settings** → **Profile**
2. Busca la opción **"Resend Verification Email"** o **"Verify Email"**
3. Haz clic y revisa tu bandeja nuevamente

## ⚠️ Nota Importante

**Resend permite enviar emails desde emails personales sin verificación en el plan gratuito**, pero:
- Puede haber límites
- Es mejor verificar el email para producción
- Algunas funciones pueden requerir verificación

## 🎯 Resumen Rápido

1. **Accede a:** https://resend.com → Sign In
2. **Ve a:** Settings → Profile
3. **Verifica** si tu email tiene un check ✅ o dice "Verified"
4. **Si no está verificado:** Haz clic en "Verify Email" o "Resend Verification"
5. **Revisa tu bandeja** (y spam) por el email de verificación
6. **Haz clic en el enlace** del email para verificar

---

**¿Necesitas más ayuda?** Puedes probar enviando un email de prueba desde Supabase para ver si funciona.

