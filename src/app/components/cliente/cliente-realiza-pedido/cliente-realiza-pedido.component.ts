
import { Component, OnInit, ViewChild, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { MenuService } from 'src/app/services/menu.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { SesionService } from 'src/app/services/sesion.service';
import { ModalController, AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { DireccionDeliveryComponent, DireccionDelivery } from '../direccion-delivery/direccion-delivery.component';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar, IonTitle, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { addIcons } from 'ionicons';
import { checkmarkOutline, chevronBackOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';
import { Pedido } from '../../../models/pedido.model'
import { register } from 'swiper/element/bundle';
import { PedidosService } from 'src/app/services/pedidos.service';
import { RealtimeChannel } from '@supabase/supabase-js';

let _swiperRegistered = false;

@Component({
  selector: 'app-cliente-realiza-pedido',
  templateUrl: './cliente-realiza-pedido.component.html',
  styleUrls: ['./cliente-realiza-pedido.component.scss'],
  imports: [CommonModule, IonicModule],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ClienteRealizaPedidoComponent implements OnInit, OnDestroy {

  @ViewChild('productsSwiper') productsSwiper!: ElementRef;

  idCliente!: string;
  cantidadesProductos: { [idProducto: string]: number } = {};
  cantidadesProductosEnCarrito: Array<{
    id: number;
    cantidad: number;
    precio_unitario: number;
    tiempo_preparacion: number;
  }> = [];
  precioAcumulado: number = 0;
  tiempoDeEspera: number = 0;

  menu: any[] = [];
  menuFiltrado: any[] = [];
  filtroActual: string = 'comida';
  currentSlide: number = 0;

  cargando = false;
  pedidoRealizado = false;
  idPedido: number | null = null;
  pedido: Pedido | null = null;
  
  // Propiedades para modo edición
  modoEdicion = false;
  pedidoAEditar: number | null = null;
  
  // Propiedades para delivery
  tipoPedido: 'mesa' | 'delivery' = 'mesa';
  direccionDelivery?: DireccionDelivery; 

  // Variables para el control del acelerómetro
  private lastX: number = 0;
  private lastY: number = 0;
  private lastZ: number = 0;
  private isListening: boolean = false;
  private motionHandler!: (event: DeviceMotionEvent) => void;
  
  // Suscripción realtime para actualizar el menú automáticamente
  private menuChannel?: RealtimeChannel;
  
  // Configuración de sensibilidad (ajustable)
  private readonly TILT_THRESHOLD_X = 6.0;    // Menos sensible para izquierda/derecha
  private readonly TILT_THRESHOLD_Y = 4.0;    // Más sensible para adelante/atrás
  private readonly SHAKE_THRESHOLD = 40;
  private readonly SHAKE_TIMEOUT = 1000;
  private readonly ACTION_COOLDOWN = 500;     // Más tiempo entre acciones

  private readonly MIN_MOVEMENT = 0.6;        // Movimiento mínimo requerido
  private readonly DOMINANCE_RATIO = 0.75;  
  
  private lastActionTime: number = 0;
  private lastShakeTime: number = 0;
  private shakeCount: number = 0;

  //private frontalMovementCount: number = 0;

  constructor(
    private pedidosSvc: PedidosService, 
    private router: Router, 
    private route: ActivatedRoute,
    private menuService: MenuService, 
    private toastr: ToastrService,
    private supa: SupabaseService,
    private ngZone: NgZone,
    private spinner: SpinnerService,
    private sesion: SesionService,
    private modalCtrl: ModalController,
    private alertController: AlertController
  ) {
    addIcons({
      'checkmark-outline': checkmarkOutline,
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'close-outline': closeOutline
    });
    if (!_swiperRegistered) { register(); _swiperRegistered = true; }
  }

  async ngOnInit() {
    try {
      // Obtener query params (usar firstValueFrom para esperar el primer valor)
      const params = await firstValueFrom(this.route.queryParams);
      const tipoPedido = params['tipo'];
      
      // Si es pedido delivery, verificar que es cliente registrado
      if (tipoPedido === 'delivery') {
        this.tipoPedido = 'delivery';
        
        // Esperar a que el perfil esté cargado
        await this.esperarPerfilCargado();
        
        // Verificar que es cliente registrado (no anónimo)
        const esClienteReg = this.sesion.esCliente() && 
                             this.sesion.usuarioBD?.perfil === 'clienteReg';
        
        if (!esClienteReg) {
          console.warn('[ClienteRealizaPedidoComponent] ❌ Cliente no registrado intentando hacer pedido repartidor');
          this.toastr.error('SOLO LOS CLIENTES REGISTRADOS PUEDEN HACER PEDIDOS DE REPARTIDOR', '', {
            positionClass: 'toast-center',
            timeOut: 4000
          });
          // Redirigir a home-cliente
          this.router.navigate(['/home-cliente']);
          return;
        }
        
        console.log('[ClienteRealizaPedidoComponent] ✅ Cliente registrado validado para pedido repartidor');
      } else {
        this.tipoPedido = 'mesa';
      }
      
      // Verificar si está en modo edición
      if (params['editar'] === 'true' && params['pedidoId']) {
        this.modoEdicion = true;
        this.pedidoAEditar = +params['pedidoId'];
        this.cargarPedidoParaEditar(this.pedidoAEditar);
      }
      
      this.idCliente = await this.menuService.getClienteIdActual(); // uuid string
      this.menu = await this.menuService.obtenerMenu();
      this.filtrarMenuPorCategoria();
      
      // Suscribirse a cambios en tiempo real del menú
      this.suscribirAMenuRealtime();
      
      // Inicializar menuFiltrado con el filtro por defecto
      this.menuFiltrado = this.menu.filter(producto => 
        producto.categoria_menu === this.filtroActual
      );
      
    } catch (err) {
      console.error(err);
      this.toastr.error('NO SE PUDO IDENTIFICAR AL USUARIO', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    }
  }

  /**
   * Filtra el menú según la categoría actual
   */
  private filtrarMenuPorCategoria() {
    this.menuFiltrado = this.menu.filter(producto => 
      producto.categoria_menu === this.filtroActual
    );
    this.currentSlide = 0;
  }

  /**
   * Suscripción a cambios en tiempo real de la tabla menu
   */
  private suscribirAMenuRealtime() {
    console.log('[ClienteRealizaPedidoComponent] 📡 Suscribiéndose a cambios del menú en tiempo real...');
    
    this.menuChannel = this.supa.client
      .channel('menu-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'menu'
        },
        async (payload) => {
          console.log('[ClienteRealizaPedidoComponent] 🆕 Nuevo producto detectado:', payload);
          
          // Obtener el nuevo producto completo desde la BD
          const nuevoProducto = payload.new as any;
          
          // Agregar el nuevo producto al array del menú
          this.menu = [...this.menu, nuevoProducto];
          
          // Si el nuevo producto pertenece a la categoría actual, agregarlo también al menú filtrado
          if (nuevoProducto.categoria_menu === this.filtroActual) {
            this.menuFiltrado = [...this.menuFiltrado, nuevoProducto];
            
            // Mostrar notificación
            this.toastr.info(`NUEVO ${nuevoProducto.categoria_menu.toUpperCase()}: ${nuevoProducto.nombre.toUpperCase()}`, '', {
              positionClass: 'toast-center',
              timeOut: 3000
            });
          }
        }
      )
      .subscribe();
    
    console.log('[ClienteRealizaPedidoComponent] ✅ Suscripción a menú activa');
  }

  /**
   * Espera a que el perfil del usuario esté cargado en SesionService
   */
  private async esperarPerfilCargado(): Promise<void> {
    // Si ya está cargado, retornar inmediatamente
    if (this.sesion.perfilCargado) {
      return;
    }
    
    // Esperar hasta que esté cargado (máximo 5 segundos)
    const maxWait = 5000;
    const startTime = Date.now();
    
    while (!this.sesion.perfilCargado && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.sesion.perfilCargado) {
      console.warn('[ClienteRealizaPedidoComponent] ⚠️ Timeout esperando perfil cargado');
    }
  }

  /**
   * Abre el modal para solicitar la dirección de entrega
   */
  private async solicitarDireccion(): Promise<DireccionDelivery | null> {
    const modal = await this.modalCtrl.create({
      component: DireccionDeliveryComponent,
      canDismiss: true,
      breakpoints: [0, 0.9],
      initialBreakpoint: 0.9,
    });

    await modal.present();

    const { role, data } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      console.log('[ClienteRealizaPedidoComponent] ✅ Dirección confirmada:', data);
      return data as DireccionDelivery;
    }

    console.log('[ClienteRealizaPedidoComponent] ❌ Dirección cancelada');
    return null;
  }

  ngOnDestroy() {
    this.stopMotionTracking();
    // Desuscribirse del canal de menú
    if (this.menuChannel) {
      console.log('[ClienteRealizaPedidoComponent] 🔴 Desuscribiéndose del menú en tiempo real...');
      this.menuChannel.unsubscribe();
      this.menuChannel = undefined;
    }
    //this.frontalMovementCount = 0;
  }



  /**
   * Inicia el seguimiento de movimientos del dispositivo
   */
  private startMotionTracking() {
    console.log('🔍 Iniciando diagnóstico de sensores...');
    
    if (!window.DeviceMotionEvent) {
      console.error('❌ DeviceMotionEvent NO está soportado en este navegador/dispositivo');
      this.toastr.error('DeviceMotion no soportado en este dispositivo');
      return;
    }

    console.log('✅ DeviceMotionEvent está soportado');
    
    // Verificar si tenemos acceso a los sensores
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      console.log('📱 Dispositivo iOS - solicitando permisos...');
      (DeviceMotionEvent as any).requestPermission()
        .then((response: string) => {
          console.log('📱 Respuesta de permisos:', response);
          if (response === 'granted') {
            this.startListening();
          } else {
            this.toastr.error('Permisos de movimiento denegados');
          }
        })
        .catch((error: any) => {
          console.error('❌ Error en permisos:', error);
        });
    } else {
      console.log('🤖 Dispositivo Android - iniciando sensores directamente');
      this.startListening();
    }
  }

  private startListening() {
    console.log('🎯 Agregando event listener para devicemotion');
    
    window.addEventListener('devicemotion', (event) => {
      console.log('📊 Evento de movimiento recibido:', {
        x: event.accelerationIncludingGravity?.x,
        y: event.accelerationIncludingGravity?.y,
        z: event.accelerationIncludingGravity?.z
      });
      this.handleDeviceMotion(event);
    });
    
    // También probemos deviceorientation
    window.addEventListener('deviceorientation', (event) => {
      console.log('🧭 Evento de orientación:', {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma
      });
    });
  }

  private stopMotionTracking() {
    if (this.isListening) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.isListening = false;
      console.log('🔴 Sensores de movimiento desactivados');
    }
  }

  /**
   * Maneja los eventos de movimiento del dispositivo
   */
  private handleDeviceMotion(event: DeviceMotionEvent) {
    this.ngZone.run(() => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const currentTime = Date.now();
      
      // Cool-down más estricto
      if (currentTime - this.lastActionTime < this.ACTION_COOLDOWN) {
        return;
      }

      const x = acceleration.x || 0;
      const y = acceleration.y || 0;
      const z = acceleration.z || 0;

      // Inicializar últimos valores
      if (this.lastX === 0 && this.lastY === 0 && this.lastZ === 0) {
        this.lastX = x;
        this.lastY = y;
        this.lastZ = z;
        return;
      }

      // Calcular diferencias absolutas
      const deltaX = Math.abs(x - this.lastX);
      const deltaY = Math.abs(y - this.lastY);
      const deltaZ = Math.abs(z - this.lastZ);

      // Calcular dirección (positivo/negativo)
      const dirX = x - this.lastX;
      const dirY = y - this.lastY;

      console.log('📊 Movimiento detectado:', { 
        deltaX: deltaX.toFixed(2), 
        deltaY: deltaY.toFixed(2),
        dirX: dirX.toFixed(2),
        dirY: dirY.toFixed(2)
      });

      // 1. DETECCIÓN MEJORADA DE MOVIMIENTOS LATERALES
      if (this.detectLateralMovementImproved(deltaX, deltaY, dirX)) {
        this.lastActionTime = currentTime;
        this.resetMotionValues();
        return;
      }

      // 2. DETECCIÓN MEJORADA DE MOVIMIENTOS FRONTALES
      if (this.detectFrontalMovementImproved(deltaY, deltaX, dirY)) {
        this.lastActionTime = currentTime;
        this.resetMotionValues();
        return;
      }

      // 3. DETECCIÓN DE AGITACIÓN (igual que antes)
      if (this.detectShake(deltaX, deltaY, deltaZ, currentTime)) {
        this.resetToFirstProduct();
        this.lastActionTime = currentTime;
        this.resetMotionValues();
        return;
      }

      // Actualizar últimos valores
      this.lastX = x;
      this.lastY = y;
      this.lastZ = z;
    });
  }


  /**
   * Detecta movimiento lateral (izquierda/derecha) para cambio de fotos
   */
  private detectLateralMovementImproved(deltaX: number, deltaY: number, dirX: number): boolean {
    // Requerir movimiento significativo en X y que sea dominante sobre Y
    const isXLargeEnough = deltaX > this.TILT_THRESHOLD_X;
    const isXDominant = deltaX > deltaY * (1 + this.DOMINANCE_RATIO);
    const hasMinMovement = deltaX > this.MIN_MOVEMENT;

    if (isXLargeEnough && isXDominant && hasMinMovement) {
      if (dirX > 0) {
        console.log('➡️ Movimiento DERECHA (mejorado)');
        this.navigateToPreviousPhoto();
      } else {
        console.log('⬅️ Movimiento IZQUIERDA (mejorado)');
        this.navigateToNextPhoto();
      }
      return true;
    }
    return false;
  }

  /**
   * Detecta movimiento frontal (adelante/atrás) para cambio de productos
   */
  private detectFrontalMovementImproved(deltaY: number, deltaX: number, dirY: number): boolean {
    // Requerir movimiento significativo en Y y que sea dominante sobre X
    const isYLargeEnough = deltaY > this.TILT_THRESHOLD_Y;
    const isYDominant = deltaY > deltaX * (1 + this.DOMINANCE_RATIO);
    const hasMinMovement = deltaY > this.MIN_MOVEMENT;

    if (isYLargeEnough && isYDominant && hasMinMovement) {
      //this.frontalMovementCount++;
      if (dirY > 0) {
        console.log('⬇️ Movimiento ATRÁS (mejorado)');
        this.navigateToPreviousProduct();
      } else {
        console.log('⬆️ Movimiento ADELANTE (mejorado)');
        this.navigateToNextProduct();
      }
      return true;
    }
    return false;
  }

  /**
   * Detecta agitación del dispositivo (shake)
   */
  private detectShake(deltaX: number, deltaY: number, deltaZ: number, currentTime: number): boolean {
    const totalMovement = Math.abs(deltaX) + Math.abs(deltaY) + Math.abs(deltaZ);
    
    if (totalMovement > this.SHAKE_THRESHOLD) {
      this.shakeCount++;
      
      // Detectar 2 shakes rápidos
      if (this.shakeCount >= 2) {
        if (currentTime - this.lastShakeTime < this.SHAKE_TIMEOUT) {
          this.shakeCount = 0;
          this.lastShakeTime = currentTime;
          return true;
        }
      }
      
      this.lastShakeTime = currentTime;
    }

    // Resetear contador si pasa mucho tiempo
    if (currentTime - this.lastShakeTime > this.SHAKE_TIMEOUT) {
      this.shakeCount = 0;
    }
    
    return false;
  }

  /**
   * Reinicia los valores de movimiento después de una acción
   */
  private resetMotionValues() {
    // Delay un poco más largo para evitar acciones múltiples
    setTimeout(() => {
      this.lastX = 0;
      this.lastY = 0;
      this.lastZ = 0;
      console.log('🔄 Valores de movimiento reseteados');
    }, 300);
  }



  // ========== MÉTODOS DE NAVEGACIÓN ==========

  /**
   * Navega a la siguiente foto del producto actual
   */
  private navigateToNextPhoto() {
    try {
      console.log('📸 Movimiento: Siguiente foto');
      const currentProductSwiper = this.getCurrentProductPhotoSwiper();
      if (currentProductSwiper && !currentProductSwiper.isEnd) {
        currentProductSwiper.slideNext();
        this.showHapticFeedback();
      }
    } catch (error) {
      console.error('Error al navegar a la siguiente foto:', error);
    }
  }

  /**
   * Navega a la foto anterior del producto actual
   */
  private navigateToPreviousPhoto() {
    try {
      console.log('📸 Movimiento: Foto anterior');
      const currentProductSwiper = this.getCurrentProductPhotoSwiper();
      if (currentProductSwiper && !currentProductSwiper.isBeginning) {
        currentProductSwiper.slidePrev();
        this.showHapticFeedback();
      }
    } catch (error) {
      console.error('Error al navegar a la foto anterior:', error);
    }
  }

  /**
   * Navega al siguiente producto
   */
  private navigateToNextProduct() {
    try {
      console.log('🔄 Movimiento: Siguiente producto');
      const mainSwiper = this.productsSwiper?.nativeElement?.swiper;
      if (mainSwiper && !mainSwiper.isEnd) {
        mainSwiper.slideNext();
        this.showHapticFeedback();
      }
    } catch (error) {
      console.error('Error al navegar al siguiente producto:', error);
    }
  }

  /**
   * Navega al producto anterior
   */
  private navigateToPreviousProduct() {
    try {
      console.log('🔄 Movimiento: Producto anterior');
      const mainSwiper = this.productsSwiper?.nativeElement?.swiper;
      if (mainSwiper && !mainSwiper.isBeginning) {
        mainSwiper.slidePrev();
        this.showHapticFeedback();
      }
    } catch (error) {
      console.error('Error al navegar al producto anterior:', error);
    }
  }

  /**
   * Vuelve al primer producto del menú
   */
  private resetToFirstProduct() {
    try {
      console.log('🏠 Movimiento: Reset al primer producto');
      const mainSwiper = this.productsSwiper?.nativeElement?.swiper;
      if (mainSwiper) {
        mainSwiper.slideTo(0);
        this.showHapticFeedback('medium');
        this.toastr.info('Volviendo al primer producto', '', {
          timeOut: 2000,
          positionClass: 'toast-center'
        });
      }
    } catch (error) {
      console.error('Error al resetear al primer producto:', error);
    }
  }

  /**
   * Proporciona feedback háptico (vibración) cuando está disponible
   */
  private showHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
    if (navigator.vibrate) {
      const patterns = {
        light: [50],
        medium: [100],
        heavy: [150]
      };
      navigator.vibrate(patterns[type]);
    }
  }

  /**
   * Obtiene el swiper de fotos del producto actualmente visible
   */
  private getCurrentProductPhotoSwiper(): any {
    try {
      const mainSwiper = this.productsSwiper?.nativeElement?.swiper;
      if (!mainSwiper) {
        console.warn('No se encontró el swiper principal');
        return null;
      }

      const activeSlideIndex = mainSwiper.activeIndex;
      const activeSlide = mainSwiper.slides[activeSlideIndex];
      
      if (!activeSlide) {
        console.warn('No se encontró el slide activo');
        return null;
      }

      // Buscar el swiper de fotos dentro del slide activo
      const photoSwiperElement = activeSlide.querySelector('.mySwiper');
      if (!photoSwiperElement) {
        console.warn('No se encontró el swiper de fotos en el slide activo');
        return null;
      }

      return photoSwiperElement.swiper || null;
    } catch (error) {
      console.error('Error al obtener el swiper de fotos:', error);
      return null;
    }
  }



  // Método para resetear el swiper al primer slide
  resetSwiperToFirstSlide() {
    if (this.productsSwiper && this.productsSwiper.nativeElement && this.productsSwiper.nativeElement.swiper) {
      this.productsSwiper.nativeElement.swiper.slideTo(0);
    }
  }

  // Resto de los métodos permanecen iguales...
  private toastOk(msg: string) {
    this.toastr.success(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
  }

  async cargarPedidoParaEditar(pedidoId: number) {
    try {
      console.log(`[ClienteRealizaPedidoComponent] Cargando pedido ${pedidoId} para editar...`);
      
      const { data: pedido, error: pedidoError } = await this.supa.client
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .eq('idCliente', this.idCliente)
        .single();

      if (pedidoError || !pedido) {
        throw new Error('No se pudo cargar el pedido para editar');
      }

      const { data: detalles, error: detallesError } = await this.supa.client
        .from('pedidos_detalles')
        .select('*')
        .eq('idPedido', pedidoId);

      if (detallesError || !detalles) {
        throw new Error('No se pudieron cargar los detalles del pedido');
      }

      this.cantidadesProductosEnCarrito = detalles.map((detalle: any) => ({
        id: detalle.idProducto,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precioUnitario,
        tiempo_preparacion: detalle.tiempo_preparacion || detalle.tiempoPreparacion || 0
      }));

      await this.cargarTiemposPreparacion();

      this.precioAcumulado = pedido.total || 0;
      this.tiempoDeEspera = pedido.tiempo_estimado || 0;

      this.sincronizarCantidadesConUI();

      console.log(`[ClienteRealizaPedidoComponent] ✅ Pedido ${pedidoId} cargado para editar:`, this.cantidadesProductosEnCarrito);
      
      this.toastr.info('PEDIDO CARGADO PARA EDITAR. PUEDES MODIFICAR PRODUCTOS Y CANTIDADES', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      
    } catch (error: any) {
      console.error('[ClienteRealizaPedidoComponent] Error al cargar pedido para editar:', error);
      this.toastr.error('ERROR AL CARGAR EL PEDIDO: ' + (error?.message || 'ERROR DESCONOCIDO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    }
  }

  sincronizarCantidadesConUI() {
    this.cantidadesProductos = {};
    
    for (const item of this.cantidadesProductosEnCarrito) {
      this.cantidadesProductos[item.id.toString()] = item.cantidad;
    }
    
    console.log('[ClienteRealizaPedidoComponent] Cantidades sincronizadas con UI:', this.cantidadesProductos);
  }

  async cargarTiemposPreparacion() {
    try {
      const idsProductos = [...new Set(this.cantidadesProductosEnCarrito.map(item => item.id))];
      
      if (idsProductos.length === 0) return;

      console.log('[ClienteRealizaPedidoComponent] Cargando tiempos de preparación para productos:', idsProductos);

      const { data: menuItems, error } = await this.supa.client
        .from('menu')
        .select('id, tiempo_elaboracion')
        .in('id', idsProductos);

      if (error) {
        console.error('[ClienteRealizaPedidoComponent] Error al cargar tiempos:', error);
        return;
      }

      const tiemposMap = new Map();
      (menuItems || []).forEach(item => {
        tiemposMap.set(item.id, item.tiempo_elaboracion || 0);
      });

      this.cantidadesProductosEnCarrito.forEach(item => {
        const tiempoDesdeMenu = tiemposMap.get(item.id) || 0;
        item.tiempo_preparacion = tiempoDesdeMenu;
        console.log(`[ClienteRealizaPedidoComponent] Producto ${item.id}: tiempo ${tiempoDesdeMenu} minutos`);
      });

      this.tiempoDeEspera = Math.max(...this.cantidadesProductosEnCarrito.map(item => item.tiempo_preparacion), 0);
      console.log(`[ClienteRealizaPedidoComponent] Tiempo total recalculado: ${this.tiempoDeEspera} minutos`);

    } catch (error) {
      console.error('[ClienteRealizaPedidoComponent] Error al cargar tiempos de preparación:', error);
    }
  }

  async actualizarPedidoExistente(pedidoId: number) {
    try {
      console.log(`[ClienteRealizaPedidoComponent] Actualizando pedido ${pedidoId}...`);
      
      const { error: deleteError } = await this.supa.client
        .from('pedidos_detalles')
        .delete()
        .eq('idPedido', pedidoId);

      if (deleteError) throw deleteError;

      let nuevoTotal = 0;
      let maxTiempo = 0;

      console.log('[ClienteRealizaPedidoComponent] Productos en carrito para actualizar:', this.cantidadesProductosEnCarrito);

      for (const item of this.cantidadesProductosEnCarrito) {
        const subtotal = item.cantidad * item.precio_unitario;
        nuevoTotal += subtotal;
        maxTiempo = Math.max(maxTiempo, item.tiempo_preparacion);
        console.log(`[ClienteRealizaPedidoComponent] Producto ${item.id}: ${item.cantidad} x $${item.precio_unitario} = $${subtotal}`);
      }

      console.log(`[ClienteRealizaPedidoComponent] Total calculado: $${nuevoTotal}, Tiempo: ${maxTiempo} minutos`);

      if (nuevoTotal <= 0) {
        throw new Error('El total del pedido debe ser mayor a 0');
      }

      const { error: updateError } = await this.supa.client
        .from('pedidos')
        .update({
          total: nuevoTotal,
          tiempo_estimado: maxTiempo,
          estado: 'pendiente',
          updated_at: new Date().toISOString()
        })
        .eq('id', pedidoId);

      if (updateError) throw updateError;

      const nuevosDetalles = this.cantidadesProductosEnCarrito.map(item => ({
        idPedido: pedidoId,
        idProducto: item.id,
        cantidad: item.cantidad,
        precioUnitario: item.precio_unitario
      }));

      const { error: insertError } = await this.supa.client
        .from('pedidos_detalles')
        .insert(nuevosDetalles);

      if (insertError) throw insertError;

      console.log(`[ClienteRealizaPedidoComponent] ✅ Pedido ${pedidoId} actualizado exitosamente`);

      return {
        id: pedidoId,
        total: nuevoTotal,
        tiempoEstimado: maxTiempo
      };

    } catch (error: any) {
      console.error('[ClienteRealizaPedidoComponent] Error al actualizar pedido:', error);
      throw new Error('Error al actualizar el pedido: ' + (error?.message || 'Error desconocido'));
    }
  }

  filtrarMenu(event: any) {
    this.filtroActual = event.detail.value;
    this.filtrarMenuPorCategoria();
    
    // Resetear el swiper al primer slide cuando se cambia de categoría
    setTimeout(() => {
      this.resetSwiperToFirstSlide();
    }, 100);
  }

  async finalizarPedido() {
    if (this.cargando || this.pedidoRealizado) return;

  if (!this.cantidadesProductosEnCarrito.length) {
    this.toastr.info('AGREGÁ AL MENOS UN PRODUCTO', '', {
      positionClass: 'toast-center',
      timeOut: 3000
    });
    return;
  }

  // Si es pedido repartidor, primero pedir la dirección
  if (this.tipoPedido === 'delivery' && !this.direccionDelivery) {
    const direccion = await this.solicitarDireccion();
    if (!direccion) {
      // Usuario canceló, no crear pedido
      return;
    }
    this.direccionDelivery = direccion;
  }

  try {
    this.cargando = true;
    this.spinner.show({ immediate: true });

      let res: any;

    if (this.modoEdicion && this.pedidoAEditar) {
      // Modo edición: actualizar pedido existente
      console.log(`[ClienteRealizaPedidoComponent] Actualizando pedido ${this.pedidoAEditar}...`);
      res = await this.actualizarPedidoExistente(this.pedidoAEditar);
    } else {
      // Modo nuevo: crear pedido nuevo
      console.log('[ClienteRealizaPedidoComponent] Creando nuevo pedido...');
      res = await this.menuService.crearPedido({
        idCliente: this.idCliente,                 // uuid del usuario
        productos: this.cantidadesProductosEnCarrito,
        tipoPedido: this.tipoPedido,
        direccionDelivery: this.direccionDelivery
      });
    }

    // espero que res traiga: { id: number, total: number, tiempoEstimado: number }
    if (!res?.id) throw new Error('LA API NO DEVOLVIÓ UN ID DE PEDIDO');

      this.pedidosSvc.setPedidoActual({ id: Number(res.id) });

      this.pedidoRealizado = true;
      this.idPedido = Number(res.id);

    // Mensaje de éxito diferente según el modo
    if (this.modoEdicion) {
      this.toastOk('PEDIDO ACTUALIZADO Y ENVIADO NUEVAMENTE');
    } else {
      this.toastOk('PEDIDO ENVIADO');
    }

      this.router.navigate(['/cliente-pedido-en-curso'], {
        state: {
          pedidoId: this.idPedido,
          total: res.total ?? 0,
          tiempo: res.tiempoEstimado ?? null
        }
      });

  } catch (e: any) {
    this.toastr.error((e?.message || 'ERROR CREANDO EL PEDIDO').toUpperCase(), '', {
      positionClass: 'toast-center',
      timeOut: 4000
    });
  } finally {
    this.cargando = false;
    this.spinner.hide();
  }
}
  agregarProducto(
    idProducto: number,
    precioProducto: number,
    _nombreProducto: string,
    _sector: string,
    tiempoPreparacion: number
  ) {
    const cantidad = this.cantidadesProductos[idProducto] || 0;
    if (!cantidad) return;

    this.precioAcumulado += precioProducto * cantidad;
    this.tiempoDeEspera = Math.max(this.tiempoDeEspera || 0, tiempoPreparacion);

    const p = this.cantidadesProductosEnCarrito.find(x => x.id === idProducto);
    if (p) {
      p.cantidad += cantidad;
      p.tiempo_preparacion = Math.max(p.tiempo_preparacion, tiempoPreparacion);
    } else {
      this.cantidadesProductosEnCarrito.push({
        id: idProducto,
        cantidad,
        precio_unitario: precioProducto,
        tiempo_preparacion: tiempoPreparacion
      });
    }

    this.cantidadesProductos[idProducto] = 0;
  }

  incrementarCantidad(productoId: string) {
    if (!this.cantidadesProductos[productoId]) {
      this.cantidadesProductos[productoId] = 0;
    }
    this.cantidadesProductos[productoId]++;
  }
  
  decrementarCantidad(productoId: string) {
    if (this.cantidadesProductos[productoId] && this.cantidadesProductos[productoId] > 0) {
      this.cantidadesProductos[productoId]--;
    }
  }

  // Métodos para manejar la paginación personalizada
  onSlideChange(event: any) {
    // Solo actualizar si el evento viene del swiper principal de productos
    // El swiper principal tiene menuFiltrado.length slides (productos)
    // El swiper interno de fotos tiene máximo 3 slides, así que podemos filtrar por eso
    if (event && event.detail && event.detail[0]) {
      const swiperInstance = event.detail[0];
      const activeIndex = swiperInstance.activeIndex;
      const slidesCount = swiperInstance.slides ? swiperInstance.slides.length : 0;
      
      // Solo actualizar si el número de slides coincide con el número de productos
      // Esto asegura que el evento viene del swiper principal, no del interno de fotos
      if (typeof activeIndex === 'number' && 
          activeIndex >= 0 && 
          activeIndex < this.menuFiltrado.length &&
          slidesCount === this.menuFiltrado.length) {
        this.currentSlide = activeIndex;
      }
    }
  }

  goToPrevious(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slidePrev();
    }
  }

  goToNext(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slideNext();
    }
  }

  /**
   * Abre el alert con los detalles del producto (misma estética que VER NOTA en reservas)
   */
  async abrirDetalles(producto: any) {
    const alert = await this.alertController.create({
      header: producto.nombre.toUpperCase(),
      message: producto.descripcion,
      buttons: [
        {
          text: 'CERRAR',
          role: 'cancel',
          cssClass: 'secondary'
        }
      ],
      cssClass: 'detalles-producto-alert'
    });

    await alert.present();
  }
}