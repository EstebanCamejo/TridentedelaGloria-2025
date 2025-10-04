// import { Injectable } from '@angular/core';
// import { SupabaseService } from './supabase.service';

// export interface EsperaItem {
//   id: number;
//   usuario_id: string;
//   nombre: string;
//   email: string | null;
//   foto_url: string | null;
//   created_at: string;
//   cantidad_comensales?: number;
//   nota?: string | null;
// }

// @Injectable({ providedIn: 'root' })
// export class MaitreWaitlistService {
//   constructor(private supa: SupabaseService) {}

//   /** Trae los que están 'esperando' y les junta datos del usuario. */
//   async fetch(): Promise<EsperaItem[]> {
//     const { data: rows, error } = await this.supa.client
//       .from('lista_espera')
//       .select('id, usuario_id, cantidad_comensales, nota, created_at')
//       .eq('estado', 'esperando')
//       .order('created_at', { ascending: true });
//     if (error) throw error;
//     const espera = rows ?? [];
//     if (!espera.length) return [];

//     const ids = Array.from(new Set(espera.map(r => r.usuario_id)));
//     const { data: users, error: uErr } = await this.supa.client
//       .from('usuarios')
//       .select('auth_id, nombres, apellidos, email, foto_url')
//       .in('auth_id', ids);
//     if (uErr) throw uErr;

//     const byAuth = new Map<string, any>((users ?? []).map(u => [u.auth_id, u]));

//     return espera.map((r: any) => {
//       const u = byAuth.get(r.usuario_id);
//       return {
//         id: r.id,
//         usuario_id: r.usuario_id,
//         created_at: r.created_at,
//         cantidad_comensales: r.cantidad_comensales,
//         nota: r.nota,
//         nombre: [u?.nombres, u?.apellidos].filter(Boolean).join(' ') || 'Cliente',
//         email: u?.email ?? null,
//         foto_url: u?.foto_url ?? null,
//       };
//     });
//   }

//   /** Asigna número de mesa → estado='asignado' + mesa_id. */
//   async assign(waitId: number, mesaId: number) {
//     const { data, error } = await this.supa.client
//       .from('lista_espera')
//       .update({ estado: 'asignado', mesa_id: mesaId })
//       .eq('id', waitId)
//       .select()
//       .single();
//     if (error) throw error;
//     return data;
//   }
// }
// src/app/services/maitre-waitlist.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface EsperaItem {
  id: number;
  usuario_id: string;
  nombre: string;
  email: string | null;
  foto_url: string | null;
  created_at: string;
  cantidad_comensales?: number;
  nota?: string | null;
}

export interface MesaLite {
  id: string;      // uuid
  numero: number;  // int
}

@Injectable({ providedIn: 'root' })
export class MaitreWaitlistService {
  constructor(private supa: SupabaseService) {}

  /** Trae los que están 'esperando' y junta datos del usuario. */
  async fetch(): Promise<EsperaItem[]> {
    const { data: rows, error } = await this.supa.client
      .from('lista_espera')
      .select('id, usuario_id, cantidad_comensales, nota, created_at')
      .eq('estado', 'esperando')
      .order('created_at', { ascending: true });
    if (error) throw error;

    const espera = rows ?? [];
    if (!espera.length) return [];

    const ids = Array.from(new Set(espera.map(r => r.usuario_id)));
    const { data: users, error: uErr } = await this.supa.client
      .from('usuarios')
      .select('auth_id, nombres, apellidos, email, foto_url')
      .in('auth_id', ids);
    if (uErr) throw uErr;

    const byAuth = new Map<string, any>((users ?? []).map(u => [u.auth_id, u]));

    return espera.map((r: any) => {
      const u = byAuth.get(r.usuario_id);
      return {
        id: r.id,
        usuario_id: r.usuario_id,
        created_at: r.created_at,
        cantidad_comensales: r.cantidad_comensales,
        nota: r.nota,
        nombre: [u?.nombres, u?.apellidos].filter(Boolean).join(' ') || 'Cliente',
        email: u?.email ?? null,
        foto_url: u?.foto_url ?? null,
      };
    });
  }

  /** Mesas con estado = 'libre', ordenadas por número. */
  async getFreeTables(): Promise<MesaLite[]> {
    const { data, error } = await this.supa.client
      .from('mesas')
      .select('id, numero')
      .eq('estado', 'libre')
      .order('numero', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  /** Llama a la RPC para asignar y ocupar en 1 transacción. */
async assignAtomic(waitId: number, mesaId: string) {
  const { data: numero, error } = await this.supa.client
    .rpc('maitre_assign_mesa_v2', { p_wait_id: waitId, p_mesa_id: mesaId });
  if (error) throw error;
  return numero as number;
}
}
