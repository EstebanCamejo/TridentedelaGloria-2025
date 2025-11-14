import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';

@Component({
  selector: 'app-resultados-encuestas',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle],
  template: `
    <ion-header>
      <ion-toolbar style="--background: #5d2222; --color: #fff;">
        <ion-title style="text-align: center; font-weight: 700; text-transform: uppercase;">RESULTADOS DE ENCUESTAS</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="pa-4"><h2>NOTAS</h2><p>TODO: NOTAS SOBRE CLIENTES Y EMPLEADOS.</p></ion-content>
  `
})

export class ResultadosEncuestasComponent {}

