import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar, IonTitle, IonCard } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, personAdd, restaurant, create , statsChart, addCircleOutline} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ActionSheetController } from '@ionic/angular';

@Component({
  selector: 'app-nueva-bebida',
  standalone: true,
  imports: [IonCard, IonHeader, CommonModule, FormsModule, IonContent, IonGrid, IonRow, IonCol, IonButton, 
    IonToolbar, IonTitle],
  providers: [ActionSheetController],
  templateUrl: './nueva-bebida.component.html',
  styleUrls: ['./nueva-bebida.component.scss'],
})
export class NuevaBebidaComponent  implements OnInit {

  constructor(private router: Router, private actionSheetCtrl: ActionSheetController) {}

  async ngOnInit() {
    await Camera.requestPermissions({
      permissions: ['camera', 'photos']
    });
  }

  nombre = '';
  descripcion = '';
  tiempoElaboracion = '';
  precio = '';

  fotos: string[] = [];

  loading = false;
  errorMsg = '';
  passwordsMismatch = false;

  async seleccionarFoto() {
    if (this.fotos.length >= 3) {
      alert('Se debe subir exactamente 3 fotos.');
      return;
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Seleccionar foto',
      buttons: [
        {
          text: 'Tomar foto',
          handler: () => this.tomarFoto(CameraSource.Camera),
        },
        {
          text: 'Elegir de la galería',
          handler: () => this.tomarFoto(CameraSource.Photos),
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  private async tomarFoto(source: CameraSource) {
    const image = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    this.fotos.push(image.dataUrl!);

    if (this.fotos.length === 3) {
      alert('Ya cargaste las 3 fotos requeridas.');
    }
  }

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

  finalizarCargaBebida() {
    this.verificarExistenciaEnMenu(this.nombre);

    // Verificar existencia en menu y avisar si esta disponible la bebida o no

    this.irAHomeBartenderCocinero();
  }

  verificarExistenciaEnMenu(nombre: string) {
    alert(`Verificando la existencia en el menú de ${nombre}`);
  } 

  irAHomeBartenderCocinero() { this.router.navigate(['/home-bartender-cocinero']); }
}
