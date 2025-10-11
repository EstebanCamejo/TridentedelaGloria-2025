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

  /** Stream realtime + carga inicial */
streamMessages(roomId: number): Observable<ChatMessage[]> {
  const subject = new BehaviorSubject<ChatMessage[]>([]);

  // Carga inicial
  this.supa.client.from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .then(({ data, error }) => { if (!error && data) subject.next(data as ChatMessage[]); });

  // Realtime: solo INSERT
  const chan = this.supa.client
    .channel(`chat-room-${roomId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const incoming = payload.new as ChatMessage;
        const arr = subject.getValue().slice();
        arr.push(incoming);
        subject.next(arr);
      }
    )
    .subscribe((status) => {
      // útil para debug: 'SUBSCRIBED' cuando conectó
      // console.log('[realtime]', status);
    });

  return new Observable<ChatMessage[]>(obs => {
    const sub = subject.subscribe(obs);
    return () => { sub.unsubscribe(); this.supa.client.removeChannel(chan); };
  });
  
}

// Enviar (sin optimista aquí)
async send(roomId: number, text: string) {
  const { data: ures } = await this.supa.client.auth.getUser();
  const user = ures?.user;
  if (!user) throw new Error('Sin sesión');

  const { error } = await this.supa.client
    .from('chat_messages')
    .insert([{
      room_id: roomId,
      from_uid: user.id,
      from_email: user.email ?? 'anon@local',
      text: text.trim()
    }]);

  if (error) throw error;
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

}
