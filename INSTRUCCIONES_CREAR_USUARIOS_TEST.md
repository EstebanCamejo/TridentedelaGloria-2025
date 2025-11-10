# Instrucciones para Crear Usuarios de Prueba para Login Rápido

## 📋 Resumen

Este documento explica cómo crear los usuarios de prueba necesarios para los accesos directos en la pantalla de login.

## 🔐 Usuarios a Crear

### Empleados (FAB derecho)
1. **Delivery**: `delivery1@test.com` / `12345678`

### Clientes Registrados (FAB izquierdo - 3 usuarios)
1. `cliente1@test.com` / `12345678`
2. `cliente2@test.com` / `12345678`
3. `cliente3@test.com` / `12345678`

### Clientes Anónimos (FAB izquierdo - 3 usuarios)
1. `anonimo1@test.com` / `12345678`
2. `anonimo2@test.com` / `12345678`
3. `anonimo3@test.com` / `12345678`

## 🚀 Pasos para Crear los Usuarios

### Opción 1: Crear usuarios manualmente en Supabase Dashboard (Recomendado)

1. **Ir a Supabase Dashboard**
   - Abre tu proyecto en Supabase
   - Ve a **Authentication** > **Users**

2. **Crear cada usuario**
   - Click en **"Add user"** o **"Create new user"**
   - Ingresa el email (ej: `delivery1@test.com`)
   - Ingresa la contraseña: `12345678`
   - **IMPORTANTE**: Marca **"Auto Confirm User"** para que no necesite confirmación por email
   - Click en **"Create user"**

3. **Repetir para todos los usuarios**
   - Crea los 7 usuarios (1 delivery + 3 clientes registrados + 3 anónimos)

4. **Ejecutar el SQL**
   - Ve a **SQL Editor** en Supabase
   - Abre el archivo `sql_insert_clientes_test_login.sql`
   - Ejecuta el SQL para insertar los usuarios en la tabla `usuarios`

### Opción 2: Crear usuarios usando la función de registro de la app

1. **Para cada usuario:**
   - Abre la app
   - Ve a la pantalla de registro
   - Registra cada usuario con el email y password correspondiente
   - **Para clientes registrados**: Usa el formulario de registro de cliente registrado
   - **Para clientes anónimos**: Usa el formulario de registro de cliente anónimo
   - **Para delivery**: Debe ser creado por un admin usando la función de alta de empleado

2. **Aprobar usuarios (si es necesario)**
   - Si los usuarios quedan en estado "pendiente", ve a `/admin/pendientes`
   - Aprueba cada usuario

3. **Ejecutar el SQL**
   - Ejecuta el SQL para asegurar que todos los usuarios tengan el estado correcto

### Opción 3: Crear usuarios usando Supabase Auth API (Programático)

Puedes usar este script en la consola del navegador o crear una función edge:

```javascript
// Ejemplo usando Supabase JS Client (ejecutar en consola del navegador)
const usuarios = [
  { email: 'delivery1@test.com', password: '12345678' },
  { email: 'cliente1@test.com', password: '12345678' },
  { email: 'cliente2@test.com', password: '12345678' },
  { email: 'cliente3@test.com', password: '12345678' },
  { email: 'anonimo1@test.com', password: '12345678' },
  { email: 'anonimo2@test.com', password: '12345678' },
  { email: 'anonimo3@test.com', password: '12345678' },
];

// Nota: Esto requiere usar el servicio admin de Supabase
// Mejor usar las opciones 1 o 2
```

## ✅ Verificación

Después de crear los usuarios y ejecutar el SQL, verifica que todo esté correcto:

```sql
SELECT 
  email,
  perfil,
  nombres,
  apellidos,
  estado
FROM usuarios
WHERE email IN (
  'cliente1@test.com',
  'cliente2@test.com',
  'cliente3@test.com',
  'anonimo1@test.com',
  'anonimo2@test.com',
  'anonimo3@test.com',
  'delivery1@test.com'
)
ORDER BY perfil, email;
```

Todos los usuarios deben tener:
- `estado = 'aprobado'`
- `perfil` correcto según el tipo de usuario

## 🔧 Troubleshooting

### Error: "User already exists"
- El usuario ya existe en auth.users
- Solo necesitas ejecutar el SQL para insertarlo en la tabla `usuarios`

### Error: "Duplicate key value violates unique constraint"
- El usuario ya existe en la tabla `usuarios`
- El SQL usa `ON CONFLICT DO UPDATE`, por lo que debería actualizarse automáticamente
- Verifica que el `auth_id` sea correcto

### Los usuarios no aparecen en la tabla `usuarios`
- Verifica que los usuarios existan en `auth.users`
- Ejecuta el SQL nuevamente
- Verifica los logs de Supabase para ver si hay errores

### No puedo hacer login con los usuarios
- Verifica que el estado sea `'aprobado'` o `'activo'`
- Verifica que el email y password sean correctos
- Verifica que el usuario exista en `auth.users`

## 📝 Notas

- Todos los usuarios de prueba usan la misma contraseña: `12345678`
- Los usuarios deben estar en estado `'aprobado'` para poder hacer login
- El SQL usa `ON CONFLICT DO UPDATE` para evitar duplicados y actualizar datos si es necesario
- Los usuarios de prueba son solo para desarrollo/testing, no deben usarse en producción

