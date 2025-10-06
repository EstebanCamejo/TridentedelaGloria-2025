import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { qrCode, list, personAdd } from 'ionicons/icons';
import { MaitreRealtimeService } from 'src/app/services/maitre-realtime.service';

@Component({
  selector: 'app-home-maitre',
  standalone: true,
  styleUrls: ['./home-maitre.component.scss'],
  imports: [
    CommonModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon
  ],
  templateUrl: './home-maitre.component.html',
})
export class HomeMaitreComponent implements OnInit, OnDestroy {
  constructor(private realtime: MaitreRealtimeService) {
    addIcons({ qrCode, list, personAdd });
  }
    ngOnInit(){ this.realtime.init(); }
  ngOnDestroy(){ this.realtime.dispose(); }
}
