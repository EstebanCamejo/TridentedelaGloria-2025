import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon,
  IonCardSubtitle, IonSpinner, IonRefresher, IonRefresherContent, AlertController
} from '@ionic/angular/standalone';
import { checkmarkCircleOutline, closeCircleOutline, bicycleOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { FormsModule } from '@angular/forms';
import type { SegmentChangeEventDetail } from '@ionic/angular';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Observable, Subscription } from 'rxjs';
import { AdminDeliveryPedidosService, PedidoDeliveryPendiente, PedidoDeliveryListo, ProductoPedido } from 'src/app/services/admin-delivery-pedidos.service';
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
    CommonModule, CurrencyPipe,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSegment, IonSegmentButton, IonLabel,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonSpinner, 
    IonRefresher, IonRefresherContent, FormsModule
  ],
  providers: [AlertController, ModalController]
})
export class DeliveryPedidosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('carruselContainerPendientes', { static: false }) carruselContainerPendientes?: ElementRef<HTMLDivElement>;
  @ViewChild('carruselContainerListos', { static: false }) carruselContainerListos?: ElementRef<HTMLDivElement>;
  
  email!: Observable<string | null>;
  tab: 'pendientes' | 'listos' = 'pendientes';
  Math = Math; // Exponer Math para usar en el template

  // Pedidos pendientes de confirmación
  pedidosPendientes: PedidoDeliveryPendiente[] = [];
  cargandoPendientes = false;
  confirmandoId: number | null = null;
  rechazandoId: number | null = null;
  indicePendienteActual: number = 0;

  // Pedidos listos para entregar
  pedidosListos: PedidoDeliveryListo[] = [];
  cargandoListos = false;
  asignandoId: number | null = null;
  indiceListoActual: number = 0;

  private pedidosPendientesSub?: Subscription;
  private pedidosListosSub?: Subscription;

  constructor(
    private router: Router,
    private supa: SupabaseService,
    private adminDeliverySvc: AdminDeliveryPedidosService,
    private toast: ToastrService,
    private spinner: SpinnerService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    console.log('[DeliveryPedidosComponent] 🏗️ Constructor ejecutado');
    addIcons({ 
      checkmarkCircleOutline,
      closeCircleOutline,
      bicycleOutline,
      chevronBackOutline,
      chevronForwardOutline
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

  ngAfterViewInit() {
    // Esperar a que el DOM esté listo y forzar detección de cambios
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 100);
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
        this.indicePendienteActual = 0;
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
        this.indiceListoActual = 0;
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
    const tiempoEstimadoActual = pedido.tiempo_estimado || 0;
    const placeholderTexto = tiempoEstimadoActual > 0 
      ? `${tiempoEstimadoActual} minutos` 
      : 'EJ: 45';
    
    const alert = await this.alertCtrl.create({
      header: '¿CONFIRMAR PEDIDO?',
      message: 'AGREGAR DEMORA ESTIMADA',
      inputs: [
        {
          name: 'tiempoEstimado',
          type: 'number',
          placeholder: placeholderTexto,
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
          text: '',
          role: 'cancel',
          cssClass: 'btn-cancel-icon'
        },
        {
          text: '',
          cssClass: 'btn-confirm-icon',
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
      cssClass: 'confirmar-pedido-alert',
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
      header: '¿CONFIRMAR RECHAZO?',
      buttons: [
        {
          text: '',
          role: 'cancel',
          cssClass: 'btn-cancel-icon'
        },
        {
          text: '',
          cssClass: 'btn-confirm-icon',
          handler: () => this.procesarRechazoDelivery(pedido)
        }
      ],
      cssClass: 'rechazar-pedido-alert'
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
      
      this.toast.error(`PEDIDO REPARTIDOR #${pedido.id} RECHAZADO`, '', {
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

  // Métodos para carrusel de pendientes
  siguientePendiente() {
    if (this.indicePendienteActual < this.pedidosPendientes.length - 1) {
      this.indicePendienteActual++;
    }
  }

  anteriorPendiente() {
    if (this.indicePendienteActual > 0) {
      this.indicePendienteActual--;
    }
  }

  // Métodos para carrusel de listos
  siguienteListo() {
    if (this.indiceListoActual < this.pedidosListos.length - 1) {
      this.indiceListoActual++;
    }
  }

  anteriorListo() {
    if (this.indiceListoActual > 0) {
      this.indiceListoActual--;
    }
  }

  // Obtener altura del contenedor
  private obtenerAlturaContenedor(container?: ElementRef<HTMLDivElement>): number {
    if (container?.nativeElement) {
      return container.nativeElement.offsetHeight;
    }
    // Fallback: usar window.innerHeight con la nueva altura reducida
    return Math.max(window.innerHeight - 280, 400);
  }

  // Calcular transform para pendientes
  getTransformPendientes(): string {
    if (this.pedidosPendientes.length === 0) return 'translateY(0)';
    const alturaContenedor = this.obtenerAlturaContenedor(this.carruselContainerPendientes);
    const translateValue = this.indicePendienteActual * alturaContenedor;
    return `translateY(-${translateValue}px)`;
  }

  // Calcular transform para listos
  getTransformListos(): string {
    if (this.pedidosListos.length === 0) return 'translateY(0)';
    const alturaContenedor = this.obtenerAlturaContenedor(this.carruselContainerListos);
    const translateValue = this.indiceListoActual * alturaContenedor;
    return `translateY(-${translateValue}px)`;
  }

  // Obtener pedidos visibles para pendientes (2 por pantalla)
  obtenerPendientesVisibles(): PedidoDeliveryPendiente[] {
    const inicio = this.indicePendienteActual * 2;
    return this.pedidosPendientes.slice(inicio, inicio + 2);
  }

  // Obtener pedidos visibles para listos (2 por pantalla)
  obtenerListosVisibles(): PedidoDeliveryListo[] {
    const inicio = this.indiceListoActual * 2;
    return this.pedidosListos.slice(inicio, inicio + 2);
  }

  // Obtener fecha separada
  obtenerFecha(fechaCompleta: string): string {
    const fecha = new Date(fechaCompleta);
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  // Obtener horario separado
  obtenerHorario(fechaCompleta: string): string {
    const fecha = new Date(fechaCompleta);
    return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  // Mostrar productos en modal
  async verProductos(pedido: PedidoDeliveryPendiente | PedidoDeliveryListo) {
    try {
      const productos = await this.adminDeliverySvc.obtenerProductosPedido(pedido.id);
      
      const productosTexto = productos
        .map(p => `${p.nombre.toUpperCase()}: ${p.cantidad}`)
        .join('\n\n');

      const alert = await this.alertCtrl.create({
        header: 'PRODUCTOS DEL PEDIDO',
        message: productosTexto,
        buttons: [
          {
            text: 'CERRAR',
            cssClass: 'alert-button-confirm'
          }
        ],
        cssClass: 'productos-alert'
      });

      await alert.present();
    } catch (error: any) {
      console.error('[DeliveryPedidosComponent] Error al obtener productos:', error);
      this.toast.error('ERROR AL OBTENER PRODUCTOS', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    }
  }
}

