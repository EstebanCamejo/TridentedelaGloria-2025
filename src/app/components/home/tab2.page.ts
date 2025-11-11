import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from 'src/app/services/supabase.service';
import { SesionService } from 'src/app/services/sesion.service';
import { HomeAdminComponent } from '../home-admin/home-admin.component';
import { HomeMozoComponent } from '../home-mozo/home-mozo.component';
import { HomeClienteComponent } from '../home-cliente/home-cliente.component';
import { HomeMaitreComponent } from '../home-maitre/home-maitre.component';
import { HomeBartenderCocineroComponent } from '../home-bartender-cocinero/home-bartender-cocinero.component';
import { HomeDeliveryComponent } from '../home-delivery/home-delivery.component';
import { SpinnerService } from 'src/app/services/spinner.service';

import {  
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,IonSpinner,
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
  imports: [CommonModule,IonContent,IonFabButton,IonFab,IonSelect, IonSelectOption,FormsModule,  
    HomeAdminComponent,
    HomeMozoComponent,
    HomeClienteComponent,
    HomeMaitreComponent,
    HomeBartenderCocineroComponent,
    HomeDeliveryComponent,
    IonSpinner
  ],
})
export class HomeComponent implements OnInit, OnDestroy{

  user: string = 'No user logged in'
cargando: boolean = false;
 loading = false; 
  constructor(
    private toastr: ToastrService,
    private router: Router,
    private supabaseService: SupabaseService,
    public sesion: SesionService,
     private spinner: SpinnerService, 
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

    setTimeout(() => {
      console.log('[Home] usuarioActual:', this.sesion.usuarioActual?.email);
      console.log('[Home] usuarioBD:', this.sesion.usuarioBD);
      console.log('[Home] roles:', {
        dueno: this.sesion.esDueno(),
        supervisor: this.sesion.esSupervisor(),
        maitre: this.sesion.esMaitre(),
        mozo: this.sesion.esMozo(),
        cocinero: this.sesion.esCocinero(),
        bartender: this.sesion.esBartender(),
        delivery: this.sesion.esDelivery(),
        cliente: this.sesion.esCliente(),
      });
    }, 0);
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  // logOut() {
  //   this.supabaseService.logout()
  //     .then(() => {
  //       this.toastr.success('Sesión cerrada', '', { positionClass: 'toast-center' });
  //       this.router.navigate(['/login']);
  //     })
  //     .catch((error) => {
  //       console.error('Error logging out:', error);
  //       this.toastr.error('Error logging out: ' + (error?.message || ''));
  //     });
  // }
  async logOut() {
    if (this.loading) return;
    this.loading = true;
    this.cargando = true;
    this.spinner.show({ immediate: true });

    try {
      await this.supabaseService.logout();

      this.toastr.success('SESIÓN CERRADA', '', { positionClass: 'toast-center' });
      await this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Error logging out:', error);
      this.toastr.error('ERROR AL CERRAR SESIÓN: ' + (error?.message || 'ERROR DESCONOCIDO'), '', {
        positionClass: 'toast-center',
        timeOut: 4000
      });
    } finally {
      this.cargando = false;
      this.loading = false;
      this.spinner.hide();
    }
  }
  
}