// // Sirve para los puntos 2, 3 y 12 el TP

// import { Injectable } from '@angular/core';
// import { SupabaseService } from './supabase.service';
// import { Pedido, PedidoDetalle } from '../models/pedido.model'

// export type PlatoTipo = 'plato' | 'bebida';

// export type CrearPlatoPayload = {
//   nombre: string;
//   descripcion: string;
//   tiempoElaboracion: number;
//   precio: number;
//   tipo: PlatoTipo;
//   fotos: string[]; // exactamente 3 fotos
// };

// export type CrearPlatoResult = {
//   id: string;
//   nombre: string;
//   fotos: string[];
// };

// export type PlatoRow = {
//   id: string;
//   nombre: string;
//   descripcion: string;
//   tiempoElaboracion: number;
//   precio: number;
//   foto1: string;
//   foto2: string;
//   foto3: string;
//   tipo: PlatoTipo;
// };

// export type CrearPedidoResult = {
//   id: string;
// }

// @Injectable({ providedIn: 'root' })
// export class MenuService {
//   private readonly BUCKET = 'menu';
//   private readonly TIMEOUT_MS = 10000;

//   constructor(private supabase: SupabaseService) {}

//   async existePlato(nombre: string): Promise<boolean> {
//     console.log('[existePlato] Verificando existencia de:', nombre);

//     const { data, error } = await this.supabase.client
//       .from('menu')
//       .select('id')
//       .eq('nombre', nombre)
//       .maybeSingle();

//     console.log('[existePlato] Resultado:', { data, error });

//     if (error && error.code !== 'PGRST116') {
//       throw error;
//     }

//     return !!data;
//   }

//   async crearPlatoConFotos(payload: CrearPlatoPayload): Promise<CrearPlatoResult> {
//     console.log('[crearPlatoConFotos] Método invocado');

//     /*
//     const session = await this.supabase.waitForSession(3000);
//     if (!session?.user?.id) {
//       console.warn('No se pudo obtener sesión válida desde Supabase.');
//       throw new Error('Sesión expirada o inválida. Por favor, iniciá sesión nuevamente.');
//     }
//       */

//     const { nombre, descripcion, tiempoElaboracion, precio, tipo, fotos } = payload;

//     console.log('[crearPlatoConFotos] Cliente:', this.supabase.client);
//     console.log('Cliente de supabase:', this.supabase.client);

//     let inserted: any = null;
//     let insErr: any = null;

//     console.log('Empezando a ejecutar insert...');
//     try {
//       console.log('Ejecutando insert...');
//       const result = await this.supabase.client
//         .from('menu')
//         .insert([mapPlatoABaseDeDatos(payload)])
//         .select('id')
//         .single();

//       inserted = result.data;
//       insErr = result.error;

//       console.log('Insert terminó', { inserted, insErr });

//       if (insErr || !inserted) {
//         console.error('Error al insertar en Supabase:', insErr);
//         throw traducirErrorPlato(insErr);
//       }

//     } catch (e) {
//       console.error("Excepción inesperada al hacer insert:", e);
//       throw e;
//     }

//     const id = inserted.id;
//     const urlFotos: string[] = [];

//     console.log(`Se creó con éxito el producto. Id del producto: ${id}`);

//     // 2) Subir fotos al bucket
//     for (const [index, foto] of fotos.entries()) {
//       const path = `fotos/${id}-${index + 1}.jpg`;

//       const { error: upErr } = await this.supabase.client.storage
//         .from(this.BUCKET)
//         .upload(path, decodeBase64(foto), { upsert: true, contentType: 'image/jpeg' });

//       if (upErr) throw new Error('No se pudo subir la foto ' + (index + 1));

//       const { data } = this.supabase.client.storage.from(this.BUCKET).getPublicUrl(path);
//       urlFotos.push(data.publicUrl);
//     }

//     // 3) Actualizar fila con URLs de fotos
//     const { error: updErr } = await this.supabase.client
//       .from('menu')
//       .update({
//         foto1: urlFotos[0],
//         foto2: urlFotos[1],
//         foto3: urlFotos[2],
//       })
//       .eq('id', id)
//       .single();

//     if (updErr) {
//       throw new Error('Producto creado, pero no se pudieron guardar las fotos.');
//     }

//     return { id, nombre, fotos: urlFotos };
//   }

//   async obtenerMenu() {
//     const { data, error } = await this.supabase.client
//       .from('menu')
//       .select('*');
//     if (error) throw error;
//     return data;
//   }

//   async crearPedido(pedido: {
//     idCliente: number;
//     productos: { id: number; cantidad: number; precio_unitario: number }[];
//   }): Promise<CrearPedidoResult> {

//     console.log('Empezando a cargar pedido');

//     try {
//       // 1️⃣ Insertar pedido y obtener el ID generado
//       const { data: pedidoData, error: pedidoError } = await this.supabase.client
//         .from('pedidos')
//         .insert([
//           { idCliente: pedido.idCliente, estado: 'pendiente' }
//         ])
//         .select('id')
//         .single(); // .single() devuelve un objeto, no un array

//       if (pedidoError) throw pedidoError;

//       console.log('Pedido insertado en la tabla pedidos')

//       const idPedido = pedidoData.id;

//       // 2️⃣ Preparar los detalles del pedido
//       const detalles = pedido.productos.map(p => ({
//         idPedido: idPedido,
//         idProducto: p.id,
//         cantidad: p.cantidad,
//         precioUnitario: p.precio_unitario
//       }));

//       // 3️⃣ Insertar detalles
//       const { error: detalleError } = await this.supabase.client
//         .from('pedidos_detalles')
//         .insert(detalles);

//       if (detalleError) throw detalleError;

//       console.log('Pedido creado correctamente con id:', idPedido);
//       return idPedido;

//     } catch (error) {
//       console.error('Error al crear pedido:', error);
//       throw error;
//     }
//   }

//   async cargarPedido(idPedido: string): Promise<Pedido | null> {

//     // 1️⃣ Traer el pedido
//     const { data: pedido, error: pedidoError } = await this.supabase.client
//       .from('pedidos')
//       .select('*')
//       .eq('id', idPedido)
//       .single();

//     if (pedidoError) {
//       if (pedidoError.code === 'PGRST116') {
//         // No hay pedido
//         return null;
//       }
//       throw pedidoError;
//     }

//     // 2️⃣ Traer los detalles de ese pedido con el nombre del producto
//     const { data: detalles, error: detalleError } = await this.supabase.client
//       .from('pedidos_detalles')
//       .select(`
//         idProducto,
//         cantidad,
//         precioUnitario,
//       `)
//       .eq('idPedido', pedido.id);

//     if (detalleError) throw detalleError;

//     // 3️⃣ Mapear al modelo
//     const pedidoConDetalles: Pedido = {
//       id: pedido.id,
//       estado: pedido.estado,
//       created_at: pedido.created_at,
//       detalles: detalles.map((d: any) => ({
//         idProducto: d.idProducto,
//         cantidad: d.cantidad,
//         precioUnitario: d.precioUnitario,
//         nombreProducto: d.menu?.nombre ?? 'Desconocido'
//       }))
//     };

//     (pedidoConDetalles as any).precioTotal = pedidoConDetalles.detalles
//     .reduce((acc, d) => acc + d.cantidad * Number(d.precioUnitario), 0);

//     return pedidoConDetalles;
//   }
// }

// // Pasa las variables como están en el componente a como deben estar para subirse a la base de datos
// function mapPlatoABaseDeDatos(payload: CrearPlatoPayload) {
//   return {
//     nombre: payload.nombre,
//     descripcion: payload.descripcion,
//     tiempo_elaboracion: payload.tiempoElaboracion,
//     precio: payload.precio,
//     tipo: payload.tipo,
//   };
// }

// // Útil para pasar base64 a Blob (si usás Camera con DataURL)
// function decodeBase64(dataUrl: string): Blob {
//   const arr = dataUrl.split(',');
//   const mime = arr[0].match(/:(.*?);/)![1];
//   const bstr = atob(arr[1]);
//   let n = bstr.length;
//   const u8arr = new Uint8Array(n);
//   while (n--) {
//     u8arr[n] = bstr.charCodeAt(n);
//   }
//   return new Blob([u8arr], { type: mime });
// }

// function traducirErrorPlato(e: any): Error {
//   const msg = (e?.message || '').toLowerCase();
//   if (e?.status === 409 || e?.code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
//     return new Error('El producto ya existe.');
//   }
//   if (e?.status === 400 || msg.includes('invalid input value for enum')) {
//     return new Error('Tipo inválido.');
//   }
//   return new Error('No se pudo crear el producto.');
// }

// Sirve para los puntos 2, 3 y 12 el TP

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

// ⬇️ Resultado homogéneo para el pedido creado
// export type CrearPedidoResult = {
//   id: number;             // id del pedido
//   total: number;          // suma(cantidad * precioUnitario)
//   tiempoEstimado: number; // max(tiempo_elaboracion de los productos)
// };
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
  //   async getClienteIdActual(autoCreate = true): Promise<number> {
  //   const { data: ures, error: uerr } = await this.supabase.client.auth.getUser();
  //   if (uerr) throw uerr;
  //   const user = ures?.user;
  //   if (!user) throw new Error('No hay usuario autenticado.');

  //   // 1) Buscar por auth_uid si tu tabla lo tiene
  //   let fila: any = null;

  //   const { data: byUid, error: e1 } = await this.supabase.client
  //     .from('usuarios')
  //     .select('id, email, auth_id')
  //     .eq('auth_id', user.id) // <-- ajustá el nombre si difiere
  //     .maybeSingle();

  //   if (e1) throw e1;
  //   fila = byUid;

  //   // 2) Si no encontró por uid, intentar por email (si existe)
  //   if (!fila && user.email) {
  //     const { data: byMail, error: e2 } = await this.supabase.client
  //       .from('usuarios')
  //       .select('id, email, auth_id')
  //       .eq('email', user.email)
  //       .maybeSingle();
  //     if (e2) throw e2;
  //     fila = byMail;
  //   }

  //   // 3) Crear en 'usuarios' si no existe y está permitido
  //   if (!fila && autoCreate) {
  //     const nuevo = {
  //       email: user.email ?? null,
  //       auth_uid: user.id,     // <-- asegurate de tener esta columna en la tabla
  //       // agregá otros campos si tu schema los pide (nombre, etc.)
  //     };
  //     const { data: ins, error: e3 } = await this.supabase.client
  //       .from('usuarios')
  //       .insert(nuevo)
  //       .select('id')
  //       .single();
  //     if (e3) throw e3;
  //     fila = ins;
  //   }

  //   if (!fila?.id) throw new Error('No se encontró/creó el cliente en la tabla usuarios.');
  //   return Number(fila.id);
  // }

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

  // ⬇️ CREA PEDIDO (encabezado + detalles) y devuelve totales calculados
  // async crearPedido(pedido: {
  //   idCliente: number;
  //   productos: { id: number; cantidad: number; precio_unitario: number }[];
  // }): Promise<CrearPedidoResult> {
  //   // 1) Crear encabezado
  //   const { data: pedidoData, error: pedidoError } = await this.supabase.client
  //     .from('pedidos')
  //     .insert([{ idCliente: pedido.idCliente, estado: 'pendiente' }])
  //     .select('id')
  //     .single();

  //   if (pedidoError) throw pedidoError;
  //   const idPedido: number = pedidoData.id;

  //   // 2) Insertar detalles
  //   const detalles = pedido.productos.map(p => ({
  //     idPedido: idPedido,
  //     idProducto: p.id,
  //     cantidad: p.cantidad,
  //     precioUnitario: p.precio_unitario
  //   }));

  //   const { error: detalleError } = await this.supabase.client
  //     .from('pedidos_detalles')
  //     .insert(detalles);

  //   if (detalleError) throw detalleError;

  //   // 3) Calcular total (usando precios del payload)
  //   const total = pedido.productos.reduce(
  //     (acc, p) => acc + (Number(p.precio_unitario) || 0) * (Number(p.cantidad) || 0),
  //     0
  //   );

  //   // 4) Calcular tiempoEstimado (máximo tiempo_elaboracion de los productos)
  //   const ids = Array.from(new Set(pedido.productos.map(p => p.id)));
  //   let tiempoEstimado = 0;
  //   if (ids.length) {
  //     const { data: menuRows, error: menuErr } = await this.supabase.client
  //       .from('menu')
  //       .select('id, tiempo_elaboracion')
  //       .in('id', ids);

  //     if (menuErr) throw menuErr;

  //     const tiempos = new Map<any, number>();
  //     (menuRows || []).forEach(r => tiempos.set(r.id, Number(r.tiempo_elaboracion) || 0));
  //     tiempoEstimado = pedido.productos.reduce(
  //       (max, p) => Math.max(max, tiempos.get(p.id) ?? 0),
  //       0
  //     );
  //   }

  //   // 5) (Opcional) persistir total/tiempo si existen las columnas
  //   try {
  //     await this.supabase.client
  //       .from('pedidos')
  //       .update({ total, tiempo_estimado: tiempoEstimado })
  //       .eq('id', idPedido);
  //     // si las columnas no existen, este update podría fallar -> lo ignoramos
  //   } catch (e) {
  //     console.warn('[crearPedido] No se actualizó total/tiempo_estimado (columna inexistente o RLS).', e);
  //   }

  //   return { id: idPedido, total, tiempoEstimado };
  // }
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

  // ⬇️ Último pedido de un cliente (con resumen listo para render)
  // async getUltimoPedidoDeCliente(clienteId: number) {
  //   const { data: p, error } = await this.supabase.client
  //     .from('pedidos')
  //     .select('id')
  //     .eq('idCliente', clienteId)
  //     .order('created_at', { ascending: false })
  //     .limit(1)
  //     .maybeSingle();
  //   if (error) throw error;
  //   if (!p) return null;
  //   return this.getPedidoResumen(p.id);
  // }
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
