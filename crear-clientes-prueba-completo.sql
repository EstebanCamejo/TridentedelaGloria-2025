-- ============================================
-- QUERY COMPLETA PARA CREAR 10 CLIENTES REGISTRADOS
-- Incluye creación en Auth.users y en tabla usuarios
-- ============================================
--
-- IMPORTANTE: Esta query requiere permisos de service_role o admin
-- para crear usuarios en auth.users
--
-- ============================================

-- Función auxiliar para crear usuario completo
-- (Solo funciona si tienes permisos de service_role)
DO $$
DECLARE
  auth_id_1 UUID;
  auth_id_2 UUID;
  auth_id_3 UUID;
  auth_id_4 UUID;
  auth_id_5 UUID;
  auth_id_6 UUID;
  auth_id_7 UUID;
  auth_id_8 UUID;
  auth_id_9 UUID;
  auth_id_10 UUID;
BEGIN
  -- Crear usuarios en auth.users usando la extensión auth
  -- NOTA: Esto requiere permisos especiales. Si no funciona, usa la versión simple.
  
  -- Cliente 1: María González
  SELECT auth.users_create_user(
    email := 'usuarioregistrado01@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_1;
  
  -- Cliente 2: Juan Pérez
  SELECT auth.users_create_user(
    email := 'usuarioregistrado02@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_2;
  
  -- Cliente 3: Ana Martínez
  SELECT auth.users_create_user(
    email := 'usuarioregistrado03@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_3;
  
  -- Cliente 4: Carlos Rodríguez
  SELECT auth.users_create_user(
    email := 'usuarioregistrado04@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_4;
  
  -- Cliente 5: Laura López
  SELECT auth.users_create_user(
    email := 'usuarioregistrado05@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_5;
  
  -- Cliente 6: Diego Fernández
  SELECT auth.users_create_user(
    email := 'usuarioregistrado06@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_6;
  
  -- Cliente 7: Sofía García
  SELECT auth.users_create_user(
    email := 'usuarioregistrado07@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_7;
  
  -- Cliente 8: Matías Sánchez
  SELECT auth.users_create_user(
    email := 'usuarioregistrado08@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_8;
  
  -- Cliente 9: Valentina Torres
  SELECT auth.users_create_user(
    email := 'usuarioregistrado09@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_9;
  
  -- Cliente 10: Nicolás Morales
  SELECT auth.users_create_user(
    email := 'usuarioregistrado10@prueba.com',
    password := '12345678',
    email_confirm := true,
    user_metadata := jsonb_build_object('origen', 'registro-cliente')
  ) INTO auth_id_10;
  
  -- Insertar en tabla usuarios
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
    (auth_id_1, 'usuarioregistrado01@prueba.com', 'María', 'González', 'clienteReg', 'aprobado', NULL, '12345678'),
    (auth_id_2, 'usuarioregistrado02@prueba.com', 'Juan', 'Pérez', 'clienteReg', 'aprobado', NULL, '23456789'),
    (auth_id_3, 'usuarioregistrado03@prueba.com', 'Ana', 'Martínez', 'clienteReg', 'aprobado', NULL, '34567890'),
    (auth_id_4, 'usuarioregistrado04@prueba.com', 'Carlos', 'Rodríguez', 'clienteReg', 'aprobado', NULL, '45678901'),
    (auth_id_5, 'usuarioregistrado05@prueba.com', 'Laura', 'López', 'clienteReg', 'aprobado', NULL, '56789012'),
    (auth_id_6, 'usuarioregistrado06@prueba.com', 'Diego', 'Fernández', 'clienteReg', 'aprobado', NULL, '67890123'),
    (auth_id_7, 'usuarioregistrado07@prueba.com', 'Sofía', 'García', 'clienteReg', 'aprobado', NULL, '78901234'),
    (auth_id_8, 'usuarioregistrado08@prueba.com', 'Matías', 'Sánchez', 'clienteReg', 'aprobado', NULL, '89012345'),
    (auth_id_9, 'usuarioregistrado09@prueba.com', 'Valentina', 'Torres', 'clienteReg', 'aprobado', NULL, '90123456'),
    (auth_id_10, 'usuarioregistrado10@prueba.com', 'Nicolás', 'Morales', 'clienteReg', 'aprobado', NULL, '01234567')
  ON CONFLICT (email) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    nombres = EXCLUDED.nombres,
    apellidos = EXCLUDED.apellidos,
    estado = EXCLUDED.estado;
    
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla la creación en auth, solo insertar en usuarios con UUIDs temporales
    -- Luego deberás crear los usuarios en Auth manualmente
    RAISE NOTICE 'No se pudieron crear usuarios en auth.users. Usa la versión simple de la query.';
    RAISE;
END $$;

-- Verificar que se crearon correctamente
SELECT 
  u.id,
  u.auth_id,
  u.email,
  u.nombres,
  u.apellidos,
  u.perfil,
  u.estado,
  u.created_at,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ Usuario en Auth creado'
    ELSE '⚠️ Falta crear en Auth'
  END as estado_auth
FROM usuarios u
LEFT JOIN auth.users au ON u.auth_id = au.id
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
ORDER BY u.created_at DESC;

-- ============================================
-- NOTA: Si la función auth.users_create_user no existe,
-- usa la versión simple (crear-clientes-prueba.sql)
-- y crea los usuarios en Auth manualmente desde el dashboard
-- ============================================

