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
    
    this.ch = this.supa.client
      .channel(`le_estado_esperando_${this.supa.idUsuario || 'maitre'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lista_espera',
        filter: 'estado=eq.esperando',    // <- INSERTs que van directo a 'esperando'
      }, async (payload) => {
        console.log('[MaitreRealtimeService] 🔔 INSERT detectado:', payload);
        const it: any = payload.new || {};
        const nombre = it.nombre || it.alias || 'Cliente';
        const cant = it.cantidad_comensales ?? '-';

        console.log('[MaitreRealtimeService] 📱 Enviando notificación INSERT...');
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title: 'Nuevo Cliente en lista de espera!!',
            body: `(${cant} comensales) esperando ingresar`,
            channelId: 'maitre',
            smallIcon: 'ic_stat_notify',
          }]
        });
        console.log('[MaitreRealtimeService] ✅ Notificación INSERT enviada');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lista_espera',
        filter: 'estado=eq.esperando',    // <- UPDATEs que dejan estado en 'esperando'
      }, async (payload) => {
        console.log('[MaitreRealtimeService] 🔄 UPDATE detectado:', payload);
        const it: any = payload.new || {};
        const oldIt: any = payload.old || {};
        
        console.log('[MaitreRealtimeService] 📊 Estados:', { 
          old: oldIt.estado, 
          new: it.estado 
        });
        
        // Solo notificar si cambió DE otro estado A 'esperando'
        if (oldIt.estado !== 'esperando' && it.estado === 'esperando') {
          const nombre = it.nombre || it.alias || 'Cliente';
          const cant = it.cantidad_comensales ?? '-';

          console.log('[MaitreRealtimeService] 📱 Enviando notificación UPDATE...');
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: 'Nuevo Cliente en lista de espera!!',
              body: `(${cant} comensales) esperando ingresar`,
              channelId: 'maitre',
              smallIcon: 'ic_stat_notify',
            }]
          });
          console.log('[MaitreRealtimeService] ✅ Notificación UPDATE enviada');
        } else {
          console.log('[MaitreRealtimeService] ⏭️ No se notifica (no cambió a esperando)');
        }
      })
      .subscribe();
    
    console.log('[MaitreRealtimeService] ✅ Servicio inicializado correctamente');
  }

  dispose() { this.ch?.unsubscribe(); this.ch = undefined; this.inited = false; }
  ngOnDestroy() { this.dispose(); }
}
