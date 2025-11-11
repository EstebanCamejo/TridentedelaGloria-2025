import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar, IonTitle, IonCard } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { MenuService, PlatoTipo } from 'src/app/services/menu.service';
import { addIcons } from 'ionicons';           // 👈 IMPORTA ESTO
import { trashOutline } from 'ionicons/icons'; // 👈 Y ESTO
@Component({
  selector: 'app-nuevo-plato',
  standalone: true,
  imports: [IonCard, IonHeader, CommonModule, FormsModule, IonGrid, IonRow, IonCol, IonButton, 
    IonToolbar, IonTitle ,IonIcon, IonContent],
  //providers: [ActionSheetController],
  templateUrl: './nuevo-plato.component.html',
  styleUrls: ['./nuevo-plato.component.scss'],
})
export class NuevoPlatoComponent {
  nombre = '';
  descripcion = '';
  tiempoElaboracion = '';
  precio = '';

  _fotos: string[] = [];

  loading = false;
  errorMsg = '';
  passwordsMismatch = false;

  guardando = false;

  constructor(
    private router: Router, 
    private toastr: ToastrService,
    private platos: MenuService,
  ) {addIcons({ trashOutline });}

  ionViewDidEnter() {
    console.log('[ionViewDidEnter] Vista de nuevo plato activa');
    //this.revalidarSesion();
  }

  /*
  private async revalidarSesion() {
    console.log('[revalidarSesion] Intentando obtener sesión...');
    const session = await this.platos['supabase'].waitForSession(3000);
    console.log('[revalidarSesion] Resultado de sesión:', session);
    if (!session?.user?.id) {
      this.toastr.error('Sesión expirada o bloqueada. Reiniciá la app o volvé a iniciar sesión.');
      this.router.navigate(['/login']);
    }
  }
    */

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

  eliminarFoto(i: number) {
    this.fotos.splice(i, 1);
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;

    if (!files || files.length === 0) return;

    const cantidadPermitida = 3 - this.fotos.length;

    Array.from(files)
      .slice(0, cantidadPermitida)
      .forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.fotos.push(e.target.result as string);
        };
        reader.readAsDataURL(file);
      });

    event.target.value = '';
  }

  showError(ctrl: any, form: NgForm): boolean {
    return !!ctrl?.invalid && (ctrl?.touched || form?.submitted);
  }
  onSubmit(registerForm: NgForm) {
    console.log('[onSubmit] Formulario enviado');
    this.errorMsg = '';
    if (this.loading) return;
        Object.values(registerForm.controls).forEach((c: any) => c.control?.markAsTouched?.());
    
    if (registerForm.invalid) {
      this.toastError('Por favor, completá todos los campos correctamente.');
      return;
    }

    if (this.fotos.length !== 3) {
      this.toastError('Por favor, ingresar exactamente tres fotos para terminar.');
      return;
    }

    this.finalizarCargaPlato();
  }

  private toastOk(msg: string) {
    this.toastr.success(msg, '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
  }
  private toastError(msg: string) {
    this.toastr.error(msg, 'Error', { positionClass: 'toast-center', closeButton: true, progressBar: true, timeOut: 4500 });
  }
  private markAllAsTouched(form: NgForm) {
    Object.values(form.controls).forEach(c => c.markAsTouched());
  }

  async finalizarCargaPlato() {
    console.log('[finalizarCargaPlato] Verificando existencia...');

    try {
      const existe = await this.platos.existePlato(this.nombre);

      if (existe) {
        this.toastError(`El nombre "${this.nombre}" ya existe en el menú. Por favor, elegí otro.`);
        return;
      }

      console.log('[guardarEnBaseDeDatos] Iniciando guardado...');
      await this.guardarEnBaseDeDatos();
      this.irAHomeBartenderCocinero();

    } catch (e: any) {
      this.toastr.error(e?.message || 'Error verificando el menú.');
    }
  }

  async guardarEnBaseDeDatos() {

    /*
    const session = await this.platos['supabase'].waitForSession(3000);
    if (!session?.user?.id) {
      this.toastError('Sesión expirada. Por favor, reiniciá sesión.');
      return;
    }
      */

    try {
      this.guardando = true;

      const payload = {
        nombre: this.nombre,
        descripcion: this.descripcion,
        tiempoElaboracion: Number(this.tiempoElaboracion),
        precio: Number(this.precio),
        tipo: 'plato' as const,
        fotos: this._fotos,
      };

      const res = await this.platos.crearPlatoConFotos(payload);
      this.toastOk(`Plato creado: ${res.nombre}`);
    } catch (e: any) {
      this.toastr.error(e?.message || 'No se pudo crear el plato.');
    } finally {
      this.guardando = false;
    }
  }

  irAHomeBartenderCocinero() { this.router.navigate(['/home-bartender-cocinero']); }

  get fotos(): string[] {
  return this._fotos;
  }

  set fotos(value: string[]) {
    this._fotos = value;
  }
}

// Osobuco de ternera al vino tinto
// Osobuco de ternera cocido en vino Malbec con cebolla, zanahoria y perejil acompañado con papas