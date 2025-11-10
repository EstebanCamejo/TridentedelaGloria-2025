# 📦 Instrucciones para Desplegar la Función `generar-factura` en Supabase

## Prerrequisitos

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```
   O con Homebrew (Mac):
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Autenticarse en Supabase**:
   ```bash
   supabase login
   ```
   Esto abrirá tu navegador para autenticarte.

3. **Vincular tu proyecto** (si no está vinculado):
   ```bash
   supabase link --project-ref tu-project-ref
   ```
   Puedes encontrar tu `project-ref` en la URL de tu proyecto Supabase:
   `https://supabase.com/dashboard/project/[PROJECT-REF]`

## Desplegar la Función

Una vez autenticado y vinculado, ejecuta:

```bash
supabase functions deploy generar-factura
```

Este comando:
- ✅ Compilará la función TypeScript
- ✅ La desplegará a tu proyecto de Supabase
- ✅ Configurará los secrets necesarios (si están configurados)

## Verificar el Despliegue

Después del despliegue, deberías ver algo como:
```
Deploying function generar-factura...
Function URL: https://[PROJECT-REF].supabase.co/functions/v1/generar-factura
```

## Configurar Secrets (si es necesario)

Si la función necesita secrets (como `SENDGRID_API_KEY`), configúralos así:

```bash
supabase secrets set SENDGRID_API_KEY=tu-api-key-aqui
supabase secrets set SENDGRID_FROM=tu-email@ejemplo.com
supabase secrets set BRAND_PRIMARY=#7A1E1E
supabase secrets set BRAND_BG=#F8F4EE
supabase secrets set BRAND_LOGO_URL=https://tu-url-del-logo.com/logo.png
```

## Ver Logs de la Función

Para ver los logs en tiempo real:
```bash
supabase functions logs generar-factura
```

## Comandos Útiles

- **Listar todas las funciones desplegadas**:
  ```bash
  supabase functions list
  ```

- **Eliminar una función**:
  ```bash
  supabase functions delete generar-factura
  ```

- **Probar la función localmente** (antes de desplegar):
  ```bash
  supabase functions serve generar-factura
  ```

## Notas Importantes

⚠️ **Después de desplegar**, los cambios en el email (eliminar "Mesa: xx") estarán activos para **nuevos pedidos**. Los emails ya enviados no cambiarán.

✅ **Verifica** que el despliegue fue exitoso probando con un nuevo pedido y verificando que el email solo muestre "Total: $xxxxx".

