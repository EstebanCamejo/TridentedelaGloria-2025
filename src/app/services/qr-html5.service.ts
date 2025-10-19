// src/app/services/qr-html5.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Html5Qrcode } from 'html5-qrcode';
import { QrPayload } from './qr.service';

@Injectable({ providedIn: 'root' })
export class QrHtml5Service {
  private scanner: Html5Qrcode | null = null;
  private readonly SCANNER_ID = 'qr-reader';
  
  constructor(private zone: NgZone) {}
  
  /**
   * Escanea un código QR usando la cámara web (NO nativa)
   * Esto NO interrumpe el contexto de JavaScript ni afecta Supabase
   */
  async scanOnce(): Promise<string | null> {
    console.log('[QrHtml5Service] 📸 Iniciando escaneo...');
    
    return new Promise<string | null>((resolve) => {
      // Crear elemento HTML para el scanner
      const readerDiv = document.createElement('div');
      readerDiv.id = this.SCANNER_ID;
      readerDiv.style.position = 'fixed';
      readerDiv.style.top = '0';
      readerDiv.style.left = '0';
      readerDiv.style.width = '100%';
      readerDiv.style.height = '100%';
      readerDiv.style.zIndex = '9999';
      readerDiv.style.backgroundColor = 'black';
      document.body.appendChild(readerDiv);
      
      // Botón para cerrar
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Cerrar';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '20px';
      closeBtn.style.right = '20px';
      closeBtn.style.zIndex = '10000';
      closeBtn.style.padding = '10px 20px';
      closeBtn.style.fontSize = '16px';
      closeBtn.style.backgroundColor = 'rgba(255,255,255,0.9)';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '5px';
      closeBtn.style.cursor = 'pointer';
      
      closeBtn.onclick = async () => {
        await this.cleanup();
        resolve(null);
      };
      
      readerDiv.appendChild(closeBtn);
      
      // Inicializar scanner
      this.scanner = new Html5Qrcode(this.SCANNER_ID);
      
      this.scanner.start(
        { facingMode: 'environment' }, // Cámara trasera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          console.log('[QrHtml5Service] ✅ QR escaneado:', decodedText);
          await this.cleanup();
          this.zone.run(() => {
            resolve(decodedText);
          });
        },
        (errorMessage) => {
          // Errores de escaneo (no encontró QR aún) - ignorar
        }
      ).catch(async (err) => {
        console.error('[QrHtml5Service] ❌ Error al iniciar cámara:', err);
        await this.cleanup();
        resolve(null);
      });
    });
  }
  
  /**
   * Parsea el texto del QR a un objeto QrPayload
   */
  parse(raw: string): QrPayload | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.t) {
        return parsed as QrPayload;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Genera un QR de propina para una mesa específica
   */
  generarQRPropina(mesaId: string, porcentaje: number): string {
    const qrData = {
      t: 'propina',
      mesa_id: mesaId,
      pct: porcentaje
    };
    return JSON.stringify(qrData);
  }

  /**
   * Genera QRs de propina para todos los niveles de satisfacción
   */
  generarQRsPropina(mesaId: string): { nivel: string; porcentaje: number; qr: string }[] {
    const niveles = [
      { nivel: 'Excelente', porcentaje: 20 },
      { nivel: 'Muy Bueno', porcentaje: 15 },
      { nivel: 'Bueno', porcentaje: 10 },
      { nivel: 'Regular', porcentaje: 5 },
      { nivel: 'Malo', porcentaje: 0 }
    ];

    return niveles.map(nivel => ({
      ...nivel,
      qr: this.generarQRPropina(mesaId, nivel.porcentaje)
    }));
  }
  
  /**
   * Limpia el scanner y remueve el div
   */
  private async cleanup(): Promise<void> {
    if (this.scanner) {
      try {
        await this.scanner.stop();
        await this.scanner.clear();
      } catch (err) {
        console.warn('[QrHtml5Service] Error al detener scanner:', err);
      }
      this.scanner = null;
    }
    
    const readerDiv = document.getElementById(this.SCANNER_ID);
    if (readerDiv) {
      readerDiv.remove();
    }
  }
}

