// src/app/services/encuestas.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ChartItem = { name: string; value: number };
export type ResultadosEncuesta = {
  limpieza: ChartItem[];
  aspecto_valorado: ChartItem[];
  servicios_extra: ChartItem[];
};

// 🆕 Tipo para resultados combinados (mesa + delivery separados)
export type ResultadosEncuestasCombinadas = {
  mesa: ResultadosEncuesta;
  delivery: ResultadosEncuesta;
};

// CAMBIO: claves estrictas para evitar TS4111
type ClaveAgg = 'limpieza' | 'aspecto_valorado' | 'servicios_extra';

// >>> NUEVO: payload para enviar una respuesta de encuesta
export type EnviarEncuestaPayload = {
  encuesta_id: string;                 // id de la encuesta (UUID)
  lista_espera_id?: string | null;     // si ya la tenemos disponible
  mesas_id?: string | null;            // si ya la tenemos disponible
  user_id?: string | null;             // opcional
  pedido_id?: number | null;           // 🆕 ID del pedido (para delivery)
  calificacion_limpieza: 1|2|3|4|5;
  aspecto_valorado: string;            // ej: 'calidad_comida', 'atencion', etc.
  servicios_adicionales?: string[];    // ej: ['wifi','juegos','menu_sin_tacc']
  mensaje?: string | null;
  fotos?: Blob[];                      // opcional: fotos tomadas desde la cámara
};

// >>> NUEVO: resultado al crear
export type EnviarEncuestaResult = {
  id: string;
  foto_urls?: string[];
};

@Injectable({ providedIn: 'root' })
export class EncuestasService {
  private useMock = false; // usamos BD real
  // >>> NUEVO: bucket para fotos de encuestas (creá "encuestas" público en Storage)
  private readonly BUCKET = 'encuestas';

  constructor(private supa: SupabaseService) {}

  // =========================
  // LECTURA (gráficos)
  // =========================
  /**
   * Obtiene resultados de una encuesta específica
   */
  async getResultados(
    encuestaId?: string // Opcional, si no se proporciona obtiene ambas separadas
  ): Promise<ResultadosEncuesta | ResultadosEncuestasCombinadas> {
    if (this.useMock) {
      return this.getResultadosMock();
    }
    
    // 🆕 Si no se especifica encuestaId, obtener ambas separadas (mesa + delivery)
    if (!encuestaId) {
      return await this.getResultadosSeparados();
    }
    
    // Si se especifica una encuesta específica, usar el método original
    return await this.getResultadosDesdeSupabase(encuestaId);
  }
  
  /**
   * 🆕 Obtiene resultados de encuestas de mesa y delivery SEPARADOS (no mezclados)
   * Primero mesa, luego delivery
   */
  private async getResultadosSeparados(): Promise<ResultadosEncuestasCombinadas> {
    console.log('[EncuestasService] 🔄 Obteniendo resultados separados (mesa + delivery)...');
    
    const encuestaMesaId = '00000000-0000-0000-0000-000000000001';
    const encuestaDeliveryId = '00000000-0000-0000-0000-000000000002';
    
    try {
      // Obtener resultados de ambas encuestas en paralelo
      const [resultadosMesa, resultadosDelivery] = await Promise.all([
        this.getResultadosDesdeSupabase(encuestaMesaId),
        this.getResultadosDesdeSupabase(encuestaDeliveryId)
      ]);
      
      console.log('[EncuestasService] 📊 Resultados mesa:', resultadosMesa);
      console.log('[EncuestasService] 📊 Resultados delivery:', resultadosDelivery);
      
      // 🆕 Devolver separados, NO mezclados
      return {
        mesa: resultadosMesa,
        delivery: resultadosDelivery
      };
    } catch (error) {
      console.error('[EncuestasService] ❌ Error al obtener resultados separados:', error);
      // Si falla, intentar solo con encuesta de mesa como fallback
      console.log('[EncuestasService] ⚠️ Fallback: obteniendo solo encuesta de mesa...');
      const resultadosMesa = await this.getResultadosDesdeSupabase(encuestaMesaId);
      return {
        mesa: resultadosMesa,
        delivery: {
          limpieza: [],
          aspecto_valorado: [],
          servicios_extra: []
        }
      };
    }
  }

  private async getResultadosMock(): Promise<ResultadosEncuesta> {
    return {
      limpieza: [
        { name: '1', value: 3 }, { name: '2', value: 4 }, { name: '3', value: 9 },
        { name: '4', value: 15 }, { name: '5', value: 18 },
      ],
      aspecto_valorado: [
        { name: 'Atención del personal', value: 22 },
        { name: 'Calidad de la comida', value: 25 },
        { name: 'Tiempo de espera', value: 11 },
        { name: 'Ambiente/Música', value: 14 },
      ],
      servicios_extra: [
        { name: 'Zona de juegos', value: 16 },
        { name: 'Menú sin TACC', value: 20 },
        { name: 'Bebidas sin azúcar', value: 10 },
        { name: 'Shows en vivo', value: 8 },
      ],
    };
  }

  private async getResultadosDesdeSupabase(encuestaId: string): Promise<ResultadosEncuesta> {
    console.log('[EncuestasService] 🔄 Obteniendo resultados...');
    console.log('[EncuestasService] encuesta_id:', encuestaId);
    
    const esDelivery = encuestaId === '00000000-0000-0000-0000-000000000002';
    
    // 🆕 Si es encuesta de delivery, consultar directamente encuesta_respuesta con pedido_id
    // porque v_encuesta_agg probablemente solo incluye encuestas de mesa (lista_espera_id)
    if (esDelivery) {
      console.log('[EncuestasService] 🔍 Es encuesta de delivery, consultando directamente encuesta_respuesta...');
      return await this.getResultadosDeliveryDirecto(encuestaId);
    }
    
    // Para encuestas de mesa, usar la vista v_encuesta_agg
    const consultaPromise = this.supa.client
      .from('v_encuesta_agg')
      .select('clave, etiqueta, cantidad')
      .eq('encuesta_id', encuestaId);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('La consulta a la base de datos está tardando demasiado. Verifica tu conexión a internet o intenta nuevamente.')), 5000)
    );
    
    const { data, error } = await Promise.race([consultaPromise, timeoutPromise]) as any;

    console.log('[EncuestasService] 📊 Consulta completada');
    console.log('[EncuestasService] Data:', data);
    console.log('[EncuestasService] Error:', error);

    if (error) {
      console.error('[EncuestasService] ❌ Error en consulta:', error);
      throw error;
    }

    const byClave: Record<ClaveAgg, ChartItem[]> = {
      limpieza: [],
      aspecto_valorado: [],
      servicios_extra: [],
    };

    for (const row of (data ?? []) as Array<{ clave: ClaveAgg; etiqueta: string; cantidad: number }>) {
      byClave[row.clave].push({ name: String(row.etiqueta), value: Number(row.cantidad) });
    }

    // ordenar 1..5 para barras de limpieza
    byClave.limpieza.sort((a, b) => Number(a.name) - Number(b.name));

    return {
      limpieza: byClave.limpieza,
      aspecto_valorado: byClave.aspecto_valorado,
      servicios_extra: byClave.servicios_extra,
    };
  }
  
  /**
   * 🆕 Obtiene resultados de encuestas de delivery consultando directamente encuesta_respuesta
   * porque v_encuesta_agg probablemente solo incluye encuestas de mesa
   */
  private async getResultadosDeliveryDirecto(encuestaId: string): Promise<ResultadosEncuesta> {
    console.log('[EncuestasService] 🔍 Consultando encuesta_respuesta directamente para delivery...');
    
    try {
      // Obtener todas las respuestas de encuestas de delivery
      // 🆕 NOTA: La columna en la BD es "servicios_adicionales", no "servicios_extra"
      const { data: respuestas, error } = await this.supa.client
        .from('encuesta_respuesta')
        .select('calificacion_limpieza, aspecto_valorado, servicios_adicionales')
        .eq('encuesta_id', encuestaId)
        .not('pedido_id', 'is', null); // Solo respuestas con pedido_id (delivery)
      
      if (error) {
        console.error('[EncuestasService] ❌ Error al consultar encuesta_respuesta:', error);
        throw error;
      }
      
      console.log('[EncuestasService] 📊 Respuestas de delivery encontradas:', respuestas?.length || 0);
      
      const byClave: Record<ClaveAgg, ChartItem[]> = {
        limpieza: [],
        aspecto_valorado: [],
        servicios_extra: [],
      };
      
      // Agregar limpieza (1-5)
      const limpiezaCounts: Record<string, number> = {};
      respuestas?.forEach(r => {
        if (r.calificacion_limpieza) {
          const key = String(r.calificacion_limpieza);
          limpiezaCounts[key] = (limpiezaCounts[key] || 0) + 1;
        }
      });
      for (const [name, value] of Object.entries(limpiezaCounts)) {
        byClave.limpieza.push({ name, value });
      }
      byClave.limpieza.sort((a, b) => Number(a.name) - Number(b.name));
      
      // Agregar aspecto_valorado
      const aspectoCounts: Record<string, number> = {};
      respuestas?.forEach(r => {
        if (r.aspecto_valorado) {
          const key = String(r.aspecto_valorado);
          aspectoCounts[key] = (aspectoCounts[key] || 0) + 1;
        }
      });
      for (const [name, value] of Object.entries(aspectoCounts)) {
        byClave.aspecto_valorado.push({ name, value });
      }
      
      // Agregar servicios_adicionales (array de strings)
      // 🆕 NOTA: La columna en la BD es "servicios_adicionales", no "servicios_extra"
      const serviciosCounts: Record<string, number> = {};
      respuestas?.forEach(r => {
        // Usar servicios_adicionales (nombre real en BD) o servicios_extra (alias)
        let servicios = (r as any).servicios_adicionales || (r as any).servicios_extra;
        
        // Si servicios es un string JSON, parsearlo
        if (typeof servicios === 'string') {
          try {
            servicios = JSON.parse(servicios);
          } catch (e) {
            console.warn('[EncuestasService] ⚠️ Error al parsear servicios_adicionales como JSON:', servicios);
            servicios = null;
          }
        }
        
        if (servicios && Array.isArray(servicios)) {
          servicios.forEach((servicio: string) => {
            if (servicio) {
              serviciosCounts[servicio] = (serviciosCounts[servicio] || 0) + 1;
            }
          });
        }
      });
      for (const [name, value] of Object.entries(serviciosCounts)) {
        byClave.servicios_extra.push({ name, value });
      }
      
      console.log('[EncuestasService] 📊 Resultados procesados:', {
        limpieza: byClave.limpieza.length,
        aspecto_valorado: byClave.aspecto_valorado.length,
        servicios_extra: byClave.servicios_extra.length
      });
      
      return {
        limpieza: byClave.limpieza,
        aspecto_valorado: byClave.aspecto_valorado,
        servicios_extra: byClave.servicios_extra,
      };
    } catch (error) {
      console.error('[EncuestasService] ❌ Error al obtener resultados de delivery:', error);
      // Si falla, devolver vacío
      return {
        limpieza: [],
        aspecto_valorado: [],
        servicios_extra: [],
      };
    }
  }

  // =========================
  // ESCRITURA (enviar respuesta)
  // =========================

  /**
   * Inserta una respuesta de encuesta en `encuesta_respuestas`.
   * Sube fotos (si hay) al bucket `encuestas` y guarda sus URLs en foto_urls.
   */
  async enviarEncuesta(p: EnviarEncuestaPayload): Promise<EnviarEncuestaResult> {
    console.log('[DEBUG ENCUESTA] === INICIANDO ENVÍO DE ENCUESTA ===');
    console.log('[DEBUG ENCUESTA] Payload recibido:', p);
    
    // validaciones mínimas
    if (!p.encuesta_id) throw new Error('Encuesta inválida.');
    if (!p.calificacion_limpieza) throw new Error('Ingresá tu calificación de limpieza.');
    if (!p.aspecto_valorado) throw new Error('Indicá qué aspecto valoraste.');

    console.log('[DEBUG ENCUESTA] Validaciones básicas OK');

    // 🆕 Detectar si es encuesta de delivery por el encuesta_id
    const esDelivery = p.encuesta_id === '00000000-0000-0000-0000-000000000002';
    
    // 🆕 Variable lista_espera_id (solo para mesa)
    let lista_espera_id: string | null = null;

    if (esDelivery) {
      // Para delivery, no necesitamos validar mesa asignada
      // Solo verificamos que el pedido esté entregado (validación hecha en componente)
      console.log('[DEBUG ENCUESTA] 🚚 Encuesta de delivery detectada, saltando validación de mesa');
      lista_espera_id = null; // No hay lista_espera para delivery
    } else {
      // VALIDACIÓN: Verificar que puede completar encuesta (mesa asignada)
      console.log('[DEBUG ENCUESTA] Verificando si puede completar encuesta...');
      const puedeCompletar = await this.supa.puedeCompletarEncuesta();
      console.log('[DEBUG ENCUESTA] Puede completar encuesta:', puedeCompletar);
      if (!puedeCompletar) {
        console.log('[DEBUG ENCUESTA] ❌ No puede completar - mesa no asignada');
        throw new Error('Solo puedes completar la encuesta mientras tienes mesa asignada.');
      }

      // NUEVA VALIDACIÓN: Verificar que no haya completado ya una encuesta
      console.log('[DEBUG ENCUESTA] Verificando si ya completó encuesta...');
      const yaCompleto = await this.supa.yaCompletoEncuesta();
      console.log('[DEBUG ENCUESTA] Ya completó encuesta:', yaCompleto);
      if (yaCompleto) {
        console.log('[DEBUG ENCUESTA] ❌ Ya completó encuesta');
        throw new Error('Ya completaste la encuesta para esta estadía.');
      }

      // Obtener el lista_espera_id automáticamente si no se proporcionó
      lista_espera_id = p.lista_espera_id || null;
      console.log('[DEBUG ENCUESTA] Lista espera ID inicial:', lista_espera_id);
      if (!lista_espera_id) {
        console.log('[DEBUG ENCUESTA] Obteniendo waitStatus automáticamente...');
        const waitStatus = await this.supa.getWaitStatusDetail();
        console.log('[DEBUG ENCUESTA] WaitStatus obtenido:', waitStatus);
        if (waitStatus?.id) {
          lista_espera_id = String(waitStatus.id);
          console.log('[DEBUG ENCUESTA] Lista espera ID obtenido:', lista_espera_id);
        }
      }
    }

    // 1) Subir fotos si vinieron
    let foto_urls: string[] | undefined;
    if (p.fotos?.length) {
      // subimos y guardamos las públicas
      foto_urls = [];
      for (const blob of p.fotos) {
        const url = await this.subirFotoEncuesta(p.encuesta_id, blob);
        foto_urls.push(url);
      }
    }

    // 2) INSERT
    // CORRECCIÓN: Convertir lista_espera_id a UUID válido (solo si no es delivery)
    const listaEsperaUuid = (esDelivery || !lista_espera_id) ? null : 
      `00000000-0000-0000-0000-${String(lista_espera_id).padStart(12, '0')}`;
    console.log('[DEBUG ENCUESTA] Lista espera ID convertido a UUID:', listaEsperaUuid);
    
    const insertData: any = {
      encuesta_id: p.encuesta_id,
      lista_espera_id: listaEsperaUuid,
      mesas_id: p.mesas_id ?? null,
      user_id: p.user_id ?? null,
      pedido_id: p.pedido_id ?? null, // 🆕 Campo pedido_id para delivery
      calificacion_limpieza: p.calificacion_limpieza,
      aspecto_valorado: p.aspecto_valorado,
      servicios_adicionales: p.servicios_adicionales ?? [],
      mensaje: p.mensaje ?? null,
      foto_urls: foto_urls ?? null,
    };

    console.log('[DEBUG ENCUESTA] Datos para insertar:', insertData);

    // IMPORTANTE: el nombre de la tabla es encuesta_respuesta (singular)
    console.log('[DEBUG ENCUESTA] Ejecutando INSERT en encuesta_respuesta...');
    const { data, error } = await this.supa.client
      .from('encuesta_respuesta')
      .insert(insertData)
      .select('id')
      .single();

    console.log('[DEBUG ENCUESTA] Resultado INSERT:', { data, error });
    if (error) {
      console.log('[DEBUG ENCUESTA] ❌ Error en INSERT:', error);
      throw error;
    }

    console.log('[DEBUG ENCUESTA] ✅ Encuesta enviada exitosamente, ID:', data.id);
    return { id: data.id as string, foto_urls };
  }

  // >>> NUEVO: helper para subir una foto al bucket "encuestas"
  private async subirFotoEncuesta(encuestaId: string, blob: Blob): Promise<string> {
    const ext = this.detectExt(blob.type); // .jpg o .png
    const name = (globalThis.crypto?.randomUUID?.() ?? String(Date.now())) + ext;
    const path = `${encuestaId}/${name}`;

    const { error } = await this.supa.client.storage
      .from(this.BUCKET)
      .upload(path, blob, { upsert: false, contentType: blob.type || 'image/jpeg' });

    if (error) throw new Error('No se pudo subir la imagen de la encuesta.');

    const { data } = this.supa.client.storage.from(this.BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  private detectExt(mime?: string): '.jpg' | '.png' {
    if (!mime) return '.jpg';
    return mime.includes('png') ? '.png' : '.jpg';
  }

  /**
   * Verifica si el cliente puede completar una encuesta (mesa asignada Y pagado)
   */
  async puedeCompletarEncuesta(): Promise<boolean> {
    return await this.supa.puedeCompletarEncuestaConPago();
  }

  /**
   * Verifica si el cliente ya completó una encuesta para su estadía actual
   */
  async yaCompletoEncuesta(): Promise<boolean> {
    return await this.supa.yaCompletoEncuesta();
  }

  /**
   * 🆕 Verifica si el cliente ya completó una encuesta para un pedido delivery específico
   */
  async yaCompletoEncuestaDelivery(pedidoId: number): Promise<boolean> {
    try {
      console.log('[EncuestasService] Verificando si ya completó encuesta delivery para pedido:', pedidoId);
      
      const encuestaDeliveryId = '00000000-0000-0000-0000-000000000002';
      
      // 🆕 Buscar encuesta directamente por pedido_id (más preciso)
      const { data, error } = await this.supa.client
        .from('encuesta_respuesta')
        .select('id')
        .eq('encuesta_id', encuestaDeliveryId)
        .eq('pedido_id', pedidoId);

      if (error) {
        console.error('[EncuestasService] Error al verificar encuesta delivery:', error);
        return false;
      }

      const yaCompleto = data && data.length > 0;
      
      if (yaCompleto) {
        console.log('[EncuestasService] ✅ Ya completó encuesta delivery para pedido:', pedidoId);
      } else {
        console.log('[EncuestasService] No se encontró encuesta delivery completada para pedido:', pedidoId);
      }
      
      return yaCompleto;
    } catch (error) {
      console.error('[EncuestasService] Error al verificar encuesta delivery:', error);
      return false;
    }
  }

  
  // async guardarFotosRespuesta(respuestaId: string, blobs: Blob[]): Promise<void> {
  //   if (!respuestaId || !blobs?.length) return;

  //   const bucket = 'encuestas'; 
  //   const basePath = `respuestas/${respuestaId}`;

  //   const urls: string[] = [];

  //   for (let i = 0; i < blobs.length; i++) {
  //     const path = `${basePath}/${Date.now()}_${i+1}.jpg`;
  //     const up = await this.supa.client.storage.from(bucket)
  //       .upload(path, blobs[i], { upsert: true, contentType: 'image/jpeg' });

  //     if (up.error) throw up.error;

  //     const { data } = this.supa.client.storage.from(bucket).getPublicUrl(path);
  //     urls.push(data.publicUrl);
  //   }

  //   // Actualizamos la fila con las URLs
  //   const upd = await this.supa.client
  //     .from('encuesta_respuestas')
  //     .update({ foto_urls: urls })
  //     .eq('id', respuestaId);

  //   if (upd.error) throw upd.error;
  // }

}
