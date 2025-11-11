import { Component, OnInit } from '@angular/core';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.scss']
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  async ngOnInit() {
    try {
      // 1️⃣ Procesar la URL del callback (si incluye "code=")
      if (window.location.href.includes('code=')) {
        try {
          // ✅ Corrección: aserción de tipo para evitar el error TS2345
          await this.supabase.client.auth.exchangeCodeForSession(window.location.href as string);
        } catch (ex) {
          console.warn('[AuthCallback] exchangeCodeForSession no fue necesario o ya se procesó.');
        }
      }

      // 2️⃣ Obtener la sesión activa devuelta por Facebook
      const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
      console.log('[AuthCallback] sessionData:', sessionData, 'sessionError:', sessionError);

      if (sessionError || !sessionData.session) throw sessionError;

      const user = sessionData.session.user;
      const email = user.email;
      const provider_id = user.identities?.[0]?.id;
      const provider = user.identities?.[0]?.provider;

      console.log('[AuthCallback] user info:', { email, provider, provider_id });

      if (!email || provider !== 'facebook') {
        console.error('[AuthCallback] No se pudo obtener información válida de Facebook.');
        this.toastr.error('Error: no se pudo obtener información válida de Facebook.', '', {
          positionClass: 'toast-center',
          timeOut: 4000,
        });
        await this.supabase.client.auth.signOut();
        await this.router.navigate(['/login']);
        return;
      }

      // 3️⃣ Verificar si el usuario ya está registrado
      console.log('[AuthCallback] Verificando si usuario está registrado...');
      if (!email || !provider || !provider_id) {
        console.error('[AuthCallback] Faltan datos del proveedor:', { email, provider, provider_id });
        return;
      }

      await this.supabase.checkSocialLogin(email, provider, provider_id);
      console.log('[AuthCallback] Usuario registrado y autorizado.');

      // 4️⃣ Todo OK → ir al home
      this.toastr.success('Sesión iniciada correctamente con Facebook', '', {
        positionClass: 'toast-center',
        timeOut: 3000,
      });
      await this.router.navigate(['/home']);

    } catch (err) {
      console.error('[AuthCallback] Error en callback:', err);

      this.toastr.error('Error al procesar autenticación.', '', {
        positionClass: 'toast-center',
        timeOut: 4000,
      });

      // Cerrar sesión por si quedó abierta
      await this.supabase.client.auth.signOut();
      await this.router.navigate(['/login']);
    }
  }
}
