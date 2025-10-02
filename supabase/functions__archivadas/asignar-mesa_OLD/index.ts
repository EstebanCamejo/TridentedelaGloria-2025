// supabase/functions/asignar-mesa/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS (igual que alta-mesa)
const ALLOWED_ORIGINS = new Set([
  "http://localhost:4200",
  "capacitor://localhost",
  "ionic://localhost",
]);

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { "Content-Type": "application/json", ...corsHeaders(origin) };

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, msg: "asignar-mesa alive" }), { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const body = await req.json().catch(() => null) as { usuario_id?: string; mesa_id?: string } | null;
    if (!body?.usuario_id || !body?.mesa_id) {
      return new Response(JSON.stringify({ ok: false, error: "usuario_id y mesa_id requeridos" }), { status: 400, headers });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Service Role
    const admin = createClient(url, serviceKey);

    // TODO PASO SIGUIENTE:
    // - Verificar precondiciones y hacer la asignación de forma atómica (we'll add SQL/RPC)

    return new Response(JSON.stringify({ ok: true, msg: "todo listo para wiring DB" }), { headers });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), { status: 500, headers });
  }
});
