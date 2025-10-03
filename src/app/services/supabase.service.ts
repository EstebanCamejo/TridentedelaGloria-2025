import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { AuthChangeEvent } from '@supabase/supabase-js';
export type TipoRegistro = 'cliente' | 'anonimo';
type RolUsuario = 'clienteReg' | 'clienteAnon' | 'mozo' | 'maitre' | 'dueno' | 'supervisor' | 'bartender' | 'cocinero';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';


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

// Tipo que usamos para el payload hacia la Edge Function
export type AltaEmpleadoPayload = {
  apellido: string;
  nombre: string;
  dni: string;
  cuil: string;
  email: string;
  password: string;
  perfil: 'maitre'|'mozo'|'cocinero'|'bartender';
  photoBase64: string | null; // dataURL o null
};

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private _supabase: SupabaseClient;
  private bucket = environment.supabaseBucket;
  private edgeBase = environment.supabaseUrl.replace(/\/$/, '');
  private anonFnUrl = `${this.edgeBase}/functions/v1/register-anon`;
  private appEdgeKey = environment.appEdgeKey; // el mismo valor que APP_EDGE_KE
  public authEmail$ = new BehaviorSubject<string | null>(null);

  constructor() {

    const opts: any = {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        multiTab: false,            // 👈 desactiva Navigator.locks en GoTrue
      },
      global: { headers: { apikey: environment.supabaseAnonKey } },
    };


    this._supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      opts   
    ); 


  
    // Cargar email inicial (si hay sesión)
    this._supabase.auth.getUser().then((res) => {
      const user = res.data?.user;
      this.authEmail$.next(user?.email ?? null);
    });

    // Mantenerlo actualizado ante cambios de sesión
    this._supabase.auth.onAuthStateChange((_event, session) => {
      this.authEmail$.next(session?.user?.email ?? null);
    });

  }

  // Acceso al cliente, por si lo necesitás en otros servicios
  get client(): SupabaseClient {
    return this._supabase;
  }

  /** Espera hasta que haya session.user (o vence por timeout). */
  private async waitForSession(timeoutMs = 3000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const { data } = await this._supabase.auth.getSession();
      if (data?.session?.user) return data.session;
      await new Promise(r => setTimeout(r, 120));
    }
    return null;
  }
  
  // ---- Auth mínima (podés ajustar más tarde) ----
  // async login(email: string, password: string) {
  //   const { data, error } = await this._supabase.auth.signInWithPassword({
  //     email,
  //     password,
  //   });

  //   /////////////
  //   const { data: s } = await this._supabase.auth.getSession();
  //   console.log('auth_id:', s?.session?.user?.id);
  //   /////////////
    
  //   if (error) throw error;
  //   const auth_id = data.user?.id;
  //   const { data: rows, error: qErr } = await this._supabase
  //     .from('usuarios')
  //     .select('id, perfil, estado')
  //     .eq('auth_id', auth_id)
  //     .limit(1);
  
  //   if (qErr) {
  //     // si falla la consulta, salimos por seguridad
  //     await this._supabase.auth.signOut();
  //     throw qErr;
  //   }
  
  //   const u = rows?.[0];
  //   // habilitado si es aprobado (clientes) o activo (staff)
  //   const habilitado = u && (u.estado === 'aprobado' || u.estado === 'activo');

  //   if (!habilitado) {
  //     await this._supabase.auth.signOut();
  //     const msg = u?.estado === 'rechazado'
  //       ? 'Tu registro fue rechazado. Consultá al local.'
  //       : 'Tu registro está pendiente de aprobación.';
  //     throw new Error(msg);
  //   }
  //   return data;
  // }
    // ---- Auth ----
  async login(email: string, password: string) {
    const { data, error } = await this._supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // ✅ Esperar a que la sesión quede firme
    const session = await this.waitForSession(3000);
    if (!session?.user?.id) {
      await this._supabase.auth.signOut();
      throw new Error('No se pudo establecer la sesión. Intentá de nuevo.');
    }

    const auth_id = session.user.id;

    // Buscar el usuario app en tu tabla
    const { data: rows, error: qErr } = await this._supabase
      .from('usuarios')
      .select('id, perfil, estado')
      .eq('auth_id', auth_id)
      .limit(1);

    if (qErr) {
      await this._supabase.auth.signOut();
      throw qErr;
    }

    const u = rows?.[0];
    const habilitado = u && (u.estado === 'aprobado' || u.estado === 'activo');
    if (!habilitado) {
      await this._supabase.auth.signOut();
      const msg = u?.estado === 'rechazado'
        ? 'Tu registro fue rechazado. Consultá al local.'
        : 'Tu registro está pendiente de aprobación.';
      throw new Error(msg);
    }

    return data; // mantiene tu contrato actual
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

  //   // 4) Campos normalizados
  //   const trimOrNull = (v?: string | null) => {
  //     const t = (v ?? '').trim();
  //     return t.length ? t : null;
  //   };
  //   const isAnon = perfil === 'clienteAnon';
  //   const nombres   = isAnon ? (trimOrNull(form.nombre) ?? 'Anónimo') : trimOrNull(form.nombre)!;
  //   const apellidos = isAnon ? null : trimOrNull(form.apellido ?? null);
  //   const dni       = isAnon ? null : trimOrNull(form.dni ?? null);

  //   // 5) Estado → depende del tipo
  //   const estado = isAnon ? 'aprobado' : 'pendiente';

  //   // 6) Insert en usuarios
  //   const { data, error } = await this._supabase
  //     .from('usuarios')
  //     .insert({
  //       auth_id,
  //       email: form.email,
  //       nombres,
  //       apellidos,
  //       dni,
  //       foto_url,
  //       perfil,   // clienteAnon | clienteReg
  //       estado,   
  //     })
  //     .select()
  //     .single();

  //   if (error) throw error;

  //   this._supabase.functions.invoke('notificar-cliente', {
  //     body: {
  //       email: form.email,
  //       nombres,
  //       apellidos: apellidos ?? '',
  //       estado: 'pendiente',
  //     },
  //   }).catch(err => console.warn('notificar-cliente (pendiente) falló:', err));

  //   return data;
  // }
  async registrarClienteFlow(
  form: { tipo_registro: 'cliente'|'anonimo'; nombre: string; apellido?: string|null; dni?: string|null; email: string; password: string; },
  photoFile?: File|null
) {
  // 1) Foto opcional
  let foto_url: string | null = null;
  if (photoFile) {
    const up = await this.uploadAvatar(photoFile, form.email);
    foto_url = up.publicUrl;
  }

  // 2) Llamar a la Edge para crear user + insertar en 'usuarios'
  const res = await fetch(`${this.edgeBase}/functions/v1/register-client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.supabaseAnonKey}`, // Verify JWT ON
    },
    body: JSON.stringify({
      email: form.email,
      password: form.password,
      nombre: form.nombre,
      apellido: form.apellido ?? null,
      dni: form.dni ?? null,
      foto_url,
      perfil: form.tipo_registro === 'anonimo' ? 'clienteAnon' : 'clienteReg',
    }),
  });

  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `register-client ${res.status}`);
  }
  const { estado } = await res.json();

  // 3) Enviar tu mail "en revisión"
  if (estado === 'pendiente') {
    this._supabase.functions.invoke('notificar-cliente', {
      body: {
        email: form.email,
        nombres: form.nombre,
        apellidos: form.apellido ?? '',
        estado: 'pendiente',
      },
    }).catch(err => console.warn('notificar-cliente (pendiente) falló:', err));
  }

  return true;
}


    // 2) Foto opcional
    // let foto_url: string | null = null;
    // if (photoFile) {
    //   // const up = await this.uploadAvatar(photoFile, form.email);
    //   const up = await this.withTimeout(
    //     this.uploadAvatar(photoFile, form.email),
    //     'uploadAvatar',
    //     40000
    //   );
      
    //   foto_url = up.publicUrl;
    // }

//     console.log('[alta empleado] step: uploadAvatar (SKIPPED)');
//     const foto_url = null;   


  /** Flujo exclusivo ANÓNIMO: crea user auto-confirmado en Edge, sube foto, inserta perfil y loguea */
  // async registrarAnonimoFlow(form: { nombre?: string|null; email: string; password: string }, photoFile?: File|null) {
  //   // 1) Crear user auto-confirmado (Edge)
  //   const res = await fetch(this.anonFnUrl, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${environment.supabaseAnonKey}`, // 👈 requerido con Verify JWT ON
  //       // 'x-app-key': environment.appEdgeKey, // sólo si decidiste usar este extra
  //     },
  //     body: JSON.stringify({
  //       email: form.email,
  //       password: form.password,
  //       nombre: form.nombre ?? 'Anónimo',
  //     }),
  //   });


  //   if (!res.ok) {
  //     const j = await res.json().catch(() => ({}));
  //     throw new Error(j?.error || `Edge register-anon falló (${res.status})`);
  //   }
  //   const { auth_id } = await res.json();

  //   // 2) Foto opcional
  //   let foto_url: string | null = null;
  //   if (photoFile) {
  //     const up = await this.uploadAvatar(photoFile, form.email);
  //     foto_url = up.publicUrl;
  //   }

  //   // 3) Insert en tu tabla (yo recomiendo seguir usando 'usuarios' con perfil/estado)
  //   const { error: insErr } = await this._supabase
  //     .from('usuarios')
  //     .insert({
  //       auth_id,
  //       email: form.email,
  //       nombres: (form.nombre ?? 'Anónimo').trim() || 'Anónimo',
  //       apellidos: null,
  //       dni: null,
  //       foto_url,
  //       perfil: 'clienteAnon',
  //       estado: 'aprobado', // entra directo
  //     });

  //   if (insErr) throw insErr;

  //   // 4) Login directo (ya está auto-confirmado)
  //   const { error: loginErr } = await this._supabase.auth.signInWithPassword({
  //     email: form.email,
  //     password: form.password,
  //   });
  //   if (loginErr) throw loginErr;

  //   // tras el signInWithPassword exitoso:
  //   this._supabase.functions.invoke('notificar-cliente', {
  //     body: {
  //       email: form.email,
  //       nombres: (form.nombre ?? 'Anónimo'),
  //       apellidos: '',
  //       estado: 'aprobado',
  //     },
  //   }).catch(err => console.warn('notificar-cliente (anon/aprobado) falló:', err));

  //   return true;
  // }
  
  async registrarAnonimoFlow(
  form: { nombre: string; email: string; password: string },
  photoFile?: File | null
) {
  const email = form.email.trim().toLowerCase();

  // 1) Crear user + fila usuarios via Edge
  const res = await fetch(`${this.edgeBase}/functions/v1/register-anon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.supabaseAnonKey}`,
      ...(environment.appEdgeKey ? { 'x-app-key': environment.appEdgeKey } : {})
    },
    body: JSON.stringify({ email, password: form.password, nombre: form.nombre }),
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || `register-anon ${res.status}`);
  const { auth_id } = await res.json();

  // 2) (Opcional) subir foto y actualizar su URL
  if (photoFile) {
    const up = await this.uploadAvatar(photoFile, email);
    await this._supabase.from('usuarios')
      .update({ foto_url: up.publicUrl })
      .eq('auth_id', auth_id);
  }

  return { ok: true };
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

  

  async altaEmpleadoViaFunctionDirect(payload: {
    apellidos: string; nombres: string; dni: string; cuil: string;
    email: string; password: string;
    perfil: 'maitre'|'mozo'|'cocinero'|'bartender';
    photoBase64: string | null;
  }) {
    const url = `${environment.supabaseUrl.replace(/\/$/, '')}/functions/v1/alta-empleado`;
    const apikey = environment.supabaseAnonKey;

    console.log('[svc] CALLED altaEmpleadoViaFunctionDirect');
    console.log('[svc] URL:', url, 'apikey.len=', apikey?.length || 0);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000); // 10s de timeout

    const res = await fetch(url, {
      method: 'POST',                    // ← forzamos POST
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey                 // ← sólo apikey, sin Authorization
      },
      body: JSON.stringify(payload),
      mode: 'cors',
      signal: controller.signal,
      keepalive: false
    }).catch((err) => {
      console.error('[svc] fetch error:', err);
      throw new Error('No se pudo invocar la función (fetch error/timeout)');
    });
  }

  onAuthChange(handler: (event: AuthChangeEvent) => void): () => void {
    const { data: sub } = this._supabase.auth.onAuthStateChange((event) => handler(event));
    // devolvemos el unsubscribe para limpiar en OnDestroy
    return () => sub.subscription.unsubscribe();}
  

}
