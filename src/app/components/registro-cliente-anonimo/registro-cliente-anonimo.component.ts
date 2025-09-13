import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SupabaseService } from 'src/app/services/supabase.service';

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

  // 📸 foto
  photoPreview: string | null = null;    // para mostrar en <img>
  photoFile: File | null = null;         // para subir (Storage/backend)
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  requirePhoto = false; // ponelo true si querés exigir foto

  constructor(
    private auth: SupabaseService,
    private router: Router,
    private toastr: ToastrService
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
    this.toastr.success(msg, '', { positionClass: 'toast-center', timeOut: 3000, progressBar: true });
  }
  private toastError(msg: string) {
    this.toastr.error(msg, 'Error', { positionClass: 'toast-center', closeButton: true, progressBar: true, timeOut: 4500 });
  }
  private markAllAsTouched(form: NgForm) {
    Object.values(form.controls).forEach((c: any) => c.control?.markAsTouched?.());
  }
  showError(ctrl: any, form: NgForm): boolean {
    return !!ctrl?.invalid && (ctrl?.touched || form?.submitted);
  }
  private mapRegisterError(error: any): string {
    const msg = (error?.message || '').toLowerCase(); const status = error?.status;
    if (msg.includes('already registered') || msg.includes('exists')) return 'Ya existe una cuenta con este correo.';
    if (msg.includes('invalid email')) return 'El correo ingresado no es válido.';
    if (msg.includes('password') && (msg.includes('short') || msg.includes('length') || msg.includes('weak'))) return 'La contraseña no cumple los requisitos mínimos.';
    if (status === 429 || msg.includes('rate limit')) return 'Demasiados intentos. Probá nuevamente en unos minutos.';
    if (status === 0 || msg.includes('network') || msg.includes('fetch')) return 'Problema de conexión. Verificá tu internet e intentá otra vez.';
    return 'No pudimos completar el registro. Intentá de nuevo.';
  }

  // onSubmit(form: NgForm) {
  //   this.errorMsg = '';
  //   this.passwordsMismatch = false;

  //   this.markAllAsTouched(form);
  //   if (form.invalid) {
  //     this.toastError('Por favor completá todos los campos correctamente.');
  //     return;
  //   }

  //   if (this.password !== this.confirm) {
  //     this.passwordsMismatch = true;
  //     this.toastError('Las contraseñas no coinciden.');
  //     return;
  //   }

  //   if (this.requirePhoto && !this.photoFile) {
  //     this.toastError('Subí una foto de perfil para continuar.');
  //     return;
  //   }

  //   if (this.loading) return;
  //   this.loading = true;
  //   this.toastOk('Formulario válido. Registrando...');

  //   this.auth.register(this.email, this.password)
  //     .then(() => {
  //       this.nombre = this.email = this.password = this.confirm = '';
  //       this.photoFile = null; this.photoPreview = null;
  //       form.resetForm();
  //       this.router.navigate(['/login']);
  //     })
  //     .catch((error: any) => {
  //       const msg = this.mapRegisterError(error);
  //       this.errorMsg = msg;
  //       this.toastError(msg);
  //       console.error('Register anon error:', error);
  //     })
  //     .finally(() => { this.loading = false; });
  // }

  onSubmit(form: NgForm) {
  this.errorMsg = '';
  this.passwordsMismatch = false;

  this.markAllAsTouched(form);
  if (form.invalid) {
    this.toastError('Por favor completá todos los campos correctamente.');
    return;
  }

  if (this.password !== this.confirm) {
    this.passwordsMismatch = true;
    this.toastError('Las contraseñas no coinciden.');
    return;
  }

  if (this.requirePhoto && !this.photoFile) {
    this.toastError('Subí una foto de perfil para continuar.');
    return;
  }

  if (this.loading) return;
  this.loading = true;
  this.toastOk('Formulario válido. Registrando...');

  // 👇 FLUJO COMPLETO: signUp + (subir foto) + insert en clientes_registrados
  this.auth.registrarClienteFlow(
    {
      tipo_registro: 'anonimo',
      nombre: this.nombre,
      email: this.email,
      password: this.password,
      // (sin apellido ni dni)
    },
    this.photoFile // se sube al bucket 'avatars' si viene
  )
  .then(() => {
    this.toastOk('Registro enviado. ¡Revisá tu correo si requiere confirmación!');
    // limpiar
    this.nombre = '';
    this.email = '';
    this.password = '';
    this.confirm = '';
    this.photoFile = null;
    this.photoPreview = null;
    form.resetForm();
    this.router.navigate(['/login']);
  })
  .catch((error: any) => {
    const msg = this.mapRegisterError(error);
    this.errorMsg = msg;
    this.toastError(msg);
    console.error('Registrar anónimo error:', error);
  })
  .finally(() => { this.loading = false; });
}

}
