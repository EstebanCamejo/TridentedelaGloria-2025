import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, personAdd, restaurant, create , statsChart} from 'ionicons/icons';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SupabaseService } from 'src/app/services/supabase.service';


@Component({
  selector: 'app-home-admin',
  standalone: true,
  imports: [CommonModule, IonContent, IonGrid, IonRow, IonCol, IonButton, IonIcon],
  templateUrl: './home-admin.component.html',
  styleUrls: ['./home-admin.component.scss']
})
export class HomeAdminComponent implements OnInit , OnDestroy{

  private rtChannel?: ReturnType<typeof this.supa.client.channel>;
  private notifiedIds = new Map<string, number>(); // id -> timestamp

  constructor(private router: Router, private supa: SupabaseService) {
    addIcons({ checkmarkDoneCircle, personAdd, restaurant, statsChart, create });    
  }

  async ngOnInit() {
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
  
    // Al tocar la notificación → ir a Pendientes
    LocalNotifications.addListener('localNotificationActionPerformed', async () => {
      this.router.navigate(['/admin/pendientes']);
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
            title: 'Nuevo cliente pendiente',
            body: `${nombre} espera aprobación`,
            channelId: 'default',
            extra: { route: '/admin/pendientes' }
          }]
        });
      })
      .subscribe();
  }
  

  ngOnDestroy() {
  if (this.rtChannel) this.supa.client.removeChannel(this.rtChannel as any);
  }

  irAListaDeEspera() { this.router.navigate(['/admin/pendientes']); }
  irAAltaUsuarios()  { this.router.navigate(['/admin/alta-usuario']); }
  irAAltaMesa()      { this.router.navigate(['/admin/alta-mesa']); }
  irAResultados()    { this.router.navigate(['/admin/resultados-encuestas']); }
}
