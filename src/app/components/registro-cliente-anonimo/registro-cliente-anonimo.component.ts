import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SpinnerService } from 'src/app/services/spinner.service';

// 👇 para cámara
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Ionic standalone usados en el template (botón e ícono)
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-registro-cliente-anonimo',
  standalone: true,
  templateUrl: './registro-cliente-anonimo.component.html',
  styleUrls: ['./registro-cliente-anonimo.component.scss'],
  imports: [CommonModule, FormsModule, IonButton, IonIcon],
})
export class RegistroClienteAnonimoComponent {
  // modelos template-driven
  nombre = '';
  email  = '';
  password = '';
  confirm  = '';

  loading = false;
  errorMsg = '';
  passwordsMismatch = false;
 cargando: boolean = false;

  // 📸 foto
  photoPreview: string | null = null;    // para mostrar en <img>
  photoFile: File | null = null;         // para subir (Storage/backend)
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  requirePhoto = false; // ponelo true si querés exigir foto

  constructor(
    private auth: SupabaseService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: SpinnerService
  ) {}

  // ==== FOTO ====
  private async uriToFile(uri: string, fileName: string): Promise<File> {
    const res = await fetch(uri);
    const blob = await res.blob();
    const ext = (blob.type?.split('/')?.[1]) || 'jpg';
    return new File([blob], `${fileName}.${ext}`, { type: blob.type || 'image/jpeg' });
  }

  async subirFotoClick() {
    try {
      if (Capacitor.isNativePlatform()) {
        const img = await Camera.getPhoto({
          quality: 75,
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt,  // cámara o galería
          allowEditing: false,
          saveToGallery: false,

        promptLabelHeader: 'Foto',
        promptLabelPhoto: 'Elegir de la galería',
        promptLabelPicture: 'Tomar foto',
        promptLabelCancel: 'Cancelar',
        });

        if (img?.webPath) {
          this.photoPreview = img.webPath;
          this.photoFile = await this.uriToFile(img.webPath, `perfil-${Date.now()}`);
        }
      } else {
        // Web/desktop
        this.fileInput?.nativeElement.click();
      }
    } catch (e) {
      console.warn('Cámara cancelada o error:', e);
    }
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    this.photoFile = f;
    this.photoPreview = URL.createObjectURL(f);
  }

  // ==== UI helpers / validaciones que ya tenías ====
  private toastOk(msg: string) {
    this.toastr.success(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
  }
  private toastError(msg: string) {
    this.toastr.error(msg.toUpperCase(), '', { positionClass: 'toast-center', closeButton: true, progressBar: true, timeOut: 4500 });
  }
  private markAllAsTouched(form: NgForm) {
    Object.values(form.controls).forEach((c: any) => c.control?.markAsTouched?.());
  }
  showError(ctrl: any, form: NgForm): boolean {
    return !!ctrl?.invalid && (ctrl?.touched || form?.submitted);
  }
  private mapRegisterError(error: any): string {
    const msg = (error?.message || '').toLowerCase(); const status = error?.status;
    if (msg.includes('already registered') || msg.includes('exists')) return 'YA EXISTE UNA CUENTA CON ESTE CORREO';
    if (msg.includes('invalid email')) return 'EL CORREO INGRESADO NO ES VÁLIDO';
    if (msg.includes('password') && (msg.includes('short') || msg.includes('length') || msg.includes('weak'))) return 'LA CONTRASEÑA NO CUMPLE LOS REQUISITOS MÍNIMOS';
    if (status === 429 || msg.includes('rate limit')) return 'DEMASIADOS INTENTOS. PROBÁ NUEVAMENTE EN UNOS MINUTOS';
    if (status === 0 || msg.includes('network') || msg.includes('fetch')) return 'PROBLEMA DE CONEXIÓN. VERIFICÁ TU INTERNET E INTENTÁ OTRA VEZ';
    return 'NO PUDIMOS COMPLETAR EL REGISTRO. INTENTÁ DE NUEVO';
  }

async onSubmit(form: NgForm) {
  this.errorMsg = '';
  this.passwordsMismatch = false;

  this.markAllAsTouched(form);
  if (form.invalid) {
    this.toastError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS CORRECTAMENTE');
    return;
  }
  if (this.password !== this.confirm) {
    this.passwordsMismatch = true;
    this.toastError('LAS CONTRASEÑAS NO COINCIDEN');
    return;
  }
  if (this.requirePhoto && !this.photoFile) {
    this.toastError('SUBÍ UNA FOTO DE PERFIL PARA CONTINUAR');
    return;
  }
  if (this.loading) return;

  this.loading = true;
  this.spinner.show({ immediate: true });
  (document.activeElement as HTMLElement | null)?.blur?.(); // opcional, evita glitches con teclado en mobile

  try {
    // 1) Alta + (foto) + inserción
    await this.auth.registrarAnonimoFlow(
      { nombre: this.nombre || 'Anónimo', email: this.email, password: this.password },
      this.photoFile
    );

    // 2) Iniciar sesión automáticamente
    await this.auth.login(this.email, this.password);

    this.toastOk('BIENVENIDO. REGISTRO ANÓNIMO COMPLETADO');

    // 3) limpiar UI
    this.nombre = this.email = this.password = this.confirm = '';
    this.photoFile = null;
    this.photoPreview = null;
    form.resetForm();

    // 4) ir directo al home del cliente
    await this.router.navigate(['/home-cliente']);
  } catch (error: any) {
    const msg = this.mapRegisterError(error);
    this.errorMsg = msg;
    this.toastError(msg);
    console.error('Registrar anónimo error:', error);
  } finally {
    this.cargando = false;
    this.loading = false;
    this.spinner.hide();
  }
}


}
