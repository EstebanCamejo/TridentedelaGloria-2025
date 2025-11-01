
// home-cliente.component.ts
import { Component ,NgZone, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  IonContent, IonButton, IonIcon, IonHeader, IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { qrCodeOutline, albumsOutline, calendarOutline, bicycleOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';
import { QrPayload, QrService } from 'src/app/services/qr.service';
import { QrHtml5Service } from 'src/app/services/qr-html5.service';
import { ClienteRealtimeService } from 'src/app/services/cliente-realtime.service';
import { ToastrService } from 'ngx-toastr';
import { ReservasService } from 'src/app/services/reservas.service';
import { SesionService } from 'src/app/services/sesion.service';

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
  esClienteRegistrado = false;

  constructor(
    private supa: SupabaseService,
    private router: Router,
    private qr: QrService,
    private qrHtml5: QrHtml5Service,  // 🆕 Scanner web que NO afecta Supabase
    private zone: NgZone,
    private clienteRt: ClienteRealtimeService,  // 🆕 Servicio de notificaciones para cliente
    private toast: ToastrService,
    private reservasService: ReservasService,
    private sesion: SesionService
  ) {
    addIcons({ qrCodeOutline, albumsOutline, calendarOutline, bicycleOutline });
    this.email$ = this.supa.authEmail$;
    console.log('🏗️ [HomeCliente] Constructor ejecutado');
  }

  async ngOnInit() {
    console.log('🚀 [HomeCliente] ngOnInit iniciado');
    console.log('🔍 [HomeCliente] esClienteRegistrado inicial:', this.esClienteRegistrado);
    
    // PRIMERO: Verificar si es cliente registrado (antes de otros servicios)
    console.log('🔍 [HomeCliente] Llamando a verificarTipoCliente...');
    await this.verificarTipoCliente();
    console.log('✅ [HomeCliente] verificarTipoCliente completado');
    
    try {
      // Iniciar el servicio de notificaciones para cliente
      console.log('🔧 [HomeCliente] Iniciando clienteRt...');
      await this.clienteRt.init();
      console.log('✅ [HomeCliente] clienteRt iniciado');
      
      // Verificar si tiene mesa asignada
      console.log('🔧 [HomeCliente] Verificando estado de mesa...');
      await this.verificarEstadoMesa();
      console.log('✅ [HomeCliente] Estado de mesa verificado');

    } catch (error) {
      console.error('❌ [HomeCliente] Error en servicios (pero verificación de cliente ya completada):', error);
    }
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
          alert('QR no válido');
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
        alert('No se pudo identificar el usuario. Por favor inicia sesión nuevamente.');
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
        alert('Error al verificar tu estado. Intenta nuevamente.');
        return;
      }

      // CASO 1: No tiene mesa asignada aún (estado 'esperando')
      if (!waitRow || waitRow.estado === 'esperando') {
        alert('⏳ Aún no tienes una mesa asignada.\n\nPor favor espera a que el maitre te asigne una mesa.');
        return;
      }

      // CASO 2: Tiene mesa asignada, verificar que sea la correcta
      if (waitRow.estado === 'asignado') {
        if (!waitRow.mesa_id) {
          console.error('[handleMesaScan] Mesa asignada sin mesa_id');
          alert('Error: mesa asignada incorrectamente. Contacta al personal.');
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
          
          alert(`❌ Esta no es tu mesa asignada.\n\n` +
                `Tu mesa asignada es la N° ${numeroAsignado}.\n\n` +
                `Por favor escanea el QR de la mesa ${numeroAsignado}.`);
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
      alert('Error al verificar la mesa: ' + (e?.message || 'Error desconocido'));
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
      const waitStatus = await this.supa.getWaitStatusDetail();
      this.tieneMesaAsignada = waitStatus?.estado === 'asignado';
    } catch (error) {
      console.error('Error al verificar estado de mesa:', error);
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

  /**
   * Verifica si el usuario es cliente registrado
   */
  async verificarTipoCliente() {
    try {
      // Método 1: Usar servicio de sesión
      await this.esperarPerfilCargado();
      
      console.log('🔍 Debug - Usuario BD:', this.sesion.usuarioBD);
      console.log('🔍 Debug - Perfil:', this.sesion.usuarioBD?.perfil);
      console.log('🔍 Debug - esCliente():', this.sesion.esCliente());
      
      // Verificar usando el servicio de sesión
      this.esClienteRegistrado = this.sesion.esCliente() && 
        this.sesion.usuarioBD?.perfil === 'clienteReg';
      
      console.log('✅ Es cliente registrado (método 1):', this.esClienteRegistrado);
      
      // Método 2: Verificación directa si el método 1 falla
      if (!this.esClienteRegistrado) {
        console.log('🔄 Intentando verificación directa...');
        const esRegistradoDirecto = await this.reservasService.esClienteRegistrado();
        console.log('✅ Es cliente registrado (método 2):', esRegistradoDirecto);
        this.esClienteRegistrado = esRegistradoDirecto;
      }
      
    } catch (error) {
      console.error('❌ Error al verificar tipo de cliente:', error);
      this.esClienteRegistrado = false;
    }
  }

  /**
   * Espera a que el perfil esté cargado
   */
  private async esperarPerfilCargado(timeout = 5000): Promise<void> {
    console.log('⏳ [HomeCliente] Esperando perfil cargado...');
    console.log('⏳ [HomeCliente] perfilCargado actual:', this.sesion.perfilCargado);
    
    const inicio = Date.now();
    while (!this.sesion.perfilCargado) {
      if (Date.now() - inicio > timeout) {
        console.error('❌ [HomeCliente] Timeout esperando perfil');
        throw new Error('Timeout esperando perfil');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ [HomeCliente] Perfil cargado correctamente');
  }

  /**
   * Navega a la página de hacer reserva
   */
  hacerReserva() {
    if (!this.esClienteRegistrado) {
      this.toast.warning('Solo los clientes registrados pueden hacer reservas');
      return;
    }
    this.router.navigate(['/cliente/hacer-reserva']);
  }

  /**
   * Navega a la página de pedido de delivery
   */
  hacerPedidoDelivery() {
    // Por ahora navega a la misma página de pedidos, pero podrías crear una específica para delivery
    this.router.navigate(['/cliente/cliente-realiza-pedido'], { 
      queryParams: { tipo: 'delivery' } 
    });
  }
}
