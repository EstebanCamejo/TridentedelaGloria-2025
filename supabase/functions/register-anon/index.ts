// supabase/functions/register-anon/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      photoBase64?: string | null
    }

    console.log('[register-anon] 📥 Body recibido:', {
      email: body.email,
      nombre: body.nombre,
      tienePhotoBase64: !!body.photoBase64,
      photoBase64Length: body.photoBase64?.length || 0
    })

    const { email, password, nombre, photoBase64 } = body

    if (!email || !password || !nombre) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Faltan campos requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log('[register-anon] ✅ Validación de campos OK')
    console.log('[register-anon] 📸 photoBase64 recibido?', !!photoBase64, 'Longitud:', photoBase64?.length || 0)

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
      console.error('[register-anon] Código del error:', authError.status)
      console.error('[register-anon] Mensaje del error:', authError.message)
      
      // Manejar errores específicos
      const errorMsg = authError.message?.toLowerCase() || ''
      if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('user already')) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Ya existe un usuario con este correo electrónico' }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
      
      return new Response(
        JSON.stringify({ ok: false, error: authError.message || 'Error al crear el usuario' }),
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

    // 2. Subir foto al storage si existe (usando service role key que tiene permisos)
    let foto_url: string | null = null
    if (photoBase64 && photoBase64.trim() !== '') {
      try {
        console.log('[register-anon] 📸 Iniciando subida de foto al storage...')
        console.log('[register-anon] 📸 Base64 recibido, longitud:', photoBase64.trim().length)
        
        // Convertir base64 a Uint8Array
        const base64Data = photoBase64.trim()
        let binaryString: string
        try {
          binaryString = atob(base64Data)
        } catch (e) {
          console.error('[register-anon] ❌ Error al decodificar base64:', e)
          throw new Error('Base64 inválido')
        }
        
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        console.log('[register-anon] 📸 Bytes convertidos, tamaño:', bytes.length)

        // Generar nombre de archivo único con extensión correcta
        const safeEmail = (email || 'anon').replace(/[^a-z0-9@._-]/gi, '').toLowerCase()
        const randomId = Math.random().toString(16).slice(2, 8)
        const timestamp = Date.now()
        const fileName = `${timestamp}-${randomId}.jpeg`
        const filePath = `clientes/${safeEmail}/${fileName}`
        const bucket = 'avatars'

        console.log('[register-anon] 📸 Subiendo a:', { bucket, filePath, size: bytes.length, email: safeEmail })

        // Subir usando service role key (tiene todos los permisos)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, bytes, {
            upsert: false,
            contentType: 'image/jpeg',
            cacheControl: '3600'
          })

        if (uploadError) {
          console.error('[register-anon] ❌ Error al subir foto:', uploadError)
          console.error('[register-anon] ❌ Detalles del error:', JSON.stringify(uploadError, null, 2))
          // No fallar el registro si la foto falla, solo continuar sin foto
        } else {
          console.log('[register-anon] ✅ Foto subida exitosamente, path:', uploadData?.path)
          
          // Obtener URL pública
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
          foto_url = urlData?.publicUrl || null
          
          if (!foto_url) {
            console.error('[register-anon] ❌ No se pudo obtener la URL pública')
          } else {
            console.log('[register-anon] ✅ URL pública generada:', foto_url)
          }
        }
      } catch (error: any) {
        console.error('[register-anon] ❌ Error al procesar foto:', error)
        console.error('[register-anon] ❌ Stack:', error?.stack)
        // Continuar sin foto
      }
    } else {
      console.log('[register-anon] ℹ️ No hay foto para subir (photoBase64 vacío o null)')
    }

    // 3. Insertar en tabla usuarios (clientes anónimos se aprueban automáticamente)
    const insertData: any = {
      auth_id: authId,
      email: email.trim().toLowerCase(),
      nombres: nombre,
      apellidos: null,
      dni: null,
      foto_url: foto_url || null,
      perfil: 'clienteAnon',
      estado: 'aprobado', // Clientes anónimos se aprueban automáticamente
    }

    console.log('[register-anon] 📝 Datos a insertar:', {
      email: insertData.email,
      nombres: insertData.nombres,
      foto_url: insertData.foto_url || 'NULL',
      perfil: insertData.perfil,
      estado: insertData.estado
    })
    
    console.log('[register-anon] 🔍 Insertando en tabla usuarios...')
    console.log('[register-anon] 🔍 insertData completo:', JSON.stringify(insertData, null, 2))
    console.log('[register-anon] 🔍 foto_url que se va a insertar:', foto_url || 'NULL')
    
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert(insertData)
      .select('id, estado, foto_url, email, nombres, auth_id') // ✅ Incluir foto_url y auth_id en el select
      .single()

    if (usuarioError) {
      console.error('[register-anon] ❌ Error al insertar en usuarios:', usuarioError)
      console.error('[register-anon] ❌ Código del error:', usuarioError.code)
      console.error('[register-anon] ❌ Mensaje del error:', usuarioError.message)
      console.error('[register-anon] ❌ Detalles del error:', JSON.stringify(usuarioError, null, 2))
      // Si falla la inserción, intentar eliminar el usuario de Auth
      await supabase.auth.admin.deleteUser(authId).catch(() => {})
      return new Response(
        JSON.stringify({ ok: false, error: usuarioError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    console.log('[register-anon] 🔍 Respuesta del insert:', JSON.stringify(usuarioData, null, 2))
    console.log('[register-anon] 🔍 Tipo de usuarioData:', typeof usuarioData)
    console.log('[register-anon] 🔍 usuarioData?.foto_url:', usuarioData?.foto_url)
    console.log('[register-anon] 🔍 foto_url original:', foto_url)

    console.log('[register-anon] ✅ Usuario anónimo creado exitosamente')
    console.log('[register-anon] 📊 Datos del usuario insertado:', {
      id: usuarioData?.id,
      email: usuarioData?.email || email,
      estado: usuarioData?.estado,
      foto_url: usuarioData?.foto_url || 'NULL - NO SE GUARDÓ',
      foto_url_tipo: typeof usuarioData?.foto_url
    })
    
    // SIEMPRE verificar y actualizar foto_url si es necesario
    let fotoUrlFinal = usuarioData?.foto_url || null
    
    if (foto_url && fotoUrlFinal !== foto_url) {
      console.error('[register-anon] ⚠️⚠️⚠️ PROBLEMA: foto_url no coincide o no se guardó!')
      console.error('[register-anon] ⚠️ foto_url que intentamos guardar:', foto_url)
      console.error('[register-anon] ⚠️ foto_url que se guardó en el insert:', usuarioData?.foto_url)
      
      // Intentar actualizar manualmente con múltiples intentos
      console.log('[register-anon] 🔄 Intentando actualizar foto_url manualmente...')
      
      // Intento 1: Update directo
      const { data: updateData, error: updateError } = await supabase
        .from('usuarios')
        .update({ foto_url })
        .eq('id', usuarioData.id)
        .select('foto_url, id')
        .single()
      
      if (updateError) {
        console.error('[register-anon] ❌ Error al actualizar foto_url (intento 1):', updateError)
        console.error('[register-anon] ❌ Detalles:', JSON.stringify(updateError, null, 2))
        
        // Intento 2: Update usando auth_id como fallback
        console.log('[register-anon] 🔄 Intento 2: Actualizando usando auth_id...')
        const { data: updateData2, error: updateError2 } = await supabase
          .from('usuarios')
          .update({ foto_url })
          .eq('auth_id', authId)
          .select('foto_url, id')
          .single()
        
        if (updateError2) {
          console.error('[register-anon] ❌ Error al actualizar foto_url (intento 2):', updateError2)
        } else {
          console.log('[register-anon] ✅ foto_url actualizada manualmente (intento 2):', updateData2?.foto_url)
          fotoUrlFinal = updateData2?.foto_url || foto_url
        }
      } else {
        console.log('[register-anon] ✅ foto_url actualizada manualmente (intento 1):', updateData?.foto_url)
        fotoUrlFinal = updateData?.foto_url || foto_url
      }
    } else if (foto_url) {
      fotoUrlFinal = foto_url
      console.log('[register-anon] ✅ foto_url se guardó correctamente en el insert')
    }

    // Obtener el usuario completo para asegurar que tenemos la foto_url más reciente
    console.log('[register-anon] 🔍 Verificando foto_url final en la BD...')
    const { data: usuarioFinal, error: usuarioFinalError } = await supabase
      .from('usuarios')
      .select('foto_url, id, email')
      .eq('id', usuarioData.id)
      .single()
    
    if (usuarioFinalError) {
      console.error('[register-anon] ⚠️ Error al verificar usuario final:', usuarioFinalError)
    } else {
      console.log('[register-anon] 🔍 foto_url en BD después de update:', usuarioFinal?.foto_url)
      if (usuarioFinal?.foto_url) {
        fotoUrlFinal = usuarioFinal.foto_url
      }
    }
    
    // Si aún no tenemos foto_url, usar la que generamos
    if (!fotoUrlFinal && foto_url) {
      fotoUrlFinal = foto_url
      console.log('[register-anon] ⚠️ Usando foto_url generada como fallback')
    }
    
    console.log('[register-anon] 📤 Enviando respuesta al cliente:', {
      ok: true,
      estado: usuarioData?.estado || 'aprobado',
      usuario_id: usuarioData?.id,
      foto_url: fotoUrlFinal || 'NULL'
    })
    
    return new Response(
      JSON.stringify({ 
        ok: true, 
        estado: usuarioData?.estado || 'aprobado',
        usuario_id: usuarioData?.id,
        foto_url: fotoUrlFinal || null
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[register-anon] ❌ Error no manejado:', msg)
    console.error('[register-anon] ❌ Stack:', error instanceof Error ? error.stack : 'N/A')
    
    // Verificar si es un error de email duplicado
    const errorMsg = msg.toLowerCase()
    if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('user already')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Ya existe un usuario con este correo electrónico' }),
        { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
    
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})

