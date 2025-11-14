import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonGrid, IonRow, IonCol, IonButton, IonIcon
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { personAdd, gridOutline } from 'ionicons/icons';

@Component({
  selector: 'app-altas',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonButton, IonIcon
  ],
  templateUrl: './altas.component.html',
  styleUrls: ['./altas.component.scss']
})
export class AltasComponent {
  constructor(private router: Router) {
    addIcons({ personAdd, gridOutline });
  }

  irAAltaUsuarios() {
    this.router.navigate(['/admin/alta-usuario']);
  }

  irAMesas() {
    this.router.navigate(['/admin/mesas']);
  }
}

