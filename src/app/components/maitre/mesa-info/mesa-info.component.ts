import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonBadge, IonButton, IonImg } from '@ionic/angular/standalone';
import { MesasService, MesaRow } from 'src/app/services/mesas.service';

@Component({
  selector: 'app-mesa-info',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonBadge, IonButton, IonImg],
  templateUrl: './mesa-info.component.html',
})
export class MesaInfoComponent implements OnInit {
  mesa?: MesaRow;
  cargando = true;

  constructor(private route: ActivatedRoute, private mesas: MesasService) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      this.mesa = await this.mesas.getMesaById(id);
    } finally {
      this.cargando = false;
    }
  }
}
