SELECT 
  u.id,
  u.auth_id,
  u.email,
  u.perfil::text as perfil,
  u.nombres,
  u.apellidos,
  u.estado,
  CASE 
    WHEN au.id IS NOT NULL THEN 'Usuario existe en auth.users'
    ELSE 'Usuario NO existe en auth.users'
  END as auth_status
FROM usuarios u
LEFT JOIN auth.users au ON u.auth_id = au.id
WHERE u.perfil::text = 'delivery'
  AND u.email LIKE 'delivery%@test.com'
ORDER BY u.email;

