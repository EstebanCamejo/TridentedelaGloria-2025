// src/app/services/cliente-realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ClienteChatRealtimeService } from './cliente-chat-realtime.service';

@Injectable({ providedIn: 'root' })
export class ClienteRealtimeService implements OnDestroy {
  private chMesa?: RealtimeChannel;
  private chChat?: RealtimeChannel;
  private chPedidos?: RealtimeChannel;
  private inited = false;

  constructor(
    private supa: SupabaseService,
    private clienteChatRt: ClienteChatRealtimeService
  ) {}

  async init() {
    if (this.inited) return;
    this.inited = true;

    // Solicitar permisos de notificaciones
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Crear canal de notificaciones para clientes
    await LocalNotifications.createChannel?.({
      id: 'cliente',
      name: 'Cliente',
      description: 'Avisos de mesa asignada',
      importance: 5,
      visibility: 1,
    });

    // Obtener el ID del usuario actual
    const userId = this.supa.idUsuario;
    if (!userId) {
      console.warn('[ClienteRealtimeService] No hay usuario logueado, no se puede iniciar realtime');
      return;
    }

    console.log('[ClienteRealtimeService] Iniciando realtime para usuario:', userId);

    // 1️⃣ Suscribirse a cambios en lista_espera cuando se asigna mesa al usuario actual
    this.chMesa = this.supa.client
      .channel(`mesa_asignada_${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lista_espera',
        filter: `usuario_id=eq.${userId}`,
      }, async (payload) => {
        const newRow: any = payload.new || {};
        const oldRow: any = payload.old || {};

        console.log('[ClienteRealtimeService] Cambio detectado:', { old: oldRow, new: newRow });

        // Solo notificar si cambió de otro estado a 'asignado'
        if (oldRow.estado !== 'asignado' && newRow.estado === 'asignado') {
          console.log('[ClienteRealtimeService] ✅ Mesa asignada!', newRow);

          // Obtener el número de mesa desde la tabla mesas
          let numeroMesa = '?';
          if (newRow.mesa_id) {
            const { data: mesa } = await this.supa.client
              .from('mesas')
              .select('numero')
              .eq('id', newRow.mesa_id)
              .single();
            
            if (mesa?.numero) {
              numeroMesa = String(mesa.numero);
            }
          }

          // Programar la notificación local
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: '¡Tu mesa está lista!',
              body: `Mesa N° ${numeroMesa} - Por favor acercate al restaurant`,
              channelId: 'cliente',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/home-cliente',
                mesaNumero: numeroMesa
              }
            }]
          });

          console.log('[ClienteRealtimeService] 🔔 Notificación enviada para mesa', numeroMesa);
        }
      })
      .subscribe((status) => {
        console.log('[ClienteRealtimeService] Canal mesa suscrito con estado:', status);
      });

    // 2️⃣ Suscribirse a mensajes del chat (cuando el mozo responde)
    this.chChat = this.supa.client
      .channel(`cliente_chat_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, async (payload) => {
        const mensaje: any = payload.new || {};
        
        console.log('[ClienteRealtimeService] Nuevo mensaje detectado:', mensaje);

        // Solo notificar si el mensaje NO es del cliente actual
        if (mensaje.from_uid === userId) {
          console.log('[ClienteRealtimeService] Mensaje propio, no notificar');
          return;
        }

        // Verificar que el mensaje pertenece a una sala del cliente
        const { data: room } = await this.supa.client
          .from('chat_rooms')
          .select('id, mesa_num, cliente_uid')
          .eq('id', mensaje.room_id)
          .eq('cliente_uid', userId)
          .single();

        if (!room) {
          console.log('[ClienteRealtimeService] Mensaje no pertenece a sala del cliente');
          return;
        }

        // Programar la notificación local
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title: 'Respuesta del Mozo',
            body: mensaje.text?.substring(0, 100) || 'Tienes una nueva respuesta',
            channelId: 'cliente',
            smallIcon: 'ic_stat_notify',
            extra: { 
              route: '/cliente/chat',
              roomId: mensaje.room_id,
              mesaNumero: room.mesa_num
            }
          }]
        });

        console.log('[ClienteRealtimeService] 🔔 Notificación de chat enviada');
      })
      .subscribe((status) => {
        console.log('[ClienteRealtimeService] Canal chat suscrito con estado:', status);
        
        // Inicializar también el servicio de chat para clientes
        this.clienteChatRt.init().catch(err => {
          console.error('[ClienteRealtimeService] Error al inicializar chat:', err);
        });
      });

    // 3️⃣ Suscribirse a cambios en pedidos del cliente actual
    this.chPedidos = this.supa.client
      .channel(`cliente_pedidos_${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
        filter: `idCliente=eq.${userId}`,
      }, async (payload) => {
        const pedido: any = payload.new || {};
        const oldPedido: any = payload.old || {};
        
        console.log('[ClienteRealtimeService] Cambio en pedido detectado:', { 
          nuevo: pedido.estado, 
          anterior: oldPedido.estado 
        });

        // Notificar cuando el pedido cambia a 'pendiente aceptación'
        if (pedido.estado === 'pendiente aceptación' && oldPedido.estado !== 'pendiente aceptación') {
          console.log('[ClienteRealtimeService] ✅ Pedido entregado, notificando al cliente!');

          // Obtener número de mesa del cliente
          const { data: listaEspera, error: errorMesa } = await this.supa.client
            .from('lista_espera')
            .select('numero_mesa')
            .eq('usuario_id', userId)
            .eq('estado', 'asignado')
            .single();

          if (errorMesa) {
            console.error('[ClienteRealtimeService] Error al obtener mesa:', errorMesa);
          }

          const mesaNumero = listaEspera?.numero_mesa || 0;

          try {
            // Programar notificación LOCAL para pedido entregado
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: `🍽️ Pedido entregado - Mesa ${mesaNumero}`,
                body: `¿El pedido está correcto? Total: $${pedido.total || 0}`,
                channelId: 'cliente',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/cliente-pedido-en-curso',
                  pedidoId: pedido.id,
                  mesaNumero,
                  estado: 'pendiente aceptación'
                }
              }]
            });

            console.log('[ClienteRealtimeService] 🔔 Notificación de pedido entregado enviada al cliente');
          } catch (error) {
            console.error('[ClienteRealtimeService] Error al enviar notificación de pedido entregado:', error);
          }
        }

        // Notificar cuando el pedido es rechazado por el mozo
        if (pedido.estado === 'rechazado por mozo' && oldPedido.estado !== 'rechazado por mozo') {
          console.log('[ClienteRealtimeService] ❌ Pedido rechazado por mozo, notificando al cliente!');

          // Obtener número de mesa del cliente
          const { data: listaEspera, error: errorMesa } = await this.supa.client
            .from('lista_espera')
            .select('numero_mesa')
            .eq('usuario_id', userId)
            .eq('estado', 'asignado')
            .single();

          if (errorMesa) {
            console.error('[ClienteRealtimeService] Error al obtener mesa:', errorMesa);
          }

          const mesaNumero = listaEspera?.numero_mesa || 0;

          try {
            // Programar notificación LOCAL para pedido rechazado
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: `❌ Pedido rechazado - Mesa ${mesaNumero}`,
                body: `El mozo rechazó tu pedido. Puedes modificarlo y enviarlo nuevamente.`,
                channelId: 'cliente',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/cliente-pedido-en-curso',
                  pedidoId: pedido.id,
                  mesaNumero,
                  estado: 'rechazado por mozo'
                }
              }]
            });

            console.log('[ClienteRealtimeService] 🔔 Notificación de pedido rechazado enviada al cliente');
          } catch (error) {
            console.error('[ClienteRealtimeService] Error al enviar notificación de pedido rechazado:', error);
          }
        }
      })
      .subscribe((status) => {
        console.log('[ClienteRealtimeService] Canal pedidos suscrito con estado:', status);
      });

    // 🆕 Suscribirse a notificaciones de pago confirmado
    const pagoChannel = this.supa.client.channel('notificacion_cliente_pago');
    pagoChannel
      .on('broadcast', { event: 'pago_confirmado' }, async (payload) => {
        console.log('[ClienteRealtimeService] 💳 Pago confirmado recibido:', payload);
        
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: `✅ Pago confirmado - Mesa ${payload['payload'].mesa_numero}`,
              body: payload['payload'].mensaje,
              channelId: 'cliente',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/home-cliente',
                mesaNumero: payload['payload'].mesa_numero
              }
            }]
          });
          
          console.log('[ClienteRealtimeService] ✅ Notificación de pago confirmado enviada al cliente');
        } catch (error) {
          console.error('[ClienteRealtimeService] ❌ Error al enviar notificación de pago confirmado:', error);
        }
      })
      .subscribe();
  }

  dispose() {
    if (this.chMesa) {
      this.supa.client.removeChannel(this.chMesa as any);
      this.chMesa = undefined;
    }
    if (this.chChat) {
      this.supa.client.removeChannel(this.chChat as any);
      this.chChat = undefined;
    }
    if (this.chPedidos) {
      this.supa.client.removeChannel(this.chPedidos as any);
      this.chPedidos = undefined;
    }
    // Finalizar también el servicio de chat
    this.clienteChatRt.dispose();
    this.inited = false;
  }

  ngOnDestroy() {
    this.dispose();
  }
}

