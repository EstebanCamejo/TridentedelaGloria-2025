import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-alta-mesa',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `<ion-content class="pa-4"><h2>Alta de mesa</h2><p>TODO: crear mesa + generar QR.</p></ion-content>`
})
export class AltaMesaComponent {}
