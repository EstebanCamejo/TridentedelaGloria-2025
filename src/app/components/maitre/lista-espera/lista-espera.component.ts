// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import {
//   IonHeader, IonToolbar, IonTitle, IonContent,
//   IonList, IonItem, IonLabel, IonAvatar, IonBadge,
//   IonRefresher, IonRefresherContent, IonButton, IonIcon
// } from '@ionic/angular/standalone';
// import { addIcons } from 'ionicons';
// import { refresh } from 'ionicons/icons';
// import { AlertController, ToastController } from '@ionic/angular';
// import { MaitreWaitlistService, EsperaItem } from 'src/app/services/maitre-waitlist.service';

// @Component({
//   selector: 'app-lista-espera',
//   standalone: true,
//   imports: [
//     CommonModule,
//     IonHeader, IonToolbar, IonTitle, IonContent,
//     IonList, IonItem, IonLabel, IonAvatar, IonBadge,
//     IonRefresher, IonRefresherContent, IonButton, IonIcon
//   ],
//   templateUrl: './lista-espera.component.html',
// })
// export class ListaEsperaComponent {
//   loading = true;
//   items: EsperaItem[] = [];

//   constructor(
//     private svc: MaitreWaitlistService,
//     private alert: AlertController,
//     private toast: ToastController
//   ) {
//     addIcons({ refresh });
//   }

//   async ionViewWillEnter() { await this.load(); }

//   async load() {
//     this.loading = true;
//     try {
//       this.items = await this.svc.fetch();
//     } catch (e: any) {
//       this.msg(e?.message || 'No se pudo cargar la lista.', true);
//     } finally {
//       this.loading = false;
//     }
//   }

//   handleRefresh(ev: CustomEvent) {
//     this.load().finally(() => (ev.target as any).complete());
//   }

//   async atender(it: EsperaItem) {
//     const a = await this.alert.create({
//       header: 'Asignar mesa',
//       message: `Asignar mesa a <b>${it.nombre}</b>${it.cantidad_comensales ? ` (${it.cantidad_comensales})` : ''}`,
//       inputs: [{ name: 'mesa', type: 'number', placeholder: 'N° de mesa', min: 1 }],
//       buttons: [
//         { text: 'Cancelar', role: 'cancel' },
//         {
//           text: 'Asignar',
//           handler: async (vals: any) => {
//             const mesa = Number(vals?.mesa ?? 0);
//             if (!Number.isInteger(mesa) || mesa <= 0) {
//               this.msg('Ingresá un número de mesa válido.', true);
//               return false;
//             }
//             try {
//               await this.svc.assign(Number(it.id), mesa);
//               this.msg(`Mesa ${mesa} asignada a ${it.nombre}.`);
//               this.items = this.items.filter(x => x.id !== it.id);
//             } catch (e: any) {
//               this.msg(e?.message || 'No se pudo asignar la mesa.', true);
//               return false;
//             }
//             return true;
//           }
//         }
//       ]
//     });
//     await a.present();
//   }

//   trackById(_: number, it: EsperaItem) { return it.id; }

//   private async msg(message: string, error = false) {
//     const t = await this.toast.create({ message, duration: 1800, position: 'top', color: error ? 'danger' : 'success' });
//     t.present();
//   }
// }
// src/app/pages/maitre/lista-espera.component.ts
import { Component, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent,
  IonAvatar,
  IonRefresher, IonButton, IonIcon, IonCard
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refresh, reorderThreeOutline, chevronBackOutline, chevronForwardOutline, closeOutline, restaurantOutline } from 'ionicons/icons';
import { AlertController, ToastController, ActionSheetController ,ActionSheetButton} from '@ionic/angular';
import { SpinnerService } from 'src/app/services/spinner.service';
import { MaitreWaitlistService, EsperaItem, MesaLite } from 'src/app/services/maitre-waitlist.service';
import { MaitreRealtimeService } from 'src/app/services/maitre-realtime.service';
import { register } from 'swiper/element/bundle';

@Component({
  selector: 'app-lista-espera',
  standalone: true,
   styleUrls: ['./lista-espera.component.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonContent,
    IonAvatar, IonCard,
    IonRefresher, IonButton, IonIcon
  ],
  templateUrl: './lista-espera.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ListaEsperaComponent implements OnDestroy {
  loading = true;
  items: EsperaItem[] = [];
  mesasLibres: MesaLite[] = [];
  
  // Paginación
  currentSlide: number = 0;

  constructor(
    private svc: MaitreWaitlistService,
    private alert: AlertController,
    private toast: ToastController,
    private sheet: ActionSheetController,
    private spinner: SpinnerService,
    private maitreRt: MaitreRealtimeService
  ) {
    addIcons({ refresh, reorderThreeOutline, chevronBackOutline, chevronForwardOutline, closeOutline, restaurantOutline });
    register(); // Registrar Swiper
  }
    async ionViewWillEnter() {
    await this.maitreRt.init();   // 🔔 empieza a escuchar INSERTs
    await this.load();            // tu carga actual
  }

  ionViewWillLeave() {
    this.maitreRt.dispose();      // evita duplicados si salís de la vista
  }

  ngOnDestroy(): void {
    this.maitreRt.dispose();
  }



  async load(showSpinner = true) {
    this.loading = true;
    try {
      if (showSpinner) {
        this.spinner.show({ immediate: true });
      }
      const [espera, libres] = await Promise.all([
        this.svc.fetch(),
        this.svc.getFreeTables(),
      ]);
      this.items = espera;
      this.mesasLibres = libres;
    } catch (e: any) {
      this.msg((e?.message || 'NO SE PUDO CARGAR LA LISTA').toUpperCase(), true);
    } finally {
      this.loading = false;
      if (showSpinner) {
        this.spinner.hide();
      }
    }
  }

  handleRefresh(ev: CustomEvent) {
    this.load(false).finally(() => (ev.target as any).complete());
  }

  /** Prioridad = posición (1-based) en la lista actual */
  prioridadDe(it: EsperaItem) {
    return this.items.findIndex(x => x.id === it.id) + 1;
  }

  /** Abre un sheet con botones "Mesa N" (sólo libres) */
async atender(it: EsperaItem) {
  if (!this.mesasLibres.length) {
    this.msg('NO HAY MESAS LIBRES', true);
    return;
  }
  const prioridad = this.prioridadDe(it);

  // Crear action sheet con las mesas disponibles (igual que admin/reservas)
  const buttons: ActionSheetButton[] = [
    // Botón de cerrar (X) al inicio
    {
      text: '',
      role: 'cancel',
      icon: 'close-outline',
      cssClass: 'close-button'
    },
    // Mesas disponibles
    ...this.mesasLibres.map(m => ({
      text: `Mesa ${m.numero} (Capacidad: ${m.capacidad})`,
      icon: 'restaurant-outline',
      cssClass: 'mesa-button',
      handler: async () => {
        try {
          this.spinner.show({ immediate: true, minMs: 1000 });
          const numero = await this.svc.assignAtomic(it.id, m.id);
          this.items = this.items.filter(x => x.id !== it.id);
          this.mesasLibres = this.mesasLibres.filter(x => x.id !== m.id);
          this.msg(`MESA ${numero} ASIGNADA A ${it.nombre.toUpperCase()}`, false);
        } catch (e: any) {
          this.msg((e?.message || 'NO SE PUDO ASIGNAR LA MESA').toUpperCase(), true);
        } finally {
          this.spinner.hide();
        }
      }
    }))
  ];

  const actionSheet = await this.sheet.create({
    buttons: buttons,
    cssClass: 'mesas-action-sheet'
  });

  await actionSheet.present();
  }

  trackById(_: number, it: EsperaItem) { return it.id; }

  /** Obtiene solo el primer nombre del cliente */
  primerNombre(nombreCompleto: string): string {
    if (!nombreCompleto) return '';
    const partes = nombreCompleto.trim().split(/\s+/);
    return partes[0] || nombreCompleto;
  }

  // Métodos para manejar la paginación
  onSlideChange(event: any) {
    this.currentSlide = event.detail[0].activeIndex;
  }

  goToPrevious(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slidePrev();
    }
  }

  goToNext(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slideNext();
    }
  }

  private async msg(message: string, error = false) {
    const t = await this.toast.create({
      message: message.toUpperCase(),
      duration: 1800,
      position: 'middle',
      cssClass: 'toast-center',
      color: error ? 'danger' : 'success'
    });
    t.present();
  }

}
