import { Component } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { ExploreContainerComponent } from 'src/app/explore-container/explore-container.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from 'src/app/services/supabase.service';

import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    IonHeader,
    IonContent,
    FormsModule,
    CommonModule,
  ],
  standalone: true,
})
export class loginComponent {
   logoReady = false;

  constructor(
    private auths: SupabaseService,
    private router: Router,
    private toastr: ToastrService
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
  

  // login() {
  //   this.auths
  //     .login(this.email, this.password)
  //     .then((user) => {
  //       console.log('User logged in:', user);
  //       this.toastr.success('Sesión ingresada', '', {
  //       positionClass: 'toast-center'
  //     });
  //       this.email = '';
  //       this.password = '';
  //       this.router.navigate(['/home']);
  //     })
  //     .catch((error) => {
  //       this.toastr.error('Error logging in: ' + error.message);
  //       console.error('Error logging in:', error);
  //       // Handle login error here
  //     });
  // }

  login() {
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
}
  ionViewDidEnter() {
    // dispara en el primer frame para asegurar layout listo
    requestAnimationFrame(() => this.logoReady = true);
  }

  goToRegister() {
    console.log('Navigating to register page');
    this.router.navigate(['/register']);
  }

  fastLogin1() {
    this.email = 'eltridentedelagloria@gmail.com';
    this.password = '123456';
  }
  fastLogin2() {
    this.email = 'anonimo1@hotmail.com';
    this.password = 'anonimo1';
  }
  fastLogin3() {
    this.email = 'anonimo2@gmail.com';
    this.password = 'anonimo2';
  }
}
