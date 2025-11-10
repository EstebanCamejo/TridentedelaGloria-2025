import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillEnter, ViewWillLeave, ViewDidEnter } from '@ionic/angular';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon,
  IonCardSubtitle, IonSpinner, IonRefresher, IonRefresherContent, AlertController
} from '@ionic/angular/standalone';
import { checkmarkCircleOutline, locationOutline, chatbubbleEllipsesOutline, navigateOutline, chevronForwardOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { FormsModule } from '@angular/forms';
import type { SegmentChangeEventDetail } from '@ionic/angular';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Observable, Subscription } from 'rxjs';
import { DeliveryPedidosService, PedidoDeliveryAsignado, PedidoDeliveryEnCamino } from 'src/app/services/delivery-pedidos.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { DeliveryRealtimeService } from 'src/app/services/delivery-realtime.service';
import { ModalController } from '@ionic/angular/standalone';
import { MapaRutaComponent } from 'src/app/components/delivery/mapa-ruta/mapa-ruta.component';
import { DeliveryMapaService } from 'src/app/services/delivery-mapa.service';
import { ChatService, DeliveryChatRow } from 'src/app/services/chat.service';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-home-delivery',
  standalone: true,
  templateUrl: './home-delivery.component.html',
  styleUrls: ['./home-delivery.component.scss'],
  imports: [
    CommonModule, DatePipe, CurrencyPipe,
    IonHeader, IonToolbar, IonContent,
    IonSegment, IonSegmentButton, IonLabel,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonButton, IonIcon, IonSpinner, 
    IonRefresher, IonRefresherContent, FormsModule
  ]
})
export class HomeDeliveryComponent implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave, ViewDidEnter {
  email!: Observable<string | null>;
  tab: 'asignados' | 'en-camino' | 'consultas' = 'asignados';

  // Pedidos asignados
  pedidosAsignados: PedidoDeliveryAsignado[] = [];
  cargandoAsignados = false;
  confirmandoId: number | null = null;

  // Pedidos en camino
  pedidosEnCamino: PedidoDeliveryEnCamino[] = [];
  cargandoEnCamino = false;
  entregandoId: number | null = null;

  private pedidosAsignadosSub?: Subscription;
  private pedidosEnCaminoSub?: Subscription;
  private appStateListener?: PluginListenerHandle; // 🆕 Listener para cuando vuelve de Maps
  private tabGuardado: 'asignados' | 'en-camino' | 'consultas' = 'asignados'; // 🆕 Guardar tab antes de salir
  private isComponentActive = true; // 🆕 Flag para verificar que el componente sigue activo

  // Chats del delivery
  chats: { room_id: number; pedido_id: number; ultimo: string | null; updated: string | null }[] = [];

  constructor(
    private router: Router,
    private supa: SupabaseService,
    private deliveryPedidosSvc: DeliveryPedidosService,
    private toast: ToastrService,
    private spinner: SpinnerService,
    private alertCtrl: AlertController,
    private deliveryRt: DeliveryRealtimeService,
    private modalCtrl: ModalController,
    private mapaService: DeliveryMapaService,
    private chatService: ChatService
  ) {
    console.log('[HomeDeliveryComponent] 🏗️ Constructor ejecutado');
    addIcons({ 
      checkmarkCircleOutline,
      locationOutline,
      chatbubbleEllipsesOutline,
      navigateOutline,
      chevronForwardOutline
    });
    this.email = this.supa.authEmail$;
  }

  async ngOnInit() {
    this.email = this.supa.authEmail$;
    
    // 📋 Cargar pedidos asignados en tiempo real
    this.cargarPedidosAsignados();

    // 📋 Cargar pedidos en camino en tiempo real
    this.cargarPedidosEnCamino();

    // 💬 Suscribirse a chats del delivery
    this.chatService.deliveryChats$().subscribe(chats => {
      this.chats = chats;
      console.log('[HomeDeliveryComponent] Chats actualizados:', chats);
    });

    // 🔔 Iniciar servicio de notificaciones para delivery
    console.log('[HomeDeliveryComponent] 🚀 ngOnInit - Iniciando DeliveryRealtimeService...');
    await this.deliveryRt.init();
    console.log('[HomeDeliveryComponent] ✅ DeliveryRealtimeService inicializado desde ngOnInit');
  }

  async ionViewWillEnter() {
    console.log('[HomeDeliveryComponent] 🚀 ionViewWillEnter ejecutado');
    this.isComponentActive = true; // 🆕 Marcar componente como activo
    
    // 🔔 Iniciar servicio de notificaciones para delivery
    await this.deliveryRt.init();
    console.log('[HomeDeliveryComponent] ✅ DeliveryRealtimeService inicializado');
    
    // 🆕 Listener REFORZADO para cuando la app vuelve del background (ej: después de abrir Google Maps)
    this.appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && this.isComponentActive) {
        console.log('[HomeDeliveryComponent] 📱 App volvió al foreground, iniciando recuperación...');
        
        try {
          // 1. Restaurar sesión de Supabase (por si se perdió al salir)
          console.log('[HomeDeliveryComponent] 🔄 Restaurando sesión de Supabase...');
          await this.supa.restoreSessionAfterCamera();
          
          // 2. Esperar un poco para que la app se estabilice
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 3. Verificar que el componente sigue activo antes de continuar
          if (!this.isComponentActive) {
            console.log('[HomeDeliveryComponent] ⚠️ Componente ya no está activo, cancelando recuperación');
            return;
          }
          
          // 4. Verificar que estamos en la ruta correcta
          const currentUrl = this.router.url;
          if (!currentUrl.includes('home-delivery')) {
            console.log('[HomeDeliveryComponent] ⚠️ No estamos en home-delivery, navegando...');
            await this.router.navigate(['/home-delivery'], { replaceUrl: false });
            // Esperar un poco más después de navegar
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // 5. Restaurar tab guardado
          if (this.tabGuardado && this.tabGuardado !== this.tab) {
            console.log('[HomeDeliveryComponent] 🔄 Restaurando tab:', this.tabGuardado);
            this.tab = this.tabGuardado;
          }
          
          // 6. Reinicializar servicios
          console.log('[HomeDeliveryComponent] 🔄 Reinicializando servicios...');
          await this.deliveryRt.init();
          
          // 7. Recargar datos
          console.log('[HomeDeliveryComponent] 📋 Recargando pedidos...');
          this.cargarPedidosAsignados();
          this.cargarPedidosEnCamino();
          
          // 8. Recargar chats
          this.chatService.deliveryChats$().subscribe(chats => {
            if (this.isComponentActive) {
              this.chats = chats;
              console.log('[HomeDeliveryComponent] 💬 Chats actualizados:', chats);
            }
          });
          
          console.log('[HomeDeliveryComponent] ✅ Recuperación completada exitosamente');
          
        } catch (error: any) {
          console.error('[HomeDeliveryComponent] ❌ Error durante recuperación:', error);
          // Intentar navegar de vuelta a home-delivery como último recurso
          try {
            await this.router.navigate(['/home-delivery'], { replaceUrl: false });
          } catch (navError) {
            console.error('[HomeDeliveryComponent] ❌ Error crítico al navegar:', navError);
          }
        }
      }
    });
  }

  // 🆕 ionViewDidEnter como respaldo adicional
  ionViewDidEnter() {
    console.log('[HomeDeliveryComponent] 🚀 ionViewDidEnter ejecutado (respaldo)');
    this.isComponentActive = true;
    
    // Verificar y restaurar estado si es necesario
    setTimeout(async () => {
      if (this.isComponentActive) {
        try {
          // Verificar sesión
          const { data: session } = await this.supa.client.auth.getSession();
          if (!session?.session) {
            console.log('[HomeDeliveryComponent] ⚠️ No hay sesión, restaurando...');
            await this.supa.restoreSessionAfterCamera();
          }
          
          // Recargar datos si están vacíos
          if (this.pedidosAsignados.length === 0 && !this.cargandoAsignados) {
            this.cargarPedidosAsignados();
          }
          if (this.pedidosEnCamino.length === 0 && !this.cargandoEnCamino) {
            this.cargarPedidosEnCamino();
          }
        } catch (error) {
          console.error('[HomeDeliveryComponent] ❌ Error en ionViewDidEnter:', error);
        }
      }
    }, 300);
  }

  ionViewWillLeave() {
    console.log('[HomeDeliveryComponent] 👋 ionViewWillLeave ejecutado');
    this.isComponentActive = false; // 🆕 Marcar componente como inactivo
    this.tabGuardado = this.tab; // 🆕 Guardar tab actual antes de salir
    
    // 🔔 Limpiar servicio de notificaciones
    this.deliveryRt.dispose();
    // 🆕 Remover listener de appStateChange
    this.appStateListener?.remove();
  }

  ngOnDestroy() {
    this.pedidosAsignadosSub?.unsubscribe();
    this.pedidosEnCaminoSub?.unsubscribe();
    // 🆕 Limpiar listener de appStateChange
    this.appStateListener?.remove();
  }

  private cargarPedidosAsignados() {
    this.cargandoAsignados = true;
    this.pedidosAsignadosSub = this.deliveryPedidosSvc.pedidosAsignados$().subscribe({
      next: (pedidos) => {
        this.pedidosAsignados = pedidos;
        this.cargandoAsignados = false;
        console.log('[HomeDeliveryComponent] Pedidos asignados actualizados:', pedidos);
      },
      error: (err) => {
        console.error('[HomeDeliveryComponent] Error al cargar pedidos asignados:', err);
        this.cargandoAsignados = false;
      }
    });
  }

  private cargarPedidosEnCamino() {
    this.cargandoEnCamino = true;
    this.pedidosEnCaminoSub = this.deliveryPedidosSvc.pedidosEnCamino$().subscribe({
      next: (pedidos) => {
        this.pedidosEnCamino = pedidos;
        this.cargandoEnCamino = false;
        console.log('[HomeDeliveryComponent] Pedidos en camino actualizados:', pedidos);
      },
      error: (err) => {
        console.error('[HomeDeliveryComponent] Error al cargar pedidos en camino:', err);
        this.cargandoEnCamino = false;
      }
    });
  }

  async confirmarRecepcionPedido(pedido: PedidoDeliveryAsignado) {
    if (this.confirmandoId === pedido.id) return;

    try {
      this.confirmandoId = pedido.id;
      this.spinner.show({ immediate: true, minMs: 500 });
      console.log(`[HomeDeliveryComponent] Confirmando recepción del pedido ${pedido.id}...`);
      
      await this.deliveryPedidosSvc.confirmarRecepcionPedido(pedido.id);
      
      // 🔄 Actualizar UI inmediatamente - remover el pedido de la lista local
      this.pedidosAsignados = this.pedidosAsignados.filter(p => p.id !== pedido.id);
      
      this.toast.success(`RECEPCIÓN DEL PEDIDO #${pedido.id} CONFIRMADA`, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      
      console.log(`[HomeDeliveryComponent] ✅ Recepción del pedido ${pedido.id} confirmada`);
      
    } catch (error: any) {
      console.error('[HomeDeliveryComponent] Error al confirmar recepción:', error);
      this.toast.error(('ERROR AL CONFIRMAR LA RECEPCIÓN: ' + (error?.message || 'ERROR INESPERADO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.confirmandoId = null;
      this.spinner.hide();
    }
  }

  async entregarPedidoAlCliente(pedido: PedidoDeliveryEnCamino) {
    if (this.entregandoId === pedido.id) return;

    const alert = await this.alertCtrl.create({
      header: 'CONFIRMAR ENTREGA',
      message: `¿CONFIRMÁS QUE ENTREGASTE EL PEDIDO #${pedido.id} AL CLIENTE?\n\nCLIENTE: ${pedido.cliente_email}\nDIRECCIÓN: ${pedido.direccion_entrega || 'SIN DIRECCIÓN'}`,
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'CONFIRMAR',
          cssClass: 'alert-button-confirm',
          handler: () => this.procesarEntrega(pedido)
        }
      ],
      cssClass: 'custom-alert'
    });
    
    await alert.present();
  }

  private async procesarEntrega(pedido: PedidoDeliveryEnCamino) {
    try {
      this.entregandoId = pedido.id;
      this.spinner.show({ immediate: true, minMs: 500 });
      console.log(`[HomeDeliveryComponent] Entregando pedido ${pedido.id} al cliente...`);
      console.log(`[HomeDeliveryComponent] Estado actual del pedido: ${pedido.estado}`);
      console.log(`[HomeDeliveryComponent] Pedido ID: ${pedido.id}`);
      
      await this.deliveryPedidosSvc.entregarPedidoAlCliente(pedido.id);
      
      // Remover de la lista local
      this.pedidosEnCamino = this.pedidosEnCamino.filter(p => p.id !== pedido.id);
      
      this.toast.success(`PEDIDO #${pedido.id} ENTREGADO EXITOSAMENTE`, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      
      console.log(`[HomeDeliveryComponent] ✅ Pedido ${pedido.id} entregado exitosamente`);
      
    } catch (error: any) {
      console.error('[HomeDeliveryComponent] ❌ Error al entregar pedido:', error);
      console.error('[HomeDeliveryComponent] Error completo:', JSON.stringify(error, null, 2));
      
      let mensajeError = 'ERROR INESPERADO AL ENTREGAR EL PEDIDO';
      if (error?.message) {
        mensajeError = error.message.toUpperCase();
      } else if (error?.code) {
        mensajeError = `ERROR ${error.code}: ${(error.message || 'ERROR DESCONOCIDO').toUpperCase()}`;
      }
      
      this.toast.error(mensajeError, '', {
        positionClass: 'toast-center',
        timeOut: 5000
      });
    } finally {
      this.entregandoId = null;
      this.spinner.hide();
    }
  }

  async verMapaRuta(pedido: PedidoDeliveryEnCamino) {
    try {
      if (!pedido.latitud || !pedido.longitud) {
        this.toast.warning('NO HAY COORDENADAS DE DESTINO DISPONIBLES PARA ESTE PEDIDO', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        return;
      }

      // 🆕 Guardar estado antes de abrir modal
      this.tabGuardado = this.tab;
      console.log('[HomeDeliveryComponent] 📍 Guardando estado antes de abrir mapa. Tab:', this.tabGuardado);

      const modal = await this.modalCtrl.create({
        component: MapaRutaComponent,
        componentProps: {
          pedidoId: pedido.id,
          direccionEntrega: pedido.direccion_entrega || '',
          latitudDestino: pedido.latitud,
          longitudDestino: pedido.longitud
        },
        presentingElement: await this.modalCtrl.getTop() || undefined
      });

      // 🆕 Listener para cuando se cierra el modal (por si se abrió Maps desde ahí)
      modal.onDidDismiss().then(async () => {
        console.log('[HomeDeliveryComponent] 🗺️ Modal de mapa cerrado, verificando estado...');
        // Pequeño delay para dar tiempo a que la app se estabilice
        setTimeout(async () => {
          if (this.isComponentActive) {
            try {
              // Restaurar sesión por si se abrió Maps desde el modal
              await this.supa.restoreSessionAfterCamera();
              // Recargar datos
              this.cargarPedidosAsignados();
              this.cargarPedidosEnCamino();
            } catch (error) {
              console.error('[HomeDeliveryComponent] ❌ Error al restaurar después de cerrar modal:', error);
            }
          }
        }, 300);
      });

      await modal.present();
    } catch (error: any) {
      console.error('[HomeDeliveryComponent] Error al abrir mapa:', error);
      this.toast.error(('ERROR AL ABRIR EL MAPA: ' + (error?.message || 'ERROR INESPERADO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    }
  }

  // 🆕 Método REFORZADO para abrir navegación externa (Google Maps/Waze)
  async abrirNavegacionExterna(pedido: PedidoDeliveryEnCamino) {
    // Guardar estado antes de salir
    this.tabGuardado = this.tab;
    console.log('[HomeDeliveryComponent] 📍 Guardando estado antes de abrir navegación externa. Tab:', this.tabGuardado);
    
    // Preparar sesión antes de salir (similar a cámara)
    try {
      await this.supa.prepareForCameraUse();
      console.log('[HomeDeliveryComponent] ✅ Sesión preparada antes de abrir Maps');
    } catch (error) {
      console.warn('[HomeDeliveryComponent] ⚠️ Error al preparar sesión:', error);
    }
    if (!pedido.latitud || !pedido.longitud) {
      this.toast.warning('NO HAY COORDENADAS DE DESTINO DISPONIBLES', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      return;
    }

    // Usar el servicio para abrir Google Maps
    await this.mapaService.abrirGoogleMaps(
      { latitud: pedido.latitud, longitud: pedido.longitud },
      pedido.direccion_entrega
    );
  }

  async irAChat(pedido: PedidoDeliveryEnCamino | PedidoDeliveryAsignado) {
    console.log('[HomeDeliveryComponent] 💬 ===== INICIANDO irAChat =====');
    console.log('[HomeDeliveryComponent] 📋 Pedido:', {
      id: pedido.id,
      estado: pedido.estado
    });

    try {
      console.log('[HomeDeliveryComponent] 🔍 Obteniendo UID del delivery...');
      const uid = await this.supa.getUserIdOrThrow();
      console.log('[HomeDeliveryComponent] ✅ Delivery UID:', uid);
      
      // Obtener o crear sala de chat para este pedido
      // Primero obtener el cliente_uid desde el pedido
      console.log('[HomeDeliveryComponent] 🔍 Obteniendo información del pedido...');
      const { data: pedidoData, error: pedidoError } = await this.supa.client
        .from('pedidos')
        .select('idCliente, tipo_pedido, idDelivery')
        .eq('id', pedido.id)
        .single();

      console.log('[HomeDeliveryComponent] 📥 Resultado consulta pedido:', {
        pedidoData,
        pedidoError,
        idCliente: pedidoData?.idCliente
      });

      if (pedidoError) {
        console.error('[HomeDeliveryComponent] ❌ Error al consultar pedido:', pedidoError);
        this.toast.error('ERROR AL OBTENER INFORMACIÓN DEL PEDIDO', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        return;
      }

      if (!pedidoData?.idCliente) {
        console.error('[HomeDeliveryComponent] ❌ No se encontró idCliente en el pedido');
        this.toast.warning('NO SE PUDO OBTENER INFORMACIÓN DEL CLIENTE', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        return;
      }

      console.log('[HomeDeliveryComponent] 📋 Datos para crear sala:', {
        pedidoId: pedido.id,
        cliente_uid: pedidoData.idCliente,
        delivery_uid: uid
      });

      // Crear/obtener sala de chat
      console.log('[HomeDeliveryComponent] 🔍 Creando/obteniendo sala de chat...');
      const roomId = await this.chatService.ensureRoomByPedidoDelivery(
        pedido.id,
        pedidoData.idCliente,
        uid
      );

      console.log('[HomeDeliveryComponent] ✅ Sala obtenida. Room ID:', roomId);
      console.log('[HomeDeliveryComponent] 🧭 Navegando al chat...');

      // Navegar al chat
      this.router.navigate(['/delivery/chat', roomId]).then(
        () => console.log('[HomeDeliveryComponent] ✅ Navegación exitosa'),
        (err) => console.error('[HomeDeliveryComponent] ❌ Error en navegación:', err)
      );

    } catch (error: any) {
      console.error('[HomeDeliveryComponent] ❌ ===== ERROR CRÍTICO EN irAChat =====');
      console.error('[HomeDeliveryComponent] ❌ Error:', error);
      console.error('[HomeDeliveryComponent] ❌ Error completo:', JSON.stringify(error, null, 2));
      console.error('[HomeDeliveryComponent] ❌ Stack trace:', error?.stack);
      this.toast.error(('ERROR AL ABRIR EL CHAT: ' + (error?.message || 'ERROR DESCONOCIDO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 5000
      });
    }
  }

  handleRefresh(ev: CustomEvent) {
    console.log('[HomeDeliveryComponent] Pull to refresh activado');
    // Recargar pedidos
    this.cargarPedidosAsignados();
    this.cargarPedidosEnCamino();
    // Completar el refresh
    setTimeout(() => {
      (ev.target as any).complete();
    }, 1000);
  }

  onTabChange(ev: CustomEvent<SegmentChangeEventDetail>) {
    const v = ev.detail.value;
    if (v === 'asignados' || v === 'en-camino' || v === 'consultas') {
      this.tab = v;
    }
  }

  abrirChatDelivery(roomId: number, pedidoId: number) {
    this.router.navigate(['/delivery/chat', roomId], { queryParams: { pedidoId } });
  }
}

