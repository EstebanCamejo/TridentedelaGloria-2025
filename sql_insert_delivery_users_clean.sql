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
  'delivery'::rol_usuario as perfil,
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
