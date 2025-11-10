import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonBadge, IonImg } from '@ionic/angular/standalone';
import { SpinnerService } from 'src/app/services/spinner.service';
import { MesasService, MesaRow } from 'src/app/services/mesas.service';

@Component({
  selector: 'app-mesa-info',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonBadge, IonImg],
  templateUrl: './mesa-info.component.html',
})
export class MesaInfoComponent implements OnInit {
  mesa?: MesaRow;
  cargando = true;

  constructor(
    private route: ActivatedRoute,
    private mesas: MesasService,
    private spinner: SpinnerService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      this.cargando = true;
      this.spinner.show({ immediate: true });
      this.mesa = await this.mesas.getMesaById(id);
    } finally {
      this.cargando = false;
      this.spinner.hide();
    }
  }

  estadoTexto(estado: string): string {
    switch (estado) {
      case 'libre': return 'LIBRE';
      case 'ocupada': return 'OCUPADA';
      case 'reservada': return 'RESERVADA';
      case 'bloqueada': return 'BLOQUEADA';
      default: return String(estado).toUpperCase();
    }
  }
}
