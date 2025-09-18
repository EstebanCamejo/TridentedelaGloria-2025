// src/servicios/spinner.service.ts
// import { inject, Injectable } from '@angular/core';
// import { LoadingController, ToastController, ToastOptions } from '@ionic/angular';

// @Injectable({ providedIn: 'root' })
// export class SpinnerService {
//   private loadingCtrl = inject(LoadingController);
//   private toastCtrl = inject(ToastController);
//   private el?: HTMLIonLoadingElement;

//   constructor() {}

//   /** Compat: tu método original (si lo usan en otros lados) */
//   loading() {
//     return this.loadingCtrl.create({ spinner: 'circular' });
//   }

//   /** 👇 Mostrar spinner con TU icono girando */
//   async show(message = 'Iniciando sesión...') {
//     if (this.el) return; // ya visible
//     this.el = await this.loadingCtrl.create({
//       message,
//       cssClass: 'brand-loading',   // clase que dibuja el icono
//       spinner: null,               // ocultamos el nativo
//       backdropDismiss: false,
//       showBackdrop: true,
//       translucent: true,
//       duration: undefined,         // no se autocierra
//     });
//     await this.el.present();
//   }

//   /** 👇 Ocultar spinner */
//   async hide() {
//     if (!this.el) return;
//     await this.el.dismiss();
//     this.el = undefined;
//   }

//   // ===== Mensajes (tu método intacto) =====
//   async mostrarMensaje(opts: ToastOptions) {
//     const toast = await this.toastCtrl.create(opts);
//     toast.present();
//   }
// }
// src/servicios/spinner.service.ts
// src/servicios/spinner.service.ts
import { inject, Injectable } from '@angular/core';
import { LoadingController, ToastController, ToastOptions } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class SpinnerService {
  // Opcional: puedes borrar LoadingController si no lo usás
  spinner = inject(LoadingController);
  spinnerMensaje = inject(ToastController);

  loading() {                   // compat si en otro lado lo usan
    return this.spinner.create({ spinner: 'circular' });
  }

  async mostrarMensaje(opts: ToastOptions) {
    const toast = await this.spinnerMensaje.create(opts);
    toast.present();
  }
}
