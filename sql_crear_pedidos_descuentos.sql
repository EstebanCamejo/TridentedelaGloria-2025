-- =====================================================
-- CREAR TABLA: pedidos_descuentos
-- =====================================================
-- Esta tabla almacena los descuentos de juegos aplicados a los pedidos
-- Es crítica para evitar múltiples reclamos de descuento

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.pedidos_descuentos (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL,
  descuento_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  juego_id TEXT, -- Nombre del juego que otorgó el descuento (trivia, tap, memoria)
  monto_descuento NUMERIC(10,2), -- Monto del descuento en pesos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Foreign key a pedidos
  CONSTRAINT fk_pedidos_descuentos_pedido 
    FOREIGN KEY (pedido_id) 
    REFERENCES public.pedidos(id) 
    ON DELETE CASCADE
);

-- Crear índice para consultas rápidas por pedido_id
CREATE INDEX IF NOT EXISTS idx_pedidos_descuentos_pedido_id 
  ON public.pedidos_descuentos(pedido_id);

-- Comentarios para documentación
COMMENT ON TABLE public.pedidos_descuentos IS 'Registra los descuentos de juegos aplicados a los pedidos';
COMMENT ON COLUMN public.pedidos_descuentos.pedido_id IS 'ID del pedido al que se aplicó el descuento';
COMMENT ON COLUMN public.pedidos_descuentos.descuento_pct IS 'Porcentaje de descuento aplicado (ej: 10.00 para 10%)';
COMMENT ON COLUMN public.pedidos_descuentos.juego_id IS 'Nombre del juego que otorgó el descuento (trivia, tap, memoria)';
COMMENT ON COLUMN public.pedidos_descuentos.monto_descuento IS 'Monto del descuento en pesos';

-- Verificar que se creó correctamente
SELECT 
  'TABLA pedidos_descuentos' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos_descuentos')
    THEN '✅ CREADA EXITOSAMENTE'
    ELSE '❌ ERROR AL CREAR'
  END as estado;

-- Mostrar estructura de la tabla
SELECT 
  column_name as columna,
  data_type as tipo_dato,
  is_nullable as nullable,
  column_default as valor_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pedidos_descuentos'
ORDER BY ordinal_position;

