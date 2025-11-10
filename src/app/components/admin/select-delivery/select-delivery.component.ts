import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonList, IonItem, IonLabel, IonIcon, IonButtons, ModalController,
  IonSpinner
} from '@ionic/angular/standalone';
import { closeOutline, checkmarkOutline, bicycleOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { DeliveryUsuariosService, DeliveryUsuario } from 'src/app/services/delivery-usuarios.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';

@Component({
  selector: 'app-select-delivery',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonList, IonItem, IonLabel, IonIcon, IonButtons, IonSpinner
  ],
  templateUrl: './select-delivery.component.html',
  styleUrls: ['./select-delivery.component.scss']
})
export class SelectDeliveryComponent implements OnInit {
  deliveryUsuarios: DeliveryUsuario[] = [];
  cargando = true;
  seleccionadoId: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private deliveryUsuariosSvc: DeliveryUsuariosService,
    private toast: ToastrService,
    private spinner: SpinnerService
  ) {
    addIcons({ closeOutline, checkmarkOutline, bicycleOutline });
  }

  async ngOnInit() {
    await this.cargarDeliveryUsuarios();
  }

  async cargarDeliveryUsuarios() {
    try {
      this.cargando = true;
      this.spinner.show({ immediate: true });
      this.deliveryUsuarios = await this.deliveryUsuariosSvc.getDeliveryUsuariosDisponibles();
      
      if (this.deliveryUsuarios.length === 0) {
        this.toast.warning('NO HAY USUARIOS REPARTIDOR DISPONIBLES', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
      }
    } catch (error: any) {
      console.error('[SelectDeliveryComponent] Error al cargar usuarios delivery:', error);
      this.toast.error(('ERROR AL CARGAR USUARIOS REPARTIDOR: ' + (error?.message || 'ERROR INESPERADO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.cargando = false;
      this.spinner.hide();
    }
  }

  seleccionarDelivery(usuario: DeliveryUsuario) {
    this.seleccionadoId = usuario.auth_id;
  }

  async confirmar() {
    if (!this.seleccionadoId) {
      this.toast.warning('SELECCIONÁ UN USUARIO REPARTIDOR', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      return;
    }

    const usuarioSeleccionado = this.deliveryUsuarios.find(u => u.auth_id === this.seleccionadoId);
    
    await this.modalCtrl.dismiss({
      idDelivery: this.seleccionadoId,
      usuario: usuarioSeleccionado
    }, 'confirm');
  }

  cancelar() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  getNombreCompleto(usuario: DeliveryUsuario): string {
    const nombre = usuario.nombres || '';
    const apellido = usuario.apellidos || '';
    return `${nombre} ${apellido}`.trim() || usuario.email;
  }
}

