// src/app/services/admin-reservas-realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AdminReservasRealtimeService implements OnDestroy {
  private chReservas?: RealtimeChannel;
  private inited = false;

  constructor(private supa: SupabaseService) {}

  async init() {
    if (this.inited) return;
    this.inited = true;

    console.log('[AdminReservasRealtimeService] 🚀 Inicializando servicio de notificaciones de reservas...');

    // Solicitar permisos de notificaciones
    const perm = await LocalNotifications.checkPermissions();
    console.log('[AdminReservasRealtimeService] 📱 Permisos actuales:', perm);
    
    if (perm.display !== 'granted') {
      console.log('[AdminReservasRealtimeService] 🔐 Solicitando permisos...');
      await LocalNotifications.requestPermissions();
    }

    // Crear canal de notificaciones para administradores
    await LocalNotifications.createChannel?.({
      id: 'admin_reservas',
      name: 'Reservas Admin',
      description: 'Notificaciones de nuevas reservas',
      importance: 5,
      visibility: 1,
    });

    console.log('[AdminReservasRealtimeService] 📺 Canal de notificaciones creado');

    // Suscribirse a INSERTs en la tabla reservas
    this.chReservas = this.supa.client
      .channel('admin_reservas_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reservas'
      }, async (payload) => {
        console.log('[AdminReservasRealtimeService] 🔔 Nueva reserva detectada:', payload);
        
        const reserva = payload.new as any;
        
        // Verificar que la reserva tenga los datos necesarios
        if (!reserva || !reserva.fecha || !reserva.hora) {
          console.warn('[AdminReservasRealtimeService] ⚠️ Datos de reserva incompletos:', reserva);
          return;
        }
        
        // Formatear la fecha para la notificación
        const fechaFormateada = this.formatearFecha(reserva.fecha);
        const horaFormateada = this.formatearHora(reserva.hora);
        
        const titulo = '📅 Nueva Reserva Creada';
        const mensaje = `${reserva.nombre_cliente || 'Cliente'} - ${fechaFormateada} a las ${horaFormateada} (${reserva.cantidad_comensales} persona${reserva.cantidad_comensales > 1 ? 's' : ''})`;
        
        console.log('[AdminReservasRealtimeService] 📱 Preparando notificación:', { titulo, mensaje });
        
        try {
          const result = await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: titulo,
              body: mensaje,
              channelId: 'admin_reservas',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/admin/reservas',
                reservaId: reserva.id,
                tipo: 'nueva_reserva'
              }
            }]
          });
          
          console.log('[AdminReservasRealtimeService] ✅ Notificación de nueva reserva enviada:', result);
        } catch (error) {
          console.error('[AdminReservasRealtimeService] ❌ Error al enviar notificación de reserva:', error);
        }
      })
      .subscribe((status) => {
        console.log('[AdminReservasRealtimeService] Canal reservas suscrito con estado:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[AdminReservasRealtimeService] ✅ Canal reservas suscrito correctamente');
        } else {
          console.log('[AdminReservasRealtimeService] ❌ Error en suscripción del canal reservas');
        }
      });
  }

  /**
   * Formatea la fecha para mostrar en la notificación
   */
  private formatearFecha(fecha: string): string {
    try {
      const [year, month, day] = fecha.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return fecha;
    }
  }

  /**
   * Formatea la hora para mostrar en la notificación
   */
  private formatearHora(hora: string): string {
    try {
      if (hora.includes(':')) {
        const [hours, minutes] = hora.split(':');
        return `${hours}:${minutes}`;
      }
      return hora;
    } catch (error) {
      console.error('Error al formatear hora:', error);
      return hora;
    }
  }

  dispose() {
    if (this.chReservas) {
      this.supa.client.removeChannel(this.chReservas as any);
      this.chReservas = undefined;
    }
    this.inited = false;
    console.log('[AdminReservasRealtimeService] 🧹 Servicio de reservas limpiado');
  }

  ngOnDestroy() {
    this.dispose();
  }
}
