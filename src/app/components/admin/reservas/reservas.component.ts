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
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  calendarOutline, 
  timeOutline, 
  peopleOutline, 
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  personOutline
} from 'ionicons/icons';
import { ReservasService, Reserva } from '../../../services/reservas.service';
import { SupabaseService } from '../../../services/supabase.service';
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
    private alertController: AlertController
  ) {
    addIcons({ 
      calendarOutline, 
      timeOutline, 
      peopleOutline, 
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline,
      personOutline
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
      this.reservas = await this.reservasService.obtenerReservasPendientes();
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      this.toast.error('Error al cargar las reservas');
    } finally {
      this.cargando = false;
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
   * Confirma una reserva
   */
  async confirmarReserva(reserva: Reserva) {
    if (!reserva.id) return;

    const alert = await this.alertController.create({
      header: 'Confirmar Reserva',
      message: `¿Confirmar la reserva de ${this.obtenerNombreCliente(reserva)} (${this.obtenerEmailCliente(reserva)}) para el ${this.formatearFecha(reserva.fecha)} a las ${reserva.hora}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            await this.confirmarReservaCompleta(reserva.id!.toString());
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
      header: 'Rechazar Reserva',
      message: `¿Rechazar la reserva de ${this.obtenerNombreCliente(reserva)} (${this.obtenerEmailCliente(reserva)}) para el ${this.formatearFecha(reserva.fecha)} a las ${reserva.hora}?`,
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: 'Motivo del rechazo (obligatorio)',
          attributes: {
            maxlength: 500,
            rows: 3
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Rechazar',
          cssClass: 'danger',
          handler: async (data) => {
            if (!data.motivo || data.motivo.trim().length === 0) {
              this.toast.error('Debe indicar el motivo del rechazo');
              return false;
            }
            await this.rechazarReservaCompleta(reserva.id!.toString(), data.motivo.trim());
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Confirma una reserva completa (estado + email)
   */
  private async confirmarReservaCompleta(reservaId: string) {
    try {
      this.cargandoConfirmar = true;
      const res = await this.reservasService.confirmarReserva(reservaId);
      
      this.toast.success('Reserva confirmada exitosamente');
      
      if (!res.ok) {
        this.toast.warning(`Reserva confirmada, pero el email no se envió${res.detail ? `: ${res.detail}` : ''}`, 'Aviso', { timeOut: 6000 });
        console.warn('notificar-cliente (confirmada) falló:', res);
      }
      
      await this.cargarReservas();
    } catch (error) {
      console.error('Error al confirmar reserva:', error);
      this.toast.error('Error al confirmar la reserva');
    } finally {
      this.cargandoConfirmar = false;
    }
  }

  /**
   * Rechaza una reserva completa (estado + motivo + email)
   */
  private async rechazarReservaCompleta(reservaId: string, motivoRechazo: string) {
    try {
      this.cargandoRechazar = true;
      const res = await this.reservasService.rechazarReserva(reservaId, motivoRechazo);
      
      this.toast.success('Reserva rechazada exitosamente');
      
      if (!res.ok) {
        this.toast.warning(`Reserva rechazada, pero el email no se envió${res.detail ? `: ${res.detail}` : ''}`, 'Aviso', { timeOut: 6000 });
        console.warn('notificar-cliente (rechazada) falló:', res);
      }
      
      await this.cargarReservas();
    } catch (error) {
      console.error('Error al rechazar reserva:', error);
      this.toast.error('Error al rechazar la reserva');
    } finally {
      this.cargandoRechazar = false;
    }
  }

  /**
   * Obtiene el nombre del cliente de la reserva
   */
  obtenerNombreCliente(reserva: any): string {
    return reserva.nombre_cliente || 'Cliente';
  }

  /**
   * Obtiene el email del cliente de la reserva
   */
  obtenerEmailCliente(reserva: any): string {
    return reserva.email_cliente || 'Sin email';
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
        return 'Pendiente Confirmación';
      case 'confirmada':
        return 'Confirmada';
      case 'rechazada':
        return 'Rechazada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return estado;
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
