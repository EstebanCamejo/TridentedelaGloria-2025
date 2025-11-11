import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-resultados-encuestas',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `<ion-content class="pa-4"><h2>NOTAS</h2><p>TODO: NOTAS SOBRE CLIENTES Y EMPLEADOS.</p></ion-content>`
})

export class ResultadosEncuestasComponent {}

