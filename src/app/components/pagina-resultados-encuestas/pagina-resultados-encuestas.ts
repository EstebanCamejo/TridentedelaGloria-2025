// src/app/components/pagina-resultados-encuestas/pagina-resultados-encuestas.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Ionic standalone (v7+)
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle,
  IonButton, IonSpinner
} from '@ionic/angular/standalone';

import { NgxChartsModule } from '@swimlane/ngx-charts';
import { EncuestasService, ChartItem } from 'src/app/services/encuestas.service';
import { Color, ScaleType } from '@swimlane/ngx-charts';



@Component({
  selector: 'app-pagina-resultados-encuestas',
  standalone: true,
  templateUrl: './pagina-resultados-encuestas.html',         // <<— ojo con el nombre
  styleUrls: ['./pagina-resultados-encuestas.scss'],         // <<— opcional
  imports: [
    CommonModule,
    // Ionic
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle,
    IonButton, IonSpinner,
    // Charts
    NgxChartsModule,
  ]
})
export class PaginaResultadosEncuestasPage implements OnInit {

  limpiezaData: ChartItem[] = [];
  aspectoValoradoData: ChartItem[] = [];
  serviciosExtraData: ChartItem[] = [];

  cargando = true;
  errorMsg: string | null = null;

colorScheme: Color = {
  name: 'tridente',
  selectable: true,
  group: ScaleType.Ordinal,
  domain: ['#5d2222', '#7b2f2f', '#9b4b4b', '#c27a7a', '#eadccd']
};

intFmt = (v: number | string) => `${Math.round(Number(v) || 0)}`;




  constructor(private encuestas: EncuestasService) {}

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando = true;
      this.errorMsg = null;
      const res = await this.encuestas.getResultados();
      this.limpiezaData = res.limpieza;
      this.aspectoValoradoData = res.aspecto_valorado;
      this.serviciosExtraData = res.servicios_extra;
    } catch (e: any) {
      console.error('[encuestas] cargarDatos ERROR', e);
      this.errorMsg = e?.message || 'No se pudieron cargar los resultados.';
    } finally {
      this.cargando = false;
    }
  }

  salir() {
    history.back();
  }
}
