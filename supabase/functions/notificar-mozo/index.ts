// supabase/functions/notificar-mozo/index.ts

type Body = {
  pedidoId: number;
  mesaNumero: number;
  total: number;
  tipoNotificacion: 'nuevo_pedido' | 'pedido_listo';
};

// Paleta + Logo (podés moverlos a secrets si querés)
const BRAND_PRIMARY  = Deno.env.get("BRAND_PRIMARY")   ?? "#7A1E1E"; // bordó
const BRAND_BG       = Deno.env.get("BRAND_BG")        ?? "#F8F4EE"; // crema
const BRAND_LOGO_URL = Deno.env.get("BRAND_LOGO_URL")  ?? "";        // URL pública (opcional)

// util: Uint8Array → base64
function u8ToBase64(u8: Uint8Array) {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

function makeHtml(pedidoId: number, mesaNumero: number, total: number, tipoNotificacion: Body["tipoNotificacion"]) {
  const titulo = tipoNotificacion === 'nuevo_pedido'
    ? "Nuevo pedido pendiente – El Tridente de la Gloria"
    : "Pedido listo para entregar – El Tridente de la Gloria";

  const lead = tipoNotificacion === 'nuevo_pedido'
    ? `Nuevo pedido de la Mesa ${mesaNumero} por $${total}. Requiere confirmación.`
    : `El pedido de la Mesa ${mesaNumero} está listo para entregar.`;

  const nombreCompleto = `Mozo`;

  // Preheader para inbox (oculto)
  const preheader = tipoNotificacion === 'nuevo_pedido'
    ? `Nuevo pedido Mesa ${mesaNumero} - $${total}`
    : `Pedido Mesa ${mesaNumero} listo para entregar`;

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
              <div style="margin:0 0 10px; color:#222; opacity:.9;">Hola ${nombreCompleto},</div>
              <p style="margin:0 0 12px; color:#333;">${lead}</p>
              <div style="margin:16px 0; padding:12px; background:#ffffff; border-radius:8px; border-left:4px solid ${BRAND_PRIMARY};">
                <div style="font-size:14px; color:#333;">
                  <strong>ID Pedido:</strong> ${pedidoId}<br>
                  <strong>Mesa:</strong> ${mesaNumero}<br>
                  <strong>Total:</strong> $${total}
                </div>
              </div>
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

  const { pedidoId, mesaNumero, total, tipoNotificacion } = body;

  // Secrets
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM") || "eltridentedelagloria@gmail.com";
  if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing SENDGRID_API_KEY or SENDGRID_FROM" }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  // Obtener emails de mozos desde Supabase
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing Supabase configuration" }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  // Obtener emails de mozos
  const mozosResponse = await fetch(`${supabaseUrl}/rest/v1/usuarios?tipo=eq.mozo&select=email`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!mozosResponse.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: "Failed to fetch mozos" }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  const mozos = await mozosResponse.json();
  if (!mozos || mozos.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: "No mozos found" }),
      { status: 404, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  const subject = tipoNotificacion === 'nuevo_pedido'
    ? "Nuevo pedido pendiente – El Tridente de la Gloria"
    : "Pedido listo para entregar – El Tridente de la Gloria";

  let html = makeHtml(pedidoId, mesaNumero, total, tipoNotificacion);
  const text = `Hola Mozo,
${tipoNotificacion === 'nuevo_pedido' 
  ? `Nuevo pedido de la Mesa ${mesaNumero} por $${total}. Requiere confirmación.`
  : `El pedido de la Mesa ${mesaNumero} está listo para entregar.`
}

ID Pedido: ${pedidoId}
Mesa: ${mesaNumero}
Total: $${total}

— El Tridente de la Gloria`;

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

  // Payload SendGrid - Enviar a todos los mozos
  const payload: Record<string, unknown> = {
    personalizations: mozos.map((mozo: any) => ({
      to: [{ email: mozo.email }]
    })),
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
      JSON.stringify({ ok: true, mozosNotificados: mozos.length }),
      { headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...cors } }
    );
  }
});
