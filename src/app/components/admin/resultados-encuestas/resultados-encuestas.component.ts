import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-resultados-encuestas',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `<ion-content class="pa-4"><h2>Notas</h2><p>TODO: notas sobre clientes y empleados.</p></ion-content>`
})

export class ResultadosEncuestasComponent {}

