// import { Injectable } from '@angular/core';
// import { SupabaseService } from './supabase.service';
// import { LocalNotifications } from '@capacitor/local-notifications';

// @Injectable({ providedIn: 'root' })
// export class MaitreRealtimeService {
//   private channel?: ReturnType<SupabaseService['client']['channel']>;

//   constructor(private supa: SupabaseService) {}

//   async init() {
//     // permisos notificaciones locales
//     const perm = await LocalNotifications.checkPermissions();
//     if (perm.display !== 'granted') await LocalNotifications.requestPermissions();

//     // canal realtime
//     this.channel = this.supa.client
//       .channel('lista_espera_inserts')
//       .on('postgres_changes', {
//         event: 'INSERT',
//         schema: 'public',
//         table: 'lista_espera'
//       }, async (payload) => {
//         const it = payload.new as any;
//         await LocalNotifications.schedule({
//           notifications: [{
//             id: Date.now() % 2147483647,
//             title: 'Nuevo cliente en espera',
//             body: `${it.nombre} (${it.cantidad_comensales || '-' } comensales)`,
//             smallIcon: 'ic_stat_notify', // opcional (colocás un icono en android)
//           }]
//         });
//       })
//       .subscribe();
//   }

//   dispose() { this.channel?.unsubscribe(); }
// }
// services/maitre-realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class MaitreRealtimeService implements OnDestroy {
  private ch?: RealtimeChannel;
  private inited = false;

  constructor(private supa: SupabaseService) {}

  async init() {
    console.log('[MaitreRealtimeService] 🚀 Inicializando servicio...');
    if (this.inited) {
      console.log('[MaitreRealtimeService] ⚠️ Servicio ya inicializado');
      return;
    }
    this.inited = true;

    console.log('[MaitreRealtimeService] 🔐 Verificando permisos de notificaciones...');
    const perm = await LocalNotifications.checkPermissions();
    console.log('[MaitreRealtimeService] 📱 Permisos actuales:', perm);
    
    if (perm.display !== 'granted') {
      console.log('[MaitreRealtimeService] 🔐 Solicitando permisos...');
      await LocalNotifications.requestPermissions();
    }
    
    console.log('[MaitreRealtimeService] 📺 Creando canal de notificaciones...');
    await LocalNotifications.createChannel?.({
      id: 'maitre',
      name: 'Maître',
      description: 'Avisos de lista de espera',
      importance: 5, visibility: 1,
    });

    // 👉 Nos suscribimos a INSERT y UPDATE para detectar nuevos clientes en espera
    console.log('[MaitreRealtimeService] 🔗 Configurando canal realtime...');
    console.log('[MaitreRealtimeService] 👤 idUsuario:', this.supa.idUsuario);
    
    // Canal único para todas las suscripciones
    const channelName = `le_estado_esperando_${this.supa.idUsuario || 'maitre'}_${Date.now()}`;
    console.log('[MaitreRealtimeService] 📡 Nombre del canal:', channelName);
    
    this.ch = this.supa.client
      .channel(channelName)
      // INSERT: cuando se crea una nueva entrada con estado 'esperando'
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lista_espera',
        filter: 'estado=eq.esperando'
      }, async (payload) => {
        console.log('[MaitreRealtimeService] 🔔 INSERT detectado:', payload);
        const it: any = payload.new || {};
        console.log('[MaitreRealtimeService] 📋 Datos del INSERT:', {
          id: it.id,
          usuario_id: it.usuario_id,
          cantidad_comensales: it.cantidad_comensales,
          estado: it.estado
        });
        
        // Obtener la cantidad total de personas en lista de espera
        const totalPersonas = await this.getTotalPersonasEnEspera();
        
        console.log('[MaitreRealtimeService] 📱 Enviando notificación INSERT...');
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: 'Nuevo Cliente en lista de espera!!',
              body: `Hay ${totalPersonas} persona${totalPersonas !== 1 ? 's' : ''} en lista de espera`,
              channelId: 'maitre',
              smallIcon: 'ic_stat_notify',
            }]
          });
          console.log('[MaitreRealtimeService] ✅ Notificación INSERT enviada exitosamente');
        } catch (error) {
          console.error('[MaitreRealtimeService] ❌ Error al enviar notificación INSERT:', error);
        }
      })
      // UPDATE: cuando se actualiza una entrada y el estado nuevo es 'esperando'
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lista_espera',
        filter: 'estado=eq.esperando'    // <- Filtra por el estado NUEVO después del UPDATE
      }, async (payload) => {
        console.log('[MaitreRealtimeService] 🔄 UPDATE detectado:', payload);
        const it: any = payload.new || {};
        const oldIt: any = payload.old || {};
        
        console.log('[MaitreRealtimeService] 📊 Estados:', { 
          old: oldIt.estado, 
          new: it.estado,
          id: it.id
        });
        
        // Solo notificar si cambió DE otro estado A 'esperando'
        // Esto evita notificar cuando ya estaba en 'esperando' y solo se actualizó otro campo
        if (oldIt.estado !== 'esperando' && it.estado === 'esperando') {
          console.log('[MaitreRealtimeService] ✅ Cambio válido: de', oldIt.estado, 'a esperando');
          
          // Obtener la cantidad total de personas en lista de espera
          const totalPersonas = await this.getTotalPersonasEnEspera();

          console.log('[MaitreRealtimeService] 📱 Enviando notificación UPDATE...');
          try {
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: 'Nuevo Cliente en lista de espera!!',
                body: `Hay ${totalPersonas} persona${totalPersonas !== 1 ? 's' : ''} en lista de espera`,
                channelId: 'maitre',
                smallIcon: 'ic_stat_notify',
              }]
            });
            console.log('[MaitreRealtimeService] ✅ Notificación UPDATE enviada exitosamente');
          } catch (error) {
            console.error('[MaitreRealtimeService] ❌ Error al enviar notificación UPDATE:', error);
          }
        } else {
          console.log('[MaitreRealtimeService] ⏭️ No se notifica:', {
            razon: oldIt.estado === 'esperando' ? 'ya estaba en esperando' : `estado nuevo no es esperando (es: ${it.estado})`
          });
        }
      })
      .subscribe((status) => {
        console.log('[MaitreRealtimeService] 📡 Estado de suscripción:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[MaitreRealtimeService] ✅ Suscripción activa - Escuchando cambios en lista_espera');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[MaitreRealtimeService] ❌ Error en el canal realtime');
        }
      });
    
    console.log('[MaitreRealtimeService] ✅ Servicio inicializado correctamente');
  }

  /**
   * Obtiene la cantidad total de personas en lista de espera
   * Suma todas las cantidad_comensales de los registros con estado 'esperando'
   */
  private async getTotalPersonasEnEspera(): Promise<number> {
    try {
      const { data, error } = await this.supa.client
        .from('lista_espera')
        .select('cantidad_comensales')
        .eq('estado', 'esperando');

      if (error) {
        console.error('[MaitreRealtimeService] ❌ Error al obtener total de personas:', error);
        return 0;
      }

      const total = (data || []).reduce((sum, item) => {
        return sum + (item.cantidad_comensales || 0);
      }, 0);

      console.log('[MaitreRealtimeService] 📊 Total de personas en espera:', total);
      return total;
    } catch (error) {
      console.error('[MaitreRealtimeService] ❌ Error al calcular total:', error);
      return 0;
    }
  }

  dispose() { this.ch?.unsubscribe(); this.ch = undefined; this.inited = false; }
  ngOnDestroy() { this.dispose(); }
}
