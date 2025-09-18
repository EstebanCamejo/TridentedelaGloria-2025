

// supabase/functions/notificar-cliente/index.ts

// CORS (en prod podés restringir el Origin)
// const corsHeaders = {
//   "Access-Control-Allow-Origin": "http://localhost:8100",
//   "Access-Control-Allow-Headers":
//     "authorization, x-client-info, apikey, content-type",
//   "Access-Control-Allow-Methods": "POST, OPTIONS",
// };

type Body = {
  email: string;
  nombres: string;
  apellidos: string;
  estado: "aprobado" | "rechazado" | "pendiente";
};

// Paleta + Logo (podés moverlos a secrets si querés)
const BRAND_PRIMARY  = Deno.env.get("BRAND_PRIMARY")   ?? "#7A1E1E"; // bordó
const BRAND_BG       = Deno.env.get("BRAND_BG")        ?? "#F8F4EE"; // crema
const BRAND_LOGO_URL = Deno.env.get("BRAND_LOGO_URL")  ?? "";        // URL pública (opcional)
//const BRAND_DEEP_LINK = Deno.env.get("BRAND_DEEP_LINK") ?? "tridentegloria://open";
//const BRAND_APP_URL = Deno.env.get("BRAND_APP_URL") ?? "http://localhost:8100";


// util: Uint8Array → base64
function u8ToBase64(u8: Uint8Array) {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}


// function makeHtml(nombres: string, apellidos: string, estado: Body["estado"]) {
//   const titulo =
//     estado === "aprobado"
//       ? "Registro aprobado – El Tridente de la Gloria"
//       : estado === "rechazado"
//       ? "Registro rechazado – El Tridente de la Gloria"
//       : "Registro en revisión – El Tridente de la Gloria";

//   const lead =
//     estado === "aprobado"
//       ? "Ya podés ingresar a la app con tu correo y contraseña."
//       : estado === "rechazado"
//       ? "Tu registro fue rechazado. Si creés que es un error, respondé este email."
//       : "Tu registro está siendo revisado. Te avisaremos cuando haya novedades.";

//   const saludo = `Hola ${nombres} ${apellidos},`;

//   return `<!doctype html>
// <html lang="es"><head>
//   <meta charset="utf-8"><meta name="viewport" content="width=device-width">
//   <title>${titulo}</title>
//   <style>
//     /* Dark mode (cuando el cliente lo soporte) */
//     @media (prefers-color-scheme: dark) {
//       .d-bg   { background: #0f0f0f !important; }
//       .d-card { background: #1a1a1a !important; color: #eee !important; }
//       .d-head { background: ${BRAND_PRIMARY} !important; }
//       .d-muted{ color:#bbb !important; }
//       .cta    { background: ${BRAND_PRIMARY} !important; color:#fff !important; }
//       a       { color:#8ab4f8 !important; }
//     }
//   </style>
// </head>
// <body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;" class="d-bg">
//   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7;padding:24px 0;">
//     <tr><td align="center">
//       <table role="presentation" width="600" cellspacing="0" cellpadding="0"
//              style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.04)" class="d-card">
//         <!-- Header -->
//         <tr>
//           <td style="background:${BRAND_PRIMARY};padding:16px 24px;text-align:center;" class="d-head">
//             ${
//               BRAND_LOGO_URL
//                 ? `<img src="${BRAND_LOGO_URL}" alt="El Tridente de la Gloria" style="max-height:64px;max-width:100%;object-fit:contain;border-radius:8px;background:#ffffff;padding:6px" />`
//                 : `<div style="color:#fff;font-weight:700;font-size:18px;letter-spacing:.3px">El Tridente de la Gloria</div>`
//             }
//           </td>
//         </tr>

//         <!-- Cuerpo -->
//         <tr><td style="padding:20px 24px;background:${BRAND_BG};" class="d-card">
//           <h1 style="margin:0 0 8px;font-size:20px;line-height:1.35;color:#222">${titulo}</h1>
//           <div style="opacity:.85;margin:0 0 14px;color:#222">${saludo}</div>
//           <div style="margin:0 0 16px;color:#333">${lead}</div>

//           <!-- CTA (deep link) -->
//           <div style="text-align:center;margin:16px 0 6px">
//             <a href="${BRAND_DEEP_LINK}"
//                style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600"
//                class="cta">
//               Abrir la app
//             </a>
//           </div>
//           <div style="text-align:center;font-size:12px;opacity:.8;margin-top:6px" class="d-muted">
//             Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
//             <span style="word-break:break-all;">${BRAND_APP_URL}</span>
//           </div>
//         </td></tr>

//         <!-- Pie -->
//         <tr><td style="padding:12px 24px 20px;background:#ffffff;text-align:center" class="d-card">
//           <div style="font-size:12px;color:#777" class="d-muted">
//             Mensaje automático de <strong>El Tridente de la Gloria</strong>.
//           </div>
//         </td></tr>
//       </table>
//     </td></tr>
//   </table>
// </body></html>`;
// }

function makeHtml(nombres: string, apellidos: string, estado: Body["estado"]) {
  const titulo =
    estado === "aprobado"
      ? "Registro aprobado – El Tridente de la Gloria"
      : estado === "rechazado"
      ? "Registro rechazado – El Tridente de la Gloria"
      : "Registro en revisión – El Tridente de la Gloria";

  const lead =
    estado === "aprobado"
      ? "Tu cuenta fue aprobada. Ya podés ingresar a la app con tu correo y contraseña."
      : estado === "rechazado"
      ? "Tu registro fue rechazado. Si creés que es un error, respondé este email."
      : "Tu registro está siendo revisado. Te avisaremos cuando haya novedades.";

  const nombreCompleto = `${nombres} ${apellidos}`.trim();

  // Preheader para inbox (oculto)
  const preheader = estado === "aprobado"
    ? "Ya podés ingresar a la app con tu correo y contraseña."
    : estado === "rechazado"
    ? "Si creés que es un error, respondé este email."
    : "Estamos revisando tu registro.";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${titulo}</title>
  <style>
    /* ---- DARK MODE (cuando el cliente lo soporta) ---- */
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
<body style="margin:0; padding:0; background:#f7f7f7; font-family:Arial, Helvetica, sans-serif;">

  <!-- PREHEADER (oculto visualmente, útil en vista previa del inbox) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7; padding:24px 0;">
    <tr>
      <td align="center">
        <!-- CARD -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
               class="card"
               style="width:600px; max-width:100%; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.06);">

          <!-- HEADER -->
          <tr>
            <td class="head" style="background:${BRAND_PRIMARY}; padding:18px 24px; text-align:center;">
              ${
                BRAND_LOGO_URL
                  ? `<img src="${BRAND_LOGO_URL}" alt="El Tridente de la Gloria" style="height:56px; max-width:100%; object-fit:contain; margin:0 auto; border-radius:6px; background:#ffffff; padding:6px;" />`
                  : `<div style="color:#fff; font-weight:700; font-size:18px; letter-spacing:.3px;">El Tridente de la Gloria</div>`
              }
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:22px 24px; background:${BRAND_BG};">
              <h1 style="margin:0 0 8px; font-size:20px; line-height:1.35; color:#222;">${titulo}</h1>
              ${nombreCompleto ? `<div style="margin:0 0 10px; color:#222; opacity:.9;">Hola ${nombreCompleto},</div>` : ``}
              <p style="margin:0 0 12px; color:#333;">${lead}</p>
              ${
                estado === "aprobado"
                  ? `<p style="margin:0; color:#333;">Si tenés algún problema para entrar, respondé este mensaje.</p>`
                  : ``
              }
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



Deno.serve(async (req: Request) => {

  // Orígenes permitidos en dev y app empaquetada
  const ALLOWED_ORIGINS = new Set([
    'http://localhost:4200', // Angular
    'http://localhost:8100', // Ionic
    'capacitor://localhost', // app Android/iOS con Capacitor
    'http://localhost'       // por si algún entorno usa este
  ]);

  function buildCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') ?? '';
    return {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : '*',
      'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
  }


  const cors = buildCorsHeaders(req);



  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  // Solo POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Only POST" }),
      { status: 405, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  // Body
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Bad JSON" }),
      { status: 400, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  const { email, nombres, apellidos, estado } = body;

  // Secrets
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM") || "eltridentedelagloria@gmail.com";
  if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing SENDGRID_API_KEY or SENDGRID_FROM" }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  const subject =
    estado === "aprobado"
      ? "Registro aprobado – El Tridente de la Gloria"
      : estado === "rechazado"
      ? "Registro rechazado – El Tridente de la Gloria"
      : "Registro en revisión – El Tridente de la Gloria";

  let html = makeHtml(nombres, apellidos, estado);
  const text = `Hola ${nombres} ${apellidos},
Tu estado actual es: ${estado}.
${
  estado === "aprobado"
    ? "Ya podés ingresar a la app con tu correo y contraseña."
    : estado === "rechazado"
    ? "Tu registro fue rechazado. Si creés que es un error, respondé este email."
    : "Tu registro está siendo revisado. Te avisaremos cuando haya novedades."
}
— El Tridente de la Gloria`;
// Abrir la app: ${BRAND_DEEP_LINK}
// Fallback: ${BRAND_APP_URL}`;

  // Adjuntar logo inline (CID) si hay URL pública
  let attachments: Array<{
    filename: string;
    type: string;
    content: string;
    disposition: "inline";
    content_id: string;
  }> | undefined;

  if (BRAND_LOGO_URL) {
    try {
      const resp = await fetch(BRAND_LOGO_URL);
      if (resp.ok) {
        const mime = resp.headers.get("content-type") ?? "image/png";
        const u8 = new Uint8Array(await resp.arrayBuffer());
        const base64 = u8ToBase64(u8);

        // Reemplazar src por el CID
        html = html.replaceAll(BRAND_LOGO_URL, "cid:brand-logo");

        attachments = [{
          filename: "logo",
          type: mime,
          content: base64,
          disposition: "inline",
          content_id: "brand-logo",
        }];
      }
    } catch {
      // Si falla, no rompemos el envío; quedará la URL en el HTML como fallback
    }
  }

  // Payload SendGrid
  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email }] }],
    from: { email: SENDGRID_FROM, name: "El Tridente de la Gloria" },
    reply_to: { email: SENDGRID_FROM, name: "El Tridente de la Gloria" },
    subject,
    content: [
      { type: "text/plain", value: text },
      { type: "text/html", value: html }
    ],
    tracking_settings: {
      click_tracking: { enable: false, enable_text: false },
      open_tracking: { enable: false }
    }
  };

  if (attachments) (payload as any).attachments = attachments;

  try {
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ ok: false, status: resp.status, detail }),
        { status: 500, headers: { "Content-Type": "application/json", ...cors } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } }
    );
  }
});
