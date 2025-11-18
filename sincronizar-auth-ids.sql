-- ============================================
-- QUERY PARA SINCRONIZAR auth_id EN TABLA usuarios
-- ============================================
-- 
-- Esta query actualiza los auth_id en la tabla 'usuarios' 
-- con los IDs reales de los usuarios en auth.users
--
-- IMPORTANTE: Ejecuta esta query DESPUÉS de crear los usuarios en Auth Users
-- ============================================

-- Actualizar auth_id para cada usuario basándose en el email
UPDATE usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.email IN (
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
  AND u.auth_id != au.id; -- Solo actualizar si son diferentes

-- ============================================
-- VERIFICAR QUE SE SINCRONIZARON CORRECTAMENTE
-- ============================================

SELECT 
  u.id,
  u.email,
  u.nombres,
  u.apellidos,
  u.auth_id as auth_id_en_usuarios,
  au.id as auth_id_en_auth_users,
  CASE 
    WHEN u.auth_id = au.id THEN '✅ Sincronizado'
    WHEN au.id IS NULL THEN '⚠️ Usuario no existe en Auth'
    ELSE '❌ Desincronizado'
  END as estado_sincronizacion,
  u.estado,
  u.perfil
FROM usuarios u
LEFT JOIN auth.users au ON u.email = au.email
WHERE u.email IN (
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
ORDER BY u.email;

-- ============================================
-- VERIFICAR ESTADO Y PERFIL
-- ============================================
-- Asegurarse de que todos tengan estado 'aprobado' y perfil 'clienteReg'

SELECT 
  email,
  estado,
  perfil,
  CASE 
    WHEN estado = 'aprobado' AND perfil = 'clienteReg' THEN '✅ OK'
    ELSE '⚠️ Revisar'
  END as estado_validacion
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
ORDER BY email;

-- ============================================
-- SI ALGUNO NO ESTÁ APROBADO, EJECUTA ESTO:
-- ============================================
-- UPDATE usuarios 
-- SET estado = 'aprobado', perfil = 'clienteReg'
-- WHERE email IN (
--   'usuarioregistrado01@prueba.com',
--   'usuarioregistrado02@prueba.com',
--   'usuarioregistrado03@prueba.com',
--   'usuarioregistrado04@prueba.com',
--   'usuarioregistrado05@prueba.com',
--   'usuarioregistrado06@prueba.com',
--   'usuarioregistrado07@prueba.com',
--   'usuarioregistrado08@prueba.com',
--   'usuarioregistrado09@prueba.com',
--   'usuarioregistrado10@prueba.com'
-- );

