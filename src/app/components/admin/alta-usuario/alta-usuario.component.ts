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
import { SpinnerService } from 'src/app/services/spinner.service';
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

  constructor(
    private toastr: ToastrService,
    private supa: SupabaseService,
    private router: Router,
    private spinner: SpinnerService
  ) {
    addIcons({ camera, barcodeOutline });
  }

  // ===== utilidades =====
  private isNative(): boolean { return Capacitor.isNativePlatform(); }
  private toastOk(msg: string)    { this.toastr.success(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 2500 }); }
  private toastError(msg: string) { this.toastr.error(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 4000 }); }

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
      if (!this.isNative()) { this.toastError('LA CÁMARA REQUIERE DISPOSITIVO MÓVIL'); return; }

      const perms = await Camera.requestPermissions({ permissions: ['camera'] });
      if (perms.camera !== 'granted') { this.toastError('HABILITÁ LA CÁMARA'); return; }

      const img = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        quality: 55,     // más liviana
        width: 900,      // limita lado mayor
        allowEditing: false,
      });

      if (!img?.base64String) { this.toastError('NO SE OBTUVO LA FOTO'); return; }

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
      console.log('[alta-usuario] 📸 Iniciando escaneo DNI...');
      
      // 🎬 NUEVO: Preparar sesión ANTES de abrir la cámara
      await this.supa.prepareForCameraUse();
      
      let perm: PermissionStatus = await BarcodeScanner.checkPermissions();
      if (!perm.camera || perm.camera === 'denied') {
        perm = await BarcodeScanner.requestPermissions();
      }
      if (!perm.camera || perm.camera === 'denied') {
        this.toastError('SIN PERMISOS DE CÁMARA');
        return;
      }
  
      const { barcodes } = await BarcodeScanner.scan({
        // ⬅️ Enum correcto
        formats: [BarcodeFormat.Pdf417],
      });
  
      console.log('[alta-usuario] 🔄 Cámara cerrada, restaurando sesión...');
      
      // ⚠️ CRÍTICO: Restaurar sesión de Supabase después de usar la cámara
      const sessionRestored = await this.supa.restoreSessionAfterCamera();
      
      if (!sessionRestored) {
        console.warn('[alta-usuario] ⚠️ No se pudo restaurar la sesión completamente');
      }
  
      // Algunos wrappers devuelven número/enum; por las dudas, validamos ambos
      const isPdf417 = (f: any) =>
        f === BarcodeFormat.Pdf417 || String(f).toUpperCase() === 'PDF417';
  
      const b = barcodes.find(x => isPdf417((x as any).format));
      if (!b?.rawValue) { this.toastError('NO SE PUDO LEER EL DNI'); return; }

      const { apellidos, nombres, dni } = this.parseArgDniPdf417(b.rawValue);
      if (apellidos) this.apellido = apellidos;
      if (nombres)   this.nombre   = nombres;
      if (dni)       this.dni      = dni;

      this.toastOk('DATOS DEL DNI CARGADOS');
    } catch (e) {
      console.warn('Scan cancelado/error:', e);
      this.toastError('NO SE PUDO ESCANEAR EL DNI');
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

    const fail = (msg: string) => { this.errorMsg = msg.toUpperCase(); this.toastError(msg); };

    if (!apellidos) { fail('EL APELLIDO ES OBLIGATORIO'); this.loading = false; return; }
    if (!nombres)   { fail('EL NOMBRE ES OBLIGATORIO');  this.loading = false; return; }
    if (!this.isDniValido(dni)) { fail('DNI INVÁLIDO (7-8 DÍGITOS)'); this.loading = false; return; }
    if (!/^\d{11}$/.test(cuil) || !this.cuilValido) { fail('CUIL INVÁLIDO (11 DÍGITOS + VERIFICADOR)'); this.loading = false; return; }
    if (!email || !email.includes('@')) { fail('INGRESÁ UN CORREO VÁLIDO'); this.loading = false; return; }
    if (!password || password.length < 8) { fail('LA CONTRASEÑA DEBE TENER AL MENOS 8 CARACTERES'); this.loading = false; return; }
    if (password !== confirm) { fail('LAS CONTRASEÑAS NO COINCIDEN'); this.loading = false; return; }
    if (!perfil) { fail('SELECCIONÁ UN PERFIL'); this.loading = false; return; }
    // La foto no es obligatoria; si querés forzarla, descomentá:
    // if (!photoBase64) { fail('La foto es obligatoria.'); this.loading = false; return; }

    const payload = { apellidos, nombres, dni, cuil, email, password, perfil, photoBase64 };
    console.log('[UI] listo payload', payload);

    try {
      this.spinner.show({ immediate: true, minMs: 1000 });
      const out = await this.supa.altaEmpleadoViaFunctionDirect(payload);
      console.log('[UI] function OK', out);

     // this.toastOk('EMPLEADO CREADO CORRECTAMENTE');
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
      this.errorMsg = (e?.message || 'NO SE PUDO CREAR EL EMPLEADO').toUpperCase();
      this.toastError(this.errorMsg);

    } finally {
      this.loading = false;
      this.spinner.hide();
    }
  }
}
