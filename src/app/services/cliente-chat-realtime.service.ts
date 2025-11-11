import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class ClienteChatRealtimeService implements OnDestroy {
  private ch?: RealtimeChannel;
  private inited = false;

  constructor(private supa: SupabaseService) {}

  async init() {
    if (this.inited) return;
    this.inited = true;

    const userId = this.supa.idUsuario;
    if (!userId) {
      console.warn('[ClienteChatRealtimeService] No hay usuario autenticado');
      return;
    }

    // Verificar permisos de notificaciones
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Crear canal de notificaciones para chat de cliente
    await LocalNotifications.createChannel?.({
      id: 'cliente_chat',
      name: 'Chat Cliente',
      description: 'Respuestas de mozos',
      importance: 5,
      visibility: 1,
    });

    console.log('[ClienteChatRealtimeService] Iniciando servicio de chat para cliente:', userId);

    // 🆕 Obtener las salas de chat del cliente actual (mesa y delivery)
    const { data: salasCliente } = await this.supa.client
      .from('chat_rooms')
      .select('id, mesa_num, tipo_pedido, pedido_id')
      .eq('cliente_uid', userId);

    if (!salasCliente || salasCliente.length === 0) {
      console.log('[ClienteChatRealtimeService] No hay salas de chat para este cliente');
      return;
    }

    const roomIds = salasCliente.map(s => s.id);
    console.log('[ClienteChatRealtimeService] Escuchando salas:', roomIds);

    // Escuchar INSERT en chat_messages solo para las salas del cliente actual
    this.ch = this.supa.client
      .channel(`cliente_chat_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, async (payload) => {
        const mensaje: any = payload.new || {};
        
        // Verificar si el mensaje pertenece a una sala del cliente
        if (!roomIds.includes(mensaje.room_id)) {
          return;
        }

        // 🆕 Verificar si el mensaje es del propio cliente
        if (mensaje.from_uid === userId) {
          console.log('[ClienteChatRealtimeService] Mensaje propio del cliente, no notificar');
          return;
        }

        // Obtener información del usuario que envió el mensaje (mozo o delivery)
        const { data: usuario } = await this.supa.client
          .from('usuarios')
          .select('perfil, nombres, apellidos')
          .eq('auth_id', mensaje.from_uid)
          .maybeSingle();

        // 🆕 Verificar si es mozo o delivery (no notificar si es otro cliente)
        if (!usuario || (usuario.perfil !== 'mozo' && usuario.perfil !== 'delivery')) {
          console.log('[ClienteChatRealtimeService] Mensaje no es de mozo ni delivery, no notificar');
          return;
        }

        // Obtener información de la sala para saber si es delivery o mesa
        const { data: sala } = await this.supa.client
          .from('chat_rooms')
          .select('tipo_pedido, pedido_id, mesa_num')
          .eq('id', mensaje.room_id)
          .maybeSingle();

        const esDelivery = sala?.tipo_pedido === 'delivery';
        const numeroMesa = sala?.mesa_num || '?';
        
        // Formatear fecha con hora y minutos
        const fecha = new Date(mensaje.created_at);
        const fechaFormateada = fecha.toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Formatear nombre del remitente
        const nombreRemitente = [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ') || 
                                (usuario.perfil === 'delivery' ? 'Repartidor' : 'Mozo');

        // 🆕 Título y mensaje según tipo de remitente
        const titulo = esDelivery ? '💬 Respuesta del repartidor' : '💬 Respuesta del mozo';
        const cuerpo = esDelivery 
          ? `${nombreRemitente} - Delivery #${sala?.pedido_id || '?'} - ${fechaFormateada}`
          : `${nombreRemitente} - Mesa ${numeroMesa} - ${fechaFormateada}`;

        // Enviar notificación push al cliente
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title: titulo,
            body: cuerpo,
            channelId: 'cliente_chat',
            smallIcon: 'ic_stat_notify',
            extra: {
              roomId: mensaje.room_id,
              mesaNumero: numeroMesa,
              mensajeId: mensaje.id,
              remitenteNombre: nombreRemitente,
              tipo: esDelivery ? 'delivery' : 'mozo',
              pedidoId: sala?.pedido_id
            }
          }]
        });

        console.log(`[ClienteChatRealtimeService] 🔔 Notificación enviada al cliente: ${titulo} - ${cuerpo}`);
      })
      .subscribe();

    console.log('[ClienteChatRealtimeService] ✅ Servicio iniciado correctamente');
  }

  dispose() {
    if (this.ch) {
      this.supa.client.removeChannel(this.ch);
      this.ch = undefined;
    }
    this.inited = false;
    console.log('[ClienteChatRealtimeService] 🔄 Servicio finalizado');
  }

  ngOnDestroy() {
    this.dispose();
  }
}
