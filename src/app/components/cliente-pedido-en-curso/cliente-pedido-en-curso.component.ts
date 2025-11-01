// import { CommonModule } from '@angular/common';
// import { Component, OnInit } from '@angular/core';
// import { IonicModule } from '@ionic/angular';
// import { RouterModule } from '@angular/router';

// @Component({
//   selector: 'app-cliente-pedido-en-curso',
//   templateUrl: './cliente-pedido-en-curso.component.html',
//   styleUrls: ['./cliente-pedido-en-curso.component.scss'],
//   standalone: true,
//   imports: [CommonModule, IonicModule, RouterModule],
// })
// export class ClientePedidoEnCursoComponent implements OnInit {
//   constructor(
//   ) {}

//   ngOnInit() {}

//   confirmarPedido() {

//   }
// }
// ClientePedidoEnCursoComponent.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { MenuService } from 'src/app/services/menu.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { ToastrService } from 'ngx-toastr';
import { PedidosService } from 'src/app/services/pedidos.service';

@Component({
  selector: 'app-cliente-pedido-en-curso',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './cliente-pedido-en-curso.component.html',
  styleUrls: ['./cliente-pedido-en-curso.component.scss'],
})
export class ClientePedidoEnCursoComponent implements OnInit, OnDestroy {
  hasPedido = false;
  estado = '—';
  total = 0;
  tiempo = 0;
  pedidoId?: number;
  yaCompletoEncuesta = false;
  yaRealizoPedido = false; // Nueva propiedad para rastrear si ya realizó un pedido
  yaSeAplicoDescuento = false; // Nueva propiedad para rastrear si ya se aplicó descuento
  esClienteAnonimo = false; // Nueva propiedad para verificar si es cliente anónimo
  

  private channel?: { unsubscribe?: () => void };

// constructor(private router: Router, private menu: MenuService) {
//   const st = this.router.getCurrentNavigation()?.extras?.state as any;
//   if (st?.pedidoId !== undefined && Number.isFinite(+st.pedidoId)) {
//     this.applyResumen({
//       id: +st.pedidoId,
//       estado: 'pendiente',
//       total: Number(st.total ?? 0),
//       tiempoEstimado: Number(st.tiempo ?? 0),
//       created_at: new Date().toISOString(),
//     });
//   }
// }
  constructor(
    private router: Router, 
    private menu: MenuService,
    private supa: SupabaseService,
    private toast: ToastrService,
    private pedidosSvc: PedidosService
  ) {
    console.log('[ClientePedidoEnCurso] 🔧 Constructor ejecutado');
    
    // ✅ Esto funciona incluso si recargás la página
    const st: any = history.state;
    console.log('[ClientePedidoEnCurso] 📋 History state:', st);
    
    if (st?.pedidoId != null && Number.isFinite(+st.pedidoId)) {
      console.log('[ClientePedidoEnCurso] ✅ PedidoId encontrado en state:', st.pedidoId);
      this.applyResumen({
        id: +st.pedidoId,
        estado: 'pendiente',
        total: Number(st.total ?? 0),
        tiempoEstimado: Number(st.tiempo ?? 0),
        created_at: new Date().toISOString(),
      });
    } else {
      console.log('[ClientePedidoEnCurso] ❌ No hay pedidoId en state');
    }
    
    // Si no hay pedidoId, intentar obtener el último pedido del cliente
    if (!this.pedidoId) {
      console.log('[ClientePedidoEnCurso] 🔍 Intentando obtener último pedido...');
      this.menu.getUltimoPedidoDelActual().then(ultimoPedido => {
        if (ultimoPedido) {
          console.log('[ClientePedidoEnCurso] ✅ Último pedido encontrado:', ultimoPedido);
          this.applyResumen(ultimoPedido);
        } else {
          console.log('[ClientePedidoEnCurso] ❌ No hay pedidos para este cliente');
        }
      }).catch(error => {
        console.error('[ClientePedidoEnCurso] ❌ Error al obtener último pedido:', error);
      });
    }
  }

  //async ngOnInit() {
    // // 1) Tomar datos si llegaron por router state
    // const st: any = history.state;
    // if (st?.pedidoId) {
    //   this.pedidoId = st.pedidoId;
    //   this.total = Number(st.total ?? 0);
    //   this.tiempo = Number(st.tiempo ?? 0);
    //   this.estado = 'pendiente';
    // } else {
    //   // 2) Si entró directo: traer el último pedido del cliente
    //   const res = await this.menu.getUltimoPedidoDeCliente(this.idCliente);
    //   if (res) {
    //     this.pedidoId = res.id;
    //     this.total = Number(res.total ?? 0);
    //     this.tiempo = Number(res.tiempoEstimado ?? 0);
    //     this.estado = res.estado ?? '—';
    //   }
    // }

    // // 3) Suscripción realtime a cambios del pedido (encabezado y detalles)
    // if (this.pedidoId) {
    //   this.channel = this.menu.onPedidoChange(this.pedidoId, (r) => {
    //     this.total = r.total ?? this.total;
    //     this.tiempo = r.tiempoEstimado ?? this.tiempo;
    //     this.estado = r.estado ?? this.estado;
    //   });
    // } const st: any = history.state;
 // 1) Si venimos con state desde "realiza pedido"
    // 1) Si venimos con state desde "realiza pedido"
 // 2) si NO vino state (ej: refresh o entrada directa), preguntar a supabase
  
 
 
//  if (!this.pedidoId) {
//       const res = await this.menu.getUltimoPedidoDelActual();
//       if (res) this.applyResumen(res);
//       else this.clearResumen();
//     }

//     // 3) realtime
// if (this.pedidoId != null && Number.isFinite(this.pedidoId)) {
//   this.channel = this.menu.onPedidoChange(this.pedidoId, r => this.applyResumen(r));
// }

 // }
async ngOnInit() {
    await this.ensureResumenAndSubscribe();
  }

  // ✅ Se llama cada vez que la pantalla vuelve a foco (navegación “para atrás”, tabs, etc.)
  async ionViewWillEnter() {
    await this.ensureResumenAndSubscribe(true); // true = forzar refresco del server
  }

  ngOnDestroy() {
    this.channel?.unsubscribe?.();
  }

  private async ensureResumenAndSubscribe(forceServer = false) {
    // Verificar perfil del usuario
    await this.verificarPerfilUsuario();
    
    // Si no tenemos pedidoId (o queremos refrescar), pedimos el último al server
    if (!Number.isFinite(this.pedidoId as any) || forceServer) {
      const res = await this.menu.getUltimoPedidoDelActual();
      if (res) this.applyResumen(res);
      else this.clearResumen();
    }

    // Verificar si ya completó la encuesta
    await this.verificarEstadoEncuesta();

    // Suscripción realtime solo si hay id válido
    if (Number.isFinite(this.pedidoId as any)) {
      // cortar suscripción previa si existiera
      this.channel?.unsubscribe?.();
      this.channel = this.menu.onPedidoChange(this.pedidoId!, r => this.applyResumen(r));
    }
  }

  private applyResumen(r: { id: number; estado: string; total: number; tiempoEstimado: number; created_at: string; descuento_aplicado?: boolean }) {
    this.pedidoId = r.id;
    this.estado = r.estado ?? '—';
    this.total = r.total ?? 0;
    this.tiempo = r.tiempoEstimado ?? 0;
    this.yaSeAplicoDescuento = !!r.descuento_aplicado;

    // Si hay un pedido con ID, significa que ya realizó un pedido
    if (this.pedidoId && Number.isFinite(this.pedidoId)) {
      this.yaRealizoPedido = true;
      
      // ✅ ACTUALIZAR PedidosService para que los juegos estén habilitados
      this.pedidosSvc.setPedidoActual({ id: this.pedidoId });
    }

    // Estados que se consideran "finalizados" (cliente no puede hacer más acciones)
    // 'rechazado por mozo' NO está incluido porque el cliente puede editarlo
    const finalizados = ['pagado', 'finalizado', 'cancelado', 'entregado', 'rechazado'];
    this.hasPedido = !finalizados.includes((this.estado || '').toLowerCase());
  }

  private clearResumen() {
    this.pedidoId = undefined;
    this.estado = '—';
    this.total = 0;
    this.tiempo = 0;
    this.hasPedido = false;
    this.yaRealizoPedido = false;
    this.yaSeAplicoDescuento = false;
    
    // ✅ LIMPIAR PedidosService cuando no hay pedido
    this.pedidosSvc.setPedidoActual(null);
  }

  private async verificarPerfilUsuario() {
    try {
      const userProfile = await this.supa.getUserProfile();
      this.esClienteAnonimo = userProfile?.perfil === 'clienteAnon';
      console.log('[DEBUG CLIENTE-PEDIDO-EN-CURSO] Perfil del usuario:', userProfile?.perfil, 'esClienteAnonimo:', this.esClienteAnonimo);
    } catch (error) {
      console.error('Error al verificar perfil del usuario:', error);
      this.esClienteAnonimo = false;
    }
  }

  private async verificarEstadoEncuesta() {
    try {
      this.yaCompletoEncuesta = await this.supa.yaCompletoEncuesta();
    } catch (error) {
      console.error('Error al verificar estado de encuesta:', error);
      this.yaCompletoEncuesta = false;
    }
  }

  async aceptarPedido() {
    if (!this.pedidoId) return;

    try {
      console.log(`[ClientePedidoEnCursoComponent] Aceptando pedido ${this.pedidoId}...`);
      
      // Actualizar el estado del pedido a 'entregado'
      const { error } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'entregado',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.pedidoId);

      if (error) {
        console.error('Error al aceptar el pedido:', error);
        alert('Error al aceptar el pedido: ' + (error.message || 'Error desconocido'));
        return;
      }

      console.log(`[ClientePedidoEnCursoComponent] ✅ Pedido ${this.pedidoId} aceptado`);
      
      // Actualizar el estado local
      this.estado = 'entregado';
      
    } catch (error: any) {
      console.error('[ClientePedidoEnCursoComponent] Error al aceptar pedido:', error);
      alert('Error al aceptar el pedido: ' + (error?.message || 'Error desconocido'));
    }
  }

  async rechazarPedido() {
    if (!this.pedidoId) return;

    const confirmacion = confirm('¿Estás seguro de que quieres rechazar este pedido?');
    if (!confirmacion) return;

    try {
      console.log(`[ClientePedidoEnCursoComponent] Rechazando pedido ${this.pedidoId}...`);
      
      // Actualizar el estado del pedido a 'rechazado'
      const { error } = await this.supa.client
        .from('pedidos')
        .update({ 
          estado: 'rechazado',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.pedidoId);

      if (error) {
        console.error('Error al rechazar el pedido:', error);
        alert('Error al rechazar el pedido: ' + (error.message || 'Error desconocido'));
        return;
      }

      console.log(`[ClientePedidoEnCursoComponent] ✅ Pedido ${this.pedidoId} rechazado`);
      
      // Actualizar el estado local
      this.estado = 'rechazado';
      this.hasPedido = false;
      
    } catch (error: any) {
      console.error('[ClientePedidoEnCursoComponent] Error al rechazar pedido:', error);
      alert('Error al rechazar el pedido: ' + (error?.message || 'Error desconocido'));
    }
  }

  async pedirCuenta() {
    try {
      // Obtener información de la mesa
      const waitStatus = await this.supa.getWaitStatusDetail();
      if (!waitStatus || !waitStatus.numero_mesa) {
        throw new Error('No se pudo obtener información de la mesa');
      }

      // Enviar notificación al mozo
      await this.supa.solicitarCuenta(waitStatus.numero_mesa);
      this.toast.success('Solicitud de cuenta enviada al mozo');

      // Navegar al detalle de cuenta
      this.router.navigate(['/cliente-detalle-cuenta']);
      
    } catch (error: any) {
      console.error('Error al solicitar cuenta:', error);
      this.toast.error(error?.message || 'Error al solicitar la cuenta');
    }
  }

  irAEncuestas() {
    this.router.navigate(['/form-encuesta']);
  }

  irAPago() {
    // TODO: Implementar navegación a pago
    alert('Funcionalidad de pago en desarrollo');
  }

  irARealizarPedido() {
  this.router.navigate(['/cliente/cliente-realiza-pedido']);
}
async irAChat() {
  console.log('[irAChat] 🚀 Método iniciado');
  
  // 🔧 Obtener el número de mesa desde lista_espera
  try {
    console.log('[irAChat] 🔍 Obteniendo usuario...');
    const userId = (await this.menu.getClienteIdActual());
    console.log('[irAChat] 👤 Usuario ID:', userId);
    
    const { data: waitRow } = await this.supa.client
      .from('lista_espera')
      .select('mesa_id')
      .eq('usuario_id', userId)
      .eq('estado', 'asignado')
      .single();

    console.log('[irAChat] 📍 WaitRow:', waitRow);

    if (waitRow?.mesa_id) {
      console.log('[irAChat] 🏠 Mesa ID encontrado:', waitRow.mesa_id);
      
      // Obtener número de mesa
      const { data: mesa } = await this.supa.client
        .from('mesas')
        .select('numero')
        .eq('id', waitRow.mesa_id)
        .single();

      console.log('[irAChat] 🏠 Datos mesa:', mesa);
      const mesaNumero = mesa?.numero ?? 0;
      console.log('[irAChat] 🔢 Número mesa:', mesaNumero);
      
      // Navegar con el número de mesa como query param
      // Usar pedidoId si existe, sino usar 0 como placeholder
      const pedidoIdParaChat = this.pedidoId || 0;
      console.log('[irAChat] 🚀 Navegando con mesa:', mesaNumero, 'pedidoId:', pedidoIdParaChat);
      this.router.navigate(['/cliente/chat', pedidoIdParaChat], {
        queryParams: { mesa: mesaNumero }
      });
    } else {
      console.log('[irAChat] ⚠️ Sin mesa asignada');
      // No tiene mesa asignada, navegar sin número
      const pedidoIdParaChat = this.pedidoId || 0;
      this.router.navigate(['/cliente/chat', pedidoIdParaChat], {
        queryParams: { mesa: 0 }
      });
    }
  } catch (e) {
    console.error('[irAChat] ❌ Error:', e);
    // Navegar de todas formas
    const pedidoIdParaChat = this.pedidoId || 0;
    this.router.navigate(['/cliente/chat', pedidoIdParaChat], {
      queryParams: { mesa: 0 }
    });
  }
}

editarPedidoRechazado() {
  // Navegar al componente de realizar pedido con el ID del pedido rechazado
  // para que pueda modificarlo
  this.router.navigate(['/cliente/cliente-realiza-pedido'], {
    queryParams: { 
      editar: true, 
      pedidoId: this.pedidoId 
    }
  });
  
  // Marcar que ya no necesita editar (el botón se ocultará)
  // Esto se actualizará cuando regrese con el nuevo pedido
}

}
