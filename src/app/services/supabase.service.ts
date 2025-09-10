import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private _supabase: SupabaseClient;

  constructor() {
    this._supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  // Acceso al cliente, por si lo necesitás en otros servicios
  get client(): SupabaseClient {
    return this._supabase;
  }

  // ---- Auth mínima (podés ajustar más tarde) ----
  async login(email: string, password: string) {
    const { data, error } = await this._supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async logout() {
    const { error } = await this._supabase.auth.signOut();
    if (error) throw error;
  }

  async register(email: string, password: string) {
    const { data, error } = await this._supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }
  
}
