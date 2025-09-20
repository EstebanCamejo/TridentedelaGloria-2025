import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonAvatar, IonBadge,
  IonRefresher, IonRefresherContent, IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refresh, person } from 'ionicons/icons';

type EsperaItem = {
  id: string;
  nombre: string;
  email?: string | null;
  foto_url?: string | null;
  created_at: string;
};

@Component({
  selector: 'app-lista-espera',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonAvatar, IonBadge,
    IonRefresher, IonRefresherContent, IonButton, IonIcon
  ],
  templateUrl: './lista-espera.component.html',
})
export class ListaEsperaComponent {
  loading = true;
  items: EsperaItem[] = [];

  constructor() {
    addIcons({ refresh, person });
  }

  async ionViewWillEnter() {
    await this.load();
  }

  async load() {
    this.loading = true;
    try {
      // ⬇️ Placeholder: más adelante lo reemplazamos por Supabase
      this.items = [
        // { id: 'demo1', nombre: 'Cliente demo', email: 'demo@mail.com', created_at: new Date().toISOString() },
      ];
    } finally {
      this.loading = false;
    }
  }

  handleRefresh(ev: CustomEvent) {
    this.load().finally(() => (ev.target as any).complete());
  }

  // Acción placeholder: luego abrirá “asignar mesa”
  atender(item: EsperaItem) {
    console.log('Atender:', item);
  }

  trackById(_: number, it: EsperaItem) { return it.id; }
}
