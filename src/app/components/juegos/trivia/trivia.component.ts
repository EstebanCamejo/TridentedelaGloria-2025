import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';

type Q = { q: string; options: string[]; correct: number };

@Component({
  standalone: true,
  selector: 'app-trivia',
  templateUrl: './trivia.component.html',
  styleUrls: ['./trivia.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class TriviaComponent implements OnDestroy {
  idx = 0;
  score = 0;
  finished = false;
  answering = false;

  questions: Q[] = [
    { q: '¿Cuál es la capital de Francia?', options: ['Madrid', 'París', 'Roma', 'Berlín'], correct: 1 },
    { q: '2 + 2 = ?', options: ['3', '4', '5', '22'], correct: 1 },
    { q: '¿Cuál es un lenguaje de programación?', options: ['HTML', 'CSS', 'TypeScript', 'Figma'], correct: 2 },
    { q: '¿Qué planeta es el “rojo”?', options: ['Venus', 'Marte', 'Júpiter', 'Saturno'], correct: 1 },
    { q: '¿Cuántos minutos tiene una hora?', options: ['30', '45', '60', '90'], correct: 2 },
  ];

  constructor(private toast: ToastController) {}

  ngOnDestroy() {}

  select(i: number) {
    if (this.answering || this.finished) return;
    this.answering = true;
    if (i === this.questions[this.idx].correct) this.score++;
    setTimeout(() => {
      this.idx++;
      this.answering = false;
      if (this.idx >= this.questions.length) this.finished = true;
    }, 350);
  }

  get discount(): number {
    if (this.score >= 5) return 20;
    if (this.score === 4) return 15;
    if (this.score >= 3) return 10;
    return 0;
  }

  async claim() {
    const t = await this.toast.create({
      message: this.discount ? `¡Descuento del ${this.discount}% listo para aplicar!` : 'No alcanzaste descuento… ¡probá de nuevo!',
      duration: 1800, color: this.discount ? 'success' : 'medium', position: 'top'
    });
    t.present();
  }

  restart() {
    this.idx = 0; this.score = 0; this.finished = false; this.answering = false;
  }
}
