import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonIcon, IonLoading
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, qrCodeOutline, cardOutline } from 'ionicons/icons';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { QrHtml5Service } from 'src/app/services/qr-html5.service';
import { QrPropina } from 'src/app/services/qr.service';

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
  numero_mesa?: number; // Opcional para delivery
  pedido_delivery_id?: number; // Para delivery
}

@Component({
  selector: 'app-cliente-detalle-cuenta',
  standalone: true,
  templateUrl: './cliente-detalle-cuenta.component.html',
  styleUrls: ['./cliente-detalle-cuenta.component.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonLoading
  ]
})
export class ClienteDetalleCuentaComponent implements OnInit {
  loading = true;
  cuenta: CuentaDetalle | null = null;
  propinaSeleccionada = 0;
  propinaMonto = 0;
  totalFinal = 0;
  
  // 🆕 Propiedades para delivery
  esDelivery = false;
  numeroMesa: number | null = null;
  pedidoDeliveryId: number | null = null;

  constructor(
    private supa: SupabaseService,
    private toast: ToastrService,
    private spinner: SpinnerService,
    private router: Router,
    private route: ActivatedRoute,
    private qrHtml5: QrHtml5Service
  ) {
    addIcons({ receiptOutline, qrCodeOutline, cardOutline });
  }

  async ngOnInit() {
    // 🆕 Detectar si es delivery desde queryParams
    this.route.queryParams.subscribe(params => {
      this.esDelivery = params['tipo'] === 'delivery';
    });
    
    await this.cargarDetalleCuenta();
  }

  async cargarDetalleCuenta() {
    try {
      this.loading = true;
      this.spinner.show({ immediate: true });
      
      const uid = await this.supa.getUserIdOrThrow();
      
      // 🆕 Si es delivery, no buscar mesa, solo cargar pedidos delivery
      if (this.esDelivery) {
        console.log('[ClienteDetalleCuenta] Cargando cuenta para pedido delivery');
        
        // Obtener pedidos delivery del cliente
        const { data: pedidos, error: pedidosError } = await this.supa.client
          .from('pedidos')
          .select('id, estado, total, descuento_pct, descuento_fuente, juego_premio_reclamado, tipo_pedido')
          .eq('idCliente', uid)
          .eq('tipo_pedido', 'delivery')
          .in('estado', ['pendiente', 'entregado', 'listo para entregar', 'en preparación', 'pendiente confirmacion pago'])
          .order('created_at', { ascending: false })
          .limit(1); // Solo el último pedido delivery

        if (pedidosError) throw pedidosError;
        
        if (!pedidos || pedidos.length === 0) {
          throw new Error('NO SE ENCONTRARON PEDIDOS DE REPARTIDOR PARA MOSTRAR');
        }

        this.pedidoDeliveryId = pedidos[0].id;
        await this.procesarPedidos(pedidos);
        return;
      }

      // Para pedidos de mesa, usar el flujo original
      const waitStatus = await this.supa.getWaitStatusDetail();
      if (!waitStatus || !waitStatus.numero_mesa) {
        throw new Error('NO SE PUDO OBTENER INFORMACIÓN DE LA MESA');
      }

      this.numeroMesa = waitStatus.numero_mesa;

      // Obtener pedidos del cliente (solo mesa o sin tipo_pedido)
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id, estado, total, descuento_pct, descuento_fuente, juego_premio_reclamado, tipo_pedido')
        .eq('idCliente', uid)
        .or('tipo_pedido.is.null,tipo_pedido.eq.mesa')
        .in('estado', ['pendiente', 'entregado', 'listo para entregar', 'en preparación', 'pendiente confirmacion pago']);

      if (pedidosError) throw pedidosError;

      await this.procesarPedidos(pedidos || []);
    } catch (error: any) {
      console.error('Error al cargar detalle de cuenta:', error);
      this.toast.error((error?.message || 'ERROR AL CARGAR EL DETALLE DE CUENTA').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      this.router.navigate(['/home-cliente']);
    } finally {
      this.loading = false;
      this.spinner.hide();
    }
  }

  private async procesarPedidos(pedidos: any[]) {
    try {
      // Procesar pedidos
      const pedidosDetalle: PedidoDetalle[] = [];
      let subtotal = 0;
      const pedidoIdToSubtotal = new Map<number, number>();

    for (const pedido of pedidos) {
      // Obtener detalles de cada pedido por separado
      const { data: detalles, error: detallesError } = await this.supa.client
        .from('pedidos_detalles')
        .select(`
          id,
          cantidad,
          precioUnitario,
          menu (
            nombre
          )
        `)
        .eq('idPedido', pedido.id);

      if (!detallesError && detalles) {
        let subtotalPedido = 0;
        for (const detalle of detalles) {
          const subtotalItem = detalle.cantidad * detalle.precioUnitario;
          pedidosDetalle.push({
            id: detalle.id,
            nombre: (detalle.menu as any)?.nombre || 'Producto',
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precioUnitario,
            subtotal: subtotalItem
          });
          subtotal += subtotalItem;
          subtotalPedido += subtotalItem;
        }
        pedidoIdToSubtotal.set(pedido.id, subtotalPedido);
      }
    }

    // Obtener descuentos de juegos
    const descuentos: DescuentoJuego[] = [];
    console.log('🚫🚫🚫🚫CUENTA/DETALLE🚫🚫🚫🚫');
    console.log('[DEBUG DESCUENTOS] === OBTENIENDO DESCUENTOS DE JUEGOS ===');
      console.log('[DEBUG DESCUENTOS] Pedidos encontrados:', pedidos?.length || 0);
      
      // Buscar descuentos aplicados en los pedidos del cliente
      for (const pedido of pedidos) {
        console.log('[DEBUG DESCUENTOS] Procesando pedido ID:', pedido.id);
        console.log('[DEBUG DESCUENTOS] Pedido completo:', pedido);
        console.log('[DEBUG DESCUENTOS] descuento_pct:', pedido.descuento_pct);
        console.log('[DEBUG DESCUENTOS] descuento_fuente:', pedido.descuento_fuente);
        console.log('[DEBUG DESCUENTOS] juego_premio_reclamado:', pedido.juego_premio_reclamado);
        
        if (pedido.descuento_pct && pedido.descuento_pct > 0) {
          // Descuento calculado sobre el subtotal del pedido puntual
          const basePedido = pedidoIdToSubtotal.get(pedido.id) ?? 0;
          const montoDescuento = (basePedido * pedido.descuento_pct) / 100;
          descuentos.push({
            juego: pedido.descuento_fuente || 'juego',
            descuento_pct: pedido.descuento_pct,
            monto_descuento: montoDescuento
          });
          console.log('[DEBUG DESCUENTOS] ✅ Descuento encontrado en pedido:', {
            pedido_id: pedido.id,
            descuento_pct: pedido.descuento_pct,
            descuento_fuente: pedido.descuento_fuente,
            subtotal: pedidoIdToSubtotal.get(pedido.id) ?? 0,
            monto_descuento: montoDescuento
          });
        } else {
          console.log('[DEBUG DESCUENTOS] ⚠️ Pedido sin descuento aplicado');
        }
      }
      
      console.log('[DEBUG DESCUENTOS] Descuentos totales encontrados:', descuentos);
      console.log('🚫🚫🚫🚫CUENTA/DETALLE🚫🚫🚫🚫');

      // 🆕 Crear objeto cuenta según tipo (mesa o delivery)
      if (this.esDelivery) {
        this.cuenta = {
          pedidos: pedidosDetalle,
          descuentos,
          propina_pct: 0,
          propina_monto: 0,
          subtotal,
          total: subtotal,
          pedido_delivery_id: this.pedidoDeliveryId || undefined
        };
      } else {
        this.cuenta = {
          pedidos: pedidosDetalle,
          descuentos,
          propina_pct: 0,
          propina_monto: 0,
          subtotal,
          total: subtotal,
          numero_mesa: this.numeroMesa || 0
        };
      }

      this.actualizarTotales();

    } catch (error: any) {
      console.error('Error al cargar detalle de cuenta:', error);
      this.toast.error((error?.message || 'ERROR AL CARGAR LA CUENTA').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      this.router.navigate(['/home-cliente']);
    } finally {
      this.loading = false;
      this.spinner.hide();
    }
  }

  async escanearQRPropina() {
    try {
      console.log('🚫🚫🚫🚫PROPINA🚫🚫🚫🚫');
      console.log('[DEBUG] Iniciando escaneo de QR de propina...');
      const raw = await this.qrHtml5.scanOnce();
      console.log('[DEBUG] QR raw leído:', raw);
      if (!raw) return;

      const payload = this.qrHtml5.parse(raw);
      console.log('[DEBUG] Payload parseado:', payload);
      console.log('[DEBUG] Tipo de payload:', payload?.t);
      console.log('[DEBUG] Porcentaje:', (payload as any)?.pct);

      if (!payload || payload.t !== 'propina') {
        console.log('[DEBUG] ❌ QR no válido - payload:', payload);
        this.toast.warning('QR DE PROPINA NO VÁLIDO', '', {
          positionClass: 'toast-center',
          timeOut: 3000
        });
        return;
      }

      this.propinaSeleccionada = (payload as any).pct || 0;
      console.log('[DEBUG] ✅ Propina aplicada:', this.propinaSeleccionada);
      
      // FORZAR ACTUALIZACIÓN DE TOTALES
      this.actualizarTotales();
      
      // VERIFICAR QUE SE ACTUALIZÓ
      console.log('[DEBUG] ✅ Verificación final - Propina seleccionada:', this.propinaSeleccionada);
      console.log('[DEBUG] ✅ Verificación final - Total final:', this.totalFinal);
      console.log('🚫🚫🚫🚫PROPINA🚫🚫🚫🚫');
      
      this.toast.success(`PROPINA DEL ${this.propinaSeleccionada}% APLICADA`, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });

    } catch (error: any) {
      console.error('[DEBUG] ❌ Error al escanear QR de propina:', error);
      this.toast.error('ERROR AL ESCANEAR QR DE PROPINA', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    }
  }

  actualizarTotales() {
    if (!this.cuenta) return;

    console.log('[DEBUG TOTALES] === ACTUALIZANDO TOTALES ===');
    console.log('[DEBUG TOTALES] Subtotal:', this.cuenta.subtotal);
    console.log('[DEBUG TOTALES] Propina seleccionada:', this.propinaSeleccionada);
    console.log('[DEBUG TOTALES] Descuentos:', this.cuenta.descuentos);

    const descuentosTotal = this.cuenta.descuentos.reduce((sum, d) => sum + d.monto_descuento, 0);
    console.log('[DEBUG TOTALES] Descuentos total:', descuentosTotal);

    // Base para propina = subtotal - descuentos
    const baseParaPropina = Math.max(0, this.cuenta.subtotal - descuentosTotal);
    console.log('[DEBUG TOTALES] Base para propina:', baseParaPropina);

    // Calcular propina sobre la base (descuento ya aplicado)
    this.propinaMonto = (baseParaPropina * this.propinaSeleccionada) / 100;
    console.log('[DEBUG TOTALES] Propina monto calculado:', this.propinaMonto);
    
    // Calcular total final = base + propina
    this.totalFinal = baseParaPropina + this.propinaMonto;
    console.log('[DEBUG TOTALES] Total final calculado:', this.totalFinal);

    // Actualizar objeto cuenta
    this.cuenta.propina_pct = this.propinaSeleccionada;
    this.cuenta.propina_monto = this.propinaMonto;
    this.cuenta.total = this.totalFinal;
    
    console.log('[DEBUG TOTALES] Cuenta actualizada:', {
      propina_pct: this.cuenta.propina_pct,
      propina_monto: this.cuenta.propina_monto,
      total: this.cuenta.total
    });
  }

  async realizarPago() {
    if (!this.cuenta) return;

    try {
      const uid = await this.supa.getUserIdOrThrow();
      
      this.spinner.show({ immediate: true });
      
      // 🆕 Si es repartidor, usar lógica diferente
      if (this.esDelivery && this.pedidoDeliveryId) {
        console.log('[ClienteDetalleCuenta] Realizando pago para repartidor:', this.pedidoDeliveryId);
        
        // Marcar el pedido repartidor como "pendiente de confirmación de pago" y guardar propina
        const { error: updateError } = await this.supa.client
          .from('pedidos')
          .update({ 
            estado: 'pendiente confirmacion pago',
            propina_pct: this.propinaSeleccionada,
            propina_monto: this.propinaMonto,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.pedidoDeliveryId)
          .eq('tipo_pedido', 'delivery');

        if (updateError) throw updateError;

        // 🆕 Notificar al admin (no al mozo) sobre el pago repartidor realizado
        const adminChannel = this.supa.client.channel('notificacion_admin_delivery');
        await adminChannel.send({
          type: 'broadcast',
          event: 'solicitud_cuenta_delivery',
          payload: {
            pedido_id: this.pedidoDeliveryId,
            mensaje: `REPARTIDOR #${this.pedidoDeliveryId} SOLICITA CONFIRMACIÓN DE PAGO`,
            timestamp: new Date().toISOString()
          }
        });

        this.toast.success('PAGO REALIZADO. ESPERANDO CONFIRMACIÓN DEL ADMINISTRADOR', '', {
          positionClass: 'toast-center',
          timeOut: 4000
        });
        
        // Navegar de vuelta al home
        this.router.navigate(['/home-cliente']);
        this.spinner.hide();
        return;
      }

      // Para pedidos de mesa, usar el flujo original
      const waitStatus = await this.supa.getWaitStatusDetail();
      if (!waitStatus || !waitStatus.numero_mesa) {
        throw new Error('NO SE PUDO OBTENER INFORMACIÓN DE LA MESA');
      }

      // Obtener pedidos del cliente para marcarlos como pagados
      const { data: pedidos, error: pedidosError } = await this.supa.client
        .from('pedidos')
        .select('id')
        .eq('idCliente', uid)
        .or('tipo_pedido.is.null,tipo_pedido.eq.mesa')
        .in('estado', ['pendiente', 'entregado', 'listo para entregar', 'en preparación', 'pendiente confirmacion pago']);

      if (pedidosError) throw pedidosError;

      if (!pedidos || pedidos.length === 0) {
        throw new Error('NO SE ENCONTRARON PEDIDOS PARA PAGAR');
      }

      // Marcar todos los pedidos como "pendiente de confirmación de pago" y guardar propina
      const { error: updateError } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'pendiente confirmacion pago',
          propina_pct: this.propinaSeleccionada,
          propina_monto: this.propinaMonto,
          updated_at: new Date().toISOString()
        })
        .in('id', pedidos.map(p => p.id));

      if (updateError) throw updateError;

      // Enviar notificación al mozo sobre el pago realizado
      await this.supa.solicitarCuenta(waitStatus.numero_mesa);
      
      this.toast.success('PAGO REALIZADO. ESPERANDO CONFIRMACIÓN DEL MOZO', '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
      
      // Navegar de vuelta al home
      this.router.navigate(['/home-cliente']);

    } catch (error: any) {
      console.error('Error al realizar pago:', error);
      this.toast.error('ERROR AL REALIZAR EL PAGO: ' + (error?.message || 'ERROR INESPERADO').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.spinner.hide();
    }
  }

  volver() {
    this.router.navigate(['/home-cliente']);
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

  getTotalDescuentos(): number {
    if (!this.cuenta) return 0;
    return this.cuenta.descuentos.reduce((sum, d) => sum + d.monto_descuento, 0);
  }
}
