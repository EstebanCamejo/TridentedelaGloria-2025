import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner, BarcodeFormat, PermissionStatus } from '@capacitor-mlkit/barcode-scanning';
import { SupabaseService } from 'src/app/services/supabase.service';
import { addIcons } from 'ionicons';
import { camera, barcodeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-alta-usuario',
  standalone: true,
  templateUrl: './alta-usuario.component.html',
  styleUrls: ['./alta-usuario.component.scss'],
  imports: [CommonModule, FormsModule, IonButton, IonIcon],
})
export class AltaUsuarioComponent {
  apellido = '';
  nombre = '';
  dni = '';
  cuil = '';
  email = '';
  password = '';
  confirm = '';
  perfil: ('maitre'|'mozo'|'cocinero'|'bartender'|null) = null;


  loading = false;
  errorMsg = '';
  passwordsMismatch = false;

  photoPreview: string | null = null;
  photoFile: File | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>; // (no usamos galería; queda por si luego querés web)

  // --- Helpers de UI ---
  private isNative(): boolean { return Capacitor.isNativePlatform(); }
  private toastOk(msg: string) { this.toastr.success(msg, '', { positionClass:'toast-center', timeOut:3000, progressBar:true }); }
  private toastError(msg: string) { this.toastr.error(msg, 'Error', { positionClass:'toast-center', closeButton:true, progressBar:true, timeOut:4500 }); }

  constructor(private toastr: ToastrService, private supa: SupabaseService) {
    addIcons({ camera, barcodeOutline });
  }

  showError(ctrl: any, form: NgForm): boolean {
    return !!ctrl?.invalid && (ctrl?.touched || form?.submitted);
  }

  // === FOTO: sólo cámara ===
  async tomarFoto() {
    try {
      if (!this.isNative()) {
        this.toastError('La captura de foto requiere dispositivo móvil.');
        return;
      }
      // Sólo cámara (sin galería)
      const perms = await Camera.requestPermissions({ permissions:['camera'] });
      if (perms.camera !== 'granted') { this.toastError('Habilitá la cámara.'); return; }
      const img = await Camera.getPhoto({
        quality: 70,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        allowEditing: false,
        saveToGallery: false,
      });
      if (!img?.base64String) { this.toastError('No se obtuvo la imagen.'); return; }

      // Preview
      const mime = img.format ? `image/${img.format}` : 'image/jpeg';
      this.photoPreview = `data:${mime};base64,${img.base64String}`;

      // File desde base64 (sin fetch)
      const fileName = `empleado-${Date.now()}.jpg`;
      const file = this.base64ToFile(img.base64String, fileName, mime);
      this.photoFile = file;
      // if (img?.webPath) {
      //   this.photoPreview = img.webPath;
      //   this.photoFile = await this.uriToFile(img.webPath, `empleado-${Date.now()}`);
      // }
    } catch (e) {
      console.warn('Cámara cancelada o error:', e);
    }
  }
  private base64ToFile(b64: string, fileName: string, mime = 'image/jpeg'): File {
    const byteChars = atob(b64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], fileName, { type: mime });
  }
  
  get cuilValido(): boolean {
    return this.validarCUIL(this.cuil);
  }
  

  // === DNI: escaneo PDF417 ===
  private async ensureScanPermission(): Promise<boolean> {
    if (!this.isNative()) return false;
    let perms: PermissionStatus = await BarcodeScanner.checkPermissions();
    if (perms.camera !== 'granted') perms = await BarcodeScanner.requestPermissions();
    return perms.camera === 'granted';
  }

  async escanearDNI() {
    try {
      if (!this.isNative()) { this.toastError('El escaneo requiere un dispositivo móvil.'); return; }
      const ok = await this.ensureScanPermission();
      if (!ok) { this.toastError('Habilitá la cámara para escanear.'); return; }

      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.Pdf417] });
      if (!barcodes?.length) { this.toastError('No se detectó ningún código.'); return; }

      const raw = barcodes[0].rawValue ?? '';
      const parsed = this.parseDniPdf417(raw);

      if (parsed.lastName)  this.apellido = parsed.lastName;
      if (parsed.firstName) this.nombre = parsed.firstName;
      if (parsed.dni)       this.dni = parsed.dni;

      this.toastOk('Datos del DNI cargados.');
    } catch (e) {
      console.error('Escaneo DNI error:', e);
      this.toastError('No se pudo escanear el DNI.');
    }
  }

  // === VALIDACIONES ===
  private validarCUIL(cuil: string): boolean {
    // 11 dígitos con verificador (algoritmo AFIP)
    if (!/^\d{11}$/.test(cuil)) return false;
    const nums = cuil.split('').map(n => +n);
    const pesos = [5,4,3,2,7,6,5,4,3,2];
    const suma = pesos.reduce((acc, p, i) => acc + p*nums[i], 0);
    let dv = 11 - (suma % 11);
    if (dv === 11) dv = 0;
    if (dv === 10) dv = 9; // ajuste AFIP
    return dv === nums[10];
  }

  private validarFormulario(f: NgForm): string | null {
    // Angular template-driven ya valida required/pattern/minlength;
    // acá sumamos chequeos cruzados:
    if (this.password !== this.confirm) {
      this.passwordsMismatch = true;
      return 'Las contraseñas no coinciden.';
    }
    if (!/^\d{7,8}$/.test(this.dni)) return 'Ingresá un DNI válido (7–8 dígitos).';
    if (!this.validarCUIL(this.cuil)) return 'CUIL inválido (verificador incorrecto).';
    if (!this.photoFile) return 'La foto es obligatoria (tomada con la cámara).';
    return null;
  }

  onSubmit(f: NgForm) {
    this.errorMsg = '';
    if (this.loading) return;
    Object.values(f.controls).forEach((c: any) => c.control?.markAsTouched?.());
  
    if (f.invalid) { this.toastError('Completá todos los campos correctamente.'); return; }
    const err = this.validarFormulario(f);
    if (err) { this.errorMsg = err; this.toastError(err); return; }
  
    this.loading = true;
  
 
    // constructor(private toastr: ToastrService, private supa: SupabaseService) {}
    this.supa.registrarEmpleado({
        apellido: this.apellido,
        nombre: this.nombre,
        dni: this.dni,
        cuil: this.cuil,
        email: this.email,
        password: this.password,
        perfil: this.perfil!,
      }, this.photoFile!)
      .then(() => {
        this.toastOk('Empleado creado correctamente.');
        // limpiar
        this.apellido = '';
        this.nombre = '';
        this.dni = '';
        this.cuil = '';
        this.email = '';
        this.password = '';
        this.confirm = '';
        this.perfil = null;
        this.photoFile = null;
        this.photoPreview = null;
        f.resetForm();
      })
      .catch((e: any) => {
        const msg = (e?.message || 'No se pudo crear el empleado.');
        this.errorMsg = msg;
        this.toastError(msg);
        console.error('[alta-usuario] error:', e);
      })
      .finally(() => this.loading = false);
  }
  

  // === Utils ===
  private async uriToFile(uri: string, fileName: string): Promise<File> {
    const res = await fetch(uri);
    const blob = await res.blob();
    const ext = (blob.type?.split('/')?.[1]) || 'jpg';
    return new File([blob], `${fileName}.${ext}`, { type: blob.type || 'image/jpeg' });
  }

  private parseDniPdf417(raw: string): { firstName?: string; lastName?: string; dni?: string } {
    const out: any = {};
    const text = (raw || '').replace(/\r?\n/g, '').trim();
    if (text.includes('@')) {
      const parts = text.split('@').map(s => s?.trim());
      const dniCandidate = parts.find(p => /^[0-9]{7,8}$/.test(p));
      if (dniCandidate) out.dni = dniCandidate;
      if (parts[1] && /^[A-ZÁÉÍÓÚÑ\s'-]+$/.test(parts[1])) out.lastName = this.tc(parts[1]);
      if (parts[2] && /^[A-ZÁÉÍÓÚÑ\s'-]+$/.test(parts[2])) out.firstName = this.tc(parts[2]);
    }
    if (!out.dni) {
      const m = text.match(/(^|[^0-9])([0-9]{7,8})([^0-9]|$)/);
      if (m) out.dni = m[2];
    }
    return out;
  }
  private tc(s: string): string { return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g,' ').trim(); }
}
