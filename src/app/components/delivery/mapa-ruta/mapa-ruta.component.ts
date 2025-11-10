// src/app/components/delivery/mapa-ruta/mapa-ruta.component.ts
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, 
  IonIcon, IonButtons, IonSpinner, ModalController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, navigateOutline, locationOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { DeliveryMapaService, Coordenadas } from 'src/app/services/delivery-mapa.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';

@Component({
  selector: 'app-mapa-ruta',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonButtons, IonSpinner
  ],
  templateUrl: './mapa-ruta.component.html',
  styleUrls: ['./mapa-ruta.component.scss']
})
export class MapaRutaComponent implements OnInit, OnDestroy {
  @Input() pedidoId!: number;
  @Input() direccionEntrega!: string;
  @Input() latitudDestino?: number;
  @Input() longitudDestino?: number;

  private map?: L.Map;
  private markerDelivery?: L.Marker;
  private markerDestino?: L.Marker;
  private polyline?: L.Polyline;
  
  ubicacionDelivery: Coordenadas | null = null;
  distancia: number | null = null;
  cargandoUbicacion = true;

  constructor(
    private modalCtrl: ModalController,
    private mapaService: DeliveryMapaService,
    private toast: ToastrService,
    private spinner: SpinnerService
  ) {
    addIcons({ closeOutline, navigateOutline, locationOutline });
  }

  async ngOnInit() {
    // Inicializar mapa después de que la vista esté lista
    setTimeout(() => this.initMap(), 300);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private async initMap() {
    try {
      // Obtener ubicación actual del delivery
      this.cargandoUbicacion = true;
      this.spinner.show({ immediate: true });
      this.ubicacionDelivery = await this.mapaService.obtenerUbicacionActual();
      
      if (!this.ubicacionDelivery) {
        this.toast.warning('NO SE PUDO OBTENER TU UBICACIÓN. EL MAPA SE CENTRARÁ EN EL DESTINO', '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
      }

      // Determinar centro del mapa
      let center: [number, number];
      let zoom = 13;

      if (this.latitudDestino && this.longitudDestino) {
        // Si hay coordenadas de destino, centrar entre ambos puntos
        if (this.ubicacionDelivery) {
          const latPromedio = (this.ubicacionDelivery.latitud + this.latitudDestino) / 2;
          const lngPromedio = (this.ubicacionDelivery.longitud + this.longitudDestino) / 2;
          center = [latPromedio, lngPromedio];
          zoom = 12;
        } else {
          center = [this.latitudDestino, this.longitudDestino];
        }
      } else if (this.ubicacionDelivery) {
        center = [this.ubicacionDelivery.latitud, this.ubicacionDelivery.longitud];
      } else {
        // Default: Buenos Aires
        center = [-34.603722, -58.381592];
      }

      // Crear mapa
      this.map = L.map('map-ruta', {
        center: center,
        zoom: zoom,
        zoomControl: true
      });

      // Agregar tiles de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Agregar marcador de ubicación del delivery
      if (this.ubicacionDelivery) {
        this.markerDelivery = L.marker([this.ubicacionDelivery.latitud, this.ubicacionDelivery.longitud], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).addTo(this.map);
        
        this.markerDelivery.bindPopup('TU UBICACIÓN ACTUAL').openPopup();
      }

      // Agregar marcador de destino (cliente)
      if (this.latitudDestino && this.longitudDestino) {
        this.markerDestino = L.marker([this.latitudDestino, this.longitudDestino], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).addTo(this.map);
        
        const popupContent = this.direccionEntrega 
          ? `<strong>DESTINO</strong><br>${this.direccionEntrega}`
          : 'DESTINO';
        this.markerDestino.bindPopup(popupContent).openPopup();

        // Dibujar línea entre ambos puntos
        if (this.ubicacionDelivery) {
          this.polyline = L.polyline([
            [this.ubicacionDelivery.latitud, this.ubicacionDelivery.longitud],
            [this.latitudDestino, this.longitudDestino]
          ], {
            color: '#3388ff',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10'
          }).addTo(this.map);

          // Ajustar vista para mostrar ambos puntos
          if (this.markerDelivery && this.markerDestino) {
            const group = new L.FeatureGroup([this.markerDelivery, this.markerDestino]);
            this.map.fitBounds(group.getBounds().pad(0.1));
          }

          // Calcular distancia
          this.distancia = this.mapaService.calcularDistancia(
            this.ubicacionDelivery,
            { latitud: this.latitudDestino, longitud: this.longitudDestino }
          );
        }
      }

      this.cargandoUbicacion = false;
      this.spinner.hide();

    } catch (error: any) {
      console.error('[MapaRutaComponent] Error al inicializar mapa:', error);
      this.toast.error('ERROR AL CARGAR EL MAPA', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      this.cargandoUbicacion = false;
      this.spinner.hide();
    }
  }

  async abrirGoogleMaps() {
    if (!this.latitudDestino || !this.longitudDestino) {
      this.toast.warning('NO HAY COORDENADAS DE DESTINO DISPONIBLES', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      return;
    }

    await this.mapaService.abrirGoogleMaps(
      { latitud: this.latitudDestino, longitud: this.longitudDestino },
      this.direccionEntrega
    );
  }

  async abrirWaze() {
    if (!this.latitudDestino || !this.longitudDestino) {
      this.toast.warning('NO HAY COORDENADAS DE DESTINO DISPONIBLES', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      return;
    }

    await this.mapaService.abrirWaze({
      latitud: this.latitudDestino,
      longitud: this.longitudDestino
    });
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }
}

