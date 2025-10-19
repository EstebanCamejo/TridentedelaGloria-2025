import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class MozoChatRealtimeService implements OnDestroy {
  private ch?: RealtimeChannel;
  private inited = false;

  constructor(private supa: SupabaseService) {}

  async init() {
    if (this.inited) return;
    this.inited = true;

    // Verificar permisos de notificaciones
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Crear canal de notificaciones para chat
    await LocalNotifications.createChannel?.({
      id: 'mozo_chat',
      name: 'Chat Mozo',
      description: 'Notificaciones de consultas de clientes',
      importance: 5,
      visibility: 1,
    });

    console.log('[MozoChatRealtimeService] Iniciando servicio de chat para mozos...');

    // Escuchar INSERT en chat_messages para notificar a TODOS los mozos
    this.ch = this.supa.client
      .channel('mozo_chat_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, async (payload) => {
        const mensaje: any = payload.new || {};
        
        console.log('[MozoChatRealtimeService] 🔍 Nuevo mensaje detectado:', mensaje);
        
        // Verificar que el mensaje tiene from_email (indica que es de un cliente)
        // Los mozos no tienen from_email en sus mensajes
        if (!mensaje.from_email) {
          console.log('[MozoChatRealtimeService] No es un cliente (sin from_email), saltando notificación');
          return;
        }

        // Verificar que NO es el propio mozo quien está enviando el mensaje
        const currentUserId = this.supa.idUsuario;
        if (mensaje.from_uid === currentUserId) {
          console.log('[MozoChatRealtimeService] Es el propio mozo quien envía el mensaje, saltando notificación');
          return;
        }

        console.log('[MozoChatRealtimeService] Cliente detectado por from_email:', mensaje.from_email);

        // Obtener información de la mesa desde la sala de chat
        const { data: sala, error: salaError } = await this.supa.client
          .from('chat_rooms')
          .select('*')
          .eq('id', mensaje.room_id)
          .single();

        console.log('[MozoChatRealtimeService] Sala de chat:', sala, 'Error:', salaError);

        // Intentar diferentes nombres de campo para el número de mesa
        const numeroMesa = sala?.mesa_num || sala?.mesa_numero || sala?.numero_mesa || sala?.mesa || '?';
        
        console.log('[MozoChatRealtimeService] Número de mesa detectado:', numeroMesa);
        
        // Formatear fecha con hora y minutos
        const fecha = new Date(mensaje.created_at);
        const fechaFormateada = fecha.toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Enviar notificación push a TODOS los mozos
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title: `💬 Nueva consulta - Mesa ${numeroMesa}`,
            body: `${fechaFormateada}`,
            channelId: 'mozo_chat',
            smallIcon: 'ic_stat_notify',
            extra: {
              roomId: mensaje.room_id,
              mesaNumero: numeroMesa,
              mensajeId: mensaje.id
            }
          }]
        });

        console.log(`[MozoChatRealtimeService] 🔔 Notificación enviada a mozos: Mesa ${numeroMesa} - ${fechaFormateada}`);
      })
      .subscribe();

    console.log('[MozoChatRealtimeService] ✅ Servicio iniciado correctamente');
  }

  dispose() {
    if (this.ch) {
      this.supa.client.removeChannel(this.ch);
      this.ch = undefined;
    }
    this.inited = false;
    console.log('[MozoChatRealtimeService] 🔄 Servicio finalizado');
  }

  ngOnDestroy() {
    this.dispose();
  }
}
