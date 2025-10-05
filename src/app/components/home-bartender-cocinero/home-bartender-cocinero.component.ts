import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, personAdd, restaurant, create , statsChart, addCircleOutline} from 'ionicons/icons';
import { Observable } from 'rxjs';
import { SupabaseService } from 'src/app/services/supabase.service';

@Component({
  selector: 'app-home-bartender-cocinero',
  standalone: true,
  imports: [IonToolbar, IonHeader, CommonModule, IonContent, IonGrid, IonRow, IonCol, IonButton, IonIcon],
  templateUrl: './home-bartender-cocinero.component.html',
  styleUrls: ['./home-bartender-cocinero.component.scss']
})
export class HomeBartenderCocineroComponent {

  email$!: Observable<string | null>;

  constructor(private router: Router, private supa: SupabaseService) {
    addIcons({ addCircleOutline });
    this.email$ = this.supa.authEmail$;
  }

  irAAgregarNuevoPlato() { this.router.navigate(['/bartender-cocinero/nuevo-plato']); }
  irAAgregarNuevaBebida() { this.router.navigate(['/bartender-cocinero/nueva-bebida']); }
}