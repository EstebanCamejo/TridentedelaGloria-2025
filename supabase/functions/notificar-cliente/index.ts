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
function u8ToBase64(u8) {
  let bin = "";
  for(let i = 0; i < u8.length; i++)bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}
// util: formatear fecha para mostrar
function formatearFecha(fecha) {
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
function makeHtml(nombres, apellidos, estado, tipo, datosReserva) {
  const esReserva = tipo === "reserva";
  // Colores de fondo dinámicos según el estado
  const CONFIRM_BG_COLOR = "#D4EDDA"; // Verde claro para confirmación/aprobación
  const REJECT_BG_COLOR = "#F8D7DA"; // Rojo claro para rechazo
  const PENDING_BG_COLOR = BRAND_BG; // Crema para pendiente/en revisión
  let bodyBgColor = PENDING_BG_COLOR;
  if (estado === "confirmada" || estado === "aprobado") {
    bodyBgColor = CONFIRM_BG_COLOR;
  } else if (estado === "rechazado") {
    bodyBgColor = REJECT_BG_COLOR;
  }
  const titulo = esReserva ? estado === "confirmada" ? "✅ ¡Reserva Confirmada! – El Tridente de la Gloria" : estado === "rechazada" ? "❌ Reserva Rechazada – El Tridente de la Gloria" : "⏳ Reserva en Revisión – El Tridente de la Gloria" : estado === "aprobado" ? "✅ Registro Aprobado – El Tridente de la Gloria" : estado === "rechazado" ? "❌ Registro Rechazado – El Tridente de la Gloria" : "⏳ Registro en Revisión – El Tridente de la Gloria";
  const lead = esReserva ? estado === "confirmada" ? "🎉 ¡Excelente noticia! Tu reserva ha sido confirmada y estamos preparando todo para recibirte." : estado === "rechazada" ? "Lamentamos informarte que tu reserva no pudo ser confirmada en esta ocasión." : "Tu reserva está siendo revisada por nuestro equipo. Te notificaremos pronto." : estado === "aprobado" ? "Tu cuenta fue aprobada. Ya podés ingresar a la app con tu correo y contraseña." : estado === "rechazado" ? "Tu registro fue rechazado. Si creés que es un error, respondé este email." : "Tu registro está siendo revisado. Te avisaremos cuando haya novedades.";
  const nombreCompleto = `${nombres} ${apellidos}`.trim();
  // Preheader para inbox (oculto)
  const preheader = esReserva ? estado === "confirmada" ? "¡Tu reserva está confirmada! Esperamos verte pronto." : estado === "rechazada" ? "Tu reserva fue rechazada. Consulta el motivo en el email." : "Estamos revisando tu reserva." : estado === "aprobado" ? "Ya podés ingresar a la app con tu correo y contraseña." : estado === "rechazado" ? "Si creés que es un error, respondé este email." : "Estamos revisando tu registro.";
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${titulo}</title>
  <style>
    /* ---- DARK MODE (cuando el cliente lo soporte) ---- */
    @media (prefers-color-scheme: dark) {
      body      { background:#0f0f0f !important; }
      .card     { background:#181818 !important; color:#eee !important; }
      .muted    { color:#bdbdbd !important; }
      .head     { background:${BRAND_PRIMARY} !important; }
      a         { color:#8ab4f8 !important; }
    }
    /* Reseteos mínimos compatibles con emails */
    img { border:0; outline:none; text-decoration:none; display:block; }
    table { border-collapse:collapse; }
  </style>
</head>
<body style="margin:0; padding:0; background:${bodyBgColor}; font-family:Arial, Helvetica, sans-serif;">

  <!-- PREHEADER (oculto visualmente, útil en vista previa del inbox) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bodyBgColor}; padding:24px 0;">
    <tr>
      <td align="center">
        <!-- CARD -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
               class="card"
               style="width:600px; max-width:100%; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.06);">

          <!-- HEADER -->
          <tr>
            <td class="head" style="background:${BRAND_PRIMARY}; padding:18px 24px; text-align:center;">
              ${BRAND_LOGO_URL ? `<img src="${BRAND_LOGO_URL}" alt="El Tridente de la Gloria" style="height:56px; max-width:100%; object-fit:contain; margin:0 auto; border-radius:6px; background:#ffffff; padding:6px;" />` : `<div style="color:#fff; font-weight:700; font-size:18px; letter-spacing:.3px;">El Tridente de la Gloria</div>`}
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:22px 24px; background:${BRAND_BG};">
              <h1 style="margin:0 0 8px; font-size:20px; line-height:1.35; color:#222;">${titulo}</h1>
              ${nombreCompleto ? `<div style="margin:0 0 10px; color:#222; opacity:.9;">Hola ${nombreCompleto},</div>` : ``}
              <p style="margin:0 0 12px; color:#333;">${lead}</p>
              
              ${esReserva && datosReserva ? `
                <div style="background:#ffffff; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid ${estado === "confirmada" ? "#28a745" : estado === "rechazada" ? "#dc3545" : BRAND_PRIMARY};">
                  <h3 style="margin:0 0 12px; font-size:16px; color:#222;">Detalles de tu reserva:</h3>
                  <div style="margin:0 0 8px; color:#333;">
                    <strong>📅 Fecha:</strong> ${formatearFecha(datosReserva.fecha)}
                  </div>
                  <div style="margin:0 0 8px; color:#333;">
                    <strong>🕐 Hora:</strong> ${datosReserva.hora}
                  </div>
                  <div style="margin:0 0 8px; color:#333;">
                    <strong>👥 Comensales:</strong> ${datosReserva.cantidad_comensales} persona${datosReserva.cantidad_comensales > 1 ? 's' : ''}
                  </div>
                  ${datosReserva.numero_mesa ? `
                    <div style="margin:0 0 8px; color:#333;">
                      <strong>🪑 Mesa asignada:</strong> Mesa N° ${datosReserva.numero_mesa}
                    </div>
                  ` : ''}
                  ${datosReserva.nota ? `
                    <div style="margin:0 0 8px; color:#333;">
                      <strong>📝 Nota:</strong> ${datosReserva.nota}
                    </div>
                  ` : ''}
                  ${estado === "rechazada" && datosReserva.motivo_rechazo ? `
                    <div style="margin:12px 0 0; padding:12px; background:#fff5f5; border-radius:6px; border-left:3px solid #e53e3e;">
                      <strong style="color:#e53e3e;">Motivo del rechazo:</strong>
                      <div style="margin:4px 0 0; color:#333;">${datosReserva.motivo_rechazo}</div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              
              ${estado === "aprobado" && !esReserva ? `<p style="margin:0; color:#333;">Si tenés algún problema para entrar, respondé este mensaje.</p>` : estado === "confirmada" && esReserva ? `<p style="margin:0; color:#333;">Si necesitás hacer algún cambio o cancelar tu reserva, respondé este mensaje.</p>` : estado === "rechazada" && esReserva ? `<p style="margin:0; color:#333;">Si creés que hay un error o querés hacer una nueva reserva, respondé este mensaje.</p>` : ``}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:12px 24px 20px; background:#ffffff; text-align:center;">
              <div class="muted" style="font-size:12px; color:#777;">
                Mensaje automático de <strong>El Tridente de la Gloria</strong>.
              </div>
            </td>
          </tr>

        </table>
        <!-- /CARD -->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req)=>{
  // Orígenes permitidos en dev y app empaquetada
  const ALLOWED_ORIGINS = new Set([
    'http://localhost:4200',
    'http://localhost:8100',
    'capacitor://localhost',
    'http://localhost' // por si algún entorno usa este
  ]);
  function buildCorsHeaders(req) {
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
  } catch  {
    return new Response(JSON.stringify({
      ok: false,
      error: "Bad JSON"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
  const { email, nombres, apellidos, estado, tipo, datosReserva } = body;
  // Secrets
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM") || "eltridentedelagloria@gmail.com";
  if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Missing SENDGRID_API_KEY or SENDGRID_FROM"
    }), {
      status: 500,
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
  const payload = {
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
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(()=>"");
      return new Response(JSON.stringify({
        ok: false,
        status: resp.status,
        detail
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    return new Response(JSON.stringify({
      ok: true
    }), {
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: String(err)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});
