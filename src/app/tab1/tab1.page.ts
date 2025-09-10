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
} from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    FormsModule,
    CommonModule,
  ],
})
export class Tab1Page {
  constructor(private authS: SupabaseService) {}

  email: string = ''; 
  password: string = ''; 

  login() {
    this.authS
      .login(this.email, this.password)
      .then((res: any) => {
        const correo = res?.user?.email || this.email;
        console.log('User logged in:', res);
        alert('User logged in: ' + correo);
        this.email = '';
        this.password = '';
      })
      .catch((error: any) => {
        const msg = (error?.message || 'Error al iniciar sesión');
        alert('Error logging in: ' + msg);
        console.error('Error logging in:', error);
      });
  }
  
}
