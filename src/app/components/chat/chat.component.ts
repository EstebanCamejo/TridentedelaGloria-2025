// chat.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonFooter,IonContent, IonButton, IonIcon, IonInput }
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
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,IonButton, IonIcon, IonInput],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  pedidoId!: number;
  roomId!: number;
  mensajes: ChatMessage[] = [];
  nuevo = '';
  meUid: string | null = null;

  private sub?: Subscription;
  @ViewChild('bottom') bottom?: ElementRef;
 @ViewChild(IonContent) ionContent?: IonContent;
  constructor(
    private route: ActivatedRoute,
    private chat: ChatService,
    private supa: SupabaseService,
  ) { addIcons({ chevronBackOutline, sendOutline }); }

async ngOnInit() {
  const qp = this.route.snapshot.queryParamMap;
  const mesa_num = +(qp.get('mesa') || 0);

  const { data: ures } = await this.supa.client.auth.getUser();
  this.meUid = ures?.user?.id ?? null;

  // 1) Modo MOZO: /mozo/chat/:roomId
  const roomFromRoute = this.route.snapshot.paramMap.get('roomId');
  if (roomFromRoute) {
    this.roomId = +roomFromRoute;
    this.sub = this.chat.streamMessages(this.roomId).subscribe(arr => {
      this.mensajes = arr;
      this.scrollDownSoon();
    });
    return;
  }

  // 2) Modo CLIENTE: /cliente/chat/:pedidoId
  this.pedidoId = +(this.route.snapshot.paramMap.get('pedidoId') || 0);
  const cliente_uid = this.meUid!;

  this.roomId = await this.chat.ensureRoomByPedido(this.pedidoId, mesa_num, cliente_uid);
  this.sub = this.chat.streamMessages(this.roomId).subscribe(arr => {
    this.mensajes = arr;
    this.scrollDownSoon();
  });
}

async enviar() {
  const t = this.nuevo.trim();
  if (!t) return;

  // 👇 Optimista: lo ves al instante
  const optimista: ChatMessage = {
    id: -Date.now(), // temporal
    room_id: this.roomId,
    from_uid: this.meUid!,
    from_email: (await this.supa.client.auth.getUser()).data?.user?.email ?? 'yo@local',
    text: t,
    created_at: new Date().toISOString()
  };
  this.mensajes = [...this.mensajes, optimista];
  this.nuevo = '';
  this.scrollDownSoon();

  try {
    await this.chat.send(this.roomId, t);
    // Cuando llegue el INSERT del Realtime, la versión "real" quedará al final.
    // Si querés, podés luego deduplicar por tiempo/texto; no es crítico.
  } catch (e) {
    // Si falla el insert, quitamos el optimista
    this.mensajes = this.mensajes.filter(m => m.id !== optimista.id);
    console.warn('No se pudo enviar:', e);
  }
}
  soyYo(m: ChatMessage) { return m.from_uid === this.meUid; }
    scrollDownSoon() {
    setTimeout(() => {
      // 1) intenta con anchor
      this.bottom?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      // 2) y además usa IonContent por si el anchor no alcanza
      this.ionContent?.scrollToBottom(250);
    }, 50);
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
