import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuración del tiempo máximo de espera (en minutos)
const DEFAULT_MAX_WAIT_TIME_MINUTES = 45;

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con permisos de servicio
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[Gestionar Mesas Reservas] Iniciando proceso de gestión...')

    // Obtener el tiempo máximo de espera desde la tabla de configuración
    const { data: configData, error: configError } = await supabaseClient
      .from('configuracion')
      .select('valor')
      .eq('clave', 'tiempo_maximo_espera_reserva_minutos')
      .maybeSingle()

    const maxWaitTimeMinutes = configError || !configData || !configData.valor
      ? DEFAULT_MAX_WAIT_TIME_MINUTES
      : parseInt(configData.valor, 10)

    console.log(`[Gestionar Mesas Reservas] Tiempo máximo de espera configurado: ${maxWaitTimeMinutes} minutos`)

    // 1. Identificar reservas confirmadas cuya hora de inicio ya pasó
    const now = new Date()
    const fechaActual = now.toISOString().split('T')[0] // YYYY-MM-DD
    const horaActual = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM

    const { data: reservasActivas, error: fetchError } = await supabaseClient
      .from('reservas')
      .select('id, fecha, hora, mesa_id, usuario_id')
      .eq('estado', 'confirmada')
      .eq('fecha', fechaActual)
      .lte('hora', horaActual) // Reservas cuya hora ya pasó o es la actual

    if (fetchError) {
      console.error('[Gestionar Mesas Reservas] Error al obtener reservas:', fetchError)
      throw fetchError
    }

    console.log(`[Gestionar Mesas Reservas] Reservas confirmadas para hoy y hora pasada: ${reservasActivas?.length || 0}`)

    let mesasLiberadas = 0
    let reservasCanceladas = 0

    for (const reserva of (reservasActivas || [])) {
      if (!reserva.mesa_id) {
        console.warn(`[Gestionar Mesas Reservas] Reserva ${reserva.id} confirmada sin mesa_id. Saltando.`)
        continue
      }

      const [reservaHour, reservaMinute] = reserva.hora.split(':').map(Number)
      const reservaDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), reservaHour, reservaMinute)

      const tiempoLimite = new Date(reservaDateTime.getTime() + (maxWaitTimeMinutes * 60 * 1000))

      // 2. Verificar si el cliente ya hizo un pedido para esta mesa
      const { data: pedidoActivo, error: pedidoError } = await supabaseClient
        .from('pedidos')
        .select('id')
        .eq('mesa_id', reserva.mesa_id)
        .eq('usuario_id', reserva.usuario_id)
        .in('estado', ['pendiente aceptación', 'en preparación', 'en preparación parcial', 'entregado'])
        .maybeSingle()

      if (pedidoError) {
        console.error(`[Gestionar Mesas Reservas] Error al verificar pedido para reserva ${reserva.id}:`, pedidoError)
        continue
      }

      if (pedidoActivo) {
        console.log(`[Gestionar Mesas Reservas] Cliente de reserva ${reserva.id} ya hizo pedido en mesa ${reserva.mesa_id}. Manteniendo estado.`)
        // Si ya hay un pedido activo, la mesa debe permanecer ocupada por el cliente.
        // Asegurarse de que el estado de la mesa sea 'ocupada'
        await supabaseClient
          .from('mesas')
          .update({ estado: 'ocupada' })
          .eq('id', reserva.mesa_id)
        continue
      }

      // 3. Si no hay pedido y el tiempo límite ha pasado, liberar la mesa y cancelar la reserva
      if (now > tiempoLimite) {
        console.log(`[Gestionar Mesas Reservas] Tiempo límite excedido para reserva ${reserva.id} en mesa ${reserva.mesa_id}. Liberando mesa y cancelando reserva.`)

        // Liberar la mesa
        await supabaseClient
          .from('mesas')
          .update({ estado: 'libre' })
          .eq('id', reserva.mesa_id)

        // Cancelar la reserva
        await supabaseClient
          .from('reservas')
          .update({ 
            estado: 'cancelada', 
            motivo_rechazo: `Tiempo de espera excedido (${maxWaitTimeMinutes} minutos) sin realizar pedido.` 
          })
          .eq('id', reserva.id)

        mesasLiberadas++
        reservasCanceladas++
      } else {
        console.log(`[Gestionar Mesas Reservas] Reserva ${reserva.id} en mesa ${reserva.mesa_id} aún dentro del tiempo límite. Manteniendo estado.`)
        // Si está dentro del tiempo límite y no hay pedido, la mesa debería estar en 'reservaActiva'
        await supabaseClient
          .from('mesas')
          .update({ estado: 'reservaActiva' })
          .eq('id', reserva.mesa_id)
      }
    }

    console.log(`[Gestionar Mesas Reservas] Proceso completado. Mesas liberadas: ${mesasLiberadas}, Reservas canceladas: ${reservasCanceladas}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Proceso de gestión de mesas de reservas completado.',
        mesasLiberadas,
        reservasCanceladas,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[Gestionar Mesas Reservas] Error en la función:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
