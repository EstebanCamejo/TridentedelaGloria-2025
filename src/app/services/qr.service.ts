// import { Injectable } from '@angular/core';
// import {
//   CapacitorBarcodeScanner,
//   CapacitorBarcodeScannerAndroidScanningLibrary,
//   CapacitorBarcodeScannerOptions,
// } from '@capacitor/barcode-scanner';

// export type QrMesa    = { t: 'mesa'; id: string; n?: number };
// export type QrIngreso = { t: 'ingreso'; loc?: string };
// export type QrPropina = { t: 'propina'; mesa_id: string; pct?: number };
// export type QrPayload = QrMesa | QrIngreso | QrPropina;

// @Injectable({ providedIn: 'root' })
// export class QrService {
// parse(raw: string | null): QrPayload | null {
//     if (!raw) return null;
//     try {
//       const j = JSON.parse(raw);
//       if (!j || typeof j !== 'object') return null;
//       switch (j.t) {
//         case 'mesa':
//           return (typeof j.id === 'string')
//             ? { t: 'mesa', id: j.id, n: j.n }
//             : null;
//         case 'ingreso':
//           return { t: 'ingreso', loc: j.loc };
//         case 'propina':
//           return (typeof j.mesa_id === 'string')
//             ? { t: 'propina', mesa_id: j.mesa_id, pct: j.pct }
//             : null;
//         default:
//           return null;
//       }
//     } catch {
//       // si NO son JSON, devolvé null y tratá el raw afuera (p.ej. un id de mesa plano)
//       return null;
//     }
//   }
//   parseMesaQR(raw: string): { t: 'mesa'; id: string; n?: number } | null {
//     const p = this.parse(raw);
//     if (p && p.t === 'mesa' && typeof (p as any).id === 'string') {
//       return { t: 'mesa', id: (p as any).id, n: (p as any).n };
//     }
//     return null;
//   }
  
//   // async scanOnce(): Promise<QrPayload | null> {
//   //   const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
//   //   if (!barcodes?.length) return null;
//   //   return this.parse(barcodes[0].rawValue ?? '');
//   // }

//   async scanOnce(): Promise<string | null> {
//     try {
//       // algunos entornos exponen requestPermissions; si no, salta directo a scan
//       // @ts-ignore
//       if (CapacitorBarcodeScanner.requestPermissions) {
//         // @ts-ignore
//         const perm = await CapacitorBarcodeScanner.requestPermissions();
//         // si tu plugin expone checkPermissions, podés usarlo también
//       }
//     } catch { /* ignore */ }

//     const options: CapacitorBarcodeScannerOptions = {
//       hint: 0,
//       scanText: 'Escanea un código QR',
//       scanButton: false,
//       cameraDirection: 1,
//       android: {
//         scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.ZXING,
//       },
//     };

//     try {
//       const res = await CapacitorBarcodeScanner.scanBarcode(options);
//       // Nota: el campo viene como `ScanResult` (según tu referencia)
//       const text = (res as any)?.ScanResult ?? null;
//       return (typeof text === 'string' && text.trim().length) ? text.trim() : null;
//     } catch (err) {
//       // Manejá si querés PERMISSION_DENIED, etc.
//       console.error('[QrService] scanOnce error:', err);
//       return null;
//     }
//   }

//   async previewAndClose(ms = 1400): Promise<void> {
//     try {
//       // Pedir permisos si el plugin lo expone
//       // @ts-ignore
//       if (CapacitorBarcodeScanner.requestPermissions) {
//         // @ts-ignore
//         await CapacitorBarcodeScanner.requestPermissions();
//       }
//     } catch { /* ignore */ }

//     const options: CapacitorBarcodeScannerOptions = {
//       hint: 0,
//       scanText: 'Apunta al código…',
//       scanButton: false,              // no mostramos el botón “Scan”, solo la cámara
//       cameraDirection: 1,             // 0: front, 1: back (según plugin)
//       android: {
//         scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.ZXING,
//       },
//     };

//     // Iniciamos el scan **SIN await** para no bloquear; luego cerramos con stopScan()
//     const scanningPromise = CapacitorBarcodeScanner.scanBarcode(options)
//       .catch(() => null); // ignoramos resultado/errores

//     // Timer de simulación
//     await new Promise<void>(res => setTimeout(res, ms));

//     // Cerramos la cámara programáticamente
//     try { await (CapacitorBarcodeScanner as any).stopScan?.(); } catch {}

//     // Además, si el plugin expone cancelación por UI, el scanningPromise 
//     // se resolverá/rechazará solo; nosotros no lo esperamos.
//     return;
//   }
// }


import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const log = (...a: any[]) => console.log('[QrService]', ...a);

@Injectable({ providedIn: 'root' })
export class QrService {
  /**
   * Android (dispositivo):
   * - verifica soporte y módulo de Google
   * - intenta startScan() y lo cierra a los ms
   * - fallback: scan() (no cierra programáticamente)
   * Web: solo espera
   */
  async previewAndClose(ms = 2000): Promise<void> {
    const plat = Capacitor.getPlatform();
    log('platform =', plat);

    if (plat === 'web') {
      log('web fallback: solo sleep');
      await sleep(ms);
      return;
    }

    let BarcodeScanner: any;
    try {
      const mod = await import('@capacitor-mlkit/barcode-scanning');
      BarcodeScanner = (mod as any).BarcodeScanner;
      log('plugin cargado:', !!BarcodeScanner);
    } catch (e) {
      log('NO pudo cargar @capacitor-mlkit/barcode-scanning', e);
      await sleep(ms);
      return;
    }

    // 1) Soporte real
    try {
      const sup = await BarcodeScanner.isSupported?.();
      log('isSupported =', sup);
      if (!sup?.supported) {
        await sleep(ms);
        return;
      }
    } catch (e) {
      log('isSupported error:', e);
    }

    // 2) Módulo de Google (necesario en muchos Android 13/14)
    try {
      const hasModule = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable?.();
      log('googleModuleAvailable =', hasModule);
      if (!hasModule) {
        log('instalando módulo de Google…');
        await BarcodeScanner.installGoogleBarcodeScannerModule?.();
        log('módulo instalado.');
      }
    } catch (e) {
      log('google module check/install error:', e);
    }

    // 3) Permisos
    try {
      const perm = await BarcodeScanner.requestPermissions?.({ force: true });
      log('permissions =', perm);
    } catch (e) {
      log('permissions error:', e);
    }

    // 4) Intentar startScan() (cámara embebida, podemos stopScan())
    try {
      if (typeof BarcodeScanner.startScan === 'function') {
        log('startScan() → abriendo cámara embebida');
        await BarcodeScanner.startScan({ targetedFormats: [] }); // no filtramos; es preview
        await sleep(ms);
        try {
          log('stopScan()');
          await BarcodeScanner.stopScan();
        } catch (e) {
          log('stopScan error:', e);
        }
        log('preview cerrado por stopScan');
        return;
      }
      log('startScan NO disponible');
    } catch (e) {
      log('startScan error:', e);
    }

    // 5) Fallback: scan() (UI de Google Code Scanner) — NO se puede cerrar por código
    try {
      if (typeof BarcodeScanner.scan === 'function') {
        log('scan() fallback → abre UI de Google Code Scanner');
        // NO esperamos resultado; lo lanzamos y damos 2s de "preview".
        const p = BarcodeScanner.scan({ targetedFormats: [] }).catch((e: any) => {
          log('scan() reject:', e);
          return null;
        });
        await sleep(ms);
        // No hay forma oficial de cerrar la UI de scan() por código;
        // por eso NO navegamos aquí para no tapar la UI. Devolvemos y que el llamador decida.
        log('scan() corriendo, NO cerrable programáticamente → devolvemos sin navegar');
        return;
      }
      log('scan NO disponible');
    } catch (e) {
      log('scan error:', e);
    }

    // 6) Último recurso: no se pudo abrir nada → simular
    log('ninguna API abrió cámara → fallback de espera');
    await sleep(ms);
  }

  
}
