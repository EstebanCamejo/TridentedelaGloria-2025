import { Component } from '@angular/core';
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

@Component({
  selector: 'app-home-bartender-cocinero',
  standalone: true,
  imports: [IonToolbar, IonHeader, CommonModule, IonContent, IonGrid, IonRow, IonCol, IonButton, IonIcon],
  templateUrl: './home-bartender-cocinero.component.html',
  styleUrls: ['./home-bartender-cocinero.component.scss']
})
export class HomeBartenderCocineroComponent {

  idUsuario$!: string;
  email$!: Observable<string | null>;
  perfil!: string; 

  constructor(private router: Router, private supabase: SupabaseService, private sesion: SesionService) {
    addIcons({ addCircleOutline, listCircleOutline });
    this.idUsuario$ = this.supabase.idUsuario;
    this.email$ = this.supabase.authEmail$;

    this.perfil = this.sesion.usuarioBD!.tipo;
    //this.obtenerPerfil();
  }

  /*
  async obtenerPerfil() {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .select('perfil')
      .eq('id', this.idUsuario$)
      .single();

    console.log(`Id del usuario: ${this.idUsuario$}`)
    console.log(`Perfil: ${data}`)
    if (error) {
      console.error('Error al obtener el perfil:', error.message);
      return;
    }

    if (data) {
      //console.log(`Perfil: ${this.perfil}`)
      this.perfil = data.perfil;
    } else {
      console.warn('No se encontró el perfil del usuario');
    }
  }
    */

  irAAgregarNuevoPlato() { this.router.navigate(['/bartender-cocinero/nuevo-plato']); }
  irAAgregarNuevaBebida() { this.router.navigate(['/bartender-cocinero/nueva-bebida']); }
  irAVerificarPendientesCocinero() { this.router.navigate(['/bartender-cocinero/verificar-pendientes-cocinero']); }
  irAVerificarPendientesBartender() { this.router.navigate(['/bartender-cocinero/verificar-pendientes-bartender']); }
}