import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { NgZone } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-tap',
  templateUrl: './tap.component.html',
  styleUrls: ['./tap.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class TapComponent implements OnInit, OnDestroy {
  @ViewChild('arena', { static: true }) arena!: ElementRef<HTMLDivElement>;
  started = false;
  timeLeft = 10;
  score = 0;
  private timer?: any;

  // 🆕 Propiedades para validar descuento
  pedidoId!: number;
  prizeClaimed = false;
  claiming = false;
  yaSeAplicoDescuento = false;
  private supabase = this.supabaseSvc.client;

  constructor(
    private toast: ToastController,
    private router: Router,
    private supabaseSvc: SupabaseService,
    private spinner: SpinnerService,
    private zone: NgZone
  ) {}

  async ngOnInit() {
    // Verificar sesión
    try {
      await this.supabaseSvc.ensureSessionOrThrow();
    } catch {
      const t = await this.toast.create({
        message: 'NECESITÁS INICIAR SESIÓN PARA JUGAR',
        duration: 2000, color: 'warning', position: 'middle', cssClass: 'toast-center'
      });
      t.present();
      return;
    }

    // Obtener pedidoId
    const nav = this.router.getCurrentNavigation();
    this.pedidoId = nav?.extras?.state?.['pedidoId'] ?? (history.state?.pedidoId as number);

    // Verificar si ya se aplicó descuento
    if (this.pedidoId) {
      try {
        this.yaSeAplicoDescuento = await this.supabaseSvc.yaSeAplicoDescuento(this.pedidoId);
        const { data } = await this.supabase
          .from('pedidos')
          .select('juego_premio_reclamado')
          .eq('id', this.pedidoId)
          .maybeSingle();
        this.prizeClaimed = !!data?.juego_premio_reclamado || this.yaSeAplicoDescuento;
      } catch (error) {
        console.error('Error al verificar descuento aplicado:', error);
        this.yaSeAplicoDescuento = false;
      }
    }
  }

  ngOnDestroy() { clearInterval(this.timer); }

  start() {
    this.started = true;
    this.timeLeft = 10; this.score = 0;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) this.end();
    }, 1000);
    this.moveTarget();
  }

  tap() {
    if (!this.started) return;
    this.score++;
    this.moveTarget();
  }

  end() {
    clearInterval(this.timer);
    this.started = false;
  }

  moveTarget() {
    const box = this.arena.nativeElement.getBoundingClientRect();
    const size = 64; // px target
    const x = Math.random() * (box.width - size);
    const y = Math.random() * (box.height - size);
    const el = this.arena.nativeElement.querySelector('.target') as HTMLDivElement;
    if (el) { el.style.transform = `translate(${x}px, ${y}px)`; }
  }

  get discount(): number {
    if (this.score >= 15) return 20;
    if (this.score >= 10) return 15;
    if (this.score >= 6) return 10;
    return 0;
  }


  async claim() {
    if (!this.finished || this.claiming || this.yaSeAplicoDescuento || this.prizeClaimed || !this.discount) {
      return;
    }

    if (!this.pedidoId) {
      const fromState = (history.state?.pedidoId as number) || 0;
      if (fromState) this.pedidoId = fromState;
      if (!this.pedidoId) {
        const t = await this.toast.create({
          message: 'NO SE PUDO OBTENER EL PEDIDO ACTIVO',
          duration: 2000,
          color: 'warning',
          position: 'middle',
          cssClass: 'toast-center'
        });
        t.present();
        return;
      }
    }

    // 🆕 VERIFICACIÓN DE ESTADO: El pedido debe estar en "pedido en curso" o posterior
    try {
      const { data: pedidoData, error: pedidoError } = await this.supabase
        .from('pedidos')
        .select('estado, tipo_pedido')
        .eq('id', this.pedidoId)
        .maybeSingle();
      
      if (pedidoError) {
        console.error('[TAP] Error al verificar estado del pedido:', pedidoError);
        throw pedidoError;
      }
      
      if (!pedidoData) {
        const t = await this.toast.create({
          message: 'NO SE ENCONTRÓ EL PEDIDO',
          duration: 2000,
          color: 'danger',
          position: 'middle',
          cssClass: 'toast-center'
        });
        t.present();
        return;
      }
      
      const estado = pedidoData.estado;
      const estadosValidos = [
        'pedido en curso',
        'en preparación',
        'en preparación parcial',
        'listo para entregar',
        'asignado a delivery',
        'confirmado por delivery',
        'en camino',
        'entregado',
        'pendiente confirmacion pago',
        'pagado'
      ];
      
      if (!estadosValidos.includes(estado)) {
        console.log('[TAP] ⚠️ Pedido no está en estado válido para reclamar descuento. Estado actual:', estado);
        const t = await this.toast.create({
          message: `EL PEDIDO DEBE ESTAR CONFIRMADO PARA RECLAMAR DESCUENTOS. ESTADO ACTUAL: ${estado.toUpperCase()}`,
          duration: 3000,
          color: 'warning',
          position: 'middle',
          cssClass: 'toast-center'
        });
        t.present();
        return;
      }
      
      console.log('[TAP] ✅ Estado del pedido válido:', estado);
    } catch (error) {
      console.error('[TAP] Error al verificar estado del pedido:', error);
      const t = await this.toast.create({
        message: 'ERROR AL VERIFICAR EL ESTADO DEL PEDIDO',
        duration: 2000,
        color: 'danger',
        position: 'middle',
        cssClass: 'toast-center'
      });
      t.present();
      return;
    }

    // 🆕 VERIFICACIÓN CRÍTICA: Verificar nuevamente si ya se aplicó descuento (puede haber cambiado desde ngOnInit)
    // Esto es importante porque el usuario puede haber reclamado desde otro juego
    try {
      const yaSeAplico = await this.supabaseSvc.yaSeAplicoDescuento(this.pedidoId);
      if (yaSeAplico) {
        console.log('[TAP] ⚠️ Ya se aplicó un descuento desde otro juego o anteriormente');
        this.yaSeAplicoDescuento = true;
        // Verificar también el campo legacy
        const { data } = await this.supabase
          .from('pedidos')
          .select('juego_premio_reclamado')
          .eq('id', this.pedidoId)
          .maybeSingle();
        this.prizeClaimed = !!data?.juego_premio_reclamado || yaSeAplico;
        
        const t = await this.toast.create({
          message: 'YA SE RECLAMÓ UN DESCUENTO PARA ESTE PEDIDO. PODÉS SEGUIR JUGANDO PERO NO SE APLICARÁ OTRO DESCUENTO',
          duration: 3000,
          color: 'warning',
          position: 'middle',
          cssClass: 'toast-center'
        });
        t.present();
        return;
      }
    } catch (error) {
      console.error('[TAP] Error al verificar descuento antes de reclamar:', error);
      // Continuar de todas formas, el RPC también validará
    }

    console.log('[TAP] 🎮 INICIANDO RECLAMO DE DESCUENTO');
    console.log('[TAP] 📋 Estado antes de reclamar:', {
      pedidoId: this.pedidoId,
      score: this.score,
      discount: this.discount,
      finished: this.finished,
      claiming: this.claiming,
      yaSeAplicoDescuento: this.yaSeAplicoDescuento,
      prizeClaimed: this.prizeClaimed
    });

    this.claiming = true;
    this.spinner.show({ immediate: true });
    try {
      console.log('[TAP] 📞 Llamando RPC claim_game_discount...');
      console.log('[TAP] 📤 Parámetros RPC:', {
        p_pedido_id: Number(this.pedidoId),
        p_juego: 'tap',
        p_score: this.score
      });

      const { data, error } = await this.supabase.rpc('claim_game_discount', {
        p_pedido_id: Number(this.pedidoId),
        p_juego: 'tap',
        p_score: this.score
      });

      console.log('[TAP] 📥 Respuesta RPC:', { data, error });

      if (error) {
        console.error('[TAP] ❌ Error en RPC:', error);
        console.error('[TAP] ❌ Error completo:', JSON.stringify(error, null, 2));
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      console.log('[TAP] 📊 Row obtenida:', row);
      
      const pct = Number(row?.pct ?? 0);
      const applied = row?.applied ?? false;
      const reason = row?.reason ?? '';

      console.log('[TAP] 📊 Resultado procesado:', {
        pct,
        applied,
        reason,
        total_final: row?.total_final
      });

      this.prizeClaimed = pct > 0;
      if (pct > 0) {
        this.yaSeAplicoDescuento = true;
        console.log('[TAP] ✅ Descuento aplicado exitosamente:', pct + '%');
        const t = await this.toast.create({
          message: `¡DESCUENTO DEL ${pct}% APLICADO!`,
          duration: 2000,
          color: 'success',
          position: 'middle',
          cssClass: 'toast-center'
        });
        t.present();
      } else {
        console.log('[TAP] ⚠️ No se aplicó descuento. Razón:', reason || 'No especificada');
        const t = await this.toast.create({
          message: (reason || 'NO SE APLICÓ DESCUENTO').toUpperCase(),
          duration: 2000,
          color: 'medium',
          position: 'middle',
          cssClass: 'toast-center'
        });
        t.present();
      }

    } catch (e: any) {
      console.error('[TAP] ❌ ERROR CRÍTICO al reclamar descuento:', e);
      console.error('[TAP] ❌ Error completo:', JSON.stringify(e, null, 2));
      console.error('[TAP] ❌ Stack trace:', e?.stack);
      const t = await this.toast.create({
        message: 'ERROR AL APLICAR DESCUENTO: ' + (e?.message || 'ERROR DESCONOCIDO').toUpperCase(),
        duration: 3000,
        color: 'danger',
        position: 'middle',
        cssClass: 'toast-center'
      });
      t.present();
    } finally {
      console.log('[TAP] 🔄 Finalizando reclamo, redirigiendo...');
      this.claiming = false;
      this.spinner.hide();
      this.zone.run(() => {
        this.router.navigate(['/cliente-pedido-en-curso'], { state: { pedidoId: this.pedidoId } });
      });
    }
  }

  get finished(): boolean {
    return !this.started && this.timeLeft === 0;
  }
}
