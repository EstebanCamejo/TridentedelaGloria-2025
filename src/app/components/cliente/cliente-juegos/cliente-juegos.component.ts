import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { gameControllerOutline, helpCircleOutline, shapesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-cliente-juegos',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './cliente-juegos.component.html',
  styleUrls: ['./cliente-juegos.component.scss'],
})
export class ClienteJuegosComponent {
  constructor() {
    addIcons({ gameControllerOutline, helpCircleOutline, shapesOutline });
  }
}
