import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-alta-usuario',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `<ion-content class="pa-4"><h2>Alta de usuarios</h2><p>TODO: dueño/supervisor crean empleados (maître, mozo, etc.).</p></ion-content>`
})
export class AltaUsuarioComponent {}
