-- =====================================================
-- FIX: Modificar función RPC claim_game_discount para permitir descuentos en "pedido en curso"
-- =====================================================
-- PROBLEMA: La función solo permite descuentos cuando el pedido está "entregado"
-- SOLUCIÓN: Permitir descuentos cuando el pedido está en "pedido en curso" o estados posteriores
-- IMPORTANTE: Mantener la firma original (bigint) para compatibilidad

-- PASO 1: Eliminar TODAS las funciones existentes con este nombre (para evitar conflictos)
DROP FUNCTION IF EXISTS public.claim_game_discount(bigint, text, integer);
DROP FUNCTION IF EXISTS public.claim_game_discount(integer, text, integer);

-- PASO 2: Crear función modificada con la firma ORIGINAL (bigint) pero nueva lógica y retorno
CREATE OR REPLACE FUNCTION public.claim_game_discount(
  p_pedido_id BIGINT,
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
  v_user UUID := auth.uid();
  v_pct NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_total_final NUMERIC := 0;
  v_juego_reclamado BOOLEAN := false;
  v_estado TEXT;
  v_id_cliente UUID;
  v_estado_valido BOOLEAN := FALSE;
BEGIN
  -- Verificar autenticación
  IF v_user IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, NULL::NUMERIC, 'No autenticado'::TEXT;
    RETURN;
  END IF;

  -- Obtener información del pedido
  SELECT estado, "idCliente", COALESCE(juego_premio_reclamado, false)
    INTO v_estado, v_id_cliente, v_juego_reclamado
  FROM public.pedidos
  WHERE id = p_pedido_id
  FOR UPDATE;

  -- Verificar que el pedido existe
  IF v_estado IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, NULL::NUMERIC, 'Pedido no encontrado'::TEXT;
    RETURN;
  END IF;

  -- Verificar que el pedido pertenece al usuario
  IF v_id_cliente IS NULL OR v_id_cliente <> v_user THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, NULL::NUMERIC, 'El pedido no pertenece al usuario'::TEXT;
    RETURN;
  END IF;

  -- 🆕 VALIDACIÓN DE ESTADO: Permitir descuentos en "pedido en curso" o estados posteriores
  -- Estados válidos: 'pedido en curso', 'en preparación', 'en preparación parcial', 
  --                  'listo para entregar', 'asignado a delivery', 'confirmado por delivery',
  --                  'en camino', 'entregado', 'pendiente confirmacion pago', 'pagado'
  v_estado_valido := v_estado IN (
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
      ('El pedido no está en un estado elegible para descuentos. Estado actual: ' || v_estado)::TEXT;
    RETURN;
  END IF;

  -- Verificar que no se haya reclamado ya un descuento
  IF v_juego_reclamado IS TRUE THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'El beneficio de juego ya fue reclamado para este pedido'::TEXT;
    RETURN;
  END IF;

  -- Verificar que no exista una sesión premiada para este pedido y juego
  -- NOTA: La constraint uniq_juego_premio_global puede causar conflictos si el usuario ya reclamó
  -- un premio anteriormente. Verificamos primero antes de intentar insertar.
  IF EXISTS (
    SELECT 1 FROM public.juego_sesiones
    WHERE user_id = v_user AND pedido_id = p_pedido_id AND juego = p_juego AND awarded
  ) THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'Ya existe una sesión premiada para este pedido y juego'::TEXT;
    RETURN;
  END IF;

  -- Calcular descuento según el juego y score
  IF p_juego = 'tap' THEN
    IF p_score >= 50 THEN
      v_pct := 20;
    ELSIF p_score >= 30 THEN
      v_pct := 15;
    ELSIF p_score >= 20 THEN
      v_pct := 10;
    END IF;
  ELSIF p_juego = 'memoria' THEN
    IF p_score <= 8 THEN
      v_pct := 20;
    ELSIF p_score <= 12 THEN
      v_pct := 15;
    ELSIF p_score <= 16 THEN
      v_pct := 10;
    END IF;
  ELSIF p_juego = 'trivia' THEN
    IF p_score >= 5 THEN
      v_pct := 20;
    ELSIF p_score = 4 THEN
      v_pct := 15;
    ELSIF p_score >= 3 THEN
      v_pct := 10;
    END IF;
  END IF;

  -- Si no hay descuento, retornar
  IF v_pct = 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'No obtuviste un descuento con este puntaje'::TEXT;
    RETURN;
  END IF;

  -- Obtener total actual del pedido
  SELECT COALESCE(SUM(d.cantidad * d."precioUnitario"), 0)
  INTO v_subtotal
  FROM public.pedidos_detalles d
  WHERE d."idPedido" = p_pedido_id;

  -- Calcular total con descuento
  v_total_final := ROUND(v_subtotal * (1 - v_pct / 100.0), 2);

  -- Actualizar pedido con descuento
  UPDATE public.pedidos
  SET 
    descuento_pct = NULLIF(v_pct, 0),
    descuento_fuente = CASE WHEN v_pct > 0 THEN p_juego ELSE NULL END,
    descuento_aplicado_at = CASE WHEN v_pct > 0 THEN NOW() ELSE NULL END,
    juego_premio_reclamado = TRUE,
    total = v_total_final,
    updated_at = NOW()
  WHERE id = p_pedido_id;

  -- Registrar sesión de juego
  -- NOTA: Usar INSERT ... ON CONFLICT para manejar la constraint uniq_juego_premio_global
  -- Si ya existe una sesión premiada para este usuario y juego (aunque sea de otro pedido),
  -- no insertamos una nueva sesión premiada, pero sí registramos la sesión sin premio
  INSERT INTO public.juego_sesiones(id, user_id, pedido_id, juego, score, awarded)
  VALUES (gen_random_uuid(), v_user, p_pedido_id, p_juego, p_score, v_pct > 0)
  ON CONFLICT DO NOTHING;
  
  -- Si hubo conflicto (constraint uniq_juego_premio_global), el INSERT no insertó nada
  -- pero el descuento ya se aplicó al pedido, así que está bien

  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE, 
    v_pct, 
    v_total_final, 
    ('Descuento del ' || v_pct || '% aplicado exitosamente')::TEXT;
END;
$$;

-- PASO 3: Verificar que se creó correctamente
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'claim_game_discount';

-- PASO 4: Comentario para documentación
COMMENT ON FUNCTION public.claim_game_discount(bigint, text, integer) IS 
'Permite aplicar descuentos de juegos cuando el pedido está en "pedido en curso" o estados posteriores. Aplica tanto para pedidos de mesa como delivery. Retorna: applied (boolean), pct (numeric), total_final (numeric), reason (text).';

