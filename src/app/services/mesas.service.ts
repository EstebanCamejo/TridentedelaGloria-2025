import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import QRCode from 'qrcode';
import { environment } from 'src/environments/environment';
export type MesaTipo = 'vip' | 'estandar' | 'mov_reducida';

export interface CrearMesaPayload {
  numero: number;
  capacidad: number;
  tipo: MesaTipo;
  fotoBlob: Blob;
}

export interface CrearMesaResult {
  id: string;
  numero: number;
  qr_text: string;
  foto_url: string;
  qr_img_url: string;
}

/** <-- FALTABA exportarlo, lo usan otros componentes */
export interface MesaRow {
  id: string;
  numero: number;
  capacidad: number;
  tipo: MesaTipo;
  estado: 'libre' | 'ocupada' | 'reservada' | 'bloqueada';
  foto_url: string | null;
  qr_text: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class MesasService {
  private readonly BUCKET = 'mesas';
  private readonly FN_URL = `${environment.supabaseUrl.replace('/rest/v1', '')}/functions/v1/alta-mesa`;
  private readonly ANON   = environment.supabaseAnonKey;
  
  constructor(private supa: SupabaseService) {}

  /** True si NO existe una mesa con ese número */
  async numeroDisponible(numero: number): Promise<boolean> {
    const { count, error } = await this.supa.client
      .from('mesas')
      .select('id', { count: 'exact', head: true })
      .eq('numero', numero);
    if (error) throw error;
    return (count ?? 0) === 0;
  }

  /** <-- LO PIDEN TUS COMPONENTES */
  async getMesaById(id: string): Promise<MesaRow> {
    const { data, error } = await this.supa.client
      .from('mesas')
      .select('id, numero, capacidad, tipo, estado, foto_url, qr_text, created_at, updated_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as MesaRow;
  }

  /** <-- LO PIDEN TUS COMPONENTES */
  async getMesaByNumero(numero: number): Promise<MesaRow> {
    const { data, error } = await this.supa.client
      .from('mesas')
      .select('id, numero, capacidad, tipo, estado, foto_url, qr_text, created_at, updated_at')
      .eq('numero', numero)
      .single();
    if (error) throw error;
    return data as MesaRow;
  }

  // /**
  //  * Flujo completo y estable:
  //  * 1) INSERT (rápido)
  //  * 2) Compactar/subir foto
  //  * 3) Generar + subir QR
  //  * 4) UPDATE fila con foto_url/qr_text
  //  */
  // async crearMesa(payload: CrearMesaPayload): Promise<CrearMesaResult> {
  //   const { numero, capacidad, tipo, fotoBlob } = payload;
  //   if (!fotoBlob) throw new Error('La foto de la mesa es obligatoria.');
  //   if (!numero || numero <= 0) throw new Error('Número inválido.');
  //   if (!capacidad || capacidad <= 0) throw new Error('Capacidad inválida.');

  //   // 1) INSERT
  //   const ins = await this.supa.client
  //     .from('mesas')
  //     .insert({ numero, capacidad, tipo }) // columna = "tipo" (enum tipo_mesa)
  //     .select('id, numero')
  //     .single();
  //   if (ins.error) throw this.traducirErrorMesa(ins.error);

  //   const mesaId = ins.data!.id as string;
  //   const mesaNumero = ins.data!.numero as number;

  //   // 2) Foto (compactación rápida si es muy grande)
  //   const fotoOptimizada = await this.compactarJpeg(fotoBlob, 0.72); // ~70–75%
  //   const foto_url = await this.subirFotoPorId(mesaId, fotoOptimizada);

  //   // 3) QR
  //   const { qr_text, qr_img_url } = await this.generarYSubirQr(mesaId, mesaNumero);

  //   // 4) UPDATE
  //   const upd = await this.supa.client
  //     .from('mesas')
  //     .update({ foto_url, qr_text })
  //     .eq('id', mesaId)
  //     .single();
  //   if (upd.error) throw new Error('Mesa creada, pero no se pudo guardar foto/QR en la base.');

  //   return { id: mesaId, numero: mesaNumero, qr_text, foto_url, qr_img_url };
  // }


  // dentro de MesasService
  private async withTimeout<T>(p: any, ms = 10000, label = 'op'): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);

    try {
      // @ts-ignore: supabase-js pasa internamente signal en fetch
      const res = await p;
      clearTimeout(timer);
      return res;
    } catch (e: any) {
      clearTimeout(timer);
      if (e?.name === 'AbortError') {
        throw new Error(`Timeout en ${label} (${ms} ms). Reintentá.`);
      }
      throw e;
    }
  }


  // dentro de MesasService
  // private blobToDataUrl(blob: Blob): Promise<string> {
  //   return new Promise((resolve, reject) => {
  //     const fr = new FileReader();
  //     fr.onload = () => resolve(fr.result as string);
  //     fr.onerror = reject;
  //     fr.readAsDataURL(blob);
  //   });
  // }

// [CAMBIO PASO 3B] Evita spread + fromCharCode que desborda la pila.
// Usa FileReader.readAsDataURL que maneja binarios grandes sin recursión.
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onerror = () => reject(fr.error || new Error('No se pudo leer la imagen.'));
        fr.onload = () => resolve(String(fr.result)); // "data:image/jpeg;base64,..."
        fr.readAsDataURL(blob);
      } catch (e) {
        reject(e);
      }
    });
  }

  

  // async crearMesaViaFunction(p: CrearMesaPayload): Promise<CrearMesaResult> {
  //   const { numero, capacidad, tipo, fotoBlob } = p;
  
  //   if (!fotoBlob) throw new Error('La foto de la mesa es obligatoria.');
  //   if (!numero || numero <= 0) throw new Error('Número inválido.');
  //   if (!capacidad || capacidad <= 0) throw new Error('Capacidad inválida.');
  
  //   // foto -> base64 (dataURL)
  //   const photoBase64 = await this.blobToDataUrl(fotoBlob);
  
  //   const res = await fetch(this.FN_URL, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'apikey': this.ANON,
  //       'Authorization': `Bearer ${this.ANON}`,
  //     },
  //     body: JSON.stringify({ numero, capacidad, tipo, photoBase64 }),
  //   });
  
  //   const json = await res.json().catch(() => ({}));
  //   if (!res.ok || !json?.ok) {
  //     throw new Error(json?.error || 'No se pudo crear la mesa.');
  //   }
  
  //   // la función devuelve { ok, mesaId, numero, (opcionalmente foto_url, qr_text, qr_url) }
  //   return {
  //     id: json.mesaId,
  //     numero: json.numero,
  //     qr_text: json.qr_text ?? '',
  //     foto_url: json.foto_url ?? '',
  //     qr_img_url: json.qr_url ?? '',
  //   };
  // }
  

 
// ...resto de imports

  async crearMesaViaFunction(p: CrearMesaPayload): Promise<CrearMesaResult> {
    const { numero, capacidad, tipo, fotoBlob } = p;
    if (!fotoBlob) throw new Error('La foto de la mesa es obligatoria.');
    if (!numero || numero <= 0) throw new Error('Número inválido.');
    if (!capacidad || capacidad <= 0) throw new Error('Capacidad inválida.');

    // [CAMBIO PASO 3A] — Usamos SIEMPRE la FN_URL normalizada arriba
    const fnUrl = this.FN_URL;
    const anon  = this.ANON;

    const photoBase64 = await this.blobToDataUrl(fotoBlob);

    console.debug('[MesasService] POST alta-mesa →', {
      url: fnUrl,
      numero, capacidad, tipo,
      photoBase64_sample: photoBase64.slice(0, 40) + '...'
    });

    const r = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anon,
        'Authorization': `Bearer ${anon}`,
      },
      body: JSON.stringify({ numero, capacidad, tipo, photoBase64 }),
    });

    let j: any = null;
    try {
      j = await r.json();
    } catch {
      j = null;
    }

    // [CAMBIO PASO 3A] — logging de respuesta cruda
    console.debug('[MesasService] alta-mesa ← status', r.status, 'body:', j);

    if (!r.ok || !j?.ok) {
      // errores típicos que podría devolver la función
      if (r.status === 409) throw new Error('El número de mesa ya existe.');
      throw new Error(j?.error || 'No se pudo crear la mesa.');
    }

    // adapta al contrato de tu app
    const out: CrearMesaResult = {
      id: j.id,
      numero: j.numero,
      qr_text: j.qr_text,
      foto_url: j.foto_url,
      qr_img_url: j.qr_img_url,
    };
    return out;
  }


  /** Listar todas las mesas (para /admin/mesas) */
  // async listarMesas(): Promise<MesaRow[]> {
  //   const { data, error } = await this.supa.client
  //     .from('mesas')
  //     .select('id, numero, capacidad, tipo, estado, foto_url, qr_text, created_at, updated_at')
  //     .order('numero', { ascending: true });
  //   if (error) throw error;
  //   return (data ?? []).slice();  
  //   //return (data || []) as MesaRow[];
  // }

  async listarMesas(): Promise<MesaRow[]> {
    try {
      // 1) Asegurá que hay sesión; si no, intentá refrescar
      const sessRes = await this.supa.client.auth.getSession();
      let session = sessRes.data.session;
      if (!session) {
        const ref = await this.supa.client.auth.refreshSession();
        session = ref.data.session ?? null;
      }
      console.log('[mesas.service] session?', !!session, 'user:', session?.user?.id || null);
    
      // 2) Query simple, sin count/range (evita preflight y edge cases)
      const { data, error } = await this.supa.client
        .from('mesas')
        .select('id, numero, capacidad, tipo, estado, foto_url, qr_text, created_at, updated_at')
        .order('numero', { ascending: true });
    
      if (error) {
        console.error('[mesas.service] listarMesas error:', error);
        console.error('[mesas.service] Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Error al listar mesas: ${error.message || JSON.stringify(error)}`);
      }
      
      const mesas = (data ?? []) as MesaRow[];
      console.log('[mesas.service] listarMesas ->', mesas.length, 'mesas encontradas');
      if (mesas.length > 0) {
        console.log('[mesas.service] Primeras mesas:', mesas.slice(0, 3).map(m => `#${m.numero}`));
      }
      return mesas;
    } catch (e: any) {
      console.error('[mesas.service] listarMesas excepción:', e);
      throw e; // Re-lanzar el error para que el componente lo maneje
    }
  }
  

  /** Actualizar mesa (número/capacidad/tipo y, si querés, estado) */
  async actualizarMesa(p: { id: string; numero: number; capacidad: number; tipo: MesaTipo; fotoBlob?: Blob }) {
    const { id, numero, capacidad, tipo, fotoBlob } = p;
  
    // si hay nueva foto, subimos y obtenemos URL
    let foto_url: string | undefined;
    if (fotoBlob) {
      foto_url = await this.subirFotoPorId(id, fotoBlob);
    }
  
    const upd: any = { numero, capacidad, tipo };
    if (foto_url) upd.foto_url = foto_url;
  
    const { error } = await this.supa.client.from('mesas')
      .update(upd)
      .eq('id', id);
    if (error) throw error;
  }

  /** Eliminar mesa por id (opcional, útil desde la lista) */
  //  async eliminarMesa(id: string): Promise<void> {
  //    const { error } = await this.supa.client
  //      .from('mesas')
  //      .delete()
  //      .eq('id', id);
  //    if (error) throw error;
  //  }


  /**
 * Elimina una mesa por id.
 * Intenta además remover su foto y QR del bucket (si existen).
//  */
  async eliminarMesa(id: string): Promise<void> {
    // 1) borro fila (si hay FKs que bloqueen, esto devolverá error)
    const del = await this.supa.client
      .from('mesas')
      .delete()
      .eq('id', id);

    if (del.error) {
      console.error('[mesas.service] eliminarMesa error', del.error);
      throw new Error('No se pudo eliminar. Verificá permisos/RLS.');
    }

    // (Opcional) limpiar Storage:
    // try { await this.supa.client.storage.from('mesas').remove([`fotos/${id}.jpg`, `qr/${id}.png`]); } catch {}
  }








  // async crearMesa(p: CrearMesaPayload): Promise<CrearMesaResult> {
  //   const { numero, capacidad, tipo, fotoBlob } = p;
  //   if (!fotoBlob) throw new Error('La foto de la mesa es obligatoria.');
  //   if (!numero || numero <= 0) throw new Error('El número de mesa debe ser mayor a 0.');
  //   if (!capacidad || capacidad <= 0) throw new Error('La capacidad debe ser mayor a 0.');
  
  //   // PING visible en Network
  //   {
  //     const ping = await this.supa.client
  //       .from('mesas')
  //       .select('id')
  //       .limit(1);
  //     if (ping.error) throw new Error('No se puede contactar la tabla mesas.');
  //   }
  
  //   // 1) INSERT
  //   const ins = await this.supa.client
  //     .from('mesas')
  //     .insert({ numero, capacidad, tipo })
  //     .select('id, numero')
  //     .single();            // <= ¡esto se await-ea! (no builder suelto)
  
  //   if (ins.error || !ins.data) {
  //     const msg = (ins.error?.message || '').toLowerCase();
  //     if (ins.error?.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
  //       throw new Error('El número de mesa ya existe.');
  //     }
  //     if (msg.includes('rls')) throw new Error('RLS bloqueó el INSERT en mesas.');
  //     throw new Error('No se pudo crear la mesa (INSERT).');
  //   }
  
  //   const mesaId = ins.data.id as string;
  //   const mesaNumero = ins.data.numero as number;
  
  //   // 2) FOTO
  //   const foto_url = await this.subirFotoPorId(mesaId, fotoBlob);
  
  //   // 3) QR
  //   const { qr_text, qr_img_url } = await this.generarYSubirQr(mesaId, mesaNumero);
  
  //   // 4) UPDATE
  //   const upd = await this.supa.client
  //     .from('mesas')
  //     .update({ foto_url, qr_text })
  //     .eq('id', mesaId)
  //     .single();
  
  //   if (upd.error) throw new Error('Mesa creada, pero no se pudo guardar foto/QR en la base.');
  
  //   return { id: mesaId, numero: mesaNumero, qr_text, foto_url, qr_img_url };
  // }
  
  

  // ---------- Helpers ----------

  private async compactarJpeg(src: Blob, quality: number): Promise<Blob> {
    // si ya es chica, no tocar
    if (src.size < 400_000) return src;

    // Intento 1: OffscreenCanvas (rápido si está disponible)
    try {
      // @ts-ignore
      if (typeof OffscreenCanvas !== 'undefined') {
        // @ts-ignore
        const bmp = await createImageBitmap(src);
        // @ts-ignore
        const canvas = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
        // @ts-ignore
        bmp.close?.();
        return blob;
      }
    } catch {
      /* fallback abajo */
    }

    // Intento 2: Canvas HTML estándar (compatible en WebView)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        try {
          const url = canvas.toDataURL('image/jpeg', quality);
          resolve(url);
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(src);
    });
    return await (await fetch(dataUrl)).blob();
  }

  private async subirFotoPorId(mesaId: string, blob: Blob): Promise<string> {
    const path = `fotos/${mesaId}.jpg`;
    const { error } = await this.supa.client.storage
      .from(this.BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw new Error('No se pudo subir la foto de la mesa.');
    const { data } = this.supa.client.storage.from(this.BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  private async generarYSubirQr(mesaId: string, numero: number):
    Promise<{ qr_text: string; qr_img_url: string }> {
    const qr_text = JSON.stringify({ t: 'mesa', id: mesaId, n: numero });
    const dataUrl = await QRCode.toDataURL(qr_text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 3,
      width: 256,
    });
    const pngBlob = await (await fetch(dataUrl)).blob();
    const path = `qr/${mesaId}.png`;

    const { error } = await this.supa.client.storage
      .from(this.BUCKET)
      .upload(path, pngBlob, { upsert: true, contentType: 'image/png' });
    if (error) throw new Error('No se pudo subir la imagen del QR.');

    const { data } = this.supa.client.storage.from(this.BUCKET).getPublicUrl(path);
    return { qr_text, qr_img_url: data.publicUrl };
  }

  private traducirErrorMesa(e: any): Error {
    const msg = (e?.message || '').toLowerCase();
    if (e?.status === 409 || e?.code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
      return new Error('El número de mesa ya existe.');
    }
    if (e?.status === 400 || msg.includes('invalid input value for enum')) {
      return new Error('Tipo de mesa inválido.');
    }
    return new Error('No se pudo crear la mesa.');
  }

  

  /**
 * Actualiza SOLO los campos permitidos al editar desde el listado:
 * - capacidad
 * - tipo
 * - (opcional) estado
 * Devuelve la fila actualizada.
 */
  async actualizarMesaCampos(params: {
    id: string;
    capacidad?: number;
    tipo?: MesaTipo;
    estado?: MesaRow['estado'];
  }): Promise<MesaRow> {
    const { id, capacidad, tipo, estado } = params;

    // armamos el patch con lo que realmente vino definido
    const patch: any = {};
    if (typeof capacidad === 'number') patch.capacidad = capacidad;
    if (typeof tipo !== 'undefined' && tipo !== null) patch.tipo = tipo;
    if (typeof estado !== 'undefined' && estado !== null) patch.estado = estado;

    if (!patch || Object.keys(patch).length === 0) {
      throw new Error('No hay cambios para guardar.');
    }

    const { data, error } = await this.supa.client
      .from('mesas')
      .update(patch)
      .eq('id', id)
      .select('id, numero, capacidad, tipo, estado, foto_url, qr_text, created_at, updated_at')
      .single();

    if (error) throw this.traducirErrorMesa(error);
    return data as MesaRow;
  }


}
