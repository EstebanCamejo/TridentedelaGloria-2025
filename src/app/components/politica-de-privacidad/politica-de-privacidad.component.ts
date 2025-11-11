import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { IonContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-politica-de-privacidad',
  templateUrl: './politica-de-privacidad.component.html',
  styleUrls: ['./politica-de-privacidad.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class PoliticaDePrivacidadComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
