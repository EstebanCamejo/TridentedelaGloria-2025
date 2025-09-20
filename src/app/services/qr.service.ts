import { Injectable } from '@angular/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

export type QrMesa    = { t: 'mesa'; id: string; n?: number };
export type QrIngreso = { t: 'ingreso'; loc?: string };           // para el QR de ingreso al local
export type QrPropina = { t: 'propina'; mesa_id: string; pct?: number };
export type QrPayload = QrMesa | QrIngreso | QrPropina;

@Injectable({ providedIn: 'root' })
export class QrService {

  /** Intenta parsear un string a alguno de nuestros payloads válidos */
  parse(raw: string): QrPayload | null {
    try {
      const j = JSON.parse(raw);
      if (!j || typeof j !== 'object') return null;

      switch (j.t) {
        case 'mesa':
          if (typeof j.id === 'string') return { t: 'mesa', id: j.id, n: j.n };
          return null;
        case 'ingreso':
          return { t: 'ingreso', loc: j.loc };
        case 'propina':
          if (typeof j.mesa_id === 'string') {
            const pct = typeof j.pct === 'number' ? j.pct : undefined;
            return { t: 'propina', mesa_id: j.mesa_id, pct };
          }
          return null;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
  /** Azúcar sintáctico: devuelve solo si es un QR de mesa */
  parseMesaQR(raw: string): { t: 'mesa'; id: string; n?: number } | null {
    const p = this.parse(raw);
    if (p && p.t === 'mesa' && typeof (p as any).id === 'string') {
      return { t: 'mesa', id: (p as any).id, n: (p as any).n };
    }
    return null;
  }
  /**
   * Abre el escáner (ML Kit) una sola vez y devuelve el payload ya parseado.
   * Devuelve null si no hay nada o si no es un QR válido de la app.
   */
  async scanOnce(): Promise<QrPayload | null> {
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode],
    });

    if (!barcodes?.length) return null;
    const raw = barcodes[0].rawValue ?? '';
    return this.parse(raw);
  }
}
