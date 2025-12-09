// import { CommonModule } from '@angular/common';
// import { Component, OnDestroy } from '@angular/core';
// import { IonicModule, ToastController } from '@ionic/angular';
// import { RouterModule } from '@angular/router';

// type Q = { q: string; options: string[]; correct: number };

// @Component({
//   standalone: true,
//   selector: 'app-trivia',
//   templateUrl: './trivia.component.html',
//   styleUrls: ['./trivia.component.scss'],
//   imports: [CommonModule, IonicModule, RouterModule]
// })
// export class TriviaComponent implements OnDestroy {
//   idx = 0;
//   score = 0;
//   finished = false;
//   answering = false;

//   questions: Q[] = [
//     { q: '¿Cuál es la capital de Francia?', options: ['Madrid', 'París', 'Roma', 'Berlín'], correct: 1 },
//     { q: '2 + 2 = ?', options: ['3', '4', '5', '22'], correct: 1 },
//     { q: '¿Cuál es un lenguaje de programación?', options: ['CSS', 'Linux', 'Angular', 'Figma'], correct: 2 },
//     { q: '¿Qué planeta es el “rojo”?', options: ['Venus', 'Marte', 'Júpiter', 'Saturno'], correct: 1 },
//     { q: '¿Cuántos minutos tiene una hora?', options: ['30', '45', '60', '90'], correct: 2 },
//   ];

//   constructor(private toast: ToastController) {}

//   ngOnDestroy() {}

//   select(i: number) {
//     if (this.answering || this.finished) return;
//     this.answering = true;
//     if (i === this.questions[this.idx].correct) this.score++;
//     setTimeout(() => {
//       this.idx++;
//       this.answering = false;
//       if (this.idx >= this.questions.length) this.finished = true;
//     }, 350);
//   }

//   get discount(): number {
//     if (this.score >= 5) return 20;
//     if (this.score === 4) return 15;
//     if (this.score >= 3) return 10;
//     return 0;
//   }

//   async claim() {
//     const t = await this.toast.create({
//       message: this.discount ? `¡Descuento del ${this.discount}% listo para aplicar!` : 'No alcanzaste descuento… ¡probá de nuevo!',
//       duration: 1800, color: this.discount ? 'success' : 'medium', position: 'top'
//     });
//     t.present();
//   }

//   restart() {
//     this.idx = 0; this.score = 0; this.finished = false; this.answering = false;
//   }
// }
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { NgZone } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';
type Q = { q: string; options: string[]; correct: number };

@Component({
  standalone: true,
  selector: 'app-trivia',
  templateUrl: './trivia.component.html',
  styleUrls: ['./trivia.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class TriviaComponent implements OnInit, OnDestroy {
  // Juego
  idx = 0;
  score = 0;
  finished = false;
  answering = false;

  // Premio/estado
  pedidoId!: number;
  prizeClaimed = false;
  claiming = false;
  yaSeAplicoDescuento = false; // Nueva propiedad para rastrear si ya se aplicó descuento

  // Supabase
  private supabase = this.supabaseSvc.client;

  questions: Q[] = [
    { q: '¿Cuál es la capital de Francia?', options: ['Madrid', 'París', 'Roma', 'Berlín'], correct: 1 },
    { q: '2 + 2 = ?', options: ['3', '4', '5', '22'], correct: 1 },
    { q: '¿Cuál es un lenguaje de programación?', options: ['CSS', 'Linux', 'Angular', 'Figma'], correct: 2 },
    { q: '¿Qué planeta es el “rojo”?', options: ['Venus', 'Marte', 'Júpiter', 'Saturno'], correct: 1 },
    { q: '¿Cuántos minutos tiene una hora?', options: ['30', '45', '60', '90'], correct: 2 },
  ];

  constructor(
    private toast: ToastController,
    private router: Router,
    private supabaseSvc: SupabaseService,
    private spinner: SpinnerService,
    private zone: NgZone,
  ) {}


async ngOnInit() {
  // 0) asegurar sesión y loguear
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

  const { data: { user } } = await this.supabase.auth.getUser();
  console.log('[Trivia] auth user id:', user?.id);

  // 1) pedidoId (como ya lo tenías)
  const nav = this.router.getCurrentNavigation();
  this.pedidoId = nav?.extras?.state?.['pedidoId'] ?? (history.state?.pedidoId as number);

  // 2) verificar si ya se aplicó descuento
  if (this.pedidoId) {
    try {
      this.yaSeAplicoDescuento = await this.supabaseSvc.yaSeAplicoDescuento(this.pedidoId);
      // También verificar el campo legacy por compatibilidad
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

  ngOnDestroy() {}

  select(i: number) {
    if (this.answering || this.finished) return;
    this.answering = true;
    if (i === this.questions[this.idx].correct) this.score++;
    setTimeout(() => {
      this.idx++;
      this.answering = false;
      if (this.idx >= this.questions.length) this.finished = true;
    }, 350);
  }

  get discount(): number {
    if (this.score >= 5) return 20;
    if (this.score === 4) return 15;
    if (this.score >= 3) return 10;
    return 0;
  }

//   async claim() {
//   if (!this.finished) return;
//   if (!this.pedidoId) {
//     (await this.toast.create({
//       message: 'No encuentro el pedido activo para aplicar el beneficio.',
//       duration: 2000, color: 'warning', position: 'top'
//     })).present();
//     return;
//   }
//   if (this.prizeClaimed) {
//     (await this.toast.create({
//       message: 'Ya reclamaste el beneficio para este pedido.',
//       duration: 1800, color: 'medium', position: 'top'
//     })).present();
//     return;
//   }

//   this.claiming = true;
//   try {
//     const { data, error } = await this.supabase.rpc('claim_game_reward', {
//       p_pedido_id: Number(this.pedidoId),
//       p_juego: 'trivia',
//       p_score: this.score
//     });
//     if (error) throw error;

//     const row = Array.isArray(data) ? data[0] : data;
//     const pct  = Number(row?.descuento_pct ?? 0);
//     const tot  = Number(row?.total_con_descuento ?? 0);

//     this.prizeClaimed = true;

//     // si llevás un store/servicio de pedido, propagá el nuevo total aquí
//     // this.pedidosSvc.patchPedido(this.pedidoId, { total: tot });

//     (await this.toast.create({
//       message: pct > 0
//         ? `¡Descuento del ${pct}% aplicado! Total ahora: $${tot}`
//         : `Gracias por jugar. Total: $${tot}`,
//       duration: 2200, color: pct > 0 ? 'success' : 'medium', position: 'top'
//     })).present();
//   } catch (e:any) {
//     (await this.toast.create({
//       message: e?.message ?? 'No se pudo reclamar el beneficio.',
//       duration: 2200, color: 'warning', position: 'top'
//     })).present();
//   } finally {
//     this.claiming = false;
//   }
// }

// private async showToast(msg: string, color: 'success'|'warning'|'medium' = 'success') {
//   const t = await this.toast.create({ message: msg, duration: 2200, position: 'top', color });
//   await t.present();
// }

// async claim() {
//   if (!this.finished || !this.pedidoId || this.claiming) return;

//   this.claiming = true;
//   try {
//     // RPC con timeout por si algo queda colgado en el móvil
//     const rpc = this.supabase.rpc('claim_game_reward', {
//       p_pedido_id: Number(this.pedidoId),
//       p_juego: 'trivia',
//       p_score: this.score
//     });

//     const timeout = new Promise<never>((_, rej) =>
//       setTimeout(() => rej(new Error('timeout')), 12000)
//     );

//     const { data, error } = await Promise.race([rpc, timeout]) as any;
//     if (error) throw error;

//     const row = Array.isArray(data) ? data[0] : data;
//     const pct = Number(row?.descuento_pct ?? 0);

//     if (pct > 0) {
//       // SOLO este toast, como pediste
//       await this.showToast(`¡Descuento del ${pct}% aplicado!`, 'success');
//       this.prizeClaimed = true;
//     } else {
//       // Si no hubo descuento, no mostramos nada (o cambiá el mensaje si querés)
//       await this.showToast('Sin descuento aplicado.', 'medium');
//     }
//   } catch (e) {
//     await this.showToast('No se pudo aplicar el descuento.', 'warning');
//   } finally {
//     // Asegura que el spinner se apague en móvil
//     this.zone.run(() => { this.claiming = false; });
//   }
// }

private async showToast(msg: string, color: 'success'|'warning'|'medium' = 'success') {
  try {
    // 1) cerrar teclado si estuviera abierto (evita que tape el toast)
    try {
      await Keyboard.hide();
      // quitar foco por las dudas
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    } catch {}

    // 2) si había un toast previo, descartarlo
    try { await this.toast.dismiss(); } catch {}

    // 3) crear y presentar SIEMPRE dentro de la zona
    return await this.zone.run(async () => {
      const t = await this.toast.create({
        message: msg,
        duration: 2200,
        position: 'top',
        color,
        cssClass: 'toast-safe-top'
      });
      await t.present();
      // esperar a que se cierre para evitar navegar/cambiar vista antes de que se vea
      await t.onDidDismiss();
    });
  } catch (e) {
    console.warn('[showToast]', e);
  }
}

// Tip extra: separá el apagado del spinner en un helper seguro
private endClaiming() {
  this.zone.run(() => { this.claiming = false; });
}

// async claim() {
//   if (!this.finished || this.claiming) return;

//   // rescatar pedidoId también desde history.state si viene de navigate()
//   if (!this.pedidoId) {
//     const fromState = (history.state?.pedidoId as number) || 0;
//     if (fromState) this.pedidoId = fromState;
//   }
//   if (!this.pedidoId) {
//     await this.showToast('No encuentro el pedido activo para aplicar el beneficio.', 'warning');
//     return;
//   }

//   this.claiming = true;
//   try {
//     // RPC con timeout defensivo
//     const rpc = this.supabase.rpc('claim_game_reward', {
//       p_pedido_id: Number(this.pedidoId),
//       p_juego: 'trivia',
//       p_score: this.score
//     });
//     const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000));
//     const { data, error } = await Promise.race([rpc, timeout]) as any;
//     if (error) throw error;

//     const row = Array.isArray(data) ? data[0] : data;
//     const pct = Number(row?.descuento_pct ?? 0);

//     if (pct > 0) {
//       this.prizeClaimed = true;
//       await this.showToast(`¡Descuento del ${pct}% aplicado!`, 'success');
//       // Navegar **después** de que el toast se cerró
//       this.zone.run(() => {
//         this.router.navigate(['/cliente-pedido-en-curso'], { state: { pedidoId: this.pedidoId } });
//       });
//     } else {
//       await this.showToast('Sin descuento aplicado.', 'medium');
//     }
//   } catch (e:any) {
//     await this.showToast(e?.message === 'timeout' ? 'Tiempo de espera agotado.' : 'No se pudo aplicar el descuento.', 'warning');
//   } finally {
//     this.endClaiming();
//   }
// }
  async claim() {
    console.log('🚫🚫🚫🚫DESCUENTOS🚫🚫🚫🚫');
    console.log('[DEBUG TRIVIA] === INICIANDO RECLAMO DE DESCUENTO ===');
    console.log('[DEBUG TRIVIA] finished:', this.finished);
    console.log('[DEBUG TRIVIA] claiming:', this.claiming);
    console.log('[DEBUG TRIVIA] yaSeAplicoDescuento:', this.yaSeAplicoDescuento);
    console.log('[DEBUG TRIVIA] prizeClaimed:', this.prizeClaimed);
    console.log('[DEBUG TRIVIA] discount:', this.discount);
  
    // 🆕 Validación completa: verificar todas las condiciones antes de reclamar
    if (!this.finished || this.claiming || this.yaSeAplicoDescuento || this.prizeClaimed || !this.discount) {
      console.log('[DEBUG TRIVIA] ❌ Reclamo bloqueado por condiciones:', {
        finished: this.finished,
        claiming: this.claiming,
        yaSeAplicoDescuento: this.yaSeAplicoDescuento,
        prizeClaimed: this.prizeClaimed,
        discount: this.discount
      });
      // Asegurar que el spinner se oculte incluso si hay validación fallida
      try {
        this.spinner.hide(true); // force = true para ocultar inmediatamente
      } catch (e) {
        console.error('[DEBUG TRIVIA] Error al ocultar spinner en validación:', e);
      }
      this.claiming = false;
      return;
    }

    // rescatar pedidoId por si vino en history.state
    if (!this.pedidoId) {
      const fromState = (history.state?.pedidoId as number) || 0;
      if (fromState) this.pedidoId = fromState;
      console.log('[DEBUG TRIVIA] PedidoId rescatado de history.state:', this.pedidoId);
    }
    
    if (!this.pedidoId) {
      console.log('[DEBUG TRIVIA] ❌ No hay pedidoId');
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

    // 🆕 VERIFICACIÓN DE ESTADO: El pedido debe estar en "pedido en curso" o posterior
    try {
      const { data: pedidoData, error: pedidoError } = await this.supabase
        .from('pedidos')
        .select('estado, tipo_pedido')
        .eq('id', this.pedidoId)
        .maybeSingle();
      
      if (pedidoError) {
        console.error('[DEBUG TRIVIA] Error al verificar estado del pedido:', pedidoError);
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
        console.log('[DEBUG TRIVIA] ⚠️ Pedido no está en estado válido para reclamar descuento. Estado actual:', estado);
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
      
      console.log('[DEBUG TRIVIA] ✅ Estado del pedido válido:', estado);
    } catch (error) {
      console.error('[DEBUG TRIVIA] Error al verificar estado del pedido:', error);
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
        console.log('[DEBUG TRIVIA] ⚠️ Ya se aplicó un descuento desde otro juego o anteriormente');
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
      console.error('[DEBUG TRIVIA] Error al verificar descuento antes de reclamar:', error);
      // Continuar de todas formas, el RPC también validará
    }

    console.log('[DEBUG TRIVIA] Reclamando descuento de trivia...');
    console.log('[DEBUG TRIVIA] PedidoId:', this.pedidoId);
    console.log('[DEBUG TRIVIA] Score:', this.score);
    console.log('[DEBUG TRIVIA] Descuento esperado:', this.discount);

    this.claiming = true;
    this.spinner.show({ immediate: true });
    
    try {
      console.log('[DEBUG TRIVIA] Llamando RPC claim_game_discount...');
      const { data, error } = await this.supabase.rpc('claim_game_discount', {
        p_pedido_id: Number(this.pedidoId),
        p_juego: 'trivia',
        p_score: this.score
      });
      
      console.log('[DEBUG TRIVIA] Respuesta RPC completa:', { data, error });
      
      if (error) {
        console.log('[DEBUG TRIVIA] ❌ Error en RPC:', error);
        console.log('[DEBUG TRIVIA] Error code:', error.code);
        console.log('[DEBUG TRIVIA] Error message:', error.message);
        console.log('[DEBUG TRIVIA] Error details:', error.details);
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      console.log('[DEBUG TRIVIA] Row obtenida:', row);
      
      const pct = Number(row?.pct ?? 0);
      const tot = Number(row?.total_final ?? 0);
      const reason = row?.reason ?? '';

      console.log('[DEBUG TRIVIA] Descuento aplicado (%):', pct);
      console.log('[DEBUG TRIVIA] Total con descuento:', tot);

      // Actualizar estado local
      this.prizeClaimed = pct > 0;
      if (pct > 0) {
        this.yaSeAplicoDescuento = true;
        console.log('[DEBUG TRIVIA] ✅ Descuento aplicado exitosamente');
        const t = await this.toast.create({
          message: `¡DESCUENTO DEL ${pct}% APLICADO!`,
          duration: 2000,
          color: 'success',
          position: 'middle',
          cssClass: 'toast-center'
        });
        t.present();
      } else {
        console.log('[DEBUG TRIVIA] ⚠️ No se aplicó descuento (pct = 0)');
        const t = await this.toast.create({
          message: (reason || 'NO SE APLICÓ DESCUENTO').toUpperCase(),
          duration: 2000,
          color: 'medium',
          position: 'middle',
          cssClass: 'toast-center'
        });
        t.present();
      }

      // Esperar a que el toast se muestre antes de navegar
      console.log('[DEBUG TRIVIA] ⏳ Esperando a que el toast se muestre...');
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (e: any) {
      console.error('[DEBUG TRIVIA] ❌ ERROR CRÍTICO al reclamar descuento:', e);
      console.error('[DEBUG TRIVIA] ❌ Error completo:', JSON.stringify(e, null, 2));
      console.error('[DEBUG TRIVIA] ❌ Stack trace:', e?.stack);
      const t = await this.toast.create({
        message: 'ERROR AL APLICAR DESCUENTO: ' + (e?.message || 'ERROR DESCONOCIDO').toUpperCase(),
        duration: 3000,
        color: 'danger',
        position: 'middle',
        cssClass: 'toast-center'
      });
      await t.present();
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      console.log('[DEBUG TRIVIA] 🔄 Finalizando reclamo, redirigiendo...');
      this.claiming = false;
      this.spinner.hide();
      setTimeout(() => {
        this.zone.run(() => {
          this.router.navigate(['/cliente-pedido-en-curso'], { state: { pedidoId: this.pedidoId } });
        });
      }, 300);
    }
  }


  restart() {
    this.idx = 0; this.score = 0; this.finished = false; this.answering = false;
  }

  // Dentro de TriviaComponent
// async reclamarDescuento() {
//   if (!this.pedidoId || this.claiming || this.prizeClaimed) return;
//   this.claiming = true;
//   try {
//     const res = await this.supabaseSvc.claimGameDiscount(this.pedidoId, 'trivia', this.score);
//     if (res.applied) {
//       this.prizeClaimed = true;
//       // Mostrar feedback con el nuevo total
//       // this.toastr.success(`Descuento ${res.pct}% aplicado. Total ahora: $${res.total_final}`);
//       // si tenés un estado/servicio de pedido, refrescalo aquí:
//       // this.pedidosSvc.setPedidoActual({ id: this.pedidoId, total: res.total_final! });
//     } else {
//       // this.toastr.info(res.reason || 'No aplicado');
//     }
//   } catch (e:any) {
//     // this.toastr.error(e?.message || 'Error al reclamar');
//   } finally {
//     this.claiming = false;
//   }
// }
// async reclamarDescuento() {
//   if (!this.pedidoId || this.claiming || this.prizeClaimed) return;
//   this.claiming = true;
//   try {
//     const res = await this.supabaseSvc.claimGameDiscountTotalOnly(this.pedidoId, this.score);
//     if (res.applied) {
//       this.prizeClaimed = true;
//       (await this.toast.create({
//         message: `Total actualizado: $${res.total_final}`,
//         duration: 2000, color: 'success', position: 'top'
//       })).present();
//     } else {
//       (await this.toast.create({
//         message: 'Sin descuento aplicado.',
//         duration: 1600, color: 'medium', position: 'top'
//       })).present();
//     }
//   } finally {
//     this.claiming = false;
//   }
// }
async reclamarDescuento() {
  if (!this.pedidoId || this.claiming || this.prizeClaimed) return;

  this.claiming = true;
  try {
    const res = await this.supabaseSvc.claimGameDiscountTotalOnly(this.pedidoId, this.score);

    // actualizar estado local
    this.prizeClaimed = !!res.applied;

    // (opcional) actualizar total en tu store/servicio
    // this.pedidosSvc.setPedidoActual({ id: this.pedidoId, total: res.total_final });

  } catch {
    // sin alertas
  } finally {
    this.zone.run(() => {
      this.router.navigate(['/cliente-pedido-en-curso'], { state: { pedidoId: this.pedidoId } });
      this.claiming = false;
    });
  }
}



}
