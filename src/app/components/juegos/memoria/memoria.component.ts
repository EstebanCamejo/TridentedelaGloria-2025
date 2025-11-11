import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { NgZone } from '@angular/core';

type Card = { id: number; emoji: string; face: boolean; done: boolean };

function shuffle<T>(arr: T[]): T[] {
  return arr.map(v => [Math.random(), v] as const).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
}

@Component({
  standalone: true,
  selector: 'app-memoria',
  templateUrl: './memoria.component.html',
  styleUrls: ['./memoria.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class MemoriaComponent implements OnInit, OnDestroy {
  cards: Card[] = [];
  first?: Card;
  lock = false;
  moves = 0;
  finished = false;

  // 🆕 Propiedades para validar descuento
  pedidoId!: number;
  prizeClaimed = false;
  claiming = false;
  yaSeAplicoDescuento = false;
  private supabase = this.supabaseSvc.client;

  private symbols = ['🍕','🍔','🍟','🌭','🥤','🍩'];

  constructor(
    private toast: ToastController,
    private router: Router,
    private supabaseSvc: SupabaseService,
    private spinner: SpinnerService,
    private zone: NgZone
  ) { 
    this.reset();
  }

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

  ngOnDestroy() {}

  reset() {
    const deck = shuffle([...this.symbols, ...this.symbols]);
    let id = 1;
    this.cards = deck.map(e => ({ id: id++, emoji: e, face: false, done: false }));
    this.first = undefined; this.lock = false; this.moves = 0; this.finished = false;
  }

  flip(c: Card) {
    if (this.lock || c.done || c.face) return;
    c.face = true;

    if (!this.first) { this.first = c; return; }

    // 2da carta
    this.moves++;
    if (this.first.emoji === c.emoji) {
      this.first.done = true; c.done = true; this.first = undefined;
      if (this.cards.every(x => x.done)) this.finished = true;
    } else {
      this.lock = true;
      setTimeout(() => {
        c.face = false;
        if (this.first) this.first.face = false;
        this.first = undefined;
        this.lock = false;
      }, 700);
    }
  }

  get discount(): number {
    if (!this.finished) return 0;
    if (this.moves <= 12) return 20;
    if (this.moves <= 18) return 15;
    if (this.moves <= 24) return 10;
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
        console.error('[MEMORIA] Error al verificar estado del pedido:', pedidoError);
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
        console.log('[MEMORIA] ⚠️ Pedido no está en estado válido para reclamar descuento. Estado actual:', estado);
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
      
      console.log('[MEMORIA] ✅ Estado del pedido válido:', estado);
    } catch (error) {
      console.error('[MEMORIA] Error al verificar estado del pedido:', error);
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
        console.log('[MEMORIA] ⚠️ Ya se aplicó un descuento desde otro juego o anteriormente');
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
      console.error('[MEMORIA] Error al verificar descuento antes de reclamar:', error);
      // Continuar de todas formas, el RPC también validará
    }

    console.log('[MEMORIA] 🎮 INICIANDO RECLAMO DE DESCUENTO');
    console.log('[MEMORIA] 📋 Estado antes de reclamar:', {
      pedidoId: this.pedidoId,
      moves: this.moves,
      discount: this.discount,
      finished: this.finished,
      claiming: this.claiming,
      yaSeAplicoDescuento: this.yaSeAplicoDescuento,
      prizeClaimed: this.prizeClaimed
    });

    this.claiming = true;
    this.spinner.show({ immediate: true });
    try {
      console.log('[MEMORIA] 📞 Llamando RPC claim_game_discount...');
      console.log('[MEMORIA] 📤 Parámetros RPC:', {
        p_pedido_id: Number(this.pedidoId),
        p_juego: 'memoria',
        p_score: this.moves
      });

      const { data, error } = await this.supabase.rpc('claim_game_discount', {
        p_pedido_id: Number(this.pedidoId),
        p_juego: 'memoria',
        p_score: this.moves
      });

      console.log('[MEMORIA] 📥 Respuesta RPC:', { data, error });

      if (error) {
        console.error('[MEMORIA] ❌ Error en RPC:', error);
        console.error('[MEMORIA] ❌ Error completo:', JSON.stringify(error, null, 2));
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      console.log('[MEMORIA] 📊 Row obtenida:', row);
      
      const pct = Number(row?.pct ?? 0);
      const applied = row?.applied ?? false;
      const reason = row?.reason ?? '';

      console.log('[MEMORIA] 📊 Resultado procesado:', {
        pct,
        applied,
        reason,
        total_final: row?.total_final
      });

      this.prizeClaimed = pct > 0;
      
      if (pct > 0) {
        this.yaSeAplicoDescuento = true;
        console.log('[MEMORIA] ✅ Descuento aplicado exitosamente:', pct + '%');
        const t = await this.toast.create({
          message: `¡DESCUENTO DEL ${pct}% APLICADO!`,
          duration: 2500,
          color: 'success',
          position: 'middle',
          cssClass: 'toast-center'
        });
        await t.present();
      } else {
        console.log('[MEMORIA] ⚠️ No se aplicó descuento. Razón:', reason || 'No especificada');
        const t = await this.toast.create({
          message: (reason || 'NO SE APLICÓ DESCUENTO').toUpperCase(),
          duration: 2500,
          color: 'medium',
          position: 'middle',
          cssClass: 'toast-center'
        });
        await t.present();
      }

      // Esperar a que el toast se muestre antes de navegar
      console.log('[MEMORIA] ⏳ Esperando a que el toast se muestre...');
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (e: any) {
      console.error('[MEMORIA] ❌ ERROR CRÍTICO al reclamar descuento:', e);
      console.error('[MEMORIA] ❌ Error completo:', JSON.stringify(e, null, 2));
      console.error('[MEMORIA] ❌ Stack trace:', e?.stack);
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
      console.log('[MEMORIA] 🔄 Finalizando reclamo, redirigiendo...');
      this.claiming = false;
      this.spinner.hide();
      setTimeout(() => {
        this.zone.run(() => {
          this.router.navigate(['/cliente-pedido-en-curso'], { state: { pedidoId: this.pedidoId } });
        });
      }, 300);
    }
  }
}
