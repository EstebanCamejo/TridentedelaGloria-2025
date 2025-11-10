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
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardContent,
  AlertController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, 
  timeOutline, 
  peopleOutline, 
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  personOutline,
  restaurantOutline
} from 'ionicons/icons';
import { ReservasService, Reserva } from '../../../services/reservas.service';
import { SupabaseService } from '../../../services/supabase.service';
import { SpinnerService } from '../../../services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import type { RefresherCustomEvent } from '@ionic/angular';

@Component({
  selector: 'app-reservas-admin',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonButtons,
    IonSpinner,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardContent
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

  constructor(
    private reservasService: ReservasService,
    private supa: SupabaseService,
    private router: Router,
    private toast: ToastrService,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private spinner: SpinnerService
  ) {
    addIcons({ 
      calendarOutline, 
      timeOutline, 
      peopleOutline, 
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline,
      personOutline,
      restaurantOutline
    });
  }

  async ngOnInit() {
    await this.cargarReservas();
  }

  ngOnDestroy() {
    // Cleanup si es necesario
  }

  /**
   * Carga todas las reservas pendientes
   */
  async cargarReservas() {
    try {
      this.cargando = true;
      this.spinner.show({ immediate: true });
      this.reservas = await this.reservasService.obtenerReservasPendientes();
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
   * Refresca la lista de reservas
   */
  async refrescar(event: RefresherCustomEvent) {
    await this.cargarReservas();
    event.target.complete();
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
      const buttons: any[] = mesasDisponibles.map(mesa => ({
        text: `Mesa ${mesa.numero} (Capacidad: ${mesa.capacidad})`,
        icon: 'restaurant-outline',
        handler: async () => {
          await this.confirmarReservaConMesa(reserva.id!.toString(), mesa.id);
        }
      }));

      buttons.push({
        text: 'Cancelar',
        role: 'cancel',
        icon: 'close-outline'
      });

      const actionSheet = await this.actionSheetController.create({
        header: 'Asignar Mesa',
        subHeader: `Selecciona una mesa para la reserva del ${this.formatearFecha(reserva.fecha)} a las ${reserva.hora}`,
        buttons: buttons
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
      header: 'Confirmar Reserva',
      message: `¿Confirmar la reserva y asignar la mesa seleccionada?`,
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'CONFIRMAR',
          handler: async () => {
            // Cerrar el alert primero
            await alert.dismiss();
            // Mostrar spinner inmediatamente
            this.spinner.show({ immediate: true, minMs: 1000 });
            // Ejecutar la confirmación
            await this.confirmarReservaCompleta(reservaId, mesaId);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Rechaza una reserva con motivo
   */
  async rechazarReserva(reserva: Reserva) {
    if (!reserva.id) return;

    const alert = await this.alertController.create({
      header: 'RECHAZAR RESERVA',
      message: `¿RECHAZAR LA RESERVA DE ${this.obtenerNombreCliente(reserva).toUpperCase()} (${this.obtenerEmailCliente(reserva)}) PARA EL ${this.formatearFecha(reserva.fecha).toUpperCase()} A LAS ${reserva.hora}?`,
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
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'RECHAZAR',
          cssClass: 'danger',
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
      ]
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
