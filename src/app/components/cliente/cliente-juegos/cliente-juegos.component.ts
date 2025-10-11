import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { gameControllerOutline, helpCircleOutline, shapesOutline } from 'ionicons/icons';
import { PedidosService, Pedido } from 'src/app/services/pedidos.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-cliente-juegos',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './cliente-juegos.component.html',
  styleUrls: ['./cliente-juegos.component.scss'],
})
export class ClienteJuegosComponent {
  // 👇 esto es lo que faltaba:
  pedidoActual$: Observable<Pedido | null> = this.pedidosSvc.pedidoActual$;

  constructor(private pedidosSvc: PedidosService) {
    addIcons({ gameControllerOutline, helpCircleOutline, shapesOutline });
  }
}
