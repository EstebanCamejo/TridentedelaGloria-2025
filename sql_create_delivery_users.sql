-- ============================================
-- SCRIPT PARA CREAR 3 USUARIOS DELIVERY
-- ============================================
-- 
-- INSTRUCCIONES:
-- 
-- PASO 1: Crear usuarios en Supabase Auth (Dashboard)
-- ============================================
-- 1. Ve a Authentication > Users en el Dashboard de Supabase
-- 2. Click en "Add User" > "Create new user"
-- 3. Crea estos 3 usuarios:
--    - Email: delivery1@test.com, Password: Delivery123!
--    - Email: delivery2@test.com, Password: Delivery123!
--    - Email: delivery3@test.com, Password: Delivery123!
--
-- PASO 2: Agregar 'delivery' al ENUM rol_usuario (EJECUTAR PRIMERO)
-- ============================================
-- IMPORTANTE: Ejecuta esta parte PRIMERO y luego ejecuta el PASO 3
-- PostgreSQL no permite usar un nuevo valor de ENUM en la misma transacción

-- Verificar si 'delivery' ya existe en el ENUM y agregarlo si no existe
DO $$
BEGIN
  -- Intentar agregar 'delivery' al ENUM rol_usuario
  -- Si ya existe, PostgreSQL lanzará un error que ignoramos
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'delivery' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'rol_usuario')
  ) THEN
    ALTER TYPE rol_usuario ADD VALUE 'delivery';
    RAISE NOTICE 'Valor "delivery" agregado al ENUM rol_usuario';
  ELSE
    RAISE NOTICE 'El valor "delivery" ya existe en el ENUM rol_usuario';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- 'delivery' ya existe en el ENUM, no hacer nada
    RAISE NOTICE 'El valor "delivery" ya existe en el ENUM rol_usuario';
END $$;

-- ============================================
-- PASO 3: Crear usuarios en la tabla usuarios (EJECUTAR DESPUÉS)
-- ============================================
-- IMPORTANTE: Ejecuta esta parte DESPUÉS del PASO 2
-- Espera unos segundos entre ejecutar el PASO 2 y el PASO 3
-- o ejecuta el PASO 2, confirma que se ejecutó correctamente, y luego ejecuta el PASO 3

-- Este script obtiene automáticamente los UUIDs de auth.users
-- y crea los registros en la tabla usuarios
WITH auth_users_data AS (
  SELECT 
    id as auth_id,
    email
  FROM auth.users
  WHERE email IN ('delivery1@test.com', 'delivery2@test.com', 'delivery3@test.com')
)
INSERT INTO usuarios (auth_id, email, perfil, nombres, apellidos, estado, created_at, updated_at)
SELECT 
  au.auth_id,
  au.email,
  'delivery'::rol_usuario as perfil,  -- Cast explícito al ENUM
  CASE 
    WHEN au.email = 'delivery1@test.com' THEN 'Juan'
    WHEN au.email = 'delivery2@test.com' THEN 'María'
    WHEN au.email = 'delivery3@test.com' THEN 'Carlos'
  END as nombres,
  CASE 
    WHEN au.email = 'delivery1@test.com' THEN 'Pérez'
    WHEN au.email = 'delivery2@test.com' THEN 'González'
    WHEN au.email = 'delivery3@test.com' THEN 'Rodríguez'
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

-- ============================================
-- PASO 4: VERIFICAR QUE SE CREARON CORRECTAMENTE
-- ============================================
SELECT 
  u.id,
  u.auth_id,
  u.email,
  u.perfil::text as perfil,  -- Cast a text para mostrar
  u.nombres,
  u.apellidos,
  u.estado,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ Usuario existe en auth.users'
    ELSE '❌ Usuario NO existe en auth.users'
  END as auth_status
FROM usuarios u
LEFT JOIN auth.users au ON u.auth_id = au.id
WHERE u.perfil::text = 'delivery'  -- Cast a text para comparar
  AND u.email LIKE 'delivery%@test.com'
ORDER BY u.email;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Ejecuta el PASO 2 primero (agregar 'delivery' al ENUM)
-- 2. Espera unos segundos o verifica que se ejecutó correctamente
-- 3. Luego ejecuta el PASO 3 (crear usuarios en la tabla)
-- 4. Finalmente ejecuta el PASO 4 para verificar
--
-- Si los usuarios no existen en auth.users, primero créalos desde el Dashboard
-- como se indica en el PASO 1.
--
-- Si quieres verificar si existen en auth.users:
-- SELECT id, email FROM auth.users WHERE email LIKE 'delivery%@test.com';
