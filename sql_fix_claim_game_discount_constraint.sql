-- =====================================================
-- FIX: Manejar constraint uniq_juego_premio_global en claim_game_discount
-- =====================================================

-- PASO 1: Verificar constraint actual
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'public.juego_sesiones'::regclass
  AND conname LIKE '%juego_premio%'
ORDER BY conname;

-- PASO 2: Verificar estructura de la tabla juego_sesiones
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'juego_sesiones'
ORDER BY ordinal_position;

-- PASO 3: Eliminar función existente
DROP FUNCTION IF EXISTS public.claim_game_discount(bigint, text, integer);

-- PASO 4: Crear función corregida con manejo de constraint
CREATE OR REPLACE FUNCTION public.claim_game_discount(
  p_pedido_id bigint,
  p_juego text,
  p_score integer
)
RETURNS TABLE(applied boolean, pct numeric, total_final numeric, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pct numeric := 0;
  v_subtotal numeric := 0;
  v_total_final numeric := 0;
  v_juego_reclamado boolean := false;
  v_estado text;
  v_id_cliente uuid;
  v_sesion_id uuid;
BEGIN
  -- Verificar autenticación
  IF v_user IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'No autenticado'::TEXT;
    RETURN;
  END IF;

  -- Obtener información del pedido
  SELECT estado, "idCliente", COALESCE(juego_premio_reclamado, FALSE)
  INTO v_estado, v_id_cliente, v_juego_reclamado
  FROM public.pedidos
  WHERE id = p_pedido_id
  FOR UPDATE;

  -- Verificar que el pedido pertenece al usuario
  IF v_id_cliente IS NULL OR v_id_cliente <> v_user THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'El pedido no pertenece al usuario'::TEXT;
    RETURN;
  END IF;

  -- Verificar estado del pedido (permitir desde "pedido en curso" en adelante)
  IF v_estado NOT IN (
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
  ) THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'El pedido no está en un estado elegible para descuentos'::TEXT;
    RETURN;
  END IF;

  -- Verificar que no se haya reclamado ya un descuento para este pedido
  IF v_juego_reclamado IS TRUE THEN
    RETURN QUERY SELECT 
      FALSE, 
      0::NUMERIC, 
      NULL::NUMERIC, 
      'El beneficio de juego ya fue reclamado para este pedido'::TEXT;
    RETURN;
  END IF;

  -- Verificar que no exista una sesión premiada para este pedido y juego
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
  -- 🆕 Verificar primero si ya existe una sesión premiada para este usuario y juego (global)
  -- Si existe, no podemos insertar otra sesión premiada debido a uniq_juego_premio_global
  -- En ese caso, insertamos la sesión sin premio (awarded = FALSE)
  -- pero el descuento ya se aplicó al pedido, así que está bien
  IF EXISTS (
    SELECT 1 FROM public.juego_sesiones
    WHERE user_id = v_user AND juego = p_juego AND awarded = TRUE
  ) THEN
    -- Ya existe una sesión premiada para este usuario y juego, insertar sin premio
    INSERT INTO public.juego_sesiones(id, user_id, pedido_id, juego, score, awarded)
    VALUES (gen_random_uuid(), v_user, p_pedido_id, p_juego, p_score, FALSE);
  ELSE
    -- No existe sesión premiada previa, podemos insertar con premio
    BEGIN
      INSERT INTO public.juego_sesiones(id, user_id, pedido_id, juego, score, awarded)
      VALUES (gen_random_uuid(), v_user, p_pedido_id, p_juego, p_score, TRUE);
    EXCEPTION
      WHEN unique_violation THEN
        -- Si aún así hay conflicto (por si acaso), insertar sin premio
        INSERT INTO public.juego_sesiones(id, user_id, pedido_id, juego, score, awarded)
        VALUES (gen_random_uuid(), v_user, p_pedido_id, p_juego, p_score, FALSE);
    END;
  END IF;

  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE, 
    v_pct, 
    v_total_final, 
    ('Descuento del ' || v_pct || '% aplicado exitosamente')::TEXT;
END;
$$;

-- PASO 5: Verificar que se creó correctamente
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'claim_game_discount';

-- PASO 6: Comentario para documentación
COMMENT ON FUNCTION public.claim_game_discount(bigint, text, integer) IS 
'Reclama un descuento de juego para un pedido. Maneja la constraint uniq_juego_premio_global correctamente.';

