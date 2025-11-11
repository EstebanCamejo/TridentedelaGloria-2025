import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon,
  IonCardSubtitle, IonSpinner, IonRefresher, IonRefresherContent, AlertController
} from '@ionic/angular/standalone';
import { chevronForwardOutline, chatbubbleEllipsesOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { FormsModule } from '@angular/forms';
import type { SegmentChangeEventDetail } from '@ionic/angular';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription } from 'rxjs';
import { ChatService, MozoChatRow } from 'src/app/services/chat.service';
import { MozoRealtimeService } from 'src/app/services/mozo-realtime.service';
import { MozoPedidosService, PedidoPendiente } from 'src/app/services/mozo-pedidos.service';

@Component({
  selector: 'app-home-mozo',
  standalone: true,
  templateUrl: './home-mozo.component.html',
  styleUrls: ['./home-mozo.component.scss'],
  imports: [
    CommonModule, DatePipe, CurrencyPipe,
    IonHeader, IonToolbar, IonContent,
    IonSegment, IonSegmentButton, IonLabel,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonButton, IonIcon, IonSpinner, 
    IonRefresher, IonRefresherContent, FormsModule
  ]
})
export class HomeMozoComponent implements OnInit, OnDestroy {
  email!: Observable<string | null>;
  tab: 'pedidos' | 'en-curso' | 'consultas' = 'pedidos';

  // Pedidos pendientes de confirmación
  pedidos: PedidoPendiente[] = [];
  cargandoPedidos = false;
  confirmandoId: number | null = null;

  // Pedidos en curso
  pedidosEnCurso: PedidoPendiente[] = [];
  cargandoPedidosEnCurso = false;
  entregandoId: number | null = null;
  rechazandoId: number | null = null;

  chats: MozoChatRow[] = [];
  
  private pedidosSub?: Subscription;
  private pedidosEnCursoSub?: Subscription;


  constructor(
    private router: Router,
    private supa: SupabaseService,
    private chatSvc: ChatService,
    private spinner: SpinnerService,
    private toast: ToastrService,
    private mozoRt: MozoRealtimeService,
    private mozoPedidosSvc: MozoPedidosService,
    private alertCtrl: AlertController
  ) {
    console.log('[HomeMozoComponent] 🏗️ Constructor ejecutado');
    addIcons({ 
      chevronForwardOutline, 
      chatbubbleEllipsesOutline,
      checkmarkCircleOutline,
      closeCircleOutline
    });
    this.email = this.supa.authEmail$;
  }

  async ngOnInit() {
    this.email = this.supa.authEmail$;
    
    // Suscribirse a chats
    this.chatSvc.mozoChats$().subscribe(rows => this.chats = rows);

    // 📋 Cargar pedidos pendientes en tiempo real
    this.cargarPedidos();

    // 📋 Cargar pedidos en curso en tiempo real
    this.cargarPedidosEnCurso();

    // 🔔 Iniciar servicio de notificaciones para mozos (mover aquí)
    console.log('[HomeMozoComponent] 🚀 ngOnInit - Iniciando MozoRealtimeService...');
    await this.mozoRt.init();
    console.log('[HomeMozoComponent] ✅ MozoRealtimeService inicializado desde ngOnInit');
  }

  async ionViewWillEnter() {
    console.log('[HomeMozoComponent] 🚀 ionViewWillEnter ejecutado');
    // 🔔 Iniciar servicio de notificaciones para mozos (como maitre)
    await this.mozoRt.init();
    console.log('[HomeMozoComponent] ✅ MozoRealtimeService inicializado');
  }

  ionViewWillLeave() {
    // 🔔 Limpiar servicio de notificaciones (como maitre)
    this.mozoRt.dispose();
  }

  ngOnDestroy() {
    this.pedidosSub?.unsubscribe();
    this.pedidosEnCursoSub?.unsubscribe();
  }

  private cargarPedidos() {
    this.cargandoPedidos = true;
    this.pedidosSub = this.mozoPedidosSvc.pedidosPendientes$().subscribe({
      next: (pedidos) => {
        this.pedidos = pedidos;
        this.cargandoPedidos = false;
        console.log('[HomeMozoComponent] Pedidos actualizados:', pedidos);
      },
      error: (err) => {
        console.error('[HomeMozoComponent] Error al cargar pedidos:', err);
        this.cargandoPedidos = false;
      }
    });
  }

  private cargarPedidosEnCurso() {
    this.cargandoPedidosEnCurso = true;
    this.pedidosEnCursoSub = this.mozoPedidosSvc.pedidosEnCurso$().subscribe({
      next: (pedidos) => {
        this.pedidosEnCurso = pedidos;
        this.cargandoPedidosEnCurso = false;
        console.log('[HomeMozoComponent] Pedidos en curso actualizados:', pedidos);
      },
      error: (err) => {
        console.error('[HomeMozoComponent] Error al cargar pedidos en curso:', err);
        this.cargandoPedidosEnCurso = false;
      }
    });
  }

  async confirmarPedido(pedido: PedidoPendiente) {
    if (this.confirmandoId === pedido.id) return;

    try {
      this.confirmandoId = pedido.id;
      this.spinner.show({ immediate: true, minMs: 500 });
      console.log(`[HomeMozoComponent] Confirmando pedido ${pedido.id}...`);
      
      await this.mozoPedidosSvc.confirmarPedido(pedido.id);
      
      // 🔄 Actualizar UI inmediatamente - remover el pedido de la lista local
      this.pedidos = this.pedidos.filter(p => p.id !== pedido.id);
      
      console.log(`[HomeMozoComponent] ✅ Pedido ${pedido.id} confirmado`);
      
    } catch (error: any) {
      console.error('[HomeMozoComponent] Error al confirmar pedido:', error);
      this.toast.error((error?.message || 'ERROR AL CONFIRMAR EL PEDIDO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.confirmandoId = null;
      this.spinner.hide();
    }
  }

  async entregarPedido(pedido: PedidoPendiente) {
    if (this.entregandoId === pedido.id) return;

    try {
      this.entregandoId = pedido.id;
      this.spinner.show({ immediate: true, minMs: 500 });
      console.log(`[HomeMozoComponent] Entregando pedido ${pedido.id}...`);
      
      // Actualizar el estado del pedido a 'entregado'
      await this.mozoPedidosSvc.entregarPedido(pedido.id);
      
      // 🔄 Actualizar la lista local - remover el pedido de la lista
      this.pedidosEnCurso = this.pedidosEnCurso.filter(p => p.id !== pedido.id);
      
      console.log(`[HomeMozoComponent] ✅ Pedido ${pedido.id} entregado`);
      
    } catch (error: any) {
      console.error('[HomeMozoComponent] Error al entregar pedido:', error);
      this.toast.error((error?.message || 'ERROR AL ENTREGAR EL PEDIDO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.entregandoId = null;
      this.spinner.hide();
    }
  }

  handleRefresh(ev: CustomEvent) {
    console.log('[HomeMozoComponent] Pull to refresh activado');
    // Recargar pedidos pendientes y en curso
    this.cargarPedidos();
    this.cargarPedidosEnCurso();
    // Completar el refresh
    setTimeout(() => {
      (ev.target as any).complete();
    }, 1000);
  }

  abrirChat(roomId: number, mesa: number) {
    this.router.navigate(['/mozo/chat', roomId], { queryParams: { mesa } });
  }

  onTabChange(ev: CustomEvent<SegmentChangeEventDetail>) {
    const v = ev.detail.value;
    if (v === 'pedidos' || v === 'en-curso' || v === 'consultas') {
      this.tab = v;
    }
  }

  async rechazarPedidoPendiente(pedido: PedidoPendiente) {
    if (this.rechazandoId === pedido.id) return;
    
    const alert = await this.alertCtrl.create({
      header: 'CONFIRMAR RECHAZO',
      message: `¿ESTÁS SEGURO DE QUE QUERÉS RECHAZAR EL PEDIDO DE LA MESA ${pedido.mesa_numero}?\n\nEL CLIENTE PODRÁ MODIFICARLO Y ENVIARLO NUEVAMENTE.`,
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'CONFIRMAR',
          cssClass: 'alert-button-confirm',
          handler: () => this.procesarRechazoPendiente(pedido)
        }
      ],
      cssClass: 'custom-alert'
    });
    
    await alert.present();
  }

  private async procesarRechazoPendiente(pedido: PedidoPendiente) {

    try {
      this.rechazandoId = pedido.id;
      this.spinner.show({ immediate: true, minMs: 500 });
      console.log(`[HomeMozoComponent] Rechazando pedido pendiente ${pedido.id}...`);
      
      // Actualizar estado del pedido a 'rechazado por mozo'
      const { error } = await this.supa.client
        .from('pedidos')
        .update({
          estado: 'rechazado por mozo',
          updated_at: new Date().toISOString()
        })
        .eq('id', pedido.id);

      if (error) throw error;

      // Remover de la lista local de pedidos pendientes
      this.pedidos = this.pedidos.filter(p => p.id !== pedido.id);
      console.log(`[HomeMozoComponent] ✅ Pedido pendiente ${pedido.id} rechazado exitosamente`);
      
    } catch (error: any) {
      console.error('[HomeMozoComponent] Error al rechazar pedido pendiente:', error);
      this.toast.error((error?.message || 'ERROR AL RECHAZAR EL PEDIDO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.rechazandoId = null;
      this.spinner.hide();
    }
  }

  async rechazarPedido(pedido: PedidoPendiente) {
    if (this.rechazandoId === pedido.id) return;
    
    const alert = await this.alertCtrl.create({
      header: 'CONFIRMAR RECHAZO',
      message: `¿ESTÁS SEGURO DE QUE QUERÉS RECHAZAR EL PEDIDO DE LA MESA ${pedido.mesa_numero}?\n\nEL CLIENTE PODRÁ MODIFICARLO Y ENVIARLO NUEVAMENTE.`,
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'CONFIRMAR',
          cssClass: 'alert-button-confirm',
          handler: () => this.procesarRechazoEnCurso(pedido)
        }
      ],
      cssClass: 'custom-alert'
    });
    
    await alert.present();
  }

  private async procesarRechazoEnCurso(pedido: PedidoPendiente) {

    try {
      this.rechazandoId = pedido.id;
      this.spinner.show({ immediate: true, minMs: 500 });
      console.log(`[HomeMozoComponent] Rechazando pedido en curso ${pedido.id}...`);
      
      // Actualizar estado del pedido a 'rechazado por mozo'
      const { error } = await this.supa.client
        .from('pedidos')
        .update({
          estado: 'rechazado por mozo',
          updated_at: new Date().toISOString()
        })
        .eq('id', pedido.id);

      if (error) throw error;

      // Remover de la lista local de pedidos en curso
      this.pedidosEnCurso = this.pedidosEnCurso.filter(p => p.id !== pedido.id);
      console.log(`[HomeMozoComponent] ✅ Pedido en curso ${pedido.id} rechazado exitosamente`);
      
    } catch (error: any) {
      console.error('[HomeMozoComponent] Error al rechazar pedido en curso:', error);
      this.toast.error((error?.message || 'ERROR AL RECHAZAR EL PEDIDO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.rechazandoId = null;
      this.spinner.hide();
    }
  }

  irAConfirmarPago() {
    console.log('[HomeMozoComponent] Navegando a confirmar pago...');
    this.router.navigate(['/mozo/confirmar-pago']);
  }

}
