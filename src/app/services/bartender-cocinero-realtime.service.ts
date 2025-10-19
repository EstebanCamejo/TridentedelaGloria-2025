import { Injectable, OnDestroy } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SupabaseService } from './supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class BartenderCocineroRealtimeService implements OnDestroy {
  private ch?: RealtimeChannel;
  private inited = false;

  constructor(private supa: SupabaseService) {}

  async init() {
    if (this.inited) return;
    this.inited = true;

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();

    // Crear canal para notificaciones de bartender/cocinero
    await LocalNotifications.createChannel?.({
      id: 'bartender_cocinero',
      name: 'Bartender/Cocinero',
      description: 'Avisos de pedidos confirmados',
      importance: 5,
      visibility: 1,
    });

    // 👉 SIGUIENDO PATRÓN EXACTO DEL MAITRE: escuchar TODOS los UPDATEs
    this.ch = this.supa.client
      .channel(`bartender_cocinero_${this.supa.idUsuario || 'bartender'}`)
      
      // Escuchar TODOS los UPDATEs en pedidos (sin filtro)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
        // Sin filtro para detectar cualquier cambio
      }, async (payload) => {
        const pedido: any = payload.new || {};
        const oldPedido: any = payload.old || {};
        
        console.log('[BartenderCocineroRealtimeService] 🔍 UPDATE detectado en pedidos:', { 
          old: oldPedido.estado, 
          new: pedido.estado 
        });

        // 🔍 Filtrar cuando el estado es 'pedido en curso' (ignorar old si es undefined)
        if (pedido.estado === 'pedido en curso') {
          console.log('[BartenderCocineroRealtimeService] ✅ Pedido confirmado por mozo!', pedido);

        // Obtener número de mesa del cliente
        const { data: listaEspera, error: errorMesa } = await this.supa.client
          .from('lista_espera')
          .select('numero_mesa')
          .eq('usuario_id', pedido.idCliente)
          .eq('estado', 'asignado')
          .single();

        if (errorMesa) {
          console.error('[BartenderCocineroRealtimeService] Error al obtener mesa:', errorMesa);
        }

        const mesaNumero = listaEspera?.numero_mesa || 0;
        console.log('[BartenderCocineroRealtimeService] Mesa encontrada:', mesaNumero);

        try {
          // Programar notificación LOCAL (como maitre-cliente)
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: `🍽️ Nuevo pedido en curso - Mesa ${mesaNumero || '?'}`,
              body: `Total: $${pedido.total || 0} - Tiempo: ${pedido.tiempo_estimado || 0} min`,
              channelId: 'bartender_cocinero',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/bartender-cocinero/home',
                pedidoId: pedido.id,
                mesaNumero
              }
            }]
          });

          console.log('[BartenderCocineroRealtimeService] 🔔 Notificación LOCAL enviada');
        } catch (error) {
          console.error('[BartenderCocineroRealtimeService] Error al enviar notificación:', error);
        }
        } // Cerrar el if
      })
      .subscribe((status) => {
        console.log('[BartenderCocineroRealtimeService] Canal suscrito con estado:', status);
      });
  }

  dispose() {
    if (this.ch) {
      this.supa.client.removeChannel(this.ch);
      this.ch = undefined;
    }
    this.inited = false;
  }

  ngOnDestroy() {
    this.dispose();
  }
}
