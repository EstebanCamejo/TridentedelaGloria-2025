-- ============================================
-- QUERY PARA BORRAR MESAS DEL 28 AL 38
-- ============================================
-- 
-- ⚠️ ADVERTENCIA: Esta query eliminará permanentemente
-- las mesas con números del 28 al 38
--
-- ============================================

-- Verificar qué mesas se van a eliminar
SELECT 
  id,
  numero,
  capacidad,
  tipo,
  estado,
  created_at
FROM mesas
WHERE numero BETWEEN 28 AND 38
ORDER BY numero;

-- ============================================
-- ELIMINAR LAS MESAS
-- ============================================

DELETE FROM mesas
WHERE numero BETWEEN 28 AND 38;

-- ============================================
-- VERIFICAR QUE SE ELIMINARON
-- ============================================

SELECT 
  COUNT(*) as mesas_restantes_28_38
FROM mesas
WHERE numero BETWEEN 28 AND 38;

-- Si devuelve 0, todas las mesas fueron eliminadas correctamente

-- ============================================
-- NOTA: Las imágenes en storage (fotos y QRs)
-- NO se eliminan automáticamente con esta query.
-- Si quieres eliminarlas también, necesitas hacerlo
-- manualmente desde el storage o con otra query.
-- ============================================

