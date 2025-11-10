-- ============================================
-- PASO 1: Agregar 'delivery' al ENUM rol_usuario
-- ============================================
-- EJECUTA ESTE SCRIPT PRIMERO
-- Luego espera unos segundos y ejecuta sql_create_delivery_users.sql

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
    RAISE NOTICE '✅ Valor "delivery" agregado al ENUM rol_usuario';
  ELSE
    RAISE NOTICE 'ℹ️ El valor "delivery" ya existe en el ENUM rol_usuario';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- 'delivery' ya existe en el ENUM, no hacer nada
    RAISE NOTICE 'ℹ️ El valor "delivery" ya existe en el ENUM rol_usuario';
END $$;

-- Verificar que se agregó correctamente
SELECT 
  enumlabel as valor_enum,
  enumsortorder as orden
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'rol_usuario')
ORDER BY enumsortorder;

