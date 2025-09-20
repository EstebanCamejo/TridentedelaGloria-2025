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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ToastrModule } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, ToastrModule, CommonModule],
})
export class AppComponent implements OnInit, OnDestroy {
  showSplash = true;

  /** Timer del splash y handle del listener para limpiarlos en OnDestroy */
  private splashTimer?: any;
  private appUrlOpenSub?: PluginListenerHandle;
  /** Marca si ya manejamos un deep link para no pisar con el splash */
  private handledDeepLink = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // 1) Listener de deep link: tridentegloria://open
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        // Ej: tridentegloria://open?tab=home  -> podés parsear si querés
        const _u = new URL(url);
      } catch {
        /* noop */
      }
      this.handledDeepLink = true;
      this.showSplash = false;
      // Navegá a donde quieras abrir la app (ajustá la ruta si es otra)
      this.router.navigateByUrl('/home', { replaceUrl: true });
    }).then((h) => (this.appUrlOpenSub = h));

    // 2) Splash: si NO hubo deep link en 3s, vamos a /login
    this.splashTimer = setTimeout(() => {
      if (!this.handledDeepLink) {
        this.showSplash = false;
        this.router.navigateByUrl('/login');
      }
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.splashTimer) clearTimeout(this.splashTimer);
    this.appUrlOpenSub?.remove?.();
  }
}
