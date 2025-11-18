-- ============================================
-- QUERY PARA CREAR MESAS DEL 28 AL 38
-- ============================================
-- 
-- Crea 11 mesas (números 28 a 38) con datos aleatorios
-- basados en el formato de las mesas existentes
--
-- ============================================

-- Usar una función auxiliar para generar cada mesa con el mismo UUID
DO $$
DECLARE
  mesa_id UUID;
  mesa_num INTEGER;
  capacidad_val INTEGER;
  tipo_val TEXT;
BEGIN
  FOR mesa_num IN 28..38 LOOP
    -- Generar un UUID único para esta mesa
    mesa_id := gen_random_uuid();
    
    -- Seleccionar capacidad aleatoria (2, 4, 5 o 6)
    capacidad_val := (ARRAY[2, 4, 5, 6])[floor(random() * 4 + 1)];
    
    -- Seleccionar tipo aleatorio (75% estandar, 25% vip)
    tipo_val := (ARRAY['estandar', 'estandar', 'estandar', 'vip'])[floor(random() * 4 + 1)];
    
    -- Insertar la mesa
    INSERT INTO "public"."mesas" (
      "id", 
      "numero", 
      "capacidad", 
      "tipo", 
      "foto_url", 
      "qr_text", 
      "created_at", 
      "updated_at", 
      "created_by", 
      "estado"
    ) VALUES (
      mesa_id,
      mesa_num, -- numero es INTEGER, no TEXT
      capacidad_val,
      tipo_val::tipo_mesa, -- Cast explícito al tipo enum tipo_mesa
      'https://ujpfjthcqpenkizxjimp.supabase.co/storage/v1/object/public/mesas/fotos/' || mesa_id::text || '.jpg',
      json_build_object('t', 'mesa', 'id', mesa_id::text, 'n', mesa_num)::text,
      NOW(),
      NOW(),
      NULL,
      'libre'
    )
    ON CONFLICT (numero) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- VERIFICAR QUE SE CREARON CORRECTAMENTE
-- ============================================

SELECT 
  numero,
  capacidad,
  tipo,
  estado,
  created_at
FROM mesas
WHERE numero::integer BETWEEN 28 AND 38
ORDER BY numero::integer;

-- ============================================
-- NOTA: Los UUIDs y datos aleatorios se generan
-- cada vez que se ejecuta la query.
-- Si necesitas valores fijos, usa la versión
-- con valores específicos en lugar de random()
-- ============================================

