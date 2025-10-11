

import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pedido } from '../models/pedido.model';

export type PlatoTipo = 'plato' | 'bebida';

export type CrearPlatoPayload = {
  nombre: string;
  descripcion: string;
  tiempoElaboracion: number;
  precio: number;
  tipo: PlatoTipo;
  fotos: string[]; // exactamente 3 fotos
};

export type CrearPlatoResult = {
  id: string;
  nombre: string;
  fotos: string[];
};

export type PlatoRow = {
  id: string;
  nombre: string;
  descripcion: string;
  tiempoElaboracion: number;
  precio: number;
  foto1: string;
  foto2: string;
  foto3: string;
  tipo: PlatoTipo;
};

export type CrearPedidoResult = { id: number; total: number; tiempoEstimado: number };

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly BUCKET = 'menu';
  private readonly TIMEOUT_MS = 10000;

  constructor(private supabase: SupabaseService) {}

  async existePlato(nombre: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('menu')
      .select('id')
      .eq('nombre', nombre)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  async getClienteIdActual(autoCreate = true): Promise<string> {
  const { data: ures, error: uerr } = await this.supabase.client.auth.getUser();
  if (uerr) throw uerr;
  const user = ures?.user;
  if (!user) throw new Error('No hay usuario autenticado.');

  // buscamos en usuarios por auth_id (uuid del user)
  const { data: row, error: e1 } = await this.supabase.client
    .from('usuarios')
    .select('auth_id, email')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (e1) throw e1;

  // si no existe y querés autocrear
  if (!row && autoCreate) {
    const { error: e2 } = await this.supabase.client
      .from('usuarios')
      .insert([{ auth_id: user.id, email: user.email ?? null }])
      .single();
    if (e2) throw e2;
  }

  // devolvemos SIEMPRE el uuid del auth
  return user.id; // <-- UUID string
}
//   async getUltimoPedidoDelActual() {
//   const clienteId = await this.getClienteIdActual(false); // no crear si no existe
//   return this.getUltimoPedidoDeCliente(clienteId);
// }
async getUltimoPedidoDelActual() {
  const clienteAuthId = await this.getClienteIdActual(false); // string uuid
  return this.getUltimoPedidoDeCliente(clienteAuthId);
}


  async crearPlatoConFotos(payload: CrearPlatoPayload): Promise<CrearPlatoResult> {
    const { nombre, descripcion, tiempoElaboracion, precio, tipo, fotos } = payload;

    const { data: inserted, error: insErr } = await this.supabase.client
      .from('menu')
      .insert([mapPlatoABaseDeDatos(payload)])
      .select('id')
      .single();

    if (insErr || !inserted) throw traducirErrorPlato(insErr);

    const id = inserted.id as string;
    const urlFotos: string[] = [];

    for (const [index, foto] of fotos.entries()) {
      const path = `fotos/${id}-${index + 1}.jpg`;
      const { error: upErr } = await this.supabase.client.storage
        .from(this.BUCKET)
        .upload(path, decodeBase64(foto), { upsert: true, contentType: 'image/jpeg' });
      if (upErr) throw new Error('No se pudo subir la foto ' + (index + 1));

      const { data } = this.supabase.client.storage.from(this.BUCKET).getPublicUrl(path);
      urlFotos.push(data.publicUrl);
    }

    const { error: updErr } = await this.supabase.client
      .from('menu')
      .update({ foto1: urlFotos[0], foto2: urlFotos[1], foto3: urlFotos[2] })
      .eq('id', id)
      .single();

    if (updErr) throw new Error('Producto creado, pero no se pudieron guardar las fotos.');
    return { id, nombre, fotos: urlFotos };
  }

  async obtenerMenu() {
    const { data, error } = await this.supabase.client.from('menu').select('*');
    if (error) throw error;
    return data;
  }

 
async crearPedido(pedido: {
  idCliente: string; // <-- era number
  productos: { id: number; cantidad: number; precio_unitario: number }[];
}): Promise<CrearPedidoResult> {
  const { data: pedidoData, error: pedidoError } = await this.supabase.client
    .from('pedidos')
    .insert([{ idCliente: pedido.idCliente, estado: 'pendiente' }]) // idCliente = uuid string
    .select('id')
    .single();
  if (pedidoError) throw pedidoError;

  const idPedido = pedidoData.id as number;

  const detalles = pedido.productos.map(p => ({
    idPedido,
    idProducto: p.id,
    cantidad: p.cantidad,
    precioUnitario: p.precio_unitario
  }));
  const { error: detalleError } = await this.supabase.client
    .from('pedidos_detalles')
    .insert(detalles);
  if (detalleError) throw detalleError;

  // total y tiempo como ya tenías
  const total = pedido.productos.reduce((acc, p) =>
    acc + (Number(p.precio_unitario)||0)*(Number(p.cantidad)||0), 0);

  let tiempoEstimado = 0;
  const ids = [...new Set(pedido.productos.map(p => p.id))];
  if (ids.length) {
    const { data: menuRows, error: menuErr } = await this.supabase.client
      .from('menu').select('id, tiempo_elaboracion').in('id', ids);
    if (menuErr) throw menuErr;
    const tiempos = new Map<any, number>();
    (menuRows||[]).forEach(r => tiempos.set(r.id, Number(r.tiempo_elaboracion)||0));
    tiempoEstimado = pedido.productos.reduce((m,p)=> Math.max(m, tiempos.get(p.id)??0), 0);
  }

  try {
    await this.supabase.client
      .from('pedidos')
      .update({ total, tiempo_estimado: tiempoEstimado })
      .eq('id', idPedido);
  } catch {} // ignorar si no existen las columnas

  return { id: idPedido, total, tiempoEstimado };
}
  // ⬇️ Resumen de un pedido (estado + total + tiempo) recálculo por seguridad
  async getPedidoResumen(pedidoId: number): Promise<{ id: number; estado: string; total: number; tiempoEstimado: number; created_at: string }> {
    // encabezado
    const { data: ped, error: e1 } = await this.supabase.client
      .from('pedidos')
      .select('id, estado, created_at, total, tiempo_estimado')
      .eq('id', pedidoId)
      .maybeSingle();
    if (e1) throw e1;
    if (!ped) throw new Error('Pedido no encontrado');

    // si ya hay total/tiempo en encabezado, usalos; si no, recalcular
    let total = Number(ped.total) || 0;
    let tiempoEstimado = Number(ped.tiempo_estimado) || 0;

    if (!total || !tiempoEstimado) {
      // detalles + menu para recalcular
      const { data: dets, error: e2 } = await this.supabase.client
        .from('pedidos_detalles')
        .select('idProducto, cantidad, precioUnitario')
        .eq('idPedido', ped.id);
      if (e2) throw e2;

      total = (dets || []).reduce(
        (acc, d: any) => acc + (Number(d.precioUnitario) || 0) * (Number(d.cantidad) || 0),
        0
      );

      const ids = Array.from(new Set((dets || []).map((d: any) => d.idProducto)));
      let maxT = 0;
      if (ids.length) {
        const { data: menuRows, error: e3 } = await this.supabase.client
          .from('menu')
          .select('id, tiempo_elaboracion')
          .in('id', ids);
        if (e3) throw e3;
        const tiempos = new Map<any, number>();
        (menuRows || []).forEach(r => tiempos.set(r.id, Number(r.tiempo_elaboracion) || 0));
        maxT = (dets || []).reduce((m: number, d: any) => Math.max(m, tiempos.get(d.idProducto) ?? 0), 0);
      }
      tiempoEstimado = maxT;
    }

    return { id: ped.id, estado: ped.estado, total, tiempoEstimado, created_at: ped.created_at };
  }

  async getUltimoPedidoDeCliente(clienteAuthId: string) {
  const { data: p, error } = await this.supabase.client
    .from('pedidos')
    .select('id')
    .eq('idCliente', clienteAuthId)       // <-- uuid
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;
  return this.getPedidoResumen(p.id);
}

  // ⬇️ Suscripción en tiempo real (encabezado y detalles)
  onPedidoChange(pedidoId: number, cb: (resumen: { id: number; estado: string; total: number; tiempoEstimado: number; created_at: string }) => void) {
    const ch = this.supabase.client
      .channel(`pedido-${pedidoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}` }, async () => {
        const r = await this.getPedidoResumen(pedidoId);
        cb(r);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_detalles', filter: `idPedido=eq.${pedidoId}` }, async () => {
        const r = await this.getPedidoResumen(pedidoId);
        cb(r);
      })
      .subscribe();

    return ch; // para poder .unsubscribe() en ngOnDestroy
  }

  // ⬇️ Cargar pedido con detalles (tu método original, sin tocar demasiado)
  async cargarPedido(idPedido: string): Promise<Pedido | null> {
    const { data: pedido, error: pedidoError } = await this.supabase.client
      .from('pedidos')
      .select('*')
      .eq('id', idPedido)
      .single();

    if (pedidoError) {
      if (pedidoError.code === 'PGRST116') return null;
      throw pedidoError;
    }

    const { data: detalles, error: detalleError } = await this.supabase.client
      .from('pedidos_detalles')
      .select(`idProducto, cantidad, precioUnitario`)
      .eq('idPedido', pedido.id);

    if (detalleError) throw detalleError;

    const pedidoConDetalles: Pedido = {
      id: pedido.id,
      estado: pedido.estado,
      created_at: pedido.created_at,
      detalles: detalles.map((d: any) => ({
        idProducto: d.idProducto,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        nombreProducto: 'Desconocido' // si querés nombre, hacé join a menu
      }))
    };

    (pedidoConDetalles as any).precioTotal = pedidoConDetalles.detalles
      .reduce((acc, d) => acc + d.cantidad * Number(d.precioUnitario), 0);

    return pedidoConDetalles;
  }

  async obtenerPedidosCocina(): Promise<(Pedido & {
    numero_mesa: number;
    fecha: string;
    productos: { nombre: string; cantidad: number }[];
  })[]> {
    console.log('🔍 Iniciando obtención de pedidos de cocina...');

    try {
      // Consulta principal - EXCLUIR "en preparación" y otros estados finalizados
      const { data, error } = await this.supabase.client
        .from('pedidos')
        .select(`
          id,
          created_at,
          estado,
          estado_sector_cocina,
          idCliente,
          pedidos_detalles!inner (
            cantidad,
            menu!inner (
              nombre,
              tipo
            )
          )
        `)
        .eq('pedidos_detalles.menu.tipo', 'plato')
        .in('estado', ['pendiente', 'confirmado'])
        .neq('estado', 'en preparación')
        .neq('estado', 'completado')
        .neq('estado', 'cancelado')
        .order('created_at', { ascending: true }); // Ordenar por fecha más antigua primero

      console.log('🔎 Resultado de consulta filtrada:', data);
      console.log('❌ Error de consulta filtrada:', error);

      if (error) {
        console.error('Error en consulta principal:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No se encontraron pedidos con productos de tipo "plato" en estados pendiente/confirmado');
        return [];
      }

      console.log(`✅ Se encontraron ${data.length} pedidos con productos de cocina`);

      // Verificar los estados de los pedidos encontrados
      data.forEach(pedido => {
        console.log(`📋 Pedido ${pedido.id}: estado=${pedido.estado}, estado_sector_cocina=${pedido.estado_sector_cocina}`);
      });

      // Resto del código se mantiene igual...
      const idClientes = data.map(pedido => pedido.idCliente).filter(id => id !== null);
      console.log('👥 ID Clientes a buscar:', idClientes);

      if (idClientes.length === 0) {
        console.log('⚠️ No hay idClientes válidos para buscar mesas');
        return data.map(pedido => ({
          id: pedido.id,
          estado: pedido.estado,
          estado_sector_cocina: pedido.estado_sector_cocina,
          created_at: pedido.created_at,
          fecha: pedido.created_at,
          numero_mesa: 0,
          productos: pedido.pedidos_detalles.map((detalle: any) => ({
            nombre: detalle.menu.nombre,
            cantidad: detalle.cantidad
          })),
          detalles: []
        }));
      }

      const { data: mesasData, error: mesasError } = await this.supabase.client
        .from('lista_espera')
        .select('usuario_id, numero_mesa')
        .in('usuario_id', idClientes);

      console.log('🪑 Resultado de búsqueda de mesas:', mesasData);

      if (mesasError) {
        console.error('Error al buscar mesas:', mesasError);
        throw mesasError;
      }

      const mesasMap = new Map();
      mesasData?.forEach(mesa => {
        if (!mesasMap.has(mesa.usuario_id)) {
          mesasMap.set(mesa.usuario_id, []);
        }
        mesasMap.get(mesa.usuario_id).push(mesa.numero_mesa);
      });

      const pedidosProcesados = data.map(pedido => {
        const productosCocina = pedido.pedidos_detalles
          .map((detalle: any) => ({
            nombre: detalle.menu.nombre,
            cantidad: detalle.cantidad
          }));

        const mesasDelCliente = mesasMap.get(pedido.idCliente) || [];
        const numero_mesa = mesasDelCliente.length > 0 ? mesasDelCliente[0] : 0;

        return {
          id: pedido.id,
          estado: pedido.estado,
          estado_sector_cocina: pedido.estado_sector_cocina,
          created_at: pedido.created_at,
          fecha: pedido.created_at,
          numero_mesa: numero_mesa,
          productos: productosCocina,
          detalles: []
        };
      });

      console.log('🎉 Pedidos procesados finales:', pedidosProcesados);
      return pedidosProcesados;

    } catch (error) {
      console.error('💥 Error general en obtenerPedidosCocina:', error);
      throw error;
    }
  }

  async obtenerPedidosBar(): Promise<(Pedido & {
    numero_mesa: number;
    fecha: string;
    productos: { nombre: string; cantidad: number }[];
  })[]> {
    console.log('🔍 Iniciando obtención de pedidos de bar...');

    try {
      // Consulta principal - EXCLUIR "en preparación" y otros estados finalizados
      const { data, error } = await this.supabase.client
        .from('pedidos')
        .select(`
          id,
          created_at,
          estado,
          estado_sector_bar,
          idCliente,
          pedidos_detalles!inner (
            cantidad,
            menu!inner (
              nombre,
              tipo
            )
          )
        `)
        .eq('pedidos_detalles.menu.tipo', 'bebida')
        .in('estado', ['pendiente', 'confirmado'])
        .neq('estado', 'en preparación')
        .neq('estado', 'completado')
        .neq('estado', 'cancelado')
        .order('created_at', { ascending: true }); // Ordenar por fecha más antigua primero

      console.log('🔎 Resultado de consulta filtrada:', data);
      console.log('❌ Error de consulta filtrada:', error);

      if (error) {
        console.error('Error en consulta principal:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No se encontraron pedidos con productos de tipo "bebida" en estados pendiente/confirmado');
        return [];
      }

      console.log(`✅ Se encontraron ${data.length} pedidos con productos de bebida`);

      // Verificar los estados de los pedidos encontrados
      data.forEach(pedido => {
        console.log(`📋 Pedido ${pedido.id}: estado=${pedido.estado}, estado_sector_bar=${pedido.estado_sector_bar}`);
      });

      // Resto del código se mantiene igual...
      const idClientes = data.map(pedido => pedido.idCliente).filter(id => id !== null);
      console.log('👥 ID Clientes a buscar:', idClientes);

      if (idClientes.length === 0) {
        console.log('⚠️ No hay idClientes válidos para buscar mesas');
        return data.map(pedido => ({
          id: pedido.id,
          estado: pedido.estado,
          estado_sector_bar: pedido.estado_sector_bar,
          created_at: pedido.created_at,
          fecha: pedido.created_at,
          numero_mesa: 0,
          productos: pedido.pedidos_detalles.map((detalle: any) => ({
            nombre: detalle.menu.nombre,
            cantidad: detalle.cantidad
          })),
          detalles: []
        }));
      }

      const { data: mesasData, error: mesasError } = await this.supabase.client
        .from('lista_espera')
        .select('usuario_id, numero_mesa')
        .in('usuario_id', idClientes);

      console.log('🪑 Resultado de búsqueda de mesas:', mesasData);

      if (mesasError) {
        console.error('Error al buscar mesas:', mesasError);
        throw mesasError;
      }

      const mesasMap = new Map();
      mesasData?.forEach(mesa => {
        if (!mesasMap.has(mesa.usuario_id)) {
          mesasMap.set(mesa.usuario_id, []);
        }
        mesasMap.get(mesa.usuario_id).push(mesa.numero_mesa);
      });

      const pedidosProcesados = data.map(pedido => {
        const productosBartender = pedido.pedidos_detalles
          .map((detalle: any) => ({
            nombre: detalle.menu.nombre,
            cantidad: detalle.cantidad
          }));

        const mesasDelCliente = mesasMap.get(pedido.idCliente) || [];
        const numero_mesa = mesasDelCliente.length > 0 ? mesasDelCliente[0] : 0;

        return {
          id: pedido.id,
          estado: pedido.estado,
          estado_sector_cocina: pedido.estado_sector_bar,
          created_at: pedido.created_at,
          fecha: pedido.created_at,
          numero_mesa: numero_mesa,
          productos: productosBartender,
          detalles: []
        };
      });

      console.log('🎉 Pedidos procesados finales:', pedidosProcesados);
      return pedidosProcesados;

    } catch (error) {
      console.error('💥 Error general en obtenerPedidosBar:', error);
      throw error;
    }
  }

  async actualizarEstadoPedido(idPedido: number, nuevoEstado: string, estadoSectorCocina: string): Promise<void> {
    try {
      console.log(`🔄 Intentando actualizar pedido ${idPedido} con:`, {
        nuevoEstado,
        estadoSectorCocina,
        timestamp: new Date().toISOString()
      });

      // Verificar primero si el pedido existe
      const { data: pedidoExistente, error: errorVerificar } = await this.supabase.client
        .from('pedidos')
        .select('id, estado, estado_sector_cocina')
        .eq('id', idPedido)
        .single();

      console.log('🔍 Verificación del pedido existente:', { pedidoExistente, errorVerificar });

      if (errorVerificar) {
        console.error('❌ Error al verificar el pedido:', errorVerificar);
        throw new Error(`No se pudo verificar el pedido ${idPedido}`);
      }

      if (!pedidoExistente) {
        throw new Error(`El pedido ${idPedido} no existe`);
      }

      // Ahora hacer la actualización
      const { data, error } = await this.supabase.client
        .from('pedidos')
        .update({
          estado: nuevoEstado,
          estado_sector_cocina: estadoSectorCocina,
          updated_at: new Date().toISOString()
        })
        .eq('id', idPedido)
        .select();

      console.log('📊 Respuesta de actualización:', { data, error });

      if (error) {
        console.error('❌ Error al actualizar el pedido:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`✅ Pedido ${idPedido} actualizado correctamente:`, {
          estado_anterior: pedidoExistente.estado,
          estado_nuevo: data[0].estado,
          sector_cocina_anterior: pedidoExistente.estado_sector_cocina,
          sector_cocina_nuevo: data[0].estado_sector_cocina
        });
      } else {
        console.warn(`⚠️ No se encontró pedido con id ${idPedido} para actualizar (pero existe)`);
      }

    } catch (error) {
      console.error('💥 Error en actualizarEstadoPedido:', error);
      throw error;
    }
  }

  async verificarPedido(idPedido: number): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('pedidos')
      .select('*')
      .eq('id', idPedido)
      .single();

    console.log(`🔍 Verificando pedido ${idPedido}:`, { data, error });
  }

}

// === Helpers ===
function mapPlatoABaseDeDatos(payload: CrearPlatoPayload) {
  return {
    nombre: payload.nombre,
    descripcion: payload.descripcion,
    tiempo_elaboracion: payload.tiempoElaboracion,
    precio: payload.precio,
    tipo: payload.tipo,
  };
}

function decodeBase64(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function traducirErrorPlato(e: any): Error {
  const msg = (e?.message || '').toLowerCase();
  if (e?.status === 409 || e?.code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return new Error('El producto ya existe.');
  }
  if (e?.status === 400 || msg.includes('invalid input value for enum')) {
    return new Error('Tipo inválido.');
  }
  return new Error('No se pudo crear el producto.');
}
