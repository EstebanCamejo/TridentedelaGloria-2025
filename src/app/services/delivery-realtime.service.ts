import { Injectable, OnDestroy } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SupabaseService } from './supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class DeliveryRealtimeService implements OnDestroy {
  private ch?: RealtimeChannel;
  private chChat?: RealtimeChannel;
  private inited = false;

  constructor(private supa: SupabaseService) {}

  async init() {
    if (this.inited) {
      console.log('[DeliveryRealtimeService] ⚠️ Ya estaba inicializado, saltando...');
      return;
    }
    
    console.log('[DeliveryRealtimeService] 🚀 Inicializando servicio...');
    this.inited = true;

    const idDelivery = this.supa.idUsuario;
    if (!idDelivery) {
      console.warn('[DeliveryRealtimeService] No hay usuario delivery logueado');
      return;
    }

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    
    console.log('[DeliveryRealtimeService] 📱 Permisos de notificación:', perm.display);

    // Crear canal para notificaciones de delivery
    await LocalNotifications.createChannel?.({
      id: 'delivery_pedidos',
      name: 'Pedidos Delivery',
      description: 'Avisos de nuevos pedidos asignados y cambios de estado',
      importance: 5,
      visibility: 1,
    });

    // Crear canal para chat de delivery
    await LocalNotifications.createChannel?.({
      id: 'delivery_chat',
      name: 'Chat Delivery',
      description: 'Mensajes del cliente',
      importance: 5,
      visibility: 1,
    });

    // Suscribirse a cambios en pedidos asignados al delivery actual
    const channelName = `delivery_pedidos_${idDelivery}`;
    console.log(`[DeliveryRealtimeService] 📡 Suscribiéndose al canal: ${channelName}`);
    
    this.ch = this.supa.client
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `idDelivery=eq.${idDelivery}`,
      }, async (payload) => {
        const pedido: any = payload.new || {};
        const oldPedido: any = payload.old || {};

        console.log('[DeliveryRealtimeService] Cambio detectado en pedido:', { 
          nuevo: pedido.estado, 
          anterior: oldPedido.estado,
          tipo: pedido.tipo_pedido 
        });

        // Solo procesar pedidos delivery asignados a este delivery
        if (pedido.tipo_pedido !== 'delivery' || pedido.idDelivery !== idDelivery) {
          return;
        }

        // Notificar cuando se asigna un nuevo pedido
        if (oldPedido.estado !== 'asignado a delivery' && pedido.estado === 'asignado a delivery') {
          console.log('[DeliveryRealtimeService] ✅ Nuevo pedido asignado detectado!');

          try {
            // Obtener información del cliente
            let clienteEmail = 'Cliente';
            let direccion = 'Sin dirección';
            
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

            if (pedido.direccion_entrega) {
              direccion = pedido.direccion_entrega;
            }

            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: `🚚 Nuevo pedido asignado #${pedido.id}`,
                body: `Cliente: ${clienteEmail}\nDirección: ${direccion}\nTotal: $${pedido.total || 0}`,
                channelId: 'delivery_pedidos',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/home-delivery',
                  pedidoId: pedido.id,
                  tipo: 'delivery'
                }
              }]
            });
            
            console.log('[DeliveryRealtimeService] ✅ Notificación de pedido asignado enviada');
          } catch (error) {
            console.error('[DeliveryRealtimeService] ❌ Error al enviar notificación:', error);
          }
        }

        // Notificar cuando el cliente solicita la cuenta (pendiente confirmacion pago)
        if (oldPedido.estado !== 'pendiente confirmacion pago' && pedido.estado === 'pendiente confirmacion pago') {
          console.log('[DeliveryRealtimeService] ✅ Pedido con pago pendiente detectado!');

          try {
            await LocalNotifications.schedule({
              notifications: [{
                id: (Date.now() + 1) % 2147483647,
                title: `💰 Pago pendiente - Pedido #${pedido.id}`,
                body: 'El cliente solicita confirmar el pago',
                channelId: 'delivery_pedidos',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/home-delivery',
                  pedidoId: pedido.id,
                  tipo: 'delivery',
                  estado: 'pendiente confirmacion pago'
                }
              }]
            });
            
            console.log('[DeliveryRealtimeService] ✅ Notificación de pago pendiente enviada');
          } catch (error) {
            console.error('[DeliveryRealtimeService] ❌ Error al enviar notificación de pago:', error);
          }
        }

        // 🆕 Notificar cuando el admin confirma el pago (estado cambia a 'pagado')
        if (oldPedido.estado !== 'pagado' && pedido.estado === 'pagado') {
          console.log('[DeliveryRealtimeService] ✅ Pago confirmado por admin detectado!');

          try {
            await LocalNotifications.schedule({
              notifications: [{
                id: (Date.now() + 2) % 2147483647,
                title: `✅ Pago confirmado - Pedido #${pedido.id}`,
                body: 'El pago del cliente ha sido confirmado por el admin',
                channelId: 'delivery_pedidos',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/home-delivery',
                  pedidoId: pedido.id,
                  tipo: 'delivery',
                  estado: 'pagado'
                }
              }]
            });
            
            console.log('[DeliveryRealtimeService] ✅ Notificación de pago confirmado enviada');
          } catch (error) {
            console.error('[DeliveryRealtimeService] ❌ Error al enviar notificación de pago confirmado:', error);
          }
        }
      })
      .subscribe((status) => {
        console.log('[DeliveryRealtimeService] Canal pedidos suscrito con estado:', status);
      });

    // Suscribirse a mensajes del chat (cuando el cliente envía mensaje)
    // 🆕 MEJORADO: Filtrar directamente por salas donde delivery_uid = idDelivery
    this.chChat = this.supa.client
      .channel(`delivery_chat_${idDelivery}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, async (payload) => {
        const mensaje: any = payload.new || {};
        
        console.log('[DeliveryRealtimeService] 📨 Nuevo mensaje detectado:', {
          room_id: mensaje.room_id,
          from_uid: mensaje.from_uid,
          text: mensaje.text?.substring(0, 50)
        });

        // Solo notificar si el mensaje NO es del delivery actual
        if (mensaje.from_uid === idDelivery) {
          console.log('[DeliveryRealtimeService] Mensaje propio, no notificar');
          return;
        }

        // 🆕 Verificar que el mensaje pertenece a una sala de delivery asignada a este delivery
        const { data: room, error: roomError } = await this.supa.client
          .from('chat_rooms')
          .select('id, pedido_id, tipo_pedido, delivery_uid, cliente_uid')
          .eq('id', mensaje.room_id)
          .eq('delivery_uid', idDelivery) // 🆕 Filtrar directamente por delivery_uid
          .eq('tipo_pedido', 'delivery') // 🆕 Asegurar que es delivery
          .maybeSingle();

        if (roomError) {
          console.error('[DeliveryRealtimeService] ❌ Error al obtener sala:', roomError);
          return;
        }

        if (!room) {
          console.log('[DeliveryRealtimeService] Mensaje no pertenece a sala de delivery asignada a este usuario');
          return;
        }

        console.log('[DeliveryRealtimeService] ✅ Sala de delivery encontrada:', {
          room_id: room.id,
          pedido_id: room.pedido_id,
          delivery_uid: room.delivery_uid
        });

        // 🆕 Verificación adicional: verificar que el pedido está asignado a este delivery
        if (room.pedido_id) {
          const { data: pedido, error: pedidoError } = await this.supa.client
            .from('pedidos')
            .select('id, idDelivery, tipo_pedido')
            .eq('id', room.pedido_id)
            .maybeSingle();

          if (pedidoError) {
            console.error('[DeliveryRealtimeService] ❌ Error al verificar pedido:', pedidoError);
            return;
          }

          if (!pedido || pedido.idDelivery !== idDelivery || pedido.tipo_pedido !== 'delivery') {
            console.log('[DeliveryRealtimeService] Mensaje de pedido no asignado a este delivery', {
              pedidoIdDelivery: pedido?.idDelivery,
              idDeliveryActual: idDelivery,
              tipoPedido: pedido?.tipo_pedido
            });
            return;
          }
        }

        // Obtener información del cliente
        let clienteEmail = 'Cliente';
        if (mensaje.from_uid) {
          const { data: usuario } = await this.supa.client
            .from('usuarios')
            .select('email, nombres, apellidos')
            .eq('auth_id', mensaje.from_uid)
            .maybeSingle();
          
          if (usuario) {
            const nombre = [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ') || usuario.email;
            clienteEmail = nombre || usuario.email || 'Cliente';
          }
        }

        // Formatear fecha
        const fecha = new Date(mensaje.created_at);
        const fechaFormateada = fecha.toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Programar la notificación local
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title: `💬 Mensaje del cliente - Pedido #${room.pedido_id || '?'}`,
            body: `${clienteEmail} - ${fechaFormateada}`,
            channelId: 'delivery_chat',
            smallIcon: 'ic_stat_notify',
            extra: { 
              route: '/delivery/chat',
              roomId: mensaje.room_id,
              pedidoId: room.pedido_id
            }
          }]
        });

        console.log('[DeliveryRealtimeService] 🔔 Notificación de chat enviada');
      })
      .subscribe((status) => {
        console.log('[DeliveryRealtimeService] Canal chat suscrito con estado:', status);
      });

    console.log('[DeliveryRealtimeService] ✅ Servicio iniciado correctamente');
  }

  dispose() {
    if (this.ch) {
      this.supa.client.removeChannel(this.ch);
      this.ch = undefined;
    }
    if (this.chChat) {
      this.supa.client.removeChannel(this.chChat);
      this.chChat = undefined;
    }
    this.inited = false;
  }

  ngOnDestroy() {
    this.dispose();
  }
}

