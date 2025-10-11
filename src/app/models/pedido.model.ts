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

export interface PedidoConMesaYDetalles {
  id: number;
  created_at: string;
  idCliente: number;
  estado: string;
  lista_espera: { numero_mesa: number }[];
  pedidos_detalles: {
    cantidad: number;
    menu: { nombre: string; tipo: string; sector: string };
  }[];
}