import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, personAdd, restaurant, create , statsChart, listCircleOutline, addCircleOutline} from 'ionicons/icons';
import { Observable } from 'rxjs';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SesionService } from 'src/app/services/sesion.service';
import { BartenderCocineroRealtimeService } from 'src/app/services/bartender-cocinero-realtime.service';

@Component({
  selector: 'app-home-bartender-cocinero',
  standalone: true,
  imports: [IonToolbar, IonHeader, CommonModule, IonContent, IonGrid, IonRow, IonCol, IonButton, IonIcon],
  templateUrl: './home-bartender-cocinero.component.html',
  styleUrls: ['./home-bartender-cocinero.component.scss']
})
export class HomeBartenderCocineroComponent implements OnInit, OnDestroy {

  idUsuario$!: string;
  email$!: Observable<string | null>;
  perfil!: string; 

  constructor(
    private router: Router, 
    private supabase: SupabaseService, 
    private sesion: SesionService,
    private bartenderCocineroRt: BartenderCocineroRealtimeService
  ) {
    console.log('[HomeBartenderCocineroComponent] 🏗️ Constructor ejecutado');
    addIcons({ addCircleOutline, listCircleOutline });
    this.idUsuario$ = this.supabase.idUsuario;
    this.email$ = this.supabase.authEmail$;

    this.perfil = this.sesion.usuarioBD!.perfil;
  }

  async ngOnInit() {
    console.log('[HomeBartenderCocineroComponent] 🚀 ngOnInit - Iniciando BartenderCocineroRealtimeService...');
    // 🔔 Iniciar servicio de notificaciones para bartender/cocinero (mover aquí)
    await this.bartenderCocineroRt.init();
    console.log('[HomeBartenderCocineroComponent] ✅ BartenderCocineroRealtimeService inicializado desde ngOnInit');
  }

  async ionViewWillEnter() {
    console.log('[HomeBartenderCocineroComponent] 🚀 ionViewWillEnter ejecutado');
    // 🔔 Iniciar servicio de notificaciones para bartender/cocinero (como maitre)
    await this.bartenderCocineroRt.init();
    console.log('[HomeBartenderCocineroComponent] ✅ BartenderCocineroRealtimeService inicializado');
  }

  ionViewWillLeave() {
    // 🔔 Limpiar servicio de notificaciones (como maitre)
    this.bartenderCocineroRt.dispose();
  }

  ngOnDestroy() {
    // Cleanup adicional si es necesario
  }

  irAAgregarNuevoPlato() { this.router.navigate(['/bartender-cocinero/nuevo-plato']); }
  irAAgregarNuevaBebida() { this.router.navigate(['/bartender-cocinero/nueva-bebida']); }
  irAVerificarPendientesCocinero() { this.router.navigate(['/bartender-cocinero/verificar-pendientes-cocinero']); }
  irAVerificarPendientesBartender() { this.router.navigate(['/bartender-cocinero/verificar-pendientes-bartender']); }
}