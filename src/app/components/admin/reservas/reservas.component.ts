import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonButtons,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  AlertController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, 
  timeOutline, 
  peopleOutline, 
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  personOutline,
  restaurantOutline,
  chevronBackOutline,
  chevronForwardOutline,
  documentTextOutline,
  alertCircleOutline
} from 'ionicons/icons';
import type { SegmentChangeEventDetail } from '@ionic/angular';
import { ReservasService, Reserva } from '../../../services/reservas.service';
import { SupabaseService } from '../../../services/supabase.service';
import { SpinnerService } from '../../../services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import { MesasService } from '../../../services/mesas.service';
import type { RefresherCustomEvent } from '@ionic/angular';

@Component({
  selector: 'app-reservas-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonButtons,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel
  ],
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.scss']
})
export class ReservasAdminComponent implements OnInit, OnDestroy {
  reservas: any[] = [];
  cargando = false;
  cargandoAccion = false;
  cargandoConfirmar = false;
  cargandoRechazar = false;
  
  // Segmento de navegación
  segmentoActual: 'pendientes' | 'confirmadas' | 'rechazadas' = 'pendientes';
  
  // Carrusel
  indiceReservaActual: number = 0;

  // Cache para números de mesa
  private mesaCache: Map<string, number> = new Map();

  constructor(
    private reservasService: ReservasService,
    private supa: SupabaseService,
    private router: Router,
    private toast: ToastrService,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private spinner: SpinnerService,
    private mesasService: MesasService
  ) {
    addIcons({ 
      calendarOutline, 
      timeOutline, 
      peopleOutline, 
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline,
      personOutline,
      restaurantOutline,
      chevronBackOutline,
      chevronForwardOutline,
      documentTextOutline,
      alertCircleOutline
    });
  }

  async ngOnInit() {
    await this.cargarReservas();
  }

  ngOnDestroy() {
    // Cleanup si es necesario
  }

  /**
   * Carga todas las reservas según el estado del segmento
   */
  async cargarReservas() {
    try {
      this.cargando = true;
      this.spinner.show({ immediate: true });
      
      let estado: 'pendiente confirmacion' | 'confirmada' | 'rechazada';
      switch (this.segmentoActual) {
        case 'pendientes':
          estado = 'pendiente confirmacion';
          break;
        case 'confirmadas':
          estado = 'confirmada';
          break;
        case 'rechazadas':
          estado = 'rechazada';
          break;
      }
      
      this.reservas = await this.reservasService.obtenerReservasPorEstado(estado);
      this.indiceReservaActual = 0; // Resetear índice al cambiar segmento
      
      // Precargar números de mesa para reservas confirmadas
      if (estado === 'confirmada') {
        await this.precargarNumerosMesa();
      }
    } catch (error: any) {
      console.error('Error al cargar reservas:', error);
      this.toast.error((error?.message || 'ERROR AL CARGAR LAS RESERVAS').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.cargando = false;
      this.spinner.hide();
    }
  }

  /**
   * Maneja el cambio de segmento
   */
  onSegmentChange(event: CustomEvent<SegmentChangeEventDetail>) {
    const valor = event.detail.value;
    if (valor === 'pendientes' || valor === 'confirmadas' || valor === 'rechazadas') {
      this.segmentoActual = valor;
      this.cargarReservas();
    }
  }

  /**
   * Navega a la siguiente reserva en el carrusel
   */
  siguienteReserva() {
    if (this.indiceReservaActual < this.reservas.length - 1) {
      this.indiceReservaActual++;
    }
  }

  /**
   * Navega a la reserva anterior en el carrusel
   */
  anteriorReserva() {
    if (this.indiceReservaActual > 0) {
      this.indiceReservaActual--;
    }
  }

  /**
   * Obtiene la reserva actual del carrusel
   */
  obtenerReservaActual(): any | null {
    return this.reservas[this.indiceReservaActual] || null;
  }

  /**
   * Refresca la lista de reservas
   */
  async refrescar(event: RefresherCustomEvent) {
    await this.cargarReservas();
    event.target.complete();
  }

  /**
   * Muestra la nota de la reserva en un modal con letra grande
   */
  async verNota(reserva: Reserva) {
    if (!reserva.nota) return;

    const alert = await this.alertController.create({
      header: 'NOTA DEL CLIENTE',
      message: reserva.nota,
      buttons: [
        {
          text: 'CERRAR',
          role: 'cancel',
          cssClass: 'secondary'
        }
      ],
      cssClass: 'nota-alert'
    });

    await alert.present();
  }

  /**
   * Muestra el motivo de rechazo de la reserva en un modal con letra grande
   */
  async verMotivoRechazo(reserva: Reserva) {
    if (!reserva.motivo_rechazo) return;

    const alert = await this.alertController.create({
      header: 'MOTIVO DEL RECHAZO',
      message: reserva.motivo_rechazo,
      buttons: [
        {
          text: 'CERRAR',
          role: 'cancel',
          cssClass: 'secondary'
        }
      ],
      cssClass: 'motivo-alert'
    });

    await alert.present();
  }

  /**
   * Confirma una reserva y permite asignar una mesa
   */
  async confirmarReserva(reserva: Reserva) {
    if (!reserva.id) return;

    try {
      // Obtener mesas disponibles para esta reserva
      const mesasDisponibles = await this.reservasService.obtenerMesasDisponiblesParaReserva(
        reserva.fecha,
        reserva.hora,
        reserva.cantidad_comensales
      );

      if (mesasDisponibles.length === 0) {
        const alert = await this.alertController.create({
          header: 'Sin mesas disponibles',
          message: `No hay mesas disponibles para ${reserva.cantidad_comensales} comensales en el horario ${this.formatearFecha(reserva.fecha)} a las ${reserva.hora}.`,
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      // Crear action sheet con las mesas disponibles
      const buttons: any[] = [
        // Botón de cerrar (X) al inicio
        {
          text: '',
          role: 'cancel',
          icon: 'close-outline',
          cssClass: 'close-button'
        },
        // Mesas disponibles
        ...mesasDisponibles.map(mesa => ({
          text: `Mesa ${mesa.numero} (Capacidad: ${mesa.capacidad})`,
          icon: 'restaurant-outline',
          cssClass: 'mesa-button',
          handler: async () => {
            await this.confirmarReservaConMesa(reserva.id!.toString(), mesa.id);
          }
        }))
      ];

      const actionSheet = await this.actionSheetController.create({
        buttons: buttons,
        cssClass: 'mesas-action-sheet'
      });

      await actionSheet.present();
    } catch (error) {
      console.error('Error al obtener mesas disponibles:', error);
      this.toast.error('Error al obtener mesas disponibles');
    }
  }

  /**
   * Confirma la reserva con la mesa seleccionada
   */
  private async confirmarReservaConMesa(reservaId: string, mesaId: string) {
    const alert = await this.alertController.create({
      header: '¿CONFIRMAR RESERVA?',
      buttons: [
        {
          text: '',
          role: 'cancel',
          cssClass: 'btn-cancel-icon',
          handler: () => {
            // Cerrar sin confirmar
          }
        },
        {
          text: '',
          cssClass: 'btn-confirm-icon',
          handler: async () => {
            // Cerrar el alert primero
            await alert.dismiss();
            // Mostrar spinner inmediatamente
            this.spinner.show({ immediate: true, minMs: 1000 });
            // Ejecutar la confirmación
            await this.confirmarReservaCompleta(reservaId, mesaId);
          }
        }
      ],
      cssClass: 'confirmar-reserva-alert'
    });

    await alert.present();
  }

  /**
   * Rechaza una reserva con motivo
   */
  async rechazarReserva(reserva: Reserva) {
    if (!reserva.id) return;

    const alert = await this.alertController.create({
      header: '¿RECHAZAR RESERVA?',
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: 'MOTIVO DEL RECHAZO (OBLIGATORIO)',
          attributes: {
            maxlength: 500,
            rows: 3
          }
        }
      ],
      buttons: [
        {
          text: '',
          role: 'cancel',
          cssClass: 'btn-cancel-icon'
        },
        {
          text: '',
          cssClass: 'btn-reject-icon',
          handler: async (data) => {
            if (!data.motivo || data.motivo.trim().length === 0) {
              this.toast.error('DEBÉS INDICAR EL MOTIVO DEL RECHAZO', '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
              return false;
            }
            // Cerrar el alert primero
            await alert.dismiss();
            // Mostrar spinner inmediatamente
            this.spinner.show({ immediate: true, minMs: 1000 });
            // Ejecutar el rechazo
            await this.rechazarReservaCompleta(reserva.id!.toString(), data.motivo.trim());
            return true;
          }
        }
      ],
      cssClass: 'rechazar-reserva-alert'
    });

    await alert.present();
  }

  /**
   * Confirma una reserva completa (estado + mesa + email)
   */
  private async confirmarReservaCompleta(reservaId: string, mesaId?: string) {
    try {
      this.cargandoConfirmar = true;
      // El spinner ya se mostró antes de llamar a esta función
      
      const res = await this.reservasService.confirmarReserva(reservaId, mesaId);
      
      const mensaje = mesaId 
        ? 'Reserva confirmada y mesa asignada exitosamente' 
        : 'Reserva confirmada exitosamente';
      
      this.toast.success(mensaje);
      
      if (!res.ok) {
        this.toast.warning(`RESERVA CONFIRMADA, PERO EL CORREO NO SE ENVIÓ${res.detail ? `: ${res.detail.toUpperCase()}` : ''}`, '', {
          positionClass: 'toast-center',
          timeOut: 6000
        });
        console.warn('notificar-cliente (confirmada) falló:', res);
      }
      
      await this.cargarReservas();
      this.indiceReservaActual = 0; // Resetear índice después de confirmar/rechazar
    } catch (error: any) {
      console.error('Error al confirmar reserva:', error);
      this.toast.error((error?.message || 'ERROR AL CONFIRMAR LA RESERVA').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.cargandoConfirmar = false;
      this.spinner.hide();
    }
  }

  /**
   * Rechaza una reserva completa (estado + motivo + email)
   */
  private async rechazarReservaCompleta(reservaId: string, motivoRechazo: string) {
    try {
      this.cargandoRechazar = true;
      // El spinner ya se mostró antes de llamar a esta función
      
      const res = await this.reservasService.rechazarReserva(reservaId, motivoRechazo);
      
      this.toast.success('RESERVA RECHAZADA EXITOSAMENTE', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      
      if (!res.ok) {
        this.toast.warning(`RESERVA RECHAZADA, PERO EL CORREO NO SE ENVIÓ${res.detail ? `: ${res.detail.toUpperCase()}` : ''}`, '', {
          positionClass: 'toast-center',
          timeOut: 6000
        });
        console.warn('notificar-cliente (rechazada) falló:', res);
      }
      
      await this.cargarReservas();
      this.indiceReservaActual = 0; // Resetear índice después de confirmar/rechazar
    } catch (error: any) {
      console.error('Error al rechazar reserva:', error);
      this.toast.error((error?.message || 'ERROR AL RECHAZAR LA RESERVA').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.cargandoRechazar = false;
      this.spinner.hide();
    }
  }

  /**
   * Obtiene el nombre del cliente de la reserva
   */
  obtenerNombreCliente(reserva: any): string {
    return reserva.nombre_cliente || 'CLIENTE';
  }

  /**
   * Obtiene el email del cliente de la reserva
   */
  obtenerEmailCliente(reserva: any): string {
    return reserva.email_cliente || 'SIN CORREO';
  }

  /**
   * Obtiene el número de mesa asignada a la reserva
   */
  async obtenerNumeroMesa(reserva: any): Promise<number | null> {
    if (!reserva.mesa_id) return null;

    // Verificar cache primero
    if (this.mesaCache.has(reserva.mesa_id)) {
      return this.mesaCache.get(reserva.mesa_id) || null;
    }

    try {
      const mesa = await this.mesasService.getMesaById(reserva.mesa_id);
      if (mesa && mesa.numero) {
        this.mesaCache.set(reserva.mesa_id, mesa.numero);
        return mesa.numero;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener número de mesa:', error);
      return null;
    }
  }

  /**
   * Obtiene el número de mesa de forma síncrona (desde cache o datos de la reserva)
   */
  obtenerNumeroMesaSync(reserva: any): number | null {
    // Si la reserva ya tiene el número de mesa (desde un join), usarlo
    if (reserva.numero_mesa) {
      return reserva.numero_mesa;
    }

    // Si no, intentar desde el cache
    if (reserva.mesa_id && this.mesaCache.has(reserva.mesa_id)) {
      return this.mesaCache.get(reserva.mesa_id) || null;
    }

    return null;
  }

  /**
   * Precarga los números de mesa para todas las reservas confirmadas
   */
  private async precargarNumerosMesa() {
    const reservasConMesa = this.reservas.filter(r => r.mesa_id && !this.mesaCache.has(r.mesa_id));
    
    if (reservasConMesa.length === 0) return;

    // Cargar todas las mesas en paralelo
    const promesas = reservasConMesa.map(async (reserva) => {
      try {
        const mesa = await this.mesasService.getMesaById(reserva.mesa_id);
        if (mesa && mesa.numero) {
          this.mesaCache.set(reserva.mesa_id, mesa.numero);
        }
      } catch (error) {
        console.error(`Error al precargar mesa ${reserva.mesa_id}:`, error);
      }
    });

    await Promise.all(promesas);
  }

  /**
   * Formatea la fecha para mostrar
   */
  formatearFecha(fecha: string): string {
    console.log('🔍 Debug - Fecha recibida:', fecha);
    
    // Crear la fecha correctamente para evitar problemas de zona horaria
    const [year, month, day] = fecha.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    console.log('🔍 Debug - Fecha creada:', date);
    console.log('🔍 Debug - Día de la semana:', date.getDay());
    
    const fechaFormateada = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    console.log('🔍 Debug - Fecha formateada:', fechaFormateada);
    
    return fechaFormateada;
  }

  /**
   * Formatea la hora para mostrar
   */
  formatearHora(hora: string): string {
    // Si la hora viene en formato HH:mm:ss, solo tomar HH:mm
    if (hora.includes(':')) {
      const [hours, minutes] = hora.split(':');
      return `${hours}:${minutes}`;
    }
    return hora;
  }

  /**
   * Obtiene el color del badge según el estado
   */
  obtenerColorEstado(estado: string): string {
    switch (estado) {
      case 'pendiente confirmacion':
        return 'warning';
      case 'confirmada':
        return 'success';
      case 'rechazada':
        return 'danger';
      case 'cancelada':
        return 'medium';
      default:
        return 'medium';
    }
  }

  /**
   * Formatea el estado para mostrar
   */
  formatearEstado(estado: string): string {
    switch (estado) {
      case 'pendiente confirmacion':
        return 'PENDIENTE CONFIRMACIÓN';
      case 'confirmada':
        return 'CONFIRMADA';
      case 'rechazada':
        return 'RECHAZADA';
      case 'cancelada':
        return 'CANCELADA';
      default:
        return estado.toUpperCase();
    }
  }

  /**
   * Regresa al panel de administración
   */
  volver() {
    this.router.navigate(['/home-admin']);
  }

  // ===== FUNCIONES DE DEBUG TEMPORALES =====
  // Agregar estos botones temporalmente en el HTML para probar

  /**
   * Función de prueba para verificar el envío de emails
   */
  async testEmailSending() {
    console.log('🧪 Iniciando prueba de envío de email...');
    
    try {
      // Datos de prueba
      const testData = {
        email: 'sofia@ejemplo.com', // Cambiar por tu email
        nombres: 'Test',
        apellidos: 'Usuario',
        estado: 'confirmada',
        tipo: 'reserva',
        datosReserva: {
          fecha: '2025-10-30',
          hora: '20:00',
          cantidad_comensales: 2,
          nota: 'Reserva de prueba'
        }
      };
      
      console.log('📤 Enviando datos de prueba:', testData);
      
      // Llamar directamente a la función
      const { data, error } = await this.supa.client.functions.invoke('notificar-cliente', {
        body: testData
      });
      
      console.log('📥 Respuesta de la función:', { data, error });
      
      if (error) {
        console.error('❌ Error en la función:', error);
        this.toast.error(`Error: ${error.message}`);
      } else if (data && data.ok === false) {
        console.error('❌ Error en el envío:', data);
        this.toast.error(`Error en envío: ${data.detail || data.error}`);
      } else {
        console.log('✅ Email enviado exitosamente');
        this.toast.success('Email de prueba enviado exitosamente');
      }
      
    } catch (e: any) {
      console.error('❌ Error general:', e);
      this.toast.error(`Error general: ${e.message}`);
    }
  }

  /**
   * Función para verificar configuración de SendGrid
   */
  async checkSendGridConfig() {
    console.log('🔍 Verificando configuración de SendGrid...');
    
    try {
      // Intentar enviar un email simple
      const { data, error } = await this.supa.client.functions.invoke('notificar-cliente', {
        body: {
          email: 'test@ejemplo.com',
          nombres: 'Test',
          apellidos: 'Config',
          estado: 'pendiente'
        }
      });
      
      console.log('📥 Respuesta de configuración:', { data, error });
      
      if (error) {
        console.error('❌ Error de configuración:', error);
        if (error.message.includes('SENDGRID_API_KEY')) {
          this.toast.error('SENDGRID_API_KEY no está configurado');
        } else if (error.message.includes('SENDGRID_FROM')) {
          this.toast.error('SENDGRID_FROM no está configurado');
        } else {
          this.toast.error(`Error de configuración: ${error.message}`);
        }
      } else {
        console.log('✅ Configuración parece correcta');
        this.toast.success('Configuración de SendGrid parece correcta');
      }
      
    } catch (e: any) {
      console.error('❌ Error al verificar configuración:', e);
      this.toast.error(`Error: ${e.message}`);
    }
  }
}
