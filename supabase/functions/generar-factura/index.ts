import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

interface FacturaData {
  pedido_id: number;
  cliente_id: string;
  cliente_anonimo: boolean;
  datos_cliente: {
    nombres: string;
    apellidos: string;
    cuil: string | null;
    dni: string | null;
    email: string | null;
  };
  subtotal: number;
  monto_descuento_total: number;
  total_pedido: number;
  total_propina: number;
  total_final: number;
  items: Array<{
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  descuentos: Array<{
    juego: string;
    descuento_pct: number;
    monto_descuento: number;
  }>;
  numero_mesa: number;
  fecha_pedido: string;
}

Deno.serve(async (req: Request) => {
  // Orígenes permitidos en dev y app empaquetada
  const ALLOWED_ORIGINS = new Set([
    'http://localhost:4200', // Angular
    'http://localhost:8100', // Ionic
    'capacitor://localhost', // app Android/iOS con Capacitor
    'http://localhost'       // por si algún entorno usa este
  ])

  function buildCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') ?? ''
    return {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : '*',
      'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }
  }

  const cors = buildCorsHeaders(req)

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  // Solo POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Only POST' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...cors } }
    )
  }

  // Body
  let body: { pedido_id: number }
  try {
    body = (await req.json()) as { pedido_id: number }
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Bad JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...cors } }
    )
  }

  const { pedido_id } = body

  if (!pedido_id) {
    return new Response(
      JSON.stringify({ ok: false, error: 'pedido_id es requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...cors } }
    )
  }

  // Inicializar cliente Supabase (mismo patrón que alta-mesa que funciona)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('[generar-factura] ❌ Faltan variables de entorno')
    console.error('[generar-factura] SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
    console.error('[generar-factura] SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌')
    return new Response(
      JSON.stringify({ ok: false, error: 'Missing Supabase configuration' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
    )
  }

  console.log('[generar-factura] Inicializando cliente Supabase...')
  console.log('[generar-factura] URL:', supabaseUrl.substring(0, 30) + '...')
  console.log('[generar-factura] Service Key presente:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NO PRESENTE')
  
  // Crear cliente igual que alta-mesa (sin opciones adicionales)
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('[generar-factura] ✅ Cliente Supabase inicializado con SERVICE_ROLE_KEY')

  try {
    // 1. Obtener datos del pedido
    console.log('[generar-factura] ===== PASO 1: Obteniendo datos del pedido =====')
    console.log('[generar-factura] Pedido ID:', pedido_id)
    
    let pedido: any
    try {
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .select(`
          id,
          total,
          propina_pct,
          propina_monto,
          descuento_pct,
          descuento_fuente,
          created_at,
          idCliente,
          tipo_pedido
        `)
        .eq('id', pedido_id)
        .single()

      if (pedidoError) {
        console.error('[generar-factura] ❌ ERROR EN PASO 1:', JSON.stringify(pedidoError, null, 2))
        console.error('[generar-factura] ❌ Código:', pedidoError.code)
        console.error('[generar-factura] ❌ Mensaje:', pedidoError.message)
        console.error('[generar-factura] ❌ Detalles:', pedidoError.details)
        console.error('[generar-factura] ❌ Hint:', pedidoError.hint)
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: `Error al obtener pedido: ${pedidoError.message}`,
            code: pedidoError.code || 500,
            step: 1,
            details: pedidoError.details
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
        )
      }

      if (!pedidoData) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Pedido no encontrado', step: 1 }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...cors } }
        )
      }

      pedido = pedidoData
      console.log('[generar-factura] ✅ PASO 1 COMPLETADO - Pedido obtenido:', pedido.id)
    } catch (step1Err: unknown) {
      const step1Msg = step1Err instanceof Error ? step1Err.message : String(step1Err)
      console.error('[generar-factura] ❌ EXCEPCIÓN EN PASO 1:', step1Msg)
      return new Response(
        JSON.stringify({ ok: false, error: `Excepción en paso 1: ${step1Msg}`, step: 1 }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
      )
    }

    // 2. Obtener detalles del pedido
    console.log('[generar-factura] ===== PASO 2: Obteniendo detalles del pedido =====')
    
    let detalles: any[]
    try {
      const { data: detallesData, error: detallesError } = await supabase
        .from('pedidos_detalles')
        .select(`
          cantidad,
          precioUnitario,
          menu (
            nombre
          )
        `)
        .eq('idPedido', pedido_id)

      if (detallesError) {
        console.error('[generar-factura] ❌ ERROR EN PASO 2:', JSON.stringify(detallesError, null, 2))
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: `Error al obtener detalles: ${detallesError.message}`,
            code: detallesError.code || 500,
            step: 2
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
        )
      }

      detalles = detallesData || []
      console.log('[generar-factura] ✅ PASO 2 COMPLETADO - Detalles obtenidos:', detalles.length, 'items')
    } catch (step2Err: unknown) {
      const step2Msg = step2Err instanceof Error ? step2Err.message : String(step2Err)
      console.error('[generar-factura] ❌ EXCEPCIÓN EN PASO 2:', step2Msg)
      return new Response(
        JSON.stringify({ ok: false, error: `Excepción en paso 2: ${step2Msg}`, step: 2 }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
      )
    }

    // 3. Obtener información del cliente
    console.log('[generar-factura] ===== PASO 3: Obteniendo información del cliente =====')
    console.log('[generar-factura] Auth ID del pedido:', pedido.idCliente)
    
    let usuario: any = null
    try {
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nombres, apellidos, cuil, dni, email, perfil')
        .eq('auth_id', pedido.idCliente)
        .maybeSingle()

      if (usuarioError) {
        console.error('[generar-factura] ❌ ERROR EN PASO 3:', JSON.stringify(usuarioError, null, 2))
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: `Error al obtener usuario: ${usuarioError.message}`,
            code: usuarioError.code || 500,
            step: 3
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
        )
      }

      usuario = usuarioData
      console.log('[generar-factura] ✅ PASO 3 COMPLETADO - Usuario:', usuario ? `${usuario.nombres} ${usuario.apellidos}` : 'Cliente anónimo')
    } catch (step3Err: unknown) {
      const step3Msg = step3Err instanceof Error ? step3Err.message : String(step3Err)
      console.error('[generar-factura] ❌ EXCEPCIÓN EN PASO 3:', step3Msg)
      return new Response(
        JSON.stringify({ ok: false, error: `Excepción en paso 3: ${step3Msg}`, step: 3 }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
      )
    }

    // 4. Obtener información de mesa
    console.log('[generar-factura] ===== PASO 4: Obteniendo información de mesa =====')
    // IMPORTANTE: lista_espera.usuario_id guarda el auth_id (UUID), NO el usuarios.id (BIGINT)
    console.log('[generar-factura] Auth ID (para lista_espera.usuario_id):', pedido.idCliente)
    
    // Solo buscar mesa si NO es delivery (para delivery, numero_mesa será 0)
    const esDelivery = pedido.tipo_pedido === 'delivery'
    let listaEspera: any = null
    
    if (!esDelivery) {
      try {
        // Usar auth_id directamente ya que lista_espera.usuario_id guarda auth_id (UUID)
        const { data: listaEsperaData, error: listaError } = await supabase
          .from('lista_espera')
          .select('numero_mesa')
          .eq('usuario_id', pedido.idCliente) // auth_id UUID
          .in('estado', ['asignado','finalizado'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (listaError) {
          console.error('[generar-factura] ❌ ERROR EN PASO 4:', JSON.stringify(listaError, null, 2))
          return new Response(
            JSON.stringify({ 
              ok: false, 
              error: `Error al obtener mesa: ${listaError.message}`,
              code: listaError.code || 500,
              step: 4
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
          )
        }

        listaEspera = listaEsperaData
        console.log('[generar-factura] ✅ PASO 4 COMPLETADO - Mesa:', listaEspera?.numero_mesa || 'No encontrada')
      } catch (step4Err: unknown) {
        const step4Msg = step4Err instanceof Error ? step4Err.message : String(step4Err)
        console.error('[generar-factura] ❌ EXCEPCIÓN EN PASO 4:', step4Msg)
        return new Response(
          JSON.stringify({ ok: false, error: `Excepción en paso 4: ${step4Msg}`, step: 4 }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
        )
      }
    } else {
      console.log('[generar-factura] ✅ PASO 4 COMPLETADO - Pedido delivery, numero_mesa será 0')
    }

    // 4. Procesar datos para la factura
    const items = detalles?.map(detalle => ({
      nombre: (detalle.menu as any)?.nombre || 'Producto',
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precioUnitario,
      subtotal: detalle.cantidad * detalle.precioUnitario
    })) || []

    // Calcular subtotal y descuentos
    const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0)
    const descuentos = [] as { juego: string; descuento_pct: number; monto_descuento: number }[]
    let montoDescuentoTotal = 0
    if (pedido.descuento_pct && pedido.descuento_pct > 0) {
      const montoDescuento = (subtotal * pedido.descuento_pct) / 100
      montoDescuentoTotal += montoDescuento
      descuentos.push({
        juego: pedido.descuento_fuente || 'juego',
        descuento_pct: pedido.descuento_pct,
        monto_descuento: montoDescuento
      })
    }

    
    const baseParaPropina = Math.max(0, subtotal - montoDescuentoTotal)
    const propinaCalculada = typeof pedido.propina_monto === 'number' && !Number.isNaN(pedido.propina_monto)
      ? Number(pedido.propina_monto)
      : ((baseParaPropina * (Number(pedido.propina_pct) || 0)) / 100)
    const totalFinal = baseParaPropina + propinaCalculada

    // IMPORTANTE: facturas.cliente_id debe referenciar usuarios.id (BIGINT), NO usuarios.auth_id (UUID)
    // Por eso usamos usuario?.id en lugar de pedido.idCliente (que es auth_id)
    const facturaData: FacturaData = {
      pedido_id: pedido.id,
      cliente_id: usuario?.id ?? null, // Usar usuarios.id (BIGINT), no auth_id (UUID)
      cliente_anonimo: (usuario?.perfil === 'clienteAnon'),
      datos_cliente: {
        nombres: usuario?.nombres ?? '',
        apellidos: usuario?.apellidos ?? '',
        cuil: usuario?.cuil ?? null,
        dni: usuario?.dni ?? null,
        email: usuario?.email ?? null
      },
      subtotal: subtotal,
      monto_descuento_total: montoDescuentoTotal,
      total_pedido: baseParaPropina,
      total_propina: propinaCalculada,
      total_final: totalFinal,
      items,
      descuentos,
      numero_mesa: esDelivery ? 0 : (listaEspera?.numero_mesa ?? 0),
      fecha_pedido: pedido.created_at
    }
    
    console.log('[generar-factura] facturaData.cliente_id (usuarios.id):', facturaData.cliente_id)
    console.log('[generar-factura] pedido.idCliente (auth_id):', pedido.idCliente, '(NO usar este en facturas)')

    // 5. Generar PDF
    console.log('[generar-factura] ===== PASO 5: Generando PDF =====')
    let pdfUrl: string
    try {
      pdfUrl = await generarPDF(facturaData, supabase)
      console.log('[generar-factura] ✅ PASO 5 COMPLETADO - PDF generado y subido:', pdfUrl)
    } catch (pdfError: unknown) {
      const pdfMsg = pdfError instanceof Error ? pdfError.message : String(pdfError)
      console.error('[generar-factura] ❌ ERROR EN PASO 5:', pdfMsg)
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Error al generar PDF: ${pdfMsg}`,
          step: 5
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
      )
    }

    // 6. Crear registro en tabla facturas
    console.log('[generar-factura] ===== PASO 6: Creando registro en tabla facturas =====')
    let facturaId: number
    try {
      // Generar número de factura secuencial simple
      console.log('[generar-factura] Contando facturas existentes...')
      const { count: factCount, error: countError } = await supabase
        .from('facturas')
        .select('id', { count: 'exact', head: true })

      if (countError) {
        console.error('[generar-factura] ❌ Error al contar facturas:', JSON.stringify(countError, null, 2))
        throw new Error(`Error al contar facturas: ${countError.message}`)
      }

      const numeroFactura = `FACTURA Nº${(factCount ?? 0) + 1}`
      console.log('[generar-factura] Número de factura generado:', numeroFactura)

      // Verificar si ya existe una factura para este pedido
      console.log('[generar-factura] Verificando factura existente para pedido:', pedido.id)
      const { data: facturaExistente, error: checkError } = await supabase
        .from('facturas')
        .select('id')
        .eq('pedido_id', pedido.id)
        .maybeSingle()

      if (checkError) {
        console.error('[generar-factura] ❌ Error al verificar factura existente:', JSON.stringify(checkError, null, 2))
        throw new Error(`Error al verificar factura: ${checkError.message}`)
      }

      if (facturaExistente) {
        console.warn('[generar-factura] ⚠️ Ya existe una factura para este pedido:', facturaExistente.id)
        facturaId = facturaExistente.id
        console.log('[generar-factura] ✅ Usando factura existente con ID:', facturaId)
      } else {
        const facturaPayload = {
          numero_factura: numeroFactura,
          pedido_id: pedido.id,
          cliente_id: facturaData.cliente_id, // Ahora usa usuarios.id (BIGINT) en lugar de auth_id (UUID)
          cliente_anonimo: facturaData.cliente_anonimo,
          datos_cliente: facturaData.datos_cliente,
          total_pedido: Number(facturaData.total_pedido),
          total_propina: Number(facturaData.total_propina),
          total_final: Number(facturaData.total_final),
          pdf_url: pdfUrl
        }
        
        console.log('[generar-factura] ✅ cliente_id corregido:', facturaPayload.cliente_id, '(usuarios.id BIGINT)')

        console.log('[generar-factura] Payload para insert:', JSON.stringify(facturaPayload, null, 2))

        console.log('[generar-factura] Insertando factura en BD...')
        console.log('[generar-factura] Payload completo:', JSON.stringify(facturaPayload, null, 2))
        
        const { data: factura, error: facturaError } = await supabase
          .from('facturas')
          .insert(facturaPayload)
          .select()
          .single()

        if (facturaError) {
          console.error('[generar-factura] ❌ ERROR AL INSERTAR EN FACTURAS:')
          console.error('[generar-factura] ❌ Error completo:', JSON.stringify(facturaError, null, 2))
          console.error('[generar-factura] ❌ Código de error:', facturaError.code)
          console.error('[generar-factura] ❌ Mensaje:', facturaError.message)
          console.error('[generar-factura] ❌ Detalles:', facturaError.details)
          console.error('[generar-factura] ❌ Hint:', facturaError.hint)
          
          // Si es un error 401 o de autorización, devolverlo explícitamente
          if (facturaError.code === 'PGRST301' || facturaError.message.includes('authorization') || facturaError.message.includes('401')) {
            return new Response(
              JSON.stringify({ 
                ok: false, 
                error: facturaError.message,
                code: 401,
                step: 6,
                details: facturaError.details
              }),
              { status: 401, headers: { 'Content-Type': 'application/json', ...cors } }
            )
          }
          
          return new Response(
            JSON.stringify({ 
              ok: false, 
              error: `Error al crear factura: ${facturaError.message}`,
              code: facturaError.code || 500,
              step: 6,
              details: facturaError.details,
              hint: facturaError.hint
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
          )
        }

        if (!factura || !factura.id) {
          throw new Error('La factura se creó pero no se obtuvo ID')
        }

        facturaId = factura.id
        console.log('[generar-factura] ✅ Factura creada en BD con ID:', facturaId)
      }
    } catch (facturaError: unknown) {
      const facturaMsg = facturaError instanceof Error ? facturaError.message : String(facturaError)
      console.error('[generar-factura] ❌ Error al crear factura en BD:', facturaMsg)
      throw new Error(`Error al crear factura: ${facturaMsg}`)
    }

    // 7. Enviar notificación según tipo de cliente
    console.log('[generar-factura] Cliente anónimo:', facturaData.cliente_anonimo)
    console.log('[generar-factura] Pedido idCliente (auth_id):', pedido.idCliente)
    if (facturaData.cliente_anonimo) {
      try {
        // Pasar el auth_id del pedido para que la función pueda crear el canal correcto
        await enviarNotificacionPush(facturaData, pdfUrl, supabase, pedido.idCliente)
        console.log('[generar-factura] ✅ Notificación push enviada')
      } catch (pushError: unknown) {
        const pushMsg = pushError instanceof Error ? pushError.message : String(pushError)
        console.error('[generar-factura] ⚠️ Error al enviar push (no crítico):', pushMsg)
        // No lanzamos error aquí porque la factura ya está creada
      }
    } else {
      try {
        const enviado = await enviarEmailFactura(facturaData, pdfUrl, supabase)
        if (enviado) {
          await supabase
            .from('facturas')
            .update({ email_enviado: true })
            .eq('id', facturaId)
          console.log('[generar-factura] ✅ Email enviado y marcado en BD')
        } else {
          console.warn('[generar-factura] ⚠️ Email no se pudo enviar (pero factura creada)')
        }
      } catch (emailError: unknown) {
        const emailMsg = emailError instanceof Error ? emailError.message : String(emailError)
        console.error('[generar-factura] ⚠️ Error al enviar email (no crítico):', emailMsg)
        // No lanzamos error aquí porque la factura ya está creada
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true,
        factura_id: facturaId,
        pdf_url: pdfUrl,
        cliente_anonimo: facturaData.cliente_anonimo
      }),
      { headers: { 'Content-Type': 'application/json', ...cors } }
    )

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const stack = e instanceof Error ? e.stack : undefined
    
    console.error('[generar-factura] ❌ ===== ERROR GENERAL =====')
    console.error('[generar-factura] ❌ Mensaje:', msg)
    console.error('[generar-factura] ❌ Stack:', stack)
    console.error('[generar-factura] ❌ Error completo:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2))
    
    // Si el error contiene información de código 401, devolverlo explícitamente
    if (msg.includes('401') || msg.includes('authorization') || msg.includes('Unauthorized')) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: msg,
          code: 401,
          message: 'Error de autorización en Edge Function'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...cors } }
      )
    }
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: msg,
        type: e instanceof Error ? e.constructor.name : typeof e
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
    )
  }
})

async function generarPDF(facturaData: FacturaData, supabase: any): Promise<string> {
  console.log('[generarPDF] Generando contenido PDF para pedido:', facturaData.pedido_id)
  
  const fileName = `factura_${facturaData.pedido_id}_${Date.now()}.pdf`
  
  try {
    console.log('[generarPDF] Inicializando pdf-lib...')
    
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    const page = pdfDoc.addPage([595, 842]) // A4
    const pageWidth = page.getWidth()
    const pageHeight = page.getHeight()
    const blackColor = rgb(0, 0, 0)
    const grayColor = rgb(0.5, 0.5, 0.5)
    
    // Fetch logo from Supabase Storage
    let logoImage = null
    try {
      const logoUrl = 'https://ujpfjthcqpenkizxjimp.supabase.co/storage/v1/object/public/Imagenes/brand.png'
      console.log('[generarPDF] Descargando logo desde:', logoUrl)
      const logoResponse = await fetch(logoUrl)
      if (logoResponse.ok) {
        const logoBytes = new Uint8Array(await logoResponse.arrayBuffer())
        logoImage = await pdfDoc.embedPng(logoBytes)
        console.log('[generarPDF] ✅ Logo cargado exitosamente')
      }
    } catch (logoErr) {
      console.warn('[generarPDF] ⚠️ No se pudo cargar el logo:', logoErr)
    }
    
    const marginX = 25
    const marginY = 25
    const innerWidth = pageWidth - (marginX * 2)
    const innerHeight = pageHeight - (marginY * 2)
    
    // Borde exterior
    page.drawRectangle({
      x: marginX,
      y: marginY,
      width: innerWidth,
      height: innerHeight,
      borderColor: blackColor,
      borderWidth: 1.5,
    })
    
    // ===== SECCIÓN 1: HEADER (Empresa + Tipo Factura) =====
    const headerTop = pageHeight - marginY - 10
    const headerHeight = 120
    const headerBottom = headerTop - headerHeight
    
    // Recuadro del header
    page.drawRectangle({
      x: marginX + 5,
      y: headerBottom,
      width: innerWidth - 10,
      height: headerHeight,
      borderColor: blackColor,
      borderWidth: 1,
    })
    
    // Logo a la izquierda
    const logoSize = 70
    const logoX = marginX + 15
    const logoY = headerTop - 20 - logoSize
    if (logoImage) {
      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoSize,
        height: logoSize,
      })
    }
    
    // Información empresa (izquierda)
    let textY = headerTop - 25
    const leftStartX = marginX + 100
    page.drawText('El Tridente de la Gloria', { x: leftStartX, y: textY, size: 20, font: helveticaBold, color: blackColor })
    textY -= 18
    page.drawText('Razón Social: El Tridente de la Gloria', { x: leftStartX, y: textY, size: 10, font: helvetica, color: blackColor })
    textY -= 14
    page.drawText('Domicilio Comercial: Mitre 750 - Avellaneda', { x: leftStartX, y: textY, size: 10, font: helvetica, color: blackColor })
    textY -= 14
    page.drawText('Condición frente al IVA: Responsable Inscripto', { x: leftStartX, y: textY, size: 10, font: helvetica, color: blackColor })
    
    // Tipo FACTURA y datos (derecha)
    const fechaEmision = new Date(facturaData.fecha_pedido).toLocaleDateString('es-AR')
    const rightStartX = marginX + 320
    textY = headerTop - 25
    page.drawText('FACTURA', { x: rightStartX, y: textY, size: 18, font: helveticaBold, color: blackColor })
    textY -= 18
    page.drawText('Punto de Venta: 0001 Comp. Nro: ' + String(facturaData.pedido_id).padStart(8, '0'), { x: rightStartX, y: textY, size: 10, font: helvetica, color: blackColor })
    textY -= 14
    page.drawText(`Fecha de Emisión: ${fechaEmision}`, { x: rightStartX, y: textY, size: 10, font: helvetica, color: blackColor })
    textY -= 14
    page.drawText('CUIT: 30123456789', { x: rightStartX, y: textY, size: 10, font: helvetica, color: blackColor })
    textY -= 14
    page.drawText('Ingresos Brutos: exento', { x: rightStartX, y: textY, size: 10, font: helvetica, color: blackColor })
    
    // Tipo C dentro del header (centrado) - COMENTADO por si se necesita más adelante
    // const tipoCBoxWidth = 70
    // const tipoCBoxHeight = 60
    // const tipoCBoxX = (pageWidth - tipoCBoxWidth) / 2
    // const tipoCBoxY = headerTop - 20 - tipoCBoxHeight
    // page.drawRectangle({
    //   x: tipoCBoxX,
    //   y: tipoCBoxY,
    //   width: tipoCBoxWidth,
    //   height: tipoCBoxHeight,
    //   borderColor: blackColor,
    //   borderWidth: 1,
    // })
    // const tipoCText = 'C'
    // const tipoCWidth = helveticaBold.widthOfTextAtSize(tipoCText, 32)
    // page.drawText(tipoCText, { x: (pageWidth - tipoCWidth) / 2, y: tipoCBoxY + 32, size: 32, font: helveticaBold, color: blackColor })
    // page.drawText('COD. 007', { x: (pageWidth - 45) / 2, y: tipoCBoxY + 12, size: 8, font: helvetica, color: blackColor })
    
    // ===== SECCIÓN 2: DATOS DEL CLIENTE =====
    const clienteTop = headerBottom - 15
    const clienteHeight = 50
    const clienteBottom = clienteTop - clienteHeight
    
    page.drawRectangle({
      x: marginX + 5,
      y: clienteBottom,
      width: innerWidth - 10,
      height: clienteHeight,
      borderColor: blackColor,
      borderWidth: 1,
    })
    
    textY = clienteTop - 15
    const cuilDni = facturaData.datos_cliente.cuil ? facturaData.datos_cliente.cuil : facturaData.datos_cliente.dni
    page.drawText(`CUIT/DNI: ${cuilDni}`, { x: marginX + 15, y: textY, size: 10, font: helvetica, color: blackColor })
    textY -= 18
    
    const nombreCliente = `${facturaData.datos_cliente.nombres} ${facturaData.datos_cliente.apellidos}`
    page.drawText('Apellido y Nombre: ' + nombreCliente, { x: marginX + 15, y: textY, size: 10, font: helvetica, color: blackColor })
    textY -= 18
    
    // Mesa comentada - no es necesario mostrar este dato
    // if (facturaData.numero_mesa > 0) {
    //   page.drawText(`Mesa: ${facturaData.numero_mesa}`, { x: marginX + 15, y: textY, size: 10, font: helvetica, color: blackColor })
    // }
    
    // ===== SECCIÓN 3: TABLA DE PRODUCTOS =====
    const tableTop = clienteBottom - 15
    const tableHeaderHeight = 22
    const tableStartY = tableTop - tableHeaderHeight
    
    // Header de tabla
    page.drawRectangle({
      x: marginX + 5,
      y: tableStartY,
      width: innerWidth - 10,
      height: tableHeaderHeight,
      color: grayColor,
    })
    
    // Encabezados alineados con los datos (mismas posiciones X que los datos)
    textY = tableStartY + 14
    const dataCodeX = marginX + 18 // Posición X de los datos (código)
    const dataProductX = marginX + 75 // Posición X de los datos (producto)
    const dataCantX = marginX + 290 // Posición X de los datos (cantidad) - movido 25px a la izquierda
    const dataPrecioX = marginX + 380 // Posición X de los datos (precio) - movido 25px a la izquierda
    const dataSubtotalX = marginX + 480 // Posición X de los datos (subtotal) - movido 25px a la izquierda
    
    const codeText = 'Código'
    page.drawText(codeText, { x: dataCodeX, y: textY, size: 9, font: helveticaBold, color: blackColor })
    
    const productText = 'Producto / Servicio'
    page.drawText(productText, { x: dataProductX, y: textY, size: 9, font: helveticaBold, color: blackColor })
    
    const cantText = 'Cantidad'
    page.drawText(cantText, { x: dataCantX, y: textY, size: 9, font: helveticaBold, color: blackColor })
    
    const precioText = 'Precio Unit.'
    page.drawText(precioText, { x: dataPrecioX, y: textY, size: 9, font: helveticaBold, color: blackColor })
    
    page.drawText('Subtotal', { x: dataSubtotalX, y: textY, size: 9, font: helveticaBold, color: blackColor })
    
    // Espacio en blanco después del encabezado
    // Items de productos (tamaño 10, igual que datos del cliente)
    textY = tableStartY - 12
    const itemHeight = 18
    for (let i = 0; i < facturaData.items.length; i++) {
      const item = facturaData.items[i]
      const nombreTrunc = item.nombre.length > 28 ? item.nombre.substring(0, 25) + '...' : item.nombre
      page.drawText(String(i + 1), { x: dataCodeX, y: textY, size: 10, font: helvetica, color: blackColor })
      page.drawText(nombreTrunc, { x: dataProductX, y: textY, size: 10, font: helvetica, color: blackColor })
      page.drawText(item.cantidad.toString() + ',00', { x: dataCantX, y: textY, size: 10, font: helvetica, color: blackColor })
      page.drawText(`$${item.precio_unitario.toFixed(2)}`, { x: dataPrecioX, y: textY, size: 10, font: helvetica, color: blackColor })
      page.drawText(`$${item.subtotal.toFixed(2)}`, { x: dataSubtotalX, y: textY, size: 10, font: helvetica, color: blackColor })
      textY -= itemHeight
    }
    
    // ===== SECCIÓN 4: TOTALES =====
    const totalBoxTop = textY - 20
    const totalBoxHeight = 130
    const totalBoxBottom = totalBoxTop - totalBoxHeight
    const totalBoxWidth = 235
    const totalBoxX = marginX + innerWidth - 10 - totalBoxWidth
    
    page.drawRectangle({
      x: totalBoxX,
      y: totalBoxBottom,
      width: totalBoxWidth,
      height: totalBoxHeight,
      borderColor: blackColor,
      borderWidth: 1,
    })
    
    // Alinear números a la derecha considerando la coma decimal
    const numberRightX = totalBoxX + totalBoxWidth - 15 // Posición X para alinear a la derecha
    const numberFormat = (num: number) => num.toFixed(2).replace('.', ',')
    
    let totalY = totalBoxTop - 15
    const labelX = totalBoxX + 10
    
    // Calcular posición X del número más a la izquierda (para mantener alineación)
    const maxNumberWidth = Math.max(
      helveticaBold.widthOfTextAtSize(numberFormat(facturaData.subtotal), 9),
      helveticaBold.widthOfTextAtSize(numberFormat(facturaData.monto_descuento_total), 9),
      helveticaBold.widthOfTextAtSize(numberFormat(facturaData.total_propina), 9),
      helveticaBold.widthOfTextAtSize(numberFormat(facturaData.total_final), 13)
    )
    const numberX = numberRightX - maxNumberWidth
    
    // Subtotal
    page.drawText('Subtotal: $', { x: labelX, y: totalY, size: 9, font: helveticaBold, color: blackColor })
    const subtotalText = numberFormat(facturaData.subtotal)
    page.drawText(subtotalText, { x: numberX, y: totalY, size: 9, font: helveticaBold, color: blackColor })
    totalY -= 15
    
    // Descuento (solo si hay)
    if (facturaData.monto_descuento_total > 0) {
      page.drawText('Descuento: $', { x: labelX, y: totalY, size: 9, font: helveticaBold, color: blackColor })
      const descuentoText = numberFormat(facturaData.monto_descuento_total)
      page.drawText(descuentoText, { x: numberX, y: totalY, size: 9, font: helveticaBold, color: blackColor })
      totalY -= 15
    }
    
    // Propina (solo si hay)
    if (facturaData.total_propina > 0) {
      page.drawText('Propina: $', { x: labelX, y: totalY, size: 9, font: helveticaBold, color: blackColor })
      const propinaText = numberFormat(facturaData.total_propina)
      page.drawText(propinaText, { x: numberX, y: totalY, size: 9, font: helveticaBold, color: blackColor })
      totalY -= 15
    }
    
    totalY -= 8
    page.drawLine({ start: { x: totalBoxX + 10, y: totalY }, end: { x: totalBoxX + totalBoxWidth - 10, y: totalY }, thickness: 1, color: blackColor })
    totalY -= 10
    
    // IMPORTE TOTAL
    page.drawText('IMPORTE TOTAL: $', { x: labelX, y: totalY, size: 11, font: helveticaBold, color: blackColor })
    const totalText = numberFormat(facturaData.total_final)
    const totalTextWidth = helveticaBold.widthOfTextAtSize(totalText, 13)
    page.drawText(totalText, { x: numberRightX - totalTextWidth, y: totalY, size: 13, font: helveticaBold, color: blackColor })
    
    // Footer centrado
    const footerY = marginY + 30
    page.drawText('Gracias por su visita', { x: (pageWidth - helvetica.widthOfTextAtSize('Gracias por su visita', 11)) / 2, y: footerY + 15, size: 11, font: helvetica, color: blackColor })
    page.drawText('El Tridente de la Gloria, Buenos Aires, Argentina', { x: (pageWidth - helvetica.widthOfTextAtSize('El Tridente de la Gloria, Buenos Aires, Argentina', 10)) / 2, y: footerY, size: 10, font: helvetica, color: blackColor })
    
    const pdfBytes = await pdfDoc.save()
    console.log('[generarPDF] PDF generado, tamaño:', pdfBytes.length, 'bytes')
    
    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('facturas')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('[generarPDF] ❌ Error al subir a Storage:', JSON.stringify(uploadError, null, 2))
      throw new Error(`Error al subir PDF: ${uploadError.message}`)
    }

    if (!uploadData?.path) {
      throw new Error('Upload exitoso pero no se obtuvo path')
    }

    console.log('[generarPDF] ✅ Archivo subido:', uploadData.path)

    const { data: urlData } = supabase.storage
      .from('facturas')
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      throw new Error('No se pudo obtener URL pública')
    }

    console.log('[generarPDF] ✅ URL pública:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (pdfErr: unknown) {
    const pdfMsg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr)
    console.error('[generarPDF] ❌ Error al generar PDF:', pdfMsg)
    throw pdfErr
  }
}

async function enviarNotificacionPush(facturaData: FacturaData, pdfUrl: string, supabase: any, pedidoIdCliente?: string) {
  console.log('[enviarNotificacionPush] Iniciando notificación push para cliente anónimo...')
  console.log('[enviarNotificacionPush] Pedido ID Cliente (auth_id):', pedidoIdCliente)
  console.log('[enviarNotificacionPush] Factura Data cliente_id (usuarios.id):', facturaData.cliente_id)
  
  try {
    // Obtener el auth_id del cliente para el canal específico
    // PRIORIDAD 1: Usar pedidoIdCliente si está disponible (es el auth_id directo del pedido)
    // PRIORIDAD 2: Si no, intentar obtenerlo desde la tabla usuarios usando el cliente_id
    let clienteAuthId: string | null = null
    
    if (pedidoIdCliente) {
      // Usar el auth_id directamente del pedido (más confiable)
      clienteAuthId = pedidoIdCliente
      console.log('[enviarNotificacionPush] ✅ Auth ID obtenido desde pedido:', clienteAuthId)
    } else if (facturaData.cliente_id) {
      // Fallback: obtener desde usuarios usando cliente_id
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('auth_id')
        .eq('id', facturaData.cliente_id)
        .single()
      
      if (usuarioError) {
        console.error('[enviarNotificacionPush] ❌ Error al obtener auth_id desde usuarios:', usuarioError)
      } else {
        clienteAuthId = usuario?.auth_id || null
        console.log('[enviarNotificacionPush] ✅ Auth ID obtenido desde usuarios:', clienteAuthId)
      }
    }
    
    if (!clienteAuthId) {
      console.error('[enviarNotificacionPush] ❌ No se pudo obtener auth_id del cliente. No se puede enviar notificación push.')
      throw new Error('No se pudo obtener auth_id del cliente para enviar notificación push')
    }
    
    // Usar canal específico por usuario con el auth_id
    const channelName = `notificacion_cliente_factura_${clienteAuthId}`
    
    console.log('[enviarNotificacionPush] Usando canal:', channelName)
    const channel = supabase.channel(channelName)
    
    // Suscribirse al canal y esperar a que esté listo
    return new Promise<void>((resolve, reject) => {
      channel.subscribe((status: string) => {
        console.log('[enviarNotificacionPush] Estado de suscripción:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[enviarNotificacionPush] Canal suscrito, enviando mensaje...')
          channel.send({
            type: 'broadcast',
            event: 'factura_lista',
            payload: {
              titulo: 'Tu factura está lista',
              mensaje: 'Descárgala tocando aquí',
              pdf_url: pdfUrl,
              mesa_numero: facturaData.numero_mesa,
              cliente_id: facturaData.cliente_id,
              timestamp: new Date().toISOString()
            }
          }).then((result: any) => {
            console.log('[enviarNotificacionPush] ✅ Mensaje enviado:', result)
            // Desuscribirse después de enviar
            setTimeout(() => {
              supabase.removeChannel(channel)
              resolve()
            }, 500)
          }).catch((sendErr: any) => {
            console.error('[enviarNotificacionPush] ❌ Error al enviar mensaje:', sendErr)
            supabase.removeChannel(channel)
            reject(sendErr)
          })
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[enviarNotificacionPush] ❌ Error en canal')
          supabase.removeChannel(channel)
          reject(new Error('Error en canal'))
        }
      })
      
      // Timeout de seguridad
      setTimeout(() => {
        if (channel.state !== 'closed') {
          console.warn('[enviarNotificacionPush] ⚠️ Timeout, cerrando canal')
          supabase.removeChannel(channel)
          resolve() // Resolver sin error para no bloquear el flujo
        }
      }, 5000)
    })
    
  } catch (pushErr: unknown) {
    const pushMsg = pushErr instanceof Error ? pushErr.message : String(pushErr)
    console.error('[enviarNotificacionPush] ❌ Error al enviar push:', pushMsg)
    // No lanzamos error - es no crítico
    throw pushErr // Pero lo relanzamos para que se vea en los logs
  }
}

// util: Uint8Array → base64 (para logo inline)
function u8ToBase64(u8: Uint8Array) {
  let bin = ''
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i])
  return btoa(bin)
}

// Paleta de colores (mismo patrón que otras funciones)
const BRAND_PRIMARY = Deno.env.get('BRAND_PRIMARY') ?? '#7A1E1E'
const BRAND_BG = Deno.env.get('BRAND_BG') ?? '#F8F4EE'
const BRAND_LOGO_URL = Deno.env.get('BRAND_LOGO_URL') ?? ''

function makeHtmlFactura(facturaData: FacturaData, pdfUrl: string, logoUrl?: string): string {
  const nombreCompleto = `${facturaData.datos_cliente.nombres} ${facturaData.datos_cliente.apellidos}`.trim()
  
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Tu factura de El Tridente de la Gloria</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body { background:#0f0f0f !important; }
      .card { background:#181818 !important; color:#eee !important; }
      .muted { color:#bdbdbd !important; }
      .head { background:${BRAND_PRIMARY} !important; }
      a { color:#8ab4f8 !important; }
    }
    img { border:0; outline:none; text-decoration:none; display:block; }
    table { border-collapse:collapse; }
  </style>
</head>
<body style="margin:0; padding:0; background:#f7f7f7; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7; padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0"
             class="card"
             style="width:600px; max-width:100%; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.06);">
        <tr>
          <td class="head" style="background:${BRAND_PRIMARY}; padding:18px 24px; text-align:center;">
            ${
              logoUrl
                ? `<img src="${logoUrl.includes('cid:') ? logoUrl : `cid:brand-logo`}" alt="El Tridente de la Gloria" style="height:56px; max-width:100%; object-fit:contain; margin:0 auto; border-radius:6px; background:#ffffff; padding:6px;" />`
                : `<div style="color:#fff; font-weight:700; font-size:18px; letter-spacing:.3px;">El Tridente de la Gloria</div>`
            }
          </td>
        </tr>
        <tr>
          <td style="padding:22px 24px; background:${BRAND_BG};">
            <h1 style="margin:0 0 8px; font-size:20px; line-height:1.35; color:#222;">¡Gracias por tu visita${nombreCompleto ? `, ${nombreCompleto}` : ''}!</h1>
            <p style="margin:0 0 12px; color:#333;">Tu factura está lista para descargar.</p>
            <div style="text-align:center; margin:20px 0;">
              <a href="${pdfUrl}" style="display:inline-block; background:${BRAND_PRIMARY}; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600;">Descargar Factura</a>
            </div>
            <div style="margin:16px 0; padding:12px; background:#ffffff; border-radius:8px; border-left:4px solid ${BRAND_PRIMARY};">
              <div style="font-size:14px; color:#333;">
                <strong>Total:</strong> $${facturaData.total_final.toFixed(2)}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px; background:#ffffff; text-align:center;">
            <div class="muted" style="font-size:12px; color:#777;">
              Mensaje automático de <strong>El Tridente de la Gloria</strong>.
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function enviarEmailFactura(facturaData: FacturaData, pdfUrl: string, supabase: any): Promise<boolean> {
  try {
    console.log('[enviarEmailFactura] Iniciando envío de email...')
    
    const apiKey = Deno.env.get('SENDGRID_API_KEY')
    const fromEmail = Deno.env.get('SENDGRID_FROM') || Deno.env.get('FROM_EMAIL')
    
    if (!apiKey) {
      console.error('[enviarEmailFactura] ❌ SENDGRID_API_KEY no está configurado como secret')
      return false
    }

    if (!fromEmail) {
      console.error('[enviarEmailFactura] ❌ SENDGRID_FROM o FROM_EMAIL no está configurado como secret')
      return false
    }

    // Obtener URL del logo: primero del secret, luego del bucket de Supabase
    let brandLogoUrl: string | undefined = BRAND_LOGO_URL || undefined
    if (!brandLogoUrl) {
      console.log('[enviarEmailFactura] BRAND_LOGO_URL no configurado, usando logo del bucket')
      try {
        const { data: logoData } = supabase.storage
          .from('imagenes')
          .getPublicUrl('brand.png')
        brandLogoUrl = logoData?.publicUrl || undefined
        console.log('[enviarEmailFactura] Logo del bucket:', brandLogoUrl)
      } catch (logoError) {
        console.warn('[enviarEmailFactura] No se pudo obtener logo del bucket:', logoError)
        brandLogoUrl = undefined
      }
    }

    console.log('[enviarEmailFactura] Secrets configurados correctamente')

    const to = facturaData.datos_cliente.email
    if (!to) {
      console.warn('[enviarEmailFactura] ⚠️ Email de cliente vacío, no se envía factura')
      return false
    }

    console.log('[enviarEmailFactura] Enviando a:', to, 'Desde:', fromEmail)

    const subject = 'Tu factura de El Tridente de la Gloria'
    
    // Generar HTML
    let html = makeHtmlFactura(facturaData, pdfUrl, brandLogoUrl)
    
    // Texto plano para clientes que no soporten HTML
    const text = `¡Gracias por tu visita${facturaData.datos_cliente.nombres ? `, ${facturaData.datos_cliente.nombres}` : ''}!

Tu factura de El Tridente de la Gloria está lista.

Total: $${facturaData.total_final.toFixed(2)}

Descargá tu factura desde: ${pdfUrl}

— El Tridente de la Gloria`

    // Adjuntar logo inline (CID) si hay URL pública (mismo patrón que otras funciones)
    let attachments: Array<{
      filename: string
      type: string
      content: string
      disposition: 'inline'
      content_id: string
    }> | undefined

    if (brandLogoUrl && !brandLogoUrl.includes('cid:')) {
      try {
        const resp = await fetch(brandLogoUrl)
        if (resp.ok) {
          const mime = resp.headers.get('content-type') ?? 'image/png'
          const u8 = new Uint8Array(await resp.arrayBuffer())
          const base64 = u8ToBase64(u8)

          // Reemplazar src por el CID
          html = html.replaceAll(brandLogoUrl, 'cid:brand-logo')

          attachments = [{
            filename: 'logo',
            type: mime,
            content: base64,
            disposition: 'inline',
            content_id: 'brand-logo',
          }]
          console.log('[enviarEmailFactura] Logo adjuntado como inline attachment')
        }
      } catch {
        // Si falla, no rompemos el envío; quedará la URL en el HTML como fallback
        console.warn('[enviarEmailFactura] No se pudo adjuntar logo inline, usando URL')
      }
    }

    const payload: Record<string, unknown> = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'El Tridente de la Gloria' },
      reply_to: { email: fromEmail, name: 'El Tridente de la Gloria' },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html }
      ],
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false }
      }
    }

    if (attachments) (payload as any).attachments = attachments

    console.log('[enviarEmailFactura] Llamando a SendGrid API...')
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('[enviarEmailFactura] ❌ SendGrid error:', res.status, txt)
      
      // Si es 401, el API key es inválido o no está configurado
      if (res.status === 401) {
        console.error('[enviarEmailFactura] ❌ Error 401: SENDGRID_API_KEY inválido o faltante')
      }
      
      return false
    }

    console.log('[enviarEmailFactura] ✅ Email enviado exitosamente')
    return true
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[enviarEmailFactura] ❌ Error inesperado:', msg)
    return false
  }
}

