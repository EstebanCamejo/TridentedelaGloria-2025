import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Reserva {
  id?: number;
  usuario_id: string;
  fecha: string; // ISO string
  hora: string; // formato HH:mm
  cantidad_comensales: number;
  nota?: string | null;
  estado: 'pendiente confirmacion' | 'confirmada' | 'rechazada' | 'cancelada';
  motivo_rechazo?: string | null;
  nombre_cliente?: string;
  email_cliente?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservasService {

  constructor(private supa: SupabaseService) { }

  /**
   * Crea una nueva reserva
   */
  async crearReserva(reserva: Omit<Reserva, 'id' | 'created_at' | 'updated_at'>): Promise<Reserva> {
    let nombreCliente = 'Cliente';
    let emailCliente = 'Sin email';

    try {
      console.log('🔍 Debug - Buscando usuario con auth_id:', reserva.usuario_id);
      console.log('🔍 Debug - Tipo de usuario_id:', typeof reserva.usuario_id);
      
      // Intentar obtener datos del usuario usando el auth_id
      const { data: usuario, error: errorUsuario } = await this.supa.client
        .from('usuarios')
        .select('nombres, apellidos, email')
        .eq('auth_id', reserva.usuario_id)
        .single();

      if (usuario && !errorUsuario) {
        nombreCliente = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || 'Cliente';
        emailCliente = usuario.email || 'Sin email';
        console.log('✅ Datos del usuario obtenidos:', { nombreCliente, emailCliente });
      } else {
        console.warn('⚠️ No se pudieron obtener datos del usuario, usando valores por defecto:', errorUsuario);
      }
    } catch (error) {
      console.warn('⚠️ Error al obtener datos del usuario, usando valores por defecto:', error);
    }

    // Crear la reserva con los datos del usuario (o valores por defecto)
    const reservaConDatosUsuario = {
      ...reserva,
      nombre_cliente: nombreCliente,
      email_cliente: emailCliente
    };

    console.log('📝 Creando reserva con datos:', reservaConDatosUsuario);

    const { data, error } = await this.supa.client
      .from('reservas')
      .insert([reservaConDatosUsuario])
      .select()
      .single();

    if (error) {
      console.error('❌ Error al crear reserva:', error);
      throw error;
    }

    console.log('✅ Reserva creada exitosamente:', data);
    return data as Reserva;
  }

  /**
   * Obtiene todas las reservas activas de un usuario
   */
  async obtenerReservasUsuario(usuarioId: string): Promise<Reserva[]> {
    const { data, error } = await this.supa.client
      .from('reservas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .in('estado', ['pendiente confirmacion', 'confirmada', 'rechazada'])
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) {
      console.error('Error al obtener reservas:', error);
      throw error;
    }

    return data as Reserva[];
  }

  /**
   * Valida que una fecha y hora sean futuras
   */
  validarFechaFutura(fecha: string, hora: string): boolean {
    const ahora = new Date();
    const fechaReserva = new Date(`${fecha}T${hora}`);
    return fechaReserva > ahora;
  }

  /**
   * Valida que no exista otra reserva en el mismo día y hora
   */
  async validarDisponibilidad(usuarioId: string, fecha: string, hora: string): Promise<{ valida: boolean; mensaje: string }> {
    try {
      // Verificar que la fecha/hora sea futura
      if (!this.validarFechaFutura(fecha, hora)) {
        return {
          valida: false,
          mensaje: 'La reserva debe ser en una fecha y hora futura'
        };
      }

      // Obtener reservas activas del usuario
      const reservas = await this.obtenerReservasUsuario(usuarioId);

      // Restricción de máximo 2 reservas eliminada - los usuarios pueden hacer múltiples reservas

      // Verificar que no haya otra reserva en la misma fecha
      const reservaMismaFecha = reservas.find(r => r.fecha === fecha);
      if (reservaMismaFecha) {
        return {
          valida: false,
          mensaje: `Ya tienes una reserva para el día ${fecha} a las ${reservaMismaFecha.hora}`
        };
      }

      // Verificar que las reservas sean en días diferentes
      const fechaReserva = new Date(fecha);
      for (const r of reservas) {
        const fechaExistente = new Date(r.fecha);
        if (fechaReserva.toDateString() === fechaExistente.toDateString()) {
          return {
            valida: false,
            mensaje: 'Ya tienes una reserva en este día. Las reservas deben ser en días diferentes.'
          };
        }
      }

      return {
        valida: true,
        mensaje: 'La reserva es válida'
      };
    } catch (error) {
      console.error('Error al validar disponibilidad:', error);
      return {
        valida: false,
        mensaje: 'Error al validar la disponibilidad. Intenta nuevamente.'
      };
    }
  }

  /**
   * Cancela una reserva
   */
  async cancelarReserva(reservaId: number): Promise<void> {
    const { error } = await this.supa.client
      .from('reservas')
      .update({ 
        estado: 'cancelada',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservaId);

    if (error) {
      console.error('Error al cancelar reserva:', error);
      throw error;
    }
  }

  /**
   * Obtiene una reserva por ID
   */
  async obtenerReservaPorId(reservaId: number): Promise<Reserva | null> {
    const { data, error } = await this.supa.client
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .single();

    if (error) {
      console.error('Error al obtener reserva:', error);
      return null;
    }

    return data as Reserva;
  }

  /**
   * Verifica si un usuario es cliente registrado
   */
  async esClienteRegistrado(): Promise<boolean> {
    try {
      const userId = this.supa.idUsuario;
      if (!userId) {
        return false;
      }

      const { data, error } = await this.supa.client
        .from('usuarios')
        .select('perfil')
        .eq('auth_id', userId)
        .single();

      if (error) {
        console.error('Error al verificar tipo de usuario:', error);
        return false;
      }

      return data?.perfil === 'clienteReg';
    } catch (error) {
      console.error('Error al verificar cliente registrado:', error);
      return false;
    }
  }

  /**
   * Obtiene todas las reservas pendientes (para admin)
   */
  async obtenerReservasPendientes(): Promise<any[]> {
    const { data, error } = await this.supa.client
      .from('reservas')
      .select('*')
      .eq('estado', 'pendiente confirmacion')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) {
      console.error('Error al obtener reservas pendientes:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Cambia el estado de una reserva (para admin)
   */
  async cambiarEstadoReserva(reservaId: string, nuevoEstado: 'confirmada' | 'rechazada', motivoRechazo?: string): Promise<void> {
    const updateData: any = { 
      estado: nuevoEstado,
      updated_at: new Date().toISOString()
    };

    // Si es rechazo, agregar el motivo
    if (nuevoEstado === 'rechazada' && motivoRechazo) {
      updateData.motivo_rechazo = motivoRechazo;
    }

    const { error } = await this.supa.client
      .from('reservas')
      .update(updateData)
      .eq('id', reservaId);

    if (error) {
      console.error('Error al cambiar estado de reserva:', error);
      throw error;
    }
  }

  /**
   * Confirma una reserva y envía email de confirmación
   */
  async confirmarReserva(reservaId: string): Promise<{ ok: boolean; detail?: string }> {
    try {
      // Obtener datos de la reserva
      const reserva = await this.obtenerReservaPorId(parseInt(reservaId));
      if (!reserva) {
        throw new Error('Reserva no encontrada');
      }

      // Cambiar estado a confirmada
      await this.cambiarEstadoReserva(reservaId, 'confirmada');

      // Enviar email de confirmación
      return await this.enviarEmailConfirmacion(reserva);
    } catch (error) {
      console.error('Error al confirmar reserva:', error);
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Rechaza una reserva con motivo y envía email de rechazo
   */
  async rechazarReserva(reservaId: string, motivoRechazo: string): Promise<{ ok: boolean; detail?: string }> {
    try {
      // Obtener datos de la reserva
      const reserva = await this.obtenerReservaPorId(parseInt(reservaId));
      if (!reserva) {
        throw new Error('Reserva no encontrada');
      }

      // Cambiar estado a rechazada con motivo
      await this.cambiarEstadoReserva(reservaId, 'rechazada', motivoRechazo);

      // Enviar email de rechazo
      return await this.enviarEmailRechazo(reserva, motivoRechazo);
    } catch (error) {
      console.error('Error al rechazar reserva:', error);
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Envía email de confirmación de reserva
   */
  private async enviarEmailConfirmacion(reserva: any): Promise<{ ok: boolean; detail?: string }> {
    try {
      const { data, error } = await this.supa.client.functions.invoke('notificar-cliente', {
        body: {
          email: reserva.email_cliente,
          nombres: reserva.nombre_cliente?.split(' ')[0] || 'Cliente',
          apellidos: reserva.nombre_cliente?.split(' ').slice(1).join(' ') || '',
          estado: 'confirmada',
          tipo: 'reserva',
          datosReserva: {
            fecha: reserva.fecha,
            hora: reserva.hora,
            cantidad_comensales: reserva.cantidad_comensales,
            nota: reserva.nota
          }
        }
      });

      if (error) {
        console.error('Error al enviar email de confirmación:', error);
        return { ok: false, detail: error.message ?? String(error) };
      }

      // La función devuelve { ok:true } o { ok:false, detail? }
      if (data && data.ok === false) {
        return { ok: false, detail: data.detail || data.error || 'Fallo desconocido' };
      }

      console.log('Email de confirmación enviado exitosamente');
      return { ok: true };
    } catch (e: any) {
      console.error('Error al enviar email de confirmación:', e);
      return { ok: false, detail: e?.message ?? String(e) };
    }
  }

  /**
   * Envía email de rechazo de reserva
   */
  private async enviarEmailRechazo(reserva: any, motivoRechazo: string): Promise<{ ok: boolean; detail?: string }> {
    try {
      const { data, error } = await this.supa.client.functions.invoke('notificar-cliente', {
        body: {
          email: reserva.email_cliente,
          nombres: reserva.nombre_cliente?.split(' ')[0] || 'Cliente',
          apellidos: reserva.nombre_cliente?.split(' ').slice(1).join(' ') || '',
          estado: 'rechazada',
          tipo: 'reserva',
          datosReserva: {
            fecha: reserva.fecha,
            hora: reserva.hora,
            cantidad_comensales: reserva.cantidad_comensales,
            nota: reserva.nota,
            motivo_rechazo: motivoRechazo
          }
        }
      });

      if (error) {
        console.error('Error al enviar email de rechazo:', error);
        return { ok: false, detail: error.message ?? String(error) };
      }

      // La función devuelve { ok:true } o { ok:false, detail? }
      if (data && data.ok === false) {
        return { ok: false, detail: data.detail || data.error || 'Fallo desconocido' };
      }

      console.log('Email de rechazo enviado exitosamente');
      return { ok: true };
    } catch (e: any) {
      console.error('Error al enviar email de rechazo:', e);
      return { ok: false, detail: e?.message ?? String(e) };
    }
  }
}

