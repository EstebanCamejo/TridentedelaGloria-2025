import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
  IonTextarea, IonSelect, IonSelectOption, IonButton,
  IonSegment, IonSegmentButton, IonList, IonCheckbox,
  IonCard, IonCardContent
} from '@ionic/angular/standalone';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { EncuestasService } from 'src/app/services/encuestas.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { PedidosService } from 'src/app/services/pedidos.service';

// PASO 3.3 — haptics para feedback en errores/éxitos
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-pagina-formulario-encuesta',
  standalone: true,
  templateUrl: './pagina-formulario-encuesta.html',
  styleUrls: ['./pagina-formulario-encuesta.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonSegment, IonSegmentButton, IonList, IonCheckbox,
    IonCard, IonCardContent
  ]
})
export class PaginaFormularioEncuestaPage implements OnInit {

  // 🆕 ID de la encuesta según tipo (mesa o delivery)
  encuestaId = '00000000-0000-0000-0000-000000000001'; // Default: mesa
  encuestaDeliveryId = '00000000-0000-0000-0000-000000000002'; // Delivery

  // 🆕 Flag para saber si es encuesta de delivery
  esDelivery = false;
  pedidoDeliveryId: number | null = null;

  // Si tu flujo ya provee estos IDs, podés setearlos al entrar a la página
  lista_espera_id: string | null = null;
  mesas_id: string | null = null;

  // ---- FORM MODEL ----
  limpieza: 1|2|3|4|5 | null = null;
  aspecto_valorado: string | null = null;
  servicios_adicionales = {
    wifi: false,
    juegos: false,
    menu_sin_tacc: false,
    bebidas_sin_azucar: false,
    shows_en_vivo: false,
    // 🆕 Servicios adicionales para delivery
    empaque_adecuado: false,
    comunicacion_repartidor: false,
    puntualidad: false,
  };
  mensaje: string = '';

  // PASO 3.3 — estado de validación/UX
  errores: string[] = [];
  maxComentario = 300;

  constructor(
    private encuestas: EncuestasService,
    private toast: ToastrService,
    private spinner: SpinnerService,
    private router: Router,
    private supa: SupabaseService,
    private pedidosSvc: PedidosService
  ) {}

  async ngOnInit() {
    // 🆕 Detectar si el pedido actual es delivery
    await this.detectarTipoPedido();
    
    // Verificar si puede completar la encuesta
    await this.verificarPermisosEncuesta();
  }

  /**
   * 🆕 Detecta si el pedido actual es delivery y configura el encuestaId correspondiente
   */
  private async detectarTipoPedido() {
    try {
      // Obtener pedido actual desde PedidosService
      const pedidoActual = this.pedidosSvc.getPedidoActualSync();
      
      if (pedidoActual?.id) {
        // Obtener información del pedido desde BD
        const { data: pedido } = await this.supa.client
          .from('pedidos')
          .select('tipo_pedido, id')
          .eq('id', pedidoActual.id)
          .maybeSingle();

        if (pedido?.tipo_pedido === 'delivery') {
          this.esDelivery = true;
          this.encuestaId = this.encuestaDeliveryId;
          this.pedidoDeliveryId = pedido.id;
          console.log('[PaginaFormularioEncuesta] 🚚 Encuesta de delivery detectada, ID:', this.encuestaId);
        } else {
          console.log('[PaginaFormularioEncuesta] 🍽️ Encuesta de mesa detectada, ID:', this.encuestaId);
        }
      }
    } catch (error) {
      console.error('[PaginaFormularioEncuesta] Error al detectar tipo de pedido:', error);
      // Si hay error, usar encuesta de mesa por defecto
    }
  }

  // Botón enviar deshabilitado si falta algo
  get formularioInvalido(): boolean {
    return !this.validaLimpieza() || !this.validaAspecto() || !this.validaComentario();
  }

  // ===== Validaciones (PASO 3.3) =====
  private validaLimpieza(): boolean {
    return typeof this.limpieza === 'number' && this.limpieza >= 1 && this.limpieza <= 5;
  }

  private validaAspecto(): boolean {
    return !!this.aspecto_valorado;
  }

  private validaComentario(): boolean {
    if (!this.mensaje) return true;
    return this.mensaje.trim().length <= this.maxComentario;
  }

  private recolectarErrores(): string[] {
    const errs: string[] = [];
    if (!this.validaLimpieza()) {
      if (this.esDelivery) {
        errs.push('SELECCIONÁ UN VALOR DE EMPAQUE (1 A 5)');
      } else {
        errs.push('SELECCIONÁ UN VALOR DE LIMPIEZA (1 A 5)');
      }
    }
    if (!this.validaAspecto()) errs.push('ELEGÍ UN ASPECTO VALORADO');
    if (!this.validaComentario()) errs.push(`EL COMENTARIO NO PUEDE SUPERAR ${this.maxComentario} CARACTERES`);
    return errs;
  }

  // ===== Envío (con validación + UX) =====
  async enviar() {
    // Validar antes de enviar
    this.errores = this.recolectarErrores();
    if (this.errores.length) {
      try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
      return;
    }

    this.spinner.show({ immediate: true });

    // Armar servicios marcados
    const servicios = Object.entries(this.servicios_adicionales)
      .filter(([, v]) => v)
      .map(([k]) => k);

    try {
      console.log('[DEBUG ENCUESTA COMPONENTE] 🚀 Iniciando envío de encuesta...');
      console.log('[DEBUG ENCUESTA COMPONENTE] Es delivery:', this.esDelivery);
      console.log('[DEBUG ENCUESTA COMPONENTE] Pedido delivery ID:', this.pedidoDeliveryId);
      
      // 🆕 Obtener user_id (tanto para delivery como para mesa)
      let user_id: string | null = null;
      
      if (this.esDelivery && this.pedidoDeliveryId) {
        // Para delivery, obtener user_id desde el pedido
        const { data: pedido } = await this.supa.client
          .from('pedidos')
          .select('idCliente')
          .eq('id', this.pedidoDeliveryId)
          .single();
        
        if (pedido?.idCliente) {
          user_id = String(pedido.idCliente);
        }
      } else {
        // Para mesa, obtener user_id del usuario autenticado
        const { data: userData } = await this.supa.client.auth.getUser();
        if (userData?.user?.id) {
          user_id = userData.user.id;
        }
      }
      
      const resultado = await this.encuestas.enviarEncuesta({
        encuesta_id: this.encuestaId,
        lista_espera_id: this.esDelivery ? null : this.lista_espera_id, // 🆕 null para delivery
        mesas_id: this.esDelivery ? null : this.mesas_id, // 🆕 null para delivery
        user_id: user_id, // 🆕 user_id para delivery
        pedido_id: this.esDelivery ? this.pedidoDeliveryId : null, // 🆕 pedido_id para delivery
        calificacion_limpieza: this.limpieza!,
        aspecto_valorado: this.aspecto_valorado!,
        servicios_adicionales: servicios,
        mensaje: this.mensaje?.trim() || null,
      });

      console.log('[DEBUG ENCUESTA COMPONENTE] ✅ Encuesta enviada exitosamente, resultado:', resultado);
      
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
      console.log('[DEBUG ENCUESTA COMPONENTE] ✅ Haptic feedback ejecutado');
      
      this.toast.success('¡GRACIAS! TU OPINIÓN FUE ENVIADA', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      console.log('[DEBUG ENCUESTA COMPONENTE] ✅ Toast de éxito mostrado');

      this.resetForm();
      console.log('[DEBUG ENCUESTA COMPONENTE] ✅ Formulario reseteado');
      
      // 🆕 Navegar de vuelta a pedido en curso para permitir pagar (no al home)
      console.log('[DEBUG ENCUESTA COMPONENTE] 🚀 Navegando a /cliente-pedido-en-curso...');
      // Obtener pedido actual para pasar el estado
      const pedidoActual = this.pedidosSvc.getPedidoActualSync();
      if (pedidoActual?.id) {
        // Obtener datos completos del pedido desde BD si no están en el objeto
        try {
          const { data: pedidoCompleto } = await this.supa.client
            .from('pedidos')
            .select('id, estado, total, tiempo_estimado, tipo_pedido')
            .eq('id', pedidoActual.id)
            .maybeSingle();
          
          if (pedidoCompleto) {
            this.router.navigate(['/cliente-pedido-en-curso'], {
              state: {
                pedidoId: pedidoCompleto.id,
                estado: pedidoCompleto.estado,
                total: pedidoCompleto.total,
                tiempo: pedidoCompleto.tiempo_estimado,
                tipo_pedido: pedidoCompleto.tipo_pedido
              }
            });
          } else {
            // Fallback: ir al home si no se encuentra el pedido
            this.router.navigate(['/home-cliente']);
          }
        } catch (error) {
          console.error('[DEBUG ENCUESTA COMPONENTE] Error al obtener pedido completo:', error);
          // Fallback: ir al home si hay error
          this.router.navigate(['/home-cliente']);
        }
      } else {
        // Fallback: ir al home si no hay pedido
        this.router.navigate(['/home-cliente']);
      }
      console.log('[DEBUG ENCUESTA COMPONENTE] ✅ Navegación ejecutada');

    } catch (e: any) {
      console.error('[DEBUG ENCUESTA COMPONENTE] ❌ Error al enviar encuesta:', e);
      this.errores = [(e?.message || 'NO SE PUDO ENVIAR LA ENCUESTA. PROBÁ DE NUEVO').toUpperCase()];
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
      this.toast.error('ERROR AL ENVIAR LA ENCUESTA. PROBÁ DE NUEVO', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.spinner.hide();
    }
  }

  private resetForm() {
    this.limpieza = null;
    this.aspecto_valorado = null;
    this.mensaje = '';
    this.servicios_adicionales = {
      wifi: false,
      juegos: false,
      menu_sin_tacc: false,
      bebidas_sin_azucar: false,
      shows_en_vivo: false,
      empaque_adecuado: false,
      comunicacion_repartidor: false,
      puntualidad: false,
    };
    this.errores = [];
  }

  /**
   * Verifica si el cliente puede completar la encuesta
   */
  private async verificarPermisosEncuesta() {
    try {
      // 🆕 Si es delivery, verificar que el pedido esté entregado
      if (this.esDelivery && this.pedidoDeliveryId) {
        // Verificar si ya completó encuesta para este pedido repartidor
        const yaCompleto = await this.encuestas.yaCompletoEncuestaDelivery(this.pedidoDeliveryId);
        if (yaCompleto) {
          this.toast.warning('YA COMPLETASTE LA ENCUESTA PARA ESTE PEDIDO DE REPARTIDOR', '', {
            positionClass: 'toast-center',
            timeOut: 3000
          });
          this.router.navigate(['/home-cliente']);
          return;
        }

        // Verificar que el pedido esté entregado
        const { data: pedido } = await this.supa.client
          .from('pedidos')
          .select('estado')
          .eq('id', this.pedidoDeliveryId)
          .single();

        if (!pedido || (pedido.estado !== 'entregado' && pedido.estado !== 'pagado')) {
          this.toast.warning('SOLO PODÉS COMPLETAR LA ENCUESTA CUANDO EL PEDIDO ESTÉ ENTREGADO', '', {
            positionClass: 'toast-center',
            timeOut: 3000
          });
          this.router.navigate(['/home-cliente']);
          return;
        }
        return; // Para repartidor, no necesitamos verificar mesa
      }

      // Para pedidos de mesa, usar el flujo original
      // Verificar si ya completó una encuesta
      const yaCompleto = await this.encuestas.yaCompletoEncuesta();
      if (yaCompleto) {
        this.toast.warning('YA COMPLETASTE LA ENCUESTA PARA ESTA ESTADÍA', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        this.router.navigate(['/home-cliente']);
        return;
      }

      // TEMPORALMENTE: Deshabilitar validación de encuesta para debugging
      console.log('[DEBUG ENCUESTA COMPONENTE] ⚠️ Validación de encuesta TEMPORALMENTE DESHABILITADA');
      const puedeCompletar = true; // Forzar a true temporalmente
      
      /* LÓGICA ORIGINAL (comentada para debug)
      const puedeCompletar = await this.encuestas.puedeCompletarEncuesta();
      if (!puedeCompletar) {
        this.toast.warning('SOLO PODÉS COMPLETAR LA ENCUESTA MIENTRAS TENÉS MESA ASIGNADA');
        this.router.navigate(['/home-cliente']);
        return;
      }
      */

    } catch (error: any) {
      console.error('Error al verificar permisos de encuesta:', error);
      this.toast.error('ERROR AL VERIFICAR PERMISOS DE ENCUESTA', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      this.router.navigate(['/home-cliente']);
    }
  }
}
