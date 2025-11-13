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
import { SesionService } from 'src/app/services/sesion.service';
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
  mesaNumero: number | null = null; // Número de mesa para mostrar en mensajes del mozo
  nombresCache = new Map<string, string>(); // Cache de nombres de usuarios (uid -> nombre)
  metaTextos = new Map<number, string>(); // Cache de textos meta por mensaje (id -> texto)

  private sub?: Subscription;
  @ViewChild('bottom') bottom?: ElementRef;
  @ViewChild(IonContent) ionContent?: IonContent;
  constructor(
    private route: ActivatedRoute,
    private chat: ChatService,
    private supa: SupabaseService,
    private sesion: SesionService,
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
      
      this.sub = this.chat.streamMessages(this.roomId).subscribe(async arr => {
        console.log('[ChatComponent] 📨 Mensajes recibidos:', arr.length);
        this.mensajes = arr;
        await this.actualizarMetaTextos();
        this.scrollDownSoon();
      });
      return;
    } else {
      console.log('[ChatComponent] 🍽️ Modo MOZO detectado');
      this.roomId = +roomFromRoute;
      console.log('[ChatComponent] 🏠 Room ID:', this.roomId);
      
      // Cargar número de mesa para mostrar en los mensajes
      await this.cargarMesaNumero();
      
      this.sub = this.chat.streamMessages(this.roomId).subscribe(async arr => {
        console.log('[ChatComponent] 📨 Mensajes recibidos:', arr.length);
        this.mensajes = arr;
        await this.actualizarMetaTextos();
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
    
    // Si es mozo, cargar número de mesa
    if (this.sesion.esMozo()) {
      await this.cargarMesaNumero();
    }
    
    console.log('[ChatComponent] ✅ Sala final obtenida. Room ID:', this.roomId);
    console.log('[ChatComponent] 🔍 Suscribiéndose a mensajes...');
    
    this.sub = this.chat.streamMessages(this.roomId).subscribe({
      next: async (arr) => {
        console.log('[ChatComponent] 📨 Mensajes recibidos:', arr.length);
        this.mensajes = arr;
        await this.actualizarMetaTextos();
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
  // Actualizar meta textos para incluir el mensaje optimista
  await this.actualizarMetaTextos();
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
  
  /** Carga el número de mesa desde chat_rooms */
  async cargarMesaNumero() {
    try {
      const { data, error } = await this.supa.client
        .from('chat_rooms')
        .select('mesa_num')
        .eq('id', this.roomId)
        .maybeSingle();
      
      if (!error && data) {
        this.mesaNumero = data.mesa_num;
        console.log('[ChatComponent] 📍 Mesa número cargado:', this.mesaNumero);
      }
    } catch (e) {
      console.error('[ChatComponent] ❌ Error al cargar número de mesa:', e);
    }
  }
  
  /** Obtiene el nombre del usuario desde la tabla usuarios */
  async obtenerNombreUsuario(uid: string): Promise<string> {
    // Verificar cache primero
    if (this.nombresCache.has(uid)) {
      return this.nombresCache.get(uid)!;
    }
    
    try {
      const { data, error } = await this.supa.client
        .from('usuarios')
        .select('nombres')
        .eq('auth_id', uid)
        .maybeSingle();
      
      if (!error && data?.nombres) {
        const nombre = data.nombres;
        this.nombresCache.set(uid, nombre);
        return nombre;
      }
    } catch (e) {
      console.error('[ChatComponent] ❌ Error al obtener nombre de usuario:', e);
    }
    
    return 'Usuario'; // Fallback
  }
  
  /** Actualiza los textos meta de todos los mensajes */
  async actualizarMetaTextos() {
    this.metaTextos.clear();
    
    for (const m of this.mensajes) {
      // Si es mi mensaje, no mostrar meta (excepto en delivery)
      if (this.soyYo(m) && !this.esDeliveryChat) {
        this.metaTextos.set(m.id, '');
        continue;
      }
      
      // Si es delivery, mostrar email como antes
      if (this.esDeliveryChat) {
        this.metaTextos.set(m.id, m.from_email);
        continue;
      }
      
      // Si soy cliente y el mensaje es del mozo, mostrar nombre del mozo
      if (this.sesion.esCliente() && !this.soyYo(m)) {
        const nombre = await this.obtenerNombreUsuario(m.from_uid);
        this.metaTextos.set(m.id, nombre);
        continue;
      }
      
      // Si soy mozo y el mensaje es del cliente, mostrar número de mesa
      if (this.sesion.esMozo() && !this.soyYo(m)) {
        if (this.mesaNumero) {
          this.metaTextos.set(m.id, `MESA ${this.mesaNumero}`);
        } else {
          this.metaTextos.set(m.id, 'Cliente');
        }
        continue;
      }
      
      // Fallback
      this.metaTextos.set(m.id, m.from_email);
    }
    
    this.cdr.detectChanges();
  }
  
  /** Obtiene el texto meta para un mensaje (síncrono para usar en template) */
  obtenerMetaTexto(m: ChatMessage): string {
    // Si es mi mensaje y no es delivery, nunca mostrar meta
    if (this.soyYo(m) && !this.esDeliveryChat) {
      return '';
    }
    
    // Si está en cache, usar el cache
    const cached = this.metaTextos.get(m.id);
    if (cached !== undefined) {
      return cached;
    }
    
    // Si es delivery, mostrar email
    if (this.esDeliveryChat) {
      return m.from_email;
    }
    
    // Para otros casos, no mostrar nada hasta que se actualice
    return '';
  }
  
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
