import { Browser } from '@capacitor/browser';
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
import { logoFacebook } from 'ionicons/icons';
import { authService } from '../../services/facebook-auth.service';

import { SocialLogin } from '@capgo/capacitor-social-login';
import { AlertController } from '@ionic/angular';

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
  facebookLoginLoading = false;
  //cargando: boolean = false;
  
  email: string = ''; 
  password: string = ''; 

  constructor(
    private auths: SupabaseService,
    private router: Router,
    private toastr: ToastrService,
    private alertController: AlertController
     // private spinner: SpinnerService, 
  ) {}



  private getErrorMessage(error: any): string {
    const msg: string =
      (error && (error.message || error.error_description)) || '';
  
    if (/Invalid login credentials/i.test(msg)) {
      return 'Correo o contraseña incorrectos.';
    }
    if (/Email not confirmed/i.test(msg)) {
      return 'Debes confirmar tu correo antes de ingresar.';
    }
    if (/pendiente/i.test(msg)) {
      return 'Tu registro está pendiente de aprobación.';
    }
    if (/rechazado/i.test(msg)) {
      return 'Tu registro fue rechazado. Consultá al local.';
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
      'logo-facebook': logoFacebook,
    });
  
    // Animación del logo
    setTimeout(() => (this.logoReady = true), 10);

    console.log('Window location origin:', window.location.origin);
  }

  async login() {
    if (this.loading) return;
    this.loading = true;

    // Evita que el teclado quede abierto en mobile
    (document.activeElement as HTMLElement | null)?.blur?.();

    try {
      const email = this.email.trim();
      const password = this.password;
console.log('[1] Iniciando login con', { email });

      await this.auths.login(email, password);
console.log('Login OK');
      
//insert new
// 2) UID fresco (evita carreras con this.idUsuario)
    const { data: authUser, error: auErr } = await this.auths.client.auth.getUser();
     console.log('getSession =>');
    if (auErr) throw auErr;
    const uid = authUser?.user?.id;
    console.log(uid);
    if (!uid) throw new Error('No se obtuvo el UID luego del login.');

    // 3) INSERT directo en 'noAsignado'
      console.log('Intentando INSERT en lista_espera…');
    try {
      const { data: inserted, error: insErr } = await this.auths.client
        .from('lista_espera')
        .insert([{
          usuario_id: uid,
          cantidad_comensales: 2,     
          nota: null,
          estado: 'noAtendido',
          mesa_id: null,
          numero_mesa: null,
        }])
        .select('id, estado')
        .single();

      if (insErr) throw insErr;
      console.log('Inscripto a lista_espera:', inserted);
    } catch (e: any) {
      // Si tenés índice único de “una activa por usuario”, capturás 23505 y seguís
      if (e?.code === '23505') {
        console.warn('[lista_espera] ya tenía una activa, no inserto otra.');
      } else {
        console.warn('[lista_espera] insert falló (no bloquea login):', e);
      }
    }


      this.toastr.success('Sesión iniciada correctamente', '', {
        positionClass: 'toast-center',
        timeOut: 3000,
      });

      // limpiar campos antes de navegar
      this.email = '';
      this.password = '';

      await this.router.navigate(['/home']);
    } catch (error) {
      const msg = this.getErrorMessage(error);
      this.toastr.error(msg, 'Error', {
        positionClass: 'toast-center',
        closeButton: true,
        progressBar: true,
        timeOut: 4000,
      });
      console.error('[login] error:', error);
    } finally {
      this.loading = false;
    }
  }

  ionViewDidEnter() {
    // dispara en el primer frame para asegurar layout listo
    requestAnimationFrame(() => this.logoReady = true);
  }

  goToRegister() {  
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
  
  async handleFacebookLogin() {
    try {
      if (this.facebookLoginLoading) return;
      this.facebookLoginLoading = true;

      const user = await this.auths.signInWithFacebook();

      if (user == null) {
        return;
      }

      console.log('Signed in with Facebook:', user);

      console.log('Login Facebook OK');
      
      // 2) UID fresco (evita carreras con this.idUsuario)
      const { data: authUser, error: auErr } = await this.auths.client.auth.getUser();
      console.log('getSession =>', { data: authUser, error: auErr });
      if (auErr) throw auErr;
      const uid = authUser?.user?.id;
      console.log(uid);
      if (!uid) throw new Error('No se obtuvo el UID luego del login.');

      // 3) INSERT directo en 'noAsignado'
        console.log('Intentando INSERT en lista_espera…');
      try {
        const { data: inserted, error: insErr } = await this.auths.client
          .from('lista_espera')
          .insert([{
            usuario_id: uid,
            cantidad_comensales: 2,     
            nota: null,
            estado: 'noAtendido',
            mesa_id: null,
            numero_mesa: null,
          }])
          .select('id, estado')
          .single();

        if (insErr) throw insErr;
        console.log('Inscripto a lista_espera:', inserted);
      } catch (e: any) {
        // Si tenés índice único de “una activa por usuario”, capturás 23505 y seguís
        if (e?.code === '23505') {
          console.warn('[lista_espera] ya tenía una activa, no inserto otra.');
        } else {
          console.warn('[lista_espera] insert falló (no bloquea login):', e);
        }
      }


      this.toastr.success('Sesión iniciada correctamente', '', {
        positionClass: 'toast-center',
        timeOut: 3000,
      });

      // limpiar campos antes de navegar
      this.email = '';
      this.password = '';

      await this.router.navigate(['/home']);

    } catch (error: any) {

      if (error?.message === 'NO_REGISTRADO') {
        // Mostrar tu cartel personalizado
        await this.mostrarCartelUsuarioNoRegistrado();
        return;
      }

      const msg = this.getErrorMessage(error);
      this.toastr.error(msg, 'Error', {
        positionClass: 'toast-center',
        closeButton: true,
        progressBar: true,
        timeOut: 4000,
      });
      console.error('[login] error:', error);

    } finally {
      this.facebookLoginLoading = false;
    }
  }

  async mostrarCartelUsuarioNoRegistrado() {
    const alert = await this.alertController.create({
      header: 'Usuario no registrado',
      message: '  El ingreso con redes sociales es únicamente para usuarios ya registrados. Si sos cliente, registrate desde la opción "Registrarse" en la página de inicio. Si sos empleado, pedile a un administrador que te dé de alta como usuario en la aplicación.',
      buttons: [
        {
          text: 'Aceptar',
          role: 'confirm',
          cssClass: 'alert-button-confirm'
        }
      ],
      backdropDismiss: false, // evita que se cierre al tocar fuera del cartel
      cssClass: 'custom-alert' // para personalizar estilo si querés
    });

    await alert.present();
  }

}
