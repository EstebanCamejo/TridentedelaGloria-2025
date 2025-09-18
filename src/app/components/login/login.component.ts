import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { personCircle, glasses, footsteps, restaurant, beer, body } from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonLabel,
  IonItem,
  IonInput,
  IonCol,
  IonGrid,
  IonRow,
  IonFooter,
  IonButtons,
  IonIcon,
  IonFab,
  IonFabButton,
  IonFabList,
} from '@ionic/angular/standalone';
//import { ExploreContainerComponent } from 'src/app/explore-container/explore-container.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from 'src/app/services/supabase.service';

import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

//import { SpinnerService } from 'src/app/services/spinner.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    IonHeader,
    IonContent,
    FormsModule,
    CommonModule,    
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonFabList,
    FormsModule,
    CommonModule,
  ],
  standalone: true,
})
export class loginComponent {
   logoReady = false;
     loading = false; 
 cargando: boolean = false;
  constructor(
    private auths: SupabaseService,
    private router: Router,
    private toastr: ToastrService,
     // private spinner: SpinnerService, 
  ) {}

  email: string = ''; 
  password: string = ''; 

  private getErrorMessage(error: any): string {
    const msg: string =
      (error && (error.message || error.error_description)) || '';
  
    if (/Invalid login credentials/i.test(msg)) {
      return 'Correo o contraseña incorrectos.';
    }
    if (/Email not confirmed/i.test(msg)) {
      return 'Debes confirmar tu correo antes de ingresar.';
    }
    return 'Ha ocurrido un error al iniciar sesión. Inténtalo de nuevo.';
  }
  
  ngOnInit(): void {
    // Registrar íconos usados en el FAB
    addIcons({
      'person-circle': personCircle,
      glasses,
      footsteps,
      restaurant,
      beer,
      body,
    });
  
    // Animación del logo
    setTimeout(() => (this.logoReady = true), 10);
  }
  
  async login() {
  this.auths
    .login(this.email, this.password)
    .then((user) => {
      console.log('User logged in:', user);
      this.toastr.success('Sesión iniciada correctamente', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      this.email = '';
      this.password = '';
      this.router.navigate(['/home']);
    })
    .catch((error) => {
      const msg = this.getErrorMessage(error);
      this.toastr.error(msg, 'Error', {
        positionClass: 'toast-center',
        closeButton: true,
        progressBar: true,
        timeOut: 4000
      });
      console.error('Error logging in:', error);
    });
  if (this.loading) return;
  this.loading = true;

//   await this.spinner.show('Iniciando sesión...');

//   try {
//     const user = await this.auths.login(this.email, this.password);

//     // ⚠️ navega ANTES de ocultar (el overlay vive por encima del cambio de ruta)
//     await this.router.navigate(['/home']);

//     // ahora feedback
//     this.toastr.success('Sesión iniciada correctamente', '', { positionClass: 'toast-center', timeOut: 3000 });
//     this.email = ''; this.password = '';
//   } catch (error) {
//     const msg = this.getErrorMessage(error);
//     this.toastr.error(msg, 'Error', { positionClass: 'toast-center', closeButton: true, progressBar: true, timeOut: 4000 });
//     console.error('Error logging in:', error);
//   } finally {
//     await this.spinner.hide(350);   // deja que se vea un toque
//     this.loading = false;
//   }
  
}

// async login() {
//   if (this.loading) return;
//   this.loading = true;

//   (document.activeElement as HTMLElement | null)?.blur?.();
//   this.cargando = true;

//   // 🔦 Apagado de emergencia por si algo rompe antes del finally
//   const kill = setTimeout(() => {
//     if (this.cargando) {
//       console.warn('[login] failsafe: apagando spinner');
//       this.cargando = false;
//       this.loading = false;
//     }
//   }, 8000);

//   try {
//     const user = await this.auths.login(this.email, this.password);

//     this.toastr.success('Sesión iniciada correctamente', '', {
//       positionClass: 'toast-center',
//       timeOut: 3000,
//     });

//     this.email = '';
//     this.password = '';

//     // 👇 APAGA ANTES DE NAVEGAR (clave para que no quede “pegado”)
//     this.cargando = false;

//     await this.router.navigate(['/home']);
//   } catch (error) {
//     const msg = this.getErrorMessage(error);
//     this.toastr.error(msg, 'Error', {
//       positionClass: 'toast-center',
//       closeButton: true,
//       progressBar: true,
//       timeOut: 2000,
//     });
//     console.error('[login] error:', error);
//   } finally {
//     clearTimeout(kill);
//     this.cargando = false;   // doble seguridad
//     this.loading = false;
//     console.log('[login] finally: spinner OFF');
//   }
// }



  ionViewDidEnter() {
    // dispara en el primer frame para asegurar layout listo
    requestAnimationFrame(() => this.logoReady = true);
  }

  goToRegister() {
    console.log('Navigating to register page');
    this.router.navigate(['/register']);
  }
  private QUICK_LOGINS: Record<string, { email: string; password: string }> = {
    duenoSupervisor: { email: 'dueno@tridente.com',      password: 'dueno123' },
    maitre:          { email: 'maitre@tridente.com',     password: 'maitre123' },
    mozo:            { email: 'mozo@tridente.com',       password: 'mozo1234' },
    cocinero:        { email: 'cocinero@tridente.com',   password: 'cocinero123' },
    bartender:       { email: 'bartender@tridente.com',  password: 'bartender123' },
    cliente:         { email: 'cliente@tridente.com',    password: 'cliente123' },
  };

  private setCreds(role: keyof typeof this.QUICK_LOGINS) {
    const c = this.QUICK_LOGINS[role];
    this.email = c.email;
    this.password = c.password;
  }

  fastLoginDuenoSupervisor() { this.setCreds('duenoSupervisor'); }
  fastLoginMaitre()          { this.setCreds('maitre'); }
  fastLoginMozo()            { this.setCreds('mozo'); }
  fastLoginCocinero()        { this.setCreds('cocinero'); }
  fastLoginBartender()       { this.setCreds('bartender'); }
  fastLoginCliente()         { this.setCreds('cliente'); }

    
}
