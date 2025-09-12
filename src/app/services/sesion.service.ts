import { Injectable } from '@angular/core';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { TipoUsuario } from '../enumerados/tipo-usuario';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class SesionService {
  public usuarioActual: SupabaseUser | null = null; // auth user
  public usuarioBD: Usuario | null = null;          // perfil BD
  public perfilCargado = false;

  private authUnsub?: { data: { subscription: { unsubscribe: () => void } } };

  constructor(private supa: SupabaseService) {
    this.initAuthListener();
  }

  // Escucha cambios de sesión (login/logout) y carga perfil
  private initAuthListener() {
    // Estado inicial
    this.supa.client.auth.getUser().then(({ data }) => {
      this.usuarioActual = data.user ?? null;
      if (this.usuarioActual) {
        this.cargarPerfil(this.usuarioActual.id);
      } else {
        this.usuarioBD = null;
        this.perfilCargado = true;
      }
    });
    
    this.authUnsub = this.supa.client.auth.onAuthStateChange(async (_ev, session) => {
      this.usuarioActual = session?.user ?? null;
      if (this.usuarioActual) {
        await this.cargarPerfil(this.usuarioActual.id);
      } else {
        this.usuarioBD = null;
        this.perfilCargado = true;
      }
    });
    
  }

  // Carga el perfil desde tu tabla de usuarios en Supabase
  async cargarPerfil(authId: string) {
    try {
      const { data, error } = await this.supa.client
      .from('usuarios')
      .select('id, auth_id, email, tipo:perfil, nombre:nombres, apellido:apellidos, foto_url, estado')
      .eq('auth_id', authId)
      .maybeSingle();
  
      if (error) throw error;
      this.usuarioBD = data as any;
    } catch (e) {
      console.error('cargarPerfil', e);
      this.usuarioBD = null;
    } finally {
      this.perfilCargado = true;
    }
  }
  

  // Helpers de rol (igual que en la base)
  esCliente(): boolean {
    const t = this.usuarioBD?.tipo;
    return t === TipoUsuario.clienteReg || t === TipoUsuario.clienteAnon;
  }
  esMozo(): boolean       { return this.usuarioBD?.tipo === TipoUsuario.mozo; }
  esMaitre(): boolean     { return this.usuarioBD?.tipo === TipoUsuario.maitre; }
  esDueno(): boolean      { return this.usuarioBD?.tipo === TipoUsuario.dueno; }
  esSupervisor(): boolean { return this.usuarioBD?.tipo === TipoUsuario.supervisor; }
  esBartender(): boolean  { return this.usuarioBD?.tipo === TipoUsuario.bartender; }
  esCocinero(): boolean   { return this.usuarioBD?.tipo === TipoUsuario.cocinero; }

  // Limpieza opcional (si alguna vez destruís el servicio)
  dispose() {
    this.authUnsub?.data.subscription.unsubscribe();
  }

  
}
