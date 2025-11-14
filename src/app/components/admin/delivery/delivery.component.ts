import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonGrid, IonRow, IonCol, IonButton, IonIcon
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { bicycleOutline, receiptOutline } from 'ionicons/icons';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonButton, IonIcon
  ],
  templateUrl: './delivery.component.html',
  styleUrls: ['./delivery.component.scss']
})
export class DeliveryComponent {
  constructor(private router: Router) {
    addIcons({ bicycleOutline, receiptOutline });
  }

  irAPedidosRepartidor() {
    this.router.navigate(['/admin/delivery-pedidos']);
  }

  irAConfirmarPagos() {
    this.router.navigate(['/admin/delivery-confirmar-pago']);
  }
}

