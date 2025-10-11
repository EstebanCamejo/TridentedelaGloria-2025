import { ChangeDetectorRef, Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
         IonList, IonItem, IonLabel, IonBadge, IonAvatar, IonIcon,
         IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, pencil, refresh, trash } from 'ionicons/icons';
import { ModalController } from '@ionic/angular';
import { AltaMesaComponent } from '../alta-mesa/alta-mesa.component';
import { MesasService, MesaRow } from 'src/app/services/mesas.service';
import type { RefresherCustomEvent, ViewWillEnter } from '@ionic/angular';
import { ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.scss'],
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonList, IonItem, IonLabel, IonBadge, IonAvatar, IonIcon,
    IonRefresher, IonRefresherContent
  ],
  providers: [ModalController],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MesasComponent implements OnInit , ViewWillEnter{
  private modalCtrl = inject(ModalController);
  private mesasSrv = inject(MesasService);

  mesas: MesaRow[] = [];
  cargando = false;

  trackById = (_: number, m: MesaRow) => m.id;

  // Placeholder inline: NO hace request a assets ni a la red
  readonly phSvg =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
      <rect width="100%" height="100%" rx="12" fill="#f6ecdc"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
            font-family="Inter, Arial" font-size="12" fill="#5d2222">S/F</text>
    </svg>`
  );

  constructor( private cdr : ChangeDetectorRef, private zone: NgZone, private router: Router) {
    addIcons({ add, pencil, refresh, trash });
  }

  ngOnInit() {
    this.cargarMesas();
    
  }
  ionViewWillEnter(): void {
    this.cargarMesas();
    
  }
 
  async cargarMesas(ev?: CustomEvent) {
    console.time('[mesas] cargarMesas');
    try {
      this.cargando = true;
      const list = await this.mesasSrv.listarMesas();
      this.zone.run(() => {
        this.mesas = [...list];            // <- nueva referencia
        this.cdr.markForCheck();
        console.log('[mesas] asignado this.mesas, len=', this.mesas.length);
      });
    } catch (e) {
      console.error('[mesas] cargarMesas error', e);
    } finally {
      this.cargando = false;
      // cerrar refresher de forma segura, si vino de pull-to-refresh
      try {
        // Ionic 7+: ev.detail.complete() es la forma recomendada
        (ev as any)?.detail?.complete?.();
      } catch {}
      console.timeEnd('[mesas] cargarMesas');
    }
  }
  
  

  // async cargarMesas(ev?: RefresherCustomEvent) {
  //   try {
  //     this.cargando = true;
  //     this.cdr.markForCheck();   //
  //     this.mesas = await this.mesasSrv.listarMesas();
  //     console.log('[mesas] cargadas', this.mesas.length);
  //   } catch (e) {
  //     console.error('[mesas] cargarMesas error', e);
  //   } finally {
  //     this.cargando = false;
  //     ev?.detail?.complete?.();
  //     // 👇 en Ionic 7 se completa así
  //   }
  // }
  
  
  private async recargarVista() {
    // fuerza un reload del componente sin tocar el historial
    await this.router.navigateByUrl('/home-admin', { skipLocationChange: true });
    await this.router.navigateByUrl('/admin/mesas', { replaceUrl: true });
    // y por las dudas, pedimos los datos otra vez
    await this.cargarMesas();
  }

  // NUEVA (modal sin id)
  async crearMesa() {
    const modal = await this.modalCtrl.create({
      component: AltaMesaComponent,
      canDismiss: true,
      breakpoints: [0, 0.9],
      initialBreakpoint: 0.9,
    });
    await modal.present();
  
    // 👇 Un solo await; obtenemos role y data en la misma línea
    const { role, data } = await modal.onWillDismiss();
    console.log('[mesas] modal role =', role);
  
    if (role === 'saved') {
      // Si la pantalla de alta devolvió la mesa creada, la insertamos optimistamente
      if (data?.mesa) {
        this.mesas = [data.mesa, ...this.mesas.filter(x => x.id !== data.mesa.id)];
      }
      // Y sincronizamos con Supabase por si la replicación tardó
      setTimeout(() => this.cargarMesas(), 300);
    }
  }
  


  // EDITAR (modal con id)
  async editarMesa(mesa: MesaRow) {
    const modal = await this.modalCtrl.create({
      componentProps: { mesaId: mesa.id },
      component: AltaMesaComponent,
      canDismiss: true,
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    console.log('[mesas] modal role =', role);
    if (role === 'saved') await this.recargarVista();
    
  }
  estadoColor(estado: MesaRow['estado']) {
    switch (estado) {
      case 'libre': return 'success';
      case 'ocupada': return 'danger';
      case 'reservada': return 'warning';
      case 'bloqueada': return 'medium';
      default: return 'medium';
    }
  }

  async eliminarMesa(m: MesaRow) {
    // confirmación simple (si preferís usar IonAlert, avísame y te paso el bloque)
    const ok = confirm(`¿Eliminar definitivamente la mesa #${m.numero}?`);
    if (!ok) return;
  
    // UI optimista: la saco de la lista ya mismo
    const prev = this.mesas;
    this.mesas = prev.filter(x => x.id !== m.id);
  
    try {
      // llamada real al backend
      await this.mesasSrv.eliminarMesa(m.id);
  
      // sincronizo por si hay latencia de replicación/caché
      // (espera mínima y recarga segura)
      await new Promise(r => setTimeout(r, 120));
      //await this.cargarMesas();
      await this.recargarVista();
  
    } catch (e: any) {
      console.error('[mesas] eliminarMesa error', e);
      // rollback si falló por RLS u otro motivo
      this.mesas = prev;
  
      // mensajes típicos que vimos en tus logs
      const msg = String(e?.message || e);
      if (msg.toLowerCase().includes('rls') || msg.toLowerCase().includes('permission')) {
        alert('No se pudo eliminar. Verificá permisos/RLS.');
      } else {
        alert('No se pudo eliminar la mesa.');
      }
    }
  }
  



  // async eliminarMesa(m: MesaRow) {
  //   // Confirmación simple (podés usar IonAlert si preferís)
  //   const seguro = confirm(`¿Eliminar la mesa #${m.numero}? Esta acción no se puede deshacer.`);
  //   if (!seguro) return;
  
  //   // Optimista: quitamos de la lista y guardamos copia para rollback
  //   const snapshot = this.mesas;
  //   this.mesas = this.mesas.filter(x => x.id !== m.id);
  
  //   try {
  //     const ok = await this.mesasSrv.eliminarMesa(m.id);
  //     if (!ok) {
  //       // No se eliminó (RLS o inexistente) -> rollback visual
  //       this.mesas = snapshot;
  //       throw new Error('No se pudo eliminar. Verificá permisos/RLS.');
  //     }
  //     // Aseguramos sincronía por si hay latencia en la replicación
  //     setTimeout(() => this.cargarMesas(), 250);
  //   } catch (e) {
  //     // Rollback ya hecho si falló
  //     console.error('[mesas] eliminarMesa error', e);
  //   }
  // }
  
}
