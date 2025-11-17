import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MesasService, MesaRow } from './mesas.service';

/**
 * Servicio Singleton que maneja el estado de las mesas en memoria
 * Evita problemas de LockManager al centralizar todas las operaciones
 */
@Injectable({ providedIn: 'root' })
export class MesasStateService {
  private mesasSubject = new BehaviorSubject<MesaRow[]>([]);
  public mesas$: Observable<MesaRow[]> = this.mesasSubject.asObservable();
  
  private sincronizando = false;
  private sincronizacionPendiente = false;

  constructor(private mesasSrv: MesasService) {}

  /**
   * Obtener el estado actual de las mesas (síncrono)
   */
  getMesas(): MesaRow[] {
    return this.mesasSubject.value;
  }

  /**
   * Cargar mesas desde Supabase (primera carga o pull-to-refresh)
   */
  async cargarMesas(): Promise<MesaRow[]> {
    try {
      console.log('[mesas-state] Cargando mesas desde Supabase...');
      const mesas = await this.mesasSrv.listarMesas();
      this.mesasSubject.next([...mesas]);
      console.log('[mesas-state] Mesas cargadas:', mesas.length);
      return mesas;
    } catch (error: any) {
      console.error('[mesas-state] Error al cargar mesas:', error);
      throw error;
    }
  }

  /**
   * Agregar mesa de forma optimista (inmediata)
   */
  agregarMesaOptimista(mesa: MesaRow): void {
    const mesasActuales = this.mesasSubject.value;
    // Verificar que no exista ya
    if (mesasActuales.some(m => m.id === mesa.id)) {
      console.log('[mesas-state] Mesa ya existe en estado local, actualizando...');
      const mesasActualizadas = mesasActuales.map(m => m.id === mesa.id ? mesa : m);
      this.mesasSubject.next([...mesasActualizadas]);
    } else {
      // Agregar al inicio del array
      this.mesasSubject.next([mesa, ...mesasActuales]);
      console.log('[mesas-state] Mesa agregada optimistamente. Total:', this.mesasSubject.value.length);
    }
  }

  /**
   * Eliminar mesa de forma optimista (inmediata)
   */
  eliminarMesaOptimista(mesaId: string): void {
    const mesasActuales = this.mesasSubject.value;
    const mesasFiltradas = mesasActuales.filter(m => m.id !== mesaId);
    this.mesasSubject.next([...mesasFiltradas]);
    console.log('[mesas-state] Mesa eliminada optimistamente. Total:', mesasFiltradas.length);
  }

  /**
   * Actualizar mesa de forma optimista
   */
  actualizarMesaOptimista(mesa: MesaRow): void {
    const mesasActuales = this.mesasSubject.value;
    const mesasActualizadas = mesasActuales.map(m => m.id === mesa.id ? mesa : m);
    this.mesasSubject.next([...mesasActualizadas]);
    console.log('[mesas-state] Mesa actualizada optimistamente');
  }

  /**
   * Sincronizar con Supabase en background (con retry y backoff)
   * No bloquea la UI, se ejecuta de forma asíncrona
   */
  sincronizarEnBackground(): void {
    // Si ya hay una sincronización en curso, marcar como pendiente
    if (this.sincronizando) {
      console.log('[mesas-state] Sincronización ya en curso, marcando como pendiente...');
      this.sincronizacionPendiente = true;
      return;
    }

    // Ejecutar sincronización en background (sin await, no bloquea)
    this.ejecutarSincronizacion().catch(err => {
      console.error('[mesas-state] Error en sincronización background:', err);
      // Mantener estado optimista aunque falle
    });
  }

  /**
   * Ejecutar sincronización con retry y backoff exponencial
   */
  private async ejecutarSincronizacion(): Promise<void> {
    this.sincronizando = true;
    
    try {
      // Esperar un poco para que Supabase complete las operaciones
      await this.delay(2000);
      
      // Intentar sincronizar con retry (3 intentos)
      const maxRetries = 3;
      let lastError: any = null;
      
      for (let intento = 1; intento <= maxRetries; intento++) {
        try {
          console.log(`[mesas-state] Sincronizando con Supabase... Intento ${intento}/${maxRetries}`);
          const mesas = await this.mesasSrv.listarMesas();
          
          // Actualizar estado con datos reales de Supabase
          this.mesasSubject.next([...mesas]);
          console.log('[mesas-state] Sincronización exitosa. Mesas:', mesas.length);
          
          // Si hay sincronización pendiente, ejecutarla
          if (this.sincronizacionPendiente) {
            this.sincronizacionPendiente = false;
            // Ejecutar otra sincronización después de un delay
            setTimeout(() => this.sincronizarEnBackground(), 1000);
          }
          
          return; // Éxito, salir
        } catch (error: any) {
          lastError = error;
          const errorMsg = (error?.message || String(error) || '').toLowerCase();
          
          // Si es error de LockManager y no es el último intento, reintentar
          if ((errorMsg.includes('lockmanager') || errorMsg.includes('lock')) && intento < maxRetries) {
            const delayMs = 1000 * intento; // Backoff: 1s, 2s, 3s
            console.warn(`[mesas-state] Error de LockManager, reintentando en ${delayMs}ms...`);
            await this.delay(delayMs);
            continue;
          }
          
          // Si no es LockManager o es el último intento, lanzar error
          throw error;
        }
      }
      
      // Si llegamos aquí, todos los intentos fallaron
      throw lastError || new Error('Error desconocido en sincronización');
      
    } catch (error: any) {
      console.error('[mesas-state] Error en sincronización después de todos los intentos:', error);
      // Mantener estado optimista aunque falle la sincronización
      // El usuario ya ve los cambios, así que no es crítico
    } finally {
      this.sincronizando = false;
    }
  }

  /**
   * Helper para delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resetear estado (útil para testing o logout)
   */
  reset(): void {
    this.mesasSubject.next([]);
    this.sincronizando = false;
    this.sincronizacionPendiente = false;
  }
}

