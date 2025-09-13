import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export type TipoRegistro = 'cliente' | 'anonimo';

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


  // ==========================================
  // =   DB: insertar en clientes_registrados  =
  // ==========================================
  async insertClienteRegistrado(payload: ClienteRegistroData) {
    const { data, error } = await this._supabase
      .from('clientes_registrados')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

async registrarClienteFlow(form: {
  tipo_registro: 'cliente' | 'anonimo';
  nombre: string; apellido?: string|null; dni?: string|null;
  email: string; password: string;
}, photoFile?: File | null) {
  // 1) signUp (envía mail). No esperamos sesión.
  const { error: signErr } = await this._supabase.auth.signUp({
    email: form.email,
    password: form.password,
  });
  if (signErr) throw signErr;

  // 2) subir foto ANÓNIMAMENTE (ya habilitaste INSERT público en Storage)
  let foto_path: string | null = null, foto_url: string | null = null;
  if (photoFile) {
    const up = await this.uploadAvatar(photoFile, form.email); // upsert:false
    foto_path = up.path; foto_url = up.publicUrl;
  }

  // 3) insertar en la tabla (RLS OFF + GRANTs → permite INSERT con anon)
  const payload = {
    tipo_registro: form.tipo_registro,
    nombre: form.nombre,
    apellido: form.apellido ?? null,
    dni: form.dni ?? null,
    email: form.email,
    foto_path,
    foto_url,
    estado: 'pendiente'
  };

  const { data, error } = await this._supabase
    .from('clientes_registrados')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
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
