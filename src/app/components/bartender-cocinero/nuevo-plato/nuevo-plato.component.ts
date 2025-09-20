import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar, IonTitle, IonCard } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, personAdd, restaurant, create , statsChart, addCircleOutline} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
//import { ActionSheetController } from '@ionic/angular';

@Component({
  selector: 'app-nuevo-plato',
  standalone: true,
  imports: [IonCard, IonHeader, CommonModule, FormsModule, IonContent, IonGrid, IonRow, IonCol, IonButton, 
    IonToolbar, IonTitle],
  //providers: [ActionSheetController],
  templateUrl: './nuevo-plato.component.html',
  styleUrls: ['./nuevo-plato.component.scss'],
})
export class NuevoPlatoComponent {
  nombre = '';
  descripcion = '';
  tiempoElaboracion = '';
  precio = '';

  fotos: string[] = [];

  loading = false;
  errorMsg = '';
  passwordsMismatch = false;

  constructor(private router: Router, /*private actionSheetCtrl: ActionSheetController*/) {}

  async seleccionarFoto() {
    if (this.fotos.length >= 3) {
      alert('Se debe subir exactamente 3 fotos.');
      return;
    }

    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    this.fotos.push(image.dataUrl!);

    if (this.fotos.length === 3) {
      alert('Ya cargaste las 3 fotos requeridas.');
    }
  }

  /*
  private async tomarFoto(source: CameraSource) {

    const permResult = await Camera.requestPermissions();
    if (permResult.camera !== 'granted' && source === CameraSource.Camera) {
      alert('Por favor, dar permisos de cámara a la aplicación para poder tomar las fotos.');
      return;
    }

    const image = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source,
    });

    this.fotos.push(image.dataUrl!);

    if (this.fotos.length === 3) {
      alert('Ya cargaste las 3 fotos requeridas.');
    }
  }
  */

  eliminarFoto(i: number) {
    this.fotos.splice(i, 1);
  }

  showError(ctrl: any, form: NgForm): boolean {
    return !!ctrl?.invalid && (ctrl?.touched || form?.submitted);
  }
  onSubmit(registerForm: NgForm) {
    this.errorMsg = '';
    if (this.loading) return;
        Object.values(registerForm.controls).forEach((c: any) => c.control?.markAsTouched?.());
  
  }

  finalizarCargaPlato() {
    this.verificarExistenciaEnMenu(this.nombre);

    // Verificar existencia en menu y avisar si esta disponible el plato o no

    this.irAHomeBartenderCocinero();
  }

  verificarExistenciaEnMenu(nombre: string) {
    alert(`Verificando la existencia en el menú de ${nombre}`);
  } 

  irAHomeBartenderCocinero() { this.router.navigate(['/home-bartender-cocinero']); }

}
