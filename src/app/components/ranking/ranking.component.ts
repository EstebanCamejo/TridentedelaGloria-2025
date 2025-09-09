import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent } from "@ionic/angular/standalone";
import { SupabaseService } from 'src/app/services/supabase.service';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss'],
  imports: [CommonModule,IonContent]
})
export class RankingComponent{
ranking: any[] = [];
  dificultadSeleccionada: string = 'Fácil';
  dificultades: string[] = ['Fácil', 'Medio', 'Difícil'];

  dificultadMap: { [key: string]: string } = {
    facil: 'Fácil',
    medio: 'Medio',
    dificil: 'Difícil'
  };
  constructor(private router: Router, private supabaseService: SupabaseService) {}

  ngOnInit() {
    this.obtenerRanking(this.dificultadSeleccionada);
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  seleccionarDificultad(dificultad: string) {
    this.dificultadSeleccionada = dificultad;
    this.obtenerRanking(dificultad);
  }

  async obtenerRanking(dificultad: string) {
  const dificultadFormateada = dificultad.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  this.ranking = await this.supabaseService.TraerPuntajesPorDificultad(dificultadFormateada);
}
}