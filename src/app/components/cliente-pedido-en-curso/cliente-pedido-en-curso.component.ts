// import { CommonModule } from '@angular/common';
// import { Component, OnInit } from '@angular/core';
// import { IonicModule } from '@ionic/angular';
// import { RouterModule } from '@angular/router';

// @Component({
//   selector: 'app-cliente-pedido-en-curso',
//   templateUrl: './cliente-pedido-en-curso.component.html',
//   styleUrls: ['./cliente-pedido-en-curso.component.scss'],
//   standalone: true,
//   imports: [CommonModule, IonicModule, RouterModule],
// })
// export class ClientePedidoEnCursoComponent implements OnInit {
//   constructor(
//   ) {}

//   ngOnInit() {}

//   confirmarPedido() {

//   }
// }
// ClientePedidoEnCursoComponent.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { IonicModule, IonContent } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { MenuService } from 'src/app/services/menu.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { PedidosService } from 'src/app/services/pedidos.service';
import { EncuestasService } from 'src/app/services/encuestas.service';
import { addIcons } from 'ionicons';
import { locationOutline, bicycleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-cliente-pedido-en-curso',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './cliente-pedido-en-curso.component.html',
  styleUrls: ['./cliente-pedido-en-curso.component.scss'],
})
export class ClientePedidoEnCursoComponent implements OnInit, OnDestroy, AfterViewChecked {
  hasPedido = false;
  estado = '—';
  total = 0;
  tiempo = 0;
  pedidoId?: number;
  yaCompletoEncuesta = false;
  yaRealizoPedido = false; // Nueva propiedad para rastrear si ya realizó un pedido
  yaSeAplicoDescuento = false; // Nueva propiedad para rastrear si ya se aplicó descuento
  esClienteAnonimo = false; // Nueva propiedad para verificar si es cliente anónimo
  
  // 🆕 Propiedades para pedidos delivery
  esDelivery = false;
  direccionEntrega?: string;
  repartidorInfo?: { nombres?: string; apellidos?: string; email?: string };
  estadoDeliveryTexto = ''; // Texto amigable del estado para delivery
  recepcionConfirmada = false; // 🆕 Flag para saber si el cliente ya confirmó recepción
  private ultimoEstadoEncuesta = false; // 🆕 Para detectar cuando se habilita el botón
  @ViewChild('botonEncuesta', { read: ElementRef }) botonEncuesta?: ElementRef; // 🆕 Referencia al botón de encuesta
  @ViewChild(IonContent, { static: false }) ionContent?: IonContent; // 🆕 Referencia a IonContent para scroll agresivo
  private mutationObserver?: MutationObserver; // 🆕 Observer para detectar cuando aparece el botón
  private scrollAttempts = 0; // 🆕 Contador de intentos de scroll
  private maxScrollAttempts = 5; // 🆕 Máximo de intentos

  private channel?: { unsubscribe?: () => void };

// constructor(private router: Router, private menu: MenuService) {
//   const st = this.router.getCurrentNavigation()?.extras?.state as any;
//   if (st?.pedidoId !== undefined && Number.isFinite(+st.pedidoId)) {
//     this.applyResumen({
//       id: +st.pedidoId,
//       estado: 'pendiente',
//       total: Number(st.total ?? 0),
//       tiempoEstimado: Number(st.tiempo ?? 0),
//       created_at: new Date().toISOString(),
//     });
//   }
// }
  constructor(
    private router: Router, 
    private menu: MenuService,
    private supa: SupabaseService,
    private toast: ToastrService,
    private spinner: SpinnerService,
    private pedidosSvc: PedidosService,
    private encuestasSvc: EncuestasService, // 🆕 Para verificar encuestas repartidor
    private cdr: ChangeDetectorRef // 🆕 Para forzar detección de cambios si es necesario
  ) {
    addIcons({ locationOutline, bicycleOutline });
    console.log('[ClientePedidoEnCurso] 🔧 Constructor ejecutado');
    
    // ✅ Esto funciona incluso si recargás la página
    const st: any = history.state;
    console.log('[ClientePedidoEnCurso] 📋 History state:', st);
    
    if (st?.pedidoId != null && Number.isFinite(+st.pedidoId)) {
      console.log('[ClientePedidoEnCurso] ✅ PedidoId encontrado en state:', st.pedidoId);
      this.applyResumen({
        id: +st.pedidoId,
        estado: 'pendiente',
        total: Number(st.total ?? 0),
        tiempoEstimado: Number(st.tiempo ?? 0),
        created_at: new Date().toISOString(),
      });
    } else {
      console.log('[ClientePedidoEnCurso] ❌ No hay pedidoId en state');
    }
    
    // Si no hay pedidoId, intentar obtener el último pedido del cliente
    if (!this.pedidoId) {
      console.log('[ClientePedidoEnCurso] 🔍 Intentando obtener último pedido...');
      this.menu.getUltimoPedidoDelActual().then(ultimoPedido => {
        if (ultimoPedido) {
          console.log('[ClientePedidoEnCurso] ✅ Último pedido encontrado:', ultimoPedido);
          this.applyResumen(ultimoPedido);
        } else {
          console.log('[ClientePedidoEnCurso] ❌ No hay pedidos para este cliente');
        }
      }).catch(error => {
        console.error('[ClientePedidoEnCurso] ❌ Error al obtener último pedido:', error);
      });
    }
  }

  //async ngOnInit() {
    // // 1) Tomar datos si llegaron por router state
    // const st: any = history.state;
    // if (st?.pedidoId) {
    //   this.pedidoId = st.pedidoId;
    //   this.total = Number(st.total ?? 0);
    //   this.tiempo = Number(st.tiempo ?? 0);
    //   this.estado = 'pendiente';
    // } else {
    //   // 2) Si entró directo: traer el último pedido del cliente
    //   const res = await this.menu.getUltimoPedidoDeCliente(this.idCliente);
    //   if (res) {
    //     this.pedidoId = res.id;
    //     this.total = Number(res.total ?? 0);
    //     this.tiempo = Number(res.tiempoEstimado ?? 0);
    //     this.estado = res.estado ?? '—';
    //   }
    // }

    // // 3) Suscripción realtime a cambios del pedido (encabezado y detalles)
    // if (this.pedidoId) {
    //   this.channel = this.menu.onPedidoChange(this.pedidoId, (r) => {
    //     this.total = r.total ?? this.total;
    //     this.tiempo = r.tiempoEstimado ?? this.tiempo;
    //     this.estado = r.estado ?? this.estado;
    //   });
    // } const st: any = history.state;
 // 1) Si venimos con state desde "realiza pedido"
    // 1) Si venimos con state desde "realiza pedido"
 // 2) si NO vino state (ej: refresh o entrada directa), preguntar a supabase
  
 
 
//  if (!this.pedidoId) {
//       const res = await this.menu.getUltimoPedidoDelActual();
//       if (res) this.applyResumen(res);
//       else this.clearResumen();
//     }

//     // 3) realtime
// if (this.pedidoId != null && Number.isFinite(this.pedidoId)) {
//   this.channel = this.menu.onPedidoChange(this.pedidoId, r => this.applyResumen(r));
// }

 // }
async ngOnInit() {
    await this.ensureResumenAndSubscribe();
  }

  // ✅ Se llama cada vez que la pantalla vuelve a foco (navegación “para atrás”, tabs, etc.)
  async ionViewWillEnter() {
    await this.ensureResumenAndSubscribe(true); // true = forzar refresco del server
  }

  ngOnDestroy() {
    this.channel?.unsubscribe?.();
    // 🆕 Limpiar MutationObserver
    this.mutationObserver?.disconnect();
  }

  private async ensureResumenAndSubscribe(forceServer = false) {
    // Verificar perfil del usuario
    await this.verificarPerfilUsuario();
    
    // Si no tenemos pedidoId (o queremos refrescar), pedimos el último al server
    if (!Number.isFinite(this.pedidoId as any) || forceServer) {
      const res = await this.menu.getUltimoPedidoDelActual();
      if (res) this.applyResumen(res);
      else this.clearResumen();
    }

    // Verificar si ya completó la encuesta
    await this.verificarEstadoEncuesta();

    // Suscripción realtime solo si hay id válido
    if (Number.isFinite(this.pedidoId as any)) {
      // cortar suscripción previa si existiera
      this.channel?.unsubscribe?.();
      this.channel = this.menu.onPedidoChange(this.pedidoId!, async r => {
        await this.applyResumen(r);
      });
    }
  }

  private async applyResumen(r: { id: number; estado: string; total: number; tiempoEstimado: number; created_at: string; descuento_aplicado?: boolean }) {
    this.pedidoId = r.id;
    this.estado = r.estado ?? '—';
    this.total = r.total ?? 0;
    this.tiempo = r.tiempoEstimado ?? 0;
    this.yaSeAplicoDescuento = !!r.descuento_aplicado;

    // Si hay un pedido con ID, significa que ya realizó un pedido
    if (this.pedidoId && Number.isFinite(this.pedidoId)) {
      this.yaRealizoPedido = true;
      
      // ✅ ACTUALIZAR PedidosService para que los juegos estén habilitados
      this.pedidosSvc.setPedidoActual({ id: this.pedidoId });

      // 🆕 Obtener información adicional del pedido (tipo_pedido, dirección, repartidor)
      // IMPORTANTE: Esperar a que se cargue la info adicional para establecer esDelivery correctamente
      await this.cargarInfoAdicionalPedido(this.pedidoId);
      
      console.log('[ClientePedidoEnCurso] ✅ applyResumen completado - esDelivery:', this.esDelivery);
    }

    // Estados que se consideran "finalizados" (cliente no puede hacer más acciones)
    // 'rechazado por mozo' NO está incluido porque el cliente puede editarlo
    const finalizados = ['pagado', 'finalizado', 'cancelado', 'entregado', 'rechazado'];
    this.hasPedido = !finalizados.includes((this.estado || '').toLowerCase());
  }

  /**
   * 🆕 Carga información adicional del pedido (tipo_pedido, dirección, repartidor)
   */
  private async cargarInfoAdicionalPedido(pedidoId: number) {
    try {
      console.log('[ClientePedidoEnCurso] 🔍 Cargando info adicional del pedido:', pedidoId);
      
      const { data: pedido, error } = await this.supa.client
        .from('pedidos')
        .select('tipo_pedido, direccion_entrega, idDelivery')
        .eq('id', pedidoId)
        .maybeSingle();

      if (error) {
        console.error('[ClientePedidoEnCurso] Error al obtener info adicional del pedido:', error);
        // Resetear esDelivery en caso de error
        this.esDelivery = false;
        return;
      }

      if (!pedido) {
        console.log('[ClientePedidoEnCurso] ⚠️ Pedido no encontrado');
        this.esDelivery = false;
        return;
      }

      // Verificar si es delivery
      const esDeliveryAntes = this.esDelivery;
      this.esDelivery = pedido.tipo_pedido === 'delivery';
      this.direccionEntrega = pedido.direccion_entrega || undefined;
      
      console.log('[ClientePedidoEnCurso] 📋 Info adicional cargada:', {
        tipo_pedido: pedido.tipo_pedido,
        esDelivery: this.esDelivery,
        esDeliveryAntes,
        tieneDireccion: !!this.direccionEntrega,
        tieneDeliveryId: !!pedido.idDelivery
      });
      
      // Forzar detección de cambios si esDelivery cambió
      if (esDeliveryAntes !== this.esDelivery) {
        console.log('[ClientePedidoEnCurso] 🔄 esDelivery cambió, forzando detección de cambios');
        this.cdr.detectChanges();
      }

      // Si es delivery y tiene repartidor asignado, obtener info del repartidor
      if (this.esDelivery && pedido.idDelivery) {
        // 🆕 idDelivery es UUID (auth_id del usuario delivery)
        const { data: repartidor } = await this.supa.client
          .from('usuarios')
          .select('nombres, apellidos, email')
          .eq('auth_id', pedido.idDelivery) // idDelivery es UUID (auth_id)
          .maybeSingle();

        if (repartidor) {
          this.repartidorInfo = {
            nombres: repartidor.nombres || undefined,
            apellidos: repartidor.apellidos || undefined,
            email: repartidor.email || undefined
          };
          console.log('[ClientePedidoEnCurso] ✅ Repartidor encontrado:', this.repartidorInfo);
        } else {
          console.log('[ClientePedidoEnCurso] ⚠️ No se encontró repartidor con id:', pedido.idDelivery);
          this.repartidorInfo = undefined;
        }
      } else {
        this.repartidorInfo = undefined;
      }

      // 🆕 Generar texto amigable del estado para delivery (siempre actualizar)
      this.estadoDeliveryTexto = this.getEstadoDeliveryTexto(this.estado);

    } catch (error) {
      console.error('[ClientePedidoEnCurso] Error al cargar info adicional:', error);
    }
  }

  /**
   * 🆕 Convierte el estado del pedido a texto amigable para repartidor
   */
  private getEstadoDeliveryTexto(estado: string): string {
    const estadosMap: { [key: string]: string } = {
      'pendiente': 'PENDIENTE CONFIRMACIÓN',
      'pedido en curso': 'CONFIRMADO - EN PREPARACIÓN',
      'en preparación': 'EN PREPARACIÓN',
      'en preparación parcial': 'EN PREPARACIÓN',
      'listo para entregar': 'LISTO PARA ENTREGAR',
      'asignado a delivery': 'ASIGNADO A REPARTIDOR',
      'confirmado por delivery': 'REPARTIDOR EN CAMINO',
      'entregado': 'ENTREGADO',
      'rechazado por admin': 'RECHAZADO',
      'pendiente confirmacion pago': 'PENDIENTE CONFIRMACIÓN DE PAGO',
      'pagado': 'PAGADO'
    };

    return estadosMap[estado] || estado.toUpperCase();
  }

  private clearResumen() {
    this.pedidoId = undefined;
    this.estado = '—';
    this.total = 0;
    this.tiempo = 0;
    this.hasPedido = false;
    this.yaRealizoPedido = false;
    this.yaSeAplicoDescuento = false;
    
    // 🆕 Limpiar propiedades de delivery
    this.esDelivery = false;
    this.direccionEntrega = undefined;
    this.repartidorInfo = undefined;
    this.estadoDeliveryTexto = '';
    this.recepcionConfirmada = false; // 🆕 Resetear flag
    
    // ✅ LIMPIAR PedidosService cuando no hay pedido
    this.pedidosSvc.setPedidoActual(null);
  }

  private async verificarPerfilUsuario() {
    try {
      const userProfile = await this.supa.getUserProfile();
      this.esClienteAnonimo = userProfile?.perfil === 'clienteAnon';
      console.log('[DEBUG CLIENTE-PEDIDO-EN-CURSO] Perfil del usuario:', userProfile?.perfil, 'esClienteAnonimo:', this.esClienteAnonimo);
    } catch (error) {
      console.error('Error al verificar perfil del usuario:', error);
      this.esClienteAnonimo = false;
    }
  }

  private async verificarEstadoEncuesta() {
    try {
      const estadoAnterior = this.yaCompletoEncuesta;
      
      // 🆕 Si es delivery, usar yaCompletoEncuestaDelivery
      if (this.esDelivery && this.pedidoId) {
        console.log('[ClientePedidoEnCurso] Verificando encuesta delivery para pedido:', this.pedidoId);
        this.yaCompletoEncuesta = await this.encuestasSvc.yaCompletoEncuestaDelivery(this.pedidoId);
      } else {
        // Para pedidos de mesa, usar la lógica original
        this.yaCompletoEncuesta = await this.supa.yaCompletoEncuesta();
      }
      
      console.log('[ClientePedidoEnCurso] yaCompletoEncuesta:', this.yaCompletoEncuesta);
      
      // 🆕 Si el botón se acaba de habilitar (estado cambió de true a false o de undefined a false)
      // y el pedido está entregado, hacer scroll al botón
      if (this.estado === 'entregado' && !this.yaCompletoEncuesta && estadoAnterior !== this.yaCompletoEncuesta) {
        this.ultimoEstadoEncuesta = this.yaCompletoEncuesta;
        // Usar setTimeout para asegurar que el DOM se haya actualizado
        setTimeout(() => this.scrollToEncuestaButton(), 500);
      }
    } catch (error) {
      console.error('Error al verificar estado de encuesta:', error);
      this.yaCompletoEncuesta = false;
    }
  }

  // 🆕 Método ULTRA-REFORZADO para hacer scroll al botón de encuesta
  private scrollToEncuestaButton() {
    this.scrollAttempts = 0; // Resetear contador
    
    // Usar requestAnimationFrame para asegurar que el DOM está renderizado
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.intentarScrollAgresivo();
      }, 100);
    });
  }

  // 🆕 Método que intenta múltiples estrategias de scroll
  private intentarScrollAgresivo() {
    if (this.scrollAttempts >= this.maxScrollAttempts) {
      console.warn('[ClientePedidoEnCurso] ⚠️ Máximo de intentos de scroll alcanzado');
      return;
    }

    this.scrollAttempts++;
    console.log(`[ClientePedidoEnCurso] 🔄 Intento ${this.scrollAttempts} de scroll al botón de encuesta`);

    if (!this.botonEncuesta?.nativeElement) {
      console.warn('[ClientePedidoEnCurso] ⚠️ Botón de encuesta no encontrado, reintentando...');
      setTimeout(() => this.intentarScrollAgresivo(), 200);
      return;
    }

    const buttonElement = this.botonEncuesta.nativeElement;
    
    // ESTRATEGIA 1: Usar scrollIntoView con múltiples opciones
    try {
      buttonElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      console.log('[ClientePedidoEnCurso] ✅ ScrollIntoView ejecutado');
    } catch (err) {
      console.warn('[ClientePedidoEnCurso] ⚠️ Error en scrollIntoView:', err);
    }

    // ESTRATEGIA 2: Si tenemos IonContent, usar scrollTo con coordenadas exactas
    const ionContentRef = this.ionContent;
    if (ionContentRef) {
      requestAnimationFrame(async () => {
        try {
          // Verificar nuevamente que ionContent sigue disponible
          if (!ionContentRef) return;
          
          // Obtener posición del botón
          const buttonRect = buttonElement.getBoundingClientRect();
          
          // Obtener el elemento scrollable de IonContent
          const scrollElement = await ionContentRef.getScrollElement();
          if (!scrollElement) {
            console.warn('[ClientePedidoEnCurso] ⚠️ No se pudo obtener scrollElement');
            return;
          }
          
          const contentRect = scrollElement.getBoundingClientRect();
          
          // Calcular posición relativa dentro del scroll
          const scrollTop = scrollElement.scrollTop || 0;
          const buttonTopRelative = buttonRect.top - contentRect.top + scrollTop;
          
          // Scroll para centrar el botón
          const targetScroll = buttonTopRelative - (contentRect.height / 2) + (buttonRect.height / 2);
          
          // Intentar con scrollToPoint
          ionContentRef.scrollToPoint(0, Math.max(0, targetScroll), 500).then(() => {
            console.log('[ClientePedidoEnCurso] ✅ ScrollToPoint completado');
          }).catch(err => {
            console.warn('[ClientePedidoEnCurso] ⚠️ Error en scrollToPoint:', err);
          });
          
          // También intentar scrollToBottom como respaldo
          setTimeout(() => {
            if (ionContentRef) {
              ionContentRef.scrollToBottom(300).then(() => {
                console.log('[ClientePedidoEnCurso] ✅ ScrollToBottom completado');
              }).catch(() => {
                // Ignorar error, ya intentamos otros métodos
              });
            }
          }, 100);
          
        } catch (err) {
          console.warn('[ClientePedidoEnCurso] ⚠️ Error calculando posición:', err);
        }
      });
    }

    // ESTRATEGIA 3: Usar scroll nativo del DOM como último recurso
    setTimeout(() => {
      try {
        const scrollContainer = document.querySelector('ion-content.client-content');
        if (scrollContainer) {
          const buttonRect = buttonElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const scrollTop = (scrollContainer as any).scrollTop || 0;
          const targetScroll = scrollTop + buttonRect.top - containerRect.top - (containerRect.height / 2) + (buttonRect.height / 2);
          
          scrollContainer.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
          console.log('[ClientePedidoEnCurso] ✅ Scroll nativo del DOM ejecutado');
        }
      } catch (err) {
        console.warn('[ClientePedidoEnCurso] ⚠️ Error en scroll nativo:', err);
      }
    }, 150);

    // Si después de todos los intentos no funcionó, reintentar una vez más
    if (this.scrollAttempts < this.maxScrollAttempts) {
      setTimeout(() => {
        // Verificar si el botón está visible en la pantalla
        const buttonRect = buttonElement.getBoundingClientRect();
        const isVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;
        
        if (!isVisible) {
          console.log('[ClientePedidoEnCurso] 🔄 Botón aún no visible, reintentando...');
          this.intentarScrollAgresivo();
        } else {
          console.log('[ClientePedidoEnCurso] ✅ Botón ya está visible en pantalla');
        }
      }, 600);
    }
  }

  // 🆕 Método del ciclo de vida REFORZADO para detectar cambios en el botón
  ngAfterViewChecked() {
    // Verificar que el botón de encuesta esté habilitado (no completó encuesta)
    const encuestaHabilitada = this.estado === 'entregado' && 
                               !this.yaCompletoEncuesta && 
                               !(this.esDelivery && !this.recepcionConfirmada) &&
                               !this.esClienteAnonimo;
    
    // Si el estado cambió y el botón debería estar visible
    if (encuestaHabilitada && this.ultimoEstadoEncuesta !== encuestaHabilitada) {
      this.ultimoEstadoEncuesta = encuestaHabilitada;
      console.log('[ClientePedidoEnCurso] 🎯 Botón de encuesta habilitado, iniciando scroll...');
      
      // Usar múltiples delays para asegurar que el DOM está completamente renderizado
      setTimeout(() => this.scrollToEncuestaButton(), 200);
      setTimeout(() => this.scrollToEncuestaButton(), 500);
      setTimeout(() => this.scrollToEncuestaButton(), 800);
      
      // También configurar MutationObserver para detectar cuando el botón aparece en el DOM
      this.configurarObserverEncuesta();
    }
  }

  // 🆕 Configurar MutationObserver para detectar cuando el botón aparece
  private configurarObserverEncuesta() {
    // Limpiar observer anterior si existe
    this.mutationObserver?.disconnect();
    
    // Buscar el contenedor de los botones
    const actionStack = document.querySelector('.action-stack');
    if (!actionStack) {
      console.warn('[ClientePedidoEnCurso] ⚠️ No se encontró .action-stack para observer');
      return;
    }

    // Crear observer para detectar cuando se agrega el botón
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // Verificar si el botón de encuesta está presente y visible
          const botonEncuesta = actionStack.querySelector('ion-button.option-card.var4');
          if (botonEncuesta && !botonEncuesta.hasAttribute('disabled')) {
            console.log('[ClientePedidoEnCurso] 🎯 Botón de encuesta detectado por observer, haciendo scroll...');
            setTimeout(() => this.scrollToEncuestaButton(), 100);
            // Desconectar después de detectar
            this.mutationObserver?.disconnect();
          }
        }
      });
    });

    // Observar cambios en el contenedor
    this.mutationObserver.observe(actionStack, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'class']
    });

    // Timeout de seguridad para desconectar después de 5 segundos
    setTimeout(() => {
      this.mutationObserver?.disconnect();
    }, 5000);
  }

  async aceptarPedido() {
    if (!this.pedidoId) return;

    try {
      this.spinner.show({ immediate: true });
      console.log(`[ClientePedidoEnCursoComponent] Aceptando pedido ${this.pedidoId}...`);
      
      // Actualizar el estado del pedido a 'entregado'
      const { error } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'entregado',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.pedidoId);

      if (error) {
        console.error('Error al aceptar el pedido:', error);
        this.toast.error('ERROR AL ACEPTAR EL PEDIDO: ' + (error.message || 'ERROR DESCONOCIDO').toUpperCase(), '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
        return;
      }

      console.log(`[ClientePedidoEnCursoComponent] ✅ Pedido ${this.pedidoId} aceptado`);
      
      // Actualizar el estado local
      this.estado = 'entregado';
      
      this.toast.success('PEDIDO ACEPTADO CORRECTAMENTE', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      
    } catch (error: any) {
      console.error('[ClientePedidoEnCursoComponent] Error al aceptar pedido:', error);
      this.toast.error('ERROR AL ACEPTAR EL PEDIDO: ' + (error?.message || 'ERROR DESCONOCIDO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.spinner.hide();
    }
  }

  async rechazarPedido() {
    if (!this.pedidoId) return;

    const confirmacion = confirm('¿ESTÁS SEGURO DE QUE QUERÉS RECHAZAR ESTE PEDIDO?');
    if (!confirmacion) return;

    try {
      this.spinner.show({ immediate: true });
      console.log(`[ClientePedidoEnCursoComponent] Rechazando pedido ${this.pedidoId}...`);
      
      // Actualizar el estado del pedido a 'rechazado'
      const { error } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'rechazado',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.pedidoId);

      if (error) {
        console.error('Error al rechazar el pedido:', error);
        this.toast.error('ERROR AL RECHAZAR EL PEDIDO: ' + (error.message || 'ERROR DESCONOCIDO').toUpperCase(), '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
        return;
      }

      console.log(`[ClientePedidoEnCursoComponent] ✅ Pedido ${this.pedidoId} rechazado`);
      
      // Actualizar el estado local
      this.estado = 'rechazado';
      this.hasPedido = false;
      
      this.toast.success('PEDIDO RECHAZADO', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      
    } catch (error: any) {
      console.error('[ClientePedidoEnCursoComponent] Error al rechazar pedido:', error);
      this.toast.error('ERROR AL RECHAZAR EL PEDIDO: ' + (error?.message || 'ERROR DESCONOCIDO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.spinner.hide();
    }
  }

  /**
   * 🆕 Confirma la recepción del pedido repartidor
   */
  async confirmarRecepcionDelivery() {
    if (!this.pedidoId || !this.esDelivery) {
      console.log('[ClientePedidoEnCurso] ⚠️ No se puede confirmar: pedidoId o esDelivery faltante');
      return;
    }
    
    if (this.estado !== 'entregado') {
      this.toast.warning('EL PEDIDO AÚN NO HA SIDO ENTREGADO', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      return;
    }

    try {
      this.spinner.show({ immediate: true });
      console.log(`[ClientePedidoEnCurso] Confirmando recepción del pedido repartidor ${this.pedidoId}...`);
      
      // 🆕 Verificar que el pedido realmente está en estado 'entregado'
      const { data: pedidoVerificar, error: errorVerificar } = await this.supa.client
        .from('pedidos')
        .select('id, estado, tipo_pedido')
        .eq('id', this.pedidoId)
        .single();

      if (errorVerificar) {
        console.error('[ClientePedidoEnCurso] ❌ Error al verificar pedido:', errorVerificar);
        throw new Error('ERROR AL VERIFICAR EL ESTADO DEL PEDIDO');
      }

      if (!pedidoVerificar || pedidoVerificar.tipo_pedido !== 'delivery') {
        throw new Error('ESTE PEDIDO NO ES DE TIPO REPARTIDOR');
      }

      if (pedidoVerificar.estado !== 'entregado') {
        this.toast.warning(`EL PEDIDO ESTÁ EN ESTADO: ${pedidoVerificar.estado.toUpperCase()}. DEBE ESTAR ENTREGADO PARA CONFIRMAR RECEPCIÓN`, '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
        this.spinner.hide();
        return;
      }

      // Obtener idDelivery del pedido para notificar al delivery correcto
      const { data: pedidoCompleto } = await this.supa.client
        .from('pedidos')
        .select('idDelivery')
        .eq('id', this.pedidoId)
        .single();

      const deliveryUid = pedidoCompleto?.idDelivery;

      // Notificar vía realtime al delivery específico
      if (deliveryUid) {
        try {
          const { data: userData } = await this.supa.client.auth.getUser();
          const clienteId = userData?.user?.id;
          
          const deliveryChannel = this.supa.client.channel(`notificacion_delivery_recepcion_${deliveryUid}`);
          
          // Suscribirse antes de enviar
          deliveryChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              deliveryChannel.send({
                type: 'broadcast' as const,
                event: 'recepcion_confirmada',
                payload: {
                  pedido_id: this.pedidoId,
                  cliente_id: clienteId,
                  timestamp: new Date().toISOString()
                }
              }).then(() => {
                console.log('[ClientePedidoEnCurso] ✅ Notificación enviada al delivery');
                setTimeout(() => {
                  this.supa.client.removeChannel(deliveryChannel);
                }, 1000);
              }).catch(err => {
                console.error('[ClientePedidoEnCurso] ⚠️ Error al enviar notificación (no crítico):', err);
                this.supa.client.removeChannel(deliveryChannel);
              });
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[ClientePedidoEnCurso] ⚠️ Error en canal (no crítico)');
              this.supa.client.removeChannel(deliveryChannel);
            }
          });
        } catch (notifError) {
          console.error('[ClientePedidoEnCurso] ⚠️ Error al enviar notificación (no crítico):', notifError);
          // No lanzar error, solo registrar
        }
      }

      // Marcar recepción como confirmada
      this.recepcionConfirmada = true;
      this.cdr.detectChanges(); // Forzar actualización de UI

      this.toast.success('RECEPCIÓN CONFIRMADA. YA PODÉS ACCEDER AL RESTO DE LAS FUNCIONES', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });

      console.log(`[ClientePedidoEnCurso] ✅ Recepción del pedido repartidor ${this.pedidoId} confirmada`);
      
    } catch (error: any) {
      console.error('[ClientePedidoEnCurso] ❌ Error al confirmar recepción:', error);
      this.toast.error('ERROR AL CONFIRMAR LA RECEPCIÓN: ' + (error?.message || 'ERROR INESPERADO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.spinner.hide();
    }
  }

  async pedirCuenta() {
    try {
      this.spinner.show({ immediate: true });
      // 🆕 Si es repartidor, navegar directamente sin buscar mesa
      if (this.esDelivery) {
        console.log('[ClientePedidoEnCurso] Pedido repartidor - navegando directamente a detalle de cuenta');
        this.router.navigate(['/cliente-detalle-cuenta'], {
          queryParams: { tipo: 'delivery' }
        });
        this.spinner.hide();
        return;
      }

      // Para pedidos de mesa, usar el flujo original
      const waitStatus = await this.supa.getWaitStatusDetail();
      if (!waitStatus || !waitStatus.numero_mesa) {
        throw new Error('NO SE PUDO OBTENER INFORMACIÓN DE LA MESA');
      }

      // Enviar notificación al mozo
      await this.supa.solicitarCuenta(waitStatus.numero_mesa);
      this.toast.success('SOLICITUD DE CUENTA ENVIADA AL MOZO', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });

      // Navegar al detalle de cuenta
      this.router.navigate(['/cliente-detalle-cuenta']);
      
    } catch (error: any) {
      console.error('Error al solicitar cuenta:', error);
      this.toast.error((error?.message || 'ERROR AL SOLICITAR LA CUENTA').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.spinner.hide();
    }
  }

  irAEncuestas() {
    this.router.navigate(['/form-encuesta']);
  }

  irAPago() {
    // TODO: Implementar navegación a pago
    this.toast.info('FUNCIONALIDAD DE PAGO EN DESARROLLO', '', {
      positionClass: 'toast-center',
      timeOut: 3000
    });
  }

  irARealizarPedido() {
  this.router.navigate(['/cliente/cliente-realiza-pedido']);
}
async irAChat() {
  console.log('[irAChat] 🚀 Método iniciado');
  
  // Validar que el pedido esté confirmado
  if (this.estado === 'pendiente' || this.estado === 'rechazado por admin') {
    console.log('[irAChat] ⚠️ Pedido aún no confirmado o rechazado');
    this.toast.warning('EL PEDIDO DEBE ESTAR CONFIRMADO PARA PODER CHATEAR', '', {
      positionClass: 'toast-center',
      timeOut: 3000
    });
    return;
  }
  
  // 🆕 Si es repartidor, SOLO permitir chat si tiene repartidor asignado
  if (this.esDelivery) {
    if (!this.repartidorInfo) {
      console.log('[irAChat] 🚚 Pedido repartidor pero aún no tiene repartidor asignado');
      this.toast.warning('EL CHAT ESTARÁ DISPONIBLE CUANDO SE ASIGNE UN REPARTIDOR A TU PEDIDO', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      return;
    }
    
    console.log('[irAChat] 🚚 Pedido repartidor con repartidor asignado - navegando a chat');
    const pedidoIdParaChat = this.pedidoId || 0;
    this.router.navigate(['/cliente/chat', pedidoIdParaChat], {
      queryParams: { mesa: 0 } // No hay mesa en repartidor
    });
    return;
  }

  // Para pedidos de mesa, usar el flujo original
  try {
    console.log('[irAChat] 🔍 Obteniendo usuario...');
    const userId = (await this.menu.getClienteIdActual());
    console.log('[irAChat] 👤 Usuario ID:', userId);
    
    const { data: waitRow } = await this.supa.client
      .from('lista_espera')
      .select('mesa_id')
      .eq('usuario_id', userId)
      .eq('estado', 'asignado')
      .single();

    console.log('[irAChat] 📍 WaitRow:', waitRow);

    if (waitRow?.mesa_id) {
      console.log('[irAChat] 🏠 Mesa ID encontrado:', waitRow.mesa_id);
      
      // Obtener número de mesa
      const { data: mesa } = await this.supa.client
        .from('mesas')
        .select('numero')
        .eq('id', waitRow.mesa_id)
        .single();

      console.log('[irAChat] 🏠 Datos mesa:', mesa);
      const mesaNumero = mesa?.numero ?? 0;
      console.log('[irAChat] 🔢 Número mesa:', mesaNumero);
      
      // Navegar con el número de mesa como query param
      // Usar pedidoId si existe, sino usar 0 como placeholder
      const pedidoIdParaChat = this.pedidoId || 0;
      console.log('[irAChat] 🚀 Navegando con mesa:', mesaNumero, 'pedidoId:', pedidoIdParaChat);
      this.router.navigate(['/cliente/chat', pedidoIdParaChat], {
        queryParams: { mesa: mesaNumero }
      });
    } else {
      console.log('[irAChat] ⚠️ Sin mesa asignada');
      // No tiene mesa asignada, navegar sin número
      const pedidoIdParaChat = this.pedidoId || 0;
      this.router.navigate(['/cliente/chat', pedidoIdParaChat], {
        queryParams: { mesa: 0 }
      });
    }
  } catch (e) {
    console.error('[irAChat] ❌ Error:', e);
    // Navegar de todas formas
    const pedidoIdParaChat = this.pedidoId || 0;
    this.router.navigate(['/cliente/chat', pedidoIdParaChat], {
      queryParams: { mesa: 0 }
    });
  }
}

editarPedidoRechazado() {
  // Navegar al componente de realizar pedido con el ID del pedido rechazado
  // para que pueda modificarlo
  this.router.navigate(['/cliente/cliente-realiza-pedido'], {
    queryParams: { 
      editar: true, 
      pedidoId: this.pedidoId 
    }
  });
  
  // Marcar que ya no necesita editar (el botón se ocultará)
  // Esto se actualizará cuando regrese con el nuevo pedido
}

}
