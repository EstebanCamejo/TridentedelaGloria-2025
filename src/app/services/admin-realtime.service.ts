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
        if (pedido.tipo_pedido === 'delivery' && oldPedido.estado !== 'listo para entregar' && pedido.estado === 'listo para entregar') {
          console.log('[AdminRealtimeService] ✅ Pedido delivery listo para entregar detectado!', {
            pedidoId: pedido.id,
            tipo_pedido: pedido.tipo_pedido,
            estadoAnterior: oldPedido.estado,
            estadoNuevo: pedido.estado
          });

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
