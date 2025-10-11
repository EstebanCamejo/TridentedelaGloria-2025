import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Pedido = { id: number /* +otros campos si querés */ };

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private _pedidoActual$ = new BehaviorSubject<Pedido | null>(null);
  pedidoActual$ = this._pedidoActual$.asObservable();

  setPedidoActual(p: Pedido | null) { this._pedidoActual$.next(p); }
  getPedidoActualSync() { return this._pedidoActual$.value; }
}
