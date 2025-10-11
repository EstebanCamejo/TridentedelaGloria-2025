import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { MenuService, PlatoTipo } from 'src/app/services/menu.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-verificar-pendientes-bartender',
  templateUrl: './verificar-pendientes-bartender.component.html',
  styleUrls: ['./verificar-pendientes-bartender.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule],
})
export class VerificarPendientesBartenderComponent  implements OnInit {

  pedidosBartender: any[] = [];
  cargando: boolean = true;
  error: string | null = null;
  pedidosProcesando: Set<number> = new Set();

  constructor(private service: MenuService, private router: Router) {
    addIcons({ arrowBackOutline });
  }

  async ngOnInit() {
    try {
      console.log('🔄 Iniciando carga de pedidos de bar...');
      this.pedidosBartender = await this.service.obtenerPedidosBar();
      console.log('✅ Pedidos cargados en componente:', this.pedidosBartender);
    } catch (err) {
      console.error('💥 Error en componente:', err);
      this.error = 'Error al cargar los pedidos';
    } finally {
      this.cargando = false;
      console.log('🏁 Carga finalizada');
    }
  }

  async aceptarPedido(pedido: any) {
    // Evitar múltiples clics
    if (this.pedidosProcesando.has(pedido.id)) {
      return;
    }

    try {
      this.pedidosProcesando.add(pedido.id);
      
      // Actualizar el estado del pedido
      await this.service.actualizarEstadoPedido(
        pedido.id, 
        'en preparación', 
        'en preparación'
      );

      await this.verificarPedido(pedido.id);

      // Actualizar la lista local
      const pedidoIndex = this.pedidosBartender.findIndex(p => p.id === pedido.id);
      if (pedidoIndex !== -1) {
        this.pedidosBartender[pedidoIndex].estado = 'en preparación';
        this.pedidosBartender[pedidoIndex].estado_sector_cocina = 'en preparación';
      }

      // Opcional: Recargar los pedidos para obtener datos frescos
      // await this.cargarPedidos();

    } catch (error) {
      console.error('Error al aceptar el pedido:', error);
      this.error = 'Error al aceptar el pedido';
    } finally {
      this.pedidosProcesando.delete(pedido.id);
    }
  }

  async verificarPedido(idPedido: number) {
    await this.service.verificarPedido(idPedido);
  }

  // Método para verificar si un pedido está siendo procesado
  estaProcesando(pedidoId: number): boolean {
    return this.pedidosProcesando.has(pedidoId);
  }

  getBadgeClass(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'badge-pendiente';
      case 'confirmado':
        return 'badge-confirmado';
      case 'en preparación':
        return 'badge-preparacion';
      default:
        return '';
    }
  }

  volver() {
    this.router.navigate(['/home-bartender-cocinero']);
  }

}
