import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonLabel, IonAvatar, IonBadge,
  IonButton, IonIcon, IonRefresher, IonRefresherContent,
  IonSearchbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, refresh } from 'ionicons/icons';
import { SupabaseService } from 'src/app/services/supabase.service';
import { ToastrService } from 'ngx-toastr';

type PendingClient = {
  id: string;
  auth_id: string;
  email: string;
  nombres: string;
  apellidos: string;
  foto_url?: string | null;
  created_at: string;
};

@Component({
  selector: 'app-pendientes',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonList, IonItem, IonLabel, IonAvatar, IonBadge,
    IonButton, IonIcon, IonRefresher, IonRefresherContent,
    IonSearchbar
  ],
  templateUrl: './pendientes.component.html',
})
export class PendientesComponent implements OnInit, OnDestroy {
  loading = true;
  items: PendingClient[] = [];
  filtered: PendingClient[] = [];
  chanSub?: ReturnType<typeof this.supa.client.channel>;

  constructor(
    private supa: SupabaseService,
    private toast: ToastrService
  ) {
    addIcons({ checkmarkCircle, closeCircle, refresh });
  }

  async ngOnInit() {
    await this.load();

    // Realtime: refrescar cuando cambie la tabla usuarios
    this.chanSub = this.supa.client
      .channel('usuarios-pendientes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios' },
        () => this.load(false)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.chanSub?.unsubscribe();
  }

  async load(withSpinner = true) {
    try {
      if (withSpinner) this.loading = true;
      const data = await this.supa.getPendingClients();
      this.items = data as PendingClient[];
      this.filtered = this.items;
    } catch (e: any) {
      this.toast.error(e.message || 'Error cargando pendientes');
    } finally {
      this.loading = false;
    }
  }

  handleRefresh(ev: CustomEvent) {
    this.load(false).finally(() => (ev.target as any).complete());
  }


  search(q: string | null | undefined) {
    const s = (q ?? '').toLowerCase();
    this.filtered = !s
      ? this.items
      : this.items.filter(it =>
          `${it.nombres} ${it.apellidos}`.toLowerCase().includes(s) ||
          it.email.toLowerCase().includes(s)
        );
  }
  

    async approve(it: PendingClient) {
      console.log('[approve]', it.id);  
      try {
        await this.supa.approveClient(it.id);
        this.toast.success(`Aprobado: ${it.nombres} ${it.apellidos}`);
        await this.load(false);
      } catch (e: any) {
        console.error('[approve][error]', e); 
        this.toast.error(e.message || 'No se pudo aprobar');
      }
    }
    
    async reject(it: PendingClient) {
      console.log('[reject]', it.id);  
      try {
        await this.supa.rejectClient(it.id);
        this.toast.info(`Rechazado: ${it.nombres} ${it.apellidos}`);
        await this.load(false);
      } catch (e: any) {
        console.error('[reject][error]', e); 
        this.toast.error(e.message || 'No se pudo rechazar');
      }
    }
    
}
