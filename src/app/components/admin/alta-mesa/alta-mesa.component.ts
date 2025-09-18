import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonButton, IonIcon, IonImg
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, save, download } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AdminAltaMesaService, MesaTipo } from 'src/app/services/admin-alta-mesa.service';

@Component({
  selector: 'app-alta-mesa',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonButton, IonIcon, IonImg
  ],
  templateUrl: './alta-mesa.component.html',
})
export class AltaMesaComponent {
  numero!: number | string;
  capacidad!: number | string;
  tipo: MesaTipo = 'estandar';

  fotoPreview: string | null = null;
  fotoBlob: Blob | null = null;

  guardando = false;

  // Mostramos el QR que sube el service
  qrText: string | null = null;
  qrDataUrl: string | null = null;   // acá irá la URL pública del PNG
  qrPublicUrl: string | null = null;

  lastMesaNumero?: number;
  lastMesaId?: string;
  qrFileName = 'mesa-qr.png';
  
  constructor(
    private srv: AdminAltaMesaService,
    private toast: ToastrService
  ) { addIcons({ camera, save, download }); }

  async tomarFoto() {
    try {
      const { dataUrl, blob } = await this.srv.tomarFoto();
      this.fotoPreview = dataUrl;
      this.fotoBlob = blob;
    } catch {
      this.toast.error('No se pudo tomar la foto.');
    }
  }

  // async descargarQR() {
  //   const url = this.qrPublicUrl || this.qrDataUrl;
  //   if (!url) return;
  //   const resp = await fetch(url);
  //   const blob = await resp.blob();
  //   const objUrl = URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = objUrl;
  //   a.download = 'mesa-qr.png';
  //   a.click();
  //   URL.revokeObjectURL(objUrl);
  // }
  async descargarQR() {
    const url = this.qrPublicUrl || this.qrDataUrl;
    if (!url) return;
  
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = this.qrFileName || 'mesa-qr.png';
      a.click();
  
      URL.revokeObjectURL(objUrl);
    } catch {
      this.toast.error('No se pudo descargar el QR.');
    }
  }
  
  get formularioInvalido(): boolean {
    const n = Number(this.numero);
    const c = Number(this.capacidad);
    return !n || !c || c < 1 || c > 12 || !this.fotoBlob;
  }

  // async guardar() {
  //   if (this.formularioInvalido) {
  //     this.toast.error('Completá todos los datos y tomá la foto de la mesa.');
  //     return;
  //   }

  //   try {
  //     this.guardando = true;

  //     const numero = Number(this.numero);
  //     const capacidad = Number(this.capacidad);

  //     const libre = await this.srv.numeroDisponible(numero);
  //     if (!libre) {
  //       this.toast.error('El número de mesa ya existe.');
  //       return;
  //     }

  //     const res = await this.srv.crearMesa({
  //       numero,
  //       capacidad,
  //       tipo: this.tipo,       // el service mapea si hiciera falta
  //       fotoBlob: this.fotoBlob!
  //     });

  //     this.qrText = res.qr_text;
  //     this.qrDataUrl = res.qr_img_url;   // mostramos el PNG subido
  //     this.qrPublicUrl = res.qr_img_url;
  //     this.lastMesaId = res.id;

  //     this.toast.success('Mesa creada correctamente. QR listo para descargar.');

  //     // limpiar form (dejamos visible el QR)
  //     this.numero = '' as any;
  //     this.capacidad = '' as any;
  //     this.tipo = 'estandar';
  //     this.fotoPreview = null;
  //     this.fotoBlob = null;

  //   } catch (e: any) {
  //     this.toast.error(e?.message || 'No se pudo crear la mesa.');
  //   } finally {
  //     this.guardando = false;
  //   }
  // }
  async guardar() {
    if (this.formularioInvalido) {
      this.toast.error('Completá todos los datos y tomá la foto de la mesa.');
      return;
    }
  
    try {
      this.guardando = true;
  
      const numero = Number(this.numero);
      const capacidad = Number(this.capacidad);
  
      const libre = await this.srv.numeroDisponible(numero);
      if (!libre) {
        this.toast.error('El número de mesa ya existe.');
        return;
      }
  
      const res = await this.srv.crearMesa({
        numero,
        capacidad,
        tipo: this.tipo,      // el service mapea si hiciera falta
        fotoBlob: this.fotoBlob!
      });
  
      // QR subido por el service
      this.qrText = res.qr_text;
      this.qrDataUrl = res.qr_img_url;
      this.qrPublicUrl = res.qr_img_url;
      this.lastMesaId = res.id;
  
      // Nombre de archivo = mesa-<n>.png (si el payload trae 'n')
      this.qrFileName = 'mesa-qr.png';
      try {
        const payload = JSON.parse(res.qr_text); // { t, id, n }
        this.lastMesaNumero = Number(payload?.n);
        if (this.lastMesaNumero) {
          this.qrFileName = `mesa-${this.lastMesaNumero}.png`;
        }
      } catch {
        // si no parsea, dejamos el nombre genérico
      }
  
      this.toast.success('Mesa creada correctamente. QR listo para descargar.');
  
      // limpiar form (dejamos visible el QR)
      this.numero = '' as any;
      this.capacidad = '' as any;
      this.tipo = 'estandar';
      this.fotoPreview = null;
      this.fotoBlob = null;
  
    } catch (e: any) {
      this.toast.error(e?.message || 'No se pudo crear la mesa.');
    } finally {
      this.guardando = false;
    }
  }
  
}
