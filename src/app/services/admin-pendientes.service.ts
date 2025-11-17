import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';


export type PendingClient = {
  id: string;
  auth_id: string;
  email: string;
  nombres: string;
  apellidos: string;
  foto_url?: string | null;
  created_at: string;
};

//type NotifyType = 'aprobado' | 'rechazado';
type NotifyResult =  { ok: true } | { ok: false; detail?: string };

@Injectable({ providedIn: 'root' })
export class AdminPendientesService {
  private readonly TABLE = 'usuarios';

  constructor(private supa: SupabaseService) {}

  /** Lista clientes registrados con estado 'pendiente' (solo clientes registrados) */
  async list(): Promise<PendingClient[]> {
    const { data, error } = await this.supa.client
      .from('usuarios')
      .select('id, auth_id, email, nombres, apellidos, foto_url, created_at')
      .eq('perfil', 'clienteReg')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as PendingClient[];
  }

  /**
   * Aprueba un cliente y lanza la notificación por email (fire-and-forget).
   * Si el envío de email falla, no rompe el flujo de aprobación.
   */
  // async approve(id: string, email: string, nombres: string, apellidos: string) {
  //   const { error } = await this.supa.client
  //     .from('usuarios')
  //     .update({ estado: 'aprobado' })
  //     .eq('id', id)
  //     .select()
  //     .single();
  //   if (error) throw error;
  //   const { error: fnError, data } = await this.supa.client.functions.invoke('notificar-cliente', {
  //     body: { email, nombres, apellidos, estado: 'aprobado' },
  //   });
  //   if (fnError) {
  //     // no cortamos el flujo (el cliente ya quedó aprobado), pero informamos
  //     console.warn('notificar-cliente error:', fnError, data);
  //   }
  // }

    async approve(id: string, email: string, nombres: string, apellidos: string): Promise<NotifyResult> {
      const { error } = await this.supa.client
        .from('usuarios')
        .update({ estado: 'aprobado' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      return this.notify(email, nombres, apellidos, 'aprobado');
    }

  /**
   * Rechaza un cliente y lanza la notificación por email (fire-and-forget).
   * Si el envío de email falla, no rompe el flujo de rechazo.
   */
    async reject(id: string, email: string, nombres: string, apellidos: string): Promise<NotifyResult> {
      const { error } = await this.supa.client
        .from('usuarios')
        .update({ estado: 'rechazado' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      return this.notify(email, nombres, apellidos, 'rechazado');
    }
  // async reject(id: string, email: string, nombres: string, apellidos: string) {
  //   const { error } = await this.supa.client
  //     .from('usuarios')
  //     .update({ estado: 'rechazado' })
  //     .eq('id', id)
  //     .select()
  //     .single();
  //   if (error) throw error;

  //   const { error: fnError, data } = await this.supa.client.functions.invoke('notificar-cliente', {
  //     body: { email, nombres, apellidos, estado: 'rechazado' },
  //   });
  //   if (fnError) {
  //     console.warn('notificar-cliente error:', fnError, data);
  //   }
  // }
  
  /** Suscripción realtime a cambios en 'usuarios' (acordate de desuscribirte en ngOnDestroy) */
  watch(onChange: () => void): RealtimeChannel {
    return this.supa.client
      .channel('usuarios-pendientes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.TABLE },
        onChange
      )
      .subscribe();
  }

  /** Invoca la Edge Function que envía el correo al cliente */
  // async notificarCliente(
  //   to: string,
  //   type: NotifyType,
  //   nombre?: string,
  //   apellidos?: string
  // ): Promise<{ ok: boolean; id?: string }> {
  //   const { data, error } = await this.supa.client.functions.invoke('notificar-cliente', {
  //     body: { to, type, nombre, apellidos },
  //   });
  //   if (error) throw error;
  //   return data as { ok: boolean; id?: string };
  // }

  
  private async notify(email: string, nombres: string, apellidos: string, estado: 'aprobado' | 'rechazado' | 'pendiente'): Promise<NotifyResult> {
    try {
      const { data, error } = await this.supa.client.functions.invoke('notificar-cliente', {
        body: { email, nombres, apellidos, estado },
      });

      if (error) {
        // error propio del invoke (red, auth, etc.)
        // Si el error tiene un mensaje con "non-2xx", intentar extraer el detalle del data
        const errorMsg = error.message ?? String(error);
        if (errorMsg.includes('non-2xx') || errorMsg.includes('status code')) {
          // Intentar obtener el detalle del data si está disponible
          if (data && typeof data === 'object') {
            const detail = (data as any).detail || (data as any).error || errorMsg;
            return { ok: false, detail: String(detail) };
          }
        }
        return { ok: false, detail: errorMsg };
      }
      
      // La función devuelve { ok:true } o { ok:false, detail? }
      if (data && typeof data === 'object') {
        if ((data as any).ok === false) {
          return { ok: false, detail: (data as any).detail || (data as any).error || 'Fallo desconocido' };
        }
        if ((data as any).ok === true) {
          return { ok: true };
        }
      }
      
      // Si no hay data o no tiene la estructura esperada, asumir éxito
      return { ok: true };
    } catch (e: any) {
      // Si el error tiene información sobre el status code, intentar extraer el detalle
      const errorMsg = e?.message ?? String(e);
      if (errorMsg.includes('non-2xx') || errorMsg.includes('status code')) {
        // Intentar obtener el detalle del error si está disponible
        if (e?.context?.data) {
          const detail = e.context.data.detail || e.context.data.error || errorMsg;
          return { ok: false, detail: String(detail) };
        }
      }
      return { ok: false, detail: errorMsg };
    }
  }
}
