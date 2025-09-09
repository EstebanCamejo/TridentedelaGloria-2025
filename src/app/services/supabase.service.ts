import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://qnmlmyknlecqaipzjjpe.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubWxteWtubGVjcWFpcHpqanBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNTU0ODQsImV4cCI6MjA1OTczMTQ4NH0.KjiAgK9tsRQKumzTRzvw9bRqAKnH5oJM0rlb7t2h-yM'
    );
  }
  get client(): SupabaseClient {
    return this.supabase;
  }
  async login(user: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: user,
        password: password,
      });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }
  async TraerPuntajesPorDificultad(dificultad: string): Promise<any[]> {
  try {
    const { data, error } = await this.supabase
      .from('puntajes')
      .select('*')
      .eq('dificultad', dificultad)
      .order('puntaje', { ascending: true })
      .limit(5); 
    if (error) {
      console.error('Error al obtener puntajes:', error.message);
      return [];
    }
    return data ?? [];
  } catch (e: any) {
    console.error('Error general en TraerPuntajesPorDificultad:', e.message);
    return [];
  }
}
  async InsertarPuntaje(email: string, puntaje: number, dificultad: string) {
    try {
      const { error } = await this.supabase
        .from('puntajes')
        .insert([{ email, puntaje, dificultad }]);

      if (error) {
        console.error('Error al insertar puntaje:', error.message);
        return false;
      }
      return true;
    } catch (e: any) {
      console.error('Error general en InsertarPuntaje:', e.message);
      return false;
    }
  }
  // async registrarUsuario(
  //   email: string,
  //   password: string,
  //   nombre: string,
  //   apellido: string,
  //   obraSocial: string,
  //   especialidad: string,
  //   dni: string,
  //   edad: number,
  //   rol: string,
  //   imagen: File | null,
  //   imagen2: File | null,
  //   carpetaArchivo: string,
  //   tabla: string
  // ): Promise<boolean> {
  //   try {
  //     // Registro de usuario en Auth
  //     const { data, error } = await this.supabase.auth.signUp({ email, password });
  //     if (error) {
  //       console.error('Error registrando usuario:', error.message);
  //       return false;
  //     }
  //     console.log('Usuario registrado:', data.user?.id);
  //     // Subida de imagen principal
  //     let avatarUrl: string | null = null;
  //     if (imagen) {
  //       const { data: imgData, error: imgError, path } = await this.saveFile(email, imagen, 1);
  //       if (imgError) {
  //         console.error('Error subiendo imagen principal:', imgError.message);
  //         return false;
  //       }
  //       avatarUrl = path;
  //     }

  //     // Subida de imagen secundaria (solo para Paciente)
  //     let avatarUrl2: string | null = null;
  //     if (rol === 'Paciente' && imagen2) {
  //       const { data: imgData2, error: imgError2, path: path2 } = await this.saveFile(email, imagen2, 2);
  //       if (imgError2) {
  //         console.error('Error subiendo imagen secundaria:', imgError2.message);
  //         return false;
  //       }
  //       avatarUrl2 = path2;
  //     }
  //     // Guardar el usuario en la tabla correspondiente
  //     const { error: insertError } = await this.supabase
  //       .from(tabla)
  //       .insert([{
  //         email,
  //         nombre,
  //         authid: data.user?.id,
  //         apellido,
  //         obraSocial,
  //         edad,
  //         especialidad,
  //         dni,
  //         rol,
  //         avatarUrl,
  //         avatarUrl2,
  //       }]);

  //     if (insertError) {
  //       console.error('Error guardando usuario en tabla:', insertError.message);
  //       return false;
  //     }

  //     return true;
  //   } catch (e: any) {
  //     console.error('Error general en registrarUsuario:', e.message);
  //     return false;
  //   }
  // }
  

  
}