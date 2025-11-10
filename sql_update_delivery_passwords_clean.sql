CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE auth.users
SET 
  encrypted_password = crypt('12345678', gen_salt('bf')),
  updated_at = NOW()
WHERE email IN ('delivery1@test.com', 'delivery2@test.com', 'delivery3@test.com');

SELECT 
  id,
  email,
  updated_at,
  CASE 
    WHEN encrypted_password IS NOT NULL THEN 'Contraseña actualizada'
    ELSE 'Sin contraseña'
  END as estado_password
FROM auth.users
WHERE email IN ('delivery1@test.com', 'delivery2@test.com', 'delivery3@test.com');

