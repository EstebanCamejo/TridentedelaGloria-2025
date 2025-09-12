import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, personAdd, restaurant, create , statsChart} from 'ionicons/icons';

@Component({
  selector: 'app-home-admin',
  standalone: true,
  imports: [CommonModule, IonContent, IonGrid, IonRow, IonCol, IonButton, IonIcon],
  templateUrl: './home-admin.component.html',
  styleUrls: ['./home-admin.component.scss']
})
export class HomeAdminComponent {
  constructor(private router: Router) {
    addIcons({ checkmarkDoneCircle, personAdd, restaurant, statsChart });
  }

  irAListaDeEspera() { this.router.navigate(['/admin/pendientes']); }
  irAAltaUsuarios()  { this.router.navigate(['/admin/alta-usuario']); }
  irAAltaMesa()      { this.router.navigate(['/admin/alta-mesa']); }
  irAResultados() { this.router.navigate(['/admin/resultados-encuestas']); }
}
