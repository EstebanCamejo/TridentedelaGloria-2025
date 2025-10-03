import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// 👉 importa los elementos que uses en el HTML
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home-mozo',
  standalone: true,
  templateUrl: './home-mozo.component.html',
  styleUrls: ['./home-mozo.component.scss'],
  imports: [CommonModule, IonButton, IonIcon]   // <— clave
})
export class HomeMozoComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {}

  ir(url: string){
    this.router.navigateByUrl(url, { skipLocationChange: true, replaceUrl: true });
  }
}
