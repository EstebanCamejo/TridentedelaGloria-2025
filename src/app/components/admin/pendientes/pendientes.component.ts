import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonLabel, IonAvatar, IonBadge,
  IonButton, IonIcon, IonRefresher, IonRefresherContent,
  IonSearchbar, IonSpinner            
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, refresh } from 'ionicons/icons';
import { ToastrService } from 'ngx-toastr';
import { AdminPendientesService, PendingClient } from 'src/app/services/admin-pendientes.service';
import { AlertController } from '@ionic/angular';
import { SpinnerService } from 'src/app/services/spinner.service';

@Component({
  selector: 'app-pendientes',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonList, IonItem, IonLabel, IonAvatar, IonBadge,
    IonButton, IonIcon, IonRefresher, IonRefresherContent,
    IonSearchbar, IonSpinner            
  ],
  templateUrl: './pendientes.component.html',
})
export class PendientesComponent implements OnInit, OnDestroy {
  loading = true;
  items: PendingClient[] = [];
  filtered: PendingClient[] = [];
  chanSub?: ReturnType<AdminPendientesService['watch']>;

  /** Evita doble clic por ítem */
  loadingId: string | null = null;

  constructor(
    private srv: AdminPendientesService,
    private toast: ToastrService,
    private alertCtrl: AlertController,
    private spinner: SpinnerService
  ) {
    addIcons({ checkmarkCircle, closeCircle, refresh });
  }

  async ngOnInit() {
    await this.load();
    this.chanSub = this.srv.watch(() => this.load(false));
  }

  ngOnDestroy(): void {
    this.chanSub?.unsubscribe();
  }

  async load(withSpinner = true) {
    try {
      if (withSpinner) this.loading = true;
      this.items = await this.srv.list();
      this.filtered = this.items;
    } catch (e: any) {
      this.toast.error((e?.message || 'ERROR CARGANDO PENDIENTES').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.loading = false;
    }
  }

  handleRefresh(ev: CustomEvent) {
    this.load(false).finally(() => (ev.target as any).complete());
  }

  /** Llamada desde (ionInput) del searchbar */
  search(q: string | null | undefined) {
    const s = (q || '').trim().toLowerCase();
    this.filtered = !s
      ? this.items
      : this.items.filter(it =>
          `${it.nombres} ${it.apellidos}`.toLowerCase().includes(s) ||
          it.email.toLowerCase().includes(s)
        );
  }

  async approve(it: PendingClient) {
    if (this.loadingId) return;
    this.loadingId = it.id;
    try {
      await this.srv.approve(it.id, it.email, it.nombres, it.apellidos);
      this.toast.success(`APROBADO: ${it.nombres.toUpperCase()} ${it.apellidos.toUpperCase()}`, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      await this.load(false);
    } catch (e: any) {
      this.toast.error((e?.message || 'NO SE PUDO APROBAR').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.loadingId = null;
    }
  }
  async confirmarAprobacion(it: PendingClient) {
    const alert = await this.alertCtrl.create({
      header: 'APROBAR CLIENTE',
      message: `¿SEGURO QUE QUERÉS APROBAR A ${it.nombres.toUpperCase()} ${it.apellidos.toUpperCase()}?`,
      buttons: [
        { text: 'CANCELAR', role: 'cancel' },
        {
          text: 'APROBAR',
          role: 'confirm',
          handler: async () => {
            if (this.loadingId) return;
            this.loadingId = it.id;
            
            // Cerrar el diálogo primero
            await alert.dismiss();
            
            // Mostrar spinner después de cerrar el diálogo
            console.log('🔄 Mostrando spinner para aprobación...');
            this.spinner.show({ immediate: true, minMs: 1000 });
            
            try {
              const res = await this.srv.approve(it.id, it.email, it.nombres, it.apellidos);
              this.toast.success(`APROBADO: ${it.nombres.toUpperCase()} ${it.apellidos.toUpperCase()}`, '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
              if (!res.ok) {
                this.toast.warning(`APROBADO, PERO EL CORREO NO SE ENVIÓ${res.detail ? `: ${res.detail.toUpperCase()}` : ''}`, '', {
                  positionClass: 'toast-center',
                  timeOut: 6000
                });
                console.warn('notificar-cliente (aprobado) falló:', res);
              }
              await this.load(false);
            } catch (e: any) {
              this.toast.error((e?.message || 'NO SE PUDO APROBAR').toUpperCase(), '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
            } finally {
              console.log('✅ Ocultando spinner después de aprobación');
              this.loadingId = null;
              this.spinner.hide();
            }
          }
        }
      ]
    });
    await alert.present();
  }
  
  async confirmarRechazo(it: PendingClient) {
    const alert = await this.alertCtrl.create({
      header: 'RECHAZAR CLIENTE',
      message: `¿SEGURO QUE QUERÉS RECHAZAR A ${it.nombres.toUpperCase()} ${it.apellidos.toUpperCase()}?`,
      buttons: [
        { text: 'CANCELAR', role: 'cancel' },
        {
          text: 'RECHAZAR',
          role: 'destructive',
          handler: async () => {
            if (this.loadingId) return;
            this.loadingId = it.id;
            
            // Cerrar el diálogo primero
            await alert.dismiss();
            
            // Mostrar spinner después de cerrar el diálogo
            console.log('🔄 Mostrando spinner para rechazo...');
            this.spinner.show({ immediate: true, minMs: 1000 });
            
            try {
              const res = await this.srv.reject(it.id, it.email, it.nombres, it.apellidos);
              this.toast.info(`RECHAZADO: ${it.nombres.toUpperCase()} ${it.apellidos.toUpperCase()}`, '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
              if (!res.ok) {
                this.toast.warning(`RECHAZADO, PERO EL CORREO NO SE ENVIÓ${res.detail ? `: ${res.detail.toUpperCase()}` : ''}`, '', {
                  positionClass: 'toast-center',
                  timeOut: 6000
                });
                console.warn('notificar-cliente (rechazado) falló:', res);
              }
              await this.load(false);
            } catch (e: any) {
              this.toast.error((e?.message || 'NO SE PUDO RECHAZAR').toUpperCase(), '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
            } finally {
              console.log('✅ Ocultando spinner después de rechazo');
              this.loadingId = null;
              this.spinner.hide();
            }
          }
        }
      ]
    });
    await alert.present();
  }
  
  /** Útil si querés volver a usar trackBy en el *ngFor */
  trackById(_: number, it: PendingClient) { return it.id; }
}
