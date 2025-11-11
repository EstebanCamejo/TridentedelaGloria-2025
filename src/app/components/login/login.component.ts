import { Browser } from '@capacitor/browser';
import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { personCircle, glasses, footsteps, restaurant, beer, body, bicycleOutline, peopleOutline } from 'ionicons/icons';
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
import { SpinnerService } from 'src/app/services/spinner.service';

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
    private alertController: AlertController,
    private spinner: SpinnerService,
  ) {}



  private getErrorMessage(error: any): string {
    const msg: string =
      (error && (error.message || error.error_description)) || '';
  
    if (/Invalid login credentials/i.test(msg)) {
      return 'CORREO O CONTRASEÑA INCORRECTOS';
    }
    if (/Email not confirmed/i.test(msg)) {
      return 'DEBES CONFIRMAR TU CORREO ANTES DE INGRESAR';
    }
    if (/pendiente/i.test(msg)) {
      return 'TU REGISTRO ESTÁ PENDIENTE DE APROBACIÓN';
    }
    if (/rechazado/i.test(msg)) {
      return 'TU REGISTRO FUE RECHAZADO. CONSULTÁ AL LOCAL';
    }
    return 'HA OCURRIDO UN ERROR AL INICIAR SESIÓN. INTENTALO DE NUEVO';
  }
  
  ngOnInit(): void {
    // Registrar íconos usados en los FABs
    addIcons({
      'person-circle': personCircle,
      glasses,
      footsteps,
      restaurant,
      beer,
      body,
      'bicycle-outline': bicycleOutline,
      'people-outline': peopleOutline,
      'logo-facebook': logoFacebook,
    });
  
    // Animación del logo
    setTimeout(() => (this.logoReady = true), 10);

    console.log('Window location origin:', window.location.origin);
  }

  async login() {
    if (this.loading) return;
    this.loading = true;
    this.spinner.show({ immediate: true });

    // Evita que el teclado quede abierto en mobile
    (document.activeElement as HTMLElement | null)?.blur?.();

    try {
      const email = this.email.trim();
      const password = this.password;
      console.log('[1] Iniciando login con', { email });

      await this.auths.login(email, password);
      console.log('Login OK');
      
      // 2) UID fresco (evita carreras con this.idUsuario)
      const { data: authUser, error: auErr } = await this.auths.client.auth.getUser();
      console.log('getSession =>');
      if (auErr) throw auErr;
      const uid = authUser?.user?.id;
      console.log(uid);
      if (!uid) throw new Error('No se obtuvo el UID luego del login.');

      // 3) INSERT directo en 'noAtendido' (solo para clientes, NO para repartidor u otros empleados)
      // 🆕 Verificar perfil del usuario antes de insertar en lista_espera
      try {
        const { data: usuario } = await this.auths.client
          .from('usuarios')
          .select('perfil')
          .eq('auth_id', uid)
          .maybeSingle();
        
        // Solo insertar en lista_espera si es cliente (registrado o anónimo)
        // NO insertar para repartidor, mozo, cocinero, etc.
        const esCliente = usuario?.perfil === 'clienteReg' || usuario?.perfil === 'clienteAnon';
        
        if (esCliente) {
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
            // Si tenés índice único de "una activa por usuario", capturás 23505 y seguís
            if (e?.code === '23505') {
              console.warn('[lista_espera] ya tenía una activa, no inserto otra.');
            } else {
              console.warn('[lista_espera] insert falló (no bloquea login):', e);
            }
          }
        } else {
          console.log('[login] Usuario no es cliente, saltando inserción en lista_espera. Perfil:', usuario?.perfil);
        }
      } catch (perfilError) {
        console.warn('[login] Error al verificar perfil (no bloquea login):', perfilError);
        // Si falla la verificación, no insertamos en lista_espera para evitar errores
      }

      this.toastr.success('SESIÓN INICIADA CORRECTAMENTE', '', {
        positionClass: 'toast-center',
        timeOut: 3000,
      });

      // limpiar campos antes de navegar
      this.email = '';
      this.password = '';

      await this.router.navigate(['/home']);
    } catch (error) {
      const msg = this.getErrorMessage(error);
      this.toastr.error(msg, '', {
        positionClass: 'toast-center',
        closeButton: true,
        progressBar: true,
        timeOut: 4000,
      });
      console.error('[login] error:', error);
    } finally {
      this.loading = false;
      this.spinner.hide();
    }
  }

  ionViewDidEnter() {
    // dispara en el primer frame para asegurar layout listo
    requestAnimationFrame(() => this.logoReady = true);
  }

  goToRegister() {  
    this.router.navigate(['/register']);
  }
  
  // Accesos directos para EMPLEADOS (FAB derecho)
  private EMPLOYEE_LOGINS: Record<string, { email: string; password: string }> = {
    duenoSupervisor: { email: 'dueno@tridente.com',      password: 'dueno123' },
    maitre:          { email: 'maitre@tridente.com',     password: 'maitre123' },
    mozo:            { email: 'mozo@tridente.com',       password: 'mozo1234' },
    cocinero:        { email: 'cocinero@tridente.com',   password: 'cocinero123' },
    bartender:       { email: 'bartender@tridente.com',  password: 'bartender123' },
    delivery:        { email: 'delivery1@test.com',      password: '12345678' },
  };

  // Accesos directos para CLIENTES (FAB izquierdo)
  private CLIENT_LOGINS: Record<string, { email: string; password: string }> = {
    // Clientes registrados
    clienteReg1:     { email: 'cliente1@test.com',       password: '12345678' },
    clienteReg2:     { email: 'cliente2@test.com',       password: '12345678' },
    clienteReg3:     { email: 'cliente3@test.com',       password: '12345678' },
    // Clientes anónimos
    clienteAnon1:    { email: 'anonimo1@test.com',       password: '12345678' },
    clienteAnon2:    { email: 'anonimo2@test.com',       password: '12345678' },
    clienteAnon3:    { email: 'anonimo3@test.com',       password: '12345678' },
  };

  // Métodos para EMPLEADOS (FAB derecho)
  private setEmployeeCreds(role: keyof typeof this.EMPLOYEE_LOGINS) {
    const c = this.EMPLOYEE_LOGINS[role];
    this.email = c.email;
    this.password = c.password;
  }

  fastLoginDuenoSupervisor() { this.setEmployeeCreds('duenoSupervisor'); }
  fastLoginMaitre()          { this.setEmployeeCreds('maitre'); }
  fastLoginMozo()            { this.setEmployeeCreds('mozo'); }
  fastLoginCocinero()        { this.setEmployeeCreds('cocinero'); }
  fastLoginBartender()       { this.setEmployeeCreds('bartender'); }
  fastLoginDelivery()        { this.setEmployeeCreds('delivery'); }

  // Métodos para CLIENTES (FAB izquierdo)
  private setClientCreds(role: keyof typeof this.CLIENT_LOGINS) {
    const c = this.CLIENT_LOGINS[role];
    this.email = c.email;
    this.password = c.password;
  }

  fastLoginClienteReg1()  { this.setClientCreds('clienteReg1'); }
  fastLoginClienteReg2()  { this.setClientCreds('clienteReg2'); }
  fastLoginClienteReg3()  { this.setClientCreds('clienteReg3'); }
  fastLoginClienteAnon1() { this.setClientCreds('clienteAnon1'); }
  fastLoginClienteAnon2() { this.setClientCreds('clienteAnon2'); }
  fastLoginClienteAnon3() { this.setClientCreds('clienteAnon3'); }
  
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
