import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface EstadoDescuento {
  yaReclamado: boolean;
  descuentoPct: number;
  juegoPremioReclamado: boolean;
  descuentoFuente?: string;
  timestamp: number;
}

export interface CambioDescuento {
  pedidoId: number;
  yaReclamado: boolean;
}

@Injectable({ providedIn: 'root' })
export class DescuentosService {
  // Estado en memoria por pedidoId
  private descuentosPorPedido = new Map<number, EstadoDescuento>();

  // Rastrear el primer juego jugado por pedido
  private primerJuegoJugado = new Map<number, 'trivia' | 'tap' | 'memoria' | null>();

  // Rastrear si se completó la primera partida por pedido
  private primeraPartidaCompletada = new Map<number, boolean>();

  // BehaviorSubject para notificar cambios
  private descuentoCambio$ = new BehaviorSubject<CambioDescuento | null>(null);

  // Observable público
  descuentoCambioObservable$ = this.descuentoCambio$.asObservable();

  constructor(private supabase: SupabaseService) {
    console.log('[DescuentosService] ✅ Servicio inicializado');
  }

  /**
   * Registra que un juego fue jugado por primera vez
   * Retorna true si este es el primer juego, false si ya se jugó otro antes
   */
  registrarJuegoJugado(
    pedidoId: number,
    juego: 'trivia' | 'tap' | 'memoria'
  ): boolean {
    const primerJuego = this.primerJuegoJugado.get(pedidoId);

    // Si ya hay un primer juego registrado, este NO es el primero
    if (primerJuego !== null && primerJuego !== undefined) {
      console.log(
        `[DescuentosService] ⚠️ Ya se jugó otro juego antes (${primerJuego}), este (${juego}) NO es el primero`
      );
      return false; // Ya se jugó otro juego antes
    }

    // Este es el primer juego
    this.primerJuegoJugado.set(pedidoId, juego);
    console.log(
      `[DescuentosService] ✅ Registrado como primer juego: ${juego} para pedido ${pedidoId}`
    );
    return true; // Es el primer juego
  }

  /**
   * Verifica si es la primera partida de un juego
   */
  esPrimeraPartida(pedidoId: number): boolean {
    const completada = this.primeraPartidaCompletada.get(pedidoId);
    return !completada; // Es primera si no está marcada como completada
  }

  /**
   * Marca que se completó la primera partida
   */
  marcarPrimeraPartidaCompletada(pedidoId: number): void {
    this.primeraPartidaCompletada.set(pedidoId, true);
    console.log(
      `[DescuentosService] ✅ Primera partida marcada como completada para pedido ${pedidoId}`
    );
  }

  /**
   * Verifica si puede reclamar descuento según las reglas de Opción A:
   * - Debe ser el primer juego jugado
   * - Debe ser la primera partida
   * - No debe haber reclamado antes
   */
  puedeReclamarDescuento(
    pedidoId: number,
    juego: 'trivia' | 'tap' | 'memoria',
    esPrimeraPartida: boolean
  ): boolean {
    // 1. Verificar si ya se reclamó
    const estado = this.getEstadoDesdeMemoria(pedidoId);
    if (estado?.yaReclamado) {
      console.log(
        `[DescuentosService] ❌ Ya se reclamó descuento para pedido ${pedidoId}`
      );
      return false; // Ya se reclamó
    }

    // 2. Verificar si es el primer juego
    const primerJuego = this.primerJuegoJugado.get(pedidoId);
    if (primerJuego === null || primerJuego === undefined) {
      // Aún no se ha jugado ningún juego
      // Este será el primero si es la primera partida
      if (esPrimeraPartida) {
        console.log(
          `[DescuentosService] ✅ Puede reclamar: es el primer juego y primera partida`
        );
        return true;
      } else {
        console.log(
          `[DescuentosService] ❌ No puede reclamar: no es la primera partida`
        );
        return false;
      }
    }

    // 3. Verificar si este es el primer juego Y es la primera partida
    if (primerJuego === juego && esPrimeraPartida) {
      console.log(
        `[DescuentosService] ✅ Puede reclamar: es el primer juego (${primerJuego}) y primera partida`
      );
      return true; // Es el primer juego y primera partida
    }

    // 4. Si llegamos aquí, no cumple las condiciones
    if (primerJuego !== juego) {
      console.log(
        `[DescuentosService] ❌ No puede reclamar: el primer juego fue ${primerJuego}, este es ${juego}`
      );
    } else if (!esPrimeraPartida) {
      console.log(
        `[DescuentosService] ❌ No puede reclamar: ya no es la primera partida`
      );
    }

    return false; // No cumple las condiciones
  }

  /**
   * Verifica si ya se reclamó descuento (desde memoria)
   * Si no está en memoria, consulta BD UNA VEZ y guarda en memoria
   */
  async yaSeReclamoDescuento(pedidoId: number): Promise<boolean> {
    // 1. Verificar en memoria primero
    const enMemoria = this.descuentosPorPedido.get(pedidoId);
    if (enMemoria) {
      console.log(
        `[DescuentosService] ✅ Estado en memoria para pedido ${pedidoId}: yaReclamado=${enMemoria.yaReclamado}`
      );
      return enMemoria.yaReclamado;
    }

    // 2. Si no está en memoria, consultar BD UNA VEZ
    console.log(
      `[DescuentosService] 🔍 Consultando BD para pedido ${pedidoId}`
    );
    try {
      const { data, error } = await this.supabase.client
        .from('pedidos')
        .select('descuento_pct, juego_premio_reclamado, descuento_fuente')
        .eq('id', pedidoId)
        .single();

      if (error) {
        console.error('[DescuentosService] ❌ Error al consultar BD:', error);
        return false; // Por seguridad, asumir que no se reclamó
      }

      // 3. Guardar en memoria
      const yaReclamado =
        !!(data?.descuento_pct && data.descuento_pct > 0) ||
        !!data?.juego_premio_reclamado;

      this.descuentosPorPedido.set(pedidoId, {
        yaReclamado,
        descuentoPct: data?.descuento_pct || 0,
        juegoPremioReclamado: !!data?.juego_premio_reclamado,
        descuentoFuente: data?.descuento_fuente || undefined,
        timestamp: Date.now(),
      });

      console.log(
        `[DescuentosService] 💾 Estado guardado en memoria: yaReclamado=${yaReclamado}`
      );
      return yaReclamado;
    } catch (error) {
      console.error('[DescuentosService] ❌ Error:', error);
      return false;
    }
  }

  /**
   * Marca un descuento como reclamado (después de RPC exitoso)
   * Notifica a todos los componentes suscritos
   */
  marcarDescuentoReclamado(
    pedidoId: number,
    descuentoPct: number,
    descuentoFuente: string
  ): void {
    this.descuentosPorPedido.set(pedidoId, {
      yaReclamado: true,
      descuentoPct,
      juegoPremioReclamado: true,
      descuentoFuente,
      timestamp: Date.now(),
    });

    // Notificar a todos los componentes
    this.descuentoCambio$.next({
      pedidoId,
      yaReclamado: true,
    });

    console.log(
      `[DescuentosService] ✅ Descuento marcado como reclamado en memoria: ${descuentoPct}% desde ${descuentoFuente}`
    );
  }

  /**
   * Obtiene el estado desde memoria (sin consultar BD)
   * Retorna null si no está en memoria
   */
  getEstadoDesdeMemoria(pedidoId: number): EstadoDescuento | null {
    const estado = this.descuentosPorPedido.get(pedidoId);
    return estado || null;
  }

  /**
   * Obtiene el primer juego jugado para un pedido
   */
  getPrimerJuego(pedidoId: number): 'trivia' | 'tap' | 'memoria' | null {
    return this.primerJuegoJugado.get(pedidoId) || null;
  }

  /**
   * Limpia el estado de un pedido (útil cuando se cierra el pedido)
   */
  limpiarEstado(pedidoId: number): void {
    this.descuentosPorPedido.delete(pedidoId);
    this.primerJuegoJugado.delete(pedidoId);
    this.primeraPartidaCompletada.delete(pedidoId);
    console.log(
      `[DescuentosService] 🗑️ Estado limpiado para pedido ${pedidoId}`
    );
  }

  /**
   * Limpia todo el estado (útil en logout)
   */
  limpiarTodo(): void {
    this.descuentosPorPedido.clear();
    this.primerJuegoJugado.clear();
    this.primeraPartidaCompletada.clear();
    this.descuentoCambio$.next(null);
    console.log('[DescuentosService] 🗑️ Todo el estado limpiado');
  }
}

