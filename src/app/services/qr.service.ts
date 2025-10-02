import { Injectable } from '@angular/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerOptions,
} from '@capacitor/barcode-scanner';

export type QrMesa    = { t: 'mesa'; id: string; n?: number };
export type QrIngreso = { t: 'ingreso'; loc?: string };
export type QrPropina = { t: 'propina'; mesa_id: string; pct?: number };
export type QrPayload = QrMesa | QrIngreso | QrPropina;

@Injectable({ providedIn: 'root' })
export class QrService {
parse(raw: string | null): QrPayload | null {
    if (!raw) return null;
    try {
      const j = JSON.parse(raw);
      if (!j || typeof j !== 'object') return null;
      switch (j.t) {
        case 'mesa':
          return (typeof j.id === 'string')
            ? { t: 'mesa', id: j.id, n: j.n }
            : null;
        case 'ingreso':
          return { t: 'ingreso', loc: j.loc };
        case 'propina':
          return (typeof j.mesa_id === 'string')
            ? { t: 'propina', mesa_id: j.mesa_id, pct: j.pct }
            : null;
        default:
          return null;
      }
    } catch {
      // si NO son JSON, devolvé null y tratá el raw afuera (p.ej. un id de mesa plano)
      return null;
    }
  }
  parseMesaQR(raw: string): { t: 'mesa'; id: string; n?: number } | null {
    const p = this.parse(raw);
    if (p && p.t === 'mesa' && typeof (p as any).id === 'string') {
      return { t: 'mesa', id: (p as any).id, n: (p as any).n };
    }
    return null;
  }
  
  // async scanOnce(): Promise<QrPayload | null> {
  //   const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
  //   if (!barcodes?.length) return null;
  //   return this.parse(barcodes[0].rawValue ?? '');
  // }

  async scanOnce(): Promise<string | null> {
    try {
      // algunos entornos exponen requestPermissions; si no, salta directo a scan
      // @ts-ignore
      if (CapacitorBarcodeScanner.requestPermissions) {
        // @ts-ignore
        const perm = await CapacitorBarcodeScanner.requestPermissions();
        // si tu plugin expone checkPermissions, podés usarlo también
      }
    } catch { /* ignore */ }

    const options: CapacitorBarcodeScannerOptions = {
      hint: 0,
      scanText: 'Escanea un código QR',
      scanButton: false,
      cameraDirection: 1,
      android: {
        scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.ZXING,
      },
    };

    try {
      const res = await CapacitorBarcodeScanner.scanBarcode(options);
      // Nota: el campo viene como `ScanResult` (según tu referencia)
      const text = (res as any)?.ScanResult ?? null;
      return (typeof text === 'string' && text.trim().length) ? text.trim() : null;
    } catch (err) {
      // Manejá si querés PERMISSION_DENIED, etc.
      console.error('[QrService] scanOnce error:', err);
      return null;
    }
  }
}
