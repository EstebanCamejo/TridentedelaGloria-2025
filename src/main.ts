import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules, withHashLocation
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideToastr, ToastrModule } from 'ngx-toastr';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';

import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';

import { authService } from './app/services/facebook-auth.service';

registerLocaleData(localeEsAr);

registerLocaleData(localeEsAr);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideToastr({
      positionClass: 'toast-top-center',
      timeOut: 3000,
      preventDuplicates: true,
      closeButton: true,
    }),
    provideAnimations(),
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    { provide: LOCALE_ID, useValue: 'es-AR' }, 
    provideRouter(routes, withHashLocation()),// ESTEBAN
    /*provideFirebaseApp(() =>
      initializeApp({
        projectId: 'ionicapp-e1773',
        appId: '1:122367269467:web:f57efd57ba469a8c8a3d7e',
        storageBucket: 'ionicapp-e1773.firebasestorage.app',
        apiKey: 'AIzaSyBFxiVObjHYjqGan2wum0lJRXwfvNhGKeQ',
        authDomain: 'ionicapp-e1773.firebaseapp.com',
        messagingSenderId: '122367269467',
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),*/
  ],
});



async function initializeApp() {
  await authService.initializeSocialLogin();

  // Listen to auth state changes
  authService.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('User signed in:', session.user);
      // Redirect to authenticated area
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      // Redirect to login
    }
  });
}

initializeApp();


