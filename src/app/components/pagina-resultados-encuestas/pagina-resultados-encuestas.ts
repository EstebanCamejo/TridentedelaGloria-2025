// src/app/components/pagina-resultados-encuestas/pagina-resultados-encuestas.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Ionic standalone (v7+)
import {
  IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonSpinner
} from '@ionic/angular/standalone';

import { NgxChartsModule } from '@swimlane/ngx-charts';
import { SpinnerService } from 'src/app/services/spinner.service';
import { EncuestasService, ChartItem, ResultadosEncuestasCombinadas } from 'src/app/services/encuestas.service';
import { Color, ScaleType } from '@swimlane/ngx-charts';



@Component({
  selector: 'app-pagina-resultados-encuestas',
  standalone: true,
  templateUrl: './pagina-resultados-encuestas.html',         // <<— ojo con el nombre
  styleUrls: ['./pagina-resultados-encuestas.scss'],         // <<— opcional
  imports: [
    CommonModule,
    // Ionic
    IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonSpinner,
    // Charts
    NgxChartsModule,
  ]
})
export class PaginaResultadosEncuestasPage implements OnInit {

  // 🆕 Datos separados para mesa y delivery
  limpiezaDataMesa: ChartItem[] = [];
  aspectoValoradoDataMesa: ChartItem[] = [];
  serviciosExtraDataMesa: ChartItem[] = [];
  
  limpiezaDataDelivery: ChartItem[] = [];
  aspectoValoradoDataDelivery: ChartItem[] = [];
  serviciosExtraDataDelivery: ChartItem[] = [];

  cargando = true;
  errorMsg: string | null = null;

colorScheme: Color = {
  name: 'tridente',
  selectable: true,
  group: ScaleType.Ordinal,
  domain: ['#5d2222', '#7b2f2f', '#9b4b4b', '#c27a7a', '#eadccd']
};

intFmt = (v: number | string) => `${Math.round(Number(v) || 0)}`;




  constructor(
    private encuestas: EncuestasService,
    private spinner: SpinnerService
  ) {}

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando = true;
      this.errorMsg = null;
      this.spinner.show({ immediate: true });
      
      // 🆕 Llamar sin parámetros para obtener ambas encuestas (mesa + repartidor) SEPARADAS
      const res = await this.encuestas.getResultados() as ResultadosEncuestasCombinadas;
      
      // 🆕 Asignar datos de MESA
      this.limpiezaDataMesa = res.mesa.limpieza;
      this.aspectoValoradoDataMesa = res.mesa.aspecto_valorado;
      this.serviciosExtraDataMesa = res.mesa.servicios_extra;
      
      // 🆕 Asignar datos de REPARTIDOR
      this.limpiezaDataDelivery = res.delivery.limpieza;
      this.aspectoValoradoDataDelivery = res.delivery.aspecto_valorado;
      this.serviciosExtraDataDelivery = res.delivery.servicios_extra;
      
      console.log('[PaginaResultadosEncuestas] ✅ Datos cargados (mesa + repartidor separados):', {
        mesa: {
          limpieza: this.limpiezaDataMesa.length,
          aspecto_valorado: this.aspectoValoradoDataMesa.length,
          servicios_extra: this.serviciosExtraDataMesa.length
        },
        repartidor: {
          limpieza: this.limpiezaDataDelivery.length,
          aspecto_valorado: this.aspectoValoradoDataDelivery.length,
          servicios_extra: this.serviciosExtraDataDelivery.length
        }
      });
    } catch (e: any) {
      console.error('[encuestas] cargarDatos ERROR', e);
      this.errorMsg = (e?.message || 'NO SE PUDIERON CARGAR LOS RESULTADOS').toUpperCase();
    } finally {
      this.cargando = false;
      this.spinner.hide();
    }
  }

  salir() {
    history.back();
  }
}
