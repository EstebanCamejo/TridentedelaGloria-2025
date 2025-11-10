-- =====================================================
-- AGREGAR COLUMNA idDelivery (VERSIÓN ROBUSTA)
-- =====================================================
-- Este script verifica si la columna existe antes de crearla
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Verificar si la columna existe
DO $$
BEGIN
  -- Verificar si la columna existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pedidos' 
      AND column_name = 'idDelivery'
  ) THEN
    -- Si no existe, crearla
    ALTER TABLE pedidos
    ADD COLUMN idDelivery UUID;
    
    RAISE NOTICE '✅ Columna idDelivery creada exitosamente';
  ELSE
    RAISE NOTICE 'ℹ️ La columna idDelivery ya existe';
  END IF;
END $$;

-- PASO 2: Agregar comentario (si no existe)
COMMENT ON COLUMN pedidos.idDelivery IS 'UUID del usuario delivery asignado al pedido (referencia a usuarios.auth_id donde perfil = delivery)';

-- PASO 3: Crear índice (si no existe)
CREATE INDEX IF NOT EXISTS idx_pedidos_idDelivery ON pedidos(idDelivery);

-- PASO 4: VERIFICACIÓN FINAL - Debe mostrar la columna idDelivery
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos' 
  AND column_name IN ('tipo_pedido', 'idDelivery', 'direccion_entrega', 'latitud', 'longitud')
ORDER BY column_name;

-- Si aún no aparece idDelivery, verificar permisos:
-- SELECT has_table_privilege('public', 'pedidos', 'ALTER');
-- SELECT current_user, current_database();

