import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { AuthChangeEvent } from '@supabase/supabase-js';
export type TipoRegistro = 'cliente' | 'anonimo';
type RolUsuario = 'clienteReg' | 'clienteAnon' | 'mozo' | 'maitre' | 'dueno' | 'supervisor' | 'bartender' | 'cocinero';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
type EstadoLE = 'noAtendido' | 'esperando' | 'asignado' | 'finalizado';

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

// Interfaz para datos de usuario en localStorage
export interface UsuarioLocalData {
  id: string;
  email: string;
  nombre: string;
  apellido?: string | null;
  perfil: string; // rol del usuario
  auth_id: string;
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
  private readonly USER_DATA_KEY = 'usuario_data';
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
    this._supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        storage: Capacitor.isNativePlatform() ? capacitorAuthStorage : window.localStorage,
        persistSession: true,
        autoRefreshToken: true, // ✅ REACTIVADO - necesario para mantener sesión después de cámara
        detectSessionInUrl: false,
        flowType: 'pkce' as const,
      },
      global: { 
        headers: { apikey: environment.supabaseAnonKey },
      },
    });

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

    // Intentar cargar datos del localStorage al inicializar
    this.loadUserDataFromLocal();
    
  }


  // Acceso al cliente, por si lo necesitás en otros servicios
  get client(): SupabaseClient {
    return this._supabase;
  }

  // ===========================
  // =   LOCAL STORAGE METHODS =
  // ===========================
  
  /**
   * Guarda los datos del usuario en localStorage (ahora async para dispositivos nativos)
   */
  private async saveUserDataToLocal(userData: UsuarioLocalData): Promise<void> {
    try {
      const dataToSave = JSON.stringify(userData);
      if (isNative) {
        // En dispositivos nativos, usar Preferences (async)
        await Preferences.set({ key: this.USER_DATA_KEY, value: dataToSave });
      } else {
        // En web, usar localStorage (sync)
        localStorage.setItem(this.USER_DATA_KEY, dataToSave);
      }
      console.log('✅ Datos de usuario guardados en localStorage:', userData.email);
    } catch (error) {
      console.error('❌ Error al guardar datos de usuario en localStorage:', error);
    }
  }

  /**
   * Obtiene los datos del usuario desde localStorage
   */
  async getUserDataFromLocal(): Promise<UsuarioLocalData | null> {
    try {
      let data: string | null = null;
      
      if (isNative) {
        // En dispositivos nativos, usar Preferences
        const result = await Preferences.get({ key: this.USER_DATA_KEY });
        data = result.value;
      } else {
        // En web, usar localStorage
        data = localStorage.getItem(this.USER_DATA_KEY);
      }
      
      if (data) {
        const userData = JSON.parse(data) as UsuarioLocalData;
        console.log('Datos de usuario recuperados del localStorage:', userData);
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener datos de usuario del localStorage:', error);
      return null;
    }
  }

  /**
   * Limpia los datos del usuario del localStorage
   */
  private clearUserDataFromLocal(): void {
    try {
      if (isNative) {
        // En dispositivos nativos, usar Preferences
        Preferences.remove({ key: this.USER_DATA_KEY });
      } else {
        // En web, usar localStorage
        localStorage.removeItem(this.USER_DATA_KEY);
      }
      console.log('Datos de usuario eliminados del localStorage');
    } catch (error) {
      console.error('Error al limpiar datos de usuario del localStorage:', error);
    }
  }

  /**
   * Carga los datos del usuario desde localStorage al inicializar el servicio
   */
  private async loadUserDataFromLocal(): Promise<void> {
    try {
      const userData = await this.getUserDataFromLocal();
      if (userData && userData.auth_id) {
        this.idUsuario = userData.auth_id;
        this.authEmail$.next(userData.email);
        console.log('Datos de usuario cargados desde localStorage al inicializar:', userData);
      }
    } catch (error) {
      console.error('Error al cargar datos de usuario del localStorage al inicializar:', error);
    }
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

    // Buscar el usuario app en tu tabla con más datos
    const { data: rows, error: qErr } = await this._supabase
      .from('usuarios')
      .select('id, perfil, estado, nombres, apellidos, email, auth_id')
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

    // Guardar datos del usuario en localStorage
    if (u) {
      const userData: UsuarioLocalData = {
        id: u.id,
        email: u.email || session.user.email || '',
        nombre: u.nombres || '',
        apellido: u.apellidos || null,
        perfil: u.perfil || '',
        auth_id: u.auth_id || auth_id
      };
      await this.saveUserDataToLocal(userData);
    }

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
    
    // Limpiar datos del localStorage y variables locales
    this.clearUserDataFromLocal();
    this.idUsuario = '';
    this.authEmail$.next(null);
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

      // Esperá a que quede "firme"
      const session = await this.waitForSession(4000);
      if (!session?.user?.id) throw new Error('No se pudo establecer la sesión local');

      // Guardar datos del usuario en localStorage
      const userData: UsuarioLocalData = {
        id: '', // Se llenará cuando se apruebe el usuario
        email: form.email,
        nombre: form.nombre,
        apellido: form.apellido || null,
        perfil: form.tipo_registro === 'anonimo' ? 'clienteAnon' : 'clienteReg',
        auth_id: session.user.id
      };
      await this.saveUserDataToLocal(userData);
      this.idUsuario = session.user.id;

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
    const session = await this.waitForSession(4000);
    if (!session?.user?.id) throw new Error('No se pudo establecer la sesión local');

    // Guardar datos del usuario en localStorage
    const userData: UsuarioLocalData = {
      id: '', // Se llenará cuando se apruebe el usuario
      email: email,
      nombre: form.nombre,
      apellido: null,
      perfil: 'clienteAnon',
      auth_id: session.user.id
    };
    await this.saveUserDataToLocal(userData);
    this.idUsuario = session.user.id;

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
    try {
      const s0 = await this._supabase.auth.getSession();
      if (s0.data?.session?.user) {
        // Actualizar idUsuario si no está sincronizado
        if (!this.idUsuario || this.idUsuario !== s0.data.session.user.id) {
          this.idUsuario = s0.data.session.user.id;
        }
        return s0.data.session;
      }
      
      const s1 = await this.waitForSession(4000);
      if (!s1?.user) throw new Error('No auth user');
      
      // Actualizar idUsuario
      this.idUsuario = s1.user.id;
      console.log('Sesión restaurada correctamente:', s1.user.id);
      return s1;
    } catch (error) {
      console.error('Error en ensureSessionOrThrow:', error);
      // Limpiar idUsuario si hay error
      this.idUsuario = '';
      throw error;
    }
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
    console.log('=== joinWaitlist ===');
    console.log('Cantidad:', cantidad, 'Nota:', nota);
    
    // Asegurar que tenemos idUsuario de forma robusta
    const uid = await this.ensureUserId();
    console.log('✅ uid efectivo para inscripción:', uid);
  
    // ¿Tiene alguna activa? (incluyo noAtendido porque es tu "borrador")
    console.log('🔍 Buscando entrada activa...');
    const { data: activa, error: qErr } = await this._supabase
      .from('lista_espera')
      .select('id, estado')
      .eq('usuario_id', uid)
      .in('estado', ['noAtendido','esperando','asignado'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (qErr) {
      console.error('❌ Error al buscar entrada activa:', qErr);
      throw qErr;
    }
    
    console.log('📊 Entrada activa encontrada:', activa);
  
    // ya está esperando/asignado -> no duplicar
    if (activa?.estado === 'esperando' || activa?.estado === 'asignado') {
      console.log('⚠️ Usuario ya está en lista de espera');
      throw new Error('Ya estás en la lista de espera.');
    }
  
    // si existe "noAtendido", actualizarla a "esperando"
    if (activa?.estado === 'noAtendido') {
      console.log('🔄 Actualizando entrada noAtendido a esperando...');
      console.log('📋 Datos de actualización:', {
        id: activa.id,
        cantidad,
        nota,
        estado: 'esperando'
      });
      
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
      
      if (error) {
        console.error('❌ Error al actualizar:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Entrada actualizada exitosamente:', data);
      return data;
    }
  
    // no había activa -> crear nueva en "esperando"
    console.log('➕ Creando nueva entrada en lista de espera...');
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
    
    if (error) {
      console.error('❌ Error al crear entrada:', error);
      throw error;
    }
    
    console.log('✅ Nueva entrada creada:', data);
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
    console.log('=== getWaitStatusDetail ===');
    
    // Asegurar que tenemos idUsuario de forma robusta
    const uid = await this.ensureUserId();
    console.log('✅ uid efectivo para consulta:', uid);

    console.log('🔄 Ejecutando consulta a lista_espera...');
    const { data, error } = await this._supabase
      .from('lista_espera')
      .select('id, estado, numero_mesa')
      .eq('usuario_id', uid)
      .in('estado', ['noAtendido','esperando','asignado','finalizado'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    console.log('✅ Consulta completada');

    if (error) {
      console.error('❌ Error en consulta:', error);
      throw error;
    }
    
    console.log('📊 Resultado de consulta:', data);
    return data ? { id: data.id, estado: data.estado as EstadoLE, numero_mesa: data.numero_mesa ?? null } : null;
  }

  // Game discount methods
  async authReady(): Promise<void> {
    const s0 = await this._supabase.auth.getSession();
    if (s0.data?.session?.user) return;
    const s1 = await this.waitForSession(4000);
    if (!s1?.user) throw new Error('No auth user');
  }

  private async getUidFresh(): Promise<string> {
    const { data } = await this._supabase.auth.getSession();
    const uid = data?.session?.user?.id || this.idUsuario;
    if (!uid) throw new Error('No auth user');
    return uid;
  }

  async claimGameDiscount(pedidoId: number, juego: string, score: number)
  : Promise<{ applied: boolean; pct: number; total_final: number|null; reason: string }> {
    const { data, error } = await this.client.rpc('claim_game_discount', {
      p_pedido_id: pedidoId,
      p_juego: juego,
      p_score: score,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      applied: !!row?.applied,
      pct: row?.pct ?? 0,
      total_final: row?.total_final ?? null,
      reason: row?.reason ?? '',
    };
  }

  async claimGameDiscountTotalOnly(pedidoId: number, score: number)
  : Promise<{ applied: boolean; total_final: number|null }> {
    const { data, error } = await this.client.rpc('claim_game_discount', {
      p_pedido_id: pedidoId,
      p_score: score,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { applied: !!row?.applied, total_final: row?.total_final ?? null };
  }

  /**
   * Verifica si ya se aplicó un descuento de juegos a un pedido
   */
  async yaSeAplicoDescuento(pedidoId: number): Promise<boolean> {
    // CORRECCIÓN: Usar las columnas correctas que existen en la tabla pedidos
    const { data, error } = await this.client
      .from('pedidos')
      .select('descuento_pct, juego_premio_reclamado')
      .eq('id', pedidoId)
      .single();
    
    if (error) {
      console.error('Error al verificar descuento aplicado:', error);
      return false;
    }
    
    // Verificar si hay descuento aplicado o juego premio reclamado
    return !!(data?.descuento_pct && data.descuento_pct > 0) || !!data?.juego_premio_reclamado;
  }

  /**
   * NUEVA ESTRATEGIA: Prepara la sesión ANTES de usar la cámara
   * Guarda el estado actual para poder restaurarlo después
   * RÁPIDO y NO BLOQUEANTE
   */
  async prepareForCameraUse(): Promise<void> {
    console.log('🎬 Preparando para cámara...');
    
    try {
      // Verificar que hay datos en localStorage
      const existing = await this.getUserDataFromLocal();
      if (existing?.auth_id) {
        console.log('✅ Datos en localStorage OK');
      } else {
        console.warn('⚠️ No hay datos en localStorage - asegúrate de estar logueado');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  /**
   * Restaura la sesión de Supabase después de usar la cámara o cualquier interrupción nativa.
   * NUEVA ESTRATEGIA: Prioriza localStorage y maneja la pérdida de sesión de Supabase
   */
  async restoreSessionAfterCamera(): Promise<boolean> {
    console.log('🔄 Restaurando desde localStorage...');
    
    try {
      const userData = await this.getUserDataFromLocal();
      
      if (userData?.auth_id) {
        this.idUsuario = userData.auth_id;
        this.authEmail$.next(userData.email);
        console.log('✅ Estado restaurado:', userData.email);
        console.log('ℹ️ autoRefreshToken se encargará de mantener la sesión Supabase');
        return true;
      } else {
        console.warn('⚠️ No hay datos en localStorage');
        return false;
      }
    } catch (error) {
      console.error('❌ Error:', error);
      return false;
    }
  }

  /**
   * YA NO SE USA - mantenemos por compatibilidad pero no hace nada
   * Con autoRefreshToken=false y localStorage, no necesitamos restaurar sesión Supabase
   */
  private async attemptSilentSessionRestore(): Promise<void> {
    console.log('⏭️ attemptSilentSessionRestore: No necesario con configuración actual');
  }

  /**
   * Helper: Obtiene el idUsuario de forma robusta
   * Prioriza: this.idUsuario > localStorage > sesión Supabase
   */
  private async ensureUserId(): Promise<string> {
    // 1. Si ya tenemos idUsuario, usarlo
    if (this.idUsuario) {
      return this.idUsuario;
    }

    // 2. Intentar desde localStorage
    const userData = await this.getUserDataFromLocal();
    if (userData?.auth_id) {
      this.idUsuario = userData.auth_id;
      console.log('✅ idUsuario recuperado de localStorage:', this.idUsuario);
      return this.idUsuario;
    }

    // 3. Último recurso: sesión de Supabase
    try {
      const { data: s } = await this.client.auth.getSession();
      if (s.session?.user?.id) {
        this.idUsuario = s.session.user.id;
        console.log('✅ idUsuario recuperado de sesión:', this.idUsuario);
        return this.idUsuario;
      }
    } catch (error) {
      console.warn('❌ No se pudo obtener sesión de Supabase:', error);
    }

    throw new Error('No se pudo obtener idUsuario (sin sesión ni datos locales)');
  }

  /**
   * Verifica y repara el estado de la sesión de Supabase
   * Útil después de eventos que puedan romper la sesión (uso de cámara, etc)
   */
  async verifyAndRepairSession(): Promise<boolean> {
    console.log('[verifyAndRepairSession] ⏭️ Método simplificado - no hacemos consultas de prueba');
    return true;
  }

  /**
   * NO USADO - mantenido por compatibilidad
   */
  async quickSessionRefresh(): Promise<void> {
    console.log('[quickSessionRefresh] ⏭️ Método no usado');
  }

  /**
   * Libera la mesa del cliente actual y marca la estadía como finalizada
   */
  async liberarMesa(): Promise<void> {
    console.log('=== liberarMesa ===');
    
    const uid = await this.ensureUserId();
    console.log('✅ uid para liberar mesa:', uid);

    // 1. Obtener el estado actual de la lista de espera
    const waitStatus = await this.getWaitStatusDetail();
    
    if (!waitStatus) {
      throw new Error('No tienes una estadía activa');
    }
    
    if (waitStatus.estado !== 'asignado') {
      throw new Error('Solo puedes liberar la mesa si tienes una mesa asignada');
    }

    console.log('🔄 Liberando mesa para estadía:', waitStatus.id);

    // 2. Actualizar estado de lista_espera a 'finalizado'
    const { error: errorLista } = await this._supabase
      .from('lista_espera')
      .update({ 
        estado: 'finalizado',
        updated_at: new Date().toISOString()
      })
      .eq('id', waitStatus.id);

    if (errorLista) {
      console.error('❌ Error al actualizar lista_espera:', errorLista);
      throw new Error('Error al finalizar la estadía');
    }

    // 3. Liberar la mesa (cambiar estado a 'libre')
    if (waitStatus.numero_mesa) {
      const { error: errorMesa } = await this._supabase
        .from('mesas')
        .update({ 
          estado: 'libre',
          updated_at: new Date().toISOString()
        })
        .eq('numero', waitStatus.numero_mesa);

      if (errorMesa) {
        console.error('❌ Error al liberar mesa:', errorMesa);
        // No lanzamos error aquí porque la estadía ya se marcó como finalizada
        console.warn('⚠️ Mesa no se pudo liberar, pero la estadía se finalizó');
      } else {
        console.log('✅ Mesa liberada exitosamente');
      }
    }

    console.log('✅ Estadía finalizada exitosamente');
  }

  /**
   * Verifica si el cliente puede completar una encuesta
   */
  async puedeCompletarEncuesta(): Promise<boolean> {
    console.log('[DEBUG] Verificando si puede completar encuesta...');
    // TEMPORALMENTE: Siempre permitir completar encuesta para debugging
    console.log('[DEBUG] ⚠️ puedeCompletarEncuesta TEMPORALMENTE DESHABILITADO. Retornando TRUE.');
    return true;
    
    /* LÓGICA ORIGINAL (comentada para debug)
    const waitStatus = await this.getWaitStatusDetail();
    console.log('[DEBUG] WaitStatus obtenido:', waitStatus);
    console.log('[DEBUG] Estado de mesa:', waitStatus?.estado);
    console.log('[DEBUG] Puede completar encuesta:', waitStatus?.estado === 'asignado');
    return waitStatus?.estado === 'asignado';
    */
  }

  /**
   * Verifica si el cliente ya completó una encuesta para su estadía actual
   */
  async yaCompletoEncuesta(): Promise<boolean> {
    console.log('🚫🚫🚫🚫ENCUESTA🚫🚫🚫🚫');
    console.log('[DEBUG YA COMPLETO ENCUESTA] === VERIFICANDO SI YA COMPLETÓ ===');
    
    // TEMPORALMENTE: Siempre permitir completar encuesta para debugging
    console.log('[DEBUG YA COMPLETO ENCUESTA] ⚠️ yaCompletoEncuesta TEMPORALMENTE DESHABILITADO. Retornando FALSE.');
    console.log('🚫🚫🚫🚫ENCUESTA🚫🚫🚫🚫');
    return false;
    
    /* LÓGICA ORIGINAL (comentada para debug)
    const waitStatus = await this.getWaitStatusDetail();
    console.log('[DEBUG YA COMPLETO ENCUESTA] WaitStatus:', waitStatus);
    
    if (!waitStatus) {
      console.log('[DEBUG YA COMPLETO ENCUESTA] ❌ No hay waitStatus');
      return false;
    }
    
    // CORRECCIÓN: Convertir lista_espera_id a UUID válido
    const listaEsperaUuid = `00000000-0000-0000-0000-${String(waitStatus.id).padStart(12, '0')}`;
    console.log('[DEBUG YA COMPLETO ENCUESTA] Consultando encuesta_respuesta con lista_espera_id (UUID):', listaEsperaUuid);
    // MODIFICACIÓN: Quitar .single() para evitar 406 Not Acceptable
    const { data, error } = await this._supabase
      .from('encuesta_respuesta')
      .select('id')
      .eq('lista_espera_id', listaEsperaUuid);
    
    console.log('[DEBUG YA COMPLETO ENCUESTA] Resultado consulta:', { data, error });
    
    if (error) {
      console.error('[DEBUG YA COMPLETO ENCUESTA] ❌ Error al verificar encuesta:', error);
      return false;
    }
    
    // Si data es un array vacío, significa que no hay encuestas completadas
    const yaCompleto = data && data.length > 0;
    console.log('[DEBUG YA COMPLETO ENCUESTA] Ya completó:', yaCompleto);
    console.log('🚫🚫🚫🚫ENCUESTA🚫🚫🚫🚫');
    return yaCompleto;
    */
  }

  /**
   * Solicita la cuenta al mozo
   */
  async solicitarCuenta(numeroMesa: number): Promise<void> {
    console.log('=== solicitarCuenta ===');
    console.log('Mesa:', numeroMesa);

    try {
      // Enviar notificación usando canal realtime directo
      const channel = this._supabase.channel('solicitud_cuenta_mozo');
      
      await channel.send({
        type: 'broadcast',
        event: 'solicitud_cuenta',
        payload: {
          mesa_numero: numeroMesa,
          mensaje: `Mesa ${numeroMesa} solicita la cuenta`,
          timestamp: new Date().toISOString()
        }
      });

      console.log('✅ Solicitud de cuenta enviada al mozo via realtime');
    } catch (error) {
      console.error('❌ Error al enviar solicitud de cuenta:', error);
      throw new Error('No se pudo enviar la solicitud de cuenta');
    }
  }

  /**
   * Verifica si el cliente tiene pedidos sin pagar
   */
  async tienePedidosSinPagar(): Promise<boolean> {
    const waitStatus = await this.getWaitStatusDetail();
    
    if (!waitStatus || waitStatus.estado !== 'asignado') return false;
    
    const uid = await this.ensureUserId();
    
      // Buscar pedidos del cliente que no estén pagados
      // Consideramos "sin pagar" los pedidos que no están en estado 'pagado' o 'finalizado'
      const { data, error } = await this._supabase
        .from('pedidos')
        .select('id, estado')
        .eq('idCliente', uid)
        .not('estado', 'in', '(pagado,finalizado)');
    
    if (error) {
      console.error('❌ Error al verificar pedidos sin pagar:', error);
      return false;
    }
    
    return data && data.length > 0;
  }

  /**
   * Verifica si el cliente puede completar una encuesta (tiene mesa asignada Y pagó)
   */
  async puedeCompletarEncuestaConPago(): Promise<boolean> {
    const puedeCompletar = await this.puedeCompletarEncuesta();
    if (!puedeCompletar) return false;
    
    const tienePendientes = await this.tienePedidosSinPagar();
    return !tienePendientes; // Puede completar si NO tiene pendientes
  }

  /**
   * Obtiene el perfil del usuario actual
   */
  async getUserProfile(): Promise<{ perfil?: string } | null> {
    try {
      const uid = this.idUsuario;
      if (!uid) return null;

      const { data, error } = await this._supabase
        .from('usuarios')
        .select('perfil')
        .eq('auth_id', uid)
        .single();

      if (error) {
        console.error('Error al obtener perfil del usuario:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error al obtener perfil del usuario:', error);
      return null;
    }
  }

}
