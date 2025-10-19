// src/app/services/admin-realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AdminRealtimeService implements OnDestroy {
  private chPago?: RealtimeChannel;
  private inited = false;

  constructor(private supa: SupabaseService) {}

  async init() {
    if (this.inited) return;
    this.inited = true;

    // Solicitar permisos de notificaciones
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Crear canal de notificaciones para administradores
    await LocalNotifications.createChannel?.({
      id: 'admin',
      name: 'Administrador',
      description: 'Notificaciones de administración',
      importance: 5,
      visibility: 1,
    });

    console.log('[AdminRealtimeService] Iniciando realtime para administradores...');

    // Suscribirse a notificaciones de pago confirmado
    this.chPago = this.supa.client.channel('notificacion_admin_pago');
    console.log('[AdminRealtimeService] Canal creado:', this.chPago);
    console.log('[AdminRealtimeService] Cliente Supabase:', this.supa.client);
    this.chPago
      .on('broadcast', { event: 'mesa_liberada' }, async (payload) => {
        console.log('[AdminRealtimeService] 💳 Mesa liberada recibida:', payload);
        
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: `💰 Pago realizado - Mesa ${payload['payload'].mesa_numero}`,
              body: payload['payload'].mensaje,
              channelId: 'admin',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/home-admin',
                mesaNumero: payload['payload'].mesa_numero
              }
            }]
          });
          
          console.log('[AdminRealtimeService] ✅ Notificación de mesa liberada enviada al admin');
        } catch (error) {
          console.error('[AdminRealtimeService] ❌ Error al enviar notificación de mesa liberada:', error);
        }
      })
      .subscribe((status) => {
        console.log('[AdminRealtimeService] Canal admin pago suscrito con estado:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[AdminRealtimeService] ✅ Canal admin pago suscrito correctamente');
        } else {
          console.log('[AdminRealtimeService] ❌ Error en suscripción del canal admin pago');
        }
      });
  }

  dispose() {
    if (this.chPago) {
      this.supa.client.removeChannel(this.chPago as any);
      this.chPago = undefined;
    }
    this.inited = false;
  }

  ngOnDestroy() {
    this.dispose();
  }
}
