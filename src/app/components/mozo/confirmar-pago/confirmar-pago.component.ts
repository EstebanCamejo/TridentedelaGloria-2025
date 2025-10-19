import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonList, IonIcon, IonLoading, IonBadge, IonRefresher, IonRefresherContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, timeOutline, receiptOutline } from 'ionicons/icons';
import { ToastrService } from 'ngx-toastr';
import { SupabaseService } from 'src/app/services/supabase.service';
import { MozoRealtimeService } from 'src/app/services/mozo-realtime.service';

interface PagoPendiente {
  id: number;
  numero_mesa: number;
  cliente_nombre: string;
  total: number;
  propina_monto: number;
  propina_pct: number;
  fecha_solicitud: string;
  pedidos: Array<{
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

@Component({
  selector: 'app-confirmar-pago',
  standalone: true,
  templateUrl: './confirmar-pago.component.html',
  styleUrls: ['./confirmar-pago.component.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonButton, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonList, IonIcon, IonLoading,
    IonBadge, IonRefresher, IonRefresherContent
  ]
})
export class ConfirmarPagoComponent implements OnInit, OnDestroy {
  loading = true;
  pagosPendientes: PagoPendiente[] = [];
  confirmandoPago: { [key: number]: boolean } = {};

  constructor(
    private supa: SupabaseService,
    private toast: ToastrService,
    private router: Router,
    private mozoRt: MozoRealtimeService
  ) {
    addIcons({ checkmarkCircleOutline, timeOutline, receiptOutline });
  }

  async ngOnInit() {
    await this.cargarPagosPendientes();
    this.suscribirseAPagos();
  }

  ngOnDestroy() {
    // Limpiar suscripciones si es necesario
  }

  async cargarPagosPendientes() {
    try {
      this.loading = true;
      
      // Obtener pedidos con estado 'pendiente confirmacion pago' que esperan confirmación
      const { data: pedidos, error } = await this.supa.client
        .from('pedidos')
        .select(`
          id,
          total,
          created_at,
          idCliente,
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Procesar pedidos y agrupar por cliente
      const pagosPorCliente = new Map<string, PagoPendiente>();

      for (const pedido of pedidos || []) {
        const clienteId = pedido.idCliente;
        
        if (!pagosPorCliente.has(clienteId)) {
          // Obtener información del cliente y mesa
          const { data: listaEspera } = await this.supa.client
            .from('lista_espera')
            .select('numero_mesa')
            .eq('usuario_id', clienteId)
            .eq('estado', 'asignado')
            .single();

          const { data: usuario } = await this.supa.client
            .from('usuarios')
            .select('nombres, apellidos')
            .eq('id', clienteId)
            .single();

          pagosPorCliente.set(clienteId, {
            id: pedido.id,
            numero_mesa: listaEspera?.numero_mesa || 0,
            cliente_nombre: `${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim() || 'Cliente',
            total: pedido.total || 0,
            propina_monto: 0, // TODO: Implementar cálculo de propina
            propina_pct: 0,
            fecha_solicitud: pedido.created_at,
            pedidos: []
          });
        }

        const pago = pagosPorCliente.get(clienteId)!;
        
        // Agregar detalles del pedido
        for (const detalle of pedido.pedidos_detalles || []) {
          pago.pedidos.push({
            nombre: detalle.menu?.[0]?.nombre || 'Producto',
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precioUnitario,
            subtotal: detalle.cantidad * detalle.precioUnitario
          });
        }
      }

      this.pagosPendientes = Array.from(pagosPorCliente.values());

    } catch (error: any) {
      console.error('Error al cargar pagos pendientes:', error);
      this.toast.error('Error al cargar pagos pendientes');
    } finally {
      this.loading = false;
    }
  }

  async confirmarPago(pago: PagoPendiente) {
    try {
      this.confirmandoPago[pago.id] = true;

      // 🚩 ACTIVAR BANDERA: Bloquear notificaciones del mozo durante la confirmación
      this.mozoRt.setMozoConfirmandoPago(true);
      console.log('[ConfirmarPagoComponent] 🚩 Bandera activada - bloqueando notificaciones del mozo');

      // 1. Marcar pedidos como pagados y confirmados (cambiar estado a 'pagado')
      const { error: updateError } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'pagado',
          updated_at: new Date().toISOString()
        })
        .eq('id', pago.id);

      if (updateError) throw updateError;

      // 2. Liberar mesa (cambiar estado en lista_espera a 'finalizado')
      const { error: liberarError } = await this.supa.client
        .from('lista_espera')
        .update({ 
          estado: 'finalizado',
          updated_at: new Date().toISOString()
        })
        .eq('numero_mesa', pago.numero_mesa)
        .eq('estado', 'asignado');

      if (liberarError) throw liberarError;

      // 3. Marcar mesa como libre
      const { error: mesaError } = await this.supa.client
        .from('mesas')
        .update({ 
          estado: 'libre',
          updated_at: new Date().toISOString()
        })
        .eq('numero', pago.numero_mesa);

      if (mesaError) throw mesaError;

      // Remover de la lista
      this.pagosPendientes = this.pagosPendientes.filter(p => p.id !== pago.id);

      this.toast.success(`Pago confirmado para Mesa ${pago.numero_mesa}. Mesa liberada.`);

      // 4. Enviar notificaciones push
      await this.enviarNotificacionesPago(pago);

    } catch (error: any) {
      console.error('Error al confirmar pago:', error);
      this.toast.error('Error al confirmar el pago');
    } finally {
      this.confirmandoPago[pago.id] = false;
      
      // 🚩 DESACTIVAR BANDERA: Reactivar notificaciones del mozo después de un delay
      setTimeout(() => {
        this.mozoRt.setMozoConfirmandoPago(false);
        console.log('[ConfirmarPagoComponent] 🚩 Bandera desactivada - reactivando notificaciones del mozo');
      }, 360000); // 6 minutos de delay para asegurar que no se envíen notificaciones
    }
  }

  async enviarNotificacionesPago(pago: PagoPendiente) {
    try {
      console.log('[ConfirmarPagoComponent] Enviando notificaciones de pago confirmado...');

      // 1. Notificar al cliente via realtime channel
      const clienteChannel = this.supa.client.channel('notificacion_cliente_pago');
      await clienteChannel.send({
        type: 'broadcast' as const,
        event: 'pago_confirmado',
        payload: {
          mesa_numero: pago.numero_mesa,
          mensaje: 'Tu pago ha sido confirmado. ¡Gracias por tu visita!',
          timestamp: new Date().toISOString()
        }
      });

      // 2. Notificar a dueño y supervisor via realtime channel
      const adminChannel = this.supa.client.channel('notificacion_admin_pago');
      console.log('[ConfirmarPagoComponent] Enviando broadcast a admin channel:', adminChannel);
      
      const adminPayload = {
        type: 'broadcast' as const,
        event: 'mesa_liberada',
        payload: {
          mesa_numero: pago.numero_mesa,
          mensaje: `Mesa ${pago.numero_mesa} realizó el pago y está liberada`,
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('[ConfirmarPagoComponent] Payload para admin:', adminPayload);
      await adminChannel.send(adminPayload);

      console.log('[ConfirmarPagoComponent] ✅ Notificaciones enviadas correctamente');

    } catch (error) {
      console.error('[ConfirmarPagoComponent] Error al enviar notificaciones:', error);
    }
  }

  async liberarMesa(numeroMesa: number) {
    try {
      // Buscar la entrada en lista_espera
      const { data: waitEntry, error: waitError } = await this.supa.client
        .from('lista_espera')
        .select('id, mesa_id')
        .eq('numero_mesa', numeroMesa)
        .eq('estado', 'asignado')
        .single();

      if (waitError || !waitEntry) {
        console.error('Error al encontrar entrada de lista de espera:', waitError);
        return;
      }

      // Marcar como finalizado
      await this.supa.client
        .from('lista_espera')
        .update({ 
          estado: 'finalizado',
          updated_at: new Date().toISOString()
        })
        .eq('id', waitEntry.id);

      // Liberar mesa
      await this.supa.client
        .from('mesas')
        .update({ 
          estado: 'libre',
          updated_at: new Date().toISOString()
        })
        .eq('id', waitEntry.mesa_id);

      console.log(`✅ Mesa ${numeroMesa} liberada exitosamente`);

    } catch (error) {
      console.error('Error al liberar mesa:', error);
    }
  }

  async handleRefresh(event: any) {
    await this.cargarPagosPendientes();
    event.target.complete();
  }

  suscribirseAPagos() {
    // Suscribirse a cambios en pedidos con estado 'pagado'
    const channel = this.supa.client.channel('confirmar-pago-realtime');
    
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: 'estado=eq.pendiente confirmacion pago'
      }, async (payload) => {
        console.log('[ConfirmarPagoComponent] Cambio detectado en pedidos pagados:', payload);
        
        // Recargar la lista de pagos pendientes
        await this.cargarPagosPendientes();
      })
      .subscribe((status) => {
        console.log('[ConfirmarPagoComponent] Canal suscrito con estado:', status);
      });
  }

  volver() {
    this.router.navigate(['/home-mozo']);
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
}
