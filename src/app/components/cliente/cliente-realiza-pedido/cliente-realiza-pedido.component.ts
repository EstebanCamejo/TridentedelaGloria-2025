import { Component, OnInit } from '@angular/core';
import { MenuService, PlatoTipo } from 'src/app/services/menu.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar, IonTitle, IonCard } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { SupabaseService } from 'src/app/services/supabase.service';
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
  //idPedido: string = '';
  idPedido: number | null = null;


  pedido: Pedido | null = null; 

  constructor(private pedidosSvc: PedidosService, private router: Router, private menuService: MenuService, private toastr: ToastrService) {
    addIcons({
      'checkmark-outline': checkmarkOutline
    });
      if (!_swiperRegistered) { register(); _swiperRegistered = true; }
  }

  async ngOnInit() {
 try {
      this.idCliente = await this.menuService.getClienteIdActual(); // uuid string
      this.menu = await this.menuService.obtenerMenu();
    } catch (err) {
      console.error(err);
      this.toastr.error('No se pudo identificar al usuario.');
    }
  }

  private toastOk(msg: string) {
    this.toastr.success(msg, '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
  }


// async finalizarPedido() {
//     if (this.cargando || this.pedidoRealizado) return;
//     if (!this.cantidadesProductosEnCarrito.length) {
//       this.toastr.info('Agregá al menos un producto.');
//       return;
//     }
//     try {
//       this.cargando = true;
//       const res = await this.menuService.crearPedido({
//         idCliente: this.idCliente, // <-- uuid
//         productos: this.cantidadesProductosEnCarrito
//       });
//       this.pedidoRealizado = true;
//       this.idPedido = String(res.id);
//       this.router.navigate(['/cliente-pedido-en-curso'], {
//         state: { pedidoId: res.id, total: res.total, tiempo: res.tiempoEstimado }
//       });
//       // limpiar carrito...
//     } catch (e:any) {
//       this.toastr.error(e?.message || 'Error creando el pedido.');
//     } finally {
//       this.cargando = false;
//     }
// }

async finalizarPedido() {
  if (this.cargando || this.pedidoRealizado) return;

  if (!this.cantidadesProductosEnCarrito.length) {
    this.toastr.info('Agregá al menos un producto.');
    return;
  }

  try {
    this.cargando = true;

    const res = await this.menuService.crearPedido({
      idCliente: this.idCliente,                 // uuid del usuario
      productos: this.cantidadesProductosEnCarrito
    });
    // espero que res traiga: { id: number, total: number, tiempoEstimado: number }
    if (!res?.id) throw new Error('La API no devolvió un id de pedido.');

    // ✅ marcar pedido actual (queda disponible en todos los tabs, p.ej. Juegos)
    this.pedidosSvc.setPedidoActual({ id: Number(res.id) });

    this.pedidoRealizado = true;
    this.idPedido = Number(res.id);

    // Navegar a “pedido en curso” con state útil para pintar la UI al toque
    this.router.navigate(['/cliente-pedido-en-curso'], {
      state: {
        pedidoId: this.idPedido,
        total: res.total ?? 0,
        tiempo: res.tiempoEstimado ?? null
      }
    });

    // TODO: limpiar carrito…
    // this.cantidadesProductosEnCarrito = [];
    // this.menuService.vaciarCarrito();

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