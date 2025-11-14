// supabase/functions/register-anon/index.ts
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Solo POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Only POST allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  try {
    const body = await req.json() as {
      email: string
      password: string
      nombre: string
      foto_url?: string | null
    }

    const { email, password, nombre, foto_url } = body

    if (!email || !password || !nombre) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Faltan campos requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing Supabase configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('[register-anon] Creando usuario anónimo en Auth...')
    
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirmar email para anónimos
    })

    if (authError) {
      console.error('[register-anon] Error al crear usuario en Auth:', authError)
      return new Response(
        JSON.stringify({ ok: false, error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    if (!authData?.user?.id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No se pudo crear el usuario en Auth' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const authId = authData.user.id
    console.log('[register-anon] Usuario creado en Auth con ID:', authId)
    console.log('[register-anon] Foto URL recibida:', foto_url)

    // 2. Insertar en tabla usuarios (clientes anónimos se aprueban automáticamente)
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert({
        auth_id: authId,
        email: email.trim().toLowerCase(),
        nombres: nombre,
        apellidos: null,
        dni: null,
        foto_url: foto_url || null, // ✅ Guardar foto_url
        perfil: 'clienteAnon',
        estado: 'aprobado', // Clientes anónimos se aprueban automáticamente
      })
      .select('id, estado, foto_url')
      .single()

    if (usuarioError) {
      console.error('[register-anon] Error al insertar en usuarios:', usuarioError)
      // Si falla la inserción, intentar eliminar el usuario de Auth
      await supabase.auth.admin.deleteUser(authId).catch(() => {})
      return new Response(
        JSON.stringify({ ok: false, error: usuarioError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log('[register-anon] ✅ Usuario anónimo creado exitosamente:', usuarioData)
    console.log('[register-anon] ✅ Foto URL guardada en BD:', usuarioData?.foto_url)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        estado: usuarioData?.estado || 'aprobado',
        usuario_id: usuarioData?.id,
        foto_url: usuarioData?.foto_url
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[register-anon] Error:', msg)
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})

