import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';


export type TipoRegistro = 'cliente' | 'anonimo';
type RolUsuario = 'clienteReg' | 'clienteAnon' | 'mozo' | 'maitre' | 'dueno' | 'supervisor' | 'bartender' | 'cocinero';

export interface ClienteRegistroData {
  tipo_registro: TipoRegistro;
  nombre: string;
  apellido?: string | null;
  dni?: string | null;
  email: string;
  // estado se setea por defecto en la DB como 'pendiente'
  foto_path?: string | null;
  foto_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private _supabase: SupabaseClient;
  private bucket = environment.supabaseBucket;
  private edgeBase = environment.supabaseUrl.replace(/\/$/, '');
private anonFnUrl = `${this.edgeBase}/functions/v1/register-anon`;
private appEdgeKey = environment.appEdgeKey; // el mismo valor que APP_EDGE_KE

  constructor() {
    this._supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  // Acceso al cliente, por si lo necesitás en otros servicios
  get client(): SupabaseClient {
    return this._supabase;
  }

  // ---- Auth mínima (podés ajustar más tarde) ----
  async login(email: string, password: string) {
    const { data, error } = await this._supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async logout() {
    const { error } = await this._supabase.auth.signOut();
    if (error) throw error;
  }

  async register(email: string, password: string) {
    const { data, error } = await this._supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

   // ===========================
  // =   STORAGE: subir foto   =
  // ===========================
  /**
   * Sube la foto al bucket `avatars` y devuelve { path, publicUrl }.
   * Para MVP el bucket puede ser público. Si lo hacés privado,
   * reemplazá getPublicUrl por createSignedUrl en la vista.
   */
  async uploadAvatar(file: File, email: string) {
  const safeEmail = (email || 'anon').replace(/[^a-z0-9@._-]/gi, ''); // permite @ . _ -
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2,8)}.${ext}`;
  const filePath = `clientes/${safeEmail}/${fileName}`; // 👈 Arranca con 'clientes/'

  const { error: upErr } = await this._supabase
    .storage
    .from(this.bucket)               // 'avatars'
    .upload(filePath, file, {
      upsert: false,                 // 👈 IMPORTANTE, NADA de update
      contentType: file.type || 'image/jpeg'
    });

  if (upErr) throw upErr;

  const { data } = this._supabase.storage.from(this.bucket).getPublicUrl(filePath);
  return { path: filePath, publicUrl: data.publicUrl };
}

//INSERTAR EN USUARIOS

// async registrarClienteFlow(
//   form: {
//     tipo_registro: 'cliente' | 'anonimo';
//     nombre: string; apellido?: string | null; dni?: string | null;
//     email: string; password: string;
//   },
//   photoFile?: File | null
// ) {
//   // 1) Alta en auth
//   const { data: signData, error: signErr } = await this._supabase.auth.signUp({
//     email: form.email,
//     password: form.password,
//   });
//   if (signErr) throw signErr;
//   const auth_id = signData?.user?.id || null;

//   // 2) Foto (opcional)
//   let foto_url: string | null = null;
//   if (photoFile) {
//     const up = await this.uploadAvatar(photoFile, form.email);
//     foto_url = up.publicUrl;
//   }

//   // 3) Perfil según tipo de registro
//   const perfil = form.tipo_registro === 'anonimo' ? 'clienteAnon' : 'clienteReg';

//   // 4) Normalización de campos:
//   //    - Para anónimo: apellidos/dni => null; nombre por defecto si viene vacío.
//   //    - Para cliente: trim y vacíos => null (evita strings vacíos en DB).
//   const trimOrNull = (v?: string | null) => {
//     const t = (v ?? '').trim();
//     return t.length ? t : null;
//   };

//   const isAnon = perfil === 'clienteAnon';
//   const nombres   = isAnon ? (trimOrNull(form.nombre) ?? 'Anónimo') : trimOrNull(form.nombre)!;
//   const apellidos = isAnon ? null : trimOrNull(form.apellido ?? null);
//   const dni       = isAnon ? null : trimOrNull(form.dni ?? null);

//   // 5) Insert en usuarios
//   const { data, error } = await this._supabase
//     .from('usuarios')
//     .insert({
//       auth_id,
//       email: form.email,
//       nombres,
//       apellidos,      // null si es anónimo
//       dni,            // null si es anónimo
//       foto_url,
//       perfil,         // 'clienteAnon' | 'clienteReg'
//       estado: 'pendiente',
//     })
//     .select()
//     .single();

//   if (error) throw error;
//   return data;
// }

async registrarClienteFlow(
  form: {
    tipo_registro: 'cliente' | 'anonimo';
    nombre: string; apellido?: string | null; dni?: string | null;
    email: string; password: string;
  },
  photoFile?: File | null
) {
  // 1) Alta en auth
  const { data: signData, error: signErr } = await this._supabase.auth.signUp({
    email: form.email,
    password: form.password,
  });
  if (signErr) throw signErr;
  const auth_id = signData?.user?.id || null;

  // 2) Foto (opcional)
  let foto_url: string | null = null;
  if (photoFile) {
    const up = await this.uploadAvatar(photoFile, form.email);
    foto_url = up.publicUrl;
  }

  // 3) Perfil según tipo de registro
  const perfil = form.tipo_registro === 'anonimo' ? 'clienteAnon' : 'clienteReg';

  // 4) Campos normalizados
  const trimOrNull = (v?: string | null) => {
    const t = (v ?? '').trim();
    return t.length ? t : null;
  };
  const isAnon = perfil === 'clienteAnon';
  const nombres   = isAnon ? (trimOrNull(form.nombre) ?? 'Anónimo') : trimOrNull(form.nombre)!;
  const apellidos = isAnon ? null : trimOrNull(form.apellido ?? null);
  const dni       = isAnon ? null : trimOrNull(form.dni ?? null);

  // 5) Estado → depende del tipo
  const estado = isAnon ? 'aprobado' : 'pendiente';

  // 6) Insert en usuarios
  const { data, error } = await this._supabase
    .from('usuarios')
    .insert({
      auth_id,
      email: form.email,
      nombres,
      apellidos,
      dni,
      foto_url,
      perfil,   // clienteAnon | clienteReg
      estado,   // 👈 acá la diferencia clave
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Flujo exclusivo ANÓNIMO: crea user auto-confirmado en Edge, sube foto, inserta perfil y loguea */
async registrarAnonimoFlow(form: { nombre?: string|null; email: string; password: string }, photoFile?: File|null) {
  // 1) Crear user auto-confirmado (Edge)
const res = await fetch(this.anonFnUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${environment.supabaseAnonKey}`, // 👈 requerido con Verify JWT ON
    // 'x-app-key': environment.appEdgeKey, // sólo si decidiste usar este extra
  },
  body: JSON.stringify({
    email: form.email,
    password: form.password,
    nombre: form.nombre ?? 'Anónimo',
  }),
});


  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Edge register-anon falló (${res.status})`);
  }
  const { auth_id } = await res.json();

  // 2) Foto opcional
  let foto_url: string | null = null;
  if (photoFile) {
    const up = await this.uploadAvatar(photoFile, form.email);
    foto_url = up.publicUrl;
  }

  // 3) Insert en tu tabla (yo recomiendo seguir usando 'usuarios' con perfil/estado)
  const { error: insErr } = await this._supabase
    .from('usuarios')
    .insert({
      auth_id,
      email: form.email,
      nombres: (form.nombre ?? 'Anónimo').trim() || 'Anónimo',
      apellidos: null,
      dni: null,
      foto_url,
      perfil: 'clienteAnon',
      estado: 'aprobado', // ✅ entra directo
    });

  if (insErr) throw insErr;

  // 4) Login directo (ya está auto-confirmado)
  const { error: loginErr } = await this._supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password,
  });
  if (loginErr) throw loginErr;

  return true;
}








  
  // === CLIENTES PENDIENTES (ADMIN) ===
  async getPendingClients() {
    const { data, error } = await this._supabase
      .from('usuarios')
      .select('id, auth_id, email, nombres, apellidos, foto_url, created_at')
      .eq('perfil', 'clienteReg')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async approveClient(id: string) {
    const { error } = await this._supabase
      .from('usuarios')
      .update({ estado: 'aprobado' })
      .eq('id', id);
    if (error) throw error;
  }

  async rejectClient(id: string) {
    const { error } = await this._supabase
      .from('usuarios')
      .update({ estado: 'rechazado' })
      .eq('id', id);
    if (error) throw error;
  }

}
