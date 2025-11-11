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
  AlertController,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, peopleOutline, closeCircleOutline, documentTextOutline, closeOutline } from 'ionicons/icons';
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
    IonBadge,
    IonModal
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
  
  // Horas disponibles para reservas (11:00 - 22:00, solo horas enteras)
  horasDisponibles: { value: string; label: string }[] = [];
  
  // Control del modal de fecha
  fechaSeleccionadaTexto: string = '';

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
      documentTextOutline,
      closeOutline
    });
  }

  async ngOnInit() {
    // Verificar que sea cliente registrado
    const esRegistrado = await this.reservasService.esClienteRegistrado();
    if (!esRegistrado) {
      this.toast.error('SOLO LOS CLIENTES REGISTRADOS PUEDEN HACER RESERVAS', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
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
   * Inicializa las horas disponibles para reservas (horas enteras desde 11:00 hasta 22:00)
   * Formato de 12 horas con AM/PM para mostrar al usuario
   */
  inicializarHorasDisponibles() {
    this.horasDisponibles = [];
    
    // Horarios de 11:00 a 22:00 (solo horas enteras)
    const horasInicio = 11;
    const horasFin = 22;
    
    for (let hora = horasInicio; hora <= horasFin; hora++) {
      const horaStr = hora.toString().padStart(2, '0');
      const valor = `${horaStr}:00`; // Valor en formato 24 horas para la BD
      
      // Convertir a formato 12 horas con AM/PM para mostrar
      let hora12 = hora;
      let periodo = 'am';
      
      if (hora === 12) {
        hora12 = 12;
        periodo = 'pm';
      } else if (hora > 12) {
        hora12 = hora - 12;
        periodo = 'pm';
      }
      
      const label = `${hora12}:00${periodo}`;
      
      this.horasDisponibles.push({ value: valor, label: label });
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
      this.toast.error('ERROR AL CARGAR TUS RESERVAS ACTUALES', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.cargandoReservas = false;
    }
  }

  /**
   * Valida el formulario
   */
  validarFormulario(): { valido: boolean; mensaje: string } {
    if (!this.fecha) {
      return { valido: false, mensaje: 'DEBÉS SELECCIONAR UNA FECHA' };
    }

    if (!this.hora) {
      return { valido: false, mensaje: 'DEBÉS SELECCIONAR UNA HORA' };
    }

    if (!this.cantidadComensales || this.cantidadComensales < 1) {
      return { valido: false, mensaje: 'DEBÉS INDICAR LA CANTIDAD DE COMENSALES (MÍNIMO 1)' };
    }

    if (this.cantidadComensales > 20) {
      return { valido: false, mensaje: 'PARA RESERVAS DE MÁS DE 20 PERSONAS, CONTACTÁ AL RESTAURANTE DIRECTAMENTE' };
    }

    return { valido: true, mensaje: '' };
  }

  /**
   * Convierte la fecha del ion-datetime al formato correcto
   * Evita problemas de zona horaria trabajando siempre con la fecha local
   */
  formatearFechaParaValidacion(fecha: string): string {
    if (!fecha) return '';
    
    // Si ya está en formato YYYY-MM-DD, devolverlo tal como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    
    // Si es un ISO string o Date, extraer la fecha usando la zona horaria local
    const fechaObj = new Date(fecha);
    // Usar métodos locales para evitar cambios de zona horaria
    const año = fechaObj.getFullYear();
    const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
    const dia = fechaObj.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  /**
   * Crea una nueva reserva
   */
  async crearReserva() {
    // Validar formulario
    const validacion = this.validarFormulario();
    if (!validacion.valido) {
      this.toast.warning(validacion.mensaje, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      return;
    }

    // Usar el auth_id para la reserva (más consistente con el resto de la app)
    const userId = this.sesion.usuarioBD?.auth_id;
    console.log('🔍 Debug - Auth ID obtenido:', userId);
    console.log('🔍 Debug - Tipo de Auth ID:', typeof userId);
    console.log('🔍 Debug - Usuario BD completo:', this.sesion.usuarioBD);
    
    if (!userId) {
      this.toast.error('NO SE PUDO IDENTIFICAR TU USUARIO. POR FAVOR, INICIÁ SESIÓN NUEVAMENTE', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
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
        this.toast.warning(disponibilidad.mensaje.toUpperCase(), '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
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

      this.toast.success('¡RESERVA CREADA EXITOSAMENTE! ESTÁ PENDIENTE DE CONFIRMACIÓN', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });

      // Limpiar formulario
      this.limpiarFormulario();

      // Recargar reservas
      await this.cargarReservasActivas();

    } catch (error: any) {
      console.error('Error al crear reserva:', error);
      this.toast.error((error?.message || 'ERROR AL CREAR LA RESERVA. INTENTÁ NUEVAMENTE').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
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
      header: 'CANCELAR RESERVA',
      message: `¿ESTÁS SEGURO DE QUE DESEÁS CANCELAR LA RESERVA DEL ${this.formatearFecha(reserva.fecha).toUpperCase()} A LAS ${reserva.hora}?`,
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'SÍ, CANCELAR',
          handler: async () => {
            try {
              this.cargando = true;
              this.spinner.show({ immediate: true });
              await this.reservasService.cancelarReserva(reserva.id!);
              this.toast.success('RESERVA CANCELADA EXITOSAMENTE', '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
              await this.cargarReservasActivas();
            } catch (error) {
              console.error('Error al cancelar reserva:', error);
              this.toast.error('ERROR AL CANCELAR LA RESERVA. INTENTÁ NUEVAMENTE', '', {
                positionClass: 'toast-center',
                timeOut: 4000
              });
            } finally {
              this.cargando = false;
              this.spinner.hide();
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
        return 'PENDIENTE';
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
   * Vuelve al home del cliente
   */
  volver() {
    this.router.navigate(['/home-cliente']);
  }

  /**
   * Abre el modal de selección de fecha
   */
  async abrirModalFecha(modal: IonModal) {
    await modal.present();
  }

  /**
   * Cierra el modal y actualiza el texto de la fecha seleccionada
   */
  async cerrarModalFecha(modal: IonModal) {
    this.actualizarTextoFecha();
    await modal.dismiss();
  }

  /**
   * Confirma la selección de fecha
   */
  async confirmarFecha(modal: IonModal) {
    this.actualizarTextoFecha();
    await modal.dismiss();
  }

  /**
   * Actualiza el texto mostrado de la fecha seleccionada
   * Usa la zona horaria local para evitar cambios de día
   */
  actualizarTextoFecha() {
    if (this.fecha) {
      // Extraer la fecha usando métodos locales para evitar problemas de zona horaria
      const fechaObj = new Date(this.fecha);
      const año = fechaObj.getFullYear();
      const mes = fechaObj.getMonth();
      const dia = fechaObj.getDate();
      
      // Crear una nueva fecha en la zona horaria local
      const date = new Date(año, mes, dia);
      
      this.fechaSeleccionadaTexto = date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      this.fechaSeleccionadaTexto = '';
    }
  }

  /**
   * Maneja el cambio de fecha del datetime
   */
  onFechaCambio(event: any) {
    // El evento puede venir con diferentes formatos
    const fechaValue = event.detail?.value || event.target?.value || this.fecha;
    if (fechaValue) {
      this.fecha = fechaValue;
      this.actualizarTextoFecha();
    }
  }
}

