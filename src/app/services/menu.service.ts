// Sirve para los puntos 2, 3 y 12 el TP

import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pedido, PedidoDetalle } from '../models/pedido.model'

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

export type CrearPedidoResult = {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly BUCKET = 'menu';
  private readonly TIMEOUT_MS = 10000;

  constructor(private supabase: SupabaseService) {}

  async existePlato(nombre: string): Promise<boolean> {
    console.log('[existePlato] Verificando existencia de:', nombre);

    const { data, error } = await this.supabase.client
      .from('menu')
      .select('id')
      .eq('nombre', nombre)
      .maybeSingle();

    console.log('[existePlato] Resultado:', { data, error });

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }

  async crearPlatoConFotos(payload: CrearPlatoPayload): Promise<CrearPlatoResult> {
    console.log('[crearPlatoConFotos] Método invocado');

    /*
    const session = await this.supabase.waitForSession(3000);
    if (!session?.user?.id) {
      console.warn('No se pudo obtener sesión válida desde Supabase.');
      throw new Error('Sesión expirada o inválida. Por favor, iniciá sesión nuevamente.');
    }
      */

    const { nombre, descripcion, tiempoElaboracion, precio, tipo, fotos } = payload;

    console.log('[crearPlatoConFotos] Cliente:', this.supabase.client);
    console.log('Cliente de supabase:', this.supabase.client);

    let inserted: any = null;
    let insErr: any = null;

    console.log('Empezando a ejecutar insert...');
    try {
      console.log('Ejecutando insert...');
      const result = await this.supabase.client
        .from('menu')
        .insert([mapPlatoABaseDeDatos(payload)])
        .select('id')
        .single();

      inserted = result.data;
      insErr = result.error;

      console.log('Insert terminó', { inserted, insErr });

      if (insErr || !inserted) {
        console.error('Error al insertar en Supabase:', insErr);
        throw traducirErrorPlato(insErr);
      }

    } catch (e) {
      console.error("Excepción inesperada al hacer insert:", e);
      throw e;
    }

    const id = inserted.id;
    const urlFotos: string[] = [];

    console.log(`Se creó con éxito el producto. Id del producto: ${id}`);

    // 2) Subir fotos al bucket
    for (const [index, foto] of fotos.entries()) {
      const path = `fotos/${id}-${index + 1}.jpg`;

      const { error: upErr } = await this.supabase.client.storage
        .from(this.BUCKET)
        .upload(path, decodeBase64(foto), { upsert: true, contentType: 'image/jpeg' });

      if (upErr) throw new Error('No se pudo subir la foto ' + (index + 1));

      const { data } = this.supabase.client.storage.from(this.BUCKET).getPublicUrl(path);
      urlFotos.push(data.publicUrl);
    }

    // 3) Actualizar fila con URLs de fotos
    const { error: updErr } = await this.supabase.client
      .from('menu')
      .update({
        foto1: urlFotos[0],
        foto2: urlFotos[1],
        foto3: urlFotos[2],
      })
      .eq('id', id)
      .single();

    if (updErr) {
      throw new Error('Producto creado, pero no se pudieron guardar las fotos.');
    }

    return { id, nombre, fotos: urlFotos };
  }

  async obtenerMenu() {
    const { data, error } = await this.supabase.client
      .from('menu')
      .select('*');
    if (error) throw error;
    return data;
  }

  async crearPedido(pedido: {
    idCliente: number;
    productos: { id: number; cantidad: number; precio_unitario: number }[];
  }): Promise<CrearPedidoResult> {

    console.log('Empezando a cargar pedido');

    try {
      // 1️⃣ Insertar pedido y obtener el ID generado
      const { data: pedidoData, error: pedidoError } = await this.supabase.client
        .from('pedidos')
        .insert([
          { idCliente: pedido.idCliente, estado: 'pendiente' }
        ])
        .select('id')
        .single(); // .single() devuelve un objeto, no un array

      if (pedidoError) throw pedidoError;

      console.log('Pedido insertado en la tabla pedidos')

      const idPedido = pedidoData.id;

      // 2️⃣ Preparar los detalles del pedido
      const detalles = pedido.productos.map(p => ({
        idPedido: idPedido,
        idProducto: p.id,
        cantidad: p.cantidad,
        precioUnitario: p.precio_unitario
      }));

      // 3️⃣ Insertar detalles
      const { error: detalleError } = await this.supabase.client
        .from('pedidos_detalles')
        .insert(detalles);

      if (detalleError) throw detalleError;

      console.log('Pedido creado correctamente con id:', idPedido);
      return idPedido;

    } catch (error) {
      console.error('Error al crear pedido:', error);
      throw error;
    }
  }

  async cargarPedido(idPedido: string): Promise<Pedido | null> {

    // 1️⃣ Traer el pedido
    const { data: pedido, error: pedidoError } = await this.supabase.client
      .from('pedidos')
      .select('*')
      .eq('id', idPedido)
      .single();

    if (pedidoError) {
      if (pedidoError.code === 'PGRST116') {
        // No hay pedido
        return null;
      }
      throw pedidoError;
    }

    // 2️⃣ Traer los detalles de ese pedido con el nombre del producto
    const { data: detalles, error: detalleError } = await this.supabase.client
      .from('pedidos_detalles')
      .select(`
        idProducto,
        cantidad,
        precioUnitario,
      `)
      .eq('idPedido', pedido.id);

    if (detalleError) throw detalleError;

    // 3️⃣ Mapear al modelo
    const pedidoConDetalles: Pedido = {
      id: pedido.id,
      estado: pedido.estado,
      created_at: pedido.created_at,
      detalles: detalles.map((d: any) => ({
        idProducto: d.idProducto,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        nombreProducto: d.menu?.nombre ?? 'Desconocido'
      }))
    };

    (pedidoConDetalles as any).precioTotal = pedidoConDetalles.detalles
    .reduce((acc, d) => acc + d.cantidad * Number(d.precioUnitario), 0);

    return pedidoConDetalles;
  }
}

// Pasa las variables como están en el componente a como deben estar para subirse a la base de datos
function mapPlatoABaseDeDatos(payload: CrearPlatoPayload) {
  return {
    nombre: payload.nombre,
    descripcion: payload.descripcion,
    tiempo_elaboracion: payload.tiempoElaboracion,
    precio: payload.precio,
    tipo: payload.tipo,
  };
}

// Útil para pasar base64 a Blob (si usás Camera con DataURL)
function decodeBase64(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
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

