import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabaseFacebook } from './facebook-supabase.service';
import { SupabaseService } from 'src/app/services/supabase.service';


export class AuthService {

  async initializeSocialLogin() {
    await SocialLogin.initialize({
      facebook: {
        appId: '4170745939861466',
        clientToken: '0c42feeb3c7024e678d14d5aa17c1ca1',
      },
    });
  }
  
  async signOut() {
    // Sign out from Supabase
    await supabaseFacebook.auth.signOut();

    // Optionally sign out from social providers
    await SocialLogin.logout({
      provider: 'google' // or 'apple', 'facebook'
    });
  }

  getCurrentUser() {
    return supabaseFacebook.auth.getUser();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabaseFacebook.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();