// src/app/components/pagina-resultados-encuestas/pagina-resultados-encuestas.ts
import { Component, OnInit, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// Ionic standalone (v7+)
import {
  IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonSpinner, IonHeader, IonToolbar, IonTitle, IonIcon,
  IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';

import { NgxChartsModule } from '@swimlane/ngx-charts';
import { SpinnerService } from 'src/app/services/spinner.service';
import { EncuestasService, ChartItem, ResultadosEncuestasCombinadas } from 'src/app/services/encuestas.service';
import { Color, ScaleType } from '@swimlane/ngx-charts';
import { addIcons } from 'ionicons';
import { restaurant, bicycleOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

type VistaActual = 'inicial' | 'mesa' | 'repartidor';

interface TarjetaGrafico {
  tipo: 'limpieza' | 'aspecto_valorado' | 'servicios_extra';
  titulo: string;
  subtitulo: string;
  datos: ChartItem[];
}

@Component({
  selector: 'app-pagina-resultados-encuestas',
  standalone: true,
  templateUrl: './pagina-resultados-encuestas.html',
  styleUrls: ['./pagina-resultados-encuestas.scss'],
  imports: [
    CommonModule,
    // Ionic
    IonContent, IonHeader, IonToolbar, IonTitle, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonSpinner, IonGrid, IonRow, IonCol,
    // Charts
    NgxChartsModule,
  ]
})
export class PaginaResultadosEncuestasPage implements OnInit, AfterViewChecked {

  vistaActual: VistaActual = 'inicial';

  // Datos separados para mesa y repartidor
  limpiezaDataMesa: ChartItem[] = [];
  aspectoValoradoDataMesa: ChartItem[] = [];
  serviciosExtraDataMesa: ChartItem[] = [];
  
  limpiezaDataRepartidor: ChartItem[] = [];
  aspectoValoradoDataRepartidor: ChartItem[] = [];
  serviciosExtraDataRepartidor: ChartItem[] = [];

  // Tarjetas para carrusel
  tarjetasMesa: TarjetaGrafico[] = [];
  tarjetasRepartidor: TarjetaGrafico[] = [];
  indiceTarjetaActual: number = 0;

  cargando = true;
  errorMsg: string | null = null;

  colorScheme: Color = {
    name: 'tridente',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#5d2222', '#7b2f2f', '#9b4b4b', '#c27a7a', '#eadccd']
  };

  intFmt = (v: number | string) => `${Math.round(Number(v) || 0)}`;

  calcularPorcentaje(item: ChartItem, datos: ChartItem[]): number {
    const total = datos.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return 0;
    return Math.round((item.value / total) * 100);
  }

  crearDatosParaCirculo(item: ChartItem, datos: ChartItem[], index: number): ChartItem[] {
    const porcentaje = this.calcularPorcentaje(item, datos);
    const resto = 100 - porcentaje;
    
    // Crear datos para mostrar el círculo: el porcentaje del item y el resto
    return [
      { name: item.name, value: porcentaje },
      { name: '', value: resto } // Resto invisible
    ];
  }

  calcularPorcentajeBarra(item: ChartItem, datos: ChartItem[]): number {
    const maxValue = Math.max(...datos.map(d => d.value));
    if (maxValue === 0) return 0;
    return (item.value / maxValue) * 100;
  }

  obtenerColorBarra(index: number): string {
    const colores = ['#5d2222', '#7b2f2f', '#9b4b4b', '#c27a7a', '#eadccd'];
    return colores[index % colores.length];
  }

  constructor(
    private encuestas: EncuestasService,
    private spinner: SpinnerService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      restaurant,
      'bicycle-outline': bicycleOutline,
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline
    });
  }

  async ngOnInit() {
    await this.cargarDatos();
  }

  private ultimaVista: VistaActual = 'inicial';
  private ultimoIndice: number = -1;
  
  ngAfterViewChecked() {
    // EVITAR EJECUTAR CONSTANTEMENTE: Solo aplicar estilos cuando cambia la vista o el índice de tarjeta
    const vistaCambio = this.vistaActual !== this.ultimaVista;
    const indiceCambio = this.indiceTarjetaActual !== this.ultimoIndice;
    
    if ((this.vistaActual === 'mesa' || this.vistaActual === 'repartidor') && (vistaCambio || indiceCambio)) {
      this.ultimaVista = this.vistaActual;
      this.ultimoIndice = this.indiceTarjetaActual;
      
      // Aplicar estilos solo para gráficos de barras verticales
      setTimeout(() => {
        this.aplicarEstilosNumerosBarras();
      }, 500);
    }
  }

  aplicarEstilosNumerosBarras() {
    // Usar múltiples timeouts para asegurar que los gráficos estén renderizados
    setTimeout(() => {
      const charts = document.querySelectorAll('ngx-charts-bar-vertical');
      charts.forEach((chart: any) => {
        const svg = chart.querySelector('svg');
        if (svg) {
          // Buscar todos los elementos de texto que contienen números (data labels)
          const textElements = svg.querySelectorAll('text');
          textElements.forEach((textEl: SVGTextElement) => {
            const textContent = textEl.textContent?.trim();
            // Si el texto es un número (data label), aplicar estilos
            if (textContent && /^\d+$/.test(textContent)) {
              textEl.style.setProperty('font-size', '28px', 'important');
              textEl.style.setProperty('font-weight', '700', 'important');
              textEl.style.setProperty('fill', '#fff7ea', 'important');
              textEl.setAttribute('font-size', '28');
              textEl.setAttribute('font-weight', '700');
              textEl.setAttribute('fill', '#fff7ea');
            }
          });
        }
      });
    }, 100);

    // Reintentar después de un tiempo para asegurar que se apliquen los estilos
    setTimeout(() => {
      const charts = document.querySelectorAll('ngx-charts-bar-vertical');
      charts.forEach((chart: any) => {
        const svg = chart.querySelector('svg');
        if (svg) {
          const textElements = svg.querySelectorAll('text');
          textElements.forEach((textEl: SVGTextElement) => {
            const textContent = textEl.textContent?.trim();
            if (textContent && /^\d+$/.test(textContent)) {
              textEl.style.setProperty('font-size', '28px', 'important');
              textEl.style.setProperty('font-weight', '700', 'important');
              textEl.style.setProperty('fill', '#fff7ea', 'important');
              textEl.setAttribute('font-size', '28');
              textEl.setAttribute('font-weight', '700');
              textEl.setAttribute('fill', '#fff7ea');
            }
          });
        }
      });
    }, 500);
  }

  // Función eliminada: aplicarEstilosBarrasHorizontales() - Ya no se necesita con barras HTML personalizadas

  // Función eliminada: aplicarEstilosPieGrid() - Ya no se necesita con pie-chart individuales

  async cargarDatos() {
    try {
      this.cargando = true;
      this.errorMsg = null;
      this.spinner.show({ immediate: true });
      
      const res = await this.encuestas.getResultados() as ResultadosEncuestasCombinadas;
      
      // Asignar datos de MESA
      this.limpiezaDataMesa = this.procesarNombres(res.mesa.limpieza);
      this.aspectoValoradoDataMesa = this.procesarNombres(res.mesa.aspecto_valorado);
      this.serviciosExtraDataMesa = this.procesarNombres(res.mesa.servicios_extra);
      
      // Asignar datos de REPARTIDOR
      this.limpiezaDataRepartidor = this.procesarNombres(res.delivery.limpieza);
      this.aspectoValoradoDataRepartidor = this.procesarNombres(res.delivery.aspecto_valorado);
      this.serviciosExtraDataRepartidor = this.procesarNombres(res.delivery.servicios_extra);
      
      // Crear tarjetas para carrusel de MESA
      this.tarjetasMesa = [
        {
          tipo: 'limpieza',
          titulo: 'LIMPIEZA DEL LOCAL',
          subtitulo: 'CALIFICACIÓN',
          datos: this.limpiezaDataMesa
        },
        {
          tipo: 'aspecto_valorado',
          titulo: 'ASPECTO MÁS VALORADO',
          subtitulo: 'PREFERENCIAS',
          datos: this.aspectoValoradoDataMesa
        },
        {
          tipo: 'servicios_extra',
          titulo: 'SERVICIOS ADICIONALES',
          subtitulo: 'SUGERENCIAS',
          datos: this.serviciosExtraDataMesa
        }
      ];

      // Crear tarjetas para carrusel de REPARTIDOR
      this.tarjetasRepartidor = [
        {
          tipo: 'limpieza',
          titulo: 'ESTADO DEL EMPAQUE',
          subtitulo: 'CALIFICACIÓN',
          datos: this.limpiezaDataRepartidor
        },
        {
          tipo: 'aspecto_valorado',
          titulo: 'ASPECTO MÁS VALORADO',
          subtitulo: 'PREFERENCIAS',
          datos: this.aspectoValoradoDataRepartidor
        },
        {
          tipo: 'servicios_extra',
          titulo: 'SERVICIOS ADICIONALES',
          subtitulo: 'SUGERENCIAS',
          datos: this.serviciosExtraDataRepartidor
        }
      ];

      console.log('[PaginaResultadosEncuestas] ✅ Datos cargados');
    } catch (e: any) {
      console.error('[encuestas] cargarDatos ERROR', e);
      this.errorMsg = (e?.message || 'NO SE PUDIERON CARGAR LOS RESULTADOS').toUpperCase();
    } finally {
      this.cargando = false;
      this.spinner.hide();
    }
  }

  // Procesar nombres para eliminar abreviaciones y usar palabras completas
  procesarNombres(datos: ChartItem[]): ChartItem[] {
    return datos.map(item => ({
      ...item,
      name: this.expandirNombre(item.name)
    }));
  }

  // Expandir abreviaciones a palabras completas
  expandirNombre(nombre: string): string {
    const mapeo: Record<string, string> = {
      // Aspectos valorados comunes
      'calidad_comida': 'CALIDAD DE LA COMIDA',
      'atencion': 'ATENCIÓN',
      'ambiente': 'AMBIENTE',
      'precio': 'PRECIO',
      'rapidez': 'RAPIDEZ',
      'presentacion': 'PRESENTACIÓN',
      'sabor': 'SABOR',
      'temperatura': 'TEMPERATURA',
      'empaque': 'EMPAQUE',
      'tiempo_entrega': 'TIEMPO DE ENTREGA',
      // Servicios adicionales comunes
      'wifi': 'WIFI',
      'juegos': 'JUEGOS',
      'menu_sin_tacc': 'MENÚ SIN TACC',
      'estacionamiento': 'ESTACIONAMIENTO',
      'terraza': 'TERRAZA',
      'musica': 'MÚSICA',
      'aire_acondicionado': 'AIRE ACONDICIONADO',
      'accesibilidad': 'ACCESIBILIDAD',
      'parrilla': 'PARRILLA',
      'barra': 'BARRA',
      'reservas': 'RESERVAS',
      'delivery': 'DELIVERY',
      'takeaway': 'TAKEAWAY',
      'promociones': 'PROMOCIONES',
      'descuentos': 'DESCUENTOS',
      'eventos': 'EVENTOS',
      'catering': 'CATERING',
      'valet': 'VALET PARKING',
    };

    // Si está en el mapeo, devolver el nombre expandido
    if (mapeo[nombre.toLowerCase()]) {
      return mapeo[nombre.toLowerCase()];
    }

    // Si no está, convertir guiones bajos a espacios y poner en mayúsculas
    return nombre.replace(/_/g, ' ').toUpperCase();
  }

  verEncuestasMesa() {
    this.vistaActual = 'mesa';
    this.indiceTarjetaActual = 0;
    // El ngAfterViewChecked detectará el cambio y aplicará los estilos
  }

  verEncuestasRepartidor() {
    this.vistaActual = 'repartidor';
    this.indiceTarjetaActual = 0;
    // El ngAfterViewChecked detectará el cambio y aplicará los estilos
  }

  volverInicio() {
    this.vistaActual = 'inicial';
    this.indiceTarjetaActual = 0;
  }

  siguienteTarjeta() {
    const tarjetas = this.vistaActual === 'mesa' ? this.tarjetasMesa : this.tarjetasRepartidor;
    if (this.indiceTarjetaActual < tarjetas.length - 1) {
      this.indiceTarjetaActual++;
      // El ngAfterViewChecked detectará el cambio y aplicará los estilos
    }
  }

  anteriorTarjeta() {
    if (this.indiceTarjetaActual > 0) {
      this.indiceTarjetaActual--;
      // El ngAfterViewChecked detectará el cambio y aplicará los estilos
    }
  }

  get tarjetaActual(): TarjetaGrafico | null {
    const tarjetas = this.vistaActual === 'mesa' ? this.tarjetasMesa : this.tarjetasRepartidor;
    return tarjetas[this.indiceTarjetaActual] || null;
  }

  get totalTarjetas(): number {
    const tarjetas = this.vistaActual === 'mesa' ? this.tarjetasMesa : this.tarjetasRepartidor;
    return tarjetas.length;
  }

  get tituloVista(): string {
    if (this.vistaActual === 'mesa') return 'ENCUESTAS DE MESA';
    if (this.vistaActual === 'repartidor') return 'ENCUESTAS DE REPARTIDOR';
    return 'RESULTADOS DE ENCUESTAS';
  }

  salir() {
    history.back();
  }
}
