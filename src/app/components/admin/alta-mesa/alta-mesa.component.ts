import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem,
  IonSelect, IonSelectOption, IonTitle, IonToolbar, IonIcon
} from '@ionic/angular/standalone';
import { ViewChild, ElementRef } from '@angular/core';
import { addIcons } from 'ionicons';
import { camera, save } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
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
    IonItem, IonInput, IonSelect, IonSelectOption,
    IonButton, IonButtons, IonIcon
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
  @ViewChild('fileInput', { static: false }) fileInput?: ElementRef<HTMLInputElement>;

  guardando = false;
  btnDisabled = true;

  private takingPhoto = false;
  private previewObjectUrl?: string; // para revocar el URL y evitar fugas
  private numeroOriginal: number | null = null; // para evitar editar número en edición

  constructor(
    private toast: ToastrService,
    private spinner: SpinnerService,
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
    
    // Centrar input de capacidad después de inicializar
    setTimeout(() => this.centrarInputCapacidad(), 300);
  }

  // ====== UI helpers ======
  private isAndroid(): boolean { return Capacitor.getPlatform() === 'android'; }
  private ok(msg: string)  { this.toast.success(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 2000 }); }
  private err(msg: string) { this.toast.error(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 3000 }); }

  public updateBtnDisabled() {
    this.btnDisabled =
      !this.numero || this.numero <= 0 ||
      !this.capacidad || this.capacidad <= 0 ||
      !this.tipo ||
      (!!this.mesaId ? false : !this.fotoBlob) || // en edición la foto puede ser opcional
      this.guardando;
    
    // Centrar el input de capacidad después de actualizar
    setTimeout(() => this.centrarInputCapacidad(), 50);
  }

  private centrarInputCapacidad() {
    const applyCentering = () => {
      const inputs = document.querySelectorAll('.item-capacidad input[type="number"], .item-numero input[type="number"]') as NodeListOf<HTMLInputElement>;
      inputs.forEach(input => {
        if (input) {
          input.style.setProperty('text-align', 'center', 'important');
          input.style.setProperty('text-align-last', 'center', 'important');
          input.style.setProperty('width', '100%', 'important');
          input.style.setProperty('margin', '0 auto', 'important');
          input.style.setProperty('padding', '0', 'important');
          input.style.setProperty('text-indent', '0', 'important');
          input.style.setProperty('direction', 'ltr', 'important');
        }
      });
    };

    setTimeout(applyCentering, 10);
    setTimeout(applyCentering, 50);
    setTimeout(applyCentering, 100);
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
    
    // Si es web/desktop, usar input file
    if (!Capacitor.isNativePlatform()) {
      this.fileInput?.nativeElement.click();
      return;
    }

    this.takingPhoto = true;
    try {
      const img = await Camera.getPhoto({
        source: CameraSource.Prompt,
        quality: 90,
        resultType: CameraResultType.Uri,
        correctOrientation: true,
        saveToGallery: false,
        promptLabelHeader: 'Foto',
        promptLabelPhoto: 'Elegir de la galería',
        promptLabelPicture: 'Tomar foto',
        promptLabelCancel: 'Cancelar',
      });

      if (img?.webPath) {
        // Leemos el blob de la URI
        const rawBlob = await fetch(img.webPath).then(r => r.blob());
  
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
      }
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (!msg.includes('User cancelled')) {
        this.err('NO SE PUDO TOMAR LA FOTO');
      }
    } finally {
      this.takingPhoto = false;
    }
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    // Leer el archivo como blob
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Convertir dataUrl a blob
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          this.fotoBlob = blob;
          // Preview
          if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
          this.previewObjectUrl = URL.createObjectURL(blob);
          this.fotoPreview = this.previewObjectUrl;
          this.updateBtnDisabled();
        });
    };
    reader.readAsDataURL(file);
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

  /** EDICIÓN (ajustá a los métodos reales de tu service si corresponde) */
  private async actualizarMesa(id: string) {
    await (this.mesas as any).actualizarMesaCampos?.({
      id,
      capacidad: this.capacidad!,
      tipo: this.tipo!,
      // fotoBlob se maneja por separado si es necesario
    });
    // NO mostrar mensaje aquí, se muestra en guardar()
  }

  /** CARGA para modo edición */
  private async cargarMesa(id: string) {
    try {
      console.log('[alta-mesa] Cargando mesa con ID:', id);
      if (!id) {
        console.error('[alta-mesa] ID de mesa es null o undefined');
        this.err('NO SE PUDO CARGAR LA MESA: ID INVÁLIDO');
        return;
      }
      
      const m = await this.mesas.getMesaById(id);
      console.log('[alta-mesa] Mesa cargada:', m);
      
      if (!m) {
        console.error('[alta-mesa] Mesa no encontrada para ID:', id);
        this.err('NO SE ENCONTRÓ LA MESA');
        return;
      }
      
      this.numero = m.numero ?? null;
      this.numeroOriginal = m.numero ?? null; // guardo el original para evitar editar
      this.capacidad = m.capacidad ?? null;
      this.tipo = (m.tipo as MesaTipo) ?? 'estandar';
      this.fotoPreview = m.foto_url ?? null;  // si tu API devuelve URL
      this.fotoBlob = null;
      this.updateBtnDisabled();
      
      // Centrar el input de capacidad después de cargar
      setTimeout(() => this.centrarInputCapacidad(), 200);
    } catch (e: any) {
      console.error('[alta-mesa] Error al cargar mesa:', e);
      this.err(e?.message || 'NO SE PUDO CARGAR LA MESA');
    }
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
    this.toast.info(msg.toUpperCase(), '', { positionClass: 'toast-center', timeOut: 2200 });
  }
  

  /** Botón guardar (decide crear/actualizar) */
  async guardar() {
    if (this.mesaId && this.numero !== this.numeroOriginal) {
      this.info('EL NÚMERO DE MESA NO SE PUEDE EDITAR. ELIMINÁ Y CREÁ OTRA');
      return;
    }
    if (this.btnDisabled) {
      this.err('COMPLETÁ NÚMERO, CAPACIDAD, TIPO Y FOTO');
      return;
    }
    
    // Evitar múltiples ejecuciones
    if (this.guardando) {
      return;
    }
    
    this.guardando = true;
    this.updateBtnDisabled();
    this.spinner.show({ immediate: true, minMs: 300 });
  
    try {
      let res: any = null;
      
      if (this.mesaId) {
        // MODO EDICIÓN
        await this.actualizarMesa(this.mesaId);
        this.ok(`MESA #${this.numero} ACTUALIZADA`);
      } else {
        // MODO CREACIÓN
        res = await this.mesas.crearMesaViaFunction({
          numero: this.numero!, 
          capacidad: this.capacidad!, 
          tipo: this.tipo!, 
          fotoBlob: this.fotoBlob!
        });
        this.ok(`MESA #${res.numero} CREADA`);
      }
      
      // Ocultar spinner INMEDIATAMENTE después de crear/actualizar
      this.spinner.hide(true); // force = true para ocultar sin esperar minMs
      
      // Limpiar estado ANTES de cerrar/navegar
      this.guardando = false;
      this.updateBtnDisabled();
      this.resetForm();
      
      // Cerrar modal (si es modal) o navegar (si es ruta directa)
      const top = await this.modalCtrl.getTop();
      if (top) {
        // Es modal → cerrar modal (el componente padre se encargará de la navegación)
        await top.dismiss(null, 'saved');
      } else {
        // Si NO es modal (ruta directa) → volvemos al panel del admin
        this.router.navigateByUrl('/home-admin', { replaceUrl: true });
      }
  
    } catch (e: any) {
      // Asegurar que el spinner se oculte incluso si hay error
      this.spinner.hide(true); // force = true
      this.guardando = false;
      this.updateBtnDisabled();
      this.err((e?.message || 'NO SE PUDO GUARDAR LA MESA').toUpperCase());
    }
  }
  
  
  cancelar() {
    try { this.modalCtrl.dismiss(null, 'cancel'); }
    catch { this.router.navigateByUrl('/admin/mesas'); }
  }

  getCapacidadPlaceholder(): string {
    return 'CAPACIDAD (1-12)';
  }

  getTipoDisplayText(): string {
    if (!this.tipo) return 'SELECCIONA UN TIPO';
    return 'TIPO: ' + this.tipoTexto(this.tipo);
  }

  tipoTexto(tipo: MesaTipo): string {
    switch (tipo) {
      case 'vip': return 'EXCLUSIVA';
      case 'estandar': return 'ESTÁNDAR';
      case 'mov_reducida': return 'MOVILIDAD REDUCIDA';
      default: return String(tipo).toUpperCase();
    }
  }

  onTipoSelectOpen() {
    // Aplicar estilos a los botones del popover después de que se abra
    setTimeout(() => {
      this.estilizarBotonesSelect();
    }, 100);
  }

  private estilizarBotonesSelect() {
    const applyStyles = () => {
      // Buscar el popover del select
      const selectors = [
        'ion-popover',
        '.select-popover',
        'ion-popover.select-popover'
      ];
      
      let popover: Element | null = null;
      for (const selector of selectors) {
        popover = document.querySelector(selector);
        if (popover) break;
      }
      
      if (!popover) return;
      
      // Buscar botones de acción (cancelar y confirmar)
      const buttonSelectors = [
        'ion-button[type="button"]',
        '.select-interface-option',
        'button'
      ];
      
      let buttons: NodeListOf<Element> | null = null;
      for (const selector of buttonSelectors) {
        buttons = popover.querySelectorAll(selector);
        if (buttons && buttons.length >= 2) break;
      }
      
      if (!buttons || buttons.length < 2) return;
      
      // Aplicar estilos a los botones
      buttons.forEach((btn: any, index: number) => {
        if (!btn || !btn.style) return;
        
        const buttonText = btn.textContent || btn.innerText || '';
        const isCancel = buttonText.includes('✗') || index === 0;
        const isConfirm = buttonText.includes('✓') || index === buttons.length - 1;
        
        if (isCancel || isConfirm) {
          btn.style.setProperty('width', 'calc(50% - 7.5px)', 'important');
          btn.style.setProperty('height', '100px', 'important');
          btn.style.setProperty('font-size', '64px', 'important');
          btn.style.setProperty('font-weight', '700', 'important');
          btn.style.setProperty('color', '#ffffff', 'important');
          btn.style.setProperty('display', 'flex', 'important');
          btn.style.setProperty('align-items', 'center', 'important');
          btn.style.setProperty('justify-content', 'center', 'important');
          btn.style.setProperty('flex', '1 1 50%', 'important');
          btn.style.setProperty('border-radius', '12px', 'important');
          btn.style.setProperty('box-shadow', '0 8px 16px rgba(0, 0, 0, 0.5)', 'important');
          btn.style.setProperty('margin', '0', 'important');
          
          if (isCancel) {
            btn.style.setProperty('background', '#dc3545', 'important');
            btn.style.setProperty('border', '4px solid #bd2130', 'important');
          } else if (isConfirm) {
            btn.style.setProperty('background', '#28a745', 'important');
            btn.style.setProperty('border', '4px solid #1e7e34', 'important');
          }
          
          const buttonInner = btn.querySelector('.button-inner') || btn.querySelector('span');
          if (buttonInner) {
            (buttonInner as HTMLElement).style.setProperty('font-size', '64px', 'important');
            (buttonInner as HTMLElement).style.setProperty('color', '#ffffff', 'important');
          }
        }
      });
      
      // Ajustar el contenedor de botones
      const buttonContainer = popover.querySelector('.select-interface-option')?.parentElement || 
                             popover.querySelector('ion-button')?.parentElement;
      if (buttonContainer) {
        (buttonContainer as HTMLElement).style.setProperty('display', 'flex', 'important');
        (buttonContainer as HTMLElement).style.setProperty('flex-direction', 'row', 'important');
        (buttonContainer as HTMLElement).style.setProperty('gap', '15px', 'important');
        (buttonContainer as HTMLElement).style.setProperty('width', '100%', 'important');
        (buttonContainer as HTMLElement).style.setProperty('padding', '20px', 'important');
      }
    };

    // Aplicar múltiples veces
    setTimeout(applyStyles, 50);
    setTimeout(applyStyles, 150);
    setTimeout(applyStyles, 300);
    setTimeout(applyStyles, 500);

    // MutationObserver
    const observer = new MutationObserver(() => {
      applyStyles();
    });

    setTimeout(() => {
      const popoverElement = document.querySelector('ion-popover');
      if (popoverElement) {
        observer.observe(popoverElement, {
          childList: true,
          subtree: true,
          attributes: true
        });
        
        setTimeout(() => {
          observer.disconnect();
        }, 2000);
      }
    }, 100);
  }
}
