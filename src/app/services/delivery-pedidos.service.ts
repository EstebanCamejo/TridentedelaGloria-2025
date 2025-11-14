import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';

export type PedidoDeliveryAsignado = {
  id: number;
  cliente_email: string;
  created_at: string;
  total: number;
  tiempo_estimado: number;
  estado: string;
  cantidad_items: number;
  direccion_entrega?: string;
  latitud?: number;
  longitud?: number;
};

export type PedidoDeliveryEnCamino = {
  id: number;
  cliente_email: string;
  created_at: string;
  total: number;
  tiempo_estimado: number;
  estado: string;
  cantidad_items: number;
  direccion_entrega?: string;
  latitud?: number;
  longitud?: number;
};

@Injectable({ providedIn: 'root' })
export class DeliveryPedidosService {
  constructor(private supa: SupabaseService) {}

  /**
   * Obtiene el ID del usuario delivery actual
   */
  private getIdDeliveryActual(): string | null {
    return this.supa.idUsuario || null;
  }

  /**
   * Obtiene todos los pedidos asignados al delivery actual
   * NOTA: Similar a MozoPedidosService pero filtrando por idDelivery
   */
  async getPedidosAsignados(): Promise<PedidoDeliveryAsignado[]> {
    console.log('[DeliveryPedidosService] Obteniendo pedidos asignados...');

    const idDelivery = this.getIdDeliveryActual();
    if (!idDelivery) {
      console.warn('[DeliveryPedidosService] No hay usuario delivery logueado');
      return [];
    }

    try {
      // 1. Obtener pedidos con estado 'asignado a delivery' y idDelivery = usuario actual
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id, idCliente, created_at, total, tiempo_estimado, estado, direccion_entrega, latitud, longitud')
        .eq('estado', 'asignado a delivery')
        .eq('idDelivery', idDelivery)
        .eq('tipo_pedido', 'delivery')
        .order('created_at', { ascending: true });

      if (pedidosError) throw pedidosError;
      if (!pedidos || pedidos.length === 0) {
        console.log('[DeliveryPedidosService] No hay pedidos asignados');
        return [];
      }

      console.log(`[DeliveryPedidosService] ${pedidos.length} pedidos asignados encontrados`);

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

      // 4. Obtener cantidad de items por pedido
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

      // 5. Construir resultado
      const resultado: PedidoDeliveryAsignado[] = pedidos.map(p => {
        return {
          id: p.id,
          cliente_email: usuariosMap.get(p.idCliente) || 'Desconocido',
          created_at: p.created_at,
          total: p.total || 0,
          tiempo_estimado: p.tiempo_estimado || 0,
          estado: p.estado,
          cantidad_items: cantidadesMap.get(p.id) || 0,
          direccion_entrega: p.direccion_entrega || undefined,
          latitud: p.latitud || undefined,
          longitud: p.longitud || undefined,
        };
      });

      console.log('[DeliveryPedidosService] Pedidos asignados procesados:', resultado);
      return resultado;

    } catch (error) {
      console.error('[DeliveryPedidosService] Error al obtener pedidos asignados:', error);
      throw error;
    }
  }

  /**
   * Confirma la recepción del pedido (cambia estado a 'confirmado por delivery')
   */
  async confirmarRecepcionPedido(pedidoId: number): Promise<void> {
    console.log(`[DeliveryPedidosService] Confirmando recepción del pedido ${pedidoId}...`);

    const idDelivery = this.getIdDeliveryActual();
    if (!idDelivery) {
      throw new Error('No hay usuario delivery logueado');
    }

    const { error } = await this.supa.client
      .from('pedidos')
      .update({ 
        estado: 'confirmado por delivery',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId)
      .eq('idDelivery', idDelivery)
      .eq('tipo_pedido', 'delivery'); // Asegurar que es delivery

    if (error) {
      console.error('[DeliveryPedidosService] Error al confirmar recepción:', error);
      throw error;
    }

    console.log(`[DeliveryPedidosService] ✅ Recepción del pedido ${pedidoId} confirmada exitosamente`);
  }

  /**
   * Marca el pedido como entregado al cliente (cambia estado a 'entregado')
   */
  async entregarPedidoAlCliente(pedidoId: number): Promise<void> {
    console.log('[DeliveryPedidosService] ===== INICIANDO entregarPedidoAlCliente =====');
    console.log('[DeliveryPedidosService] 📋 Pedido ID:', pedidoId);

    const idDelivery = this.getIdDeliveryActual();
    console.log('[DeliveryPedidosService] 👤 ID Delivery actual:', idDelivery);
    
    if (!idDelivery) {
      console.error('[DeliveryPedidosService] ❌ No hay usuario delivery logueado');
      throw new Error('No hay usuario delivery logueado');
    }

    // 🆕 Verificar que el pedido existe y está en el estado correcto antes de actualizar
    const { data: pedidoVerificar, error: errorVerificar } = await this.supa.client
      .from('pedidos')
      .select('id, estado, idDelivery, tipo_pedido')
      .eq('id', pedidoId)
      .single();

    if (errorVerificar) {
      console.error('[DeliveryPedidosService] ❌ Error al verificar pedido:', errorVerificar);
      throw new Error(`Error al verificar pedido: ${errorVerificar.message}`);
    }

    if (!pedidoVerificar) {
      throw new Error('Pedido no encontrado');
    }

    console.log('[DeliveryPedidosService] Estado actual del pedido:', {
      id: pedidoVerificar.id,
      estado: pedidoVerificar.estado,
      idDelivery: pedidoVerificar.idDelivery,
      idDeliveryActual: idDelivery,
      tipo_pedido: pedidoVerificar.tipo_pedido
    });

    // Verificar que el pedido pertenece a este delivery
    if (pedidoVerificar.idDelivery !== idDelivery) {
      console.error('[DeliveryPedidosService] ❌ El pedido no está asignado a este delivery', {
        pedidoIdDelivery: pedidoVerificar.idDelivery,
        idDeliveryActual: idDelivery
      });
      throw new Error('El pedido no está asignado a tu usuario delivery');
    }

    // Verificar que es un pedido delivery
    if (pedidoVerificar.tipo_pedido !== 'delivery') {
      throw new Error('Este pedido no es de tipo delivery');
    }

    // Verificar que el estado es correcto (debe estar en 'confirmado por delivery')
    if (pedidoVerificar.estado !== 'confirmado por delivery') {
      console.warn('[DeliveryPedidosService] ⚠️ Estado del pedido no es el esperado:', pedidoVerificar.estado);
      // No lanzar error, pero registrar el warning
    }

    // Actualizar el estado a 'pendiente aceptación' (el cliente debe aceptar antes de que sea "entregado")
    console.log('[DeliveryPedidosService] 📝 Actualizando estado del pedido a "pendiente aceptación"...');
    console.log('[DeliveryPedidosService] 📤 Datos de actualización:', {
      pedidoId,
      idDelivery,
      estadoNuevo: 'pendiente aceptación',
      updated_at: new Date().toISOString()
    });

    const { data: pedidoActualizado, error } = await this.supa.client
      .from('pedidos')
      .update({ 
        estado: 'pendiente aceptación',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId)
      .eq('idDelivery', idDelivery) // Asegurar que pertenece a este delivery
      .eq('tipo_pedido', 'delivery') // Asegurar que es delivery
      .select('id, estado, tipo_pedido, idDelivery')
      .single();

    console.log('[DeliveryPedidosService] 📥 Resultado actualización:', {
      pedidoActualizado,
      error,
      filasAfectadas: pedidoActualizado ? 1 : 0
    });

    if (error) {
      console.error('[DeliveryPedidosService] ❌ ERROR al actualizar pedido:', error);
      console.error('[DeliveryPedidosService] ❌ Error completo:', JSON.stringify(error, null, 2));
      console.error('[DeliveryPedidosService] ❌ Código de error:', error.code);
      console.error('[DeliveryPedidosService] ❌ Mensaje de error:', error.message);
      console.error('[DeliveryPedidosService] ❌ Detalles de error:', error.details);
      console.error('[DeliveryPedidosService] ❌ Hint de error:', error.hint);
      throw new Error(`Error al entregar pedido: ${error.message || 'Error desconocido'}`);
    }

    if (!pedidoActualizado) {
      console.error('[DeliveryPedidosService] ❌ No se recibió respuesta de actualización');
      console.error('[DeliveryPedidosService] ❌ Posibles causas:');
      console.error('[DeliveryPedidosService]   - El pedido no existe');
      console.error('[DeliveryPedidosService]   - El idDelivery no coincide');
      console.error('[DeliveryPedidosService]   - El tipo_pedido no es "delivery"');
      console.error('[DeliveryPedidosService]   - Permisos RLS bloqueando la actualización');
      throw new Error('No se pudo actualizar el pedido. Verifica que el pedido esté asignado a tu usuario.');
    }

    console.log('[DeliveryPedidosService] ✅ Pedido entregado exitosamente');
    console.log('[DeliveryPedidosService] ✅ Estado final:', {
      id: pedidoActualizado.id,
      estado: pedidoActualizado.estado,
      tipo_pedido: pedidoActualizado.tipo_pedido,
      idDelivery: pedidoActualizado.idDelivery
    });
    console.log('[DeliveryPedidosService] ===== FIN entregarPedidoAlCliente =====');
  }

  /**
   * Obtiene todos los pedidos en camino (confirmados por delivery pero aún no entregados)
   */
  async getPedidosEnCamino(): Promise<PedidoDeliveryEnCamino[]> {
    console.log('[DeliveryPedidosService] Obteniendo pedidos en camino...');

    const idDelivery = this.getIdDeliveryActual();
    if (!idDelivery) {
      console.warn('[DeliveryPedidosService] No hay usuario delivery logueado');
      return [];
    }

    try {
      // 1. Obtener pedidos con estado 'confirmado por delivery' y idDelivery = usuario actual
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id, idCliente, created_at, total, tiempo_estimado, estado, direccion_entrega, latitud, longitud')
        .eq('estado', 'confirmado por delivery')
        .eq('idDelivery', idDelivery)
        .eq('tipo_pedido', 'delivery')
        .order('created_at', { ascending: true });

      if (pedidosError) throw pedidosError;
      if (!pedidos || pedidos.length === 0) {
        console.log('[DeliveryPedidosService] No hay pedidos en camino');
        return [];
      }

      console.log(`[DeliveryPedidosService] ${pedidos.length} pedidos en camino encontrados`);

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

      // 4. Obtener cantidad de items por pedido
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

      // 5. Construir resultado
      const resultado: PedidoDeliveryEnCamino[] = pedidos.map(p => {
        return {
          id: p.id,
          cliente_email: usuariosMap.get(p.idCliente) || 'Desconocido',
          created_at: p.created_at,
          total: p.total || 0,
          tiempo_estimado: p.tiempo_estimado || 0,
          estado: p.estado,
          cantidad_items: cantidadesMap.get(p.id) || 0,
          direccion_entrega: p.direccion_entrega || undefined,
          latitud: p.latitud || undefined,
          longitud: p.longitud || undefined,
        };
      });

      console.log('[DeliveryPedidosService] Pedidos en camino procesados:', resultado);
      return resultado;

    } catch (error) {
      console.error('[DeliveryPedidosService] Error al obtener pedidos en camino:', error);
      throw error;
    }
  }

  /**
   * Observable en tiempo real de pedidos asignados
   */
  pedidosAsignados$(): Observable<PedidoDeliveryAsignado[]> {
    const subject = new BehaviorSubject<PedidoDeliveryAsignado[]>([]);
    const idDelivery = this.getIdDeliveryActual();

    if (!idDelivery) {
      console.warn('[DeliveryPedidosService] No hay usuario delivery logueado para suscripción');
      return subject.asObservable();
    }

    // Cargar inicial
    this.getPedidosAsignados()
      .then(pedidos => subject.next(pedidos))
      .catch(err => console.error('[DeliveryPedidosService] Error en carga inicial:', err));

    // Suscribirse a cambios en tiempo real
    const channel = this.supa.client
      .channel(`delivery_asignados_${idDelivery}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `idDelivery=eq.${idDelivery}`,
      }, async (payload) => {
        const pedido: any = payload.new || {};
        // Solo recargar si es un pedido asignado
        if (pedido.tipo_pedido === 'delivery' && pedido.estado === 'asignado a delivery' && pedido.idDelivery === idDelivery) {
          try {
            const pedidos = await this.getPedidosAsignados();
            subject.next(pedidos);
          } catch (err) {
            console.error('[DeliveryPedidosService] Error en realtime:', err);
          }
        }
      })
      .subscribe();

    return new Observable<PedidoDeliveryAsignado[]>(observer => {
      const sub = subject.subscribe(observer);
      return () => {
        sub.unsubscribe();
        this.supa.client.removeChannel(channel);
      };
    });
  }

  /**
   * Observable en tiempo real de pedidos en camino
   */
  pedidosEnCamino$(): Observable<PedidoDeliveryEnCamino[]> {
    const subject = new BehaviorSubject<PedidoDeliveryEnCamino[]>([]);
    const idDelivery = this.getIdDeliveryActual();

    if (!idDelivery) {
      console.warn('[DeliveryPedidosService] No hay usuario delivery logueado para suscripción');
      return subject.asObservable();
    }

    // Cargar inicial
    this.getPedidosEnCamino()
      .then(pedidos => subject.next(pedidos))
      .catch(err => console.error('[DeliveryPedidosService] Error en carga inicial:', err));

    // Suscribirse a cambios en tiempo real
    const channel = this.supa.client
      .channel(`delivery_en_camino_${idDelivery}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `idDelivery=eq.${idDelivery}`,
      }, async (payload) => {
        const pedido: any = payload.new || {};
        // Solo recargar si es un pedido confirmado por delivery
        if (pedido.tipo_pedido === 'delivery' && pedido.estado === 'confirmado por delivery' && pedido.idDelivery === idDelivery) {
          try {
            const pedidos = await this.getPedidosEnCamino();
            subject.next(pedidos);
          } catch (err) {
            console.error('[DeliveryPedidosService] Error en realtime:', err);
          }
        }
      })
      .subscribe();

    return new Observable<PedidoDeliveryEnCamino[]>(observer => {
      const sub = subject.subscribe(observer);
      return () => {
        sub.unsubscribe();
        this.supa.client.removeChannel(channel);
      };
    });
  }
}

