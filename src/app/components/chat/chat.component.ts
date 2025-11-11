// chat.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon }
  from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from 'src/app/services/chat.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { chevronBackOutline, sendOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  pedidoId!: number;
  roomId!: number;
  mensajes: ChatMessage[] = [];
  nuevo = '';
  meUid: string | null = null;
  esDeliveryChat = false; // 🆕 Flag para saber si es chat de delivery
  esModoDelivery = false; // 🆕 Flag para saber si el usuario actual es delivery (no cliente)

  private sub?: Subscription;
  @ViewChild('bottom') bottom?: ElementRef;
  @ViewChild(IonContent) ionContent?: IonContent;
  constructor(
    private route: ActivatedRoute,
    private chat: ChatService,
    private supa: SupabaseService,
    private cdr: ChangeDetectorRef
  ) { 
    console.log('[ChatComponent] 🔧 Constructor ejecutado');
    addIcons({ chevronBackOutline, sendOutline }); 
  }

async ngOnInit() {
  console.log('[ChatComponent] 🚀 ngOnInit iniciado');
  
  const qp = this.route.snapshot.queryParamMap;
  const mesa_num = +(qp.get('mesa') || 0);
  console.log('[ChatComponent] 📍 Mesa número:', mesa_num);

  const { data: ures } = await this.supa.client.auth.getUser();
  this.meUid = ures?.user?.id ?? null;
  console.log('[ChatComponent] 👤 Usuario ID:', this.meUid);

  // 1) Modo MOZO: /mozo/chat/:roomId
  // 2) Modo DELIVERY: /delivery/chat/:roomId
  const roomFromRoute = this.route.snapshot.paramMap.get('roomId');
  const isDeliveryRoute = this.route.snapshot.url.some(segment => segment.path === 'delivery');
  
  console.log('[ChatComponent] 🔍 Room desde ruta:', roomFromRoute);
  console.log('[ChatComponent] 🚚 Es ruta delivery?:', isDeliveryRoute);
  
  if (roomFromRoute) {
    if (isDeliveryRoute) {
      console.log('[ChatComponent] 🚚 Modo DELIVERY detectado (usuario es delivery)');
      this.esDeliveryChat = true;
      this.esModoDelivery = true; // 🆕 El usuario actual es delivery
      this.roomId = +roomFromRoute;
      console.log('[ChatComponent] 🏠 Room ID:', this.roomId);
      
      this.sub = this.chat.streamMessages(this.roomId).subscribe(arr => {
        console.log('[ChatComponent] 📨 Mensajes recibidos:', arr.length);
        this.mensajes = arr;
        this.scrollDownSoon();
      });
      return;
    } else {
      console.log('[ChatComponent] 🍽️ Modo MOZO detectado');
      this.roomId = +roomFromRoute;
      console.log('[ChatComponent] 🏠 Room ID:', this.roomId);
      
      this.sub = this.chat.streamMessages(this.roomId).subscribe(arr => {
        console.log('[ChatComponent] 📨 Mensajes recibidos:', arr.length);
        this.mensajes = arr;
        this.scrollDownSoon();
      });
      return;
    }
  }

  // 3) Modo CLIENTE: /cliente/chat/:pedidoId
  this.pedidoId = +(this.route.snapshot.paramMap.get('pedidoId') || 0);
  console.log('[ChatComponent] 🛒 Modo CLIENTE detectado');
  console.log('[ChatComponent] 📋 Pedido ID:', this.pedidoId);
  
  if (!this.meUid) {
    console.error('[ChatComponent] ❌ Error: Usuario no autenticado');
    return;
  }
  
  const cliente_uid = this.meUid;
  console.log('[ChatComponent] 🔐 Cliente UID:', cliente_uid);

  try {
    console.log('[ChatComponent] 🔍 ===== INICIANDO CREACIÓN/OBTENCIÓN DE SALA =====');
    console.log('[ChatComponent] 📋 Contexto:', {
      pedidoId: this.pedidoId,
      cliente_uid,
      meUid: this.meUid,
      mesa_num
    });

    // 🆕 Verificar si el pedido es delivery
    console.log('[ChatComponent] 🔍 Consultando información del pedido...');
    const { data: pedido, error: pedidoError } = await this.supa.client
      .from('pedidos')
      .select('tipo_pedido, idDelivery, estado')
      .eq('id', this.pedidoId)
      .maybeSingle();

    console.log('[ChatComponent] 📥 Resultado consulta pedido:', {
      pedido,
      pedidoError,
      tipo_pedido: pedido?.tipo_pedido,
      idDelivery: pedido?.idDelivery,
      estado: pedido?.estado
    });

    if (pedidoError) {
      console.error('[ChatComponent] ❌ Error al consultar pedido:', pedidoError);
      throw new Error('No se pudo obtener información del pedido');
    }

    if (!pedido) {
      console.error('[ChatComponent] ❌ Pedido no encontrado');
      throw new Error('Pedido no encontrado');
    }

    if (pedido.tipo_pedido === 'delivery') {
      console.log('[ChatComponent] 🚚 PEDIDO DELIVERY DETECTADO');
      console.log('[ChatComponent] 📋 Información delivery:', {
        pedidoId: this.pedidoId,
        idDelivery: pedido.idDelivery,
        estado: pedido.estado,
        tieneRepartidor: !!pedido.idDelivery
      });

      this.esDeliveryChat = true;
      this.esModoDelivery = false;
      this.cdr.detectChanges();
      
      if (!pedido.idDelivery) {
        console.error('[ChatComponent] ❌ Pedido delivery SIN repartidor asignado');
        console.error('[ChatComponent] ❌ Estado del pedido:', pedido.estado);
        throw new Error('EL CHAT ESTARÁ DISPONIBLE CUANDO SE ASIGNE UN REPARTIDOR A TU PEDIDO');
      }
      
      console.log('[ChatComponent] 🚚 Pedido delivery con repartidor, creando sala...');
      const delivery_uid = pedido.idDelivery;
      console.log('[ChatComponent] 📋 Delivery UID:', delivery_uid);

      this.roomId = await this.chat.ensureRoomByPedidoDelivery(
        this.pedidoId, 
        cliente_uid, 
        delivery_uid
      );
      
      console.log('[ChatComponent] ✅ Sala delivery creada/obtenida. Room ID:', this.roomId);
    } else {
      console.log('[ChatComponent] 🍽️ PEDIDO DE MESA DETECTADO');
      this.esDeliveryChat = false;
      this.roomId = await this.chat.ensureRoomByPedido(this.pedidoId, mesa_num, cliente_uid);
      console.log('[ChatComponent] ✅ Sala mesa creada/obtenida. Room ID:', this.roomId);
    }
    
    console.log('[ChatComponent] ✅ Sala final obtenida. Room ID:', this.roomId);
    console.log('[ChatComponent] 🔍 Suscribiéndose a mensajes...');
    
    this.sub = this.chat.streamMessages(this.roomId).subscribe({
      next: (arr) => {
        console.log('[ChatComponent] 📨 Mensajes recibidos:', arr.length);
        this.mensajes = arr;
        this.scrollDownSoon();
      },
      error: (err) => {
        console.error('[ChatComponent] ❌ Error en suscripción de mensajes:', err);
      }
    });
    
    console.log('[ChatComponent] ✅ Suscripción a mensajes establecida');
  } catch (error: any) {
    console.error('[ChatComponent] ❌ ===== ERROR CRÍTICO =====');
    console.error('[ChatComponent] ❌ Error al crear/obtener sala:', error);
    console.error('[ChatComponent] ❌ Error completo:', JSON.stringify(error, null, 2));
    console.error('[ChatComponent] ❌ Stack trace:', error?.stack);
    const errorMsg = (error?.message || 'ERROR AL ABRIR EL CHAT. POR FAVOR, INTENTÁ NUEVAMENTE').toUpperCase();
    console.error('[ChatComponent] ❌ Mensaje de error para el usuario:', errorMsg);
    // TODO: Mostrar toast de error al usuario si es necesario
  }
}

async enviar() {
  console.log('[ChatComponent] 📤 Intentando enviar mensaje');
  const t = this.nuevo.trim();
  if (!t) {
    console.log('[ChatComponent] ⚠️ Mensaje vacío, no se envía');
    return;
  }

  console.log('[ChatComponent] 📝 Mensaje a enviar:', t);

  // 👇 Optimista: lo ves al instante
  const optimista: ChatMessage = {
    id: -Date.now(), // temporal
    room_id: this.roomId,
    from_uid: this.meUid!,
    from_email: (await this.supa.client.auth.getUser()).data?.user?.email ?? 'yo@local',
    text: t,
    created_at: new Date().toISOString()
  };
  
  console.log('[ChatComponent] 🎭 Mensaje optimista creado:', optimista);
  
  this.mensajes = [...this.mensajes, optimista];
  this.nuevo = '';
  this.scrollDownSoon();

  try {
    console.log('[ChatComponent] 🚀 Enviando mensaje al servidor...');
    await this.chat.send(this.roomId, t);
    console.log('[ChatComponent] ✅ Mensaje enviado exitosamente');
    // Cuando llegue el INSERT del Realtime, la versión "real" quedará al final.
    // Si querés, podés luego deduplicar por tiempo/texto; no es crítico.
  } catch (e) {
    console.error('[ChatComponent] ❌ Error al enviar mensaje:', e);
    // Si falla el insert, quitamos el optimista
    this.mensajes = this.mensajes.filter(m => m.id !== optimista.id);
    console.warn('No se pudo enviar:', e);
  }
}
  soyYo(m: ChatMessage) { return m.from_uid === this.meUid; }
  scrollDownSoon() {
    console.log('[ChatComponent] 📜 ScrollDownSoon ejecutado');
    setTimeout(() => {
      console.log('[ChatComponent] 📜 Ejecutando scroll...');
      // 1) intenta con anchor
      this.bottom?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      // 2) y además usa IonContent por si el anchor no alcanza
      this.ionContent?.scrollToBottom(250);
    }, 50);
  }

  ngOnDestroy() { 
    console.log('[ChatComponent] 🗑️ ngOnDestroy ejecutado');
    this.sub?.unsubscribe(); 
  }
}
