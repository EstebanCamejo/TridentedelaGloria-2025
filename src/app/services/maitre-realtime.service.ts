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
    if (this.inited) return;
    this.inited = true;

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
    await LocalNotifications.createChannel?.({
      id: 'maitre',
      name: 'Maître',
      description: 'Avisos de lista de espera',
      importance: 5, visibility: 1,
    });

    // 👉 Nos suscribimos a UPDATE y filtramos directamente por NEW.estado=esperando
    this.ch = this.supa.client
      .channel(`le_estado_esperando_${this.supa.idUsuario || 'maitre'}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lista_espera',
        filter: 'estado=eq.esperando',    // <- clave: solo updates que dejan estado en 'esperando'
      }, async (payload) => {
        const it: any = payload.new || {};
        const nombre = it.nombre || it.alias || 'Cliente';
        const cant = it.cantidad_comensales ?? '-';

        // (Opcional) Evitar duplicado si ya estaba en 'esperando'
        // Si tenés replica identity y payload.old disponible:
        // if (payload.old?.estado === 'esperando') return;

        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title: 'Nuevo Cliente en lista de espera!!',
            body: `(${cant} comensales) esperando ingresar`,
            channelId: 'maitre',
            smallIcon: 'ic_stat_notify',
          }]
        });
      })
      .subscribe();
  }

  dispose() { this.ch?.unsubscribe(); this.ch = undefined; this.inited = false; }
  ngOnDestroy() { this.dispose(); }
}
