// import { Component } from '@angular/core';
// import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
// import { ToastrModule } from 'ngx-toastr';
// import { CommonModule } from '@angular/common';
// import { SplashScreen } from '@capacitor/splash-screen';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'], // 👈 Asegurate de tener este styleUrls
//   imports: [
//     IonApp,
//     IonRouterOutlet,
//     ToastrModule,
//     CommonModule,
//   ],
// })
// export class AppComponent {
//   constructor(private router: Router) {}
//   showSplash = true;

//   ngOnInit() {
//     setTimeout(() => {
//       this.showSplash = false;
//       this.router.navigateByUrl('/login'); // redirige al login
//     }, 3000);
//   }
// }
// import { Component, OnDestroy, OnInit } from '@angular/core';
// import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
// import { ToastrModule } from 'ngx-toastr';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import { App } from '@capacitor/app';
// import type { PluginListenerHandle } from '@capacitor/core';
// import { App as CapacitorApp } from '@capacitor/app'; // v5
// import { AppAudioService } from './services/app-audio.service';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'],
//   imports: [IonApp, IonRouterOutlet, ToastrModule, CommonModule],
// })
// export class AppComponent implements OnInit, OnDestroy {
//   showSplash = true;

//   /** Timer del splash y handle del listener para limpiarlos en OnDestroy */
//   private splashTimer?: any;
//   private appUrlOpenSub?: PluginListenerHandle;
//   /** Marca si ya manejamos un deep link para no pisar con el splash */
//   private handledDeepLink = false;
//     private removeBackHandler?: () => void;
//   private removeStateHandler?: () => void;

//   constructor(private router: Router,private audio: AppAudioService) {}

//   ngOnInit() {
//     // 1) Listener de deep link: tridentegloria://open
//     App.addListener('appUrlOpen', ({ url }) => {
//       try {
//         // Ej: tridentegloria://open?tab=home  -> podés parsear si querés
//         const _u = new URL(url);
//       } catch {
//         /* noop */
//       }
//       this.handledDeepLink = true;
//       this.showSplash = false;
//       // Navegá a donde quieras abrir la app (ajustá la ruta si es otra)
//       this.router.navigateByUrl('/home', { replaceUrl: true });
//     }).then((h) => (this.appUrlOpenSub = h));

//     // 2) Splash: si NO hubo deep link en 3s, vamos a /login
//     this.splashTimer = setTimeout(() => {
//       if (!this.handledDeepLink) {
//         this.showSplash = false;
//         this.router.navigateByUrl('/login');
//       }
//     }, 3000);
//   }

//   ngOnDestroy(): void {
//     if (this.splashTimer) clearTimeout(this.splashTimer);
//     this.appUrlOpenSub?.remove?.();
//   }
// }
// import { Component, OnDestroy, OnInit } from '@angular/core';
// import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
// import { ToastrModule } from 'ngx-toastr';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import { App } from '@capacitor/app';
// import type { PluginListenerHandle } from '@capacitor/core';
// import { AppAudioService } from './services/app-audio.service';
// import { Capacitor } from '@capacitor/core';
// import { SupabaseService } from './services/supabase.service';


// const isAndroidNative = () =>
//   Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'],
//   imports: [IonApp, IonRouterOutlet, ToastrModule, CommonModule],
// })
// export class AppComponent implements OnInit, OnDestroy {
//   showSplash = true;
//   private unsubAuth?: () => void;
//   private splashTimer?: any;
//   private appUrlOpenSub?: PluginListenerHandle;

//   // Sonidos: handles para limpiar
//   private removeBackHandler?: () => void;
//   private removeStateHandler?: () => void;

//   private handledDeepLink = false;

//   constructor( private supabase: SupabaseService,private router: Router, private audio: AppAudioService) {}

//   async ngOnInit(): Promise<void> {
//     /* ===== Sonidos SOLO en Android nativo ===== */
//     if (isAndroidNative()) {
//       await this.audio.preload('start', 'assets/sonidos/iniciarApp.mp3', 1.0);
//       await this.audio.preload('close', 'assets/sonidos/cerrarApp.mp3', 1.0);

//       // Suena al abrir y al volver a foreground
//       this.removeStateHandler = (await App.addListener('appStateChange', ({ isActive }) => {
//         if (isActive) this.audio.play('start');
//         // si querés al ir a background: else this.audio.play('close');
//       })).remove;

//       // Android: botón atrás para “cerrar” la app → sonar y salir
//       this.removeBackHandler = (await App.addListener('backButton', ({ canGoBack }) => {
//         if (!canGoBack) {
//           this.audio.play('close').then(() => App.exitApp());
//         }
//       })).remove;

//       // Primer sonido al arrancar
//       this.audio.play('start');
//     }

//     /* ===== Deep link + Splash (sin cambios) ===== */
//     App.addListener('appUrlOpen', ({ url }) => {
//       try { const _u = new URL(url); void _u; } catch {}
//       this.handledDeepLink = true;
//       this.showSplash = false;
//       this.router.navigateByUrl('/home', { replaceUrl: true });
//     }).then((h) => (this.appUrlOpenSub = h));

//     this.splashTimer = setTimeout(() => {
//       if (!this.handledDeepLink) {
//         this.showSplash = false;
//         this.router.navigateByUrl('/login');
//       }
//     }, 3000);

//     this.unsubAuth = this.supabase.onAuthChange((event) => {
//       if (event === 'SIGNED_OUT') {
//         this.audio.play('close');  // solo sonará en Android nativo por tu AppAudioService
//       }
//     });
//   }

//   ngOnDestroy(): void {
//     if (this.splashTimer) clearTimeout(this.splashTimer);
//     this.appUrlOpenSub?.remove?.();
//     this.removeBackHandler?.();
//     this.removeStateHandler?.();
//        this.unsubAuth?.();
//   }
// }
// import { Component, OnDestroy, OnInit } from '@angular/core';
// import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
// import { ToastrModule, ToastrService } from 'ngx-toastr';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import { App } from '@capacitor/app';
// import type { PluginListenerHandle } from '@capacitor/core';
// import { AppAudioService } from './services/app-audio.service';
// import { Capacitor } from '@capacitor/core';
// import { SupabaseService } from './services/supabase.service';
// import { HapticsService } from './services/haptics.service';   
// import { NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
// import { Subscription } from 'rxjs';
// import { SpinnerService } from './services/spinner.service';

// const isAndroidNative = () =>
//   Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'],
//   imports: [IonApp, IonRouterOutlet, ToastrModule, CommonModule],
// })
// export class AppComponent implements OnInit, OnDestroy {
//   private navSub?: Subscription;
//   showSplash = true;
//   private unsubAuth?: () => void;
//   private splashTimer?: any;
//   private appUrlOpenSub?: PluginListenerHandle;

//   // Sonidos: handles para limpiar
//   private removeBackHandler?: () => void;
//   private removeStateHandler?: () => void;

//   private handledDeepLink = false;

//   // 👇 Handlers globales para limpiar luego
//   private onWindowError = (_ev: ErrorEvent) => { this.haptics.error(); };
//   private onUnhandledRejection = (_ev: PromiseRejectionEvent) => { this.haptics.error(); };

//   constructor(
//     private supabase: SupabaseService,
//     private router: Router,
//     private audio: AppAudioService,
//     private haptics: HapticsService,           
//     private toastr: ToastrService,
//      public spinner: SpinnerService           
//   ) {}
// public spinnerVisible$ = this.spinner.visible$;
//   async ngOnInit(): Promise<void> {
//     this.navSub = this.router.events.subscribe(ev => {
//       if (ev instanceof NavigationStart) {
//         this.spinner.show({ immediate: true, minMs: 500 }); // visible en celular sin parpadeo
//       } else if (ev instanceof NavigationEnd || ev instanceof NavigationCancel || ev instanceof NavigationError) {
//         this.spinner.hide();
//       }
//     });
//     /* ===== Sonidos SOLO en Android nativo ===== */
//     if (isAndroidNative()) {
//       await this.audio.preload('start', 'assets/sonidos/iniciarApp.mp3', 1.0);
//       await this.audio.preload('close', 'assets/sonidos/cerrarApp.mp3', 1.0);

//       this.removeStateHandler = (await App.addListener('appStateChange', ({ isActive }) => {
//         if (isActive) this.audio.play('start');
//       })).remove;

//       this.removeBackHandler = (await App.addListener('backButton', ({ canGoBack }) => {
//         if (!canGoBack) {
//           this.audio.play('close').then(() => App.exitApp());
//         }
//       })).remove;

//       this.audio.play('start');
//     }

//     /* ===== Vibración: hookeamos los toasts y errores globales ===== */
//     // 1) Cualquier this.toastr.error(...) ahora vibra automáticamente
//     const originalError = this.toastr.error.bind(this.toastr);
//     (this.toastr as any).error = (...args: any[]) => {
//       this.haptics.error();              // vibración (solo Android nativo por dentro del service)
//       return originalError(...args);
//     };

//     // (opcional) también warning:
//     const originalWarning = this.toastr.warning.bind(this.toastr);
//     (this.toastr as any).warning = (...args: any[]) => {
//       this.haptics.warn();
//       return originalWarning(...args);
//     };

//     // 2) Errores JS y promesas sin catch
//     window.addEventListener('error', this.onWindowError);
//     window.addEventListener('unhandledrejection', this.onUnhandledRejection);

//     /* ===== Deep link + Splash ===== */
//     App.addListener('appUrlOpen', ({ url }) => {
//       try { const _u = new URL(url); void _u; } catch {}
//       this.handledDeepLink = true;
//       this.showSplash = false;
//       this.router.navigateByUrl('/home', { replaceUrl: true });
//     }).then((h) => (this.appUrlOpenSub = h));

//     this.splashTimer = setTimeout(() => {
//       if (!this.handledDeepLink) {
//         this.showSplash = false;
//         this.router.navigateByUrl('/login');
//       }
//     }, 3000);

//     // Sonido de logout global
//     this.unsubAuth = this.supabase.onAuthChange((event) => {
//       if (event === 'SIGNED_OUT') {
//         this.audio.play('close');
//       }
//     });
//   }

//   ngOnDestroy(): void {
//     if (this.splashTimer) clearTimeout(this.splashTimer);
//     this.appUrlOpenSub?.remove?.();
//     this.removeBackHandler?.();
//     this.removeStateHandler?.();
//     this.unsubAuth?.();
//      this.navSub?.unsubscribe();

//     window.removeEventListener('error', this.onWindowError);
//     window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
//   }
// }
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet} from '@ionic/angular/standalone';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { AppAudioService } from './services/app-audio.service';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from './services/supabase.service';
import { HapticsService } from './services/haptics.service';
import { NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { SpinnerService } from './services/spinner.service';
import { StatusBar, Style } from '@capacitor/status-bar';

const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, ToastrModule, CommonModule],
})
export class AppComponent implements OnInit, OnDestroy {
  private navSub?: Subscription;
  showSplash = true;
  private unsubAuth?: () => void;
  private splashTimer?: any;
  private appUrlOpenSub?: PluginListenerHandle;

  // Sonidos: handles para limpiar
  private removeBackHandler?: () => void;
  private removeStateHandler?: () => void;

  private handledDeepLink = false;

  // ⬇️ NUEVO: control del spinner entre rutas
  private routeSpinnerEnabled = false; // se habilita recién cuando termina el splash
  private ignoreNextNav = false;       // ignora la 1ª navegación post-splash

  // Handlers globales para limpiar luego
  private onWindowError = (_ev: ErrorEvent) => { this.haptics.error(); };
  private onUnhandledRejection = (_ev: PromiseRejectionEvent) => { this.haptics.error(); };

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private audio: AppAudioService,
    private haptics: HapticsService,
    private toastr: ToastrService,
    public spinner: SpinnerService
  ) {}
public spinnerVisible$ = this.spinner.visible$;
  async ngOnInit(): Promise<void> {
    // ===== Spinner entre rutas (habilitado recién post-splash) =====
    this.navSub = this.router.events.subscribe(ev => {
      if (!this.routeSpinnerEnabled) return; // bloquea durante el splash

      if (ev instanceof NavigationStart) {
        if (this.ignoreNextNav) {            // salta la primera navegación post-splash
          this.ignoreNextNav = false;
          return;
        }
        this.spinner.show({ immediate: true, minMs: 900 }); // más tiempo visible
      } else if (ev instanceof NavigationEnd || ev instanceof NavigationCancel || ev instanceof NavigationError) {
        this.spinner.hide();
      }
    });

    /* ===== Sonidos SOLO en Android nativo ===== */
    if (isAndroidNative()) {
      await this.audio.preload('start', 'assets/sonidos/iniciarApp.mp3', 1.0);
      await this.audio.preload('close', 'assets/sonidos/cerrarApp.mp3', 1.0);

      // this.removeStateHandler = (await App.addListener('appStateChange', ({ isActive }) => {
      //   if (isActive) this.audio.play('start');
      // })).remove;

      // this.removeBackHandler = (await App.addListener('backButton', ({ canGoBack }) => {
      //   if (!canGoBack) {
      //     this.audio.play('close').then(() => App.exitApp());
      //   }
      // })).remove;

      // this.audio.play('start');
       this.removeStateHandler = (await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) this.audio.playOnce('start');   // no sonará si ya sonó
      })).remove;

      this.removeBackHandler = (await App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          this.audio.play('close').then(() => App.exitApp());
        }
      })).remove;

      // ⬅️ toca solo una vez al arranque en frío
      await this.audio.playOnce('start');
    }

    /* ===== Vibración: hookeamos los toasts y errores globales ===== */
    const originalError = this.toastr.error.bind(this.toastr);
    (this.toastr as any).error = (...args: any[]) => {
      this.haptics.error();
      return originalError(...args);
    };
    const originalWarning = this.toastr.warning.bind(this.toastr);
    (this.toastr as any).warning = (...args: any[]) => {
      this.haptics.warn();
      return originalWarning(...args);
    };

    window.addEventListener('error', this.onWindowError);
    window.addEventListener('unhandledrejection', this.onUnhandledRejection);

    /* ===== Deep link + Splash ===== */
    App.addListener('appUrlOpen', ({ url }) => {
      try { const _u = new URL(url); void _u; } catch {}
      this.handledDeepLink = true;
      this.showSplash = false;

      // ⬇️ HABILITO spinner de rutas y salto la primera navegación (salida del splash)
      this.routeSpinnerEnabled = true;
      this.ignoreNextNav = true;

      this.router.navigateByUrl('/home', { replaceUrl: true });
    }).then((h) => (this.appUrlOpenSub = h));

    this.splashTimer = setTimeout(() => {
      if (!this.handledDeepLink) {
        this.showSplash = false;

        // ⬇️ HABILITO spinner de rutas y salto la primera navegación (salida del splash)
        this.routeSpinnerEnabled = true;
        this.ignoreNextNav = true;

        this.router.navigateByUrl('/login');
      }
    }, 3000);

    // Sonido de logout global
    this.unsubAuth = this.supabase.onAuthChange((event) => {
      if (event === 'SIGNED_OUT') {
        this.audio.play('close');
      }
    });

     if (Capacitor.isNativePlatform()) {
    StatusBar.setOverlaysWebView({ overlay: false }); // <- clave
    StatusBar.setBackgroundColor({ color: '#5d2222' });
    StatusBar.setStyle({ style: Style.Light }); // texto claro
  }
  }

  ngOnDestroy(): void {
    if (this.splashTimer) clearTimeout(this.splashTimer);
    this.appUrlOpenSub?.remove?.();
    this.removeBackHandler?.();
    this.removeStateHandler?.();
    this.unsubAuth?.();
    this.navSub?.unsubscribe();

    window.removeEventListener('error', this.onWindowError);
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
  }
}
