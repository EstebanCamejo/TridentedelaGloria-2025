// // supabase/functions/alta-empleado/index.ts
// import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// serve(async (req)=>{
//   // --- CORS base (siempre igual) ---
//   const origin = req.headers.get("Origin") ?? "*";
//   const cors = {
//     "Access-Control-Allow-Origin": origin,
//     "Access-Control-Allow-Methods": "POST, OPTIONS",
//     "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
//     "Access-Control-Max-Age": "86400",
//     "Vary": "Origin"
//   };
//   // 1) Preflight
//   if (req.method === "OPTIONS") {
//     return new Response(null, {
//       status: 204,
//       headers: cors
//     });
//   }
//   // 2) DEBUG temporal: si NO es POST, decime qué método llegó
//   if (req.method !== "POST") {
//     return new Response(JSON.stringify({
//       error: "Only POST is allowed",
//       method: req.method
//     }), {
//       status: 405,
//       headers: {
//         ...cors,
//         "Content-Type": "application/json"
//       }
//     });
//   }
//   // 3) Manejo normal (por ahora echo)
//   try {
//     const body = await req.json();
//     return new Response(JSON.stringify({
//       ok: true,
//       echo: body
//     }), {
//       status: 200,
//       headers: {
//         ...cors,
//         "Content-Type": "application/json"
//       }
//     });
//   } catch (err) {
//     return new Response(JSON.stringify({
//       error: "Bad JSON",
//       detail: String(err)
//     }), {
//       status: 400,
//       headers: {
//         ...cors,
//         "Content-Type": "application/json"
//       }
//     });
//   }
// });

