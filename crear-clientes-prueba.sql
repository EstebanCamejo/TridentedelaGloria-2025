-- ============================================
-- QUERY PARA CREAR 10 CLIENTES REGISTRADOS DE PRUEBA
-- ============================================
-- 
-- IMPORTANTE: Esta query solo inserta en la tabla 'usuarios'.
-- Para que los usuarios puedan hacer login, también necesitas crear
-- los usuarios en Supabase Auth (auth.users).
--
-- OPCIÓN 1: Usar esta query y luego crear los usuarios en Auth manualmente
-- OPCIÓN 2: Usar la función edge 'register-client' para cada usuario
-- OPCIÓN 3: Crear los usuarios en Auth primero y luego usar esta query
--
-- ============================================

-- Primero, crear los usuarios en auth.users usando la función SQL
-- (Requiere permisos de service_role)
-- 
-- NOTA: Si tienes acceso al dashboard de Supabase, puedes crear los usuarios
-- en Auth > Users y luego usar esta query para insertar en 'usuarios'

-- ============================================
-- INSERT EN TABLA 'usuarios'
-- ============================================

INSERT INTO usuarios (
  auth_id,
  email,
  nombres,
  apellidos,
  perfil,
  estado,
  foto_url,
  dni
) VALUES
  -- Cliente 1
  (
    gen_random_uuid(), -- Reemplazar con el auth_id real después de crear en Auth
    'usuarioregistrado01@prueba.com',
    'María',
    'González',
    'clienteReg',
    'aprobado', -- Estado aprobado para pruebas inmediatas
    NULL,
    '12345678'
  ),
  -- Cliente 2
  (
    gen_random_uuid(),
    'usuarioregistrado02@prueba.com',
    'Juan',
    'Pérez',
    'clienteReg',
    'aprobado',
    NULL,
    '23456789'
  ),
  -- Cliente 3
  (
    gen_random_uuid(),
    'usuarioregistrado03@prueba.com',
    'Ana',
    'Martínez',
    'clienteReg',
    'aprobado',
    NULL,
    '34567890'
  ),
  -- Cliente 4
  (
    gen_random_uuid(),
    'usuarioregistrado04@prueba.com',
    'Carlos',
    'Rodríguez',
    'clienteReg',
    'aprobado',
    NULL,
    '45678901'
  ),
  -- Cliente 5
  (
    gen_random_uuid(),
    'usuarioregistrado05@prueba.com',
    'Laura',
    'López',
    'clienteReg',
    'aprobado',
    NULL,
    '56789012'
  ),
  -- Cliente 6
  (
    gen_random_uuid(),
    'usuarioregistrado06@prueba.com',
    'Diego',
    'Fernández',
    'clienteReg',
    'aprobado',
    NULL,
    '67890123'
  ),
  -- Cliente 7
  (
    gen_random_uuid(),
    'usuarioregistrado07@prueba.com',
    'Sofía',
    'García',
    'clienteReg',
    'aprobado',
    NULL,
    '78901234'
  ),
  -- Cliente 8
  (
    gen_random_uuid(),
    'usuarioregistrado08@prueba.com',
    'Matías',
    'Sánchez',
    'clienteReg',
    'aprobado',
    NULL,
    '89012345'
  ),
  -- Cliente 9
  (
    gen_random_uuid(),
    'usuarioregistrado09@prueba.com',
    'Valentina',
    'Torres',
    'clienteReg',
    'aprobado',
    NULL,
    '90123456'
  ),
  -- Cliente 10
  (
    gen_random_uuid(),
    'usuarioregistrado10@prueba.com',
    'Nicolás',
    'Morales',
    'clienteReg',
    'aprobado',
    NULL,
    '01234567'
  )
ON CONFLICT (email) DO NOTHING; -- Evitar duplicados si se ejecuta varias veces

-- ============================================
-- VERIFICAR QUE SE INSERTARON CORRECTAMENTE
-- ============================================

SELECT 
  id,
  auth_id,
  email,
  nombres,
  apellidos,
  perfil,
  estado,
  created_at
FROM usuarios
WHERE email IN (
  'usuarioregistrado01@prueba.com',
  'usuarioregistrado02@prueba.com',
  'usuarioregistrado03@prueba.com',
  'usuarioregistrado04@prueba.com',
  'usuarioregistrado05@prueba.com',
  'usuarioregistrado06@prueba.com',
  'usuarioregistrado07@prueba.com',
  'usuarioregistrado08@prueba.com',
  'usuarioregistrado09@prueba.com',
  'usuarioregistrado10@prueba.com'
)
ORDER BY created_at DESC;

-- ============================================
-- INSTRUCCIONES PARA CREAR USUARIOS EN AUTH
-- ============================================
--
-- Después de ejecutar esta query, necesitas crear los usuarios en Supabase Auth.
-- 
-- OPCIÓN A: Usar el Dashboard de Supabase
-- 1. Ve a Authentication > Users
-- 2. Click en "Add user" > "Create new user"
-- 3. Ingresa el email y la contraseña "12345678"
-- 4. Copia el User UID que se genera
-- 5. Actualiza la tabla 'usuarios' con el auth_id correcto:
--
--    UPDATE usuarios 
--    SET auth_id = 'COPIAR_UID_AQUI' 
--    WHERE email = 'usuarioregistrado01@prueba.com';
--
-- OPCIÓN B: Usar la función edge 'register-client'
-- Puedes llamar a la función edge desde Postman o curl:
--
--   POST https://TU_PROJECT.supabase.co/functions/v1/register-client
--   Headers: 
--     Authorization: Bearer TU_SERVICE_ROLE_KEY
--     Content-Type: application/json
--   Body:
--     {
--       "email": "usuarioregistrado01@prueba.com",
--       "password": "12345678",
--       "nombre": "María",
--       "apellido": "González",
--       "dni": "12345678",
--       "perfil": "clienteReg"
--     }
--
-- OPCIÓN C: Usar SQL con función (requiere permisos especiales)
-- Si tienes acceso a crear funciones, puedes usar:
--
--   SELECT auth.users_create_user(
--     email := 'usuarioregistrado01@prueba.com',
--     password := '12345678',
--     email_confirm := true
--   );
--
-- ============================================
-- CONTRASEÑAS PARA PRUEBAS
-- ============================================
-- Todos los usuarios usan la misma contraseña:
-- Contraseña: "12345678"
--
-- ============================================
-- RESUMEN DE USUARIOS CREADOS
-- ============================================
-- 1. usuarioregistrado01@prueba.com - María González
-- 2. usuarioregistrado02@prueba.com - Juan Pérez
-- 3. usuarioregistrado03@prueba.com - Ana Martínez
-- 4. usuarioregistrado04@prueba.com - Carlos Rodríguez
-- 5. usuarioregistrado05@prueba.com - Laura López
-- 6. usuarioregistrado06@prueba.com - Diego Fernández
-- 7. usuarioregistrado07@prueba.com - Sofía García
-- 8. usuarioregistrado08@prueba.com - Matías Sánchez
-- 9. usuarioregistrado09@prueba.com - Valentina Torres
-- 10. usuarioregistrado10@prueba.com - Nicolás Morales
--
-- Todos tienen:
-- - Estado: 'aprobado' (pueden usar la app inmediatamente)
-- - Perfil: 'clienteReg'
-- - DNI: números de prueba (12345678, 23456789, etc.)
-- - Foto: NULL (sin foto de perfil)
--
-- ============================================

