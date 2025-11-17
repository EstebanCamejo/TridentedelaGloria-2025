# Configurar Secrets de Resend en Supabase

## 📋 Información que ya tienes:
- **Email:** estebaneduardocamejo@gmail.com
- **API Key:** re_TrvKRc8P_KkA6gLz7MaahE1UwEbpVkdVj
- **Nombre API Key:** Tridente de la Gloria - Producción

## 🔧 Opción A: Configurar desde Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) en el menú lateral
4. Ve a **Edge Functions** → **Secrets**
5. Haz clic en **"Add new secret"** o **"New secret"**
6. Agrega el primer secret:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_TrvKRc8P_KkA6gLz7MaahE1UwEbpVkdVj`
   - Haz clic en **Save**
7. Agrega el segundo secret:
   - **Name:** `RESEND_FROM`
   - **Value:** `El Tridente de la Gloria <estebaneduardocamejo@gmail.com>`
   - Haz clic en **Save**

## 🔧 Opción B: Configurar desde la Terminal (CLI)

Si prefieres usar la terminal, ejecuta estos comandos:

```bash
# Configurar RESEND_API_KEY
supabase secrets set RESEND_API_KEY=re_TrvKRc8P_KkA6gLz7MaahE1UwEbpVkdVj

# Configurar RESEND_FROM
supabase secrets set RESEND_FROM="El Tridente de la Gloria <estebaneduardocamejo@gmail.com>"
```

**Nota:** Asegúrate de estar en el directorio del proyecto y tener el CLI de Supabase instalado.

## ✅ Verificar que los secrets estén configurados

Después de configurar, puedes verificar desde el Dashboard:
- Ve a **Settings** → **Edge Functions** → **Secrets**
- Deberías ver ambos secrets listados:
  - `RESEND_API_KEY`
  - `RESEND_FROM`

## 🚀 Siguiente paso: Desplegar las funciones

Una vez configurados los secrets, despliega las funciones actualizadas:

```bash
supabase functions deploy notificar-cliente
supabase functions deploy generar-factura
```

