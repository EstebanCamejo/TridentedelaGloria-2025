-- ============================================
-- ACTUALIZAR CONTRASEÑAS DE USUARIOS DELIVERY
-- ============================================
-- 
-- IMPORTANTE: 
-- Supabase Auth no permite actualizar contraseñas directamente desde SQL
-- de forma segura sin permisos especiales.
--
-- OPCIÓN 1: Desde el Dashboard (MÁS FÁCIL Y RECOMENDADO)
-- ============================================
-- 1. Ve a Authentication > Users en el Dashboard de Supabase
-- 2. Busca cada usuario delivery:
--    - delivery1@test.com
--    - delivery2@test.com
--    - delivery3@test.com
-- 3. Click en cada usuario > "Reset Password" o "Update Password"
-- 4. Establece la nueva contraseña: 12345678
-- 5. Repite para los 3 usuarios
--
-- OPCIÓN 2: Usando SQL (Puede requerir permisos especiales)
-- ============================================
-- Si tienes permisos de Service Role, puedes intentar esto:
-- (Requiere extensión pgcrypto habilitada)

-- Primero, verificar que la extensión pgcrypto esté habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Actualizar contraseñas usando crypt() de PostgreSQL
-- NOTA: Esto puede no funcionar dependiendo de la configuración de Supabase Auth
UPDATE auth.users
SET 
  encrypted_password = crypt('12345678', gen_salt('bf')),
  updated_at = NOW()
WHERE email IN ('delivery1@test.com', 'delivery2@test.com', 'delivery3@test.com');

-- Verificar que se actualizaron
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
