import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cliente-pedido-en-curso',
  templateUrl: './cliente-pedido-en-curso.component.html',
  styleUrls: ['./cliente-pedido-en-curso.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class ClientePedidoEnCursoComponent implements OnInit {
  constructor(
  ) {}

  ngOnInit() {}

  confirmarPedido() {

  }
}
