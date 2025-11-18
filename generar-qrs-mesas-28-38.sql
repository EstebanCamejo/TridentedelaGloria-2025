-- ============================================
-- SCRIPT PARA GENERAR QRs PARA MESAS 28-38
-- ============================================
-- 
-- IMPORTANTE: Esta query solo actualiza el qr_text.
-- Para generar las imágenes PNG de los QRs, necesitas:
-- 
-- OPCIÓN 1: Usar la interfaz de admin
-- - Ve a Admin > Mesas
-- - Edita cada mesa (28-38) y guarda (esto regenerará el QR)
--
-- OPCIÓN 2: Usar la función edge 'alta-mesa' (requiere foto)
-- - Llama a la función para cada mesa con una foto
--
-- OPCIÓN 3: Crear un script Node.js/TypeScript que genere los QRs
-- ============================================

-- Actualizar qr_text para las mesas 28-38
UPDATE mesas
SET 
  qr_text = json_build_object('t', 'mesa', 'id', id::text, 'n', numero)::text,
  updated_at = NOW()
WHERE numero BETWEEN 28 AND 38
  AND (qr_text IS NULL OR qr_text = '');

-- Verificar que se actualizaron
SELECT 
  numero,
  id,
  qr_text,
  CASE 
    WHEN qr_text IS NOT NULL AND qr_text != '' THEN '✅ qr_text OK'
    ELSE '❌ Falta qr_text'
  END as estado_qr_text
FROM mesas
WHERE numero BETWEEN 28 AND 38
ORDER BY numero;

-- ============================================
-- NOTA: Las imágenes PNG de los QRs deben generarse
-- usando la función edge o la interfaz admin.
-- El qr_text está correcto, pero falta la imagen
-- en storage/mesas/qr/{id}.png
-- ============================================

