import { CommonModule } from '@angular/common';
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { MenuService, PlatoTipo } from 'src/app/services/menu.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import type { SegmentChangeEventDetail } from '@ionic/angular';
import { register } from 'swiper/element/bundle';

@Component({
  selector: 'app-verificar-pendientes-bartender',
  templateUrl: './verificar-pendientes-bartender.component.html',
  styleUrls: ['./verificar-pendientes-bartender.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class VerificarPendientesBartenderComponent  implements OnInit {

  tab: 'pendientes' | 'listos' = 'pendientes';
  pedidosPendientes: any[] = [];
  pedidosListos: any[] = [];
  cargando: boolean = true;
  error: string | null = null;
  pedidosProcesando: Set<number> = new Set();
  
  // Paginación
  currentSlidePendientes: number = 0;
  currentSlideListos: number = 0;

  constructor(
    private service: MenuService,
    private router: Router,
    private spinner: SpinnerService,
    private toast: ToastrService
  ) {
    addIcons({ arrowBackOutline, chevronBackOutline, chevronForwardOutline });
    register(); // Registrar Swiper
  }

  async ngOnInit() {
    try {
      this.cargando = true;
      this.spinner.show({ immediate: true });
      console.log('🔄 Iniciando carga de pedidos de bar...');
      await this.cargarPedidos();
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
      
      // ✅ CORRECCIÓN: Usar estado_sector_bar en lugar de pedido.estado para decidir la acción
      const estadoSectorBar = pedido.estado_sector_bar || null;
      
      // CASO 1: Pedido aún no aceptado por el bartender (estado_sector_bar es NULL)
      if (!estadoSectorBar || estadoSectorBar === null) {
        // Verificar si es un pedido multi-sector
        const esMultiSector = await this.verificarSiEsMultiSector(pedido.id);
        
        if (esMultiSector) {
          // Para pedidos multi-sector, usar estado intermedio
          await this.service.actualizarEstadoPedido(
            pedido.id, 
            'en preparación parcial', 
            'en preparación',
            'bar'
          );

          // Recargar pedidos para actualizar las listas
          await this.cargarPedidos();
        } else {
          // Para pedidos de un solo sector, flujo normal
          await this.service.actualizarEstadoPedido(
            pedido.id, 
            'en preparación', 
            'en preparación',
            'bar'
          );

          // Recargar pedidos para actualizar las listas
          await this.cargarPedidos();
        }
      }
      // CASO 2: Pedido en preparación (estado_sector_bar = 'en preparación')
      else if (estadoSectorBar === 'en preparación') {
        // Verificar si es un pedido multi-sector
        const esMultiSector = await this.verificarSiEsMultiSector(pedido.id);
        
        if (esMultiSector) {
          // Para pedidos multi-sector, verificar si todos los sectores están listos
          const todosLosSectoresListos = await this.verificarTodosLosSectoresListos(pedido.id);
          
          if (todosLosSectoresListos) {
            // Todos los sectores están listos, cambiar estado general y sector
            await this.service.actualizarEstadoPedido(
              pedido.id, 
              'listo para entregar', 
              'listo para entregar',
              'bar'
            );

            await this.verificarPedido(pedido.id);

            // Recargar pedidos (el pedido se eliminará de la vista porque el flujo normal lo maneja)
            await this.cargarPedidos();
          } else {
            // Marcar este sector como listo y verificar si ahora todos están listos
            await this.service.actualizarEstadoPedido(
              pedido.id, 
              'en preparación parcial', 
              'listo para entregar',
              'bar'
            );

            // Verificar nuevamente si todos los sectores están listos después de marcar este sector
            const todosLosSectoresListosAhora = await this.verificarTodosLosSectoresListos(pedido.id);
            
            if (todosLosSectoresListosAhora) {
              // Ahora sí están todos listos, cambiar el estado general
              await this.service.actualizarEstadoPedido(
                pedido.id, 
                'listo para entregar', 
                'listo para entregar',
                'bar'
              );

              await this.verificarPedido(pedido.id);

              // Recargar pedidos (el pedido se eliminará de la vista porque el flujo normal lo maneja)
              await this.cargarPedidos();
            } else {
              // Solo marcar este sector como listo, mantener estado parcial
              await this.cargarPedidos();
            }
          }
        } else {
          // Para pedidos de un solo sector, flujo normal
          await this.service.actualizarEstadoPedido(
            pedido.id, 
            'listo para entregar', 
            'listo para entregar',
            'bar'
          );

          await this.verificarPedido(pedido.id);

          // Recargar pedidos (el pedido se eliminará de la vista porque el flujo normal lo maneja)
          await this.cargarPedidos();
        }
      }
      // CASO 3: Pedido ya está listo (estado_sector_bar = 'listo para entregar')
      // No hacer nada, el pedido ya está listo

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

  async cargarPedidos() {
    const todosLosPedidos = await this.service.obtenerPedidosBar();
    // Separar pedidos en pendientes y listos
    // 🆕 PENDIENTES: pedidos donde estado_sector_bar es NULL (aún no aceptados por bar)
    this.pedidosPendientes = todosLosPedidos.filter(pedido => {
      const estadoBar = (pedido as any).estado_sector_bar;
      return !estadoBar || estadoBar === null;
    });
    // 🆕 LISTOS: pedidos donde estado_sector_bar está en 'en preparación' (excluir 'listo para entregar')
    // Los pedidos "listo para entregar" desaparecen de todas las listas
    this.pedidosListos = todosLosPedidos.filter(pedido => {
      const estadoBar = (pedido as any).estado_sector_bar;
      return estadoBar === 'en preparación';
    });
    console.log('✅ Pedidos pendientes (bar):', this.pedidosPendientes);
    console.log('✅ Pedidos listos (bar):', this.pedidosListos);
  }

  async handleRefresh(ev: CustomEvent) {
    console.log('[VerificarPendientesBartenderComponent] Pull to refresh activado');
    try {
      this.cargando = true;
      // No mostrar spinner en pull-to-refresh
      await this.cargarPedidos();
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
   * Verifica si el sector del bartender está listo para entregar
   */
  estaSectorListo(pedido: any): boolean {
    return pedido.estado_sector_bar === 'listo para entregar';
  }

  volver() {
    this.router.navigate(['/home-bartender-cocinero']);
  }

  onTabChange(ev: CustomEvent<SegmentChangeEventDetail>) {
    const v = ev.detail.value;
    if (v === 'pendientes' || v === 'listos') {
      this.tab = v;
    }
  }

  // Métodos para manejar la paginación
  onSlideChangePendientes(event: any) {
    this.currentSlidePendientes = event.detail[0].activeIndex;
  }

  onSlideChangeListos(event: any) {
    this.currentSlideListos = event.detail[0].activeIndex;
  }

  goToPreviousPendientes(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slidePrev();
    }
  }

  goToNextPendientes(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slideNext();
    }
  }

  goToPreviousListos(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slidePrev();
    }
  }

  goToNextListos(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slideNext();
    }
  }
}
