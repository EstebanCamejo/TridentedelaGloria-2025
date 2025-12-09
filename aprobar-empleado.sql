-- Query para aprobar el empleado y permitirle ingresar a la app
-- Email: cocinerotridente001@prueba1.com

-- ============================================
-- APROBAR EMPLEADO: cocinerotridente001@prueba1.com
-- ============================================

-- ⚠️ PROBLEMA DETECTADO: El usuario NO existe en la tabla usuarios
-- Esto significa que el empleado fue creado en Supabase Auth pero NO se insertó en la tabla usuarios
-- 
-- SOLUCIÓN: Necesitas crear el registro en la tabla usuarios con el auth_id correcto

-- ============================================
-- PASO 0: OBTENER EL AUTH_ID (HACER PRIMERO)
-- ============================================
-- 1. Ve a Supabase Dashboard > Authentication > Users
-- 2. Busca el usuario con email: cocinerotridente001@prueba1.com
-- 3. Copia el "User UID" (ese es el auth_id que necesitas)
-- 4. Reemplaza 'AQUI_VA_EL_AUTH_ID' en la query de abajo con ese valor

-- PASO 1: Verificar si el usuario existe y su estado actual
SELECT 
  id, 
  email, 
  perfil, 
  estado, 
  nombres, 
  apellidos, 
  auth_id,
  CASE 
    WHEN estado = 'aprobado' THEN '✅ Ya está aprobado'
    WHEN estado = 'activo' THEN '✅ Ya está activo'
    WHEN estado IS NULL THEN '⚠️ Estado NULL'
    ELSE '❌ Estado: ' || estado
  END as estado_actual
FROM usuarios
WHERE email = 'cocinerotridente001@prueba1.com';

-- ============================================
-- PASO 1.5: CREAR EL USUARIO SI NO EXISTE
-- ============================================
-- ⚠️ IMPORTANTE: NO ejecutes esta query tal cual. Primero debes obtener el auth_id real.

-- INSTRUCCIONES PASO A PASO:
-- 
-- 1. Ve a tu Supabase Dashboard: https://supabase.com/dashboard
-- 2. Selecciona tu proyecto
-- 3. Ve a: Authentication > Users (en el menú lateral)
-- 4. Busca el usuario con email: cocinerotridente001@prueba1.com
-- 5. Haz clic en el usuario para ver sus detalles
-- 6. Copia el "User UID" (es un UUID que se ve así: 123e4567-e89b-12d3-a456-426614174000)
-- 7. Vuelve a esta query y REEMPLAZA 'AQUI_VA_EL_AUTH_ID' con el UUID que copiaste
-- 8. Ajusta también 'Cocinero' y 'Tridente' con los nombres reales del empleado
-- 9. DESCOMENTA la query (quita los -- al inicio de cada línea)
-- 10. Ejecuta la query

-- ⚠️ EJEMPLO DE CÓMO DEBE QUEDAR (reemplaza con tus valores reales):
-- INSERT INTO usuarios (auth_id, email, perfil, estado, nombres, apellidos)
-- VALUES (
--   '123e4567-e89b-12d3-a456-426614174000',  -- ⚠️ REEMPLAZAR con el User UID real
--   'cocinerotridente001@prueba1.com',
--   'cocinero',  -- Perfil del empleado (cocinero, mozo, bartender, maitre, delivery)
--   'aprobado',  -- Estado aprobado para que pueda ingresar
--   'Cocinero',  -- ⚠️ Ajusta según los datos reales del empleado
--   'Tridente'   -- ⚠️ Ajusta según los datos reales del empleado (puede ser NULL)
-- );

-- ⚠️ NO EJECUTES ESTA QUERY SIN REEMPLAZAR EL AUTH_ID ⚠️
-- INSERT INTO usuarios (auth_id, email, perfil, estado, nombres, apellidos)
-- VALUES (
--   'AQUI_VA_EL_AUTH_ID',  -- ⚠️ DEBES REEMPLAZAR ESTO con el UUID real del Dashboard
--   'cocinerotridente001@prueba1.com',
--   'cocinero',
--   'aprobado',
--   'Cocinero',
--   'Tridente'
-- );

-- Después de ejecutar el INSERT correctamente, ejecuta el PASO 3 para verificar que se creó correctamente

-- PASO 2: Si el usuario existe, actualizar el estado a 'aprobado'
-- IMPORTANTE: El login busca por auth_id, así que asegurate de que el auth_id esté correcto
UPDATE usuarios
SET estado = 'aprobado'
WHERE email = 'cocinerotridente001@prueba1.com'
  AND estado IS NOT NULL;  -- Solo actualizar si existe

-- PASO 3: Verificar que se actualizó correctamente
SELECT 
  id, 
  email, 
  perfil, 
  estado, 
  nombres, 
  apellidos, 
  auth_id,
  CASE 
    WHEN estado = 'aprobado' THEN '✅ APROBADO - Puede ingresar'
    WHEN estado = 'activo' THEN '✅ ACTIVO - Puede ingresar'
    ELSE '❌ NO PUEDE INGRESAR - Estado: ' || COALESCE(estado, 'NULL')
  END as resultado
FROM usuarios
WHERE email = 'cocinerotridente001@prueba1.com';

-- ============================================
-- DIAGNÓSTICO: Si el usuario aún no puede ingresar
-- ============================================

-- Verificar si el usuario tiene auth_id (CRÍTICO: el login busca por auth_id)
SELECT 
  id,
  email,
  auth_id,
  CASE 
    WHEN auth_id IS NULL THEN '❌ PROBLEMA: auth_id es NULL - El usuario NO puede ingresar'
    WHEN auth_id = '' THEN '❌ PROBLEMA: auth_id está vacío - El usuario NO puede ingresar'
    ELSE '✅ auth_id existe: ' || auth_id
  END as diagnostico_auth_id,
  estado,
  perfil
FROM usuarios
WHERE email = 'cocinerotridente001@prueba1.com';

-- IMPORTANTE: 
-- El login busca al usuario por auth_id (no por email)
-- Si auth_id es NULL o incorrecto, el usuario NO podrá ingresar aunque el estado sea 'aprobado'
-- 
-- Para solucionar:
-- 1. Obtener el auth_id del usuario desde Supabase Auth (Dashboard > Authentication > Users)
-- 2. Actualizar el auth_id en la tabla usuarios:
--    UPDATE usuarios 
--    SET auth_id = 'AQUI_VA_EL_AUTH_ID_DE_SUPABASE_AUTH'
--    WHERE email = 'cocinerotridente001@prueba1.com';

-- ALTERNATIVA: Si conoces el auth_id del usuario, puedes actualizar directamente por auth_id:
-- UPDATE usuarios
-- SET estado = 'aprobado'
-- WHERE auth_id = 'AQUI_VA_EL_AUTH_ID_DEL_USUARIO';

-- ALTERNATIVA 2: Actualizar todos los usuarios con ese email (por si hay duplicados)
-- UPDATE usuarios
-- SET estado = 'aprobado'
-- WHERE LOWER(TRIM(email)) = LOWER(TRIM('cocinerotridente001@prueba1.com'));

-- ALTERNATIVA 3: Si el estado tiene espacios o está en mayúsculas, limpiarlo primero
-- UPDATE usuarios
-- SET estado = TRIM(LOWER(estado))
-- WHERE email = 'cocinerotridente001@prueba1.com';
-- 
-- UPDATE usuarios
-- SET estado = 'aprobado'
-- WHERE email = 'cocinerotridente001@prueba1.com';

