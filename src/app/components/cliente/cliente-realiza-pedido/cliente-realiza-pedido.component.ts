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

@Component({
  selector: 'app-cliente-realiza-pedido',
  templateUrl: './cliente-realiza-pedido.component.html',
  styleUrls: ['./cliente-realiza-pedido.component.scss'],
  imports: [CommonModule, IonicModule],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ClienteRealizaPedidoComponent  implements OnInit {

  idCliente = 1 //para probar
  cantidadesProductos: { [idProducto: string]: number } = {};
  cantidadesProductosEnCarrito: { id: number; cantidad: number; precio_unitario: number }[] = [];
  precioAcumulado: number = 0;
  tiempoDeEspera: number = 0;

  menu: any[] = [];

  cargando = false;
  pedidoRealizado = false;
  idPedido: string = '';

  pedido: Pedido | null = null; 

  constructor(private router: Router, private menuService: MenuService, private toastr: ToastrService, private supabase: SupabaseService) {
    addIcons({
      'checkmark-outline': checkmarkOutline
    });
  }

  async ngOnInit() {
    if (!this.pedidoRealizado) {
      try {
        this.menu = await this.menuService.obtenerMenu();
      } catch (err) {
        console.error('No se pudo traer el menú:', err);
      }
    } else {
      this.pedido = await this.menuService.cargarPedido(this.idPedido);
    }

  }

  private toastOk(msg: string) {
    this.toastr.success(msg, '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
  }

  async finalizarPedido () {

    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;

    //guardar en la db el precio del pedido
    try {
      this.cargando = true;

      console.log(`Iniciando guardado de pedido en la base de datos con id de cliente: ${userId}`);
      const res = await this.menuService.crearPedido({idCliente : userId!, productos: this.cantidadesProductosEnCarrito, precioAcumulado: this.precioAcumulado, tiempoDeEspera: this.tiempoDeEspera});
      this.toastOk(`Pedido creado correctamente.`);
    
    } catch (e: any) {
      this.toastr.error(e?.message || 'Error creando el pedido.');
    } finally {
      this.cargando = false;
    }

    /* redirigir a la página anterior*/
    this.router.navigateByUrl('/cliente-pedido-en-curso');
    
  }

  agregarProducto (idProducto: number, precioProducto: number, nombreProducto: string, sector: string, tiempoPreparacion: number) {

    const cantidad = this.cantidadesProductos[idProducto] || 0;
    if (cantidad) {
      this.cantidadesProductos[idProducto] = 0;
    }

    //Calculo precio acumulado
    this.precioAcumulado += (precioProducto * cantidad);

    //Calculo tiempo de espera
    if (this.tiempoDeEspera == 0 || this.tiempoDeEspera < tiempoPreparacion) {
      this.tiempoDeEspera = tiempoPreparacion;
    }

    const productoExistente = this.cantidadesProductosEnCarrito.find(
      item => item.id === idProducto
    );

    if (productoExistente) {
      // Si existe, aumentamos la cantidad
      productoExistente.cantidad += cantidad;
    } else {
      // Si no existe, lo agregamos
      this.cantidadesProductosEnCarrito.push({
        id: idProducto,
        cantidad: cantidad,
        precio_unitario: precioProducto
      });
    }
    
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