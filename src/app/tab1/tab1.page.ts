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
import { FirestoreAuthService } from '../services/firestore-auth.service';

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
  constructor(private authS: FirestoreAuthService) {}

  email: string = ''; //franuleg@gmail.com
  password: string = ''; //franciscoH

  login() {
    this.authS
      .login(this.email, this.password)
      .then((user) => {
        console.log('User logged in:', user);
        alert('User logged in: ' + user.email);
        // Handle successful login here
      })
      .catch((error) => {
        alert('Error logging in: ' + error);
        console.error('Error logging in:', error);
        // Handle login error here
      });
  }
}
