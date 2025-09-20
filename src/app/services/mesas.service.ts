import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import QRCode from 'qrcode';

export type MesaTipo = 'vip' | 'estandar' | 'mov_reducida';

export type CrearMesaPayload = {
  numero: number;
  capacidad: number;
  tipo: MesaTipo;      
  fotoBlob: Blob;      
};

export type CrearMesaResult = {
  id: string;
  numero: number;
  qr_text: string;
  foto_url: string;
  qr_img_url: string;   // URL pública del PNG del QR
};

export type MesaRow = {
  id: string;
  numero: number;
  capacidad: number;
  tipo: MesaTipo;
  estado: 'libre' | 'ocupada' | 'reservada' | 'bloqueada';
  foto_url: string | null;
  qr_text: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable({ providedIn: 'root' })
export class MesasService {
  private readonly BUCKET = 'mesas'; // usamos el bucket único "mesas"

  constructor(private supa: SupabaseService) {}

  /** True si NO existe una mesa con ese número */
  async numeroDisponible(numero: number): Promise<boolean> {
    const { data, error } = await this.supa.client
      .from('mesas')
      .select('id', { count: 'exact', head: true })
      .eq('numero', numero);

    if (error) throw new Error(error.message || 'No se pudo verificar el número.');
    return (data as any) === null; // con head: true, data es null si no hay error
  }

  /** Traer mesa por ID */
  async getMesaById(id: string): Promise<MesaRow> {
    const { data, error } = await this.supa.client
      .from('mesas')
      .select('id, numero, capacidad, tipo, estado, foto_url, qr_text, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message || 'No se pudo obtener la mesa.');
    return data as MesaRow;
  }

  /** Traer mesa por número */
  async getMesaByNumero(numero: number): Promise<MesaRow> {
    const { data, error } = await this.supa.client
      .from('mesas')
      .select('id, numero, capacidad, tipo, estado, foto_url, qr_text, created_at, updated_at')
      .eq('numero', numero)
      .single();

    if (error) throw new Error(error.message || 'No se pudo obtener la mesa.');
    return data as MesaRow;
  }

  /**
   * Flujo: inserta borrador → sube foto → genera/sube QR → actualiza fila
   * Devuelve URLs y el texto del QR.
   */
  async crearMesa(payload: CrearMesaPayload): Promise<CrearMesaResult> {
    const { numero, capacidad, tipo, fotoBlob } = payload;

    if (!fotoBlob) throw new Error('La foto de la mesa es obligatoria.');
    if (!numero || numero <= 0) throw new Error('El número de mesa debe ser mayor a 0.');
    if (!capacidad || capacidad <= 0) throw new Error('La capacidad debe ser mayor a 0.');

    // 1) Insert preliminar para conseguir ID
    const { data: inserted, error: insErr } = await this.supa.client
      .from('mesas')
      .insert({ numero, capacidad, tipo }) // estado queda por defecto 'libre'
      .select('id, numero')
      .single();

    if (insErr) {
    throw traducirErrorMesa(insErr);
    }
    const mesaId = inserted.id as string;
    const mesaNumero = inserted.numero as number;

    // 2) Subir foto
    const foto_url = await this.subirFotoPorId(mesaId, fotoBlob);

    // 3) Generar y subir QR
    const { qr_text, qr_img_url } = await this.generarYSubirQr(mesaId, mesaNumero);

    // 4) Actualizar fila con foto_url y qr_text
    const { error: updErr } = await this.supa.client
      .from('mesas')
      .update({ foto_url, qr_text })
      .eq('id', mesaId)
      .single();

    if (updErr) throw new Error('Mesa creada, pero no se pudo guardar foto/QR en la base.');

    return { id: mesaId, numero: mesaNumero, qr_text, foto_url, qr_img_url };
  }

  // ================== Helpers internos ==================

  /** Sube foto como mesas/fotos/<id>.jpg y devuelve URL pública */
  private async subirFotoPorId(mesaId: string, blob: Blob): Promise<string> {
    const path = `fotos/${mesaId}.jpg`;
    const { error: upErr } = await this.supa.client.storage
      .from(this.BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

    if (upErr) throw new Error('No se pudo subir la foto de la mesa.');

    const { data } = this.supa.client.storage.from(this.BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  /** Genera QR PNG con {t:'mesa', id, n} y lo sube a mesas/qr/<id>.png */
  private async generarYSubirQr(mesaId: string, numero: number): Promise<{ qr_text: string; qr_img_url: string }> {
    const qr_text = JSON.stringify({ t: 'mesa', id: mesaId, n: numero });

    const dataUrl = await QRCode.toDataURL(qr_text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 4,
    });

    const pngBlob = this.dataUrlToBlob(dataUrl);
    const path = `qr/${mesaId}.png`;

    const { error: upErr } = await this.supa.client.storage
      .from(this.BUCKET)
      .upload(path, pngBlob, { upsert: true, contentType: 'image/png' });

    if (upErr) throw new Error('No se pudo subir la imagen del QR.');

    const { data } = this.supa.client.storage.from(this.BUCKET).getPublicUrl(path);
    return { qr_text, qr_img_url: data.publicUrl };
  }

  /** Convierte dataURL -> Blob */
  private dataUrlToBlob(dataUrl: string): Blob {
    const [head, base64] = dataUrl.split(',');
    const isPng = head.includes('image/png');
    const mime = isPng ? 'image/png' : 'application/octet-stream';
    const binStr = atob(base64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }  
}

function traducirErrorMesa(e: any): Error {
    const msg = (e?.message || '').toLowerCase();
  
    // Unique constraint (duplicado). Puede venir como 409 (PostgREST) o 23505 (Postgres).
    if (e?.status === 409 || e?.code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
      return new Error('El número de mesa ya existe.');
    }
  
    // Enum inválido (por si algo se desincroniza)
    if (e?.status === 400 || msg.includes('invalid input value for enum')) {
      return new Error('Tipo de mesa inválido.');
    }
  
    return new Error('No se pudo crear la mesa.');
  }
  