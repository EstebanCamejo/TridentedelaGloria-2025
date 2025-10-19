// src/app/services/encuestas.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ChartItem = { name: string; value: number };
export type ResultadosEncuesta = {
  limpieza: ChartItem[];
  aspecto_valorado: ChartItem[];
  servicios_extra: ChartItem[];
};

// CAMBIO: claves estrictas para evitar TS4111
type ClaveAgg = 'limpieza' | 'aspecto_valorado' | 'servicios_extra';

// >>> NUEVO: payload para enviar una respuesta de encuesta
export type EnviarEncuestaPayload = {
  encuesta_id: string;                 // id de la encuesta (UUID)
  lista_espera_id?: string | null;     // si ya la tenemos disponible
  mesas_id?: string | null;            // si ya la tenemos disponible
  user_id?: string | null;             // opcional
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
  async getResultados(
    encuestaId = '00000000-0000-0000-0000-000000000001'
  ): Promise<ResultadosEncuesta> {
    return this.useMock
      ? this.getResultadosMock()
      : this.getResultadosDesdeSupabase(encuestaId);
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
    
    // Agregar timeout de 5 segundos para evitar espera infinita
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

  // =========================
  // ESCRITURA (enviar respuesta)
  // =========================

  /**
   * Inserta una respuesta de encuesta en `encuesta_respuestas`.
   * Sube fotos (si hay) al bucket `encuestas` y guarda sus URLs en foto_urls.
   */
  async enviarEncuesta(p: EnviarEncuestaPayload): Promise<EnviarEncuestaResult> {
    // validaciones mínimas
    if (!p.encuesta_id) throw new Error('Encuesta inválida.');
    if (!p.calificacion_limpieza) throw new Error('Ingresá tu calificación de limpieza.');
    if (!p.aspecto_valorado) throw new Error('Indicá qué aspecto valoraste.');

    // VALIDACIÓN: Verificar que puede completar encuesta (mesa asignada)
    const puedeCompletar = await this.supa.puedeCompletarEncuesta();
    if (!puedeCompletar) {
      throw new Error('Solo puedes completar la encuesta mientras tienes mesa asignada.');
    }

    // NUEVA VALIDACIÓN: Verificar que no haya completado ya una encuesta
    const yaCompleto = await this.supa.yaCompletoEncuesta();
    if (yaCompleto) {
      throw new Error('Ya completaste la encuesta para esta estadía.');
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
    const insertData: any = {
      encuesta_id: p.encuesta_id,
      lista_espera_id: p.lista_espera_id ?? null,
      mesas_id: p.mesas_id ?? null,
      user_id: p.user_id ?? null,
      calificacion_limpieza: p.calificacion_limpieza,
      aspecto_valorado: p.aspecto_valorado,
      servicios_adicionales: p.servicios_adicionales ?? [],
      mensaje: p.mensaje ?? null,
      foto_urls: foto_urls ?? null,
    };

    // IMPORTANTE: el nombre de la tabla es la que ya tenés: encuesta_respuestas (plural)
    const { data, error } = await this.supa.client
      .from('encuesta_respuestas')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;

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
