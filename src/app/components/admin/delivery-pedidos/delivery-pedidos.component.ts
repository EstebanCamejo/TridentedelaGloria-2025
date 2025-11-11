import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon,
  IonCardSubtitle, IonSpinner, IonRefresher, IonRefresherContent, AlertController
} from '@ionic/angular/standalone';
import { checkmarkCircleOutline, closeCircleOutline, bicycleOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { FormsModule } from '@angular/forms';
import type { SegmentChangeEventDetail } from '@ionic/angular';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Observable, Subscription } from 'rxjs';
import { AdminDeliveryPedidosService, PedidoDeliveryPendiente, PedidoDeliveryListo } from 'src/app/services/admin-delivery-pedidos.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ModalController } from '@ionic/angular';
import { SelectDeliveryComponent } from '../select-delivery/select-delivery.component';

@Component({
  selector: 'app-delivery-pedidos',
  standalone: true,
  templateUrl: './delivery-pedidos.component.html',
  styleUrls: ['./delivery-pedidos.component.scss'],
  imports: [
    CommonModule, DatePipe, CurrencyPipe,
    IonHeader, IonToolbar, IonContent,
    IonSegment, IonSegmentButton, IonLabel,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonButton, IonIcon, IonSpinner, 
    IonRefresher, IonRefresherContent, FormsModule
  ],
  providers: [AlertController, ModalController]
})
export class DeliveryPedidosComponent implements OnInit, OnDestroy {
  email!: Observable<string | null>;
  tab: 'pendientes' | 'listos' = 'pendientes';

  // Pedidos pendientes de confirmación
  pedidosPendientes: PedidoDeliveryPendiente[] = [];
  cargandoPendientes = false;
  confirmandoId: number | null = null;
  rechazandoId: number | null = null;

  // Pedidos listos para entregar
  pedidosListos: PedidoDeliveryListo[] = [];
  cargandoListos = false;
  asignandoId: number | null = null;

  private pedidosPendientesSub?: Subscription;
  private pedidosListosSub?: Subscription;

  constructor(
    private router: Router,
    private supa: SupabaseService,
    private adminDeliverySvc: AdminDeliveryPedidosService,
    private toast: ToastrService,
    private spinner: SpinnerService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {
    console.log('[DeliveryPedidosComponent] 🏗️ Constructor ejecutado');
    addIcons({ 
      checkmarkCircleOutline,
      closeCircleOutline,
      bicycleOutline
    });
    this.email = this.supa.authEmail$;
  }

  async ngOnInit() {
    this.email = this.supa.authEmail$;
    
    // 📋 Cargar pedidos pendientes en tiempo real
    this.cargarPedidosPendientes();

    // 📋 Cargar pedidos listos para entregar en tiempo real
    this.cargarPedidosListos();
  }

  ngOnDestroy() {
    this.pedidosPendientesSub?.unsubscribe();
    this.pedidosListosSub?.unsubscribe();
  }

  private cargarPedidosPendientes() {
    this.cargandoPendientes = true;
    this.pedidosPendientesSub = this.adminDeliverySvc.pedidosDeliveryPendientes$().subscribe({
      next: (pedidos) => {
        this.pedidosPendientes = pedidos;
        this.cargandoPendientes = false;
        console.log('[DeliveryPedidosComponent] Pedidos pendientes actualizados:', pedidos);
      },
      error: (err) => {
        console.error('[DeliveryPedidosComponent] Error al cargar pedidos pendientes:', err);
        this.cargandoPendientes = false;
      }
    });
  }

  private cargarPedidosListos() {
    this.cargandoListos = true;
    this.pedidosListosSub = this.adminDeliverySvc.pedidosListosParaEntregar$().subscribe({
      next: (pedidos) => {
        this.pedidosListos = pedidos;
        this.cargandoListos = false;
        console.log('[DeliveryPedidosComponent] Pedidos listos actualizados:', pedidos);
      },
      error: (err) => {
        console.error('[DeliveryPedidosComponent] Error al cargar pedidos listos:', err);
        this.cargandoListos = false;
      }
    });
  }

  async confirmarPedidoDelivery(pedido: PedidoDeliveryPendiente) {
    if (this.confirmandoId === pedido.id) return;

    // Mostrar alert para ingresar tiempo estimado
    const alert = await this.alertCtrl.create({
      header: 'CONFIRMAR PEDIDO REPARTIDOR',
      message: `PEDIDO #${pedido.id}\n\nINGRESÁ EL TIEMPO TOTAL ESTIMADO EN MINUTOS (PREPARACIÓN + ENTREGA):`,
      inputs: [
        {
          name: 'tiempoEstimado',
          type: 'number',
          placeholder: 'EJ: 45',
          attributes: {
            min: '1',
            max: '300',
            step: '1',
            required: true
          }
        }
      ],
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'CONFIRMAR',
          cssClass: 'alert-button-confirm',
          handler: (data) => {
            const tiempoEstimado = parseInt(data?.tiempoEstimado, 10);
            if (!tiempoEstimado || isNaN(tiempoEstimado) || tiempoEstimado < 1 || tiempoEstimado > 300) {
              this.toast.error('INGRESÁ UN TIEMPO VÁLIDO ENTRE 1 Y 300 MINUTOS', '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
              return false; // Evita que se cierre el alert
            }
            this.procesarConfirmacionDelivery(pedido, tiempoEstimado);
            return true;
          }
        }
      ],
      cssClass: 'custom-alert',
      backdropDismiss: false // Evita que se cierre haciendo clic fuera
    });

    await alert.present();
  }

  private async procesarConfirmacionDelivery(pedido: PedidoDeliveryPendiente, tiempoEstimado: number) {
    try {
      this.confirmandoId = pedido.id;
      this.spinner.show({ immediate: true, minMs: 500 });
      console.log(`[DeliveryPedidosComponent] Confirmando pedido delivery ${pedido.id} con tiempo estimado: ${tiempoEstimado} min...`);
      
      await this.adminDeliverySvc.confirmarPedidoDelivery(pedido.id, tiempoEstimado);
      
      // 🔄 Actualizar UI inmediatamente - remover el pedido de la lista local
      this.pedidosPendientes = this.pedidosPendientes.filter(p => p.id !== pedido.id);
      
      this.toast.success(`PEDIDO REPARTIDOR #${pedido.id} CONFIRMADO CON TIEMPO ESTIMADO: ${tiempoEstimado} MINUTOS`, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      
      console.log(`[DeliveryPedidosComponent] ✅ Pedido delivery ${pedido.id} confirmado`);
      
    } catch (error: any) {
      console.error('[DeliveryPedidosComponent] Error al confirmar pedido delivery:', error);
      this.toast.error(('ERROR AL CONFIRMAR EL PEDIDO: ' + (error?.message || 'ERROR INESPERADO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.confirmandoId = null;
      this.spinner.hide();
    }
  }

  async rechazarPedidoDelivery(pedido: PedidoDeliveryPendiente) {
    if (this.rechazandoId === pedido.id) return;
    
    const alert = await this.alertCtrl.create({
      header: 'CONFIRMAR RECHAZO',
      message: `¿ESTÁS SEGURO DE QUE QUERÉS RECHAZAR EL PEDIDO REPARTIDOR #${pedido.id}?\n\nCLIENTE: ${pedido.cliente_email}\nTOTAL: $${pedido.total}`,
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'CONFIRMAR',
          cssClass: 'alert-button-confirm',
          handler: () => this.procesarRechazoDelivery(pedido)
        }
      ],
      cssClass: 'custom-alert'
    });
    
    await alert.present();
  }

  private async procesarRechazoDelivery(pedido: PedidoDeliveryPendiente) {
    try {
      this.rechazandoId = pedido.id;
      this.spinner.show({ immediate: true, minMs: 500 });
      console.log(`[DeliveryPedidosComponent] Rechazando pedido delivery ${pedido.id}...`);
      
      await this.adminDeliverySvc.rechazarPedidoDelivery(pedido.id);
      
      // Remover de la lista local
      this.pedidosPendientes = this.pedidosPendientes.filter(p => p.id !== pedido.id);
      
      this.toast.success(`PEDIDO REPARTIDOR #${pedido.id} RECHAZADO`, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      
      console.log(`[DeliveryPedidosComponent] ✅ Pedido delivery ${pedido.id} rechazado exitosamente`);
      
    } catch (error: any) {
      console.error('[DeliveryPedidosComponent] Error al rechazar pedido delivery:', error);
      this.toast.error(('ERROR AL RECHAZAR EL PEDIDO: ' + (error?.message || 'ERROR INESPERADO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.rechazandoId = null;
      this.spinner.hide();
    }
  }

  async asignarPedidoADelivery(pedido: PedidoDeliveryListo) {
    if (this.asignandoId === pedido.id) return;
    
    try {
      // Abrir modal para seleccionar delivery
      const modal = await this.modalCtrl.create({
        component: SelectDeliveryComponent,
        canDismiss: true,
        breakpoints: [0, 0.9],
        initialBreakpoint: 0.9,
      });

      await modal.present();

      const { role, data } = await modal.onWillDismiss();

      if (role === 'confirm' && data?.idDelivery) {
        this.asignandoId = pedido.id;
        
        console.log(`[DeliveryPedidosComponent] Asignando pedido delivery ${pedido.id} a delivery ${data.idDelivery}...`);
        
        await this.adminDeliverySvc.asignarPedidoADelivery(pedido.id, data.idDelivery);
        
        // Remover de la lista local
        this.pedidosListos = this.pedidosListos.filter(p => p.id !== pedido.id);
        
        const nombreDelivery = data.usuario?.nombres || data.usuario?.email || 'REPARTIDOR';
        this.toast.success(`PEDIDO REPARTIDOR #${pedido.id} ASIGNADO A ${nombreDelivery.toUpperCase()}`, '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        
        console.log(`[DeliveryPedidosComponent] ✅ Pedido delivery ${pedido.id} asignado exitosamente`);
      }
    } catch (error: any) {
      console.error('[DeliveryPedidosComponent] Error al asignar pedido delivery:', error);
      this.toast.error(('ERROR AL ASIGNAR EL PEDIDO: ' + (error?.message || 'ERROR INESPERADO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.asignandoId = null;
    }
  }

  handleRefresh(ev: CustomEvent) {
    console.log('[DeliveryPedidosComponent] Pull to refresh activado');
    // Recargar pedidos
    this.cargarPedidosPendientes();
    this.cargarPedidosListos();
    // Completar el refresh
    setTimeout(() => {
      (ev.target as any).complete();
    }, 1000);
  }

  onTabChange(ev: CustomEvent<SegmentChangeEventDetail>) {
    const v = ev.detail.value;
    if (v === 'pendientes' || v === 'listos') {
      this.tab = v;
    }
  }
}

