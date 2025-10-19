import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
  IonTextarea, IonSelect, IonSelectOption, IonButton,
  IonSegment, IonSegmentButton, IonList, IonCheckbox,
  IonLoading, IonCard, IonCardContent
} from '@ionic/angular/standalone';
import { ToastrService } from 'ngx-toastr';
import { EncuestasService } from 'src/app/services/encuestas.service';

// PASO 3.3 — haptics para feedback en errores/éxitos
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-pagina-formulario-encuesta',
  standalone: true,
  templateUrl: './pagina-formulario-encuesta.html',
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption,
    IonButton, IonSegment, IonSegmentButton, IonList, IonCheckbox,
    IonLoading, IonCard, IonCardContent
  ]
})
export class PaginaFormularioEncuestaPage implements OnInit {

  // ID de la encuesta (ajustá si usás otra)
  encuestaId = '00000000-0000-0000-0000-000000000001';

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
  };
  mensaje: string = '';

  // PASO 3.3 — estado de validación/UX
  loading = false;
  errores: string[] = [];
  maxComentario = 300;

  constructor(
    private encuestas: EncuestasService,
    private toast: ToastrService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Verificar si puede completar la encuesta
    await this.verificarPermisosEncuesta();
  }

  // Botón enviar deshabilitado si falta algo o está guardando
  get formularioInvalido(): boolean {
    return this.loading || !this.validaLimpieza() || !this.validaAspecto() || !this.validaComentario();
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
    if (!this.validaLimpieza()) errs.push('Seleccioná un valor de limpieza (1 a 5).');
    if (!this.validaAspecto()) errs.push('Elegí un aspecto valorado.');
    if (!this.validaComentario()) errs.push(`El comentario no puede superar ${this.maxComentario} caracteres.`);
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

    // Armar servicios marcados
    const servicios = Object.entries(this.servicios_adicionales)
      .filter(([, v]) => v)
      .map(([k]) => k);

    this.loading = true;
    try {
      await this.encuestas.enviarEncuesta({
        encuesta_id: this.encuestaId,
        lista_espera_id: this.lista_espera_id,
        mesas_id: this.mesas_id,
        calificacion_limpieza: this.limpieza!,
        aspecto_valorado: this.aspecto_valorado!,
        servicios_adicionales: servicios,
        mensaje: this.mensaje?.trim() || null,
      });

      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
      this.toast.success('¡Gracias! Tu opinión fue enviada.', 'Encuesta');

      this.resetForm();
      
      // Redirigir de vuelta al home del cliente
      this.router.navigate(['/cliente-pedido-en-curso']);

    } catch (e: any) {
      console.error('[encuesta] enviar ERROR', e);
      this.errores = [e?.message || 'No se pudo enviar la encuesta. Probá de nuevo.'];
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}

    } finally {
      this.loading = false;
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
    };
    this.errores = [];
  }

  /**
   * Verifica si el cliente puede completar la encuesta
   */
  private async verificarPermisosEncuesta() {
    try {
      // Verificar si ya completó una encuesta
      const yaCompleto = await this.encuestas.yaCompletoEncuesta();
      if (yaCompleto) {
        this.toast.warning('Ya completaste la encuesta para esta estadía');
        this.router.navigate(['/home-cliente']);
        return;
      }

      // Verificar si puede completar encuesta (debe tener mesa asignada)
      const puedeCompletar = await this.encuestas.puedeCompletarEncuesta();
      if (!puedeCompletar) {
        this.toast.warning('Solo puedes completar la encuesta mientras tienes mesa asignada');
        this.router.navigate(['/home-cliente']);
        return;
      }

    } catch (error: any) {
      console.error('Error al verificar permisos de encuesta:', error);
      this.toast.error('Error al verificar permisos de encuesta');
      this.router.navigate(['/home-cliente']);
    }
  }
}
