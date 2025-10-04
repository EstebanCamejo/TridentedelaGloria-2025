// // supabase/functions/alta-mesa/index.ts
// import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// import { createClient } from "npm:@supabase/supabase-js@2";

// type MesaTipo = "vip" | "estandar" | "mov_reducida";

// // Encabezados CORS (en dev podés dejar '*')
// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers":
//     "authorization, x-client-info, apikey, content-type",
//   "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
// };

// serve(async (req: Request) => {
//   // 0) Preflight
//   if (req.method === "OPTIONS") {
//     return new Response("ok", { headers: corsHeaders });
//   }

//   // 1) Health check
//   if (req.method === "GET") {
//     return new Response(JSON.stringify({ ok: true, msg: "alta-mesa alive" }), {
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }

//   // 2) Solo POST
//   if (req.method !== "POST") {
//     return new Response("Solo POST", {
//       status: 405,
//       headers: corsHeaders,
//     });
//   }

//   try {
//     const { numero, capacidad, tipo } = (await req.json()) as {
//       numero: number;
//       capacidad: number;
//       tipo: MesaTipo;
//     };

//     if (!numero || numero <= 0 || !capacidad || capacidad <= 0) {
//       return new Response(
//         JSON.stringify({ ok: false, error: "Datos inválidos" }),
//         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
//       );
//     }

//     const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
//     const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
//     const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

//     // 3) Insert preliminar
//     const { data: ins, error: insErr } = await supa
//       .from("mesas")
//       .insert({ numero, capacidad, tipo })
//       .select("id, numero")
//       .single();

//     if (insErr) {
//       const msg = (insErr.message || "").toLowerCase();
//       if (
//         msg.includes("duplicate") ||
//         msg.includes("unique") ||
//         (insErr as any)?.code === "23505"
//       ) {
//         return new Response(
//           JSON.stringify({ ok: false, error: "El número de mesa ya existe." }),
//           { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
//         );
//       }
//       return new Response(
//         JSON.stringify({ ok: false, error: "No se pudo crear la mesa." }),
//         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
//       );
//     }

//     // 4) (Opcional) acá podrías generar QR / subir foto si lo necesitás
//     return new Response(
//       JSON.stringify({ ok: true, mesaId: ins.id, numero: ins.numero }),
//       { headers: { ...corsHeaders, "Content-Type": "application/json" } },
//     );
//   } catch (e: unknown) {
//     const msg = e instanceof Error ? e.message : String(e ?? "Error desconocido");
//     return new Response(JSON.stringify({ ok: false, error: msg }), {
//       status: 500,
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }
// });


// supabase/functions/alta-mesa/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.3";

type MesaTipo = "vip" | "estandar" | "mov_reducida";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "3600",
};

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers ?? {});
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v as string));
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function ok(data: unknown, init: ResponseInit = {}) {
  return json(data, init);
}

function err(message: string, status = 500) {
  return json({ ok: false, error: message }, { status });
}

function dataUrlToBytes(dataUrl: string): { contentType: string; bytes: Uint8Array } {
  // data:image/jpeg;base64,AAAA...
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) throw new Error("data URL inválida");
  const [, contentType, b64] = m;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { contentType, bytes };
}

serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    return ok({ ok: true, msg: "alta-mesa alive" });
  }

  if (req.method !== "POST") {
    return err("Solo POST", 405);
  }

  try {
    const body = (await req.json()) as {
      numero: number;
      capacidad: number;
      tipo: MesaTipo;
      photoBase64?: string; // data URL de la foto (obligatoria para subir imagen)
    };

    const { numero, capacidad, tipo, photoBase64 } = body ?? {};
    if (!numero || numero <= 0 || !capacidad || capacidad <= 0 || !tipo) {
      return err("Datos inválidos", 400);
    }
    if (!photoBase64) {
      return err("La foto (photoBase64) es obligatoria.", 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return err("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.", 500);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Insert preliminar
    const insRes = await supa
      .from("mesas")
      .insert({ numero, capacidad, tipo })
      .select("id, numero")
      .single();

    if (insRes.error || !insRes.data) {
      const msg = (insRes.error?.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique") || (insRes.error as any)?.code === "23505") {
        return err("El número de mesa ya existe.", 409);
      }
      return err("No se pudo crear la mesa.", 500);
    }

    const mesaId = insRes.data.id as string;
    const mesaNumero = insRes.data.numero as number;

    // 2) Generar QR (PNG) con el payload que usa la app
    const qr_text = JSON.stringify({ t: "mesa", id: mesaId, n: mesaNumero });
    const qrDataUrl = await QRCode.toDataURL(qr_text, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 3,
      width: 320,
    });

    // 3) Subir foto y QR a Storage
    const bucket = "mesas";

    // Foto
    const foto = dataUrlToBytes(photoBase64);
    // Forzamos extensión .jpg en la ruta (si la foto es png igualmente se guardará con contentType real)
    const fotoPath = `fotos/${mesaId}.jpg`;
    {
      const { error } = await supa.storage.from(bucket).upload(fotoPath, foto.bytes, {
        upsert: true,
        contentType: foto.contentType || "image/jpeg",
      });
      if (error) return err("No se pudo subir la foto de la mesa.", 500);
    }
    const fotoPublic = supa.storage.from(bucket).getPublicUrl(fotoPath).data.publicUrl;

    // QR
    const qr = dataUrlToBytes(qrDataUrl);
    const qrPath = `qr/${mesaId}.png`;
    {
      const { error } = await supa.storage.from(bucket).upload(qrPath, qr.bytes, {
        upsert: true,
        contentType: "image/png",
      });
      if (error) return err("No se pudo subir la imagen del QR.", 500);
    }
    const qrPublic = supa.storage.from(bucket).getPublicUrl(qrPath).data.publicUrl;

    // 4) Update fila con foto_url y qr_text
    const upd = await supa
      .from("mesas")
      .update({ foto_url: fotoPublic, qr_text })
      .eq("id", mesaId)
      .single();

    if (upd.error) {
      return err("Mesa creada, pero no se pudo guardar foto/QR en la base.", 500);
    }

    // 5) OK
    return ok({
      ok: true,
      id: mesaId,
      numero: mesaNumero,
      qr_text,
      foto_url: fotoPublic,
      qr_img_url: qrPublic,
    });
  } catch (e: unknown) {
    const msg = typeof e === "string" ? e : (e as { message?: string })?.message ?? "Error desconocido";
    return err(msg, 500);
  }
});
