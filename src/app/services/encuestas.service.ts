// src/app/services/encuestas.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ChartItem = { name: string; value: number };
export type ResultadosEncuesta = {
  limpieza: ChartItem[];
  aspecto_valorado: ChartItem[];
  servicios_extra: ChartItem[];
};

// CAMBIO: tipamos las claves válidas explícitamente
type ClaveAgg = 'limpieza' | 'aspecto_valorado' | 'servicios_extra';

@Injectable({ providedIn: 'root' })
export class EncuestasService {
  // CAMBIO: usar BD real
  private useMock = false;

  constructor(private supa: SupabaseService) {}

  async getResultados(encuestaId = '00000000-0000-0000-0000-000000000001'): Promise<ResultadosEncuesta> {
    return this.useMock ? this.getResultadosMock() : this.getResultadosDesdeSupabase(encuestaId);
  }

  // (Opcional) lo podés borrar si ya no querés mock
  private async getResultadosMock(): Promise<ResultadosEncuesta> {
    return {
      limpieza: [
        { name: '1', value: 3 }, { name: '2', value: 4 }, { name: '3', value: 9 },
        { name: '4', value: 15 }, { name: '5', value: 18 },
      ],
      aspecto_valorado: [
        { name: 'Atención del personal', value: 22 },
        { name: 'Calidad de la comida', value: 25 },
        { name: 'Tiempo de espera', value: 11 },
        { name: 'Ambiente/Música', value: 14 },
      ],
      servicios_extra: [
        { name: 'Zona de juegos', value: 16 },
        { name: 'Menú sin TACC', value: 20 },
        { name: 'Bebidas sin azúcar', value: 10 },
        { name: 'Shows en vivo', value: 8 },
      ],
    };
  }

  private async getResultadosDesdeSupabase(encuestaId: string): Promise<ResultadosEncuesta> {
    const { data, error } = await this.supa.client
      .from('v_encuesta_agg')
      .select('clave, etiqueta, cantidad')
      .eq('encuesta_id', encuestaId);

    if (error) throw error;

    // CAMBIO: Record con claves estrictas → permite usar dot notation sin TS4111
    const byClave: Record<ClaveAgg, ChartItem[]> = {
      limpieza: [],
      aspecto_valorado: [],
      servicios_extra: [],
    };

    // Tipamos cada fila para asegurar las claves
    for (const row of (data ?? []) as Array<{ clave: ClaveAgg; etiqueta: string; cantidad: number }>) {
      byClave[row.clave].push({ name: String(row.etiqueta), value: Number(row.cantidad) });
    }

    byClave.limpieza.sort((a, b) => Number(a.name) - Number(b.name));

    return {
      limpieza: byClave.limpieza,
      aspecto_valorado: byClave.aspecto_valorado,
      servicios_extra: byClave.servicios_extra,
    };
  }

  
}

