import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-tap',
  templateUrl: './tap.component.html',
  styleUrls: ['./tap.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule]
})
export class TapComponent implements OnDestroy {
  @ViewChild('arena', { static: true }) arena!: ElementRef<HTMLDivElement>;
  started = false;
  timeLeft = 10;
  score = 0;
  private timer?: any;

  constructor(private toast: ToastController) {}

  ngOnDestroy() { clearInterval(this.timer); }

  start() {
    this.started = true;
    this.timeLeft = 10; this.score = 0;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) this.end();
    }, 1000);
    this.moveTarget();
  }

  tap() {
    if (!this.started) return;
    this.score++;
    this.moveTarget();
  }

  end() {
    clearInterval(this.timer);
    this.started = false;
  }

  moveTarget() {
    const box = this.arena.nativeElement.getBoundingClientRect();
    const size = 64; // px target
    const x = Math.random() * (box.width - size);
    const y = Math.random() * (box.height - size);
    const el = this.arena.nativeElement.querySelector('.target') as HTMLDivElement;
    if (el) { el.style.transform = `translate(${x}px, ${y}px)`; }
  }

  get discount(): number {
    if (this.score >= 15) return 20;
    if (this.score >= 10) return 15;
    if (this.score >= 6) return 10;
    return 0;
  }


  async claim() {
    const t = await this.toast.create({
      message: '¡Descuento del 10% aplicado!',
      duration: 2000, 
      color: 'success', 
      position: 'top'
    });
    t.present();
  }
}
