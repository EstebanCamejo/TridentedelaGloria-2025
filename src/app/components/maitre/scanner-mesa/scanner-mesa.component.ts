
// import { Component, OnDestroy } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import { ToastrService } from 'ngx-toastr';
// import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon } from '@ionic/angular/standalone';
// import { addIcons } from 'ionicons';
// import { qrCode, flashlight, closeCircle } from 'ionicons/icons';
// import { Capacitor } from '@capacitor/core';
// import { BarcodeScanner, BarcodeFormat, PermissionStatus, LensFacing, BarcodesScannedEvent } from '@capacitor-mlkit/barcode-scanning';

// import { QrService } from 'src/app/services/qr.service';
// import { MesasService } from 'src/app/services/mesas.service';

// @Component({
//   selector: 'app-scanner-mesa',
//   standalone: true,
//   templateUrl: './scanner-mesa.component.html',
//   styleUrls: ['./scanner-mesa.component.scss'],
//   imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon]
// })
// export class ScannerMesaComponent implements OnDestroy {
//   escaneando = false;
//   usandoNativo = Capacitor.isNativePlatform();
//   private googleReady = false;     
//   private cleaning = false;        

//   constructor(
//     private qr: QrService,
//     private mesas: MesasService,
//     private toast: ToastrService,
//     private router: Router,
//   ) {
//  //   addIcons({ 'qr-code': qrCode, flashlight, closeCircle });
//     addIcons({ 'qr-code': qrCode });
  
//   }


//   async ngOnDestroy() {
//     await this.cleanupScan();
//   }

//   private async instalarModuloGoogle(): Promise<boolean> {
//     if (this.googleReady) return true;
//     if (Capacitor.getPlatform() !== 'android') {
//       this.googleReady = true;
//       return true;
//     }

//     try {
//       const avail = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
//       if (avail?.available) {
//         this.googleReady = true;
//         return true;
//       }
//     } catch {}

//     try {
//       const sub = await BarcodeScanner.addListener(
//         'googleBarcodeScannerModuleInstallProgress',
//         (e) => console.log('[MLKit] Progreso instalación:', e?.progress)
//       );

//       await BarcodeScanner.installGoogleBarcodeScannerModule();
//       await sub.remove().catch(() => {});
//       this.googleReady = true;
//       return true;
//     } catch (err) {
//       console.warn('No se pudo instalar el módulo de Google:', err);
//       this.toast.error('No se pudo preparar el lector. Verificá conexión y Servicios de Google.');
//       return false;
//     }
//   }


//   async escanear() {
//     if (this.escaneando) return;
//     this.escaneando = true;
  
//     try {
//       if (!this.usandoNativo) {
//         this.toast.info('Probalo en el dispositivo. En web no hay vista de cámara.');
//         return;
//       }
  
//       // por las dudas, soltamos todo antes de arrancar
//       await this.cleanupScan();
  
//       // permisos
//       // let perms: PermissionStatus = await BarcodeScanner.checkPermissions();
//       // if (perms.camera !== 'granted') {
//       //   perms = await BarcodeScanner.requestPermissions();
//       //   if (perms.camera !== 'granted') {
//       //     this.toast.error('Habilitá la cámara para escanear el código.');
//       //     return;
//       //   }
//       // }
//       let perms = await BarcodeScanner.checkPermissions();
//       if (perms.camera !== 'granted') {
//         perms = await BarcodeScanner.requestPermissions();
//         if (perms.camera !== 'granted') {
//           this.toast.error('Habilitá la cámara para escanear el código.');
//           return;
//         }
//       }

//       // módulo de Google (Android)
//       const listo = await this.instalarModuloGoogle();
//       if (!listo) return;



//       // abre la UI nativa con preview y se cierra solo
//       const { barcodes } = await BarcodeScanner.scan({
//         formats: [BarcodeFormat.QrCode],
//         // lensFacing: LensFacing.Back,  // opcional
//       });


//       const raw = barcodes?.[0]?.rawValue || '';
//       if (!raw) {
//         this.toast.error('No se detectó ningún QR.');
//         return;
//       }
  
//       const parsed = this.qr.parseMesaQR(raw);
//       if (!parsed || parsed.t !== 'mesa' || !parsed.id) {
//         this.toast.error('Este QR no pertenece a una mesa.');
//         return;
//       }
  
//       const mesa = await this.mesas.getMesaById(parsed.id);
//       if (!mesa) {
//         this.toast.error('La mesa referida por el QR no existe.');
//         return;
//       }
  
//       this.toast.success(`Mesa #${mesa.numero} detectada correctamente.`);
//       // aquí podrías navegar si querés
//       await this.router.navigate(['/maitre/asignar-mesa'], { queryParams: { mesaId: mesa.id } });
  
//       // // 1) escucho el primer código que llegue
//       // const waitFirst = this.onceFromListener('barcodesScanned');
  
//       // // 2) abro cámara (con preview nativa)
//       // await BarcodeScanner.startScan({
//       //   formats: [BarcodeFormat.QrCode],
//       //   lensFacing: LensFacing.Back ,  // evita front cam en algunos OEM
//       // });
  
//       // 3) espero al primer resultado o corto a los N segundos
//       // const RESULT_TIMEOUT_MS = 20000;
//       // const result = await Promise.race([
//       //   waitFirst,
//       //   new Promise<null>((resolve) => setTimeout(() => resolve(null), RESULT_TIMEOUT_MS)),
//       // ]);
  
//       // cierro la cámara SIEMPRE antes de procesar
//       // await BarcodeScanner.stopScan().catch(() => {});
  
//       // if (!result || !result.barcodes?.length) {
//       //   this.toast.error('No se detectó ningún QR.');
//       //   return;
//       // }
  
//       // const raw = result.barcodes[0]?.rawValue || '';
//       // const parsed = this.qr.parseMesaQR(raw);
//       // if (!parsed || parsed.t !== 'mesa' || !parsed.id) {
//       //   this.toast.error('Este QR no pertenece a una mesa.');
//       //   return;
//       // }
  
//       // const mesa = await this.mesas.getMesaById(parsed.id);
//       // if (!mesa) {
//       //   this.toast.error('La mesa referida por el QR no existe.');
//       //   return;
//       // }
  
//       // this.toast.success(`Mesa #${mesa.numero} detectada correctamente.`);
//       // Ejemplo de navegación futura:
//       // await this.router.navigate(['/maitre/asignar-mesa'], { queryParams: { mesaId: mesa.id } });
  
//     } catch (e: any) {
//       console.error('[scan] error:', e);
//       this.toast.error(e?.message || 'No se pudo leer el QR.');
//     } finally {
//       // limpieza total y pequeño respiro antes de permitir otro scan
//       await this.cleanupScan();
//       await new Promise(r => setTimeout(r, 150));
//       this.escaneando = false;
//     }
//   }
  
//   /** Espera UNA sola emisión de un listener del plugin y la devuelve como Promise */
//   private async onceFromListener(
//     eventName: 'barcodesScanned'
//   ): Promise<BarcodesScannedEvent> {
//     return new Promise(async (resolve) => {
//       const sub = await BarcodeScanner.addListener(
//         eventName,
//         async (payload: BarcodesScannedEvent) => {
//           try { await sub.remove(); } catch {}
//           resolve(payload);
//         }
//       );
//     });
//   }
  
  

//   async scanAgain() {
//     // por si algún OEM deja la cámara “enganchada”
//     await this.cleanupScan();
//     await new Promise(r=> setTimeout(r, 150));
//     //this.lastMesa = null;
//     this.escanear();
//   }

//   private async cleanupScan() {
//     if (this.cleaning) return;
//     this.cleaning = true;
//     try {
//       await BarcodeScanner.stopScan().catch(() => {});
//       await BarcodeScanner.removeAllListeners().catch(() => {});
//     } finally {
//       this.cleaning = false;
//     }
//   }

// }
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { qrCode } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat, PermissionStatus } from '@capacitor-mlkit/barcode-scanning';

import { QrService } from 'src/app/services/qr.service';
import { MesasService } from 'src/app/services/mesas.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { SupabaseService } from 'src/app/services/supabase.service';

@Component({
  selector: 'app-scanner-mesa',
  standalone: true,
  templateUrl: './scanner-mesa.component.html',
  styleUrls: ['./scanner-mesa.component.scss'],
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon]
})
export class ScannerMesaComponent implements OnDestroy {
  escaneando = false;
  usandoNativo = Capacitor.isNativePlatform();
  lastMesa: { id: string; numero?: number } | null = null;
  private cleaning = false;
  private googleReady = false;

  constructor(
    private qr: QrService,
    private mesas: MesasService,
    private toast: ToastrService,
    private router: Router,
    private spinner: SpinnerService,
    private supa: SupabaseService,
  ) { addIcons({ 'qr-code': qrCode }); }

  async ngOnDestroy() { await this.cleanupScan(); }

  private async sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  private async cleanupScan() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      await BarcodeScanner.stopScan().catch(() => {});
      await BarcodeScanner.removeAllListeners().catch(() => {});
    } finally {
      this.cleaning = false;
      // pequeño colchón para que el SO libere la cámara
      await this.sleep(120);
    }
  }

  private async prepararModuloGoogle(): Promise<boolean> {
    if (this.googleReady) return true;
    if (Capacitor.getPlatform() !== 'android') { this.googleReady = true; return true; }
    try {
      const avail = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (avail?.available) { this.googleReady = true; return true; }
    } catch {}
    try {
      const sub = await BarcodeScanner.addListener('googleBarcodeScannerModuleInstallProgress', () => {});
      await BarcodeScanner.installGoogleBarcodeScannerModule();
      await sub.remove().catch(() => {});
      this.googleReady = true;
      return true;
    } catch {
      this.toast.error('NO SE PUDO PREPARAR EL LECTOR (SERVICIOS DE GOOGLE)', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      return false;
    }
  }

  async escanear() {
    if (this.escaneando) return;
    this.escaneando = true;

    try {
      if (!this.usandoNativo) {
        this.toast.info('PROBALO EN EL DISPOSITIVO. EN WEB NO HAY VISTA DE CÁMARA', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        return;
      }

      console.log('[scanner-mesa] 📸 Iniciando escaneo...');
      
      // 🎬 NUEVO: Preparar sesión ANTES de abrir la cámara
      await this.supa.prepareForCameraUse();
      
      // Mostrar spinner
      this.spinner.show({ immediate: true });
      
      // limpiar residuos previos
      await this.cleanupScan();

      // permisos
      let perms: PermissionStatus = await BarcodeScanner.checkPermissions();
      if (perms.camera !== 'granted') {
        perms = await BarcodeScanner.requestPermissions();
        if (perms.camera !== 'granted') {
          this.toast.error('HABILITÁ LA CÁMARA PARA ESCANEAR EL CÓDIGO', '', {
            positionClass: 'toast-center',
            timeOut: 3000
          });
          this.spinner.hide();
          return;
        }
      }

      // preparar módulo (Android)
      const okGoogle = await this.prepararModuloGoogle();
      if (!okGoogle) {
        this.spinner.hide();
        return;
      }

      // abre cámara (UI nativa) y espera resultado
      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      console.log('[scanner-mesa] 🔄 Cámara cerrada, restaurando sesión...');
      
      // ⚠️ CRÍTICO: Restaurar sesión de Supabase después de usar la cámara
      const sessionRestored = await this.supa.restoreSessionAfterCamera();
      
      if (!sessionRestored) {
        console.warn('[scanner-mesa] ⚠️ No se pudo restaurar la sesión completamente');
      }

      const raw = barcodes?.[0]?.rawValue || '';
      if (!raw) {
        this.toast.error('NO SE DETECTÓ NINGÚN QR', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        this.spinner.hide();
        return;
      }

      //const parsed = this.qr.parseMesaQR(raw);
      // if (!parsed || parsed.t !== 'mesa' || !parsed.id) {
      //   this.toast.error('ESTE QR NO PERTENECE A UNA MESA', '', {
      //     positionClass: 'toast-center',
      //     timeOut: 3000
      //   });
      //   this.spinner.hide();
      //   return;
      // // }

      // const mesa = await this.mesas.getMesaById(parsed.id);
      // if (!mesa) {
      //   this.toast.error('LA MESA REFERIDA POR EL QR NO EXISTE', '', {
      //     positionClass: 'toast-center',
      //     timeOut: 3000
      //   });
      //   this.spinner.hide();
      //   return;
      // }

      // this.lastMesa = { id: mesa.id, numero: mesa.numero };

      // this.toast.success(`MESA #${mesa.numero} DETECTADA CORRECTAMENTE`, '', {
      //   positionClass: 'toast-center',
      //   timeOut: 3000
      // });

      // // cerramos cámara y oyentes ANTES de navegar
      // await this.cleanupScan();
      // await this.router.navigate(['/maitre/mesa', mesa.id]);

    } catch (e: any) {
      console.error('[scan] error:', e);
      this.toast.error((e?.message || 'NO SE PUDO LEER EL QR').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      // seguridad: cerramos/limpiamos y re-habilitamos el botón
      await this.cleanupScan();
      await this.sleep(150);
      this.escaneando = false;
      this.spinner.hide();
    }
  }
 
  async scanAgain() {
    await this.cleanupScan();
    await this.sleep(150);
    this.lastMesa = null;
    this.escanear();
  }
}
