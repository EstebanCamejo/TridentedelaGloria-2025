import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { AuthChangeEvent } from '@supabase/supabase-js';
export type TipoRegistro = 'cliente' | 'anonimo';
type RolUsuario = 'clienteReg' | 'clienteAnon' | 'mozo' | 'maitre' | 'dueno' | 'supervisor' | 'bartender' | 'cocinero';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
type EstadoLE = 'noAtendido' | 'esperando' | 'asignado';

const capacitorAuthStorage = {
  getItem: (key: string) => Preferences.get({ key }).then(r => r.value ?? null),
  setItem: (key: string, value: string) => Preferences.set({ key, value }),
  removeItem: (key: string) => Preferences.remove({ key }),
};
const nativeStorage = {
  getItem: (key: string) => Preferences.get({ key }).then(r => r.value ?? null),
  setItem: (key: string, value: string) => Preferences.set({ key, value }),
  removeItem: (key: string) => Preferences.remove({ key }),
};

const isNative = Capacitor.isNativePlatform();
const storage = isNative ? nativeStorage : window.localStorage;

export interface ClienteRegistroData {
  tipo_registro: TipoRegistro;
  nombre: string;
  apellido?: string | null;
  dni?: string | null;
  email: string; 
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
  
  public idUsuario: string = '';
//   constructor() {
// this._supabase = createClient(
//   environment.supabaseUrl,
//   environment.supabaseAnonKey,
//    opts,
//   {
//     auth: {
//       // 👇 CLAVE para nativo
//       storage: Capacitor.isNativePlatform() ? capacitorAuthStorage : window.localStorage,
//       persistSession: true,
//       autoRefreshToken: true, 
//       detectSessionInUrl: false,
//       multiTab: false,  
//     },
  
// );


// //   constructor() {

// //     const opts: any = {
// //       auth: {
// //         persistSession: true,
// //         autoRefreshToken: true,
// //         multiTab: false,            // 👈 desactiva Navigator.locks en GoTrue
// //       },
// //       global: { headers: { apikey: environment.supabaseAnonKey } },
// //     };


//     // Cargar email inicial (si hay sesión)
//     this._supabase.auth.getUser().then((res) => {
//       const user = res.data?.user;
//       this.authEmail$.next(user?.email ?? null);
//     });


    
// // Cargar email + id inicial
// this._supabase.auth.getSession().then(({ data }) => {
//   const u = data?.session?.user;
//   this.authEmail$.next(u?.email ?? null);
//   this.idUsuario = u?.id ?? '';
// });

// // Mantener actualizado
// this._supabase.auth.onAuthStateChange((_e, s) => {
//   const u = s?.user;
//   this.authEmail$.next(u?.email ?? null);
//   this.idUsuario = u?.id ?? '';
// });

//     // Mantenerlo actualizado ante cambios de sesión
//     this._supabase.auth.onAuthStateChange((_event, session) => {
//       this.authEmail$.next(session?.user?.email ?? null);
//     });

  constructor() {
    const options = {
      auth: {
        storage: Capacitor.isNativePlatform() ? capacitorAuthStorage : window.localStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        multiTab: false,
      },
      global: { headers: { apikey: environment.supabaseAnonKey } },
    } as const;

    this._supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, options);

    // Cargar email inicial
    this._supabase.auth.getUser().then(res => this.authEmail$.next(res.data?.user?.email ?? null));

    // Cargar email + id inicial
    this._supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user;
      this.authEmail$.next(u?.email ?? null);
      this.idUsuario = u?.id ?? '';
    });

    // Mantener actualizado
    this._supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user;
      this.authEmail$.next(u?.email ?? null);
      this.idUsuario = u?.id ?? '';
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

//   private async withTimeout<T>(p: Promise<T>, label = 'op', ms = 15000): Promise<T> {
//   const controller = new AbortController();
//   const to = setTimeout(() => controller.abort(`timeout:${label}`), ms);
//   try {
//     // Si necesitás abortar fetch, pasá controller.signal en ese fetch.
//     return await p;
//   } catch (e) {
//     throw e;
//   } finally {
//     clearTimeout(to);
//   }
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
    this.idUsuario = auth_id;

    return data; // mantiene tu contrato actual
  }

  //   public guardarSesion(userData: any): void {
  //   sessionStorage.setItem(this.storageKey, JSON.stringify(userData));
  //   this.userSubject.next(userData);
  // }
  // getUserData(): any {
  //   const data = sessionStorage.getItem(this.storageKey);
  //   return data ? JSON.parse(data) : null;
  // }

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
  
      // 👉 NUEVO: iniciar sesión localmente
      const { error: signInErr } = await this._supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      
      if (signInErr) throw signInErr;

      // Esperá a que quede “firme”
      const session = await this.waitForSession(4000);
      if (!session?.user?.id) throw new Error('No se pudo establecer la sesión local');

      return true;
    }  
    
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
    const { error: signInErr } = await this._supabase.auth.signInWithPassword({
      email,
      password: form.password,
    });
    if (signInErr) throw signInErr;
    await this.waitForSession(4000);

    // 2) (Opcional) subir foto y actualizar su URL
    if (photoFile) {
      const up = await this.uploadAvatar(photoFile, email);
      await this._supabase.from('usuarios').update({ foto_url: up.publicUrl }).eq('email', email);
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
  
  async getUserIdOrThrow(): Promise<string> {
    const { data } = await this._supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (!uid) throw new Error('No auth user');
    return uid;
  }
    
  async ensureSessionOrThrow() {
    const s0 = await this._supabase.auth.getSession();
    if (s0.data?.session?.user) return s0.data.session;
    const s1 = await this.waitForSession(4000);
    if (!s1?.user) throw new Error('No auth user');
    console.log(s1 + "ensureSessionOrThrow");
    return s1;
    
  }
    
    //maitre
  // async joinWaitlist(cantidad: number, nota?: string) {
  //   const uid =  this.idUsuario;
  //   const { data, error } = await this._supabase
  //     .from('lista_espera')
  //     .insert([{ usuario_id: uid, cantidad_comensales: cantidad, nota }])
  //     .select()
  //     .single();
  //   if (error) {
  //     if ((error as any).code === '23505') throw new Error('Ya estás en la lista de espera.');
  //     throw error;
  //   }
  //   return data;
  // }
  
  // Cliente/Maître: pasar noAtendido -> esperando (o crear esperando si no hay activa)
  async joinWaitlist(cantidad: number, nota?: string) {
    const uid = this.idUsuario; // o: (await this._supabase.auth.getUser()).data.user?.id
    if (!uid) throw new Error('Sin sesión');
  
    // ¿Tiene alguna activa? (incluyo noAtendido porque es tu “borrador”)
    const { data: activa, error: qErr } = await this._supabase
      .from('lista_espera')
      .select('id, estado')
      .eq('usuario_id', uid)
      .in('estado', ['noAtendido','esperando','asignado'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qErr) throw qErr;
  
    // ya está esperando/asignado -> no duplicar
    if (activa?.estado === 'esperando' || activa?.estado === 'asignado') {
      throw new Error('Ya estás en la lista de espera.');
    }
  
    // si existe "noAtendido", actualizarla a "esperando"
    if (activa?.estado === 'noAtendido') {
      const { data, error } = await this._supabase
        .from('lista_espera')
        .update({
          cantidad_comensales: cantidad,
          nota: nota ?? null,
          estado: 'esperando',
        })
        .eq('id', activa.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  
    // no había activa -> crear nueva en "esperando"
    const { data, error } = await this._supabase
      .from('lista_espera')
      .insert([{
        usuario_id: uid,
        cantidad_comensales: cantidad,
        nota: nota ?? null,
        estado: 'esperando',
        mesa_id: null,
        numero_mesa: null,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  
  
  async getMyActiveWait() {
    console.log('entre a get my active');
    const uid = await this.getUserIdOrThrow(); // 👈 usa la nueva
    console.log('pase el get user', uid);
    const { data, error } = await this.client
      .from('lista_espera')
      .select('*')
      .eq('usuario_id', uid)
      .in('estado', ['esperando','asignado'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] || null;
  }
  // SupabaseService
  // En tu SupabaseService (usa this.client y this.idUsuario)
  async getWaitStatusStr(): Promise<'asignado' | 'esperando' | ''> {
    // Traigo cualquier fila activa del usuario (sin ordenar por created_at)
    const { data, error } = await this.client
      .from('lista_espera')
      .select('estado')
      .eq('usuario_id', this.idUsuario)
      .in('estado', ['asignado', 'esperando', 'noAtendido']); // incluí noAsignado para decidir luego
  
    if (error) throw error;
    const estados = (data ?? []).map(r => r.estado as string);
  
    // Prioridad: asignado > esperando > '' (noActivo o solo noAsignado)
    if (estados.includes('asignado')) return 'asignado';
    if (estados.includes('esperando')) return 'esperando';
    return ''; // sin activas o solamente 'noAsignado' → mostrás el form
  }
  
  
  // SupabaseService
  async ensureWaitRow(cant?: number, nota?: string) {
    const uid = this.idUsuario;
  
    const payload: any = {
      usuario_id: uid,
      estado: 'noAtendido',
      ...(Number.isInteger(cant!) ? { cantidad_comensales: cant } : {}),
      ...(nota ? { nota } : {}),
    };
  
    const { data, error } = await this.client
      .from('lista_espera')
      .upsert(payload, { onConflict: 'usuario_id' }) // usa el índice parcial
      .select('id, estado, numero_mesa, cantidad_comensales, nota')
      .single();
  
    if (error) throw error;
    return data; // fila activa (nueva o existente)
  }
  
  async setWaitToEsperando(cant: number, nota?: string) {
    const uid = this.idUsuario;
    const { data, error } = await this.client
      .from('lista_espera')
      .update({
        estado: 'esperando',
        cantidad_comensales: cant,
        nota: nota ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('usuario_id', uid)
      .in('estado', ['noAtendido','esperando']) // evita actualizar algo ya asignado
      .select('id, estado')
      .single();
    if (error) throw error;
    return data;
  }
  // async getAuthUidOrThrow(): Promise<string> {
  //   const { data, error } = await this.client.auth.getUser();
  //   if (error || !data?.user) throw new Error('Sesión no encontrada');
  //   return data.user.id; // UUID de auth
  // }
  
  /** Crea una fila 'noAsignado' si el usuario no tiene una espera activa */
  async waitlistAutoEnroll(defaultCant = 2, nota: string | null = null) {
    //const uid = await this.getAuthUidOrThrow();
  
    // ¿ya tiene una activa?
    const { data: rows, error } = await this.client
      .from('lista_espera')
      .select('id, estado')
      .eq('usuario_id', this.idUsuario)
      .in('estado', ['noAtendido','esperando','asignado'])
      .order('created_at', { ascending: false })
      .limit(1);
  
    if (error) throw error;
    if (rows && rows.length) return rows[0]; // ya tenía algo activo
  
    // crear nueva
    const { data: inserted, error: e2 } = await this.client
      .from('lista_espera')
      .insert([{
        usuario_id: this.idUsuario,
        cantidad_comensales: defaultCant,
        nota,
        estado: 'noAtendido',
        mesa_id: null,
        numero_mesa: null,
      }])
      .select('id, estado')
      .single();
  
    if (e2) throw e2;
    return inserted;
  }
  
  async getWaitStatusDetail(): Promise<{ id: number; estado: EstadoLE; numero_mesa: number|null } | null> {
    console.log('hola entre a obtener estado');
  
    const { data: s } = await this.client.auth.getSession(); // 👈 token real del cliente
    const uid = s.session?.user?.id || this.idUsuario;
    console.log('uid efectivo:', uid);
    if (!uid) throw new Error('Sin sesión');
  
    const { data, error } = await this.client
      .from('lista_espera')
      .select('id, estado, numero_mesa')
      .eq('usuario_id', uid)
      .in('estado', ['noAtendido','esperando','asignado']) // incluye solo los que usás
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
  
    if (error) throw error;
    return data ? { id: data.id, estado: data.estado as EstadoLE, numero_mesa: data.numero_mesa ?? null } : null;
  }

//sofi
// SupabaseService
// async authReady(): Promise<void> {
//   const s0 = await this._supabase.auth.getSession();
//   if (s0.data?.session?.user) return;
//   const s1 = await this.waitForSession(4000);
//   if (!s1?.user) throw new Error('No auth user');
// }

// private async getUidFresh(): Promise<string> {
//   const { data } = await this._supabase.auth.getSession();
//   const uid = data?.session?.user?.id || this.idUsuario;
//   if (!uid) throw new Error('No auth user');
//   return uid;
// }

// async claimGameDiscount(pedidoId: number, juego: string, score: number)
// : Promise<{ applied: boolean; pct: number; total_final: number|null; reason: string }> {
//   const { data, error } = await this.client.rpc('claim_game_discount', {
//     p_pedido_id: pedidoId,
//     p_juego: juego,
//     p_score: score,
//   });
//   if (error) throw error;
//   const row = Array.isArray(data) ? data[0] : data;
//   return {
//     applied: !!row?.applied,
//     pct: row?.pct ?? 0,
//     total_final: row?.total_final ?? null,
//     reason: row?.reason ?? '',
//   };
// }

// async claimGameDiscountTotalOnly(pedidoId: number, score: number)
// : Promise<{ applied: boolean; total_final: number|null }> {
//   const { data, error } = await this.client.rpc('claim_game_discount', {
//     p_pedido_id: pedidoId,
//     p_score: score,
//   });
//   if (error) throw error;
//   const row = Array.isArray(data) ? data[0] : data;
//   return { applied: !!row?.applied, total_final: row?.total_final ?? null };
// }



}