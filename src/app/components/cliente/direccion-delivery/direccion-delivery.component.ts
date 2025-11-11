import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, 
  IonInput, IonItem, IonLabel, IonIcon, IonButtons, ModalController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline, locationOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';

export interface DireccionDelivery {
  direccion: string;
  latitud?: number;
  longitud?: number;
}

@Component({
  selector: 'app-direccion-delivery',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonInput, IonItem, IonLabel, IonIcon
  ],
  templateUrl: './direccion-delivery.component.html',
  styleUrls: ['./direccion-delivery.component.scss']
})
export class DireccionDeliveryComponent implements OnInit, OnDestroy {
  direccion: string = '';
  latitud?: number;
  longitud?: number;
  
  private map?: L.Map;
  private marker?: L.Marker;
  private defaultCenter: [number, number] = [-34.603722, -58.381592]; // Buenos Aires, Argentina
  
  constructor(
    private modalCtrl: ModalController,
    private toast: ToastrService,
    private spinner: SpinnerService
  ) {
    addIcons({ checkmarkOutline, closeOutline, locationOutline });
  }

  ngOnInit() {
    // Inicializar mapa después de que la vista esté lista
    setTimeout(() => this.initMap(), 300);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    try {
      // Crear mapa
      this.map = L.map('map-direccion', {
        center: this.defaultCenter,
        zoom: 13,
        zoomControl: true
      });

      // Agregar tiles de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Agregar marcador inicial
      this.marker = L.marker(this.defaultCenter, {
        draggable: true,
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(this.map);

      // Evento cuando se arrastra el marcador
      this.marker.on('dragend', () => {
        const position = this.marker!.getLatLng();
        this.latitud = position.lat;
        this.longitud = position.lng;
        console.log('[DireccionDeliveryComponent] Marcador movido:', { lat: this.latitud, lng: this.longitud });
      });

      // Evento cuando se hace clic en el mapa
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        this.latitud = lat;
        this.longitud = lng;
        
        // Mover marcador a la nueva posición
        if (this.marker) {
          this.marker.setLatLng([lat, lng]);
        } else {
          this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map!);
        }
        
        console.log('[DireccionDeliveryComponent] Click en mapa:', { lat, lng });
      });

      // Obtener ubicación actual del usuario (opcional)
      this.obtenerUbicacionActual();

    } catch (error) {
      console.error('[DireccionDeliveryComponent] Error al inicializar mapa:', error);
      this.toast.error('ERROR AL CARGAR EL MAPA', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    }
  }

  private async obtenerUbicacionActual() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          this.latitud = lat;
          this.longitud = lng;
          
          // Centrar mapa en ubicación actual
          if (this.map) {
            this.map.setView([lat, lng], 15);
            if (this.marker) {
              this.marker.setLatLng([lat, lng]);
            }
          }
          
          console.log('[DireccionDeliveryComponent] Ubicación actual obtenida:', { lat, lng });
        },
        (error) => {
          console.warn('[DireccionDeliveryComponent] No se pudo obtener ubicación actual:', error);
          // No mostrar error, usar ubicación por defecto
        }
      );
    }
  }

  confirmar() {
    // Validar que la dirección esté completa
    if (!this.direccion || this.direccion.trim().length === 0) {
      this.toast.error('POR FAVOR, INGRESÁ LA DIRECCIÓN DE ENTREGA', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      return;
    }

    const direccionData: DireccionDelivery = {
      direccion: this.direccion.trim(),
      latitud: this.latitud,
      longitud: this.longitud
    };

    // Cerrar modal y devolver datos
    this.modalCtrl.dismiss(direccionData, 'confirm');
  }

  cancelar() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}

