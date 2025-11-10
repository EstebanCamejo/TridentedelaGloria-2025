
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Device } from '@capacitor/device';
import { AppLauncher } from '@capacitor/app-launcher';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner, BarcodeFormat, PermissionStatus  } from '@capacitor-mlkit/barcode-scanning';

// 👇 importa util y los íconos que vas a usar
import { addIcons } from 'ionicons';
import { camera, barcodeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-registro-cliente',
  standalone: true,
  templateUrl: './registro-cliente.component.html',
  styleUrls: ['./registro-cliente.component.scss'],
  imports: [CommonModule, FormsModule,
  IonButton,
  IonIcon,],   // ← quitamos IonContent
})
export class RegistroClienteComponent {
  username = '';
  apellido = '';
  dni = '';
  email = '';
  password = '';
  confirm = '';

  loading = false;
  errorMsg = '';
  passwordsMismatch = false;
  logoReady = false;
  photoPreview: string | null = null;   // para mostrar la miniatura
photoFile: File | null = null;        // archivo listo para subir

@ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  constructor(
    private auth: SupabaseService,
    private router: Router,
    private toastr: ToastrService,
    private spinner: SpinnerService
  ) {
     addIcons({ camera, barcodeOutline });
  }

  ionViewDidEnter() {
    requestAnimationFrame(() => (this.logoReady = true));
  }

  private mapRegisterError(error: any): string {
    const msg = (error?.message || '').toLowerCase();
    const status = error?.status;
    if (msg.includes('already registered') ||   msg.includes('already exists') ||
    msg.includes('email already') || msg.includes('exists')) return 'YA EXISTE UNA CUENTA CON ESTE CORREO';
    if (msg.includes('invalid email')) return 'EL CORREO INGRESADO NO ES VÁLIDO';
    if (msg.includes('password') && (msg.includes('short') || msg.includes('length') || msg.includes('weak'))) return 'LA CONTRASEÑA NO CUMPLE LOS REQUISITOS MÍNIMOS';
    if (status === 429 || msg.includes('rate limit')) return 'DEMASIADOS INTENTOS. PROBÁ NUEVAMENTE EN UNOS MINUTOS';
    if (status === 0 || msg.includes('network') || msg.includes('fetch')) return 'PROBLEMA DE CONEXIÓN. VERIFICÁ TU INTERNET E INTENTÁ OTRA VEZ';
    return 'NO PUDIMOS COMPLETAR EL REGISTRO. INTENTÁ DE NUEVO';
  }
  private isNative(): boolean {
  return Capacitor.isNativePlatform();
}



  private async openSettingsSafe() {
  try {
    const info = await Device.getInfo();

    if (info.platform === 'android') {
      const appInfo = await App.getInfo();

      // Abre: Ajustes > Info de la app (Android)
      const intent = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${appInfo.id};end`;

      const can = await AppLauncher.canOpenUrl({ url: intent });
      if (can.value) {
        await AppLauncher.openUrl({ url: intent });
        return;
      }
    }

    console.warn('No hay forma de abrir Ajustes en esta plataforma.');
  } catch (e) {
    console.warn('No se pudo abrir Ajustes:', e);
  }
}

/** Permiso para el ESCÁNER (ML Kit) */
private async ensureScanPermission(): Promise<boolean> {
  if (!this.isNative()) return false;

  let perms: PermissionStatus = await BarcodeScanner.checkPermissions();
  if (perms.camera !== 'granted') {
    perms = await BarcodeScanner.requestPermissions();
  }
  if (perms.camera !== 'granted') {
    this.toastError('HABILITÁ LA CÁMARA PARA ESCANEAR EL DNI');
    await this.openSettingsSafe();
    return false;
  }
  return true;
}


/** Permiso para tomar/elegir FOTO (plugin Camera) */
private async ensureCameraPermission(): Promise<boolean> {
  if (!this.isNative()) return true; // web usa <input type="file">

  let perms = await Camera.checkPermissions();
  const need = perms.camera !== 'granted' || (perms.photos && perms.photos !== 'granted');
  if (need) {
    perms = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
  }
  if (perms.camera !== 'granted') {
    this.toastError('HABILITÁ LA CÁMARA PARA TOMAR LA FOTO');
    await this.openSettingsSafe();
    return false;
  }
  return true;
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
 /** Mostrar error si el control es inválido y fue tocado o se intentó enviar */
  showError(ctrl: any, form: NgForm): boolean {
    return !!ctrl?.invalid && (ctrl?.touched || form?.submitted);
  }
  onSubmit(registerForm: NgForm) {
    this.errorMsg = '';
    if (this.loading) return;
        Object.values(registerForm.controls).forEach((c: any) => c.control?.markAsTouched?.());

// validaciones básicas de formulario
    if (registerForm.invalid) {
      this.toastError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS CORRECTAMENTE');
      return;
    }

    // validar coincidencia de contraseñas
    if (this.password !== this.confirm) {
      this.passwordsMismatch = true;
      this.toastError('LAS CONTRASEÑAS NO COINCIDEN');
      return;
    }

    // validar DNI (por si no tomó el pattern)
    if (!/^[0-9]{7,8}$/.test(this.dni)) {
      this.toastError('INGRESÁ UN DNI VÁLIDO (7-8 DÍGITOS)');
      return;
    }
    if (!this.photoFile) {
  // si querés que sea obligatorio
  this.toastError('SUBÍ UNA FOTO DE PERFIL PARA CONTINUAR');
  return;
}

// evitar doble envío
if (this.loading) return;
this.loading = true;
this.spinner.show({ immediate: true });

// 👇 FLUJO COMPLETO: signUp + subir foto + insert en clientes_registrados
// this.auth.registrarClienteFlow(
//   {
//     tipo_registro: 'cliente',   // << este componente es el “cliente”
//     nombre: this.username,
//     apellido: this.apellido,
//     dni: this.dni,
//     email: this.email,
//     password: this.password,
//   },
//   this.photoFile // << se sube al bucket (avatars) si viene
// )
// .then(() => {
//   this.toastOk('Registro enviado. ¡Revisá tu correo si requiere confirmación!');
//   // limpiar
//   this.username = '';
//   this.apellido = '';
//   this.dni = '';
//   this.email = '';
//   this.password = '';
//   this.confirm = '';
//   this.photoFile = null;
//   this.photoPreview = null;
//   registerForm.resetForm();
//   this.router.navigate(['/login']);
// })
// .catch((error: any) => {
//   const msg = this.mapRegisterError(error);
//   this.errorMsg = msg;
//   this.toastError(msg);
//   console.error('Registrar cliente error:', error);
// })
// .finally(() => { this.loading = false; });

// this.auth.registrarClienteFlow(
//   {
//     tipo_registro: 'cliente',
//     nombre: this.username,
//     apellido: this.apellido,
//     dni: this.dni,
//     email: this.email,
//     password: this.password,
//   },
//   this.photoFile
// )
// .then(() => {
//   this.toastOk('Registro enviado. ¡Revisá tu correo si requiere confirmación!');
//   this.username = '';
//   this.apellido = '';
//   this.dni = '';
//   this.email = '';
//   this.password = '';
//   this.confirm = '';
//   this.photoFile = null;
//   this.photoPreview = null;
//   registerForm.resetForm();
//   this.router.navigate(['/login']);
// })
// .catch((error: any) => {
//   // 🔎 Log más verboso para ver el motivo real (RLS/401/403/etc.)
//   console.error('Registrar cliente error (raw):', error, {
//     status: (error as any)?.status,
//     code: (error as any)?.code,
//     details: (error as any)?.details,
//     message: (error as any)?.message,
//   });

//   const msg = this.mapRegisterError(error);
//   this.errorMsg = msg;
//   this.toastError(msg);
// })
// .finally(() => { this.loading = false; });

this.auth.registrarClienteFlow(
  {
    tipo_registro: 'cliente',
    nombre: this.username,
    apellido: this.apellido,
    dni: this.dni,
    email: this.email,
    password: this.password,
  },
  this.photoFile
)
.then(() => {
  this.toastOk('TU CUENTA FUE CREADA Y ESTÁ EN REVISIÓN. REVISÁ TU CORREO');
  // limpiar
  this.username = '';
  this.apellido = '';
  this.dni = '';
  this.email = '';
  this.password = '';
  this.confirm = '';
  this.photoFile = null;
  this.photoPreview = null;
  registerForm.resetForm();
  this.router.navigate(['/login']);
})
.catch((error: any) => {
  // Log verboso para depurar (RLS/401/403/etc.)
  console.error('Registrar cliente error (raw):', error, {
    status: (error as any)?.status,
    code: (error as any)?.code,
    details: (error as any)?.details,
    message: (error as any)?.message,
  });

  const msg = this.mapRegisterError(error);
  this.errorMsg = msg;
  this.toastError(msg);
})
.finally(() => { 
  this.loading = false;
  this.spinner.hide();
});


  
}
  
// Convierte un webPath/base64 a File para subirlo (Storage/backend)
private async uriToFile(uri: string, fileName: string): Promise<File> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = (blob.type?.split('/')?.[1]) || 'jpg';
  return new File([blob], `${fileName}.${ext}`, { type: blob.type || 'image/jpeg' });
}

async subirFotoClick() {
  try {
    if (this.isNative()) {
      const ok = await this.ensureCameraPermission();
      if (!ok) return;

      const img = await Camera.getPhoto({
        quality: 75,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,   // mostrará el action sheet
        allowEditing: false,
        saveToGallery: false,

        // 👇 Etiquetas en español
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
// === ESCANEAR DNI ===
  async escanearDNI() {
  try {
    console.log('[registro-cliente] 📸 Iniciando escaneo DNI...');
    
    if (!this.isNative()) {
      this.toastError('EL ESCANEO REQUIERE UN DISPOSITIVO MÓVIL');
      return;
    }

    this.spinner.show({ immediate: true });

    // 🎬 NUEVO: Preparar sesión ANTES de abrir la cámara
    await this.auth.prepareForCameraUse();

    // 👉 pide permiso si hace falta
    const ok = await this.ensureScanPermission();
    if (!ok) {
      this.spinner.hide();
      return;
    }

    this.spinner.hide();

    // 👉 abre escáner ML Kit
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.Pdf417], // DNI argentino (reverso)
    });

    this.spinner.show({ immediate: true });

    console.log('[registro-cliente] 🔄 Cámara cerrada, restaurando sesión...');
    
    // ⚠️ CRÍTICO: Restaurar sesión de Supabase después de usar la cámara
    const sessionRestored = await this.auth.restoreSessionAfterCamera();
    
    if (!sessionRestored) {
      console.warn('[registro-cliente] ⚠️ No se pudo restaurar la sesión completamente');
    }

    if (!barcodes?.length) {
      this.spinner.hide();
      this.toastError('NO SE DETECTÓ NINGÚN CÓDIGO');
      return;
    }

    const raw = barcodes[0].rawValue ?? '';
    const parsed = this.parseDniPdf417(raw);

    if (parsed.lastName)  this.apellido = parsed.lastName;
    if (parsed.firstName) this.username = parsed.firstName;
    if (parsed.dni)       this.dni = parsed.dni;

    this.spinner.hide();
    this.toastOk('DATOS DEL DNI CARGADOS');
  } catch (e) {
    console.error('Escaneo DNI error:', e);
    this.spinner.hide();
    this.toastError('NO SE PUDO ESCANEAR EL DNI');
  }
}


  /**
   * Parser robusto para PDF417 del DNI (intenta varios formatos comunes).
   * Retorna { firstName, lastName, dni } si los encuentra.
   */
  private parseDniPdf417(raw: string): { firstName?: string; lastName?: string; dni?: string } {
    const out: any = {};
    const text = (raw || '').replace(/\r?\n/g, '').trim();

    // Formato común "campo@campo@..."
    // Suele venir como: <DNI>@<APELLIDO>@<NOMBRE>@...
    if (text.includes('@')) {
      const parts = text.split('@').map(s => s?.trim());
      // Heurística:
      // - DNI: primer valor que parezca 7-8 dígitos
      // - Apellido y Nombre: posiciones siguientes típicas
      const dniCandidate = parts.find(p => /^[0-9]{7,8}$/.test(p));
      if (dniCandidate) out.dni = dniCandidate;

      // Apellido y nombre suelen venir en mayúsculas
      // Intento clásico: [0]=DNI, [1]=APELLIDO, [2]=NOMBRE
      if (!out.lastName && parts[1] && /^[A-ZÁÉÍÓÚÑ\s'-]+$/.test(parts[1])) {
        out.lastName = this.titleCase(parts[1]);
      }
      if (!out.firstName && parts[2] && /^[A-ZÁÉÍÓÚÑ\s'-]+$/.test(parts[2])) {
        out.firstName = this.titleCase(parts[2]);
      }
    }

    // Fallback: buscar DNI por regex en todo el string
    if (!out.dni) {
      const m = text.match(/(^|[^0-9])([0-9]{7,8})([^0-9]|$)/);
      if (m) out.dni = m[2];
    }

    return out;
  }

  private titleCase(s: string): string {
    return s.toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }

}
