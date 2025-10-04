import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';

type Card = { id: number; emoji: string; face: boolean; done: boolean };

function shuffle<T>(arr: T[]): T[] {
  return arr.map(v => [Math.random(), v] as const).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
}

@Component({
  standalone: true,
  selector: 'app-memoria',
  templateUrl: './memoria.component.html',
  styleUrls: ['./memoria.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class MemoriaComponent implements OnDestroy {
  cards: Card[] = [];
  first?: Card;
  lock = false;
  moves = 0;
  finished = false;

  private symbols = ['🍕','🍔','🍟','🌭','🥤','🍩'];

  constructor(private toast: ToastController) { this.reset(); }
  ngOnDestroy() {}

  reset() {
    const deck = shuffle([...this.symbols, ...this.symbols]);
    let id = 1;
    this.cards = deck.map(e => ({ id: id++, emoji: e, face: false, done: false }));
    this.first = undefined; this.lock = false; this.moves = 0; this.finished = false;
  }

  flip(c: Card) {
    if (this.lock || c.done || c.face) return;
    c.face = true;

    if (!this.first) { this.first = c; return; }

    // 2da carta
    this.moves++;
    if (this.first.emoji === c.emoji) {
      this.first.done = true; c.done = true; this.first = undefined;
      if (this.cards.every(x => x.done)) this.finished = true;
    } else {
      this.lock = true;
      setTimeout(() => {
        c.face = false;
        if (this.first) this.first.face = false;
        this.first = undefined;
        this.lock = false;
      }, 700);
    }
  }

  get discount(): number {
    if (!this.finished) return 0;
    if (this.moves <= 12) return 20;
    if (this.moves <= 18) return 15;
    if (this.moves <= 24) return 10;
    return 0;
  }

  async claim() {
    const t = await this.toast.create({
      message: this.discount ? `¡Descuento del ${this.discount}% listo!` : 'Sin descuento esta vez, ¡probá de nuevo!',
      duration: 1800, color: this.discount ? 'success' : 'medium', position: 'top'
    });
    t.present();
  }
}
