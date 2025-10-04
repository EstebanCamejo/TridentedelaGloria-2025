// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import {
//   IonContent, IonHeader, IonToolbar, IonTitle,
//   IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
//   IonButton, IonIcon, IonImg
// } from '@ionic/angular/standalone';
// import { addIcons } from 'ionicons';
// import { camera, save, download } from 'ionicons/icons';
// import { FormsModule } from '@angular/forms';
// import { ToastrService } from 'ngx-toastr';
// //import { AdminAltaMesaService, MesaTipo } from 'src/app/services/admin-alta-mesa.service';
// import { MesasService, MesaTipo } from 'src/app/services/mesas.service';
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';


// @Component({
//   selector: 'app-alta-mesa',
//   standalone: true,
//   imports: [
//     CommonModule, FormsModule,
//     IonContent, IonHeader, IonToolbar, IonTitle,
//     IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
//     IonButton, IonIcon, IonImg
//   ],
//   templateUrl: './alta-mesa.component.html',
// })
// export class AltaMesaComponent {
//   numero!: number | string;
//   capacidad!: number | string;
//   tipo: MesaTipo = 'estandar';

//   fotoPreview: string | null = null;
//   fotoBlob: Blob | null = null;

//   guardando = false;

//   // Mostramos el QR que sube el service
//   qrText: string | null = null;
//   qrDataUrl: string | null = null;   // acá irá la URL pública del PNG
//   qrPublicUrl: string | null = null;

//   lastMesaNumero?: number;
//   lastMesaId?: string;
//   qrFileName = 'mesa-qr.png';
  
//   constructor(
//     private mesas: MesasService,
//     private toast: ToastrService
//   ) { addIcons({ camera, save, download }); }


//   private blobToDataUrl(blob: Blob): Promise<string> {
//     return new Promise((resolve) => {
//       const reader = new FileReader();
//       reader.onload = () => resolve(reader.result as string);
//       reader.readAsDataURL(blob);
//     });
//   }


//   async tomarFoto() {
//     try {
//       const photo = await Camera.getPhoto({
//         quality: 50,
//         resultType: CameraResultType.Uri, // evita base64 gigante
//         source: CameraSource.Camera,
//         width: 1280,
//         correctOrientation: true,
//         saveToGallery: false,
//         promptLabelHeader: 'Tomar foto',
//         promptLabelPhoto: 'Usar cámara',
//         promptLabelPicture: 'Capturar',
//       });

//       const webPath = photo.webPath ?? photo.path;
//       if (!webPath) {
//         this.toast.error('No se pudo obtener la imagen.');
//         return;
//       }
//       const resp = await fetch(webPath);
//       const blob = await resp.blob();

//       this.fotoBlob = blob;
//       this.fotoPreview = await this.blobToDataUrl(blob);
//     } catch {
//       this.toast.error('No se pudo tomar la foto.');
//     }
//   }

//   async descargarQR() {
//     const url = this.qrPublicUrl || this.qrDataUrl;
//     if (!url) return;
  
//     try {
//       const resp = await fetch(url);
//       const blob = await resp.blob();
//       const objUrl = URL.createObjectURL(blob);
  
//       const a = document.createElement('a');
//       a.href = objUrl;
//       a.download = this.qrFileName || 'mesa-qr.png';
//       a.click();
  
//       URL.revokeObjectURL(objUrl);
//     } catch {
//       this.toast.error('No se pudo descargar el QR.');
//     }
//   }
  
//   get formularioInvalido(): boolean {
//     const n = Number(this.numero);
//     const c = Number(this.capacidad);
//     return !n || !c || c < 1 || c > 12 || !this.fotoBlob;
//   }

//   async guardar() {
//     if (this.formularioInvalido) {
//       this.toast.error('Completá todos los datos y tomá la foto de la mesa.');
//       return;
//     }
  
//     try {
//       this.guardando = true;
  
//       const numero = Number(this.numero);
//       const capacidad = Number(this.capacidad);
  
//       const libre = await this.mesas.numeroDisponible(numero);
//       if (!libre) {
//         this.toast.error('El número de mesa ya existe.');
//         return;
//       }
  
//       const res = await this.mesas.crearMesa({
//         numero,
//         capacidad,
//         tipo: this.tipo,      // el service mapea si hiciera falta
//         fotoBlob: this.fotoBlob!
//       });
  
//       // QR subido por el service
//       this.qrText = res.qr_text;
//       this.qrDataUrl = res.qr_img_url;
//       this.qrPublicUrl = res.qr_img_url;
//       this.lastMesaId = res.id;
  
//       // Nombre de archivo = mesa-<n>.png (si el payload trae 'n')
//       this.qrFileName = 'mesa-qr.png';
//       try {
//         const payload = JSON.parse(res.qr_text); // { t, id, n }
//         this.lastMesaNumero = Number(payload?.n);
//         if (this.lastMesaNumero) {
//           this.qrFileName = `mesa-${this.lastMesaNumero}.png`;
//         }
//       } catch {
//         // si no parsea, dejamos el nombre genérico
//       }
  
//       this.toast.success('Mesa creada correctamente. QR listo para descargar.');
  
//       // limpiar form (dejamos visible el QR)
//       this.numero = '' as any;
//       this.capacidad = '' as any;
//       this.tipo = 'estandar';
//       this.fotoPreview = null;
//       this.fotoBlob = null;
  
//     } catch (e: any) {
//       this.toast.error(e?.message || 'No se pudo crear la mesa.');
//     } finally {
//       this.guardando = false;
//     }
//   }
  
// }


import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonImg, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, save, download } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ToastrService } from 'ngx-toastr';
import { MesasService, MesaTipo } from 'src/app/services/mesas.service';

@Component({
  selector: 'app-alta-mesa',
  standalone: true,
  templateUrl: './alta-mesa.component.html',
  styleUrls: ['./alta-mesa.component.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonButton, IonImg, IonIcon
  ]
})
export class AltaMesaComponent {

  // Form
  numero: number | null = null;
  capacidad: number | null = null;
  tipo: MesaTipo | null = 'estandar';

  // Foto
  fotoPreview: string | null = null; // para mostrar en la UI (dataURL/local)
  private fotoBlob: Blob | null = null; // lo que subimos al bucket

  // Resultado
  qrDataUrl: string | null = null;   // para previsualización en la UI
  qrPublicUrl: string | null = null; // URL pública en Storage (mesas/qr/<id>.png)

  guardando = false;
  btnDisabled = true;

  // [PASO 3] Helper rápido de plataforma
  private isAndroid(): boolean { return Capacitor.getPlatform() === 'android'; }


  constructor(
    private toast: ToastrService,
    private mesas: MesasService
  ) {
    addIcons({ camera, save, download });
    this.updateBtnDisabled();
  }

  public updateBtnDisabled() {
    this.btnDisabled =
      !this.numero || this.numero <= 0 ||
      !this.capacidad || this.capacidad <= 0 ||
      !this.tipo ||
      !this.fotoBlob ||
      this.guardando;
  }

  private ok(msg: string)    { this.toast.success(msg, '', { positionClass: 'toast-center', timeOut: 2200 }); }
  private err(msg: string)   { this.toast.error(msg, 'Error', { positionClass: 'toast-center', timeOut: 3500 }); }
  private info(msg: string)  { this.toast.info(msg, '', { positionClass: 'toast-center', timeOut: 2500 }); }

  private isNative(): boolean { return Capacitor.isNativePlatform(); }

  // ===== Cámara =====
  // async tomarFoto() {
  //   try {
  //     // permisos en runtime
  //     await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

  //     const shot = await Camera.getPhoto({
  //       source: CameraSource.Camera,
  //       resultType: CameraResultType.Uri,  // obtenemos webPath
  //       quality: 60,                       // reduce peso
  //       correctOrientation: true,
  //       saveToGallery: false
  //     });

  //     if (!shot?.webPath) {
  //       this.err('No se obtuvo la foto.');
  //       return;
  //     }

  //     // Vista previa
  //     this.fotoPreview = shot.webPath;

  //     // Convertimos a Blob y comprimimos (máx 1024 px)
  //     const blob = await this.fetchAsBlob(shot.webPath);
  //     this.fotoBlob = await this.downscaleToJpeg(blob, 1024, 0.7);

  //     this.updateBtnDisabled();

  //   } catch (e: any) {
  //     console.warn('[cámara] cancelada/error:', e);
  //     if (String(e?.message || e).toLowerCase().includes('permission')) {
  //       this.err('Necesitamos permiso de cámara.');
  //     }
  //   }
  // }
  // [PASO 2] tomarFoto estable: Base64/DataURL + timeout + preview local
  async tomarFoto() {
    try {
      // Permisos (en Android 13+ igual los pide en runtime)
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

      // Timeout defensivo (12s)
      let shot = await this.getPhotoWithTimeout(12000, 'camera').catch(() => null);
      if (!shot && this.isAndroid()) {
        shot = await this.getPhotoWithTimeout(12000, 'photos').catch(() => null);
      }      
      if (!shot) {
        this.err('No se pudo capturar la imagen. Reintentá.');
        return;
      }

      // Armamos un dataURL para la UI y para generar el Blob
      const dataUrl =
        shot?.dataUrl
          ? shot.dataUrl
          : shot?.base64String
            ? `data:image/${shot.format || 'jpeg'};base64,${shot.base64String}`
            : null;

      if (!dataUrl) {
        this.err('No se obtuvo la foto.');
        return;
      }

      // Preview inmediato (sin tocar filesystem)
      this.fotoPreview = dataUrl;

      // Pasamos a Blob y (opcional) compactamos
      const rawBlob = await this.dataUrlToBlob(dataUrl);
      this.fotoBlob = await this.downscaleToJpeg(rawBlob, 1024, 0.72);
      
    // [PASO 3] Compactación “inteligente”:
    // - Si el archivo ya es liviano (< 350 KB) NO lo reescalamos (evita trabajo extra).
    // - En Android bajamos un poco más la calidad y el tamaño máximo.
      if (rawBlob.size < 350_000) {
        this.fotoBlob = rawBlob;
      } else {
        const maxSide = this.isAndroid() ? 900 : 1024;
        const quality = this.isAndroid() ? 0.6 : 0.72;
        this.fotoBlob = await this.downscaleToJpeg(rawBlob, maxSide, quality);
      }
      // Recalcular estado del botón
      this.updateBtnDisabled();

    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.includes('timeout')) {
        this.err('La cámara tardó demasiado. Reintentá.');
      } else if (msg.toLowerCase().includes('permission')) {
        this.err('Necesitamos permiso de cámara.');
      } else if (msg.includes('User cancelled')) {
        // silencio si canceló el prompt
      } else {
        console.warn('[cámara] error:', e);
        this.err('No se pudo tomar la foto.');
      }
    }
  }

  /** baja la URL (capacitor_file/http) a Blob */
  private async fetchAsBlob(url: string): Promise<Blob> {
    const res = await fetch(url);
    return await res.blob();
  }

  /**
   * Comprime una imagen a JPG. Máx ancho/alto = maxSide; quality 0..1
   */
  private async downscaleToJpeg(srcBlob: Blob, maxSide = 1024, quality = 0.7): Promise<Blob> {
    const img = await createImageBitmap(srcBlob);
    const { width, height } = this.fitRect(img.width, img.height, maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    const blob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b || srcBlob), 'image/jpeg', quality));
    try { /* @ts-ignore */ img.close?.(); } catch { /* noop */ }
    return blob;
  }

  private fitRect(w: number, h: number, maxSide: number) {
    if (w <= maxSide && h <= maxSide) return { width: w, height: h };
    const r = w > h ? maxSide / w : maxSide / h;
    return { width: Math.round(w * r), height: Math.round(h * r) };
  }


  // ===== Guardar =====
  // [CAMBIO PASO 3A] — versión real: llama al service (Edge Function) y pinta el QR
  async guardar() {
    if (this.btnDisabled) {
      this.err('Completá número, capacidad, tipo y foto.');
      return;
    }

    try {
      this.guardando = true;
      this.updateBtnDisabled();

      this.qrDataUrl = null;
      this.qrPublicUrl = null;

      console.debug('[alta-mesa] guardando...', {
        numero: this.numero, capacidad: this.capacidad, tipo: this.tipo,
        tieneFoto: !!this.fotoBlob
      });

      const res = await this.mesas.crearMesaViaFunction({
        numero: this.numero!,
        capacidad: this.capacidad!,
        tipo: this.tipo!,
        fotoBlob: this.fotoBlob!
      });

      console.debug('[alta-mesa] función respondió:', res);

      // URLs devueltas por la función
      this.qrPublicUrl = res.qr_img_url;

      // DataURL para descargar el PNG desde la UI
      try {
        this.qrDataUrl = await this.publicUrlToDataUrl(this.qrPublicUrl);
      } catch {
        this.qrDataUrl = this.qrPublicUrl; // fallback
      }
      this.ok(`Mesa #${res.numero} creada. QR listo.`);
      this.numero = null;
      this.capacidad = null;
      this.tipo = 'estandar';
      this.fotoPreview = null;
      this.fotoBlob = null;
      this.updateBtnDisabled();

    } catch (e: any) {
      console.error('[alta-mesa] guardar ERROR (función)', e);
      this.err(e?.message || 'No se pudo crear la mesa.');
    } finally {
      this.guardando = false;
      this.updateBtnDisabled();
    }
  }


  // Helper: de URL pública → dataURL (para que tu descargarQR baje un PNG embebido)
  private async publicUrlToDataUrl(url: string): Promise<string> {
    const resp = await fetch(url, { cache: 'no-store' });
    const blob = await resp.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  }
  

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise(resolve => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(blob);
    });
  }

  // Descargar QR que estás viendo en la UI
  // descargarQR() {
  //   if (!this.qrDataUrl) return;
  //   const a = document.createElement('a');
  //   a.href = this.qrDataUrl;
  //   a.download = `QR_mesa_${this.numero ?? ''}.png`;
  //   a.click();
  // }

  // Nuevo: reset para cargar otra mesa
  nuevaMesa() {
    this.numero = null;
    this.capacidad = null;
    this.tipo = 'estandar';
    this.fotoPreview = null;
    this.fotoBlob = null;
    this.qrDataUrl = null;
    this.qrPublicUrl = null;
    this.guardando = false;
    this.updateBtnDisabled();
  }

  // [PASO 2] Helper: pedir foto con timeout y usando Base64/DataURL
  // [PASO 3] Permite elegir origen: 'camera' | 'photos'
  private async getPhotoWithTimeout(ms = 12000, origin: 'camera' | 'photos' = 'camera') {
    const opt = {
      source: origin === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Base64, // estable; también sirve DataUrl
      quality: this.isAndroid() ? 50 : 55, // un toque más bajo en Android
      correctOrientation: true,
      saveToGallery: false,
    } as const;

    const p = Camera.getPhoto(opt);
    const timeout = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('timeout')), ms)
    );
    return Promise.race([p, timeout]) as ReturnType<typeof Camera.getPhoto>;
  }


  // [PASO 2] Helper: DataURL -> Blob (rápido y compatible)
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return await res.blob();
  }

}
