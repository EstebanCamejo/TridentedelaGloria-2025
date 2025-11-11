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
    console.log(`[SesionService] 🔍 Cargando perfil para authId: ${authId}`);
    try {
      const { data, error } = await this.supa.client
      .from('usuarios')
      .select('id, auth_id, email, perfil, nombres, apellidos, foto_url, estado')
      .eq('auth_id', authId)
      .maybeSingle();
  
      console.log(`[SesionService] 📊 Query result:`, { data, error });
      
      if (error) throw error;
      this.usuarioBD = data as any;
      console.log(`[SesionService] ✅ Perfil cargado:`, this.usuarioBD);
      
      // Debug: verificar el tipo de usuario
      if (this.usuarioBD) {
        console.log(`[SesionService] 🔍 Tipo de usuario:`, this.usuarioBD.perfil);
        console.log(`[SesionService] 🔍 esMaitre():`, this.esMaitre());
      }
    } catch (e) {
      console.error('[SesionService] ❌ Error cargando perfil:', e);
      this.usuarioBD = null;
    } finally {
      this.perfilCargado = true;
    }
  }
  

  // Helpers de rol (igual que en la base)
  esCliente(): boolean {
    const t = this.usuarioBD?.perfil;
    return t === TipoUsuario.clienteReg || t === TipoUsuario.clienteAnon;
  }
  esMozo(): boolean       { return this.usuarioBD?.perfil === TipoUsuario.mozo; }
  esMaitre(): boolean     { return this.usuarioBD?.perfil === TipoUsuario.maitre; }
  esDueno(): boolean      { return this.usuarioBD?.perfil === TipoUsuario.dueno; }
  esSupervisor(): boolean { return this.usuarioBD?.perfil === TipoUsuario.supervisor; }
  esBartender(): boolean  { return this.usuarioBD?.perfil === TipoUsuario.bartender; }
  esCocinero(): boolean   { return this.usuarioBD?.perfil === TipoUsuario.cocinero; }
  esDelivery(): boolean   { return this.usuarioBD?.perfil === TipoUsuario.delivery; }
  
  /**
   * Verifica si el usuario es un empleado (dueno, supervisor, maitre, mozo, cocinero, bartender, delivery)
   * Útil para validar que solo empleados puedan hacer pedidos delivery
   */
  esEmpleado(): boolean {
    const t = this.usuarioBD?.perfil;
    return t === TipoUsuario.dueno ||
           t === TipoUsuario.supervisor ||
           t === TipoUsuario.maitre ||
           t === TipoUsuario.mozo ||
           t === TipoUsuario.cocinero ||
           t === TipoUsuario.bartender ||
           t === TipoUsuario.delivery;
  }

  // Limpieza opcional (si alguna vez destruís el servicio)
  dispose() {
    this.authUnsub?.data.subscription.unsubscribe();
  }

  
}
