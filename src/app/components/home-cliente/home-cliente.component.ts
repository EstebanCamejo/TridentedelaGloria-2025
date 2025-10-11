
// home-cliente.component.ts
import { Component ,NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  IonContent, IonButton, IonIcon, IonFab, IonFabButton, IonHeader, IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { qrCodeOutline, albumsOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';
import { QrService } from 'src/app/services/qr.service';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, IonFab, IonFabButton, IonHeader, IonToolbar],
  templateUrl: './home-cliente.component.html',
  styleUrls: ['./home-cliente.component.scss'],
})
export class HomeClienteComponent {
  email$!: Observable<string | null>;
  loadingLogout = false;

  constructor(
    private supa: SupabaseService,
    private router: Router,
    private qr: QrService,  
    private zone: NgZone            
  ) {
    addIcons({ qrCodeOutline, albumsOutline });
    this.email$ = this.supa.authEmail$;
  }

  //scanQr(){ /* ... */ }
  //verEncuestas(){ /* ... */ }

  // 👇 Escanea y navega DIRECTO a la ruta
//   async scanQr() {
//   // try {
//   //     const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
//   //     const payload = await this.qr.scanOnce();
//   //     if (!payload) return;

//   //     this.zone.run(async () => {
//   //       switch (payload.t) {
//   //         case 'ingreso':
//   //           this.router.navigate(
//   //             ['/ingreso-cliente'],
//   //             { state: { venue_id: payload.loc ?? 'LOC_001' } }
//   //           );
//   //           break;
//   //         case 'mesa':
//   //           this.router.navigate(
//   //             ['/mesa', payload.id],
//   //             { queryParams: { n: payload.n ?? '' } }
//   //           );
//   //           break;
//   //         case 'propina':
//   //           this.router.navigate(
//   //             ['/propina'],
//   //             { queryParams: { mesa_id: payload.mesa_id, pct: payload.pct ?? '' } }
//   //           );
//   //           break;
//   //       }
//   //     });
//   //   } catch (e) {
//   //     console.error('scanQr error', e);
//   //   }  
//   try {
//       const raw = await this.qr.scanOnce();
//       console.log('[scanQr] raw:', raw);
//       if (!raw) return;

//       const payload: QrPayload | null = this.qr.parse(raw);
//       console.log('[scanQr] payload:', payload);

//       this.zone.run(() => {
//         if (!payload) {
//           // Si no era JSON, podés tratar raw como ID de mesa plano:
//           // this.router.navigate(['/mesa', raw]);
//           return;
//         }
//         switch (payload.t) {
//           case 'ingreso':
//             this.router.navigate(['/ingreso-cliente'], {
//               state: { venue_id: payload.loc ?? 'LOC_001' }
//             });
//             break;
//           case 'mesa':
//             this.router.navigate(['/mesa', payload.id], {
//               queryParams: { n: payload.n ?? '' }
//             });
//             break;
//           case 'propina':
//             this.router.navigate(['/propina'], {
//               queryParams: { mesa_id: payload.mesa_id, pct: payload.pct ?? '' }
//             });
//             break;
//         }
//       });
//     } catch (e) {
//       console.error('[scanQr] error:', e);
//     }  
// }
async scanQr() {
  // Vamos a saber si navegamos o no según lo que pasó dentro
  let shouldNavigate = true;

  try {
    const before = Date.now();
    await this.qr.previewAndClose(2000);
    const dur = Date.now() - before;

    // Heurística: si volvimos casi instantáneo (<300ms), probablemente falló abrir;
    // si volvimos ~2s, cerramos por stopScan (OK para navegar);
    // si NUNCA volvimos (porque quedó en scan()), no se ejecuta este bloque hasta que el user cierre.
    if (dur < 300) {
      // no abrió cámara; igual navegamos para mantener tu UX
      shouldNavigate = true;
    } else {
      shouldNavigate = true; // abrió y cerró bien
    }
  } catch (e) {
    console.warn('[scanQr] error:', e);
    shouldNavigate = true; // ante error, mantenemos UX
  } finally {
    if (shouldNavigate) {
      this.zone.run(() => this.router.navigate(['/ingreso-cliente']));
    }
  }
}



  verEncuestas() {
    this.router.navigate(['/pagina-resultados-encuestas']);
  }

  async logOut() {
    try {
      this.loadingLogout = true;
      await this.supa.logout();
      await this.router.navigate(['/login']);
    } finally {
      this.loadingLogout = false;
    }
  }
}
