// Sirve para los puntos 2, 3, 12, 16 y 17

import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pedido, PedidoDetalle, PedidoConMesaYDetalles } from '../models/pedido.model'

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
    idCliente: string;
    productos: { id: number; cantidad: number; precio_unitario: number }[];
    precioAcumulado: number;
    tiempoDeEspera: number;
  }): Promise<CrearPedidoResult> {

    console.log('Empezando a cargar pedido');

    try {
      // 1️⃣ Insertar pedido y obtener el ID generado
      const { data: pedidoData, error: pedidoError } = await this.supabase.client
        .from('pedidos')
        .insert([
          { idCliente: pedido.idCliente, estado: 'pendiente', total: pedido.precioAcumulado, tiempo_estimado: pedido.tiempoDeEspera }
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

  /*
   IMPORTANTE: para mostrar los productos de los pedidos de cada sector (cocina o bar), se toman los pedidos que están
   en estado "pendiente" o "confirmado". La idea en el futuro es que solo tome los pedidos en estado "confirmado", pero
   de momento falta la parte en la que el mozo confirma el pedido (punto 14), y recién en ese momento el pedido pasa de
   "pendiente" a "confirmado". Recién en esa instancia debería verse el pedido en "Verificar pendientes". Cuando cualquiera
   de los dos sectores recibe los productos correspondientes, el estado del pedido debería cambiar a "en preparacion" y 
   "estado_sector_cocina" o "estado_sector_bar" debería también cambiar a "en preparacion" según corresponda.
  */
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

