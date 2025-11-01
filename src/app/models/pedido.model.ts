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

export interface Reserva {
  id?: number;
  usuario_id: string;
  fecha: string;
  hora: string;
  cantidad_comensales: number;
  nota?: string;
  estado: 'pendiente confirmacion' | 'confirmada' | 'rechazada' | 'cancelada';
  created_at?: string;
  updated_at?: string;
  nombre_cliente?: string;
  email_cliente?: string;
}