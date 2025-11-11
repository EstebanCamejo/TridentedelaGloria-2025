import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar, IonCard } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { MenuService, PlatoTipo } from 'src/app/services/menu.service';

import { addIcons } from 'ionicons';           // 👈 IMPORTA ESTO
import { trashOutline } from 'ionicons/icons'; // 👈 Y ESTO
@Component({
  selector: 'app-nueva-bebida',
  standalone: true,
  imports: [IonCard, IonHeader, CommonModule, FormsModule, IonGrid, IonRow, IonCol, IonButton,
    IonToolbar, IonIcon, IonContent],
  //providers: [ActionSheetController],
  templateUrl: './nueva-bebida.component.html',
  styleUrls: ['./nueva-bebida.component.scss'],
})
export class NuevaBebidaComponent {

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
    private spinner: SpinnerService,
    private platos: MenuService,
    
  ) { addIcons({ trashOutline }); }

  ionViewDidEnter() {
    console.log('[ionViewDidEnter] Vista de nueva bebida activa');
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
      this.toastr.warning('SE DEBE SUBIR EXACTAMENTE 3 FOTOS', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
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
      this.toastr.info('YA CARGASTE LAS 3 FOTOS REQUERIDAS', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
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
      this.toastError('POR FAVOR, COMPLETÁ TODOS LOS CAMPOS CORRECTAMENTE');
      return;
    }

    if (this.fotos.length !== 3) {
      this.toastError('POR FAVOR, INGRESAR EXACTAMENTE TRES FOTOS PARA TERMINAR');
      return;
    }

    this.finalizarCargaPlato();
  }

  private toastOk(msg: string) {
    this.toastr.success(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
  }
  private toastError(msg: string) {
    this.toastr.error(msg.toUpperCase(), '', { positionClass: 'toast-center', closeButton: true, progressBar: true, timeOut: 4500 });
  }
  private markAllAsTouched(form: NgForm) {
    Object.values(form.controls).forEach(c => c.markAsTouched());
  }

  async finalizarCargaPlato() {
    console.log('[finalizarCargaPlato] Verificando existencia...');

    try {
      this.spinner.show({ immediate: true, minMs: 500 });
      const existe = await this.platos.existePlato(this.nombre);

      if (existe) {
        this.toastError(`EL NOMBRE "${this.nombre.toUpperCase()}" YA EXISTE EN EL MENÚ. POR FAVOR, ELEGÍ OTRO.`);
        this.spinner.hide();
        return;
      }

      console.log('[guardarEnBaseDeDatos] Iniciando guardado...');
      await this.guardarEnBaseDeDatos();
      this.irAHomeBartenderCocinero();

    } catch (e: any) {
      this.toastr.error((e?.message || 'ERROR VERIFICANDO EL MENÚ').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.spinner.hide();
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
      this.spinner.show({ immediate: true, minMs: 1000 });

      const payload = {
        nombre: this.nombre,
        descripcion: this.descripcion,
        tiempoElaboracion: Number(this.tiempoElaboracion),
        precio: Number(this.precio),
        tipo: 'bebida' as const,
        fotos: this._fotos,
      };

      const res = await this.platos.crearPlatoConFotos(payload);
      this.toastOk(`BEBIDA CREADA: ${res.nombre.toUpperCase()}`);
    } catch (e: any) {
      this.toastr.error((e?.message || 'NO SE PUDO CREAR LA BEBIDA').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.guardando = false;
      this.spinner.hide();
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
