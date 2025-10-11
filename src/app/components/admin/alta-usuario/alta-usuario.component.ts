import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SupabaseService } from 'src/app/services/supabase.service';
import { addIcons } from 'ionicons';
import { camera, barcodeOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
// QR DNI
import {
  BarcodeScanner,
  BarcodeFormat,
  PermissionStatus,
} from '@capacitor-mlkit/barcode-scanning';
import { query } from '@angular/animations';
import { from } from 'rxjs';

@Component({
  selector: 'app-alta-usuario',
  standalone: true,
  templateUrl: './alta-usuario.component.html',
  styleUrls: ['./alta-usuario.component.scss'],
  imports: [CommonModule, FormsModule, IonButton, IonIcon],
})
export class AltaUsuarioComponent {
  // tus bindings del template
  apellido = '';
  nombre = '';
  dni = '';
  cuil = '';
  email = '';
  password = '';
  confirm = '';
  perfil: 'maitre' | 'mozo' | 'cocinero' | 'bartender' | null = null;

  loading = false;
  errorMsg = '';
  passwordsMismatch = false;

  photoPreview: string | null = null; // muestra en UI
  photoBase64: string | null = null;  // se envía a la Edge Function

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private toastr: ToastrService, private supa: SupabaseService, private router: Router) {
    addIcons({ camera, barcodeOutline });
  }

  // ===== utilidades =====
  private isNative(): boolean { return Capacitor.isNativePlatform(); }
  private toastOk(msg: string)    { this.toastr.success(msg, '', { positionClass: 'toast-center', timeOut: 2500 }); }
  private toastError(msg: string) { this.toastr.error(msg, 'Error', { positionClass: 'toast-center', timeOut: 4000 }); }

  showError(ctrl: any, form: NgForm): boolean {
    return !!ctrl?.invalid && (ctrl?.touched || form?.submitted);
  }

  // DNI 7–8 dígitos
  private isDniValido(v: string) {
    return /^[0-9]{7,8}$/.test((v || '').trim());
  }

  // CUIL 11 dígitos con verificador
  get cuilValido(): boolean {
    const s = (this.cuil || '').trim();
    if (!/^\d{11}$/.test(s)) return false;
    const a = s.split('').map(n => +n);
    const pesos = [5,4,3,2,7,6,5,4,3,2];
    const sum = pesos.reduce((acc, p, i) => acc + p * a[i], 0);
    let dv = 11 - (sum % 11);
    if (dv === 11) dv = 0;
    if (dv === 10) dv = 9;
    return dv === a[10];
  }

  // ===== Cámara: foto comprimida =====
  async tomarFoto() {
    try {
      if (!this.isNative()) { this.toastError('La cámara requiere dispositivo móvil.'); return; }

      const perms = await Camera.requestPermissions({ permissions: ['camera'] });
      if (perms.camera !== 'granted') { this.toastError('Habilitá la cámara.'); return; }

      const img = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        quality: 55,     // más liviana
        width: 900,      // limita lado mayor
        allowEditing: false,
      });

      if (!img?.base64String) { this.toastError('No se obtuvo la foto.'); return; }

      const mime = img.format ? `image/${img.format}` : 'image/jpeg';
      this.photoBase64 = `data:${mime};base64,${img.base64String}`;
      this.photoPreview = this.photoBase64;
    } catch (e) {
      console.warn('Cámara cancelada/error:', e);
    }
  }

  // ===== Lector de DNI (PDF417) =====
  private parseArgDniPdf417(raw: string) {
    // Formato clásico con @
    if (raw.includes('@')) {
      const p = raw.split('@');
      const apellidos = (p[1] || '').trim();
      const nombres   = (p[2] || '').trim();
      const cand = [p[4], p[5], p[6]].map(x => (x || '').trim());
      const dni = (cand.find(x => /^[0-9]{7,8}$/.test(x)) || '').trim();
      return { apellidos, nombres, dni };
    }
    // Variante con separador "|"
    const parts = raw.split('|');
    let apellidos = '', nombres = '';
    if (parts.length >= 2) { apellidos = (parts[0] || '').trim(); nombres = (parts[1] || '').trim(); }
    const mDni = raw.match(/(^|[^0-9])([0-9]{7,8})(?![0-9])/);
    const dni = mDni ? mDni[2] : '';
    return { apellidos, nombres, dni };
  }

  async escanearDNI() {
    try {
      let perm: PermissionStatus = await BarcodeScanner.checkPermissions();
      if (!perm.camera || perm.camera === 'denied') {
        perm = await BarcodeScanner.requestPermissions();
      }
      if (!perm.camera || perm.camera === 'denied') {
        this.toastError('Sin permisos de cámara.');
        return;
      }
  
      const { barcodes } = await BarcodeScanner.scan({
        // ⬅️ Enum correcto
        formats: [BarcodeFormat.Pdf417],
      });
  
      // Algunos wrappers devuelven número/enum; por las dudas, validamos ambos
      const isPdf417 = (f: any) =>
        f === BarcodeFormat.Pdf417 || String(f).toUpperCase() === 'PDF417';
  
      const b = barcodes.find(x => isPdf417((x as any).format));
      if (!b?.rawValue) { this.toastError('No se pudo leer el DNI.'); return; }
  
      const { apellidos, nombres, dni } = this.parseArgDniPdf417(b.rawValue);
      if (apellidos) this.apellido = apellidos;
      if (nombres)   this.nombre   = nombres;
      if (dni)       this.dni      = dni;
  
      this.toastOk('Datos del DNI cargados.');
    } catch (e) {
      console.warn('Scan cancelado/error:', e);
      this.toastError('No se pudo escanear el DNI.');
    }
  }
  

  // ===== Submit =====
  async onSubmit(f: NgForm) {
    console.log('[alta-usuario] onSubmit IN');
    if (this.loading) return;

    this.loading = true;
    this.errorMsg = '';

    // marcar campos tocados para mostrar errores en UI
    Object.values(f.controls).forEach((c: any) => c?.control?.markAsTouched?.());

    const apellidos = (this.apellido || '').trim();
    const nombres   = (this.nombre   || '').trim();
    const dni       = (this.dni      || '').replace(/\D/g, '');
    const cuil      = (this.cuil     || '').replace(/\D/g, '');
    const email     = (this.email    || '').trim().toLowerCase();
    const password  = this.password || '';
    const confirm   = this.confirm  || '';
    const perfil    = (this.perfil  || null) as 'maitre'|'mozo'|'cocinero'|'bartender'|null;
    const photoBase64 = this.photoBase64 || null;

    const fail = (msg: string) => { this.errorMsg = msg; this.toastError(msg); };

    if (!apellidos) { fail('El apellido es obligatorio.'); this.loading = false; return; }
    if (!nombres)   { fail('El nombre es obligatorio.');  this.loading = false; return; }
    if (!this.isDniValido(dni)) { fail('DNI inválido (7–8 dígitos).'); this.loading = false; return; }
    if (!/^\d{11}$/.test(cuil) || !this.cuilValido) { fail('CUIL inválido (11 dígitos + verificador).'); this.loading = false; return; }
    if (!email || !email.includes('@')) { fail('Ingresá un correo válido.'); this.loading = false; return; }
    if (!password || password.length < 8) { fail('La contraseña debe tener al menos 8 caracteres.'); this.loading = false; return; }
    if (password !== confirm) { fail('Las contraseñas no coinciden.'); this.loading = false; return; }
    if (!perfil) { fail('Seleccioná un perfil.'); this.loading = false; return; }
    // La foto no es obligatoria; si querés forzarla, descomentá:
    // if (!photoBase64) { fail('La foto es obligatoria.'); this.loading = false; return; }

    const payload = { apellidos, nombres, dni, cuil, email, password, perfil, photoBase64 };
    console.log('[UI] listo payload', payload);

    try {
      const out = await this.supa.altaEmpleadoViaFunctionDirect(payload);
      console.log('[UI] function OK', out);

     // this.toastOk('Empleado creado correctamente.');
      // limpiar form
      this.apellido = this.nombre = this.dni = this.cuil =
      this.email = this.password = this.confirm = '';
      this.perfil = null;
      this.photoBase64 = this.photoPreview = null;
      f.resetForm();
      // [NAV] redirigir a Home Admin y limpiar historial
      this.router.navigate(['/home-admin'], {
        replaceUrl: true,
        queryParams: { from: 'alta-usuario' }
      });

    } catch (e: any) {
      console.error('[UI] error en onSubmit', e);
      this.errorMsg = e?.message || 'No se pudo crear el empleado.';
      this.toastError(this.errorMsg);

    } finally {
      this.loading = false;
    }
  }
}
