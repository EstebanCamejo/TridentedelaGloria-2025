import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonImg, IonInput, IonItem, IonLabel,
  IonSelect, IonSelectOption, IonTitle, IonToolbar, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, save } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ToastrService } from 'ngx-toastr';
import { MesasService, MesaTipo } from 'src/app/services/mesas.service';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-alta-mesa',
  standalone: true,
  templateUrl: './alta-mesa.component.html',
  styleUrls: ['./alta-mesa.component.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonButton, IonButtons, IonImg, IonIcon
  ],
  providers: [ModalController]
})
export class AltaMesaComponent implements OnInit {
  // ====== MODO (creación/edición) ======
  @Input() mesaId?: string;                 // si viene por modal
  private modalCtrl = inject(ModalController);
  private route = inject(ActivatedRoute);   // si se usa por ruta
  private router = inject(Router);

  // ====== Form ======
  numero: number | null = null;
  capacidad: number | null = null;
  tipo: MesaTipo | null = 'estandar';

  // Foto
  fotoPreview: string | null = null; // UI
  private fotoBlob: Blob | null = null; // a subir

  guardando = false;
  btnDisabled = true;

  private takingPhoto = false;
  private previewObjectUrl?: string; // para revocar el URL y evitar fugas
  private numeroOriginal: number | null = null; // para evitar editar número en edición

  constructor(
    private toast: ToastrService,
    private mesas: MesasService
  ) {
    addIcons({ camera, save });
    this.updateBtnDisabled();
  }

  // ====== INIT: decide modo ======
  ngOnInit() {
    const idRuta = this.route.snapshot.paramMap.get('id') || undefined;
    this.mesaId = this.mesaId ?? idRuta;

    if (this.mesaId) {
      // EDICIÓN
      this.cargarMesa(this.mesaId);
    } else {
      // CREACIÓN
      this.resetForm();
    }
  }

  // ====== UI helpers ======
  private isAndroid(): boolean { return Capacitor.getPlatform() === 'android'; }
  private ok(msg: string)  { this.toast.success(msg, '', { positionClass: 'toast-center', timeOut: 2000 }); }
  private err(msg: string) { this.toast.error(msg, 'Error', { positionClass: 'toast-center', timeOut: 3000 }); }

  public updateBtnDisabled() {
    this.btnDisabled =
      !this.numero || this.numero <= 0 ||
      !this.capacidad || this.capacidad <= 0 ||
      !this.tipo ||
      (!!this.mesaId ? false : !this.fotoBlob) || // en edición la foto puede ser opcional
      this.guardando;
  }

  // ====== FOTO ======
  // async tomarFoto() {
  //   try {
  //     await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

  //     let shot = await this.getPhotoWithTimeout(12000, 'camera').catch(() => null);
  //     if (!shot && this.isAndroid()) {
  //       shot = await this.getPhotoWithTimeout(12000, 'photos').catch(() => null);
  //     }
  //     if (!shot) { this.err('No se pudo capturar la imagen.'); return; }

  //     const dataUrl =
  //       shot?.dataUrl
  //         ? shot.dataUrl
  //         : shot?.base64String
  //           ? `data:image/${shot.format || 'jpeg'};base64,${shot.base64String}`
  //           : null;
  //     if (!dataUrl) { this.err('No se obtuvo la foto.'); return; }

  //     this.fotoPreview = dataUrl;

  //     const rawBlob = await this.dataUrlToBlob(dataUrl);
  //     if (rawBlob.size < 350_000) {
  //       this.fotoBlob = rawBlob;
  //     } else {
  //       const maxSide = this.isAndroid() ? 900 : 1024;
  //       const quality = this.isAndroid() ? 0.6 : 0.72;
  //       this.fotoBlob = await this.downscaleToJpeg(rawBlob, maxSide, quality);
  //     }
  //     this.updateBtnDisabled();
  //   } catch (e: any) {
  //     const msg = String(e?.message || e || '');
  //     if (msg.includes('timeout')) this.err('La cámara tardó demasiado.');
  //     else if (msg.toLowerCase().includes('permission')) this.err('Necesitamos permiso de cámara.');
  //     else if (!msg.includes('User cancelled')) this.err('No se pudo tomar la foto.');
  //   }
  // }

  async tomarFoto() {
    if (this.takingPhoto) return;
    this.takingPhoto = true;
    try {
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
  
      // Pedimos URI: más liviano que Base64/DataURL
      let shot = await this.getPhotoWithTimeout(12000, 'camera').catch(() => null);
      if (!shot && this.isAndroid()) {
        shot = await this.getPhotoWithTimeout(12000, 'photos').catch(() => null);
      }
      if (!shot || !shot.webPath) {
        this.err('No se pudo capturar la imagen.');
        return;
      }
  
      // Leemos el blob de la URI
      const rawBlob = await fetch(shot.webPath).then(r => r.blob());
  
      // Compactamos (máx lado + calidad más baja en Android)
      const maxSide  = this.isAndroid() ? 900 : 1024;
      const quality  = this.isAndroid() ? 0.6 : 0.72;
      const compact  = rawBlob.size < 350_000 ? rawBlob : await this.downscaleToJpeg(rawBlob, maxSide, quality);
      this.fotoBlob  = compact;
  
      // Preview: generamos un ObjectURL chiquito (y revocamos el anterior)
      if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = URL.createObjectURL(compact);
      this.fotoPreview = this.previewObjectUrl;
  
      this.updateBtnDisabled();
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.includes('timeout')) this.err('La cámara tardó demasiado. Reintentá.');
      else if (msg.toLowerCase().includes('permission')) this.err('Necesitamos permiso de cámara.');
      else if (!msg.includes('User cancelled')) this.err('No se pudo tomar la foto.');
    } finally {
      this.takingPhoto = false;
    }
  }
  

  // private async getPhotoWithTimeout(ms = 12000, origin: 'camera' | 'photos' = 'camera') {
  //   const opt = {
  //     source: origin === 'camera' ? CameraSource.Camera : CameraSource.Photos,
  //     resultType: CameraResultType.Base64,
  //     quality: this.isAndroid() ? 50 : 55,
  //     correctOrientation: true,
  //     saveToGallery: false,
  //   } as const;

  //   const p = Camera.getPhoto(opt);
  //   const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  //   return Promise.race([p, timeout]) as ReturnType<typeof Camera.getPhoto>;
  // }

  private async getPhotoWithTimeout(ms = 12000, origin: 'camera' | 'photos' = 'camera') {
    const opt = {
      source: origin === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Uri,   // << URI, NO base64
      quality: this.isAndroid() ? 50 : 55,
      correctOrientation: true,
      saveToGallery: false,
    } as const;
  
    const p = Camera.getPhoto(opt);
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
    return Promise.race([p, timeout]) as ReturnType<typeof Camera.getPhoto>;
  }
  


  // private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
  //   const res = await fetch(dataUrl);
  //   return await res.blob();
  // }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error || new Error('No se pudo leer la imagen'));
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(blob);
    });
  }

  // private async downscaleToJpeg(srcBlob: Blob, maxSide = 1024, quality = 0.7): Promise<Blob> {
  //   const img = await createImageBitmap(srcBlob);
  //   const { width, height } = this.fitRect(img.width, img.height, maxSide);
  //   const canvas = document.createElement('canvas');
  //   canvas.width = width; canvas.height = height;
  //   const ctx = canvas.getContext('2d')!;
  //   ctx.drawImage(img, 0, 0, width, height);
  //   const blob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b || srcBlob), 'image/jpeg', quality));
  //   try { /* @ts-ignore */ img.close?.(); } catch {}
  //   return blob;
  // }
  // private fitRect(w: number, h: number, maxSide: number) {
  //   if (w <= maxSide && h <= maxSide) return { width: w, height: h };
  //   const r = w > h ? maxSide / w : maxSide / h;
  //   return { width: Math.round(w * r), height: Math.round(h * r) };
  // }

  private async downscaleToJpeg(srcBlob: Blob, maxSide = 1024, quality = 0.7): Promise<Blob> {
    // Fallback robusto si createImageBitmap no está o falla
    const drawToCanvas = (img: HTMLImageElement | ImageBitmap, w: number, h: number) =>
      new Promise<Blob>((resolve) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;
        // @ts-ignore drawImage acepta ambos tipos
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(b => resolve(b || srcBlob), 'image/jpeg', quality);
      });
  
    try {
      // Intento 1: createImageBitmap (rápido cuando está)
      const bmp = await createImageBitmap(srcBlob);
      const { width, height } = this.fitRect(bmp.width, bmp.height, maxSide);
      const out = await drawToCanvas(bmp, width, height);
      try { /* @ts-ignore */ bmp.close?.(); } catch {}
      return out;
    } catch {
      // Intento 2: <img> + canvas (compatible en todos los WebView)
      const url = URL.createObjectURL(srcBlob);
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = url;
        });
        const { width, height } = this.fitRect(img.naturalWidth || img.width, img.naturalHeight || img.height, maxSide);
        return await drawToCanvas(img, width, height);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }
  
  /** Calcula el tamaño final manteniendo proporción (máx. lado = maxSide) */
  private fitRect(w: number, h: number, maxSide: number) {
    if (!w || !h) return { width: maxSide, height: maxSide };
    if (w <= maxSide && h <= maxSide) {
      return { width: w, height: h };
    }
    const r = w > h ? maxSide / w : maxSide / h;
    return { width: Math.round(w * r), height: Math.round(h * r) };
  }

  // ====== CRUD ======

  /** CREACIÓN (usa tu función actual) */
  private async crearMesa() {
    const res = await this.mesas.crearMesaViaFunction({
      numero: this.numero!, capacidad: this.capacidad!, tipo: this.tipo!,
      fotoBlob: this.fotoBlob!
    });
    this.ok(`Mesa #${res.numero} creada.`);
  }

  /** EDICIÓN (ajustá a los métodos reales de tu service si corresponde) */
  private async actualizarMesa(id: string) {
    await (this.mesas as any).actualizarMesa?.({
      id,
      numero: this.numero!,
      capacidad: this.capacidad!,
      tipo: this.tipo!,
      fotoBlob: this.fotoBlob || undefined
    });
    this.ok(`Mesa #${this.numero} actualizada.`);
  }

  /** CARGA para modo edición */
  private async cargarMesa(id: string) {
    try {
      const m = await (this.mesas as any).getMesaById?.(id);
      if (!m) return;
      
      this.numero = m.numero ?? null;
      this.numeroOriginal = m.numero ?? null; // guardo el original para evitar editar
      this.capacidad = m.capacidad ?? null;
      this.tipo = (m.tipo as MesaTipo) ?? 'estandar';
      this.fotoPreview = m.foto_url ?? null;  // si tu API devuelve URL
      this.fotoBlob = null;
      this.updateBtnDisabled();
    } catch { /* opcional: toast */ }
  }

  /** Limpia el form para crear */
  private resetForm() {
    this.numero = null;
    this.numeroOriginal = null;
    this.capacidad = null;
    this.tipo = 'estandar';
    this.fotoPreview = null;
    this.fotoBlob = null;
    this.guardando = false;
    this.updateBtnDisabled();
  }

  private info(msg: string) {
    this.toast.info(msg, '', { positionClass: 'toast-center', timeOut: 2200 });
  }
  

  /** Botón guardar (decide crear/actualizar) */
  // async guardar() {
  //   if (this.btnDisabled) { this.err('Completá número, capacidad, tipo y foto.'); return; }
  //   this.guardando = true; this.updateBtnDisabled();
  //   try {
  //     if (this.mesaId) await this.actualizarMesa(this.mesaId);
  //     else await this.crearMesa();
  //     console.log('[alta-mesa] voy a cerrar modal con role "saved"');
  //     // cerrar si es modal → MesasComponent refresca lista con role 'saved'
  //     try { await this.modalCtrl.dismiss(null, 'saved'); }
  //     catch {
  //       // si NO es modal, volvemos al listado
  //       this.router.navigateByUrl('/admin/mesas', { replaceUrl: true });
  //     }

  //     // si siguiera en pantalla, reseteamos
  //     this.resetForm();
  //   } catch (e: any) {
  //     this.err(e?.message || 'No se pudo guardar la mesa.');
  //   } finally {
  //     this.guardando = false; this.updateBtnDisabled();
  //   }
  // }
  async guardar() {
    if (this.mesaId && this.numero !== this.numeroOriginal) {
      this.info('El número de mesa no se puede editar. Eliminá y creá otra.');
      return;
    }
    if (this.btnDisabled) {
      this.err('Completá número, capacidad, tipo y foto.');
      return;
    }
    this.guardando = true;
    this.updateBtnDisabled();
  
    try {
      let mesaCreada: any = null;
  
      if (this.mesaId) {
        
        // MODO EDICIÓN → actualizás y listo
        await this.actualizarMesa(this.mesaId);
      } else {
        // MODO CREACIÓN → creamos y armamos el payload para el merge optimista
        // const res = await this.mesas.crearMesaViaFunction({
        //   numero: this.numero!, capacidad: this.capacidad!, tipo: this.tipo!,
        //   fotoBlob: this.fotoBlob!
        // });
  
        // mesaCreada = {
        //   id: res.id,
        //   numero: this.numero!,
        //   capacidad: this.capacidad!,
        //   tipo: this.tipo!,
        //   estado: 'libre',
        //   foto_url: this.fotoPreview ?? null,
        //   qr_text: res.qr_text ?? null,
        //   created_at: new Date().toISOString(),
        //   updated_at: new Date().toISOString(),
        // };
        // dentro de guardar(), rama de creación:
        const res = await this.mesas.crearMesaViaFunction({
          numero: this.numero!, capacidad: this.capacidad!, tipo: this.tipo!, fotoBlob: this.fotoBlob!
        });
        this.ok(`Mesa #${res.numero} creada.`);   // ← toast visible inmediato

        // cerrar modal con role 'saved' + payload optimista (si ya lo tenés, dejalo igual)
        const top = await this.modalCtrl.getTop();
        if (top) {
          await top.dismiss({ mesa: {
            id: res.id,
            numero: res.numero,
            capacidad: this.capacidad!,
            tipo: this.tipo!,
            estado: 'libre',
            foto_url: this.fotoPreview ?? null,
            qr_text: res.qr_text ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}, 'saved');
        } else {
          this.router.navigateByUrl('/admin/mesas', { replaceUrl: true });
        }

      }
  
      console.log('[alta-mesa] voy a cerrar modal con role "saved"');
  
      // Si está abierta como modal → cerramos con 'saved'
      const top = await this.modalCtrl.getTop();
      if (top) {
        await top.dismiss(mesaCreada ? { mesa: mesaCreada } : null, 'saved');
      } else {
        // Si NO es modal (ruta directa) → volvemos al listado
        this.router.navigateByUrl('/admin/mesas', { replaceUrl: true });
      }
  
      // Limpieza por si siguiera visible
      this.resetForm();
  
    } catch (e: any) {
      this.err(e?.message || 'No se pudo guardar la mesa.');
    } finally {
      this.guardando = false;
      this.updateBtnDisabled();
    }
  }
  
  
  cancelar() {
    try { this.modalCtrl.dismiss(null, 'cancel'); }
    catch { this.router.navigateByUrl('/admin/mesas'); }
  }
}
