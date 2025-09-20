import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { qrCode, list, personAdd } from 'ionicons/icons';

@Component({
  selector: 'app-home-maitre',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon
  ],
  templateUrl: './home-maitre.component.html',
})
export class HomeMaitreComponent {
  constructor() {
    addIcons({ qrCode, list, personAdd });
  }
}
