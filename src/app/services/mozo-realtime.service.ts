import { Injectable, OnDestroy } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SupabaseService } from './supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';
import { MozoChatRealtimeService } from './mozo-chat-realtime.service';

@Injectable({ providedIn: 'root' })
export class MozoRealtimeService implements OnDestroy {
  private ch?: RealtimeChannel;
  private inited = false;
  
  // 🚩 BANDERA: Indica si el mozo está confirmando un pago (bloquear notificaciones)
  private mozoConfirmandoPago = false;

  constructor(
    private supa: SupabaseService,
    private mozoChatRt: MozoChatRealtimeService
  ) {}

  async init() {
    if (this.inited) {
      console.log('[MozoRealtimeService] ⚠️ Ya estaba inicializado, saltando...');
      return;
    }
    
    console.log('[MozoRealtimeService] 🚀 Inicializando servicio...');
    this.inited = true;

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
    
    console.log('[MozoRealtimeService] 📱 Permisos de notificación:', perm.display);

    // Crear canal para notificaciones de mozos
    await LocalNotifications.createChannel?.({
      id: 'mozo_pedidos',
      name: 'Pedidos Mozo',
      description: 'Avisos de nuevos pedidos y pedidos listos para entregar',
      importance: 5,
      visibility: 1,
    });

    // 👉 SIGUIENDO PATRÓN EXACTO DEL MAITRE: escuchar TODOS los INSERTs
    const channelName = `mozo_pedidos_${this.supa.idUsuario || 'mozo'}`;
    console.log(`[MozoRealtimeService] 📡 Suscribiéndose al canal: ${channelName}`);
    
    this.ch = this.supa.client
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', // Escuchar TODOS los eventos (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'pedidos',
        // Sin filtro para detectar cualquier cambio
      }, async (payload) => {
        const pedido: any = payload.new || {};
        const oldPedido: any = payload.old || {};
        
        console.log('[MozoRealtimeService] 🔍 Evento detectado en pedidos:', { 
          evento: payload.eventType, 
          nuevo: pedido.estado, 
          anterior: oldPedido.estado,
          pedidoId: pedido.id,
          total: pedido.total,
          mozoConfirmandoPago: this.mozoConfirmandoPago
        });

        // 🚩 BLOQUEO POR BANDERA: Si el mozo está confirmando un pago, NO enviar notificaciones
        if (this.mozoConfirmandoPago) {
          console.log('[MozoRealtimeService] 🚩 Mozo está confirmando pago - BLOQUEANDO todas las notificaciones');
          return;
        }

        // 🔍 EXCLUSIÓN TEMPRANA: NO notificar cuando el mozo confirma el pago (cambia a 'pagado')
        if (pedido.estado === 'pagado' && oldPedido.estado === 'pendiente confirmacion pago') {
          console.log('[MozoRealtimeService] 💳 Mozo confirmó el pago - NO enviar notificación al mozo (EXCLUSIÓN TEMPRANA)');
          return; // IMPORTANTE: Salir temprano para evitar otras notificaciones
        }

        // 🔍 Excluir cambios a 'pendiente aceptación' - estos son manejados por ClienteRealtimeService
        if (pedido.estado === 'pendiente aceptación') {
          console.log('[MozoRealtimeService] ⚠️ Cambio a "pendiente aceptación" detectado, saltando (manejado por ClienteRealtimeService)');
          return;
        }

        // 🔍 Filtrar solo pedidos con estado 'pendiente' (nuevos pedidos o pedidos reenviados)
        // Y que tengan un total válido (mayor a 0)
        if (pedido.estado === 'pendiente') {
          if (!pedido.total || pedido.total <= 0) {
            console.log('[MozoRealtimeService] ⚠️ Pedido pendiente sin total válido, saltando notificación. Total:', pedido.total);
            return;
          }
          
          // Determinar si es un pedido nuevo o reenviado
          const esPedidoReenviado = oldPedido.estado === 'rechazado por mozo';
          const tipoMensaje = esPedidoReenviado ? 'Pedido modificado y reenviado' : 'Nuevo pedido';
          
          console.log(`[MozoRealtimeService] ✅ ${tipoMensaje} pendiente detectado con total válido!`);

        // Obtener número de mesa del cliente
        const { data: listaEspera, error: errorMesa } = await this.supa.client
          .from('lista_espera')
          .select('numero_mesa')
          .eq('usuario_id', pedido.idCliente)
          .eq('estado', 'asignado')
          .single();

        if (errorMesa) {
          console.error('[MozoRealtimeService] Error al obtener mesa:', errorMesa);
        }

        const mesaNumero = listaEspera?.numero_mesa || 0;
        console.log('[MozoRealtimeService] Mesa encontrada:', mesaNumero);

        try {
          // Programar notificación LOCAL con mensaje diferenciado
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: esPedidoReenviado ? `🔄 Pedido modificado - Mesa ${mesaNumero || '?'}` : `🍽️ Nuevo pedido - Mesa ${mesaNumero || '?'}`,
              body: esPedidoReenviado ? `Cliente modificó y reenvió el pedido. Requiere confirmación.` : `Nuevo pedido recibido. Requiere confirmación.`,
              channelId: 'mozo_pedidos',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/mozo/home',
                pedidoId: pedido.id,
                mesaNumero
              }
            }]
          });

          console.log('[MozoRealtimeService] 🔔 Notificación LOCAL enviada exitosamente');
        } catch (error) {
          console.error('[MozoRealtimeService] Error al enviar notificación:', error);
        }
        } // Cerrar el if para pedidos pendientes

        // 🔍 Filtrar cuando el estado cambia a 'listo para entregar' O cuando cambian los estados de los sectores
        // EXCLUIR el estado 'entregado' - esto se maneja por separado
        const estadoCambioAGeneral = pedido.estado === 'listo para entregar' && oldPedido.estado !== 'listo para entregar';
        const estadoCocinaCambio = pedido.estado_sector_cocina === 'listo para entregar' && oldPedido.estado_sector_cocina !== 'listo para entregar';
        const estadoBarCambio = pedido.estado_sector_bar === 'listo para entregar' && oldPedido.estado_sector_bar !== 'listo para entregar';
        const estadoPreparacionParcial = pedido.estado === 'en preparación parcial' && oldPedido.estado !== 'en preparación parcial';
        
        // 🔍 EXCLUIR notificaciones de "Pedido listo" cuando el estado es 'entregado'
        if ((estadoCambioAGeneral || estadoCocinaCambio || estadoBarCambio || estadoPreparacionParcial) && pedido.estado !== 'entregado') {
          console.log('[MozoRealtimeService] ✅ Cambio de estado detectado:', { 
            estadoCambioAGeneral, 
            estadoCocinaCambio, 
            estadoBarCambio,
            estadoPreparacionParcial 
          });

          // Verificar que TODOS los sectores estén listos antes de notificar
          const todosLosSectoresListos = await this.verificarTodosLosSectoresListos(pedido.id);
          
          if (!todosLosSectoresListos) {
            console.log('[MozoRealtimeService] ⚠️ No todos los sectores están listos, esperando...');
            return;
          }

          // 🔍 EVITAR DUPLICADOS: Solo notificar cuando el estado general cambia a 'listo para entregar'
          // No notificar en cambios de sectores individuales si el estado general ya era 'listo para entregar'
          if (!estadoCambioAGeneral && oldPedido.estado === 'listo para entregar') {
            console.log('[MozoRealtimeService] ⚠️ Evitando notificación duplicada - estado general ya era "listo para entregar"');
            return;
          }

          console.log('[MozoRealtimeService] ✅ Todos los sectores están listos, enviando notificación!');

          // Obtener número de mesa del cliente
          const { data: listaEspera, error: errorMesa } = await this.supa.client
            .from('lista_espera')
            .select('numero_mesa')
            .eq('usuario_id', pedido.idCliente)
            .eq('estado', 'asignado')
            .single();

          if (errorMesa) {
            console.error('[MozoRealtimeService] Error al obtener mesa:', errorMesa);
          }

          const mesaNumero = listaEspera?.numero_mesa || 0;
          console.log('[MozoRealtimeService] Mesa encontrada:', mesaNumero);

          try {
            // Programar notificación LOCAL para pedido listo
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: `🍽️ Pedido listo - Mesa ${mesaNumero || '?'}`,
              body: `Pedido listo para entregar.`,
                channelId: 'mozo_pedidos',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/mozo/home',
                  pedidoId: pedido.id,
                  mesaNumero,
                  estado: 'listo para entregar'
                }
              }]
            });

            console.log('[MozoRealtimeService] 🔔 Notificación de pedido listo enviada exitosamente');
          } catch (error) {
            console.error('[MozoRealtimeService] Error al enviar notificación de pedido listo:', error);
          }
        } // Cerrar el if para pedidos listos

        // 🔍 Notificar cuando el cliente acepta el pedido (estado 'entregado')
        if (pedido.estado === 'entregado' && oldPedido.estado === 'pendiente aceptación') {
          console.log('[MozoRealtimeService] ✅ Cliente aceptó el pedido entregado');

          // Obtener número de mesa del cliente
          const { data: listaEspera, error: errorMesa } = await this.supa.client
            .from('lista_espera')
            .select('numero_mesa')
            .eq('usuario_id', pedido.idCliente)
            .eq('estado', 'asignado')
            .single();

          if (errorMesa) {
            console.error('[MozoRealtimeService] Error al obtener mesa:', errorMesa);
          }

          const mesaNumero = listaEspera?.numero_mesa || 0;

          try {
            // Programar notificación LOCAL - Pedido aceptado
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: `✅ PEDIDO ACEPTADO - Mesa ${mesaNumero || '?'}`,
                body: `El cliente confirmó la entrega correcta`,
                channelId: 'mozo_pedidos',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/mozo/home',
                  pedidoId: pedido.id,
                  mesaNumero,
                  estado: pedido.estado
                }
              }]
            });

            console.log(`[MozoRealtimeService] 🔔 Notificación de pedido entregado enviada`);
          } catch (error) {
            console.error('[MozoRealtimeService] Error al enviar notificación de pedido entregado:', error);
          }
        }

        // 🔍 Solo log para pedidos rechazados (sin notificación push)
        if (pedido.estado === 'rechazado' && oldPedido.estado === 'pendiente aceptación') {
          console.log(`[MozoRealtimeService] 📝 Cliente rechazó el pedido (sin notificación push)`);
        }

        // 🔍 Notificar cuando el cliente marca el pedido como pendiente de confirmación de pago
        if (pedido.estado === 'pendiente confirmacion pago' && oldPedido.estado !== 'pendiente confirmacion pago') {
          console.log('[MozoRealtimeService] 💳 Cliente realizó pago - esperando confirmación del mozo');

          // Obtener número de mesa del cliente
          const { data: listaEspera, error: errorMesa } = await this.supa.client
            .from('lista_espera')
            .select('numero_mesa')
            .eq('usuario_id', pedido.idCliente)
            .eq('estado', 'asignado')
            .single();

          if (errorMesa) {
            console.error('[MozoRealtimeService] Error al obtener mesa:', errorMesa);
          }

          const mesaNumero = listaEspera?.numero_mesa || 0;

          try {
            // Programar notificación LOCAL - Pago realizado
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
              title: `💳 PAGO REALIZADO - Mesa ${mesaNumero || '?'}`,
              body: `Cliente realizó el pago. Requiere confirmación del mozo.`,
                channelId: 'mozo_pedidos',
                smallIcon: 'ic_stat_notify',
                extra: { 
                  route: '/mozo/confirmar-pago',
                  pedidoId: pedido.id,
                  mesaNumero,
                  estado: 'pendiente confirmacion pago'
                }
              }]
            });

            console.log(`[MozoRealtimeService] 🔔 Notificación de pago realizado enviada`);
          } catch (error) {
            console.error('[MozoRealtimeService] Error al enviar notificación de pago:', error);
          }
        }

      })
      .subscribe((status) => {
        console.log('[MozoRealtimeService] 📡 Canal suscrito con estado:', status);
        console.log('[MozoRealtimeService] ✅ Servicio inicializado correctamente');
        
        // Inicializar también el servicio de chat para mozos
        this.mozoChatRt.init().catch(err => {
          console.error('[MozoRealtimeService] Error al inicializar chat:', err);
        });
      });

    // 🆕 Canal adicional para solicitudes de cuenta
    const cuentaChannel = this.supa.client.channel('solicitud_cuenta_mozo');
    cuentaChannel
      .on('broadcast', { event: 'solicitud_cuenta' }, async (payload) => {
        console.log('[MozoRealtimeService] 💳 Solicitud de cuenta recibida:', payload);
        
        // 🚩 BLOQUEO POR BANDERA: Si el mozo está confirmando un pago, NO enviar notificaciones
        if (this.mozoConfirmandoPago) {
          console.log('[MozoRealtimeService] 🚩 Mozo está confirmando pago - BLOQUEANDO notificación de solicitud de cuenta');
          return;
        }
        
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title: `💳 Solicitud de cuenta - Mesa ${payload['payload'].mesa_numero}`,
              body: payload['payload'].mensaje,
              channelId: 'mozo_pedidos',
              smallIcon: 'ic_stat_notify',
              extra: { 
                route: '/mozo/confirmar-pago',
                mesaNumero: payload['payload'].mesa_numero
              }
            }]
          });
          
          console.log('[MozoRealtimeService] ✅ Notificación de solicitud de cuenta enviada');
        } catch (error) {
          console.error('[MozoRealtimeService] ❌ Error al enviar notificación de cuenta:', error);
        }
      })
      .subscribe();
  }

  /**
   * Verifica que todos los sectores del pedido estén listos para entregar
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
        console.error('[MozoRealtimeService] Error al obtener detalles del pedido:', detallesError);
        return false;
      }

      // Determinar qué sectores están involucrados
      const tipos = detalles?.map(d => (d as any).menu?.tipo).filter(tipo => tipo) || [];
      const tienePlatos = tipos.includes('plato');
      const tieneBebidas = tipos.includes('bebida');

      console.log('[MozoRealtimeService] Sectores involucrados:', { tienePlatos, tieneBebidas });

      // Obtener el estado actual del pedido
      const { data: pedido, error: pedidoError } = await this.supa.client
        .from('pedidos')
        .select('estado, estado_sector_cocina, estado_sector_bar')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) {
        console.error('[MozoRealtimeService] Error al obtener estado del pedido:', pedidoError);
        return false;
      }

      // Verificar que todos los sectores involucrados estén listos
      let todosListos = true;

      if (tienePlatos) {
        const cocinaLista = pedido.estado_sector_cocina === 'listo para entregar';
        console.log('[MozoRealtimeService] Cocina lista:', cocinaLista);
        todosListos = todosListos && cocinaLista;
      }

      if (tieneBebidas) {
        const barListo = pedido.estado_sector_bar === 'listo para entregar';
        console.log('[MozoRealtimeService] Bar listo:', barListo);
        todosListos = todosListos && barListo;
      }

      console.log('[MozoRealtimeService] Todos los sectores listos:', todosListos);
      return todosListos;

    } catch (error) {
      console.error('[MozoRealtimeService] Error en verificarTodosLosSectoresListos:', error);
      return false;
    }
  }

  dispose() {
    if (this.ch) {
      this.supa.client.removeChannel(this.ch);
      this.ch = undefined;
    }
    // Finalizar también el servicio de chat
    this.mozoChatRt.dispose();
    this.inited = false;
  }

  ngOnDestroy() {
    this.dispose();
  }

  // 🚩 MÉTODOS PARA CONTROLAR LA BANDERA
  setMozoConfirmandoPago(confirmando: boolean) {
    this.mozoConfirmandoPago = confirmando;
    console.log(`[MozoRealtimeService] 🚩 Bandera mozoConfirmandoPago: ${confirmando}`);
  }

  isMozoConfirmandoPago(): boolean {
    return this.mozoConfirmandoPago;
  }
}