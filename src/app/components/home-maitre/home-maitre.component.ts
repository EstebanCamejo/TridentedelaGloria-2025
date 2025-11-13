import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { qrCode, list, personAdd, personAddOutline, reorderThreeOutline } from 'ionicons/icons';
import { MaitreRealtimeService } from 'src/app/services/maitre-realtime.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SesionService } from 'src/app/services/sesion.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home-maitre',
  standalone: true,
  styleUrls: ['./home-maitre.component.scss'],
  imports: [
    CommonModule, RouterLink,
    IonHeader, IonToolbar, IonContent,
    IonButton, IonIcon
  ],
  templateUrl: './home-maitre.component.html',
})
export class HomeMaitreComponent implements OnInit, OnDestroy {
  nombre!: string | null;

  constructor(
    private realtime: MaitreRealtimeService,
    private supa: SupabaseService,
    private sesion: SesionService
  ) {
    addIcons({ qrCode, list, personAdd, personAddOutline, reorderThreeOutline });
    this.nombre = this.sesion.usuarioBD?.nombres || null;
  }
  
  ngOnInit(){ 
    this.realtime.init(); 
  }
  
  ngOnDestroy(){ 
    this.realtime.dispose(); 
  }
}
