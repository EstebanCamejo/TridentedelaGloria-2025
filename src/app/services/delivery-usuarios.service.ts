import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface DeliveryUsuario {
  auth_id: string;
  email: string;
  nombres?: string;
  apellidos?: string;
  estado?: string;
}

@Injectable({ providedIn: 'root' })
export class DeliveryUsuariosService {
  constructor(private supa: SupabaseService) {}

  /**
   * Obtiene todos los usuarios delivery disponibles (activos)
   */
  async getDeliveryUsuariosDisponibles(): Promise<DeliveryUsuario[]> {
    console.log('[DeliveryUsuariosService] Obteniendo usuarios delivery disponibles...');

    try {
      const { data: usuarios, error } = await this.supa.client
        .from('usuarios')
        .select('auth_id, email, nombres, apellidos, estado')
        .eq('perfil', 'delivery')
        .or('estado.is.null,estado.eq.activo,estado.eq.aprobado') // Usuarios activos o aprobados
        .order('nombres', { ascending: true });

      if (error) {
        console.error('[DeliveryUsuariosService] Error al obtener usuarios delivery:', error);
        throw error;
      }

      if (!usuarios || usuarios.length === 0) {
        console.log('[DeliveryUsuariosService] No hay usuarios delivery disponibles');
        return [];
      }

      console.log(`[DeliveryUsuariosService] ${usuarios.length} usuarios delivery encontrados`);
      
      return usuarios.map(u => ({
        auth_id: u.auth_id,
        email: u.email || '',
        nombres: u.nombres || '',
        apellidos: u.apellidos || '',
        estado: u.estado || 'activo'
      }));

    } catch (error) {
      console.error('[DeliveryUsuariosService] Error al obtener usuarios delivery:', error);
      throw error;
    }
  }

  /**
   * Verifica si un delivery está disponible (no tiene pedidos asignados activos)
   */
  async verificarDisponibilidadDelivery(authId: string): Promise<boolean> {
    try {
      // Verificar si tiene pedidos asignados en estados activos
      const { data: pedidosAsignados, error } = await this.supa.client
        .from('pedidos')
        .select('id')
        .eq('idDelivery', authId)
        .in('estado', [
          'asignado a delivery',
          'confirmado por delivery',
          'en camino'
        ])
        .limit(1);

      if (error) {
        console.error('[DeliveryUsuariosService] Error al verificar disponibilidad:', error);
        return false;
      }

      // Si no tiene pedidos asignados activos, está disponible
      return !pedidosAsignados || pedidosAsignados.length === 0;

    } catch (error) {
      console.error('[DeliveryUsuariosService] Error al verificar disponibilidad:', error);
      return false;
    }
  }
}

