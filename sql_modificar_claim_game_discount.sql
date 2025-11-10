-- =====================================================
-- FIX: Modificar función RPC claim_game_discount para permitir descuentos en "pedido en curso"
-- =====================================================
-- PROBLEMA: La función solo permite descuentos cuando el pedido está "entregado"
-- SOLUCIÓN: Permitir descuentos cuando el pedido está en "pedido en curso" o estados posteriores

-- PASO 1: Verificar función actual
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'claim_game_discount';

-- PASO 2: Eliminar función existente (si existe)
DROP FUNCTION IF EXISTS public.claim_game_discount(integer, text, integer);

-- PASO 3: Crear función modificada que permite descuentos en "pedido en curso" o posterior
CREATE OR REPLACE FUNCTION public.claim_game_discount(
  p_pedido_id INTEGER,
  p_juego TEXT,
  p_score INTEGER
)
RETURNS TABLE (
  applied BOOLEAN,
  pct NUMERIC,
  total_final NUMERIC,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido RECORD;
  v_descuento_pct NUMERIC := 0;
  v_total_actual NUMERIC;
  v_total_con_descuento NUMERIC;
  v_estado_valido BOOLEAN := FALSE;
BEGIN
  -- Obtener información del pedido
  SELECT 
    id,
    estado,
    total,
    descuento_pct,
    juego_premio_reclamado,
    tipo_pedido
  INTO v_pedido
  FROM pedidos
  WHERE id = p_pedido_id;

  -- Verificar que el pedido existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, NULL::NUMERIC, 'Pedido no encontrado'::TEXT;
    RETURN;
  END IF;

  -- 🆕 VALIDACIÓN DE ESTADO: Permitir descuentos en "pedido en curso" o estados posteriores
  -- Estados válidos: 'pedido en curso', 'en preparación', 'en preparación parcial', 
  --                  'listo para entregar', 'asignado a delivery', 'confirmado por delivery',
  --                  'en camino', 'entregado', 'pendiente confirmacion pago', 'pagado'
  v_estado_valido := v_pedido.estado IN (
    'pedido en curso',
    'en preparación',
    'en preparación parcial',
    'listo para entregar',
    'asignado a delivery',
    'confirmado por delivery',
    'en camino',
    'entregado',
    'pendiente confirmacion pago',
    'pagado'
  );

  IF NOT v_estado_valido THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      ('El pedido no está en un estado elegible para descuentos. Estado actual: ' || v_pedido.estado)::TEXT;
    RETURN;
  END IF;

  -- Verificar que no se haya reclamado ya un descuento
  IF v_pedido.juego_premio_reclamado = TRUE OR (v_pedido.descuento_pct IS NOT NULL AND v_pedido.descuento_pct > 0) THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'Ya se reclamó un descuento para este pedido'::TEXT;
    RETURN;
  END IF;

  -- Calcular descuento según el juego y score
  IF p_juego = 'tap' THEN
    IF p_score >= 50 THEN
      v_descuento_pct := 20;
    ELSIF p_score >= 30 THEN
      v_descuento_pct := 15;
    ELSIF p_score >= 20 THEN
      v_descuento_pct := 10;
    END IF;
  ELSIF p_juego = 'memoria' THEN
    IF p_score <= 8 THEN
      v_descuento_pct := 20;
    ELSIF p_score <= 12 THEN
      v_descuento_pct := 15;
    ELSIF p_score <= 16 THEN
      v_descuento_pct := 10;
    END IF;
  ELSIF p_juego = 'trivia' THEN
    IF p_score = 5 THEN
      v_descuento_pct := 20;
    ELSIF p_score = 4 THEN
      v_descuento_pct := 15;
    ELSIF p_score = 3 THEN
      v_descuento_pct := 10;
    END IF;
  END IF;

  -- Si no hay descuento, retornar
  IF v_descuento_pct = 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'No obtuviste un descuento con este puntaje'::TEXT;
    RETURN;
  END IF;

  -- Obtener total actual del pedido
  SELECT COALESCE(SUM(cantidad * precioUnitario), 0)
  INTO v_total_actual
  FROM pedidos_detalles
  WHERE idPedido = p_pedido_id;

  -- Si el total en pedidos está disponible, usarlo
  IF v_pedido.total IS NOT NULL AND v_pedido.total > 0 THEN
    v_total_actual := v_pedido.total;
  END IF;

  -- Calcular total con descuento
  v_total_con_descuento := v_total_actual * (1 - v_descuento_pct / 100);

  -- Actualizar pedido con descuento
  UPDATE pedidos
  SET 
    descuento_pct = v_descuento_pct,
    juego_premio_reclamado = TRUE,
    total = v_total_con_descuento,
    updated_at = NOW()
  WHERE id = p_pedido_id;

  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE, 
    v_descuento_pct, 
    v_total_con_descuento, 
    ('Descuento del ' || v_descuento_pct || '% aplicado exitosamente')::TEXT;
END;
$$;

-- PASO 4: Verificar que se creó correctamente
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'claim_game_discount';

-- PASO 5: Comentario para documentación
COMMENT ON FUNCTION public.claim_game_discount(integer, text, integer) IS 
'Permite aplicar descuentos de juegos cuando el pedido está en "pedido en curso" o estados posteriores. Aplica tanto para pedidos de mesa como delivery.';

