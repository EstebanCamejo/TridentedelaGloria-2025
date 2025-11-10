import { Component, OnInit } from '@angular/core';
import { MenuService, PlatoTipo } from 'src/app/services/menu.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { SesionService } from 'src/app/services/sesion.service';
import { ModalController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { DireccionDeliveryComponent, DireccionDelivery } from '../direccion-delivery/direccion-delivery.component';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar, IonTitle, IonCard } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { C } from '@angular/common/common_module.d-Qx8B6pmN';
import { addIcons } from 'ionicons';
import { checkmarkOutline } from 'ionicons/icons';
import { Pedido, PedidoDetalle } from '../../../models/pedido.model'
import { register } from 'swiper/element/bundle';
import { PedidosService } from 'src/app/services/pedidos.service';

let _swiperRegistered = false;

@Component({
  selector: 'app-cliente-realiza-pedido',
  templateUrl: './cliente-realiza-pedido.component.html',
  styleUrls: ['./cliente-realiza-pedido.component.scss'],
  imports: [CommonModule, IonicModule],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ClienteRealizaPedidoComponent  implements OnInit {

   idCliente!: string; // ya no hardcodeado
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

  constructor(
    private pedidosSvc: PedidosService, 
    private router: Router, 
    private route: ActivatedRoute,
    private menuService: MenuService, 
    private toastr: ToastrService,
    private supa: SupabaseService,
    private spinner: SpinnerService,
    private sesion: SesionService,
    private modalCtrl: ModalController
  ) {
    addIcons({
      'checkmark-outline': checkmarkOutline
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
      
    } catch (err) {
      console.error(err);
      this.toastr.error('NO SE PUDO IDENTIFICAR AL USUARIO', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    }
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

  private toastOk(msg: string) {
    this.toastr.success(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
  }

  async cargarPedidoParaEditar(pedidoId: number) {
    try {
      console.log(`[ClienteRealizaPedidoComponent] Cargando pedido ${pedidoId} para editar...`);
      
      // Obtener detalles del pedido
      const { data: pedido, error: pedidoError } = await this.supa.client
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .eq('idCliente', this.idCliente)
        .single();

      if (pedidoError || !pedido) {
        throw new Error('No se pudo cargar el pedido para editar');
      }

      // Obtener detalles de los productos del pedido
      const { data: detalles, error: detallesError } = await this.supa.client
        .from('pedidos_detalles')
        .select('*')
        .eq('idPedido', pedidoId);

      if (detallesError || !detalles) {
        throw new Error('No se pudieron cargar los detalles del pedido');
      }

      // Cargar productos en el carrito
      this.cantidadesProductosEnCarrito = detalles.map((detalle: any) => ({
        id: detalle.idProducto,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precioUnitario, // Usar precioUnitario (camelCase) como en la DB
        tiempo_preparacion: detalle.tiempo_preparacion || detalle.tiempoPreparacion || 0 // Se calculará desde el menu
      }));

      // Obtener tiempos de preparación desde la tabla menu
      await this.cargarTiemposPreparacion();

      // Calcular totales
      this.precioAcumulado = pedido.total || 0;
      this.tiempoDeEspera = pedido.tiempo_estimado || 0;

      // Sincronizar cantidades con la UI (para que se muestren los productos en los contadores)
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
    // Limpiar cantidades actuales
    this.cantidadesProductos = {};
    
    // Sincronizar cantidades del carrito con los contadores visuales
    for (const item of this.cantidadesProductosEnCarrito) {
      this.cantidadesProductos[item.id.toString()] = item.cantidad;
    }
    
    console.log('[ClienteRealizaPedidoComponent] Cantidades sincronizadas con UI:', this.cantidadesProductos);
  }

  async cargarTiemposPreparacion() {
    try {
      // Obtener IDs únicos de productos en el carrito
      const idsProductos = [...new Set(this.cantidadesProductosEnCarrito.map(item => item.id))];
      
      if (idsProductos.length === 0) return;

      console.log('[ClienteRealizaPedidoComponent] Cargando tiempos de preparación para productos:', idsProductos);

      // Obtener tiempos desde la tabla menu
      const { data: menuItems, error } = await this.supa.client
        .from('menu')
        .select('id, tiempo_elaboracion')
        .in('id', idsProductos);

      if (error) {
        console.error('[ClienteRealizaPedidoComponent] Error al cargar tiempos:', error);
        return;
      }

      // Crear mapa de tiempos por producto
      const tiemposMap = new Map();
      (menuItems || []).forEach(item => {
        tiemposMap.set(item.id, item.tiempo_elaboracion || 0);
      });

      // Actualizar tiempos en el carrito
      this.cantidadesProductosEnCarrito.forEach(item => {
        const tiempoDesdeMenu = tiemposMap.get(item.id) || 0;
        item.tiempo_preparacion = tiempoDesdeMenu;
        console.log(`[ClienteRealizaPedidoComponent] Producto ${item.id}: tiempo ${tiempoDesdeMenu} minutos`);
      });

      // Recalcular tiempo total
      this.tiempoDeEspera = Math.max(...this.cantidadesProductosEnCarrito.map(item => item.tiempo_preparacion), 0);
      console.log(`[ClienteRealizaPedidoComponent] Tiempo total recalculado: ${this.tiempoDeEspera} minutos`);

    } catch (error) {
      console.error('[ClienteRealizaPedidoComponent] Error al cargar tiempos de preparación:', error);
    }
  }

  async actualizarPedidoExistente(pedidoId: number) {
    try {
      console.log(`[ClienteRealizaPedidoComponent] Actualizando pedido ${pedidoId}...`);
      
      // 1. Eliminar detalles existentes del pedido
      const { error: deleteError } = await this.supa.client
        .from('pedidos_detalles')
        .delete()
        .eq('idPedido', pedidoId);

      if (deleteError) throw deleteError;

      // 2. Calcular nuevo total y tiempo estimado
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

      // 3. Actualizar el pedido principal
      const { error: updateError } = await this.supa.client
        .from('pedidos')
        .update({
          total: nuevoTotal,
          tiempo_estimado: maxTiempo,
          estado: 'pendiente', // Volver a estado pendiente para que el mozo lo vea
          updated_at: new Date().toISOString()
        })
        .eq('id', pedidoId);

      if (updateError) throw updateError;

      // 4. Insertar nuevos detalles (sin tiempo_preparacion ya que no existe en la tabla)
      const nuevosDetalles = this.cantidadesProductosEnCarrito.map(item => ({
        idPedido: pedidoId,
        idProducto: item.id,
        cantidad: item.cantidad,
        precioUnitario: item.precio_unitario // Usar precioUnitario (camelCase) como en la DB
        // tiempo_preparacion no se guarda en pedidos_detalles, se calcula desde menu
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

    // ✅ marcar pedido actual (queda disponible en todos los tabs, p.ej. Juegos)
    this.pedidosSvc.setPedidoActual({ id: Number(res.id) });

    this.pedidoRealizado = true;
    this.idPedido = Number(res.id);

    // Mensaje de éxito diferente según el modo
    if (this.modoEdicion) {
      this.toastOk('PEDIDO ACTUALIZADO Y ENVIADO NUEVAMENTE');
    } else {
      this.toastOk('PEDIDO ENVIADO');
    }

    // Navegar a "pedido en curso" con state útil para pintar la UI al toque
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

    this.cantidadesProductos[idProducto] = 0; // reset del contador visual
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
}