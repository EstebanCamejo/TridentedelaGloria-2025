import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { MenuService, PlatoTipo } from 'src/app/services/menu.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-verificar-pendientes-cocinero',
  templateUrl: './verificar-pendientes-cocinero.component.html',
  styleUrls: ['./verificar-pendientes-cocinero.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule],
})
export class VerificarPendientesCocineroComponent  implements OnInit {

  pedidosCocina: any[] = [];
  cargando: boolean = true;
  error: string | null = null;
  pedidosProcesando: Set<number> = new Set();

  constructor(
    private service: MenuService,
    private router: Router,
    private spinner: SpinnerService,
    private toast: ToastrService
  ) {
    addIcons({ arrowBackOutline });
  }

  async ngOnInit() {
    try {
      this.cargando = true;
      this.spinner.show({ immediate: true });
      console.log('🔄 Iniciando carga de pedidos de cocina...');
      this.pedidosCocina = await this.service.obtenerPedidosCocina();
      console.log('✅ Pedidos cargados en componente:', this.pedidosCocina);
    } catch (err) {
      console.error('💥 Error en componente:', err);
      this.error = 'ERROR AL CARGAR LOS PEDIDOS';
      this.toast.error('ERROR AL CARGAR LOS PEDIDOS', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.cargando = false;
      this.spinner.hide();
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
      this.spinner.show({ immediate: true, minMs: 500 });
      
      // Si el pedido está en 'pedido en curso', cambiar a 'en preparación'
      if (pedido.estado === 'pedido en curso') {
        // Verificar si es un pedido multi-sector
        const esMultiSector = await this.verificarSiEsMultiSector(pedido.id);
        
        if (esMultiSector) {
          // Para pedidos multi-sector, usar estado intermedio
          await this.service.actualizarEstadoPedido(
            pedido.id, 
            'en preparación parcial', 
            'en preparación',
            'cocina'
          );

          // Actualizar la lista local
          const pedidoIndex = this.pedidosCocina.findIndex(p => p.id === pedido.id);
          if (pedidoIndex !== -1) {
            this.pedidosCocina[pedidoIndex].estado = 'en preparación parcial';
            this.pedidosCocina[pedidoIndex].estado_sector_cocina = 'en preparación';
          }
        } else {
          // Para pedidos de un solo sector, flujo normal
          await this.service.actualizarEstadoPedido(
            pedido.id, 
            'en preparación', 
            'en preparación',
            'cocina'
          );

          // Actualizar la lista local
          const pedidoIndex = this.pedidosCocina.findIndex(p => p.id === pedido.id);
          if (pedidoIndex !== -1) {
            this.pedidosCocina[pedidoIndex].estado = 'en preparación';
            this.pedidosCocina[pedidoIndex].estado_sector_cocina = 'en preparación';
          }
        }
      }
      // Si el pedido está en 'en preparación' o 'en preparación parcial', cambiar a 'listo para entregar'
      else if (pedido.estado === 'en preparación' || pedido.estado === 'en preparación parcial') {
        // Verificar si es un pedido multi-sector
        const esMultiSector = await this.verificarSiEsMultiSector(pedido.id);
        
        if (esMultiSector) {
          // Para pedidos multi-sector, verificar si todos los sectores están listos
          const todosLosSectoresListos = await this.verificarTodosLosSectoresListos(pedido.id);
          
          if (todosLosSectoresListos) {
            await this.service.actualizarEstadoPedido(
              pedido.id, 
              'listo para entregar', 
              'listo para entregar',
              'cocina'
            );

            await this.verificarPedido(pedido.id);

            // Actualizar la lista local
            const pedidoIndex = this.pedidosCocina.findIndex(p => p.id === pedido.id);
            if (pedidoIndex !== -1) {
              this.pedidosCocina[pedidoIndex].estado = 'listo para entregar';
              this.pedidosCocina[pedidoIndex].estado_sector_cocina = 'listo para entregar';
            }
          } else {
            // Marcar este sector como listo y verificar si ahora todos están listos
            await this.service.actualizarEstadoPedido(
              pedido.id, 
              'en preparación parcial', 
              'listo para entregar',
              'cocina'
            );

            // Verificar nuevamente si todos los sectores están listos después de marcar este sector
            const todosLosSectoresListosAhora = await this.verificarTodosLosSectoresListos(pedido.id);
            
            if (todosLosSectoresListosAhora) {
              // Ahora sí están todos listos, cambiar el estado general
              await this.service.actualizarEstadoPedido(
                pedido.id, 
                'listo para entregar', 
                'listo para entregar',
                'cocina'
              );

              await this.verificarPedido(pedido.id);

              // Actualizar la lista local
              const pedidoIndex = this.pedidosCocina.findIndex(p => p.id === pedido.id);
              if (pedidoIndex !== -1) {
                this.pedidosCocina[pedidoIndex].estado = 'listo para entregar';
                this.pedidosCocina[pedidoIndex].estado_sector_cocina = 'listo para entregar';
              }
            } else {
              // Solo marcar este sector como listo, mantener estado parcial
              const pedidoIndex = this.pedidosCocina.findIndex(p => p.id === pedido.id);
              if (pedidoIndex !== -1) {
                this.pedidosCocina[pedidoIndex].estado = 'en preparación parcial';
                this.pedidosCocina[pedidoIndex].estado_sector_cocina = 'listo para entregar';
              }
            }
          }
        } else {
          // Para pedidos de un solo sector, flujo normal
          await this.service.actualizarEstadoPedido(
            pedido.id, 
            'listo para entregar', 
            'listo para entregar',
            'cocina'
          );

          await this.verificarPedido(pedido.id);

          // Actualizar la lista local
          const pedidoIndex = this.pedidosCocina.findIndex(p => p.id === pedido.id);
          if (pedidoIndex !== -1) {
            this.pedidosCocina[pedidoIndex].estado = 'listo para entregar';
            this.pedidosCocina[pedidoIndex].estado_sector_cocina = 'listo para entregar';
          }
        }
      }

    } catch (error) {
      console.error('Error al procesar el pedido:', error);
      this.error = 'ERROR AL PROCESAR EL PEDIDO';
      this.toast.error('ERROR AL PROCESAR EL PEDIDO', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.pedidosProcesando.delete(pedido.id);
      this.spinner.hide();
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
      case 'pedido en curso':
        return 'badge-en-curso';
      case 'en preparación':
        return 'badge-preparacion';
      case 'en preparación parcial':
        return 'badge-preparacion-parcial';
      case 'listo para entregar':
        return 'badge-listo';
      default:
        return '';
    }
  }

  estadoTexto(estado: string): string {
    return estado.toUpperCase();
  }

  async handleRefresh(ev: CustomEvent) {
    console.log('[VerificarPendientesCocineroComponent] Pull to refresh activado');
    try {
      this.cargando = true;
      // No mostrar spinner en pull-to-refresh
      this.pedidosCocina = await this.service.obtenerPedidosCocina();
    } catch (err) {
      console.error('💥 Error en componente:', err);
      this.error = 'ERROR AL CARGAR LOS PEDIDOS';
      this.toast.error('ERROR AL CARGAR LOS PEDIDOS', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.cargando = false;
      (ev.target as any).complete();
    }
  }

  /**
   * Verifica si un pedido tiene productos para múltiples sectores
   */
  private async verificarSiEsMultiSector(pedidoId: number): Promise<boolean> {
    try {
      const { data: detalles, error } = await this.service['supabase'].client
        .from('pedidos_detalles')
        .select(`
          menu!inner (
            tipo
          )
        `)
        .eq('idPedido', pedidoId);

      if (error) throw error;

      const tipos = detalles?.map(d => (d as any).menu?.tipo).filter(tipo => tipo) || [];
      const tienePlatos = tipos.includes('plato');
      const tieneBebidas = tipos.includes('bebida');

      return tienePlatos && tieneBebidas;
    } catch (error) {
      console.error('Error al verificar si es multi-sector:', error);
      return false;
    }
  }

  /**
   * Verifica que todos los sectores del pedido estén listos
   */
  private async verificarTodosLosSectoresListos(pedidoId: number): Promise<boolean> {
    try {
      const { data: pedido, error } = await this.service['supabase'].client
        .from('pedidos')
        .select('estado_sector_cocina, estado_sector_bar')
        .eq('id', pedidoId)
        .single();

      if (error) throw error;

      // Verificar que ambos sectores estén listos (asumiendo que es multi-sector)
      const cocinaLista = pedido.estado_sector_cocina === 'listo para entregar';
      const barListo = pedido.estado_sector_bar === 'listo para entregar';

      return cocinaLista && barListo;
    } catch (error) {
      console.error('Error al verificar todos los sectores:', error);
      return false;
    }
  }

  /**
   * Verifica si el sector del cocinero está listo para entregar
   */
  estaSectorListo(pedido: any): boolean {
    return pedido.estado_sector_cocina === 'listo para entregar';
  }

  volver() {
    this.router.navigate(['/home-bartender-cocinero']);
  }
}
