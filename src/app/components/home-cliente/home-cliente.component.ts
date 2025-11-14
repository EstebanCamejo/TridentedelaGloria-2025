
// home-cliente.component.ts
import { Component ,NgZone, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  IonContent, IonButton, IonIcon, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, IonTitle, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { qrCodeOutline, albumsOutline, calendarOutline, bicycleOutline, downloadOutline, documentTextOutline } from 'ionicons/icons';
import { Observable, Subscription } from 'rxjs';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';
import { QrPayload, QrService } from 'src/app/services/qr.service';
import { QrHtml5Service } from 'src/app/services/qr-html5.service';
import { ClienteRealtimeService } from 'src/app/services/cliente-realtime.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ReservasService } from 'src/app/services/reservas.service';
import { SesionService } from 'src/app/services/sesion.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, IonTitle],
  templateUrl: './home-cliente.component.html',
  styleUrls: ['./home-cliente.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HomeClienteComponent implements OnInit, OnDestroy {
  email$!: Observable<string | null>;
  loadingLogout = false;
  tieneMesaAsignada = false;
  loadingLiberar = false;
  esClienteRegistrado = false;
  facturaUrl: string | null = null; // URL de la factura cuando llega la notificación
  nombreCliente: string = ''; // Nombre del cliente para mostrar en el navbar
  private facturaSubscription?: Subscription;

  constructor(
    private supa: SupabaseService,
    private router: Router,
    private qr: QrService,
    private qrHtml5: QrHtml5Service,  // 🆕 Scanner web que NO afecta Supabase
    private zone: NgZone,
    private clienteRt: ClienteRealtimeService,  // 🆕 Servicio de notificaciones para cliente
    private toast: ToastrService,
    private spinner: SpinnerService,
    private reservasService: ReservasService,
    private sesion: SesionService,
    private alertCtrl: AlertController
  ) {
    addIcons({ qrCodeOutline, albumsOutline, calendarOutline, bicycleOutline, downloadOutline, documentTextOutline });
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
    
    // Cargar nombre del cliente
    await this.cargarNombreCliente();
    
    try {
      // Iniciar el servicio de notificaciones para cliente
      console.log('🔧 [HomeCliente] Iniciando clienteRt...');
      await this.clienteRt.init();
      console.log('✅ [HomeCliente] clienteRt iniciado');
      
      // Verificar si tiene mesa asignada
      console.log('🔧 [HomeCliente] Verificando estado de mesa...');
      await this.verificarEstadoMesa();
      console.log('✅ [HomeCliente] Estado de mesa verificado');

      // 🆕 Suscribirse a eventos de factura recibida (cuando llega el broadcast)
      this.facturaSubscription = this.clienteRt.facturaRecibida$.subscribe((facturaData) => {
        console.log('[HomeCliente] 📄 Factura recibida desde broadcast:', facturaData);
        this.facturaUrl = facturaData.pdfUrl;
        
        // Mostrar mensaje de confirmación
        this.toast.success('TU FACTURA ESTÁ LISTA', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        
        // Scroll al mensaje si está visible
        setTimeout(() => {
          const facturaSection = document.querySelector('.factura-message');
          if (facturaSection) {
            facturaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      });

      // 🆕 Listener para cuando se toca una notificación
      LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
        console.log('[HomeCliente] 🔔 Notificación tocada:', notification);
        
        const extra = notification.notification?.extra;
        if (extra?.tipo === 'factura_lista' && extra?.pdfUrl) {
          console.log('[HomeCliente] 📄 Factura recibida desde notificación, guardando URL:', extra.pdfUrl);
          
          // Guardar la URL de la factura para mostrarla en el mensaje alusivo
          this.facturaUrl = extra.pdfUrl;
          
          // Intentar abrir directamente cuando se toca la notificación
          this.zone.run(async () => {
            await this.descargarFactura();
          });
        } else if (extra?.route) {
          // Navegar a la ruta especificada (para otras notificaciones)
          this.router.navigate([extra.route]);
        }
      });

    } catch (error) {
      console.error('❌ [HomeCliente] Error en servicios (pero verificación de cliente ya completada):', error);
    }

  }

  ngOnDestroy() {
    // Limpiar suscripciones
    if (this.facturaSubscription) {
      this.facturaSubscription.unsubscribe();
    }
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
            header: 'QR NO VÁLIDO',
            message: 'EL CÓDIGO QR ESCANEADO NO ES VÁLIDO. POR FAVOR INTENTA NUEVAMENTE',
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
   * 🔒 Verifica que el cliente pueda escanear la mesa:
   * 1. Si tiene reserva confirmada y está en tiempo válido, puede escanear su mesa asignada
   * 2. Si tiene mesa asignada en lista_espera, solo puede escanear esa mesa
   * 3. Si no tiene mesa asignada, debe primero inscribirse en lista de espera
   */
  private async handleMesaScan(mesaId: string, mesaNumero?: number) {
    try {
      const userId = this.supa.idUsuario;
      if (!userId) {
        const alert = await this.alertCtrl.create({
          header: 'ERROR DE IDENTIFICACIÓN',
          message: 'NO SE PUDO IDENTIFICAR EL USUARIO. POR FAVOR INICIA SESIÓN NUEVAMENTE',
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

      // PRIORIDAD 1: Verificar si tiene una reserva confirmada con esta mesa
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Primero verificar si hay una reserva (confirmada o cancelada) para esta mesa
      const { data: reservaConfirmada, error: errorReserva } = await this.supa.client
        .from('reservas')
        .select('id, fecha, hora, mesa_id, estado, motivo_rechazo')
        .eq('usuario_id', userId)
        .eq('mesa_id', mesaId)
        .eq('fecha', fechaHoy)
        .maybeSingle();

      // Si la reserva fue cancelada por tiempo excedido, mostrar mensaje específico
      if (!errorReserva && reservaConfirmada && reservaConfirmada.estado === 'cancelada') {
        // Obtener el tiempo máximo de espera para incluirlo en el mensaje
        const tiempoMaximoEspera = await this.obtenerTiempoMaximoEspera();
        
        // Construir mensaje: usar motivo_rechazo si está disponible, sino construir uno genérico
        let mensaje = `❌ Tu reserva fue cancelada porque excediste el tiempo máximo de espera (${tiempoMaximoEspera} minutos) sin realizar un pedido.\n\n`;
        
        if (reservaConfirmada.motivo_rechazo) {
          mensaje += `Motivo: ${reservaConfirmada.motivo_rechazo}\n\n`;
        }
        
        mensaje += `Por favor, contacta al personal del restaurante si necesitas asistencia.`;
        
        const alert = await this.alertCtrl.create({
          header: 'Reserva Cancelada',
          message: mensaje,
          buttons: [
            {
              text: 'ENTENDIDO',
              cssClass: 'alert-button-confirm'
            }
          ],
          cssClass: 'custom-alert'
        });
        await alert.present();
        return;
      }

      // Continuar solo si la reserva está confirmada
      if (!errorReserva && reservaConfirmada && reservaConfirmada.estado === 'confirmada') {
        // Verificar si estamos en el tiempo válido (desde la hora de la reserva hasta 45 minutos después)
        const tiempoMaximoEspera = await this.obtenerTiempoMaximoEspera(); // en minutos
        const ahora = new Date();
        const [horas, minutos] = reservaConfirmada.hora.split(':');
        const horaReserva = new Date();
        horaReserva.setHours(parseInt(horas), parseInt(minutos), 0, 0);
        
        const tiempoLimite = new Date(horaReserva.getTime() + (tiempoMaximoEspera * 60 * 1000));
        
        console.log('[handleMesaScan] Reserva encontrada:', {
          horaReserva: horaReserva.toISOString(),
          tiempoLimite: tiempoLimite.toISOString(),
          ahora: ahora.toISOString(),
          tiempoMaximoEspera
        });

        if (ahora >= horaReserva && ahora <= tiempoLimite) {
          // ✅ Está en el tiempo válido, verificar que la mesa esté en estado reservaActiva
          const { data: mesa, error: errorMesa } = await this.supa.client
            .from('mesas')
            .select('estado, numero')
            .eq('id', mesaId)
            .single();

          if (errorMesa || !mesa) {
            const alert = await this.alertCtrl.create({
              header: 'Error',
              message: 'No se pudo verificar el estado de la mesa. Intenta nuevamente.',
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

          // Verificar que el estado de la mesa sea reservaActiva
          if (mesa.estado !== 'reservaActiva') {
            const alert = await this.alertCtrl.create({
              header: 'Mesa no disponible',
              message: `⏳ La mesa N° ${mesa.numero || '?'} aún no está lista para tu reserva.\n\nPor favor espera a que el personal active tu mesa.`,
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

          // ✅ Todo correcto: reserva válida, tiempo válido y mesa en estado reservaActiva
          console.log('[handleMesaScan] ✅ Reserva válida y mesa en estado reservaActiva! Navegando a cliente-pedido-en-curso...');
          await this.router.navigate(
            ['/cliente-pedido-en-curso'],
            { 
              queryParams: { 
                mesa_id: mesaId,
                mesa_numero: mesaNumero 
              }
            }
          );
          return;
        } else if (ahora < horaReserva) {
          const alert = await this.alertCtrl.create({
            header: 'Reserva no disponible aún',
            message: `Tu reserva es a las ${reservaConfirmada.hora}.\n\nPor favor espera hasta la hora de tu reserva.`,
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
        } else {
          // Tiempo expirado
          const alert = await this.alertCtrl.create({
            header: 'Tiempo de reserva expirado',
            message: `El tiempo máximo de espera para tu reserva ha expirado (${tiempoMaximoEspera} minutos).\n\nPor favor contacta al personal.`,
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
      }

      // PRIORIDAD 2: Consultar si el cliente tiene una mesa asignada en lista_espera
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
          header: 'ERROR',
          message: 'ERROR AL VERIFICAR TU ESTADO. INTENTA NUEVAMENTE',
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
          header: 'ESPERANDO ASIGNACIÓN',
          message: 'AÚN NO TIENES UNA MESA ASIGNADA.\n\nPOR FAVOR ESPERA A QUE EL MAÎTRE TE ASIGNE UNA MESA',
          buttons: [
            {
              text: '✓',
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
            header: 'ERROR',
            message: 'MESA ASIGNADA INCORRECTAMENTE. CONTACTA AL PERSONAL',
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
            header: 'MESA INCORRECTA',
            message: `ESTA NO ES TU MESA ASIGNADA.\n\n` +
                    `TU MESA ASIGNADA ES LA N° ${numeroAsignado}.\n\n` +
                    `POR FAVOR ESCANEA EL QR DE LA MESA ${numeroAsignado}`,
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
        header: 'ERROR',
        message: 'ERROR AL VERIFICAR LA MESA: ' + (e?.message || 'ERROR DESCONOCIDO').toUpperCase(),
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

  /**
   * Obtiene el tiempo máximo de espera desde Supabase (configurable)
   * Por defecto 45 minutos si no está configurado
   */
  private async obtenerTiempoMaximoEspera(): Promise<number> {
    try {
      // Intentar obtener desde una tabla de configuración en Supabase
      const { data, error } = await this.supa.client
        .from('configuracion')
        .select('valor')
        .eq('clave', 'tiempo_maximo_espera_reserva_minutos')
        .maybeSingle();

      if (!error && data && data.valor) {
        return parseInt(data.valor, 10);
      }

      // Valor por defecto: 45 minutos
      return 45;
    } catch (error) {
      console.warn('[obtenerTiempoMaximoEspera] Error al obtener configuración, usando valor por defecto:', error);
      return 45;
    }
  }




  verEncuestas() {
    this.router.navigate(['/pagina-resultados-encuestas']);
  }

  irAFormularioEncuesta() {
    this.router.navigate(['/form-encuesta']);
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
      this.toast.success('SOLICITUD DE CUENTA ENVIADA AL MOZO', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });

      // Navegar al detalle de cuenta
      this.router.navigate(['/cliente-detalle-cuenta']);
      
    } catch (error: any) {
      console.error('Error al solicitar cuenta:', error);
      this.toast.error((error?.message || 'ERROR AL SOLICITAR LA CUENTA').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
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
   * Carga el nombre del cliente (registrado o anónimo)
   */
  async cargarNombreCliente() {
    try {
      // Esperar a que el perfil esté cargado para tener datos de sesión disponibles
      await this.esperarPerfilCargado();
      
      const userId = this.supa.idUsuario;
      if (!userId) {
        console.warn('[HomeCliente] No hay usuario logueado, no se puede cargar nombre');
        this.nombreCliente = '';
        return;
      }

      // Para clientes registrados, usar datos de sesión
      if (this.esClienteRegistrado && this.sesion.usuarioBD) {
        const nombres = this.sesion.usuarioBD.nombres || '';
        const apellidos = this.sesion.usuarioBD.apellidos || '';
        this.nombreCliente = `${nombres} ${apellidos}`.trim() || this.sesion.usuarioBD.email || 'Cliente';
        console.log('[HomeCliente] Nombre cargado desde sesión:', this.nombreCliente);
        return;
      }

      // Para clientes anónimos o si no hay datos en sesión, consultar BD
      const { data: usuario, error } = await this.supa.client
        .from('usuarios')
        .select('nombres, apellidos, email')
        .eq('auth_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[HomeCliente] Error al obtener nombre del cliente:', error);
        this.nombreCliente = 'Cliente';
        return;
      }

      if (usuario) {
        const nombres = usuario.nombres || '';
        const apellidos = usuario.apellidos || '';
        this.nombreCliente = `${nombres} ${apellidos}`.trim() || usuario.email || 'Cliente';
        console.log('[HomeCliente] Nombre cargado desde BD:', this.nombreCliente);
      } else {
        this.nombreCliente = 'Cliente';
        console.log('[HomeCliente] No se encontró usuario, usando "Cliente" por defecto');
      }
    } catch (error) {
      console.error('[HomeCliente] Error al cargar nombre del cliente:', error);
      this.nombreCliente = 'Cliente';
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
      this.toast.warning('SOLO LOS CLIENTES REGISTRADOS PUEDEN HACER RESERVAS', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      return;
    }
    this.router.navigate(['/cliente/hacer-reserva']);
  }

  /**
   * Navega a la página de pedido de repartidor
   * Solo permite acceso a clientes registrados
   */
  hacerPedidoDelivery() {
    if (!this.esClienteRegistrado) {
      this.toast.error('SOLO LOS CLIENTES REGISTRADOS PUEDEN HACER PEDIDOS DE REPARTIDOR', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      return;
    }
    // Si es cliente registrado, navegar a la página de pedidos repartidor
    this.router.navigate(['/cliente/cliente-realiza-pedido'], { 
      queryParams: { tipo: 'delivery' } 
    });
  }

  /**
   * Descargar/Abrir factura PDF
   */
  async descargarFactura() {
    if (!this.facturaUrl) {
      this.toast.error('NO HAY FACTURA DISPONIBLE', '', {
        positionClass: 'toast-center',
        timeOut: 2000
      });
      return;
    }

    try {
      console.log('[HomeCliente] 📄 Descargando y abriendo factura:', this.facturaUrl);
      
      this.spinner.show({ immediate: true });
      
      // Mostrar toast de carga
      const loadingToast = this.toast.info('DESCARGANDO FACTURA...', '', {
        positionClass: 'toast-center',
        disableTimeOut: true,
        timeOut: 0
      });

      // 1. Descargar el archivo usando fetch para evitar problemas de CORS
      const response = await fetch(this.facturaUrl);
      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status} ${response.statusText}`);
      }

      // 2. Convertir a blob
      const blob = await response.blob();
      console.log('[HomeCliente] ✅ Blob creado, tamaño:', blob.size, 'bytes');

      // 3. Convertir blob a base64 para usar con Filesystem
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1]; // Remover el prefijo data:application/pdf;base64,
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileName = `factura_${Date.now()}.pdf`;
      let downloadSuccess = false;

      // 4. MÉTODO PRINCIPAL: Si estamos en móvil, usar Filesystem para guardar directamente
      if (Capacitor.isNativePlatform()) {
        try {
          console.log('[HomeCliente] 📱 Guardando archivo con Filesystem...');
          
          // Para archivos binarios, no usar encoding, pasar base64 directamente
          // Guardar en el directorio de documentos (accesible para el usuario)
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents, // Usa Documents que es más accesible que Data
            // No especificar encoding para archivos binarios
          });
          
          console.log('[HomeCliente] ✅ Archivo guardado en:', result.uri);
          downloadSuccess = true;
          
          // Obtener la URI pública para abrir el archivo
          const readResult = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Documents,
          });
          
          this.toast.success('FACTURA GUARDADA CORRECTAMENTE', '', {
            positionClass: 'toast-center',
            timeOut: 3000
          });
          
          // Intentar abrir el archivo guardado
          try {
            await AppLauncher.openUrl({ url: readResult.uri });
            console.log('[HomeCliente] ✅ Archivo abierto desde:', readResult.uri);
          } catch (openError) {
            console.log('[HomeCliente] No se pudo abrir automáticamente, pero está guardado');
          }
        } catch (filesystemError: any) {
          console.error('[HomeCliente] ❌ Error al guardar con Filesystem:', filesystemError);
          // Intentar con Directory.Data como fallback
          try {
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Data,
              // No especificar encoding para archivos binarios
            });
            console.log('[HomeCliente] ✅ Archivo guardado en Data:', result.uri);
            downloadSuccess = true;
          } catch (fallbackError) {
            console.error('[HomeCliente] ❌ Fallback también falló:', fallbackError);
          }
        }
      }

      // 5. MÉTODO WEB/FALLBACK: Para web o si Filesystem falló, usar blob URL
      if (!Capacitor.isNativePlatform() || !downloadSuccess) {
        try {
          const blobUrl = URL.createObjectURL(blob);
          
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = fileName;
          downloadLink.style.display = 'none';
          downloadLink.setAttribute('download', fileName);
          
          document.body.appendChild(downloadLink);
          
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          
          downloadLink.dispatchEvent(clickEvent);
          downloadLink.click();
          
          console.log('[HomeCliente] ✅ Click de descarga ejecutado (web)');
          downloadSuccess = true;
          
          setTimeout(() => {
            if (document.body.contains(downloadLink)) {
              document.body.removeChild(downloadLink);
            }
            URL.revokeObjectURL(blobUrl);
          }, 500);
        } catch (webError) {
          console.warn('[HomeCliente] ⚠️ Método web falló:', webError);
        }
      }

      // 7. Abrir en el navegador para visualización (siempre)
      if (this.facturaUrl) {
        setTimeout(() => {
          const viewLink = document.createElement('a');
          viewLink.href = this.facturaUrl!;
          viewLink.target = '_blank';
          viewLink.rel = 'noopener noreferrer';
          viewLink.style.display = 'none';
          
          document.body.appendChild(viewLink);
          viewLink.click();
          
          setTimeout(() => {
            if (document.body.contains(viewLink)) {
              document.body.removeChild(viewLink);
            }
          }, 100);
        }, 200);
      }

      // 8. También intentar con AppLauncher en móvil
      if (Capacitor.isNativePlatform() && this.facturaUrl) {
        setTimeout(async () => {
          try {
            await AppLauncher.openUrl({ url: this.facturaUrl! });
            console.log('[HomeCliente] ✅ También abierto con AppLauncher');
          } catch (launcherError) {
            console.log('[HomeCliente] AppLauncher no disponible');
          }
        }, 500);
      }

      // Limpiar blob URL si se creó (solo en web)
      if (!Capacitor.isNativePlatform() || !downloadSuccess) {
        // El blobUrl ya se revocó en el método web
      }

      // Cerrar toast de carga y mostrar éxito
      if (loadingToast && typeof loadingToast === 'object' && 'toastId' in loadingToast) {
        this.toast.clear((loadingToast as any).toastId);
      }
      
      this.spinner.hide();
      
      if (downloadSuccess) {
        this.toast.success('FACTURA DESCARGADA Y ABIERTA', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
      } else {
        this.toast.warning('FACTURA ABIERTA. SI NO SE DESCARGÓ, USA EL MENÚ DEL NAVEGADOR PARA GUARDARLA', '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
      }
      
    } catch (error: any) {
      console.error('[HomeCliente] ❌ Error al descargar factura:', error);
      this.spinner.hide();
      
      // Fallback: intentar abrir directamente sin descarga
      try {
        const link = document.createElement('a');
        link.href = this.facturaUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 100);
        
        this.toast.warning('NO SE PUDO DESCARGAR, PERO SE ABRIÓ EN EL NAVEGADOR', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
      } catch (fallbackError) {
        // Si todo falla, mostrar alert
        const alert = await this.alertCtrl.create({
          header: 'ERROR AL DESCARGAR FACTURA',
          message: `NO SE PUDO DESCARGAR LA FACTURA. PUEDES COPIAR ESTE ENLACE:\n\n${this.facturaUrl}`,
          buttons: [
            {
              text: 'COPIAR URL',
              handler: async () => {
                try {
                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(this.facturaUrl || '');
                    this.toast.success('URL COPIADA AL PORTAPAPELES', '', {
                      positionClass: 'toast-center',
                      timeOut: 2000
                    });
                  } else {
                    const textArea = document.createElement('textarea');
                    textArea.value = this.facturaUrl || '';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    this.toast.success('URL COPIADA', '', {
                      positionClass: 'toast-center',
                      timeOut: 2000
                    });
                  }
                } catch (copyError) {
                  console.error('Error al copiar:', copyError);
                }
              }
            },
            {
              text: 'CERRAR',
              role: 'cancel'
            }
          ],
          cssClass: 'custom-alert'
        });
        await alert.present();
      }
    }
  }

  /**
   * Cerrar mensaje de factura
   */
  cerrarMensajeFactura() {
    this.facturaUrl = null;
  }
}
