import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon, IonTitle, IonToolbar, IonHeader } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, personAdd, statsChart, calendarOutline, bicycleOutline } from 'ionicons/icons';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SupabaseService } from 'src/app/services/supabase.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { AdminRealtimeService } from 'src/app/services/admin-realtime.service';
import { AdminReservasRealtimeService } from 'src/app/services/admin-reservas-realtime.service'; 

@Component({
  selector: 'app-home-admin',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, CommonModule, IonContent, IonGrid, IonRow, IonCol, IonButton, IonIcon],
  templateUrl: './home-admin.component.html',
  styleUrls: ['./home-admin.component.scss']
})
export class HomeAdminComponent implements OnInit , OnDestroy{

  private rtChannel?: ReturnType<typeof this.supa.client.channel>;
  private notifiedIds = new Map<string, number>(); // id -> timestamp

  constructor(
    private router: Router, 
    private supa: SupabaseService, 
    private toast: ToastrService,
    private spinner: SpinnerService,
    private route: ActivatedRoute,
    private adminRt: AdminRealtimeService,
    private adminReservasRt: AdminReservasRealtimeService
  ) {
    addIcons({ 
      checkmarkDoneCircle, personAdd, statsChart, calendarOutline, bicycleOutline });    
  }

  async ngOnInit() {

    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'alta-usuario') {
      this.toast.success('EMPLEADO CREADO CORRECTAMENTE', '', {
        positionClass: 'toast-center',
        timeOut: 2200
      });

      // (opcional) limpiar el query param para no repetir el toast en refresh
      this.router.navigate([], {
        replaceUrl: true,
        queryParams: { from: null },           // elimina 'from'
        queryParamsHandling: 'merge'
      });
    }


    // 1) Notificaciones locales (permiso + canal Android)
    await LocalNotifications.requestPermissions();
    await LocalNotifications.createChannel({
      id: 'default',
      name: 'General',
      importance: 5,
    });
  
    // 2) Solo admins: dueno/supervisor
    const { data: auth } = await this.supa.client.auth.getUser();
    const authId = auth?.user?.id;
    if (!authId) return;
  
    const { data: me } = await this.supa.client
      .from('usuarios')
      .select('perfil')
      .eq('auth_id', authId)
      .single();
  
    if (!me || !['dueno','supervisor'].includes(me.perfil as string)) return;
  
    // Al tocar la notificación → ir a Pendientes o Reservas según el tipo
    LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
      console.log('[HomeAdminComponent] 🔔 Notificación tocada:', notification);
      
      const extra = notification.notification?.extra;
      if (extra?.tipo === 'nueva_reserva') {
        this.router.navigate(['/admin/reservas']);
      } else {
        this.router.navigate(['/admin/pendientes']);
      }
    });
  
    // 3) Realtime: INSERT en usuarios con estado='pendiente'
    this.rtChannel = this.supa.client
      .channel('rt:usuarios-pendientes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'usuarios',
        filter: 'estado=eq.pendiente'
      }, async (payload: any) => {
        const u = payload?.new || {};
        const uid = u?.id as string | undefined;
        if (!uid) return;
  
        // Anti-dup: evita repetir la misma fila en una ventana corta
        const now = Date.now();
        const ttlMs = 60_000; // 60s
        for (const [k, t] of this.notifiedIds) {
          if (now - t > ttlMs) this.notifiedIds.delete(k);
        }
        if (this.notifiedIds.has(uid)) return;
        this.notifiedIds.set(uid, now);
  
        const nombre = [u.apellidos, u.nombres].filter(Boolean).join(', ') || 'Cliente nuevo';
  
        await LocalNotifications.schedule({
          notifications: [{
            id: now % 1000000000,
            title: 'NUEVO CLIENTE PENDIENTE',
            body: `${nombre.toUpperCase()} ESPERA APROBACIÓN`,
            channelId: 'default',
            extra: { route: '/admin/pendientes' }
          }]
        });
      })
      .subscribe();

    // Inicializar servicios de notificaciones para administradores
    await this.adminRt.init();
    await this.adminReservasRt.init();
  }
  

  ngOnDestroy() {
    if (this.rtChannel) this.supa.client.removeChannel(this.rtChannel as any);
    this.adminRt.dispose();
    this.adminReservasRt.dispose();
  }

  irAListaDeEspera() { this.router.navigate(['/admin/pendientes']); }
  irAAltas()          { this.router.navigate(['/admin/altas']); }
  irAResultados()     { this.router.navigate(['/pagina-resultados-encuestas']); }
  irAReservas()       { this.router.navigate(['/admin/reservas']); }
  irADelivery()       { this.router.navigate(['/admin/delivery']); }

}
