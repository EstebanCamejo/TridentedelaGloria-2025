
// home-cliente.component.ts
import { Component ,NgZone, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  IonContent, IonButton, IonIcon, IonHeader, IonToolbar, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { qrCodeOutline, albumsOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';
import { QrPayload, QrService } from 'src/app/services/qr.service';
import { QrHtml5Service } from 'src/app/services/qr-html5.service';
import { ClienteRealtimeService } from 'src/app/services/cliente-realtime.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, IonHeader, IonToolbar],
  templateUrl: './home-cliente.component.html',
  styleUrls: ['./home-cliente.component.scss'],
})
export class HomeClienteComponent implements OnInit, OnDestroy {
  email$!: Observable<string | null>;
  loadingLogout = false;
  tieneMesaAsignada = false;
  loadingLiberar = false;

  constructor(
    private supa: SupabaseService,
    private router: Router,
    private qr: QrService,
    private qrHtml5: QrHtml5Service,  // 🆕 Scanner web que NO afecta Supabase
    private zone: NgZone,
    private clienteRt: ClienteRealtimeService,  // 🆕 Servicio de notificaciones para cliente
    private toast: ToastrService,
    private alertCtrl: AlertController
  ) {
    addIcons({ qrCodeOutline, albumsOutline });
    this.email$ = this.supa.authEmail$;
  }

  async ngOnInit() {
    console.log('[DEBUG HOME-CLIENTE] 🚀 Iniciando ngOnInit...');
    
    // Iniciar el servicio de notificaciones para cliente
    console.log('[DEBUG HOME-CLIENTE] 🔔 Iniciando ClienteRealtimeService...');
    await this.clienteRt.init();
    console.log('[DEBUG HOME-CLIENTE] ✅ ClienteRealtimeService iniciado');
    
    // Verificar si tiene mesa asignada
    console.log('[DEBUG HOME-CLIENTE] 🔍 Verificando estado de mesa...');
    await this.verificarEstadoMesa();
    console.log('[DEBUG HOME-CLIENTE] ✅ ngOnInit completado');
  }

  ngOnDestroy() {
    // Limpiar el servicio al destruir el componente
    this.clienteRt.dispose();
  }


  // 👇 Escanea y navega DIRECTO a la ruta
  //async scanQr() {
  // try {
  //     const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
  //     const payload = await this.qr.scanOnce();
  //     if (!payload) return;

  //     this.zone.run(async () => {
  //       switch (payload.t) {
  //         case 'ingreso':
  //           this.router.navigate(
  //             ['/ingreso-cliente'],
  //             { state: { venue_id: payload.loc ?? 'LOC_001' } }
  //           );
  //           break;
  //         case 'mesa':
  //           this.router.navigate(
  //             ['/mesa', payload.id],
  //             { queryParams: { n: payload.n ?? '' } }
  //           );
  //           break;
  //         case 'propina':
  //           this.router.navigate(
  //             ['/propina'],
  //             { queryParams: { mesa_id: payload.mesa_id, pct: payload.pct ?? '' } }
  //           );
  //           break;
  //       }
  //     });
  //   } catch (e) {
  //     console.error('scanQr error', e);
  //   }  
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

  /**
   * 🆕 SOLUCIÓN DEFINITIVA: Scanner web (html5-qrcode)
   * ✅ NO usa plugin nativo → NO rompe la sesión de Supabase
   * ✅ NO causa problemas con LockManager
   * ✅ Funciona en Android/iOS usando getUserMedia del navegador
   * ✅ Valida que el cliente solo pueda vincularse a la mesa asignada
   */
  async scanQr() {
    try {
      console.log('[scanQr] 📸 Iniciando escaneo con html5-qrcode (scanner web)...');
      
      // ✅ Usar scanner web - NO afecta Supabase
      const raw = await this.qrHtml5.scanOnce();
      
      if (!raw) {
        console.warn('[scanQr] ⚠️ No se leyó ningún QR');
        return;
      }

      console.log('[scanQr] ✅ QR leído:', raw);

      // Parsear el payload
      const payload = this.qrHtml5.parse(raw);
      console.log('[scanQr] Payload:', payload);

      // Navegar según el tipo
      this.zone.run(async () => {
        if (!payload) {
          console.warn('[scanQr] ⚠️ Payload no válido');
          const alert = await this.alertCtrl.create({
            header: 'QR no válido',
            message: 'El código QR escaneado no es válido. Por favor intenta nuevamente.',
            buttons: [
              {
                text: 'CONFIRMAR',
                cssClass: 'alert-button-confirm'
              }
            ],
            cssClass: 'custom-alert'
          });
          await alert.present();
          return;
        }

        console.log('[scanQr] 🚀 Tipo de QR:', payload.t);
        
        switch (payload.t) {
          case 'ingreso':
            this.router.navigate(
              ['/ingreso-cliente'],
              { state: { venue_id: payload.loc ?? 'LOC_001' } }
            );
            break;

          case 'mesa':
            // 🔒 VALIDACIÓN: Verificar que el cliente solo escanee su mesa asignada
            await this.handleMesaScan(payload.id, payload.n);
            break;

          case 'propina':
            this.router.navigate(
              ['/propina'],
              { queryParams: { mesa_id: payload.mesa_id, pct: payload.pct ?? '' } }
            );
            break;
        }
      });
    } catch (e) {
      console.error('[scanQr] ❌ Error:', e);
    }
  }

  /**
   * 🔒 PUNTO 1: Verificar que el cliente no pueda vincularse con otra mesa
   * - Si tiene mesa asignada, solo puede escanear esa mesa
   * - Si no tiene mesa asignada, debe primero inscribirse en lista de espera
   */
  private async handleMesaScan(mesaId: string, mesaNumero?: number) {
    try {
      const userId = this.supa.idUsuario;
      if (!userId) {
        const alert = await this.alertCtrl.create({
          header: 'Error de identificación',
          message: 'No se pudo identificar el usuario. Por favor inicia sesión nuevamente.',
          buttons: [
            {
              text: 'CONFIRMAR',
              cssClass: 'alert-button-confirm'
            }
          ],
          cssClass: 'custom-alert'
        });
        await alert.present();
        return;
      }

      console.log('[handleMesaScan] Verificando mesa asignada para usuario:', userId);

      // Consultar si el cliente tiene una mesa asignada en lista_espera
      const { data: waitRow, error } = await this.supa.client
        .from('lista_espera')
        .select('id, estado, mesa_id')
        .eq('usuario_id', userId)
        .in('estado', ['esperando', 'asignado'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[handleMesaScan] Error al consultar lista_espera:', error);
        const alert = await this.alertCtrl.create({
          header: 'Error',
          message: 'Error al verificar tu estado. Intenta nuevamente.',
          buttons: [
            {
              text: 'CONFIRMAR',
              cssClass: 'alert-button-confirm'
            }
          ],
          cssClass: 'custom-alert'
        });
        await alert.present();
        return;
      }

      // CASO 1: No tiene mesa asignada aún (estado 'esperando')
      if (!waitRow || waitRow.estado === 'esperando') {
        const alert = await this.alertCtrl.create({
          header: 'Esperando asignación',
          message: '⏳ Aún no tienes una mesa asignada.\n\nPor favor espera a que el maitre te asigne una mesa.',
          buttons: [
            {
              text: 'CONFIRMAR',
              cssClass: 'alert-button-confirm'
            }
          ],
          cssClass: 'custom-alert'
        });
        await alert.present();
        return;
      }

      // CASO 2: Tiene mesa asignada, verificar que sea la correcta
      if (waitRow.estado === 'asignado') {
        if (!waitRow.mesa_id) {
          console.error('[handleMesaScan] Mesa asignada sin mesa_id');
          const alert = await this.alertCtrl.create({
            header: 'Error',
            message: 'Error: mesa asignada incorrectamente. Contacta al personal.',
            buttons: [
              {
                text: 'CONFIRMAR',
                cssClass: 'alert-button-confirm'
              }
            ],
            cssClass: 'custom-alert'
          });
          await alert.present();
          return;
        }

        // ✅ VALIDACIÓN PRINCIPAL: Verificar que el QR escaneado coincida con la mesa asignada
        if (waitRow.mesa_id !== mesaId) {
          // Obtener el número de la mesa asignada
          const { data: mesaAsignada } = await this.supa.client
            .from('mesas')
            .select('numero')
            .eq('id', waitRow.mesa_id)
            .single();

          const numeroAsignado = mesaAsignada?.numero ?? '?';
          
          const alert = await this.alertCtrl.create({
            header: 'Mesa incorrecta',
            message: `❌ Esta no es tu mesa asignada.\n\n` +
                    `Tu mesa asignada es la N° ${numeroAsignado}.\n\n` +
                    `Por favor escanea el QR de la mesa ${numeroAsignado}.`,
            buttons: [
              {
                text: 'CONFIRMAR',
                cssClass: 'alert-button-confirm'
              }
            ],
            cssClass: 'custom-alert'
          });
          
          await alert.present();
          return;
        }

        // ✅ QR correcto! Navegar a cliente-pedido-en-curso
        console.log('[handleMesaScan] ✅ Mesa correcta! Navegando a cliente-pedido-en-curso...');
        await this.router.navigate(
          ['/cliente-pedido-en-curso'],
          { 
            queryParams: { 
              mesa_id: mesaId,
              mesa_numero: mesaNumero 
            }
          }
        );
      }
    } catch (e: any) {
      console.error('[handleMesaScan] Error:', e);
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Error al verificar la mesa: ' + (e?.message || 'Error desconocido'),
        buttons: [
          {
            text: 'CONFIRMAR',
            cssClass: 'alert-button-confirm'
          }
        ],
        cssClass: 'custom-alert'
      });
      await alert.present();
    }
  }




  verEncuestas() {
    this.router.navigate(['/pagina-resultados-encuestas']);
  }

  irAPedidos() {
    this.router.navigate(['/cliente/cliente-realiza-pedido']);
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

  /**
   * Verifica el estado actual de la mesa del cliente
   */
  async verificarEstadoMesa() {
    try {
      console.log('[DEBUG HOME-CLIENTE] 🔍 Iniciando verificarEstadoMesa...');
      const waitStatus = await this.supa.getWaitStatusDetail();
      console.log('[DEBUG HOME-CLIENTE] ✅ WaitStatus obtenido:', waitStatus);
      this.tieneMesaAsignada = waitStatus?.estado === 'asignado';
      console.log('[DEBUG HOME-CLIENTE] ✅ tieneMesaAsignada:', this.tieneMesaAsignada);
    } catch (error) {
      console.error('[DEBUG HOME-CLIENTE] ❌ Error al verificar estado de mesa:', error);
      this.tieneMesaAsignada = false;
    }
  }

  /**
   * Solicita la cuenta al mozo
   */
  async solicitarCuenta() {
    if (this.loadingLiberar) return;

    try {
      this.loadingLiberar = true;
      
      // Obtener información de la mesa
      const waitStatus = await this.supa.getWaitStatusDetail();
      if (!waitStatus || !waitStatus.numero_mesa) {
        throw new Error('No se pudo obtener información de la mesa');
      }

      // Enviar notificación al mozo
      await this.supa.solicitarCuenta(waitStatus.numero_mesa);
      this.toast.success('Solicitud de cuenta enviada al mozo');

      // Navegar al detalle de cuenta
      this.router.navigate(['/cliente-detalle-cuenta']);
      
    } catch (error: any) {
      console.error('Error al solicitar cuenta:', error);
      this.toast.error(error?.message || 'Error al solicitar la cuenta');
    } finally {
      this.loadingLiberar = false;
    }
  }
}
