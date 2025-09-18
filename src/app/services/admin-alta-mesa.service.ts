import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import QRCode from 'qrcode';

export type MesaTipo = 'vip' | 'estandar' | 'pmr'; // ← coincide con tu enum mesa_tipo

export type MesaPayload = {
  numero: number;
  capacidad: number;
  // Acepto tu valor previo y lo mapeo a 'pmr' para DB:
  tipo: MesaTipo | 'mov_reducida';
  fotoBlob: Blob; // foto OBLIGATORIA (como Blob)
};

export type CrearMesaResult = {
  id: string;
  qr_text: string;
  foto_url: string;
  qr_img_url: string; // público por convención (no guardado en DB)
};

@Injectable({ providedIn: 'root' })
export class AdminAltaMesaService {
  private readonly BUCKET = 'mesas'; // usamos tu bucket único

  constructor(private supa: SupabaseService) {}

  /** Devuelve true si NO existe una mesa con ese número */
  async numeroDisponible(numero: number): Promise<boolean> {
    const { data, error } = await this.supa.client
      .from('mesas')
      .select('id')
      .eq('numero', numero);

    if (error) throw new Error('No se pudo verificar la disponibilidad del número.');
    return (data?.length ?? 0) === 0;
  }

  /** Abrir cámara y devolver { blob, dataUrl } para preview/subida */

  async tomarFoto(): Promise<{ blob: Blob; dataUrl: string }> {
    const photo = await Camera.getPhoto({
      quality: 60,                      // comprime
      resultType: CameraResultType.Uri, // NO DataUrl (evita base64 gigante)
      source: CameraSource.Camera,
      width: 1280,                      // redimensiona (menos peso)
      correctOrientation: true,
      saveToGallery: false,
      promptLabelHeader: 'Tomar foto',
      promptLabelPhoto: 'Usar cámara',
      promptLabelPicture: 'Capturar',
    });
  
    const webPath = photo.webPath ?? photo.path;
    if (!webPath) throw new Error('No se pudo obtener la imagen.');
  
    const resp = await fetch(webPath);
    const blob = await resp.blob();
  
    // solo para previsualizar en la UI
    const dataUrl = await this.blobToDataUrl(blob);
    return { blob, dataUrl };
  }
  
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  /** Flujo completo: inserta → sube foto → genera/sube QR → actualiza fila */
  async crearMesa(payload: MesaPayload): Promise<CrearMesaResult> {
    if (!payload.fotoBlob) throw new Error('La foto de la mesa es obligatoria.');
    if (!payload.numero || payload.numero <= 0) throw new Error('El número de mesa debe ser mayor a 0.');
    if (!payload.capacidad || payload.capacidad <= 0) throw new Error('La capacidad debe ser mayor a 0.');

    // 0) Auth: tu tabla pide created_by y RLS exige es_admin(auth.uid())
    const { data: auth } = await this.supa.client.auth.getUser();
    const created_by = auth?.user?.id;
    if (!created_by) throw new Error('No hay usuario autenticado.');

    // Mapeo tipo legado -> enum real
    const tipo: MesaTipo = (payload.tipo === 'mov_reducida' ? 'pmr' : payload.tipo) as MesaTipo;

    // 1) Inserto borrador para obtener id
    const { data: inserted, error: insErr } = await this.supa.client
      .from('mesas')
      .insert({
        numero: payload.numero,
        capacidad: payload.capacidad,
       // tipo_mesa: (payload.tipo === 'mov_reducida' ? 'pmr' : payload.tipo),
       tipo, 
       created_by, // requerido en tu schema
        // estado: default 'libre'
      })
      .select('id, numero')
      .single();

    if (insErr) throw new Error(insErr.message || 'No se pudo crear la mesa.');

    const mesaId = inserted.id as string;
    const numero = inserted.numero as number;

    // 2) Subo foto a mesas/fotos/<id>.jpg
    const foto_url = await this.subirFotoPorId(mesaId, payload.fotoBlob);

    // 3) Genero QR (texto + PNG) y subo a mesas/qr/<id>.png
    const { qr_text, qr_img_url } = await this.generarYSubirQr(mesaId, numero);

    // 4) Actualizo fila con foto_url y qr_text
    const { error: updErr } = await this.supa.client
      .from('mesas')
      .update({ foto_url, qr_text })
      .eq('id', mesaId)
      .single();

    if (updErr) throw new Error('Mesa creada, pero no se pudo guardar foto/QR en la base.');

    return { id: mesaId, qr_text, foto_url, qr_img_url };
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

  /** Genera QR PNG con {mesa_id, numero} y lo sube a mesas/qr/<id>.png */
  private async generarYSubirQr(mesaId: string, numero: number): Promise<{ qr_text: string; qr_img_url: string }> {
    const qr_text = JSON.stringify({ t: 'mesa', id: mesaId, n: numero });

    const dataUrl = await QRCode.toDataURL(qr_text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 4
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
