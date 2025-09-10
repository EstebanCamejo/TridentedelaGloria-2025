import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';

import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonButtons, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-home',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [CommonModule,IonContent,IonFabButton,IonFab,IonSelect,IonSelectOption,FormsModule
  ],
})
export class HomeComponent implements OnInit, OnDestroy{
   dificultad: 'facil' | 'medio' | 'dificil' = 'facil';
  user: string = 'No user logged in';
  cards: any[] = [];
  selectedCards: any[] = [];
  matchesFound = 0;
  timer = 0;
  intervalId: any;
  showTimer = false;
  juegoIniciado = false;

  images = {
    facil: [
      'assets/animales/perro.jpg',
      'assets/animales/gato.jpg',
      'assets/animales/elefante.jpg'
    ],
    medio: [
      'assets/herramientas/martillo.png',
      'assets/herramientas/destornillador.png',
      'assets/herramientas/llave.png',
      'assets/herramientas/sierra.png',
      'assets/herramientas/alicate.png'
    ],
    dificil: [
      'assets/frutas/manzana.png',
      'assets/frutas/banana.png',
      'assets/frutas/naranja.png',
      'assets/frutas/pera.png',
      'assets/frutas/melon.png',
      'assets/frutas/fresa.png',
      'assets/frutas/uva.png',
      'assets/frutas/cereza.png'
    ]
  };

  constructor(
    //private auth: FirestoreAuthService,
    private toastr: ToastrService,
    private router: Router,
    private supabaseService: SupabaseService,
  ) {}
  
  private authSub?: { unsubscribe: () => void };

  async ngOnInit() {
    // Usuario actual (una vez)
    const { data } = await this.supabaseService.client.auth.getUser();
    this.user = data.user?.email ?? 'No user logged in';

    // Escuchar cambios de sesión
    const { data: sub } = this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.user = session?.user?.email ?? 'No user logged in';
    });
    this.authSub = sub.subscription; // guardar para desuscribir
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.authSub?.unsubscribe?.();
  }

  logOut() {
    this.supabaseService.logout()
      .then(() => {
        this.toastr.success('Sesión cerrada', '', { positionClass: 'toast-center' });
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('Error logging out:', error);
        this.toastr.error('Error logging out: ' + (error?.message || ''));
      });
  }
  
}