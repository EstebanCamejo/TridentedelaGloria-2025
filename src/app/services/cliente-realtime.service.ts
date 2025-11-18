// src/app/services/cliente-realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Subject } from 'rxjs';
import { ClienteChatRealtimeService } from './cliente-chat-realtime.service';

@Injectable({ providedIn: 'root' })
export class ClienteRealtimeService implements OnDestroy {
  private chMesa?: RealtimeChannel;
  private chChat?: RealtimeChannel;
  private chPedidos?: RealtimeChannel;
  private chFactura?: RealtimeChannel;
  private inited = false;
  
  // Subject para emitir cuando llega una factura
  public facturaRecibida$ = new Subject<{ pdfUrl: string; mesaNumero?: number }>();

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
          anterior: oldPedido.estado,
          pedidoId: pedido.id,
          tipo_pedido_en_payload: pedido.tipo_pedido
        });

        // 🆕 Obtener tipo_pedido si no viene en el payload (por compatibilidad)
        let tipoPedido = pedido.tipo_pedido;
        if (!tipoPedido && pedido.id) {
          console.log('[ClienteRealtimeService] ⚠️ tipo_pedido no viene en payload, consultando BD...');
          try {
            const { data: pedidoCompleto } = await this.supa.client
              .from('pedidos')
              .select('tipo_pedido, tiempo_estimado')
              .eq('id', pedido.id)
              .maybeSingle();
            
            if (pedidoCompleto) {
              tipoPedido = pedidoCompleto.tipo_pedido || 'mesa';
              pedido.tipo_pedido = tipoPedido;
              pedido.tiempo_estimado = pedidoCompleto.tiempo_estimado || pedido.tiempo_estimado;
              console.log('[ClienteRealtimeService] ✅ tipo_pedido obtenido de BD:', tipoPedido);
            }
          } catch (error) {
            console.error('[ClienteRealtimeService] ❌ Error al obtener tipo_pedido:', error);
          }
        }

        // 🆕 CRÍTICO: NO notificar al cliente cuando un pedido de MESA cambia a "pedido en curso"
        // Esto es solo para mozos, el cliente no necesita saber cuando el mozo confirma su pedido
        if (tipoPedido === 'mesa' && oldPedido.estado === 'pendiente' && pedido.estado === 'pedido en curso') {
          console.log('[ClienteRealtimeService] ⚠️ Pedido de mesa confirmado por mozo, NO notificar al cliente (solo mozos reciben esta notificación)');
          return; // Salir sin notificar
        }

        // 🆕 Notificar cuando un pedido DELIVERY es confirmado por el admin
        if (tipoPedido === 'delivery' && oldPedido.estado === 'pendiente' && pedido.estado === 'pedido en curso') {
          console.log('[ClienteRealtimeService] ✅ Pedido delivery confirmado por admin, notificando al cliente!');
          console.log('[ClienteRealtimeService] Detalles del pedido:', {
            pedidoId: pedido.id,
            tipo_pedido: pedido.tipo_pedido,
            estadoAnterior: oldPedido.estado,
            estadoNuevo: pedido.estado,
            tiempoEstimado: pedido.tiempo_estimado
          });
          
          // Calcular tiempo de espera aproximado
          const tiempoEstimado = pedido.tiempo_estimado || 0;
          const tiempoEstimadoTexto = tiempoEstimado > 0 ? `Tiempo estimado: ${tiempoEstimado} minutos` : '';

          try {
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: '✅ Pedido delivery confirmado',
                body: `Tu pedido delivery ha sido confirmado. ${tiempoEstimadoTexto}`.trim(),
                channelId: 'cliente',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/cliente-pedido-en-curso',
                  pedidoId: pedido.id,
                  tipo: 'delivery'
                }
              }]
            });

            console.log('[ClienteRealtimeService] 🔔 Notificación de pedido delivery confirmado enviada exitosamente');
          } catch (error) {
            console.error('[ClienteRealtimeService] ❌ Error al enviar notificación de pedido delivery confirmado:', error);
          }
          
          return; // Salir para no procesar más lógica de mesa
        }

        // 🆕 Notificar cuando un pedido DELIVERY es rechazado por el admin
        if (tipoPedido === 'delivery' && oldPedido.estado === 'pendiente' && pedido.estado === 'rechazado por admin') {
          console.log('[ClienteRealtimeService] ❌ Pedido delivery rechazado por admin, notificando al cliente!');

          await LocalNotifications.schedule({
            notifications: [{
              id: (Date.now() + 1) % 2147483647,
              title: '❌ Pedido delivery rechazado',
              body: 'Tu pedido delivery fue rechazado. Por favor, contacta al restaurante.',
              channelId: 'cliente',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/home-cliente',
                tipo: 'delivery'
              }
            }]
          });

          console.log('[ClienteRealtimeService] 🔔 Notificación de pedido delivery rechazado enviada');
          return; // Salir para no procesar más lógica de mesa
        }

        // 🆕 Notificar cuando un pedido DELIVERY es asignado a un repartidor
        if (tipoPedido === 'delivery' && oldPedido.estado !== 'asignado a delivery' && pedido.estado === 'asignado a delivery') {
          console.log('[ClienteRealtimeService] 🚚 Pedido delivery asignado a repartidor, notificando al cliente!');

          await LocalNotifications.schedule({
            notifications: [{
              id: (Date.now() + 2) % 2147483647,
              title: '🚚 Pedido asignado a repartidor',
              body: 'Tu pedido delivery fue asignado a un repartidor. Pronto estará en camino.',
              channelId: 'cliente',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/cliente-pedido-en-curso',
                pedidoId: pedido.id,
                tipo: 'delivery'
              }
            }]
          });

          console.log('[ClienteRealtimeService] 🔔 Notificación de pedido asignado a repartidor enviada');
          return;
        }

        // 🆕 Notificar cuando un pedido DELIVERY es confirmado por el repartidor
        // 🔒 CRÍTICO: Verificar que el estado REALMENTE cambió (no solo otros campos como total/descuento)
        // Esto evita notificaciones falsas cuando se reclama descuento (que actualiza total pero NO cambia estado)
        
        // 🆕 Obtener estado anterior del payload, pero si no está disponible, consultar BD
        let estadoAnterior = oldPedido?.estado || '';
        const estadoNuevo = pedido?.estado || '';
        
        // 🆕 Si el estado anterior no está en el payload, ser conservador y no notificar
        // (porque no podemos verificar si realmente cambió el estado o solo otros campos)
        if (!estadoAnterior && pedido.id && estadoNuevo === 'confirmado por delivery') {
          console.log('[ClienteRealtimeService] ⚠️ Estado anterior no disponible en payload, siendo conservador y saltando notificación');
          console.log('[ClienteRealtimeService] 📋 No podemos verificar si el estado cambió o solo otros campos (descuento)');
          return;
        }
        
        const estadoRealmenteCambio = estadoAnterior !== estadoNuevo;
        
        console.log('[ClienteRealtimeService] 🔍 Verificando cambio de estado delivery:', {
          estadoAnterior,
          estadoNuevo,
          estadoRealmenteCambio,
          tipoPedido,
          esDelivery: tipoPedido === 'delivery',
          esConfirmadoPorDelivery: estadoNuevo === 'confirmado por delivery',
          cambioDeConfirmado: estadoAnterior !== 'confirmado por delivery' && estadoNuevo === 'confirmado por delivery',
          camposCambiados: {
            total: oldPedido?.total !== pedido?.total,
            descuento_pct: oldPedido?.descuento_pct !== pedido?.descuento_pct,
            descuento_fuente: oldPedido?.descuento_fuente !== pedido?.descuento_fuente
          }
        });
        
        // 🆕 Verificar si solo cambiaron campos de descuento pero NO el estado
        const soloCambioDescuento = !estadoRealmenteCambio && 
                                    (oldPedido?.total !== pedido?.total || 
                                     oldPedido?.descuento_pct !== pedido?.descuento_pct ||
                                     oldPedido?.descuento_fuente !== pedido?.descuento_fuente);
        
        if (soloCambioDescuento && estadoNuevo === 'confirmado por delivery') {
          console.log('[ClienteRealtimeService] ⚠️ Solo cambió descuento (total/descuento_pct), estado NO cambió, saltando notificación');
          return;
        }
        
        // Solo notificar si:
        // 1. Es un pedido delivery
        // 2. El estado REALMENTE cambió (no solo otros campos)
        // 3. El cambio es específicamente de otro estado a "confirmado por delivery"
        if (tipoPedido === 'delivery' && 
            estadoRealmenteCambio && 
            estadoAnterior !== 'confirmado por delivery' && 
            estadoNuevo === 'confirmado por delivery') {
          console.log('[ClienteRealtimeService] 📦 Pedido delivery confirmado por repartidor, notificando al cliente!');
          console.log('[ClienteRealtimeService] 📋 Estado anterior:', estadoAnterior, 'Estado nuevo:', estadoNuevo);

          await LocalNotifications.schedule({
            notifications: [{
              id: (Date.now() + 3) % 2147483647,
              title: '📦 Repartidor en camino',
              body: 'El repartidor confirmó la recepción de tu pedido. Está en camino hacia tu dirección.',
              channelId: 'cliente',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/cliente-pedido-en-curso',
                pedidoId: pedido.id,
                tipo: 'delivery'
              }
            }]
          });

          console.log('[ClienteRealtimeService] 🔔 Notificación de repartidor en camino enviada');
          return;
        } else if (tipoPedido === 'delivery' && 
                   !estadoRealmenteCambio && 
                   estadoNuevo === 'confirmado por delivery') {
          // Solo otros campos cambiaron (ej: total, descuento_pct) pero el estado NO cambió
          // NO enviar notificación de "repartidor en camino"
          console.log('[ClienteRealtimeService] ⚠️ Pedido delivery actualizado pero estado NO cambió (probablemente descuento aplicado), saltando notificación');
          console.log('[ClienteRealtimeService] 📋 Estado se mantiene en:', estadoNuevo);
          return;
        }

        // 🆕 Notificar cuando un pedido DELIVERY es entregado
        // 🔒 CRÍTICO: Verificar que el estado REALMENTE cambió (no solo otros campos como total/descuento)
        // Esto evita notificaciones falsas cuando se reclama descuento (que actualiza total pero NO cambia estado)
        
        // 🆕 Obtener estado anterior del payload para "entregado"
        let estadoAnteriorEntregado = oldPedido?.estado || '';
        const estadoNuevoEntregado = pedido?.estado || '';
        
        // 🆕 Si el estado anterior no está en el payload y el nuevo estado es 'entregado', ser conservador
        // (porque no podemos verificar si realmente cambió el estado o solo otros campos como descuento)
        if (!estadoAnteriorEntregado && pedido.id && estadoNuevoEntregado === 'entregado') {
          console.log('[ClienteRealtimeService] ⚠️ Estado anterior no disponible en payload para "entregado", siendo conservador y saltando notificación');
          console.log('[ClienteRealtimeService] 📋 No podemos verificar si el estado cambió o solo otros campos (descuento)');
          console.log('[ClienteRealtimeService] 📋 Estado nuevo:', estadoNuevoEntregado);
          return;
        }
        
        // 🆕 Verificar si el estado REALMENTE cambió
        const estadoRealmenteCambioEntregado = estadoAnteriorEntregado !== estadoNuevoEntregado;
        
        // 🆕 Verificar si solo cambiaron campos de descuento pero NO el estado
        const soloCambioDescuentoEntregado = !estadoRealmenteCambioEntregado && 
                                            estadoNuevoEntregado === 'entregado' &&
                                            (oldPedido?.total !== pedido?.total || 
                                             oldPedido?.descuento_pct !== pedido?.descuento_pct ||
                                             oldPedido?.descuento_fuente !== pedido?.descuento_fuente ||
                                             oldPedido?.juego_premio_reclamado !== pedido?.juego_premio_reclamado);
        
        if (soloCambioDescuentoEntregado) {
          console.log('[ClienteRealtimeService] ⚠️ Solo cambió descuento (total/descuento_pct/juego_premio_reclamado), estado NO cambió, saltando notificación de "entregado"');
          console.log('[ClienteRealtimeService] 📋 Estado se mantiene en:', estadoNuevoEntregado);
          console.log('[ClienteRealtimeService] 📋 Campos que cambiaron:', {
            total: oldPedido?.total !== pedido?.total,
            descuento_pct: oldPedido?.descuento_pct !== pedido?.descuento_pct,
            descuento_fuente: oldPedido?.descuento_fuente !== pedido?.descuento_fuente,
            juego_premio_reclamado: oldPedido?.juego_premio_reclamado !== pedido?.juego_premio_reclamado
          });
          return;
        }
        
        // Solo notificar si:
        // 1. Es un pedido delivery
        // 2. El estado REALMENTE cambió (no solo otros campos)
        // 3. El cambio es específicamente de otro estado a "entregado"
        if (tipoPedido === 'delivery' && 
            estadoRealmenteCambioEntregado && 
            estadoAnteriorEntregado !== 'entregado' && 
            estadoNuevoEntregado === 'entregado') {
          console.log('[ClienteRealtimeService] ✅ Pedido delivery entregado, notificando al cliente!');
          console.log('[ClienteRealtimeService] 📋 Estado anterior:', estadoAnteriorEntregado, 'Estado nuevo:', estadoNuevoEntregado);

          await LocalNotifications.schedule({
            notifications: [{
              id: (Date.now() + 4) % 2147483647,
              title: '✅ Pedido delivery entregado',
              body: 'Tu pedido delivery fue entregado exitosamente. ¡Disfrutá tu comida!',
              channelId: 'cliente',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/cliente-pedido-en-curso',
                pedidoId: pedido.id,
                tipo: 'delivery'
              }
            }]
          });

          console.log('[ClienteRealtimeService] 🔔 Notificación de pedido entregado enviada');
          return;
        } else if (tipoPedido === 'delivery' && 
                   !estadoRealmenteCambioEntregado && 
                   estadoNuevoEntregado === 'entregado') {
          // Solo otros campos cambiaron (ej: total, descuento_pct) pero el estado NO cambió
          // NO enviar notificación de "entregado"
          console.log('[ClienteRealtimeService] ⚠️ Pedido delivery actualizado pero estado NO cambió (probablemente descuento aplicado), saltando notificación de "entregado"');
          console.log('[ClienteRealtimeService] 📋 Estado se mantiene en:', estadoNuevoEntregado);
          return;
        }

        // Notificar cuando el pedido cambia a 'pendiente aceptación' (solo para mesa)
        if (pedido.estado === 'pendiente aceptación' && oldPedido.estado !== 'pendiente aceptación') {
          // Solo procesar si es pedido de mesa (no delivery)
          if (tipoPedido === 'delivery') {
            console.log('[ClienteRealtimeService] ⚠️ Cambio a "pendiente aceptación" para delivery, saltando (lógica diferente)');
            return;
          }

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
          const payloadData = payload['payload'] || {};
          const tipo = payloadData.tipo || 'mesa';
          const mesaNumero = payloadData.mesa_numero;
          const pedidoId = payloadData.pedido_id;
          
          // 🆕 Título dinámico según tipo de pedido
          let titulo = '✅ Pago confirmado';
          if (tipo === 'delivery' && pedidoId) {
            titulo = `✅ Pago confirmado - Delivery #${pedidoId}`;
          } else if (tipo === 'mesa' && mesaNumero) {
            titulo = `✅ Pago confirmado - Mesa ${mesaNumero}`;
          }
          
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: titulo,
              body: payloadData.mensaje || 'Tu pago ha sido confirmado. ¡Gracias!',
              channelId: 'cliente',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/home-cliente',
                mesaNumero: mesaNumero,
                pedidoId: pedidoId,
                tipo: tipo
              }
            }]
          });
          
          console.log('[ClienteRealtimeService] ✅ Notificación de pago confirmado enviada al cliente');
        } catch (error) {
          console.error('[ClienteRealtimeService] ❌ Error al enviar notificación de pago confirmado:', error);
        }
      })
      .subscribe();

    // 🆕 Suscribirse a notificaciones de factura lista (para clientes anónimos)
    // Usar canal específico por usuario para recibir solo las notificaciones del cliente actual
    const facturaChannelName = `notificacion_cliente_factura_${userId}`;
    this.chFactura = this.supa.client.channel(facturaChannelName);
    this.chFactura
      .on('broadcast', { event: 'factura_lista' }, async (payload) => {
        console.log('[ClienteRealtimeService] 🧾 Factura lista recibida:', payload);
        
        const facturaData = payload['payload'] || {};
        
        // Verificar que el mensaje sea para este cliente
        // Si hay cliente_id en el payload, verificar que coincida
        if (facturaData.cliente_id) {
          // Obtener el id del usuario actual desde la BD para comparar
          const { data: usuarioActual } = await this.supa.client
            .from('usuarios')
            .select('id')
            .eq('auth_id', userId)
            .single();
          
          if (usuarioActual?.id && facturaData.cliente_id !== usuarioActual.id) {
            console.log('[ClienteRealtimeService] ⚠️ Notificación de factura no es para este cliente');
            return;
          }
        }
        
        try {
          // Emitir evento para que el componente pueda mostrar el mensaje alusivo
          this.facturaRecibida$.next({
            pdfUrl: facturaData.pdf_url,
            mesaNumero: facturaData.mesa_numero
          });
          
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: facturaData.titulo || 'Tu factura está lista',
              body: facturaData.mensaje || 'Descárgala tocando aquí',
              channelId: 'cliente',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/home-cliente',
                pdfUrl: facturaData.pdf_url,
                mesaNumero: facturaData.mesa_numero,
                tipo: 'factura_lista'
              }
            }]
          });
          
          console.log('[ClienteRealtimeService] ✅ Notificación de factura lista enviada al cliente');
        } catch (error) {
          console.error('[ClienteRealtimeService] ❌ Error al enviar notificación de factura lista:', error);
        }
      })
      .subscribe((status) => {
        console.log('[ClienteRealtimeService] Canal factura suscrito con estado:', status);
      });
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
    if (this.chFactura) {
      this.supa.client.removeChannel(this.chFactura as any);
      this.chFactura = undefined;
    }
    // Finalizar también el servicio de chat
    this.clienteChatRt.dispose();
    this.inited = false;
  }

  ngOnDestroy() {
    this.dispose();
  }
}

