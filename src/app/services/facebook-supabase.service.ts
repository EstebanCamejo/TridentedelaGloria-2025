import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujpfjthcqpenkizxjimp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcGZqdGhjcXBlbmtpenhqaW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTI5MjMsImV4cCI6MjA3MzAyODkyM30.ghXVFEzCNzuFl9K3EBAGUzZEwqsnS7BZRfBAoGZTTjk';

export const supabaseFacebook = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/*
@Injectable({ providedIn: 'root' })
export class SupabaseFacebookService {
  async getUserProfile() {
    const { data: user } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user!.id)
        .single();

      return data;
    }
  }
}
  */