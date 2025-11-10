import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';

export type PedidoPendiente = {
  id: number;
  mesa_numero: number;
  cliente_email: string;
  created_at: string;
  total: number;
  tiempo_estimado: number;
  estado: string;
  cantidad_items: number;
};

@Injectable({ providedIn: 'root' })
export class MozoPedidosService {
  constructor(private supa: SupabaseService) {}

  /**
   * Obtiene todos los pedidos pendientes de confirmación
   */
  async getPedidosPendientes(): Promise<PedidoPendiente[]> {
    console.log('[MozoPedidosService] Obteniendo pedidos pendientes...');

    try {
      // 1. Obtener pedidos con estado 'pendiente' (excluir delivery)
      // NOTA: Solo incluir pedidos de mesa o sin tipo_pedido (compatibilidad con pedidos antiguos)
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id, idCliente, created_at, total, tiempo_estimado, estado, tipo_pedido')
        .eq('estado', 'pendiente')
        .or('tipo_pedido.is.null,tipo_pedido.eq.mesa') // Solo mesa o sin tipo (pedidos antiguos)
        .order('created_at', { ascending: true });

      if (pedidosError) throw pedidosError;
      if (!pedidos || pedidos.length === 0) {
        console.log('[MozoPedidosService] No hay pedidos pendientes');
        return [];
      }

      console.log(`[MozoPedidosService] ${pedidos.length} pedidos pendientes encontrados`);

      // 2. Obtener IDs de clientes únicos
      const clienteIds = [...new Set(pedidos.map(p => p.idCliente).filter(Boolean))];

      // 3. Obtener información de usuarios (para emails)
      const { data: usuarios } = await this.supa.client
        .from('usuarios')
        .select('auth_id, email')
        .in('auth_id', clienteIds);

      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.auth_id, u.email || 'Sin email'])
      );

      // 4. Obtener números de mesa desde lista_espera (ya tiene numero_mesa)
      const { data: mesas } = await this.supa.client
        .from('lista_espera')
        .select('usuario_id, numero_mesa')
        .in('usuario_id', clienteIds)
        .eq('estado', 'asignado');

      const numeroMesaMap = new Map<string, number>();
      (mesas || []).forEach(m => {
        if (m.usuario_id && m.numero_mesa != null) {
          numeroMesaMap.set(m.usuario_id, m.numero_mesa);
        }
      });

      // 5. Obtener cantidad de items por pedido
      const pedidoIds = pedidos.map(p => p.id);
      const { data: detalles } = await this.supa.client
        .from('pedidos_detalles')
        .select('idPedido, cantidad')
        .in('idPedido', pedidoIds);

      const cantidadesMap = new Map<number, number>();
      (detalles || []).forEach(d => {
        const current = cantidadesMap.get(d.idPedido) || 0;
        cantidadesMap.set(d.idPedido, current + (d.cantidad || 0));
      });

      // 6. Construir resultado
      const resultado: PedidoPendiente[] = pedidos.map(p => {
        return {
          id: p.id,
          mesa_numero: numeroMesaMap.get(p.idCliente) || 0,
          cliente_email: usuariosMap.get(p.idCliente) || 'Desconocido',
          created_at: p.created_at,
          total: p.total || 0,
          tiempo_estimado: p.tiempo_estimado || 0,
          estado: p.estado,
          cantidad_items: cantidadesMap.get(p.id) || 0,
        };
      });

      console.log('[MozoPedidosService] Pedidos procesados:', resultado);
      return resultado;

    } catch (error) {
      console.error('[MozoPedidosService] Error al obtener pedidos pendientes:', error);
      throw error;
    }
  }

  /**
   * Confirma un pedido pendiente (cambia estado a 'pedido en curso')
   */
  async confirmarPedido(pedidoId: number): Promise<void> {
    console.log(`[MozoPedidosService] Confirmando pedido ${pedidoId}...`);

    const { error } = await this.supa.client
      .from('pedidos')
      .update({ 
        estado: 'pedido en curso',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId);

    if (error) {
      console.error('[MozoPedidosService] Error al confirmar pedido:', error);
      throw error;
    }

    // 🔔 Las notificaciones push se manejan via RealtimeService (como maitre-cliente)
    console.log(`[MozoPedidosService] ✅ Pedido ${pedidoId} confirmado - Las notificaciones push se manejan via RealtimeService`);

    console.log(`[MozoPedidosService] ✅ Pedido ${pedidoId} confirmado exitosamente`);
  }

  /**
   * Marca un pedido como entregado (cambia estado a 'pendiente aceptación')
   */
  async entregarPedido(pedidoId: number): Promise<void> {
    console.log(`[MozoPedidosService] Entregando pedido ${pedidoId}...`);

    const { error } = await this.supa.client
      .from('pedidos')
      .update({ 
        estado: 'pendiente aceptación',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId);

    if (error) {
      console.error('[MozoPedidosService] Error al entregar pedido:', error);
      throw error;
    }

    console.log(`[MozoPedidosService] ✅ Pedido ${pedidoId} entregado exitosamente`);
  }

  /**
   * Obtiene todos los pedidos activos desde 'pedido en curso' hasta que el cliente pague
   * Incluye: pedido en curso, en preparación parcial, listo para entregar, 
   *          pendiente aceptación, entregado, rechazado
   */
  async getPedidosEnCurso(): Promise<PedidoPendiente[]> {
    console.log('[MozoPedidosService] Obteniendo pedidos en curso...');

    try {
      // 1. Obtener pedidos desde 'pedido en curso' hasta que el mozo confirme el pago (incluir 'pagado')
      // NOTA: Excluir pedidos delivery (solo mesa o sin tipo_pedido)
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id, idCliente, created_at, total, tiempo_estimado, estado, tipo_pedido')
        .in('estado', [
          'pedido en curso', 
          'en preparación parcial', 
          'listo para entregar',
          'pendiente aceptación',
          'entregado',
          'rechazado',
          'rechazado por mozo',
          'pendiente confirmacion pago'  // 🆕 Incluir pedidos que esperan confirmación de pago del mozo
        ])
        .or('tipo_pedido.is.null,tipo_pedido.eq.mesa') // Solo mesa o sin tipo (pedidos antiguos)
        .order('created_at', { ascending: true });

      if (pedidosError) throw pedidosError;
      if (!pedidos || pedidos.length === 0) {
        console.log('[MozoPedidosService] No hay pedidos en curso');
        return [];
      }

      console.log(`[MozoPedidosService] ${pedidos.length} pedidos en curso encontrados`);

      // 2. Obtener IDs de clientes únicos
      const clienteIds = [...new Set(pedidos.map(p => p.idCliente).filter(Boolean))];

      // 3. Obtener información de usuarios (para emails)
      const { data: usuarios } = await this.supa.client
        .from('usuarios')
        .select('auth_id, email')
        .in('auth_id', clienteIds);

      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.auth_id, u.email || 'Sin email'])
      );

      // 4. Obtener números de mesa desde lista_espera (ya tiene numero_mesa)
      const { data: mesas } = await this.supa.client
        .from('lista_espera')
        .select('usuario_id, numero_mesa')
        .in('usuario_id', clienteIds)
        .eq('estado', 'asignado');

      const numeroMesaMap = new Map<string, number>();
      (mesas || []).forEach(m => {
        if (m.usuario_id && m.numero_mesa != null) {
          numeroMesaMap.set(m.usuario_id, m.numero_mesa);
        }
      });

      // 5. Obtener cantidad de items por pedido
      const pedidoIds = pedidos.map(p => p.id);
      const { data: detalles } = await this.supa.client
        .from('pedidos_detalles')
        .select('idPedido, cantidad')
        .in('idPedido', pedidoIds);

      const cantidadesMap = new Map<number, number>();
      (detalles || []).forEach(d => {
        const current = cantidadesMap.get(d.idPedido) || 0;
        cantidadesMap.set(d.idPedido, current + (d.cantidad || 0));
      });

      // 6. Filtrar pedidos según su estado
      const pedidosFiltrados: any[] = [];
      
      for (const pedido of pedidos) {
        if (pedido.estado === 'pedido en curso') {
          // Pedidos en curso siempre se muestran
          pedidosFiltrados.push(pedido);
        } else if (pedido.estado === 'en preparación parcial') {
          // Pedidos en preparación parcial siempre se muestran (están siendo procesados)
          pedidosFiltrados.push(pedido);
        } else if (pedido.estado === 'listo para entregar') {
          // Solo mostrar si TODOS los sectores están listos
          const todosLosSectoresListos = await this.verificarTodosLosSectoresListos(pedido.id);
          if (todosLosSectoresListos) {
            pedidosFiltrados.push(pedido);
          }
        } else if (pedido.estado === 'pendiente aceptación') {
          // Pedidos entregados al cliente, esperando aceptación
          pedidosFiltrados.push(pedido);
        } else if (pedido.estado === 'entregado') {
          // Pedidos aceptados por el cliente, esperando pago
          pedidosFiltrados.push(pedido);
        } else if (pedido.estado === 'rechazado') {
          // Pedidos rechazados por el cliente
          pedidosFiltrados.push(pedido);
        } else if (pedido.estado === 'rechazado por mozo') {
          // Pedidos rechazados por el mozo (esperando modificación del cliente)
          pedidosFiltrados.push(pedido);
        } else if (pedido.estado === 'pendiente confirmacion pago') {
          // Pedidos pagados por el cliente, esperando confirmación del mozo
          pedidosFiltrados.push(pedido);
        }
      }

      // 7. Construir resultado
      const resultado: PedidoPendiente[] = pedidosFiltrados.map(p => {
        return {
          id: p.id,
          mesa_numero: numeroMesaMap.get(p.idCliente) || 0,
          cliente_email: usuariosMap.get(p.idCliente) || 'Desconocido',
          created_at: p.created_at,
          total: p.total || 0,
          tiempo_estimado: p.tiempo_estimado || 0,
          estado: p.estado,
          cantidad_items: cantidadesMap.get(p.id) || 0,
        };
      });

      console.log('[MozoPedidosService] Pedidos en curso procesados:', resultado);
      return resultado;

    } catch (error) {
      console.error('[MozoPedidosService] Error al obtener pedidos en curso:', error);
      throw error;
    }
  }

  /**
   * Observable que escucha cambios en pedidos pendientes en tiempo real
   */
  pedidosPendientes$(): Observable<PedidoPendiente[]> {
    const subject = new BehaviorSubject<PedidoPendiente[]>([]);

    // Carga inicial
    this.getPedidosPendientes().then(pedidos => subject.next(pedidos));

    // Suscripción a cambios en tiempo real
    const channel = this.supa.client
      .channel('mozo-pedidos-pendientes-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pedidos'
      }, async (payload) => {
        const pedido: any = payload.new || {};
        console.log('[MozoPedidosService] INSERT detectado en pedidos:', pedido);
        
        // Solo recargar si es un pedido pendiente de MESA (no delivery)
        if (pedido.estado === 'pendiente' && (pedido.tipo_pedido === 'mesa' || !pedido.tipo_pedido)) {
          console.log('[MozoPedidosService] Recargando lista por nuevo pedido pendiente de mesa');
          const pedidos = await this.getPedidosPendientes();
          subject.next(pedidos);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos'
      }, async (payload) => {
        const pedido: any = payload.new || {};
        const oldPedido: any = payload.old || {};
        
        console.log('[MozoPedidosService] UPDATE detectado en pedidos:', { old: oldPedido.estado, new: pedido.estado });
        
        // Si cambió de pendiente a 'pedido en curso', recargar lista (solo si es de mesa)
        if (oldPedido.estado === 'pendiente' && pedido.estado === 'pedido en curso') {
          // Solo procesar si es pedido de mesa (no delivery)
          if (pedido.tipo_pedido === 'mesa' || !pedido.tipo_pedido) {
            console.log('[MozoPedidosService] Pedido de mesa confirmado, recargando lista');
            const pedidos = await this.getPedidosPendientes();
            subject.next(pedidos);
          }
        }
      })
      .subscribe((status) => {
        console.log('[MozoPedidosService] Canal suscrito con estado:', status);
      });

    return new Observable<PedidoPendiente[]>(observer => {
      const sub = subject.subscribe(observer);
      return () => {
        sub.unsubscribe();
        this.supa.client.removeChannel(channel);
      };
    });
  }

  /**
   * Observable que escucha cambios en pedidos en curso en tiempo real
   */
  pedidosEnCurso$(): Observable<PedidoPendiente[]> {
    const subject = new BehaviorSubject<PedidoPendiente[]>([]);

    // Carga inicial
    this.getPedidosEnCurso().then(pedidos => subject.next(pedidos));

    // Suscripción a cambios en tiempo real
    const channel = this.supa.client
      .channel('mozo-pedidos-en-curso-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos'
      }, async (payload) => {
        const pedido: any = payload.new || {};
        const oldPedido: any = payload.old || {};
        
        console.log('[MozoPedidosService] UPDATE detectado en pedidos en curso:', { old: oldPedido.estado, new: pedido.estado });
        
        // Recargar lista para cualquier cambio de estado en pedidos activos
        const estadosActivos = [
          'pedido en curso',
          'en preparación parcial', 
          'listo para entregar',
          'pendiente aceptación',
          'entregado',
          'rechazado',
          'rechazado por mozo'
        ];
        
        if (estadosActivos.includes(pedido.estado) || estadosActivos.includes(oldPedido.estado)) {
          console.log(`[MozoPedidosService] Estado de pedido cambiado: ${oldPedido.estado} → ${pedido.estado}, recargando lista`);
          const pedidos = await this.getPedidosEnCurso();
          subject.next(pedidos);
        }
      })
      .subscribe((status) => {
        console.log('[MozoPedidosService] Canal pedidos en curso suscrito con estado:', status);
      });

    return new Observable<PedidoPendiente[]>(observer => {
      const sub = subject.subscribe(observer);
      return () => {
        sub.unsubscribe();
        this.supa.client.removeChannel(channel);
      };
    });
  }

  /**
   * Verifica que todos los sectores del pedido estén listos para entregar
   */
  private async verificarTodosLosSectoresListos(pedidoId: number): Promise<boolean> {
    try {
      // Obtener los detalles del pedido para ver qué sectores están involucrados
      const { data: detalles, error: detallesError } = await this.supa.client
        .from('pedidos_detalles')
        .select(`
          menu!inner (
            tipo
          )
        `)
        .eq('idPedido', pedidoId);

      if (detallesError) {
        console.error('[MozoPedidosService] Error al obtener detalles del pedido:', detallesError);
        return false;
      }

      // Determinar qué sectores están involucrados
      const tipos = detalles?.map(d => (d as any).menu?.tipo).filter(tipo => tipo) || [];
      const tienePlatos = tipos.includes('plato');
      const tieneBebidas = tipos.includes('bebida');

      console.log('[MozoPedidosService] Sectores involucrados:', { tienePlatos, tieneBebidas });

      // Obtener el estado actual del pedido
      const { data: pedido, error: pedidoError } = await this.supa.client
        .from('pedidos')
        .select('estado, estado_sector_cocina, estado_sector_bar')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) {
        console.error('[MozoPedidosService] Error al obtener estado del pedido:', pedidoError);
        return false;
      }

      // Verificar que todos los sectores involucrados estén listos
      let todosListos = true;

      if (tienePlatos) {
        const cocinaLista = pedido.estado_sector_cocina === 'listo para entregar';
        console.log('[MozoPedidosService] Cocina lista:', cocinaLista);
        todosListos = todosListos && cocinaLista;
      }

      if (tieneBebidas) {
        const barListo = pedido.estado_sector_bar === 'listo para entregar';
        console.log('[MozoPedidosService] Bar listo:', barListo);
        todosListos = todosListos && barListo;
      }

      console.log('[MozoPedidosService] Todos los sectores listos:', todosListos);
      return todosListos;

    } catch (error) {
      console.error('[MozoPedidosService] Error en verificarTodosLosSectoresListos:', error);
      return false;
    }
  }
}

