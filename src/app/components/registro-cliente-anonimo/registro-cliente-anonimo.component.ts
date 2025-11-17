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
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, close } from 'ionicons/icons';

@Component({
  selector: 'app-registro-cliente-anonimo',
  standalone: true,
  templateUrl: './registro-cliente-anonimo.component.html',
  styleUrls: ['./registro-cliente-anonimo.component.scss'],
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonModal],
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
  photoUrl: string | null = null;       // URL de la foto guardada en storage
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  requirePhoto = false; // ponelo true si querés exigir foto
  showPhotoModal = false;              // control del modal
  tempPhotoPreview: string | null = null;  // foto temporal antes de confirmar
  uploadingPhoto = false;              // estado de carga al subir foto

  constructor(
    private auth: SupabaseService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: SpinnerService
  ) {
    addIcons({ camera, close });
  }

  // ==== FOTO ====
  private async uriToFile(uri: string, fileName: string): Promise<File> {
    console.log('[registro-cliente-anonimo] uriToFile - URI recibida:', uri);
    
    try {
      // En Capacitor, el webPath debería ser accesible con fetch
      const res = await fetch(uri);
      
      if (!res.ok) {
        throw new Error(`Error al obtener la imagen: ${res.status} ${res.statusText}`);
      }
      
      const blob = await res.blob();
      
      if (!blob || blob.size === 0) {
        throw new Error('El archivo de imagen está vacío');
      }
      
      console.log('[registro-cliente-anonimo] uriToFile - Blob obtenido:', blob.size, 'bytes, tipo:', blob.type);
      
      const ext = (blob.type?.split('/')?.[1]) || 'jpg';
      const file = new File([blob], `${fileName}.${ext}`, { type: blob.type || 'image/jpeg' });
      
      console.log('[registro-cliente-anonimo] uriToFile - File creado:', file.name, file.size, 'bytes');
      
      return file;
    } catch (error: any) {
      console.error('[registro-cliente-anonimo] uriToFile - Error:', error);
      throw new Error(`No se pudo convertir la imagen a archivo: ${error?.message || error}`);
    }
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
          this.tempPhotoPreview = img.webPath;
          this.showPhotoModal = true;
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
    this.tempPhotoPreview = URL.createObjectURL(f);
    this.showPhotoModal = true;
  }

  async confirmPhoto() {
    if (this.tempPhotoPreview) {
      this.photoPreview = this.tempPhotoPreview;
      
      try {
        // Convertir la URI temporal a File si es necesario
        if (Capacitor.isNativePlatform() && this.tempPhotoPreview.startsWith('file://')) {
          console.log('[registro-cliente-anonimo] Convirtiendo URI a File...', this.tempPhotoPreview);
          const file = await this.uriToFile(this.tempPhotoPreview, `perfil-${Date.now()}`);
          this.photoFile = file;
          console.log('[registro-cliente-anonimo] ✅ Foto convertida a File:', file.name, file.size, 'bytes');
        } else if (this.tempPhotoPreview.startsWith('blob:')) {
          // Ya es un blob URL, el fileInput ya tiene el archivo
          if (!this.photoFile && this.fileInput?.nativeElement.files?.[0]) {
            this.photoFile = this.fileInput.nativeElement.files[0];
            console.log('[registro-cliente-anonimo] ✅ Foto obtenida del input:', this.photoFile.name, this.photoFile.size, 'bytes');
          } else if (!this.photoFile) {
            // Si no hay archivo en el input, convertir el blob URL
            console.log('[registro-cliente-anonimo] Convirtiendo blob URL a File...');
            const file = await this.uriToFile(this.tempPhotoPreview, `perfil-${Date.now()}`);
            this.photoFile = file;
            console.log('[registro-cliente-anonimo] ✅ Foto convertida desde blob:', file.name, file.size, 'bytes');
          }
        } else if (this.tempPhotoPreview.startsWith('http://') || this.tempPhotoPreview.startsWith('https://')) {
          // URL remota (poco común pero posible)
          console.log('[registro-cliente-anonimo] Convirtiendo URL remota a File...');
          const file = await this.uriToFile(this.tempPhotoPreview, `perfil-${Date.now()}`);
          this.photoFile = file;
          console.log('[registro-cliente-anonimo] ✅ Foto convertida desde URL:', file.name, file.size, 'bytes');
        }

        // Si tenemos la foto y un email, subir inmediatamente al storage
        if (this.photoFile && this.email && this.email.trim() !== '') {
          await this.uploadPhotoImmediately();
        } else if (this.photoFile && (!this.email || this.email.trim() === '')) {
          console.log('[registro-cliente-anonimo] ⚠️ Foto lista pero no hay email. Se subirá durante el registro.');
        }
      } catch (error) {
        console.error('[registro-cliente-anonimo] ❌ Error al convertir foto a File:', error);
        this.toastError('NO SE PUDO PROCESAR LA FOTO. INTENTÁ NUEVAMENTE');
        this.tempPhotoPreview = null;
        this.photoPreview = null;
        this.photoFile = null;
        this.photoUrl = null;
        this.closePhotoModal();
        return;
      }
    }
    this.closePhotoModal();
  }

  private async uploadPhotoImmediately() {
    if (!this.photoFile || !this.email) {
      console.warn('[registro-cliente-anonimo] No se puede subir foto: falta photoFile o email');
      return;
    }

    this.uploadingPhoto = true;
    try {
      console.log('[registro-cliente-anonimo] 📤 Subiendo foto al storage inmediatamente...', {
        email: this.email,
        fileName: this.photoFile.name,
        fileSize: this.photoFile.size
      });

      const result = await this.auth.uploadAvatar(this.photoFile, this.email);
      
      if (result?.publicUrl) {
        this.photoUrl = result.publicUrl;
        console.log('[registro-cliente-anonimo] ✅ Foto subida exitosamente, URL:', this.photoUrl);
      } else {
        throw new Error('No se recibió la URL de la foto');
      }
    } catch (error: any) {
      console.error('[registro-cliente-anonimo] ❌ Error al subir foto:', error);
      this.toastError('NO SE PUDO GUARDAR LA FOTO. SE INTENTARÁ DURANTE EL REGISTRO');
      // No fallar completamente, la foto se intentará subir durante el registro
      this.photoUrl = null;
    } finally {
      this.uploadingPhoto = false;
    }
  }

  cancelPhoto() {
    if (this.tempPhotoPreview && this.tempPhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.tempPhotoPreview);
    }
    this.tempPhotoPreview = null;
    this.closePhotoModal();
  }

  // Método para subir foto cuando el email cambia (si ya hay foto seleccionada)
  onEmailChange() {
    if (this.photoFile && this.email && this.email.trim() !== '' && !this.photoUrl && !this.uploadingPhoto) {
      console.log('[registro-cliente-anonimo] Email ingresado, subiendo foto...');
      this.uploadPhotoImmediately();
    }
  }

  closePhotoModal() {
    this.showPhotoModal = false;
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
  // Validar que la foto esté lista (si hay preview, debe haber file)
  if (this.photoPreview && !this.photoFile) {
    console.warn('[registro-cliente-anonimo] onSubmit - Hay preview pero no hay photoFile');
    this.toastError('LA FOTO AÚN SE ESTÁ PROCESANDO. ESPERÁ UN MOMENTO E INTENTÁ NUEVAMENTE');
    return;
  }
  
  if (this.requirePhoto && !this.photoFile) {
    this.toastError('SUBÍ UNA FOTO DE PERFIL PARA CONTINUAR');
    return;
  }
  
  if (this.photoFile) {
    console.log('[registro-cliente-anonimo] onSubmit - Foto lista:', this.photoFile.name, this.photoFile.size, 'bytes');
    console.log('[registro-cliente-anonimo] onSubmit - URL de foto guardada:', this.photoUrl || 'NO HAY URL (se subirá durante el registro)');
  }

  // Si la foto no se subió antes (porque no había email), intentar subirla ahora
  if (this.photoFile && !this.photoUrl) {
    console.log('[registro-cliente-anonimo] 📤 La foto no se subió antes, subiendo ahora...');
    await this.uploadPhotoImmediately();
  }

  if (this.loading) return;

  this.loading = true;
  this.spinner.show({ immediate: true });
  (document.activeElement as HTMLElement | null)?.blur?.(); // opcional, evita glitches con teclado en mobile

  try {
    // 1) Alta + (foto) + inserción
    // Si ya tenemos la URL, podríamos pasarla, pero el flujo actual sube la foto de nuevo
    // que está bien porque la función edge maneja todo
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
    this.photoUrl = null;
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
