import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonList, IonIcon, IonLoading, IonBadge, IonRefresher, IonRefresherContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, timeOutline, receiptOutline, bicycleOutline, locationOutline } from 'ionicons/icons';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { environment } from 'src/environments/environment';

interface PagoPendienteDelivery {
  id: number;
  cliente_nombre: string;
  cliente_email: string;
  total: number;
  base_total?: number;
  subtotal?: number;
  monto_descuento?: number;
  descuento_pct?: number;
  propina_monto: number;
  propina_pct: number;
  fecha_solicitud: string;
  direccion_entrega?: string;
  pedidos: Array<{
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

@Component({
  selector: 'app-delivery-confirmar-pago',
  standalone: true,
  templateUrl: './delivery-confirmar-pago.component.html',
  styleUrls: ['./delivery-confirmar-pago.component.scss'],
  imports: [
    CommonModule, FormsModule, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonLoading,
    IonRefresher, IonRefresherContent
  ]
})
export class DeliveryConfirmarPagoComponent implements OnInit, OnDestroy {
  loading = true;
  pagosPendientes: PagoPendienteDelivery[] = [];
  confirmandoPago: { [key: number]: boolean } = {};
  private channel?: { unsubscribe?: () => void };

  constructor(
    private supa: SupabaseService,
    private toast: ToastrService,
    private spinner: SpinnerService,
    private router: Router
  ) {
    addIcons({ checkmarkCircleOutline, timeOutline, receiptOutline, bicycleOutline, locationOutline });
  }

  async ngOnInit() {
    await this.cargarPagosPendientes();
    this.suscribirseAPagos();
  }

  ngOnDestroy() {
    this.channel?.unsubscribe?.();
  }

  async cargarPagosPendientes() {
    try {
      this.loading = true;
      this.spinner.show({ immediate: true });
      
      // Obtener pedidos delivery con estado 'pendiente confirmacion pago'
      const { data: pedidos, error } = await this.supa.client
        .from('pedidos')
        .select(`
          id,
          total,
          descuento_pct,
          propina_pct,
          propina_monto,
          created_at,
          idCliente,
          direccion_entrega,
          pedidos_detalles (
            id,
            cantidad,
            precioUnitario,
            menu (
              nombre
            )
          )
        `)
        .eq('estado', 'pendiente confirmacion pago')
        .eq('tipo_pedido', 'delivery') // 🆕 Solo pedidos delivery
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!pedidos || pedidos.length === 0) {
        this.pagosPendientes = [];
        this.loading = false;
        return;
      }

      // Procesar pedidos
      const pagosProcesados: PagoPendienteDelivery[] = [];

      for (const pedido of pedidos) {
        // Obtener información del cliente
        const { data: usuario } = await this.supa.client
          .from('usuarios')
          .select('nombres, apellidos, email')
          .eq('auth_id', pedido.idCliente)
          .maybeSingle();

        const clienteNombre = usuario 
          ? `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || usuario.email || 'Cliente'
          : 'Cliente';
        
        const clienteEmail = usuario?.email || 'Sin email';

        // Procesar detalles del pedido
        const pedidosDetalle: Array<{
          nombre: string;
          cantidad: number;
          precio_unitario: number;
          subtotal: number;
        }> = [];

        for (const detalle of pedido.pedidos_detalles || []) {
          const menuItem = Array.isArray(detalle.menu) ? detalle.menu[0] : detalle.menu;
          pedidosDetalle.push({
            nombre: menuItem?.nombre || 'Producto',
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precioUnitario,
            subtotal: detalle.cantidad * detalle.precioUnitario
          });
        }

        // Calcular totales
        const subtotal = pedidosDetalle.reduce((sum, item) => sum + item.subtotal, 0);
        const descuentoPct = Number(pedido.descuento_pct || 0);
        const montoDescuento = subtotal * descuentoPct / 100;
        const baseParaPropina = Math.max(0, subtotal - montoDescuento);
        const totalFinal = baseParaPropina + (pedido.propina_monto || 0);

        pagosProcesados.push({
          id: pedido.id,
          cliente_nombre: clienteNombre,
          cliente_email: clienteEmail,
          total: totalFinal,
          base_total: baseParaPropina,
          subtotal: subtotal,
          monto_descuento: montoDescuento,
          descuento_pct: descuentoPct,
          propina_monto: pedido.propina_monto || 0,
          propina_pct: pedido.propina_pct || 0,
          fecha_solicitud: pedido.created_at,
          direccion_entrega: pedido.direccion_entrega || undefined,
          pedidos: pedidosDetalle
        });
      }

      this.pagosPendientes = pagosProcesados;

    } catch (error: any) {
      console.error('[DeliveryConfirmarPagoComponent] Error al cargar pagos pendientes:', error);
      this.toast.error(('ERROR AL CARGAR PAGOS PENDIENTES: ' + (error?.message || 'ERROR INESPERADO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.loading = false;
      this.spinner.hide();
    }
  }

  async confirmarPago(pago: PagoPendienteDelivery) {
    try {
      this.confirmandoPago[pago.id] = true;
      this.spinner.show({ immediate: true, minMs: 1000 });

      // 1. Marcar pedido como pagado (cambiar estado a 'pagado')
      const { error: updateError } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'pagado',
          updated_at: new Date().toISOString()
        })
        .eq('id', pago.id)
        .eq('tipo_pedido', 'delivery'); // Asegurar que es delivery

      if (updateError) throw updateError;

      // Remover de la lista
      this.pagosPendientes = this.pagosPendientes.filter(p => p.id !== pago.id);

      this.toast.success(`PAGO CONFIRMADO PARA REPARTIDOR #${pago.id}`, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });

      // 2. Enviar notificaciones push
      await this.enviarNotificacionesPago(pago);

      // 3. Generar factura
      await this.generarFactura(pago);

    } catch (error: any) {
      console.error('[DeliveryConfirmarPagoComponent] Error al confirmar pago:', error);
      this.toast.error(('ERROR AL CONFIRMAR EL PAGO: ' + (error?.message || 'ERROR INESPERADO')).toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.confirmandoPago[pago.id] = false;
      this.spinner.hide();
    }
  }

  async enviarNotificacionesPago(pago: PagoPendienteDelivery) {
    try {
      console.log('[DeliveryConfirmarPagoComponent] Enviando notificaciones de pago confirmado...');

      // 1. Notificar al cliente via realtime channel
      const clienteChannel = this.supa.client.channel('notificacion_cliente_pago');
      await clienteChannel.send({
        type: 'broadcast' as const,
        event: 'pago_confirmado',
        payload: {
          pedido_id: pago.id,
          tipo: 'delivery',
          mensaje: 'TU PAGO DE REPARTIDOR HA SIDO CONFIRMADO. ¡GRACIAS POR TU PEDIDO!',
          timestamp: new Date().toISOString()
        }
      });

      console.log('[DeliveryConfirmarPagoComponent] ✅ Notificaciones enviadas correctamente');

    } catch (error) {
      console.error('[DeliveryConfirmarPagoComponent] Error al enviar notificaciones:', error);
    }
  }

  async handleRefresh(event: any) {
    await this.cargarPagosPendientes();
    event.target.complete();
  }

  suscribirseAPagos() {
    // Suscribirse a cambios en pedidos delivery con estado 'pendiente confirmacion pago'
    const channel = this.supa.client.channel('delivery-confirmar-pago-realtime');
    
    this.channel = channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: 'tipo_pedido=eq.delivery'
      }, async (payload) => {
        const pedido: any = payload.new || {};
        const pedidoAnterior: any = payload.old || {};
        
        // Solo recargar si cambió a 'pendiente confirmacion pago' o salió de ese estado
        const nuevoEstado = pedido.estado;
        const estadoAnterior = pedidoAnterior.estado;
        
        if (nuevoEstado === 'pendiente confirmacion pago' || 
            estadoAnterior === 'pendiente confirmacion pago') {
          console.log('[DeliveryConfirmarPagoComponent] Cambio detectado en pedidos delivery pagados:', payload);
          await this.cargarPagosPendientes();
        }
      })
      .subscribe((status) => {
        console.log('[DeliveryConfirmarPagoComponent] Canal suscrito con estado:', status);
      });
  }

  volver() {
    this.router.navigate(['/home-admin']);
  }

  async generarFactura(pago: PagoPendienteDelivery) {
    try {
      console.log('[DeliveryConfirmarPagoComponent] Generando factura para pedido delivery:', pago.id);
      
      // Asegurar que la sesión esté activa
      const { data: sessionData, error: sessionError } = await this.supa.client.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        console.error('[DeliveryConfirmarPagoComponent] No hay sesión activa:', sessionError);
        this.toast.warning('PAGO CONFIRMADO, PERO NO SE PUDO GENERAR LA FACTURA (SESIÓN EXPIRADA)', '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
        return;
      }

      console.log('[DeliveryConfirmarPagoComponent] Token obtenido, invocando Edge Function...');

      // Invocar Edge Function
      const { data, error } = await this.supa.client.functions.invoke('generar-factura', {
        body: { pedido_id: pago.id }
      });

      if (error || (data && (data as any).error)) {
        console.error('[DeliveryConfirmarPagoComponent] Error al generar factura:', error || (data as any).error);
        this.toast.warning('PAGO CONFIRMADO, PERO HUBO UN PROBLEMA AL GENERAR LA FACTURA', '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
        return;
      }

      console.log('[DeliveryConfirmarPagoComponent] ✅ Factura generada exitosamente:', data);
      
      if (data?.cliente_anonimo) {
        this.toast.success('PAGO CONFIRMADO. SE ENVIÓ NOTIFICACIÓN CON ENLACE DE DESCARGA DE FACTURA', '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
      } else {
        this.toast.success('PAGO CONFIRMADO. SE ENVIÓ LA FACTURA POR CORREO', '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
      }

    } catch (error) {
      console.error('[DeliveryConfirmarPagoComponent] Error al generar factura:', error);
      this.toast.warning('PAGO CONFIRMADO, PERO HUBO UN PROBLEMA AL GENERAR LA FACTURA', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    }
  }

  getPropinaLabel(porcentaje: number): string {
    switch (porcentaje) {
      case 20: return 'EXCELENTE';
      case 15: return 'MUY BUENO';
      case 10: return 'BUENO';
      case 5: return 'REGULAR';
      case 0: return 'MALO';
      default: return `${porcentaje}%`;
    }
  }
}

