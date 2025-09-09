import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { FirestoreAuthService } from '../services/firestore-auth.service';
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
    private auth: FirestoreAuthService,
    private toastr: ToastrService,
    private router: Router,
    private supabaseService: SupabaseService,
  ) {}

  ngOnInit() {
    this.auth.currentUser$.subscribe(email => {
      this.user = email ?? 'No user logged in';
    });
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  seleccionarDificultad(nueva: 'facil' | 'medio' | 'dificil') {
    this.dificultad = nueva;
    this.juegoIniciado = false;
    this.cards = [];
    this.showTimer = false;
    this.timer = 0;
    this.matchesFound = 0;
    this.selectedCards = [];
    if (this.intervalId) clearInterval(this.intervalId);
  }

  iniciarJuego() {
    this.juegoIniciado = true;
    this.setupGame();
  }

  setupGame() {
    const selectedImages = this.images[this.dificultad];
    const duplicated = [...selectedImages, ...selectedImages];
    const shuffled = duplicated
      .map((img) => ({ img, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((obj, i) => ({
        id: i,
        image: obj.img,
        revealed: false,
        matched: false,
      }));

    this.cards = shuffled;
    this.selectedCards = [];
    this.matchesFound = 0;
    this.timer = 0;
    this.showTimer = false;

    // Mostrar todas las cartas por 3 segundos
    this.cards.forEach(card => card.revealed = true);
    setTimeout(() => {
      this.cards.forEach(card => card.revealed = false);
      this.showTimer = true;
      this.startTimer();
    }, 3000);
  }

  startTimer() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.timer++;
    }, 1000);
  }

  stopTimer() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  selectCard(card: any) {
    if (!this.juegoIniciado) return;
    if (card.revealed || card.matched || this.selectedCards.length === 2) return;
    card.revealed = true;
    this.selectedCards.push(card);

    if (this.selectedCards.length === 2) {
      const [c1, c2] = this.selectedCards;
      if (c1.image === c2.image) {
        c1.matched = c2.matched = true;
        this.matchesFound++;
        this.selectedCards = [];
        if (this.matchesFound === this.images[this.dificultad].length) {
          this.gameOver();
        }
      } else {
        setTimeout(() => {
          c1.revealed = c2.revealed = false;
          this.selectedCards = [];
        }, 1000);
      }
    }
  }

  gameOver() {
    this.stopTimer();
    this.showTimer = false;
    this.supabaseService.InsertarPuntaje(this.user, this.timer, this.dificultad)
      .then(success => {
        if (success) {
          
        } else {
          this.toastr.error('Error al guardar el puntaje', '', {
            positionClass: 'toast-center',
          });
        }
      })
      .catch(error => {
        console.error('Error al guardar el puntaje:', error);
        this.toastr.error('Error al guardar el puntaje: ' + error.message, '', {
          positionClass: 'toast-center',
        });
      });
    setTimeout(() => {
      
      this.toastr.success(`¡Juego terminado! Tiempo: ${this.timer} segundos`, '', {
        positionClass: 'toast-center',
      });}, 200);
    this.juegoIniciado = false;
  }

  logOut() {
    this.auth
      .logOut()
      .then(() => {
        this.toastr.success('Sesión cerrada', '', { positionClass: 'toast-center' });
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('Error logging out:', error);
        this.toastr.error('Error logging out: ' + error.message);
      });
  }

  goToRanking() {
    this.router.navigate(['/ranking']);
  }
}