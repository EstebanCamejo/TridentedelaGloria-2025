import { Component, OnInit } from '@angular/core';
import { MenuService, PlatoTipo } from 'src/app/services/menu.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SupabaseService } from 'src/app/services/supabase.service';
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

  constructor(
    private pedidosSvc: PedidosService, 
    private router: Router, 
    private route: ActivatedRoute,
    private menuService: MenuService, 
    private toastr: ToastrService,
    private supa: SupabaseService
  ) {
    addIcons({
      'checkmark-outline': checkmarkOutline
    });
      if (!_swiperRegistered) { register(); _swiperRegistered = true; }
  }

  async ngOnInit() {
    try {
      this.idCliente = await this.menuService.getClienteIdActual(); // uuid string
      this.menu = await this.menuService.obtenerMenu();
      
      // Verificar si está en modo edición
      this.route.queryParams.subscribe(params => {
        if (params['editar'] === 'true' && params['pedidoId']) {
          this.modoEdicion = true;
          this.pedidoAEditar = +params['pedidoId'];
          this.cargarPedidoParaEditar(this.pedidoAEditar);
        }
      });
      
    } catch (err) {
      console.error(err);
      this.toastr.error('No se pudo identificar al usuario.');
    }
  }

  private toastOk(msg: string) {
    this.toastr.success(msg, '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
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
      
      this.toastr.info('Pedido cargado para editar. Puedes modificar productos y cantidades.');
      
    } catch (error: any) {
      console.error('[ClienteRealizaPedidoComponent] Error al cargar pedido para editar:', error);
      this.toastr.error('Error al cargar el pedido: ' + (error?.message || 'Error desconocido'));
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
        console.log(`[ClienteRealizaPedidoComponent] Producto ${item.id}: tiempo ${tiempoDesdeMenu} min`);
      });

      // Recalcular tiempo total
      this.tiempoDeEspera = Math.max(...this.cantidadesProductosEnCarrito.map(item => item.tiempo_preparacion), 0);
      console.log(`[ClienteRealizaPedidoComponent] Tiempo total recalculado: ${this.tiempoDeEspera} min`);

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

      console.log(`[ClienteRealizaPedidoComponent] Total calculado: $${nuevoTotal}, Tiempo: ${maxTiempo} min`);

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
    this.toastr.info('Agregá al menos un producto.');
    return;
  }

  try {
    this.cargando = true;

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
        productos: this.cantidadesProductosEnCarrito
      });
    }

    // espero que res traiga: { id: number, total: number, tiempoEstimado: number }
    if (!res?.id) throw new Error('La API no devolvió un id de pedido.');

    // ✅ marcar pedido actual (queda disponible en todos los tabs, p.ej. Juegos)
    this.pedidosSvc.setPedidoActual({ id: Number(res.id) });

    this.pedidoRealizado = true;
    this.idPedido = Number(res.id);

    // Mensaje de éxito diferente según el modo
    if (this.modoEdicion) {
      this.toastOk('¡Pedido actualizado y enviado nuevamente!');
    } else {
      this.toastOk('¡Pedido enviado!');
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
    this.toastr.error(e?.message || 'Error creando el pedido.');
  } finally {
    this.cargando = false;
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