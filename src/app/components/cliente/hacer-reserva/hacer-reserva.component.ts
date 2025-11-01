import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonButtons,
  IonSpinner,
  IonDatetime,
  IonSelect,
  IonSelectOption,
  IonBadge,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, peopleOutline, closeCircleOutline, documentTextOutline } from 'ionicons/icons';
import { ReservasService, Reserva } from '../../../services/reservas.service';
import { SupabaseService } from '../../../services/supabase.service';
import { SesionService } from '../../../services/sesion.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from '../../../services/spinner.service';

@Component({
  selector: 'app-hacer-reserva',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonButtons,
    IonSpinner,
    IonDatetime,
    IonSelect,
    IonSelectOption,
    IonBadge
  ],
  templateUrl: './hacer-reserva.component.html',
  styleUrls: ['./hacer-reserva.component.scss']
})
export class HacerReservaComponent implements OnInit {
  // Formulario de nueva reserva
  fecha: string = '';
  hora: string = '';
  cantidadComensales: number = 2;
  nota: string = '';

  // Estado
  cargando = false;
  cargandoReservas = false;
  reservasActivas: Reserva[] = [];

  // Fechas mínimas y máximas para validación
  fechaMinima: string = '';
  fechaMaxima: string = '';
  horaMinima: string = '';
  
  // Horas disponibles para reservas (11:30 - 23:00)
  horasDisponibles: { value: string; label: string }[] = [];

  constructor(
    private reservasService: ReservasService,
    private supa: SupabaseService,
    private sesion: SesionService,
    private router: Router,
    private toast: ToastrService,
    private alertController: AlertController,
    private spinner: SpinnerService
  ) {
    addIcons({ 
      calendarOutline, 
      timeOutline, 
      peopleOutline,
      closeCircleOutline,
      documentTextOutline
    });
  }

  async ngOnInit() {
    // Verificar que sea cliente registrado
    const esRegistrado = await this.reservasService.esClienteRegistrado();
    if (!esRegistrado) {
      this.toast.error('Solo los clientes registrados pueden hacer reservas');
      this.router.navigate(['/home-cliente']);
      return;
    }

    // Establecer fecha y hora mínimas
    this.establecerFechaHoraMinima();

    // Cargar reservas activas
    await this.cargarReservasActivas();
  }

  /**
   * Establece la fecha y hora mínimas (ahora)
   */
  establecerFechaHoraMinima() {
    const ahora = new Date();
    
    // Fecha mínima: hoy
    this.fechaMinima = ahora.toISOString().split('T')[0];
    
    // Fecha máxima: 3 meses en el futuro
    const fechaMax = new Date();
    fechaMax.setMonth(fechaMax.getMonth() + 3);
    this.fechaMaxima = fechaMax.toISOString().split('T')[0];
    
    // Hora mínima: hora actual
    const horas = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    this.horaMinima = `${horas}:${minutos}`;
    
    // Inicializar horas disponibles
    this.inicializarHorasDisponibles();
  }

  /**
   * Inicializa las horas disponibles para reservas (11:30 - 23:00)
   */
  inicializarHorasDisponibles() {
    this.horasDisponibles = [];
    
    // Horarios de 11:30 a 23:00 (intervalos de 30 minutos)
    const horasInicio = 11;
    const minutosInicio = 30;
    const horasFin = 23;
    const minutosFin = 0;
    
    for (let hora = horasInicio; hora <= horasFin; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        // Saltar si es la primera iteración y no es 11:30
        if (hora === horasInicio && minuto < minutosInicio) {
          continue;
        }
        
        // Parar si llegamos a 23:00
        if (hora === horasFin && minuto > minutosFin) {
          break;
        }
        
        const horaStr = hora.toString().padStart(2, '0');
        const minutoStr = minuto.toString().padStart(2, '0');
        const valor = `${horaStr}:${minutoStr}`;
        
        // Formatear para mostrar (formato 24 horas)
        const label = `${horaStr}:${minutoStr}`;
        
        this.horasDisponibles.push({ value: valor, label: label });
      }
    }
  }

  /**
   * Carga las reservas activas del usuario
   */
  async cargarReservasActivas() {
    try {
      this.cargandoReservas = true;
      const userId = this.supa.idUsuario;
      if (userId) {
        this.reservasActivas = await this.reservasService.obtenerReservasUsuario(userId);
      }
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      this.toast.error('Error al cargar tus reservas actuales');
    } finally {
      this.cargandoReservas = false;
    }
  }

  /**
   * Valida el formulario
   */
  validarFormulario(): { valido: boolean; mensaje: string } {
    if (!this.fecha) {
      return { valido: false, mensaje: 'Debes seleccionar una fecha' };
    }

    if (!this.hora) {
      return { valido: false, mensaje: 'Debes seleccionar una hora' };
    }

    if (!this.cantidadComensales || this.cantidadComensales < 1) {
      return { valido: false, mensaje: 'Debes indicar la cantidad de comensales (mínimo 1)' };
    }

    if (this.cantidadComensales > 20) {
      return { valido: false, mensaje: 'Para reservas de más de 20 personas, contacta al restaurante directamente' };
    }

    return { valido: true, mensaje: '' };
  }

  /**
   * Convierte la fecha del ion-datetime al formato correcto
   */
  formatearFechaParaValidacion(fecha: string): string {
    if (!fecha) return '';
    
    // Si ya está en formato YYYY-MM-DD, devolverlo tal como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    
    // Si es un ISO string, extraer solo la fecha
    const fechaObj = new Date(fecha);
    return fechaObj.toISOString().split('T')[0];
  }

  /**
   * Crea una nueva reserva
   */
  async crearReserva() {
    // Validar formulario
    const validacion = this.validarFormulario();
    if (!validacion.valido) {
      this.toast.warning(validacion.mensaje);
      return;
    }

    // Usar el auth_id para la reserva (más consistente con el resto de la app)
    const userId = this.sesion.usuarioBD?.auth_id;
    console.log('🔍 Debug - Auth ID obtenido:', userId);
    console.log('🔍 Debug - Tipo de Auth ID:', typeof userId);
    console.log('🔍 Debug - Usuario BD completo:', this.sesion.usuarioBD);
    
    if (!userId) {
      this.toast.error('No se pudo identificar tu usuario. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      this.spinner.show({ immediate: true, minMs: 1000 });

      // Formatear la fecha para la validación
      const fechaFormateada = this.formatearFechaParaValidacion(this.fecha);
      
      console.log('🔍 Debug - Fecha original:', this.fecha);
      console.log('🔍 Debug - Fecha formateada:', fechaFormateada);
      console.log('🔍 Debug - Hora:', this.hora);

      // Validar disponibilidad
      const disponibilidad = await this.reservasService.validarDisponibilidad(
        userId,
        fechaFormateada,
        this.hora
      );

      if (!disponibilidad.valida) {
        this.toast.warning(disponibilidad.mensaje);
        return;
      }

      // Crear la reserva
      const nuevaReserva: Omit<Reserva, 'id' | 'created_at' | 'updated_at'> = {
        usuario_id: userId,
        fecha: fechaFormateada,
        hora: this.hora,
        cantidad_comensales: this.cantidadComensales,
        nota: this.nota || null,
        estado: 'pendiente confirmacion'
      };

      await this.reservasService.crearReserva(nuevaReserva);

      this.toast.success('¡Reserva creada exitosamente! Está pendiente de confirmación.');

      // Limpiar formulario
      this.limpiarFormulario();

      // Recargar reservas
      await this.cargarReservasActivas();

    } catch (error: any) {
      console.error('Error al crear reserva:', error);
      this.toast.error(error?.message || 'Error al crear la reserva. Intenta nuevamente.');
    } finally {
      this.spinner.hide();
    }
  }

  /**
   * Cancela una reserva existente
   */
  async cancelarReserva(reserva: Reserva) {
    if (!reserva.id) return;

    const alert = await this.alertController.create({
      header: 'Cancelar Reserva',
      message: `¿Estás seguro de que deseas cancelar la reserva del ${this.formatearFecha(reserva.fecha)} a las ${reserva.hora}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí, Cancelar',
          handler: async () => {
            try {
              this.cargando = true;
              await this.reservasService.cancelarReserva(reserva.id!);
              this.toast.success('Reserva cancelada exitosamente');
              await this.cargarReservasActivas();
            } catch (error) {
              console.error('Error al cancelar reserva:', error);
              this.toast.error('Error al cancelar la reserva. Intenta nuevamente.');
            } finally {
              this.cargando = false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Limpia el formulario
   */
  limpiarFormulario() {
    this.fecha = '';
    this.hora = '';
    this.cantidadComensales = 2;
    this.nota = '';
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatearFecha(fecha: string): string {
    const date = new Date(fecha + 'T00:00:00'); // Forzar zona horaria local
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
   * Formatea el estado para mostrar al cliente
   */
  formatearEstado(estado: string): string {
    switch (estado) {
      case 'pendiente confirmacion':
        return 'Pendiente';
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
   * Vuelve al home del cliente
   */
  volver() {
    this.router.navigate(['/home-cliente']);
  }
}

