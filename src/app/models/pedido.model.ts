export interface PedidoDetalle {
  idProducto: number;
  cantidad: number;
  precioUnitario: number;
  nombreProducto?: string;
}

export interface Pedido {
  id: number;
  estado: string;
  created_at: string;
  detalles: PedidoDetalle[];
}
