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
    console.log('[AdminReservasRealtimeService] 🚀 Inicializando servicio de notificaciones de reservas...');
    if (this.inited) {
      console.log('[AdminReservasRealtimeService] ⚠️ Servicio ya inicializado');
      return;
    }
    this.inited = true;

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

    // Configurar canal realtime (igual que el maitre)
    console.log('[AdminReservasRealtimeService] 🔗 Configurando canal realtime...');
    console.log('[AdminReservasRealtimeService] 👤 idUsuario:', this.supa.idUsuario);
    
    // Suscribirse a INSERTs en la tabla reservas (igual que el maitre con lista_espera)
    // Nota: Escuchamos TODOS los INSERTs y filtramos por estado en el callback
    // porque 'pendiente confirmacion' tiene espacios y no funciona en el filtro
    this.chReservas = this.supa.client
      .channel(`admin_reservas_${this.supa.idUsuario || 'admin'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reservas'
      }, async (payload) => {
        console.log('[AdminReservasRealtimeService] 🔔 INSERT detectado:', payload);
        const reserva = payload.new as any;
        
        // Solo notificar si el estado es 'pendiente confirmacion'
        if (reserva.estado !== 'pendiente confirmacion') {
          console.log('[AdminReservasRealtimeService] ⏭️ Estado diferente a "pendiente confirmacion". Estado:', reserva.estado);
          return;
        }
        
        // Formatear la fecha para la notificación
        const fechaFormateada = this.formatearFecha(reserva.fecha);
        const horaFormateada = this.formatearHora(reserva.hora);
        
        const nombre = reserva.nombre_cliente || 'Cliente';
        const cant = reserva.cantidad_comensales || 1;
        
        console.log('[AdminReservasRealtimeService] 📱 Enviando notificación INSERT...');
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title: '📅 Nueva Reserva Creada',
            body: `${nombre} - ${fechaFormateada} a las ${horaFormateada} (${cant} persona${cant > 1 ? 's' : ''})`,
            channelId: 'admin_reservas',
            smallIcon: 'ic_stat_notify',
            extra: { 
              route: '/admin/reservas',
              reservaId: reserva.id,
              tipo: 'nueva_reserva'
            }
          }]
        });
        console.log('[AdminReservasRealtimeService] ✅ Notificación INSERT enviada');
      })
      .subscribe();
    
    console.log('[AdminReservasRealtimeService] ✅ Servicio inicializado correctamente');
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
    this.chReservas?.unsubscribe();
    this.chReservas = undefined;
    this.inited = false;
    console.log('[AdminReservasRealtimeService] 🧹 Servicio de reservas limpiado');
  }

  ngOnDestroy() {
    this.dispose();
  }
}
