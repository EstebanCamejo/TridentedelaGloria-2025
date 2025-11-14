import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';

export type ProductoPedido = {
  nombre: string;
  cantidad: number;
};

export type PedidoDeliveryPendiente = {
  id: number;
  cliente_email: string;
  cliente_nombre: string;
  created_at: string;
  total: number;
  tiempo_estimado: number;
  estado: string;
  cantidad_items: number;
  direccion_entrega?: string;
  latitud?: number;
  longitud?: number;
};

export type PedidoDeliveryListo = {
  id: number;
  cliente_email: string;
  cliente_nombre: string;
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
export class AdminDeliveryPedidosService {
  constructor(private supa: SupabaseService) {}

  /**
   * Obtiene todos los pedidos delivery pendientes de confirmación
   * NOTA: Similar a MozoPedidosService.getPedidosPendientes() pero filtrando solo delivery
   */
  async getPedidosDeliveryPendientes(): Promise<PedidoDeliveryPendiente[]> {
    console.log('[AdminDeliveryPedidosService] Obteniendo pedidos delivery pendientes...');

    try {
      // 1. Obtener pedidos con estado 'pendiente' y tipo_pedido = 'delivery'
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id, idCliente, created_at, total, tiempo_estimado, estado, direccion_entrega, latitud, longitud')
        .eq('estado', 'pendiente')
        .eq('tipo_pedido', 'delivery')
        .order('created_at', { ascending: true });

      if (pedidosError) throw pedidosError;
      if (!pedidos || pedidos.length === 0) {
        console.log('[AdminDeliveryPedidosService] No hay pedidos delivery pendientes');
        return [];
      }

      console.log(`[AdminDeliveryPedidosService] ${pedidos.length} pedidos delivery pendientes encontrados`);

      // 2. Obtener IDs de clientes únicos
      const clienteIds = [...new Set(pedidos.map(p => p.idCliente).filter(Boolean))];

      // 3. Obtener información de usuarios (para emails y nombres)
      const { data: usuarios } = await this.supa.client
        .from('usuarios')
        .select('auth_id, email, nombres, apellidos')
        .in('auth_id', clienteIds);

      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.auth_id, {
          email: u.email || 'Sin email',
          nombre: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'Cliente'
        }])
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
      const resultado: PedidoDeliveryPendiente[] = pedidos.map(p => {
        const usuario = usuariosMap.get(p.idCliente);
        return {
          id: p.id,
          cliente_email: usuario?.email || 'Desconocido',
          cliente_nombre: usuario?.nombre || 'Cliente',
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

      console.log('[AdminDeliveryPedidosService] Pedidos delivery procesados:', resultado);
      return resultado;

    } catch (error) {
      console.error('[AdminDeliveryPedidosService] Error al obtener pedidos delivery pendientes:', error);
      throw error;
    }
  }

  /**
   * Confirma un pedido delivery pendiente (cambia estado a 'pedido en curso')
   * El tiempo estimado debe ser ingresado manualmente por el admin
   * NOTA: Similar a MozoPedidosService.confirmarPedido() pero para delivery
   */
  async confirmarPedidoDelivery(pedidoId: number, tiempoEstimado: number): Promise<void> {
    console.log(`[AdminDeliveryPedidosService] Confirmando pedido delivery ${pedidoId} con tiempo estimado: ${tiempoEstimado} min...`);

    // Validar tiempo estimado
    if (!tiempoEstimado || tiempoEstimado < 1 || tiempoEstimado > 300) {
      throw new Error('El tiempo estimado debe estar entre 1 y 300 minutos');
    }

    try {
      // Actualizar pedido con nuevo estado y tiempo estimado ingresado por el admin
      const { error } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'pedido en curso',
          tiempo_estimado: tiempoEstimado,
          updated_at: new Date().toISOString()
        })
        .eq('id', pedidoId)
        .eq('tipo_pedido', 'delivery'); // Asegurar que es delivery

      if (error) {
        console.error('[AdminDeliveryPedidosService] Error al confirmar pedido delivery:', error);
        throw error;
      }

      console.log(`[AdminDeliveryPedidosService] ✅ Pedido delivery ${pedidoId} confirmado exitosamente con tiempo estimado: ${tiempoEstimado} min`);
    } catch (error) {
      console.error('[AdminDeliveryPedidosService] Error en confirmarPedidoDelivery:', error);
      throw error;
    }
  }

  /**
   * Rechaza un pedido delivery pendiente (cambia estado a 'rechazado por admin')
   * NOTA: Similar a MozoPedidosService.rechazarPedido() pero para delivery
   */
  async rechazarPedidoDelivery(pedidoId: number): Promise<void> {
    console.log(`[AdminDeliveryPedidosService] Rechazando pedido delivery ${pedidoId}...`);

    const { error } = await this.supa.client
      .from('pedidos')
      .update({ 
        estado: 'rechazado por admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedidoId)
      .eq('tipo_pedido', 'delivery'); // Asegurar que es delivery

    if (error) {
      console.error('[AdminDeliveryPedidosService] Error al rechazar pedido delivery:', error);
      throw error;
    }

    console.log(`[AdminDeliveryPedidosService] ✅ Pedido delivery ${pedidoId} rechazado exitosamente`);
  }

  /**
   * Obtiene todos los pedidos delivery listos para entregar (estado = 'listo para entregar')
   */
  async getPedidosListosParaEntregar(): Promise<PedidoDeliveryListo[]> {
    console.log('[AdminDeliveryPedidosService] Obteniendo pedidos delivery listos para entregar...');

    try {
      // 1. Obtener pedidos con estado 'listo para entregar' y tipo_pedido = 'delivery'
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id, idCliente, created_at, total, tiempo_estimado, estado, direccion_entrega, latitud, longitud')
        .eq('estado', 'listo para entregar')
        .eq('tipo_pedido', 'delivery')
        .order('created_at', { ascending: true });

      if (pedidosError) throw pedidosError;
      if (!pedidos || pedidos.length === 0) {
        console.log('[AdminDeliveryPedidosService] No hay pedidos delivery listos para entregar');
        return [];
      }

      console.log(`[AdminDeliveryPedidosService] ${pedidos.length} pedidos delivery listos encontrados`);

      // 2. Obtener IDs de clientes únicos
      const clienteIds = [...new Set(pedidos.map(p => p.idCliente).filter(Boolean))];

      // 3. Obtener información de usuarios (para emails y nombres)
      const { data: usuarios } = await this.supa.client
        .from('usuarios')
        .select('auth_id, email, nombres, apellidos')
        .in('auth_id', clienteIds);

      const usuariosMap = new Map(
        (usuarios || []).map(u => [u.auth_id, {
          email: u.email || 'Sin email',
          nombre: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'Cliente'
        }])
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
      const resultado: PedidoDeliveryListo[] = pedidos.map(p => {
        const usuario = usuariosMap.get(p.idCliente);
        return {
          id: p.id,
          cliente_email: usuario?.email || 'Desconocido',
          cliente_nombre: usuario?.nombre || 'Cliente',
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

      console.log('[AdminDeliveryPedidosService] Pedidos delivery listos procesados:', resultado);
      return resultado;

    } catch (error) {
      console.error('[AdminDeliveryPedidosService] Error al obtener pedidos delivery listos:', error);
      throw error;
    }
  }

  /**
   * Asigna un pedido delivery a un usuario delivery
   */
  async asignarPedidoADelivery(pedidoId: number, idDelivery: string): Promise<void> {
    console.log(`[AdminDeliveryPedidosService] Asignando pedido delivery ${pedidoId} a delivery ${idDelivery}...`);

    try {
      const { error } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'asignado a delivery',
          idDelivery: idDelivery,
          updated_at: new Date().toISOString()
        })
        .eq('id', pedidoId)
        .eq('tipo_pedido', 'delivery'); // Asegurar que es delivery

      if (error) {
        console.error('[AdminDeliveryPedidosService] ❌ Error al asignar pedido delivery:', error);
        
        // 🆕 Manejo específico del error PGRST204 (columna no existe)
        if (error.code === 'PGRST204' || error.message?.includes('idDelivery') || error.message?.includes('schema cache')) {
          const mensajeError = 'La columna idDelivery no existe en la tabla pedidos. Por favor, ejecuta la migración SQL: sql_migration_fase1_delivery.sql en Supabase SQL Editor.';
          console.error('[AdminDeliveryPedidosService] ❌ ERROR CRÍTICO:', mensajeError);
          throw new Error(mensajeError);
        }
        
        throw error;
      }

      console.log(`[AdminDeliveryPedidosService] ✅ Pedido delivery ${pedidoId} asignado a delivery ${idDelivery}`);
    } catch (error: any) {
      console.error('[AdminDeliveryPedidosService] ❌ Excepción al asignar pedido delivery:', error);
      throw error;
    }
  }

  /**
   * Observable en tiempo real de pedidos delivery pendientes
   * NOTA: Similar a MozoPedidosService.pedidosPendientes$() pero filtrando solo delivery
   */
  pedidosDeliveryPendientes$(): Observable<PedidoDeliveryPendiente[]> {
    const subject = new BehaviorSubject<PedidoDeliveryPendiente[]>([]);

    // Cargar inicial
    this.getPedidosDeliveryPendientes()
      .then(pedidos => subject.next(pedidos))
      .catch(err => console.error('[AdminDeliveryPedidosService] Error en carga inicial:', err));

    // Suscribirse a cambios en tiempo real
    const channel = this.supa.client
      .channel('admin_delivery_pendientes_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `tipo_pedido=eq.delivery`,
      }, async (payload) => {
        const pedido: any = payload.new || {};
        // Solo recargar si es un pedido delivery pendiente
        if (pedido.tipo_pedido === 'delivery' && pedido.estado === 'pendiente') {
          try {
            const pedidos = await this.getPedidosDeliveryPendientes();
            subject.next(pedidos);
          } catch (err) {
            console.error('[AdminDeliveryPedidosService] Error en realtime:', err);
          }
        }
      })
      .subscribe();

    return subject.asObservable();
  }

  /**
   * Observable en tiempo real de pedidos delivery listos para entregar
   */
  pedidosListosParaEntregar$(): Observable<PedidoDeliveryListo[]> {
    const subject = new BehaviorSubject<PedidoDeliveryListo[]>([]);

    // Cargar inicial
    this.getPedidosListosParaEntregar()
      .then(pedidos => subject.next(pedidos))
      .catch(err => console.error('[AdminDeliveryPedidosService] Error en carga inicial:', err));

    // Suscribirse a cambios en tiempo real
    const channel = this.supa.client
      .channel('admin_delivery_listos_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `tipo_pedido=eq.delivery`,
      }, async (payload) => {
        const pedido: any = payload.new || {};
        // Solo recargar si es un pedido delivery listo para entregar
        if (pedido.tipo_pedido === 'delivery' && pedido.estado === 'listo para entregar') {
          try {
            const pedidos = await this.getPedidosListosParaEntregar();
            subject.next(pedidos);
          } catch (err) {
            console.error('[AdminDeliveryPedidosService] Error en realtime:', err);
          }
        }
      })
      .subscribe();

    return subject.asObservable();
  }

  /**
   * Obtiene los productos de un pedido con sus nombres y cantidades
   */
  async obtenerProductosPedido(pedidoId: number): Promise<ProductoPedido[]> {
    console.log(`[AdminDeliveryPedidosService] Obteniendo productos del pedido ${pedidoId}...`);

    try {
      const { data: detalles, error } = await this.supa.client
        .from('pedidos_detalles')
        .select(`
          cantidad,
          menu!inner (
            nombre
          )
        `)
        .eq('idPedido', pedidoId);

      if (error) {
        console.error('[AdminDeliveryPedidosService] Error al obtener productos:', error);
        throw error;
      }

      const productos: ProductoPedido[] = (detalles || []).map((d: any) => ({
        nombre: d.menu?.nombre || 'Producto desconocido',
        cantidad: d.cantidad || 0
      }));

      console.log(`[AdminDeliveryPedidosService] Productos obtenidos:`, productos);
      return productos;
    } catch (error) {
      console.error('[AdminDeliveryPedidosService] Error en obtenerProductosPedido:', error);
      throw error;
    }
  }
}

