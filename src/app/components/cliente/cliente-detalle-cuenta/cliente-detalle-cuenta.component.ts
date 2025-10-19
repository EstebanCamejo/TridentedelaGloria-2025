import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonList, IonIcon, IonLoading
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, qrCodeOutline, cardOutline } from 'ionicons/icons';
import { ToastrService } from 'ngx-toastr';
import { SupabaseService } from 'src/app/services/supabase.service';
import { QrHtml5Service } from 'src/app/services/qr-html5.service';

interface PedidoDetalle {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface DescuentoJuego {
  juego: string;
  descuento_pct: number;
  monto_descuento: number;
}

interface CuentaDetalle {
  pedidos: PedidoDetalle[];
  descuentos: DescuentoJuego[];
  propina_pct: number;
  propina_monto: number;
  subtotal: number;
  total: number;
  numero_mesa: number;
}

@Component({
  selector: 'app-cliente-detalle-cuenta',
  standalone: true,
  templateUrl: './cliente-detalle-cuenta.component.html',
  styleUrls: ['./cliente-detalle-cuenta.component.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonButton, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonList, IonIcon, IonLoading
  ]
})
export class ClienteDetalleCuentaComponent implements OnInit {
  loading = true;
  cuenta: CuentaDetalle | null = null;
  propinaSeleccionada = 0;
  propinaMonto = 0;
  totalFinal = 0;

  constructor(
    private supa: SupabaseService,
    private toast: ToastrService,
    private router: Router,
    private qrHtml5: QrHtml5Service
  ) {
    addIcons({ receiptOutline, qrCodeOutline, cardOutline });
  }

  async ngOnInit() {
    await this.cargarDetalleCuenta();
  }

  async cargarDetalleCuenta() {
    try {
      this.loading = true;
      
      // Obtener información de la mesa
      const waitStatus = await this.supa.getWaitStatusDetail();
      if (!waitStatus || !waitStatus.numero_mesa) {
        throw new Error('No se pudo obtener información de la mesa');
      }

      // Obtener pedidos del cliente
      const uid = await this.supa.getUserIdOrThrow();
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select(`
          id,
          estado,
          total,
          pedidos_detalles (
            id,
            cantidad,
            precioUnitario,
            menu (
              nombre
            )
          )
        `)
        .eq('idCliente', uid)
        .in('estado', ['pendiente', 'entregado', 'listo para entregar', 'en preparación', 'pendiente confirmacion pago']);

      if (pedidosError) throw pedidosError;

      // Procesar pedidos
      const pedidosDetalle: PedidoDetalle[] = [];
      let subtotal = 0;

      for (const pedido of pedidos || []) {
        for (const detalle of pedido.pedidos_detalles || []) {
          const subtotalItem = detalle.cantidad * detalle.precioUnitario;
          pedidosDetalle.push({
            id: detalle.id,
            nombre: detalle.menu?.[0]?.nombre || 'Producto',
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precioUnitario,
            subtotal: subtotalItem
          });
          subtotal += subtotalItem;
        }
      }

      // Obtener descuentos de juegos
      const descuentos: DescuentoJuego[] = [];
      // TODO: Implementar obtención de descuentos de juegos

      this.cuenta = {
        pedidos: pedidosDetalle,
        descuentos,
        propina_pct: 0,
        propina_monto: 0,
        subtotal,
        total: subtotal,
        numero_mesa: waitStatus.numero_mesa
      };

      this.actualizarTotales();

    } catch (error: any) {
      console.error('Error al cargar detalle de cuenta:', error);
      this.toast.error(error?.message || 'Error al cargar la cuenta');
      this.router.navigate(['/home-cliente']);
    } finally {
      this.loading = false;
    }
  }

  async escanearQRPropina() {
    try {
      const raw = await this.qrHtml5.scanOnce();
      if (!raw) return;

      const payload = this.qrHtml5.parse(raw);
      if (!payload || payload.t !== 'propina') {
        this.toast.warning('QR de propina no válido');
        return;
      }

      this.propinaSeleccionada = payload.pct || 0;
      this.actualizarTotales();
      this.toast.success(`Propina del ${this.propinaSeleccionada}% aplicada`);

    } catch (error: any) {
      console.error('Error al escanear QR de propina:', error);
      this.toast.error('Error al escanear QR de propina');
    }
  }

  actualizarTotales() {
    if (!this.cuenta) return;

    // Calcular propina
    this.propinaMonto = (this.cuenta.subtotal * this.propinaSeleccionada) / 100;
    
    // Calcular total final
    const descuentosTotal = this.cuenta.descuentos.reduce((sum, d) => sum + d.monto_descuento, 0);
    this.totalFinal = this.cuenta.subtotal - descuentosTotal + this.propinaMonto;

    // Actualizar objeto cuenta
    this.cuenta.propina_pct = this.propinaSeleccionada;
    this.cuenta.propina_monto = this.propinaMonto;
    this.cuenta.total = this.totalFinal;
  }

  async realizarPago() {
    if (!this.cuenta) return;

    try {
      // Obtener información de la mesa
      const waitStatus = await this.supa.getWaitStatusDetail();
      if (!waitStatus || !waitStatus.numero_mesa) {
        throw new Error('No se pudo obtener información de la mesa');
      }

      // Obtener pedidos del cliente para marcarlos como pagados
      const uid = await this.supa.getUserIdOrThrow();
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id')
        .eq('idCliente', uid)
        .in('estado', ['pendiente', 'entregado', 'listo para entregar', 'en preparación', 'pendiente confirmacion pago']);

      if (pedidosError) throw pedidosError;

      if (!pedidos || pedidos.length === 0) {
        throw new Error('No se encontraron pedidos para pagar');
      }

      // Marcar todos los pedidos como "pendiente de confirmación de pago"
      const { error: updateError } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'pendiente confirmacion pago',
          updated_at: new Date().toISOString()
        })
        .in('id', pedidos.map(p => p.id));

      if (updateError) throw updateError;

      // Enviar notificación al mozo sobre el pago realizado
      await this.supa.solicitarCuenta(waitStatus.numero_mesa);
      
      this.toast.success('Pago realizado. Esperando confirmación del mozo...');
      
      // Navegar de vuelta al home
      this.router.navigate(['/home-cliente']);

    } catch (error: any) {
      console.error('Error al realizar pago:', error);
      this.toast.error('Error al realizar el pago');
    }
  }

  volver() {
    this.router.navigate(['/home-cliente']);
  }

  getPropinaLabel(porcentaje: number): string {
    switch (porcentaje) {
      case 20: return 'Excelente';
      case 15: return 'Muy Bueno';
      case 10: return 'Bueno';
      case 5: return 'Regular';
      case 0: return 'Malo';
      default: return `${porcentaje}%`;
    }
  }

  getTotalDescuentos(): number {
    if (!this.cuenta) return 0;
    return this.cuenta.descuentos.reduce((sum, d) => sum + d.monto_descuento, 0);
  }
}
