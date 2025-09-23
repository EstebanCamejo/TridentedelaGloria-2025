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
// src/app/services/spinner.service.ts
// import { Injectable, inject } from '@angular/core';
// import { LoadingController, ToastController, ToastOptions } from '@ionic/angular';

// @Injectable({ providedIn: 'root' })
// export class SpinnerService {
//   private loadingCtrl = inject(LoadingController);
//   private toastCtrl = inject(ToastController);

//   private overlay: HTMLIonLoadingElement | null = null;
//   private showing = false;

//   /**
//    * Muestra el spinner con tu icono girando.
//    * @param message Mensaje opcional (default: "Cargando...")
//    */
//   async show(message = 'Cargando...'): Promise<void> {
//   if (this.showing) return;
//   this.showing = true;

//   this.overlay = await this.loadingCtrl.create({
//     spinner: null,              // sin spinner nativo
//     cssClass: 'brand-loading',  // clase para estilado
//     backdropDismiss: false,
//     translucent: true,
//     keyboardClose: true,
//     message,                    // <— SOLO TEXTO
//     duration: undefined,
//   });

//   await this.overlay.present();
// }


//   /** Oculta el spinner si está visible. */
//   async hide(): Promise<void> {
//     if (!this.overlay) { this.showing = false; return; }
//     try {
//       await this.overlay.dismiss();
//     } catch { /* no-op */ }
//     this.overlay = null;
//     this.showing = false;
//   }

//   /** Helper: corre una promesa mostrando el spinner automáticamente. */
//   async run<T>(fn: () => Promise<T>, message = 'Cargando...'): Promise<T> {
//     await this.show(message);
//     try {
//       return await fn();
//     } finally {
//       await this.hide();
//     }
//   }

//   /** Toast simple reutilizable */
//   async mostrarMensaje(opts: ToastOptions) {
//     const t = await this.toastCtrl.create(opts);
//     await t.present();
//   }
// }
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type SpinnerOpts = { immediate?: boolean; minMs?: number };

@Injectable({ providedIn: 'root' })
export class SpinnerService {
  private _visible$ = new BehaviorSubject<boolean>(false);
  visible$ = this._visible$.asObservable();

  // evita parpadeo en rutas muy rápidas
  private minMs = 900;
  private timer?: any;
  private shownAt = 0;

  show(opts: SpinnerOpts = {}) {
    const min = opts.minMs ?? this.minMs;
    this.shownAt = Date.now();
    // immediate = pinta sin micro-retardo (útil para móviles)
    if (opts.immediate) {
      this._visible$.next(true);
    } else {
      // micro-retardo para no mostrar si la navegación resuelve “ya”
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this._visible$.next(true), 60);
    }
    this.minMs = min;
  }

  hide(force = false) {
    const elapsed = Date.now() - this.shownAt;
    const wait = Math.max(0, (force ? 0 : this.minMs) - elapsed);
    clearTimeout(this.timer);
    setTimeout(() => this._visible$.next(false), wait);
  }
}
