import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, personAdd, restaurant, create , statsChart, addCircleOutline} from 'ionicons/icons';

@Component({
  selector: 'app-home-bartender-cocinero',
  standalone: true,
  imports: [IonHeader, CommonModule, IonContent, IonGrid, IonRow, IonCol, IonButton, IonIcon],
  templateUrl: './home-bartender-cocinero.component.html',
  styleUrls: ['./home-bartender-cocinero.component.scss']
})
export class HomeBartenderCocineroComponent {
  constructor(private router: Router) {
    addIcons({ addCircleOutline });
  }

  irAAgregarNuevoPlato() { this.router.navigate(['/bartender-cocinero/nuevo-plato']); }
  irAAgregarNuevaBebida() { this.router.navigate(['/bartender-cocinero/nueva-bebida']); }
}