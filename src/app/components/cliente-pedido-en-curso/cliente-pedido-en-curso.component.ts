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
  constructor(private router: Router, private menu: MenuService) {
    // ✅ Esto funciona incluso si recargás la página
    const st: any = history.state;
    if (st?.pedidoId != null && Number.isFinite(+st.pedidoId)) {
      this.applyResumen({
        id: +st.pedidoId,
        estado: 'pendiente',
        total: Number(st.total ?? 0),
        tiempoEstimado: Number(st.tiempo ?? 0),
        created_at: new Date().toISOString(),
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
    // Si no tenemos pedidoId (o queremos refrescar), pedimos el último al server
    if (!Number.isFinite(this.pedidoId as any) || forceServer) {
      const res = await this.menu.getUltimoPedidoDelActual();
      if (res) this.applyResumen(res);
      else this.clearResumen();
    }

    // Suscripción realtime solo si hay id válido
    if (Number.isFinite(this.pedidoId as any)) {
      // cortar suscripción previa si existiera
      this.channel?.unsubscribe?.();
      this.channel = this.menu.onPedidoChange(this.pedidoId!, r => this.applyResumen(r));
    }
  }

  private applyResumen(r: { id: number; estado: string; total: number; tiempoEstimado: number; created_at: string }) {
    this.pedidoId = r.id;
    this.estado = r.estado ?? '—';
    this.total = r.total ?? 0;
    this.tiempo = r.tiempoEstimado ?? 0;

    const finalizados = ['pagado', 'finalizado', 'cancelado'];
    this.hasPedido = !finalizados.includes((this.estado || '').toLowerCase());
  }

  private clearResumen() {
    this.pedidoId = undefined;
    this.estado = '—';
    this.total = 0;
    this.tiempo = 0;
    this.hasPedido = false;
  }

  irARealizarPedido() {
  if (this.hasPedido) return;                // no navegar si hay uno activo
  this.router.navigate(['/cliente/cliente-realiza-pedido']);
}
irAChat() {
  if (!this.pedidoId) {
    // opcional: mostrar toast “no tenés pedido activo”
    return;
  }
  this.router.navigate(['/cliente/chat', this.pedidoId]); // <-- usa tu ChatComponent
}

}
