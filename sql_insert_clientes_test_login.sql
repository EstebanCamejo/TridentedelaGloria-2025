-- =====================================================
-- SQL para crear usuarios de prueba para login rápido
-- =====================================================
-- IMPORTANTE: Este SQL asume que los usuarios YA fueron creados en auth.users
-- Si no existen, primero debes crearlos usando Supabase Auth API o la interfaz de registro
-- 
-- Para crear usuarios en auth.users manualmente:
-- 1. Ve a Supabase Dashboard > Authentication > Users
-- 2. Crea los usuarios con los emails y passwords indicados
-- 3. Luego ejecuta este SQL para insertarlos en la tabla usuarios
--
-- O puedes usar la función de registro de la app para crearlos primero
-- =====================================================

-- =====================================================
-- CLIENTES REGISTRADOS (3 usuarios)
-- =====================================================
WITH auth_users_data AS (
  SELECT 
    id as auth_id,
    email
  FROM auth.users
  WHERE email IN (
    'cliente1@test.com',
    'cliente2@test.com',
    'cliente3@test.com'
  )
)
INSERT INTO usuarios (auth_id, email, perfil, nombres, apellidos, estado, created_at, updated_at)
SELECT 
  au.auth_id,
  au.email,
  'clienteReg'::rol_usuario as perfil,
  CASE 
    WHEN au.email = 'cliente1@test.com' THEN 'Ana'
    WHEN au.email = 'cliente2@test.com' THEN 'Luis'
    WHEN au.email = 'cliente3@test.com' THEN 'Sofía'
  END as nombres,
  CASE 
    WHEN au.email = 'cliente1@test.com' THEN 'Martínez'
    WHEN au.email = 'cliente2@test.com' THEN 'Fernández'
    WHEN au.email = 'cliente3@test.com' THEN 'López'
  END as apellidos,
  'aprobado' as estado,
  NOW() as created_at,
  NOW() as updated_at
FROM auth_users_data au
ON CONFLICT (auth_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  perfil = EXCLUDED.perfil,
  nombres = EXCLUDED.nombres,
  apellidos = EXCLUDED.apellidos,
  estado = EXCLUDED.estado,
  updated_at = NOW();

-- =====================================================
-- CLIENTES ANÓNIMOS (3 usuarios)
-- =====================================================
WITH auth_users_data AS (
  SELECT 
    id as auth_id,
    email
  FROM auth.users
  WHERE email IN (
    'anonimo1@test.com',
    'anonimo2@test.com',
    'anonimo3@test.com'
  )
)
INSERT INTO usuarios (auth_id, email, perfil, nombres, apellidos, estado, created_at, updated_at)
SELECT 
  au.auth_id,
  au.email,
  'clienteAnon'::rol_usuario as perfil,
  CASE 
    WHEN au.email = 'anonimo1@test.com' THEN 'Usuario'
    WHEN au.email = 'anonimo2@test.com' THEN 'Usuario'
    WHEN au.email = 'anonimo3@test.com' THEN 'Usuario'
  END as nombres,
  CASE 
    WHEN au.email = 'anonimo1@test.com' THEN 'Anónimo 1'
    WHEN au.email = 'anonimo2@test.com' THEN 'Anónimo 2'
    WHEN au.email = 'anonimo3@test.com' THEN 'Anónimo 3'
  END as apellidos,
  'aprobado' as estado,
  NOW() as created_at,
  NOW() as updated_at
FROM auth_users_data au
ON CONFLICT (auth_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  perfil = EXCLUDED.perfil,
  nombres = EXCLUDED.nombres,
  apellidos = EXCLUDED.apellidos,
  estado = EXCLUDED.estado,
  updated_at = NOW();

-- =====================================================
-- DELIVERY (1 usuario - delivery1@test.com)
-- =====================================================
WITH auth_users_data AS (
  SELECT 
    id as auth_id,
    email
  FROM auth.users
  WHERE email = 'delivery1@test.com'
)
INSERT INTO usuarios (auth_id, email, perfil, nombres, apellidos, estado, created_at, updated_at)
SELECT 
  au.auth_id,
  au.email,
  'delivery'::rol_usuario as perfil,
  'Juan' as nombres,
  'Pérez' as apellidos,
  'aprobado' as estado,
  NOW() as created_at,
  NOW() as updated_at
FROM auth_users_data au
ON CONFLICT (auth_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  perfil = EXCLUDED.perfil,
  nombres = EXCLUDED.nombres,
  apellidos = EXCLUDED.apellidos,
  estado = EXCLUDED.estado,
  updated_at = NOW();

-- =====================================================
-- VERIFICACIÓN: Consulta para verificar que se insertaron correctamente
-- =====================================================
-- SELECT 
--   email,
--   perfil,
--   nombres,
--   apellidos,
--   estado
-- FROM usuarios
-- WHERE email IN (
--   'cliente1@test.com',
--   'cliente2@test.com',
--   'cliente3@test.com',
--   'anonimo1@test.com',
--   'anonimo2@test.com',
--   'anonimo3@test.com',
--   'delivery1@test.com'
-- )
-- ORDER BY perfil, email;

-- =====================================================
-- NOTAS:
-- =====================================================
-- Passwords para todos los usuarios de prueba: 12345678
-- 
-- Emails de clientes registrados:
--   - cliente1@test.com / 12345678
--   - cliente2@test.com / 12345678
--   - cliente3@test.com / 12345678
--
-- Emails de clientes anónimos:
--   - anonimo1@test.com / 12345678
--   - anonimo2@test.com / 12345678
--   - anonimo3@test.com / 12345678
--
-- Email de delivery:
--   - delivery1@test.com / 12345678
-- =====================================================

