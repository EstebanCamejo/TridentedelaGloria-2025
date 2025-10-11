// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { IonContent, IonButton, IonIcon, IonHeader, IonToolbar } from '@ionic/angular/standalone';
// import { AlertController, ToastController } from '@ionic/angular';
// import { addIcons } from 'ionicons';
// import { qrCodeOutline, albumsOutline } from 'ionicons/icons';
// import { SupabaseService } from 'src/app/services/supabase.service';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-ingreso-cliente',
//   templateUrl: './ingreso-cliente.component.html',
//   styleUrls: ['./ingreso-cliente.component.scss'],
//   standalone: true,
//   imports: [CommonModule, IonContent, IonButton, IonIcon, IonHeader, IonToolbar],
// })
// export class IngresoClienteComponent{
//   constructor(
//     private supa: SupabaseService,
//     private router: Router,
//     private alertCtrl: AlertController,
//     private toast: ToastController,
//   ) {
//     addIcons({ qrCodeOutline, albumsOutline });
//   }

//   async inscribirme() {
//   try {
//     const actual = await this.supa.getMyActiveWait();

//     // --- Caso 1: ya tiene mesa asignada ---
//     if (actual?.estado === 'asignado') {
//       const mesaTxt = actual.mesa_id ? `Tu número de mesa es: ${actual.numero_mesa}` : 'Tu mesa está lista';
//       const a = await this.alertCtrl.create({
//         header: '¡Tu mesa está lista!',
//         message: mesaTxt,
//         buttons: [
//           { text: 'Cerrar', role: 'cancel' }
//         ]
//       });
//       await a.present();
//       return;
//     }

//     // --- Caso 2: ya está esperando pero aún sin asignación ---
//     if (actual?.estado === 'esperando') {
//       const a = await this.alertCtrl.create({
//         header: 'Estás en la lista de espera',
//         message: 'Aún no te asignaron mesa.',
//         buttons: [{ text: 'Ok', role: 'cancel' }]
//       });
//       await a.present();
//       return;
//     }

//     // --- Caso 3: no estaba inscripto → pedir datos y anotar ---
//     const alert = await this.alertCtrl.create({
//       header: 'Lista de espera',
//       message: 'Indicá cuántas personas son (1–12).',
//       inputs: [
//         { name: 'cantidad', type: 'number', placeholder: '2', min: 1, max: 12, value: 2 },
//         { name: 'nota', type: 'text', placeholder: 'Opcional: cochecito, silla alta…' },
//       ],
//       buttons: [
//         { text: 'Cancelar', role: 'cancel' },
//         {
//           text: 'Confirmar',
//           handler: async (vals: any) => {
//             const cant = Number(vals?.cantidad ?? 0);
//             const nota = (vals?.nota ?? '').trim();
//             if (!Number.isInteger(cant) || cant < 1 || cant > 12) {
//               this.msg('Ingresá una cantidad válida (1–12).', true);
//               return false;
//             }
//             try {
//               await this.supa.joinWaitlist(cant, nota || undefined);
//               this.msg('¡Listo! Quedaste en la lista de espera.');
//             } catch (e:any) {
//               this.msg(e?.message || 'No se pudo inscribir.', true);
//               return false;
//             }
//             return true;
//           }
//         }
//       ]
//     });
//     await alert.present();
//   } catch (e:any) {
//     this.msg(e?.message || 'Error al consultar tu estado.', true);
//   }
// }


//   verEncuestas() {
//     this.router.navigateByUrl('/encuestas'); // ajustá la ruta real
//   }

//   private async msg(text: string, error=false) {
//     const t = await this.toast.create({ message: text, duration: 1800, position: 'top', color: error ? 'danger' : 'success' });
//     await t.present();
//   }
// }
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton, IonIcon, IonHeader, IonToolbar, IonToast, IonModal } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { qrCodeOutline, albumsOutline } from 'ionicons/icons';
import { SupabaseService } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { checkmarkCircleOutline, hourglassOutline, peopleOutline } from 'ionicons/icons';

type EstadoLE = 'noAtendido' | 'esperando' | 'asignado';
addIcons({ qrCodeOutline, albumsOutline, checkmarkCircleOutline, hourglassOutline, peopleOutline });

@Component({
  selector: 'app-ingreso-cliente',
  templateUrl: './ingreso-cliente.component.html',
  styleUrls: ['./ingreso-cliente.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule ,IonContent, IonButton, IonIcon, IonHeader, IonToolbar, IonToast, IonModal],
})

export class IngresoClienteComponent{
  ui: '' | 'form' | 'none' | 'esperando' | 'mesa-lista' = '';
  mesa_numero: number | null = null;
  cant = 2;
  nota = '';
 isReady = false;
 
  constructor(
    private supa: SupabaseService,
    private router: Router,
    private toast: ToastController,
  ) {
    addIcons({ qrCodeOutline, albumsOutline });
        const nav = this.router.getCurrentNavigation();
  }
  // async inscribirme() {

  //   try {
  //   //   console.log("entre a inscribirme");
  //     console.log(this.supa.idUsuario);
  //    const { data: actual, error } = await this.supa.client
  //     .from('lista_espera')
  //     .select('estado, numero_mesa')
  //     .eq('usuario_id', this.supa.idUsuario)
  //     .limit(1)
  //     .maybeSingle(); // <- no lanza si no hay fila, devuelve null
  //     // const usuarioPrueba = await this.supa.obtenerUsuarioActual();
  //     // console.log(usuarioPrueba);
      

  //     // console.log(actual);
  //     if (actual?.estado === 'asignado') {

  //       // mostrar hoja de "mesa lista"
  //       this.mesa_numero = Number(actual?.numero_mesa ?? 0) || null;
  //       this.ui = 'mesa-lista';
  //       return;
  //     }
  //     else if (actual?.estado === 'esperando') {
  //       this.ui = 'esperando';
  //       return;
  //     }      
  //     else{
  //     this.cant = 2;
  //     this.nota = '';
  //       this.ui = 'form';
  //       return;
  //     }

  //     // no estaba inscripto → abrir form en bottom-sheet
  //     // this.cant = 2;
  //     // this.nota = '';
  //     // this.ui = 'form';
  //     // console.log("hola", this.ui);
  //   } catch (e:any) {
  //     this.msg(e?.message || 'Error al consultar tu estado.', true);
  //   }
  // }
//   async inscribirme() {
//     console.log('entre');
//   try {
//     //await this.supa.ensureSessionOrThrow();      // por si venís de overlay de cámara
//     const row = await this.supa.ensureWaitRow(); // crea o reusa con estado 'noAtendido'

//     // Mostrá según estado actual
//     if (row.estado === 'asignado') {
//       this.mesa_numero = Number(row.numero_mesa ?? 0) || null;
//       this.ui = 'mesa-lista';
//     } else if (row.estado === 'esperando') {
//       this.ui = 'esperando';
//     } else {
//       // 'noAtendido' → mostrar form para completar cant/nota y confirmar
//       this.cant = row.cantidad_comensales ?? 2;
//       this.nota = row.nota ?? '';
//       this.ui = 'form';
//     }
//   } catch (e:any) {
//     this.msg(e?.message || 'Error al iniciar la lista de espera.', true);
//   }
// }

    //   console.log("entre a inscribirme");
    //   console.log(this.supa.idUsuario);
    //  const { data: actual, error } = await this.supa.client
    //   .from('lista_espera')
    //   .select('estado, numero_mesa')
    //   .eq('usuario_id', this.supa.idUsuario)
    //   .limit(1)
    //   .maybeSingle(); // <- no lanza si no hay fila, devuelve null
    //   // const usuarioPrueba = await this.supa.obtenerUsuarioActual();
    //   // console.log(usuarioPrueba);
      


async inscribirme() {
  //       console.log("entre a inscribirme");
  //     console.log(this.supa.idUsuario);
  // try {
  //     const { data: actual, error } = await this.supa.client
  //       .from('lista_espera')
  //       .select('id, estado, numero_mesa')
  //       .eq('usuario_id', this.supa.idUsuario)
  //       .in('estado', ['noAtendido','esperando','asignado'])
  //       .order('created_at', { ascending: false }) // quítalo si no existe
  //       .limit(1)
  //       .maybeSingle();

  //     if (error) throw error;
  //     console.log("entre a inscribirme");
  //     console.log(this.supa.idUsuario);
  //     console.log(error);

  //     const estado = (actual?.estado as EstadoLE) ?? 'noAtendido';
  //     console.log('actual', actual?.id);
  //     console.log('estado',estado);
  //     if (estado === 'noAtendido') {
  //       this.ui = 'form';
  //       return;
  //     }
  //     if (estado === 'asignado') {
  //       this.mesa_numero = actual?.numero_mesa ?? null;
  //       this.ui = 'mesa-lista';
  //       return;
  //     }
  //     if (estado === 'esperando') {
  //       this.ui = 'esperando';
  //       return;
  //     }

  //     // si no hay fila o está en noAsignado -> mostrar form para completar datos
  //     this.cant = Math.max(1, this.cant || 2);
  //     this.nota = this.nota ?? '';
  //     this.ui = 'form';
  //   } catch (e: any) {
  //     console.error('[inscribirme] error', e);
  //     console.log('e.message:',e.message);
  //      console.log('e:',e);
  //     // tu toast/mensaje
  //   }
  const { data: sess } = await this.supa.client.auth.getSession();
console.log('token?', !!sess?.session?.access_token, 'uid?', sess?.session?.user?.id);

      await this.supa.ensureSessionOrThrow(); // 👈 asegura token cargado
    const d = await this.supa.getWaitStatusDetail();

  try {
    console.log('[inscribirme] uid =', this.supa.idUsuario);
    const d = await this.supa.getWaitStatusDetail();
    console.log('[inscribirme] fila activa =', d);

    if (!d || d.estado === 'noAtendido') {
      this.cant = 2; this.nota = ''; this.ui = 'form'; return;
    }
    if (d.estado === 'esperando') { this.ui = 'esperando'; return; }
    if (d.estado === 'asignado')  { this.mesa_numero = d.numero_mesa ?? null; this.ui = 'mesa-lista'; return; }
  } catch (e) {
    console.error('[inscribirme] error', e);
  }
}


  async confirmarInscripcion() {
    if (!Number.isInteger(this.cant) || this.cant < 1 || this.cant > 12) {
      this.msg('Ingresá una cantidad válida (1–12).', true);
      return;
    }
    try {
      await this.supa.joinWaitlist(this.cant, this.nota?.trim() || undefined);
      this.ui = 'none';
      this.msg('¡Listo! Quedaste en la lista de espera.');
    } catch (e:any) {
      this.msg(e?.message || 'No se pudo inscribir.', true);
    }
  }


  cerrarModal(){ this.ui = 'none'; }

  verEncuestas() { this.router.navigateByUrl('/pagina-resultados-encuestas'); }

  private async msg(text: string, error=false) {
    const t = await this.toast.create({
      message: text,
      duration: 1800,
      position: 'top',
      cssClass: error ? 'snack danger' : 'snack ok'
    });
    await t.present();
  }
}
