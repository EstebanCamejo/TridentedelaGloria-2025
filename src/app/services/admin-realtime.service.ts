// src/app/services/admin-realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AdminRealtimeService implements OnDestroy {
  private chPago?: RealtimeChannel;
  private chDelivery?: RealtimeChannel; // 🆕 Canal para pedidos delivery
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

    // 🆕 Suscribirse a notificaciones de pedidos delivery pendientes
    this.chDelivery = this.supa.client.channel('notificacion_admin_delivery');
    this.chDelivery
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pedidos',
        filter: 'tipo_pedido=eq.delivery',
      }, async (payload) => {
        const pedido: any = payload.new || {};
        
        // Solo notificar si es pedido delivery pendiente
        if (pedido.tipo_pedido === 'delivery' && pedido.estado === 'pendiente') {
          console.log('[AdminRealtimeService] ✅ Nuevo pedido delivery pendiente detectado!', {
            id: pedido.id,
            total: pedido.total || 'No calculado aún'
          });

          try {
            // Obtener email del cliente
            let clienteEmail = 'Cliente';
            if (pedido.idCliente) {
              const { data: usuario } = await this.supa.client
                .from('usuarios')
                .select('email')
                .eq('auth_id', pedido.idCliente)
                .maybeSingle();
              
              if (usuario?.email) {
                clienteEmail = usuario.email;
              }
            }

            // Obtener el total calculado desde la base de datos si no está disponible
            let totalPedido = pedido.total || 0;
            if (!totalPedido || totalPedido <= 0) {
              // Intentar obtener el total desde pedidos_detalles
              const { data: detalles } = await this.supa.client
                .from('pedidos_detalles')
                .select('cantidad, precioUnitario')
                .eq('idPedido', pedido.id);
              
              if (detalles && detalles.length > 0) {
                totalPedido = detalles.reduce((sum: number, d: any) => {
                  return sum + ((Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0));
                }, 0);
              }
            }

            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: `🚴 Nuevo pedido delivery #${pedido.id}`,
                body: `Cliente: ${clienteEmail}${totalPedido > 0 ? ` - Total: $${totalPedido}` : ''}`,
                channelId: 'admin',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/admin/delivery-pedidos',
                  pedidoId: pedido.id,
                  tipo: 'delivery'
                }
              }]
            });
            
            console.log('[AdminRealtimeService] ✅ Notificación de pedido delivery enviada al admin');
          } catch (error) {
            console.error('[AdminRealtimeService] ❌ Error al enviar notificación de pedido delivery:', error);
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
        filter: 'tipo_pedido=eq.delivery',
      }, async (payload) => {
        const pedido: any = payload.new || {};
        const oldPedido: any = payload.old || {};
        
        // Notificar cuando un pedido delivery cambia a "listo para entregar"
        // 🆕 IMPORTANTE: Verificar que TODOS los sectores estén listos antes de notificar (igual que mozo)
        if (pedido.tipo_pedido === 'delivery' && oldPedido.estado !== 'listo para entregar' && pedido.estado === 'listo para entregar') {
          console.log('[AdminRealtimeService] ✅ Cambio a "listo para entregar" detectado para delivery:', {
            pedidoId: pedido.id,
            tipo_pedido: pedido.tipo_pedido,
            estadoAnterior: oldPedido.estado,
            estadoNuevo: pedido.estado
          });

          // 🆕 Verificar que TODOS los sectores estén listos antes de notificar
          const todosLosSectoresListos = await this.verificarTodosLosSectoresListos(pedido.id);
          
          if (!todosLosSectoresListos) {
            console.log('[AdminRealtimeService] ⚠️ No todos los sectores están listos para delivery, esperando...');
            return;
          }

          console.log('[AdminRealtimeService] ✅ Todos los sectores están listos para delivery, enviando notificación!');

          try {
            await LocalNotifications.schedule({
              notifications: [{
                id: (Date.now() + 1) % 2147483647,
                title: `✅ Listo pedido delivery Nº${pedido.id}`,
                body: 'El pedido está listo para asignar a un delivery',
                channelId: 'admin',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/admin/delivery-pedidos',
                  pedidoId: pedido.id,
                  tipo: 'delivery',
                  tab: 'listos'
                }
              }]
            });
            
            console.log('[AdminRealtimeService] ✅ Notificación de pedido delivery listo enviada al admin');
          } catch (error) {
            console.error('[AdminRealtimeService] ❌ Error al enviar notificación de pedido delivery listo:', error);
          }
        }
      })
      .on('broadcast', { event: 'solicitud_cuenta_delivery' }, async (payload) => {
        console.log('[AdminRealtimeService] 💳 Solicitud de cuenta delivery recibida:', payload);
        
        try {
          const pedidoId = payload['payload']?.pedido_id;
          const mensaje = payload['payload']?.mensaje || 'Solicitud de confirmación de pago';
          
          await LocalNotifications.schedule({
            notifications: [{
              id: (Date.now() + 2) % 2147483647,
              title: `💳 Solicitud de cuenta - Delivery #${pedidoId}`,
              body: mensaje,
              channelId: 'admin',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/admin/delivery-confirmar-pago',
                pedidoId: pedidoId,
                tipo: 'delivery'
              }
            }]
          });
          
          console.log('[AdminRealtimeService] ✅ Notificación de solicitud de cuenta delivery enviada al admin');
        } catch (error) {
          console.error('[AdminRealtimeService] ❌ Error al enviar notificación de solicitud de cuenta delivery:', error);
        }
      })
      .subscribe((status) => {
        console.log('[AdminRealtimeService] Canal admin delivery suscrito con estado:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[AdminRealtimeService] ✅ Canal admin delivery suscrito correctamente');
        } else {
          console.log('[AdminRealtimeService] ❌ Error en suscripción del canal admin delivery');
        }
      });
  }

  /**
   * Verifica que todos los sectores del pedido estén listos para entregar
   * 🆕 Misma lógica que MozoRealtimeService para mantener consistencia
   */
  private async verificarTodosLosSectoresListos(pedidoId: number): Promise<boolean> {
    try {
      // Obtener los detalles del pedido para ver qué sectores están involucrados
      const { data: detalles, error: detallesError } = await this.supa.client
        .from('pedidos_detalles')
        .select(`
          menu!inner (
            tipo
          )
        `)
        .eq('idPedido', pedidoId);

      if (detallesError) {
        console.error('[AdminRealtimeService] Error al obtener detalles del pedido:', detallesError);
        return false;
      }

      // Determinar qué sectores están involucrados
      const tipos = detalles?.map(d => (d as any).menu?.tipo).filter(tipo => tipo) || [];
      const tienePlatos = tipos.includes('plato');
      const tieneBebidas = tipos.includes('bebida');

      console.log('[AdminRealtimeService] Sectores involucrados:', { tienePlatos, tieneBebidas });

      // Obtener el estado actual del pedido
      const { data: pedido, error: pedidoError } = await this.supa.client
        .from('pedidos')
        .select('estado, estado_sector_cocina, estado_sector_bar')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) {
        console.error('[AdminRealtimeService] Error al obtener estado del pedido:', pedidoError);
        return false;
      }

      // Verificar que todos los sectores involucrados estén listos
      let todosListos = true;

      if (tienePlatos) {
        const cocinaLista = pedido.estado_sector_cocina === 'listo para entregar';
        console.log('[AdminRealtimeService] Cocina lista:', cocinaLista);
        todosListos = todosListos && cocinaLista;
      }

      if (tieneBebidas) {
        const barListo = pedido.estado_sector_bar === 'listo para entregar';
        console.log('[AdminRealtimeService] Bar listo:', barListo);
        todosListos = todosListos && barListo;
      }

      console.log('[AdminRealtimeService] Todos los sectores listos:', todosListos);
      return todosListos;

    } catch (error) {
      console.error('[AdminRealtimeService] Error en verificarTodosLosSectoresListos:', error);
      return false;
    }
  }

  dispose() {
    if (this.chPago) {
      this.supa.client.removeChannel(this.chPago as any);
      this.chPago = undefined;
    }
    if (this.chDelivery) {
      this.supa.client.removeChannel(this.chDelivery as any);
      this.chDelivery = undefined;
    }
    this.inited = false;
  }

  ngOnDestroy() {
    this.dispose();
  }
}
