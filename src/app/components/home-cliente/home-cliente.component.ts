import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonButton, IonIcon,
  IonFab, IonFabButton,IonHeader,IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { qrCodeOutline, albumsOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-cliente',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, IonFab, IonFabButton,IonHeader,IonToolbar],
  templateUrl: './home-cliente.component.html',
  styleUrls: ['./home-cliente.component.scss'],
})
export class HomeClienteComponent {
  email$!: Observable<string | null>;
  loadingLogout = false;

  constructor(private supa: SupabaseService, private router: Router){
    addIcons({ qrCodeOutline, albumsOutline });
    this.email$ = this.supa.authEmail$;
  }

  scanQr(){ /* ... */ }
  verEncuestas(){ /* ... */ }

  async logOut() {
    try {
      this.loadingLogout = true;
      await this.supa.logout();           // 👈 llama a Supabase
      await this.router.navigate(['/login']); // ajustá la ruta si corresponde
    } catch (e) {
      console.error('Logout falló:', e);
      // aquí podés mostrar un toast si querés
    } finally {
      this.loadingLogout = false;
    }
  }
}
