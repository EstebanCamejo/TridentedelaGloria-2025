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
  mesa_id?: string | null; // ID de la mesa asignada (UUID)
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
   * Obtiene reservas por estado (para admin)
   * @param estado 'pendiente confirmacion' | 'confirmada' | 'rechazada'
   */
  async obtenerReservasPorEstado(estado: 'pendiente confirmacion' | 'confirmada' | 'rechazada'): Promise<any[]> {
    const { data, error } = await this.supa.client
      .from('reservas')
      .select('*')
      .eq('estado', estado)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) {
      console.error(`Error al obtener reservas ${estado}:`, error);
      throw error;
    }

    return data || [];
  }

  /**
   * Cambia el estado de una reserva (para admin)
   */
  async cambiarEstadoReserva(reservaId: string, nuevoEstado: 'confirmada' | 'rechazada', motivoRechazo?: string, mesaId?: string): Promise<void> {
    const updateData: any = { 
      estado: nuevoEstado,
      updated_at: new Date().toISOString()
    };

    // Si es rechazo, agregar el motivo
    if (nuevoEstado === 'rechazada' && motivoRechazo) {
      updateData.motivo_rechazo = motivoRechazo;
    }

    // Si es confirmación y se proporciona mesa_id, asignarla
    if (nuevoEstado === 'confirmada' && mesaId) {
      updateData.mesa_id = mesaId;
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
   * @param reservaId ID de la reserva
   * @param mesaId ID de la mesa asignada (opcional)
   */
  async confirmarReserva(reservaId: string, mesaId?: string): Promise<{ ok: boolean; detail?: string }> {
    try {
      // Obtener datos de la reserva antes de actualizar (para obtener datos del cliente)
      const reservaInicial = await this.obtenerReservaPorId(parseInt(reservaId));
      if (!reservaInicial) {
        throw new Error('Reserva no encontrada');
      }

      // Cambiar estado a confirmada (con mesa si se proporciona)
      await this.cambiarEstadoReserva(reservaId, 'confirmada', undefined, mesaId);

      // Obtener la reserva actualizada para asegurarse de tener el mesa_id
      const reserva = await this.obtenerReservaPorId(parseInt(reservaId));
      if (!reserva) {
        throw new Error('No se pudo obtener la reserva actualizada');
      }

      // Enviar email de confirmación con la reserva actualizada
      return await this.enviarEmailConfirmacion(reserva);
    } catch (error) {
      console.error('Error al confirmar reserva:', error);
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Obtiene mesas disponibles para asignar a reservas
   * Filtra mesas que:
   * 1. Están libres (NO en estado 'reservaActiva' u 'ocupada')
   * 2. No están asignadas a otras reservas confirmadas en el mismo horario
   * 3. Tienen capacidad suficiente para los comensales
   * 4. No están asignadas a lista_espera en estado 'asignado'
   */
  async obtenerMesasDisponiblesParaReserva(fecha: string, hora: string, cantidadComensales: number): Promise<Array<{ id: string; numero: number; capacidad: number }>> {
    try {
      // Obtener mesas libres con capacidad suficiente (excluir reservaActiva y ocupada)
      const { data: mesasLibres, error: mesasError } = await this.supa.client
        .from('mesas')
        .select('id, numero, capacidad, estado')
        .gte('capacidad', cantidadComensales)
        .in('estado', ['libre']) // Solo mesas libres (no reservaActiva ni ocupada)
        .order('numero', { ascending: true });

      if (mesasError) throw mesasError;
      if (!mesasLibres || mesasLibres.length === 0) return [];

      // Verificar que no haya otras reservas confirmadas en el mismo horario para esas mesas
      const { data: reservasConfirmadas, error: reservasError } = await this.supa.client
        .from('reservas')
        .select('mesa_id')
        .eq('fecha', fecha)
        .eq('hora', hora)
        .eq('estado', 'confirmada')
        .not('mesa_id', 'is', null);

      if (reservasError) throw reservasError;

      // Verificar mesas asignadas en lista_espera
      const { data: mesasEnEspera, error: esperaError } = await this.supa.client
        .from('lista_espera')
        .select('mesa_id')
        .eq('estado', 'asignado')
        .not('mesa_id', 'is', null);

      if (esperaError) throw esperaError;

      // Crear Sets con los IDs de mesas ocupadas
      const mesasOcupadasPorReservas = new Set(
        (reservasConfirmadas || []).map((r: any) => r.mesa_id).filter(Boolean)
      );

      const mesasOcupadasPorEspera = new Set(
        (mesasEnEspera || []).map((r: any) => r.mesa_id).filter(Boolean)
      );

      // Filtrar mesas que no están ocupadas en ese horario ni en lista de espera
      const mesasDisponibles = mesasLibres
        .filter((mesa: any) => {
          return !mesasOcupadasPorReservas.has(mesa.id) && !mesasOcupadasPorEspera.has(mesa.id);
        })
        .map((mesa: any) => ({
          id: mesa.id,
          numero: mesa.numero,
          capacidad: mesa.capacidad
        }));

      return mesasDisponibles;
    } catch (error) {
      console.error('Error al obtener mesas disponibles:', error);
      throw error;
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
      // Obtener información de la mesa si está asignada
      let numeroMesa: number | null = null;
      if (reserva.mesa_id) {
        try {
          const { data: mesaData, error: mesaError } = await this.supa.client
            .from('mesas')
            .select('numero')
            .eq('id', reserva.mesa_id)
            .single();
          
          if (!mesaError && mesaData) {
            numeroMesa = mesaData.numero;
          }
        } catch (error) {
          console.warn('No se pudo obtener número de mesa:', error);
        }
      }

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
            nota: reserva.nota,
            numero_mesa: numeroMesa
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

