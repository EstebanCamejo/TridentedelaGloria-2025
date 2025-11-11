import { Injectable } from '@angular/core';
import { SupabaseService } from 'src/app/services/supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';

export type ChatMessage = {
  id: number; room_id: number; from_uid: string; from_email: string;
  text: string; created_at: string;
};
export type MozoChatRow = {
  room_id: number;
  mesa: number;
  ultimo: string | null;
  updated: string | null;
};

export type DeliveryChatRow = {
  room_id: number;
  pedido_id: number;
  ultimo: string | null;
  updated: string | null;
};

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private supa: SupabaseService) {}

  /** Crea (si no existe) y devuelve la room por pedido */
  async ensureRoomByPedido(pedidoId: number, mesa_num: number, cliente_uid: string) {
    const { data: existing } = await this.supa.client
      .from('chat_rooms')
      .select('id')
      .eq('pedido_id', pedidoId)
      .maybeSingle();

    if (existing) return existing.id as number;

    const { data, error } = await this.supa.client
      .from('chat_rooms')
      .insert([{ pedido_id: pedidoId, mesa_num, cliente_uid }])
      .select('id')
      .single();

    if (error) throw error;
    return data!.id as number;
  }

  /** 🆕 Crea (si no existe) y devuelve la room por pedido delivery */
  async ensureRoomByPedidoDelivery(pedidoId: number, cliente_uid: string, delivery_uid: string) {
    console.log('[ChatService] 🔍 ===== INICIANDO ensureRoomByPedidoDelivery =====');
    console.log('[ChatService] 📋 Parámetros:', {
      pedidoId,
      cliente_uid,
      delivery_uid,
      cliente_uid_length: cliente_uid?.length,
      delivery_uid_length: delivery_uid?.length
    });
    
    // Verificar si ya existe una sala para este pedido delivery
    console.log('[ChatService] 🔍 Buscando sala existente para pedido:', pedidoId);
    const { data: existing, error: errorExisting } = await this.supa.client
      .from('chat_rooms')
      .select('id, tipo_pedido, delivery_uid, cliente_uid')
      .eq('pedido_id', pedidoId)
      .maybeSingle();
    
    console.log('[ChatService] 📥 Resultado búsqueda sala:', {
      existing,
      errorExisting,
      found: !!existing
    });

    if (existing) {
      console.log('[ChatService] 📋 Sala existente encontrada:', {
        roomId: existing.id,
        tipo_pedido: existing.tipo_pedido,
        delivery_uid: existing.delivery_uid,
        cliente_uid: existing.cliente_uid,
        delivery_uid_match: existing.delivery_uid === delivery_uid,
        cliente_uid_match: existing.cliente_uid === cliente_uid
      });
      
      // Si existe una sala pero no es de delivery, o no tiene el delivery_uid correcto, actualizarla
      const necesitaActualizar = existing.tipo_pedido !== 'delivery' || existing.delivery_uid !== delivery_uid;
      console.log('[ChatService] 🔍 ¿Necesita actualizar?', {
        necesitaActualizar,
        tipoCorrecto: existing.tipo_pedido === 'delivery',
        deliveryCorrecto: existing.delivery_uid === delivery_uid
      });

      if (necesitaActualizar) {
        console.log('[ChatService] 🔄 Actualizando sala existente para delivery...');
        console.log('[ChatService] 📝 Valores a actualizar:', {
          roomId: existing.id,
          tipoAnterior: existing.tipo_pedido,
          deliveryAnterior: existing.delivery_uid,
          deliveryNuevo: delivery_uid,
          clienteAnterior: existing.cliente_uid,
          clienteNuevo: cliente_uid
        });
        
        const { data: updated, error: updateError } = await this.supa.client
          .from('chat_rooms')
          .update({ 
            delivery_uid: delivery_uid,
            tipo_pedido: 'delivery',
            mesa_num: null, // No hay mesa en delivery
            cliente_uid: cliente_uid // Asegurar que el cliente_uid también esté correcto
          })
          .eq('id', existing.id)
          .select('id, tipo_pedido, delivery_uid, cliente_uid')
          .single();
        
        if (updateError) {
          console.error('[ChatService] ❌ Error al actualizar sala existente:', updateError);
          console.error('[ChatService] ❌ Error completo:', JSON.stringify(updateError, null, 2));
          throw updateError;
        }
        
        console.log('[ChatService] ✅ Sala actualizada correctamente:', updated);
      } else {
        console.log('[ChatService] ✅ Sala ya es correcta para delivery, no necesita actualización');
      }
      
      console.log('[ChatService] ✅ Retornando roomId:', existing.id);
      return existing.id as number;
    }

    // Crear nueva sala para delivery
    console.log('[ChatService] 🆕 Creando nueva sala de chat para delivery...');
    console.log('[ChatService] 📝 Datos a insertar:', {
      pedido_id: pedidoId,
      cliente_uid,
      delivery_uid: delivery_uid,
      tipo_pedido: 'delivery',
      mesa_num: null
    });
    
    const { data, error } = await this.supa.client
      .from('chat_rooms')
      .insert([{ 
        pedido_id: pedidoId, 
        cliente_uid,
        delivery_uid: delivery_uid,
        tipo_pedido: 'delivery',
        mesa_num: null // No hay mesa en delivery
      }])
      .select('id, tipo_pedido, delivery_uid, cliente_uid')
      .single();

    console.log('[ChatService] 📥 Resultado inserción:', { data, error });

    if (error) {
      console.error('[ChatService] ❌ ERROR al crear sala de chat delivery:', error);
      console.error('[ChatService] ❌ Error completo:', JSON.stringify(error, null, 2));
      console.error('[ChatService] ❌ Código de error:', error.code);
      console.error('[ChatService] ❌ Mensaje de error:', error.message);
      console.error('[ChatService] ❌ Detalles de error:', error.details);
      console.error('[ChatService] ❌ Hint de error:', error.hint);
      throw error;
    }
    
    console.log('[ChatService] ✅ Sala de chat delivery creada exitosamente:', data);
    console.log('[ChatService] ✅ Retornando roomId:', data!.id);
    return data!.id as number;
  }

  /** Stream realtime + carga inicial */
streamMessages(roomId: number): Observable<ChatMessage[]> {
  console.log('[ChatService] 🔍 ===== INICIANDO streamMessages =====');
  console.log('[ChatService] 📋 Room ID:', roomId);
  
  const subject = new BehaviorSubject<ChatMessage[]>([]);

  // Carga inicial
  console.log('[ChatService] 📥 Cargando mensajes iniciales...');
  this.supa.client.from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .then(({ data, error }) => {
      if (error) {
        console.error('[ChatService] ❌ Error al cargar mensajes iniciales:', error);
      } else {
        console.log('[ChatService] ✅ Mensajes iniciales cargados:', data?.length || 0);
        if (data) subject.next(data as ChatMessage[]);
      }
    });

  // Realtime: solo INSERT
  const channelName = `chat-room-${roomId}`;
  console.log('[ChatService] 📡 Suscribiéndose a canal realtime:', channelName);
  
  const chan = this.supa.client
    .channel(channelName)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        console.log('[ChatService] 📨 Nuevo mensaje recibido en tiempo real:', {
          room_id: payload.new?.['room_id'],
          from_uid: payload.new?.['from_uid'],
          text: (payload.new as any)?.['text']?.substring(0, 50)
        });
        const incoming = payload.new as ChatMessage;
        const arr = subject.getValue().slice();
        arr.push(incoming);
        subject.next(arr);
        console.log('[ChatService] ✅ Mensaje agregado. Total mensajes:', arr.length);
      }
    )
    .subscribe((status) => {
      console.log('[ChatService] 📡 Estado de suscripción realtime:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[ChatService] ✅ Suscrito correctamente al canal realtime');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[ChatService] ❌ Error en canal realtime');
      }
    });

  return new Observable<ChatMessage[]>(obs => {
    console.log('[ChatService] 🔄 Observable creado, suscribiendo...');
    const sub = subject.subscribe(obs);
    return () => { 
      console.log('[ChatService] 🔌 Desuscribiendo y limpiando canal...');
      sub.unsubscribe(); 
      this.supa.client.removeChannel(chan); 
    };
  });
  
}

// Enviar (sin optimista aquí)
async send(roomId: number, text: string) {
  console.log('[ChatService] 📤 ===== INICIANDO ENVÍO DE MENSAJE =====');
  console.log('[ChatService] 📋 Parámetros:', {
    roomId,
    textLength: text?.length,
    textPreview: text?.substring(0, 50)
  });

  const { data: ures, error: authError } = await this.supa.client.auth.getUser();
  
  if (authError) {
    console.error('[ChatService] ❌ Error al obtener usuario:', authError);
    throw new Error('Error de autenticación');
  }

  const user = ures?.user;
  if (!user) {
    console.error('[ChatService] ❌ Usuario no encontrado');
    throw new Error('Sin sesión');
  }

  console.log('[ChatService] 👤 Usuario que envía:', {
    id: user.id,
    email: user.email
  });

  console.log('[ChatService] 📝 Insertando mensaje...');
  const { data, error } = await this.supa.client
    .from('chat_messages')
    .insert([{
      room_id: roomId,
      from_uid: user.id,
      from_email: user.email ?? 'anon@local',
      text: text.trim()
    }])
    .select('id, room_id, from_uid, text, created_at')
    .single();

  console.log('[ChatService] 📥 Resultado inserción:', { data, error });

  if (error) {
    console.error('[ChatService] ❌ ERROR al insertar mensaje:', error);
    console.error('[ChatService] ❌ Error completo:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('[ChatService] ✅ Mensaje enviado exitosamente:', data);
}

mozoChats$(): Observable<MozoChatRow[]> {
  const subj = new BehaviorSubject<MozoChatRow[]>([]);

  const fetch = async () => {
    const { data, error } = await this.supa.client
      .from('v_chat_rooms_last')
      .select('*')
      .order('updated', { ascending: false, nullsFirst: false });

    if (!error && data) {
      // si querés ocultar rooms sin mensajes:
      subj.next((data as MozoChatRow[]).filter(r => r.ultimo != null));
    }
  };

  // carga inicial
  fetch();

  // refrescar cuando entra cualquier mensaje nuevo
  const chan = this.supa.client
    .channel('mozo-chats-listener')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
    }, () => fetch())
    .subscribe();

  return new Observable<MozoChatRow[]>(obs => {
    const sub = subj.subscribe(obs);
    return () => { sub.unsubscribe(); this.supa.client.removeChannel(chan); };
  });
}

/** 🆕 Obtiene los chats del delivery actual (similar a mozoChats$ pero para delivery) */
deliveryChats$(): Observable<DeliveryChatRow[]> {
  const subj = new BehaviorSubject<DeliveryChatRow[]>([]);
  const deliveryUid = this.supa.idUsuario;

  if (!deliveryUid) {
    console.warn('[ChatService] No hay usuario delivery logueado para deliveryChats$');
    return subj.asObservable();
  }

  const fetch = async () => {
    // Obtener salas de chat donde delivery_uid = usuario actual y tipo_pedido = 'delivery'
    const { data: salas, error: salasError } = await this.supa.client
      .from('chat_rooms')
      .select('id, pedido_id, tipo_pedido, delivery_uid')
      .eq('delivery_uid', deliveryUid)
      .eq('tipo_pedido', 'delivery');

    if (salasError || !salas || salas.length === 0) {
      subj.next([]);
      return;
    }

    // Obtener último mensaje de cada sala
    const roomIds = salas.map(s => s.id);
    const { data: mensajes, error: mensajesError } = await this.supa.client
      .from('chat_messages')
      .select('room_id, text, created_at')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false });

    if (mensajesError) {
      console.error('[ChatService] Error al obtener mensajes:', mensajesError);
      subj.next([]);
      return;
    }

    // Agrupar mensajes por room_id y obtener el último de cada uno
    const ultimoPorRoom = new Map<number, { text: string; created_at: string }>();
    (mensajes || []).forEach(m => {
      const roomId = m.room_id;
      if (!ultimoPorRoom.has(roomId)) {
        ultimoPorRoom.set(roomId, { text: m.text, created_at: m.created_at });
      }
    });

    // Construir resultado
    const resultado: DeliveryChatRow[] = salas.map(sala => {
      const ultimo = ultimoPorRoom.get(sala.id);
      return {
        room_id: sala.id,
        pedido_id: sala.pedido_id,
        ultimo: ultimo?.text || null,
        updated: ultimo?.created_at || null
      };
    }).filter(r => r.ultimo != null) // Solo mostrar salas con mensajes
      .sort((a, b) => {
        // Ordenar por fecha de actualización (más reciente primero)
        if (!a.updated && !b.updated) return 0;
        if (!a.updated) return 1;
        if (!b.updated) return -1;
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      });

    subj.next(resultado);
  };

  // Carga inicial
  fetch();

  // Refrescar cuando entra cualquier mensaje nuevo
  const chan = this.supa.client
    .channel(`delivery-chats-listener-${deliveryUid}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
    }, () => fetch())
    .subscribe();

  return new Observable<DeliveryChatRow[]>(obs => {
    const sub = subj.subscribe(obs);
    return () => { sub.unsubscribe(); this.supa.client.removeChannel(chan); };
  });
}

}
