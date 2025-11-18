// supabase/functions/notificar-cliente/index.ts
// CORS (en prod podés restringir el Origin)
// const corsHeaders = {
//   "Access-Control-Allow-Origin": "http://localhost:8100",
//   "Access-Control-Allow-Headers":
//     "authorization, x-client-info, apikey, content-type",
//   "Access-Control-Allow-Methods": "POST, OPTIONS",
// };
// Paleta + Logo (podés moverlos a secrets si querés)
const BRAND_PRIMARY = Deno.env.get("BRAND_PRIMARY") ?? "#7A1E1E"; // bordó
const BRAND_BG = Deno.env.get("BRAND_BG") ?? "#F8F4EE"; // crema
const BRAND_LOGO_URL = Deno.env.get("BRAND_LOGO_URL") ?? ""; // URL pública (opcional)
//const BRAND_DEEP_LINK = Deno.env.get("BRAND_DEEP_LINK") ?? "tridentegloria://open";
//const BRAND_APP_URL = Deno.env.get("BRAND_APP_URL") ?? "http://localhost:8100";
// util: Uint8Array → base64
function u8ToBase64(u8: Uint8Array) {
  let bin = "";
  for(let i = 0; i < u8.length; i++)bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}
// util: formatear fecha para mostrar
function formatearFecha(fecha: string) {
  try {
    const [year, month, day] = fecha.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return fecha;
  }
}
function makeHtml(nombres: string, apellidos: string, estado: string, tipo: string, datosReserva: any) {
  const esReserva = tipo === "reserva";
  const nombreCompleto = `${nombres} ${apellidos}`.trim();
  
  // ===== DISEÑOS RECOMENDADOS =====
  // Verificación (pendiente): Opción B - Profesional con Gradiente Azul
  // Rechazo: Opción B - Empático y Profesional
  // Aceptación: Opción A - Celebración con Verde
  
  let bodyBgColor, headerColor, accentColor, textColor, icono, titulo, lead, preheader, badge, borderColor;
  let fontFamily = "'Segoe UI', Arial, sans-serif";
  
  if (estado === "confirmada" || estado === "aprobado") {
    // ACEPTACIÓN - Opción A: Celebración con Verde
    bodyBgColor = "#E8F5E9"; // Verde muy claro
    headerColor = "#4CAF50"; // Verde éxito
    accentColor = "#66BB6A"; // Verde brillante
    textColor = "#1B5E20"; // Verde muy oscuro
    icono = "✅";
    titulo = esReserva ? "¡Reserva Confirmada!" : "¡Registro Aprobado!";
    lead = esReserva ? "🎉 ¡Excelente noticia! Tu reserva ha sido confirmada y estamos preparando todo para recibirte." : "🎉 ¡Bienvenido! Tu cuenta fue aprobada. Ya podés ingresar a la app con tu correo y contraseña.";
    preheader = esReserva ? "¡Tu reserva está confirmada! Esperamos verte pronto." : "Ya podés ingresar a la app con tu correo y contraseña.";
    badge = "APROBADO";
    borderColor = "#4CAF50";
    fontFamily = "Arial, Helvetica, sans-serif";
  } else if (estado === "rechazada" || estado === "rechazado") {
    // RECHAZO - Opción B: Empático y Profesional
    bodyBgColor = "#FDF2F2"; // Rosa muy claro
    headerColor = "#E74C3C"; // Rojo suave
    accentColor = "#C0392B"; // Rojo vino
    textColor = "#5D4037"; // Marrón oscuro
    icono = "🙏";
    titulo = esReserva ? "Reserva No Confirmada" : "Registro No Aprobado";
    lead = esReserva ? "Lamentamos informarte que tu reserva no pudo ser confirmada en esta ocasión. Entendemos tu decepción y estamos aquí para ayudarte." : "Lamentamos informarte que tu registro no pudo ser aprobado. Si creés que es un error, respondé este email y lo revisaremos.";
    preheader = esReserva ? "Tu reserva fue rechazada. Consulta el motivo en el email." : "Si creés que es un error, respondé este email.";
    badge = "NO APROBADO";
    borderColor = "#E74C3C";
    fontFamily = "'Georgia', serif";
  } else {
    // VERIFICACIÓN - Opción B: Profesional con Gradiente Azul
    bodyBgColor = "#E8F4F8"; // Azul claro suave (inicio del gradiente)
    headerColor = "#4A90E2"; // Azul profesional
    accentColor = "#6BB6FF"; // Azul brillante
    textColor = "#2C3E50"; // Gris azulado oscuro
    icono = "📋";
    titulo = esReserva ? "Reserva en Revisión" : "Registro en Revisión";
    lead = esReserva ? "Tu reserva está siendo revisada por nuestro equipo. Te notificaremos pronto con una respuesta." : "Tu registro está siendo revisado por nuestro equipo. Te avisaremos cuando haya novedades.";
    preheader = esReserva ? "Estamos revisando tu reserva." : "Estamos revisando tu registro.";
    badge = "EN REVISIÓN";
    borderColor = "#4A90E2";
    fontFamily = "'Segoe UI', Arial, sans-serif";
  }
  
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${titulo} – El Tridente de la Gloria</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body { background:#0f0f0f !important; }
      .card { background:#181818 !important; color:#eee !important; }
      .muted { color:#bdbdbd !important; }
      .head { background:${headerColor} !important; }
      a { color:#8ab4f8 !important; }
    }
    img { border:0; outline:none; text-decoration:none; display:block; }
    table { border-collapse:collapse; }
  </style>
</head>
<body style="margin:0; padding:0; background:${bodyBgColor}; font-family:${fontFamily};">

  <!-- PREHEADER -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bodyBgColor}; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
               class="card"
               style="width:600px; max-width:100%; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.12); border-top:4px solid ${borderColor};">

          <!-- HEADER con Badge -->
          <tr>
            <td class="head" style="background:${headerColor}; padding:24px; text-align:center; position:relative;">
              ${BRAND_LOGO_URL ? `<img src="${BRAND_LOGO_URL}" alt="El Tridente de la Gloria" style="height:60px; max-width:100%; object-fit:contain; margin:0 auto 12px; border-radius:8px; background:#ffffff; padding:8px;" />` : `<div style="color:#fff; font-weight:700; font-size:20px; letter-spacing:.5px; margin-bottom:12px;">El Tridente de la Gloria</div>`}
              <div style="display:inline-block; background:rgba(255,255,255,0.25); color:#fff; padding:6px 16px; border-radius:20px; font-size:12px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase;">${badge}</div>
            </td>
          </tr>

          <!-- ICONO GRANDE -->
          <tr>
            <td style="padding:32px 24px 16px; background:#ffffff; text-align:center;">
              <div style="font-size:64px; line-height:1; margin-bottom:16px;">${icono}</div>
              <h1 style="margin:0 0 12px; font-size:${estado === "confirmada" || estado === "aprobado" ? "26px" : "24px"}; line-height:1.3; color:${textColor}; font-weight:${estado === "confirmada" || estado === "aprobado" ? "bold" : "600"};">
                ${titulo}
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:0 24px 24px; background:#ffffff;">
              ${nombreCompleto ? `<div style="margin:0 0 16px; color:${textColor}; font-size:16px; opacity:0.9;">Hola <strong>${nombreCompleto}</strong>,</div>` : ``}
              <p style="margin:0 0 20px; color:${textColor}; font-size:16px; line-height:1.6;">${lead}</p>
              
              ${esReserva && datosReserva ? `
                <div style="background:${estado === "rechazada" ? "#FFEBEE" : estado === "confirmada" ? "#E8F5E9" : "#E3F2FD"}; border-radius:12px; padding:20px; margin:24px 0; border-left:5px solid ${borderColor}; box-shadow:0 2px 8px rgba(0,0,0,.08);">
                  <h3 style="margin:0 0 16px; font-size:18px; color:${textColor}; font-weight:600;">Detalles de tu reserva:</h3>
                  <div style="margin:0 0 12px; color:${textColor}; font-size:15px;">
                    <strong style="color:${accentColor};">📅 Fecha:</strong> ${formatearFecha(datosReserva.fecha)}
                  </div>
                  <div style="margin:0 0 12px; color:${textColor}; font-size:15px;">
                    <strong style="color:${accentColor};">🕐 Hora:</strong> ${datosReserva.hora}
                  </div>
                  <div style="margin:0 0 12px; color:${textColor}; font-size:15px;">
                    <strong style="color:${accentColor};">👥 Comensales:</strong> ${datosReserva.cantidad_comensales} persona${datosReserva.cantidad_comensales > 1 ? 's' : ''}
                  </div>
                  ${datosReserva.numero_mesa ? `
                    <div style="margin:0 0 12px; color:${textColor}; font-size:15px;">
                      <strong style="color:${accentColor};">🪑 Mesa asignada:</strong> Mesa N° ${datosReserva.numero_mesa}
                    </div>
                  ` : ''}
                  ${datosReserva.nota ? `
                    <div style="margin:0 0 12px; color:${textColor}; font-size:15px;">
                      <strong style="color:${accentColor};">📝 Nota:</strong> ${datosReserva.nota}
                    </div>
                  ` : ''}
                  ${estado === "rechazada" && datosReserva.motivo_rechazo ? `
                    <div style="margin:16px 0 0; padding:16px; background:#FFF3E0; border-radius:8px; border-left:4px solid ${accentColor};">
                      <strong style="color:${accentColor}; font-size:15px;">Motivo del rechazo:</strong>
                      <div style="margin:8px 0 0; color:${textColor}; font-size:14px; line-height:1.5;">${datosReserva.motivo_rechazo}</div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              
              ${estado === "aprobado" && !esReserva ? `
                <div style="margin:24px 0; padding:16px; background:rgba(102, 187, 106, 0.1); border-radius:8px; text-align:center;">
                  <p style="margin:0; color:${textColor}; font-size:14px;">Si tenés algún problema para entrar, respondé este mensaje.</p>
                </div>
              ` : estado === "confirmada" && esReserva ? `
                <div style="margin:24px 0; padding:16px; background:rgba(102, 187, 106, 0.1); border-radius:8px; text-align:center;">
                  <p style="margin:0; color:${textColor}; font-size:14px;">Si necesitás hacer algún cambio o cancelar tu reserva, respondé este mensaje.</p>
                </div>
              ` : estado === "rechazada" && esReserva ? `
                <div style="margin:24px 0; padding:16px; background:#FFEBEE; border-radius:8px; text-align:center;">
                  <p style="margin:0; color:${textColor}; font-size:14px;">Si creés que hay un error o querés hacer una nueva reserva, respondé este mensaje.</p>
                </div>
              ` : estado === "rechazado" && !esReserva ? `
                <div style="margin:24px 0; padding:16px; background:#FFEBEE; border-radius:8px; text-align:center;">
                  <p style="margin:0; color:${textColor}; font-size:14px;">Estamos a tu disposición para cualquier consulta o aclaración.</p>
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 24px; background:#ffffff; text-align:center; border-top:1px solid #E0E0E0;">
              <div class="muted" style="font-size:12px; color:#999; line-height:1.5;">
                Mensaje automático de <strong style="color:${textColor};">El Tridente de la Gloria</strong>.<br>
                <span style="color:#BBB; font-size:11px;">Este es un email automático, por favor no respondas directamente.</span>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request)=>{
  // Orígenes permitidos en dev y app empaquetada
  const ALLOWED_ORIGINS = new Set([
    'http://localhost:4200',
    'http://localhost:8100',
    'capacitor://localhost',
    'http://localhost' // por si algún entorno usa este
  ]);
  function buildCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') ?? '';
    return {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : '*',
      'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
  }
  const cors = buildCorsHeaders(req);
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors
    });
  }
  // Solo POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      ok: false,
      error: "Only POST"
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
  // Body
  let body;
  try {
    body = await req.json();
    console.log('📦 Body recibido:', JSON.stringify(body));
  } catch (e) {
    console.error('❌ Error parseando JSON:', e);
    return new Response(JSON.stringify({
      ok: false,
      error: "Bad JSON",
      detail: String(e)
    }), {
      status: 200, // Cambiar a 200 para que el cliente pueda leer el error
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
  
  // Validar que el body tenga los campos requeridos
  if (!body || typeof body !== 'object') {
    console.error('❌ Body inválido o vacío');
    return new Response(JSON.stringify({
      ok: false,
      error: "Invalid body",
      detail: "Body must be a valid object"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
  
  const { email, nombres, apellidos, estado, tipo, datosReserva } = body;
  
  // Validar campos requeridos
  if (!email || !estado) {
    console.error('❌ Faltan campos requeridos:', { email: !!email, estado: !!estado });
    return new Response(JSON.stringify({
      ok: false,
      error: "Missing required fields",
      detail: `Missing: ${!email ? 'email' : ''} ${!estado ? 'estado' : ''}`.trim()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
  // Secrets - SendGrid
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM") || "eltridentedelagloria@gmail.com";
  
  console.log('🔑 Verificando configuración SendGrid...', {
    hasApiKey: !!SENDGRID_API_KEY,
    apiKeyLength: SENDGRID_API_KEY?.length || 0,
    fromEmail: SENDGRID_FROM
  });
  
  if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
    console.error('❌ Faltan variables de entorno:', {
      missingApiKey: !SENDGRID_API_KEY,
      missingFrom: !SENDGRID_FROM
    });
    return new Response(JSON.stringify({
      ok: false,
      error: "Missing SENDGRID_API_KEY or SENDGRID_FROM"
    }), {
      status: 200, // Cambiar a 200 para que el cliente pueda leer el error
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
  // Debug: Log para verificar los parámetros recibidos
  console.log('📧 Parámetros recibidos:', {
    email,
    nombres,
    apellidos,
    estado,
    tipo,
    datosReserva
  });
  const esReserva = tipo === "reserva";
  console.log('🔍 Es reserva?', esReserva, 'Tipo:', tipo);
  const subject = esReserva ? estado === "confirmada" ? "✅ Reserva Confirmada – El Tridente de la Gloria" : estado === "rechazada" ? "❌ Reserva Rechazada – El Tridente de la Gloria" : "⏳ Reserva en Revisión – El Tridente de la Gloria" : estado === "aprobado" ? "✅ Registro Aprobado – El Tridente de la Gloria" : estado === "rechazado" ? "❌ Registro Rechazado – El Tridente de la Gloria" : "⏳ Registro en Revisión – El Tridente de la Gloria";
  let html = makeHtml(nombres, apellidos, estado, tipo, datosReserva);
  let text = `Hola ${nombres} ${apellidos},

${esReserva ? 'Tu reserva' : 'Tu estado actual'} es: ${estado}.

${esReserva ? estado === "confirmada" ? "🎉 ¡Excelente noticia! Tu reserva ha sido confirmada y estamos preparando todo para recibirte." : estado === "rechazada" ? "Lamentamos informarte que tu reserva no pudo ser confirmada en esta ocasión." : "Tu reserva está siendo revisada por nuestro equipo. Te notificaremos pronto." : estado === "aprobado" ? "Ya podés ingresar a la app con tu correo y contraseña." : estado === "rechazado" ? "Tu registro fue rechazado. Si creés que es un error, respondé este email." : "Tu registro está siendo revisado. Te avisaremos cuando haya novedades."}`;
  if (esReserva && datosReserva) {
    text += `

Detalles de tu reserva:
- Fecha: ${formatearFecha(datosReserva.fecha)}
- Hora: ${datosReserva.hora}
- Comensales: ${datosReserva.cantidad_comensales} persona${datosReserva.cantidad_comensales > 1 ? 's' : ''}`;
    
    if (datosReserva.numero_mesa) {
      text += `\n- Mesa asignada: Mesa N° ${datosReserva.numero_mesa}`;
    }
    
    if (datosReserva.nota) {
      text += `\n- Nota: ${datosReserva.nota}`;
    }
    
    if (estado === "rechazada" && datosReserva.motivo_rechazo) {
      text += `\n\nMotivo del rechazo: ${datosReserva.motivo_rechazo}`;
    }
  }

  text += `\n\n— El Tridente de la Gloria`;
  // Adjuntar logo inline (CID) si hay URL pública
  let attachments;
  if (BRAND_LOGO_URL) {
    try {
      const resp = await fetch(BRAND_LOGO_URL);
      if (resp.ok) {
        const mime = resp.headers.get("content-type") ?? "image/png";
        const u8 = new Uint8Array(await resp.arrayBuffer());
        const base64 = u8ToBase64(u8);
        // Reemplazar src por el CID
        html = html.replaceAll(BRAND_LOGO_URL, "cid:brand-logo");
        attachments = [
          {
            filename: "logo",
            type: mime,
            content: base64,
            disposition: "inline",
            content_id: "brand-logo"
          }
        ];
      }
    } catch  {
    // Si falla, no rompemos el envío; quedará la URL en el HTML como fallback
    }
  }
  
  // Payload SendGrid
  const payload: any = {
    personalizations: [
      {
        to: [
          {
            email
          }
        ]
      }
    ],
    from: {
      email: SENDGRID_FROM,
      name: "El Tridente de la Gloria"
    },
    reply_to: {
      email: SENDGRID_FROM,
      name: "El Tridente de la Gloria"
    },
    subject,
    content: [
      {
        type: "text/plain",
        value: text
      },
      {
        type: "text/html",
        value: html
      }
    ],
    tracking_settings: {
      click_tracking: {
        enable: false,
        enable_text: false
      },
      open_tracking: {
        enable: false
      }
    }
  };
  if (attachments) payload.attachments = attachments;
  
  try {
    console.log('📤 Enviando email a SendGrid...', { email, estado, subject });
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const responseText = await resp.text().catch(() => "");
    console.log('📥 Respuesta de SendGrid:', { status: resp.status, statusText: resp.statusText, body: responseText });
    
    if (!resp.ok) {
      // Intentar parsear el error de SendGrid si es JSON
      let errorDetail = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.errors && Array.isArray(errorJson.errors)) {
          errorDetail = errorJson.errors.map((e: any) => e.message || e.field || String(e)).join('; ');
        } else if (errorJson.message) {
          errorDetail = errorJson.message;
        }
      } catch {
        // Si no es JSON, usar el texto tal cual
      }
      
      console.error('❌ Error de SendGrid:', { status: resp.status, detail: errorDetail });
      
      return new Response(JSON.stringify({
        ok: false,
        status: resp.status,
        detail: `SendGrid error (${resp.status}): ${errorDetail}`
      }), {
        status: 200, // 🆕 Cambiar a 200 para que el cliente pueda leer el body
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    
    console.log('✅ Email enviado exitosamente');
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (err) {
    console.error('❌ Error al enviar email:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: String(err)
    }), {
      status: 200, // 🆕 Cambiar a 200 para que el cliente pueda leer el body
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});
