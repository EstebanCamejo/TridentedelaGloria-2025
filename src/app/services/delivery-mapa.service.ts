// src/app/services/delivery-mapa.service.ts
import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { ToastrService } from 'ngx-toastr';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

@Injectable({ providedIn: 'root' })
export class DeliveryMapaService {

  constructor(private toast: ToastrService) {}

  /**
   * Obtiene la ubicación actual del delivery usando GPS
   */
  async obtenerUbicacionActual(): Promise<Coordenadas | null> {
    try {
      // En web, usar la API del navegador
      if (Capacitor.getPlatform() === 'web') {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocalización no disponible en este navegador'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitud: position.coords.latitude,
                longitud: position.coords.longitude
              });
            },
            (error) => {
              console.error('[DeliveryMapaService] Error al obtener ubicación:', error);
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });
      }

      // En móvil, usar Capacitor Geolocation
      const permiso = await Geolocation.checkPermissions();
      
      if (permiso.location !== 'granted') {
        const solicitud = await Geolocation.requestPermissions();
        if (solicitud.location !== 'granted') {
          this.toast.warning('Se necesitan permisos de ubicación para usar esta funcionalidad', '', {
            positionClass: 'toast-center',
            timeOut: 4000
          });
          return null;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return {
        latitud: position.coords.latitude,
        longitud: position.coords.longitude
      };

    } catch (error: any) {
      console.error('[DeliveryMapaService] Error al obtener ubicación:', error);
      this.toast.error('Error al obtener tu ubicación: ' + (error?.message || 'Error desconocido'), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      return null;
    }
  }

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   * Retorna la distancia en kilómetros
   */
  calcularDistancia(punto1: Coordenadas, punto2: Coordenadas): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.toRad(punto2.latitud - punto1.latitud);
    const dLon = this.toRad(punto2.longitud - punto1.longitud);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(punto1.latitud)) * Math.cos(this.toRad(punto2.latitud)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c;
    
    return distancia;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Abre Google Maps con navegación hacia el destino
   */
  async abrirGoogleMaps(destino: Coordenadas, direccion?: string): Promise<void> {
    try {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destino.latitud},${destino.longitud}`;
      
      if (Capacitor.isNativePlatform()) {
        // En móvil, intentar abrir la app
        try {
          await AppLauncher.openUrl({ url });
        } catch (error) {
          // Si falla, abrir en navegador
          window.open(url, '_blank');
        }
      } else {
        // En web, abrir en nueva pestaña
        window.open(url, '_blank');
      }
    } catch (error: any) {
      console.error('[DeliveryMapaService] Error al abrir Google Maps:', error);
      this.toast.error('Error al abrir Google Maps', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    }
  }

  /**
   * Abre Waze con navegación hacia el destino
   */
  async abrirWaze(destino: Coordenadas): Promise<void> {
    try {
      const url = `https://waze.com/ul?ll=${destino.latitud},${destino.longitud}&navigate=yes`;
      
      if (Capacitor.isNativePlatform()) {
        // En móvil, intentar abrir la app
        try {
          await AppLauncher.openUrl({ url });
        } catch (error) {
          // Si falla, abrir en navegador
          window.open(url, '_blank');
        }
      } else {
        // En web, abrir en nueva pestaña
        window.open(url, '_blank');
      }
    } catch (error: any) {
      console.error('[DeliveryMapaService] Error al abrir Waze:', error);
      this.toast.error('Error al abrir Waze', '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    }
  }
}

