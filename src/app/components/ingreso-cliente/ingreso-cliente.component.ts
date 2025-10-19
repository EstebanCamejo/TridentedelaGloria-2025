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


//ultimo
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton, IonIcon, IonHeader, IonToolbar, IonModal } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { qrCodeOutline, albumsOutline } from 'ionicons/icons';
import { SupabaseService, UsuarioLocalData } from 'src/app/services/supabase.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { checkmarkCircleOutline, hourglassOutline, peopleOutline } from 'ionicons/icons';

type EstadoLE = 'noAtendido' | 'esperando' | 'asignado' | 'finalizado';
addIcons({ qrCodeOutline, albumsOutline, checkmarkCircleOutline, hourglassOutline, peopleOutline });

@Component({
  selector: 'app-ingreso-cliente',
  templateUrl: './ingreso-cliente.component.html',
  styleUrls: ['./ingreso-cliente.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule ,IonContent, IonButton, IonIcon, IonHeader, IonToolbar, IonModal],
})

export class IngresoClienteComponent implements OnInit {
  ui: '' | 'form' | 'none' | 'esperando' | 'mesa-lista' = '';
  mesa_numero: number | null = null;
  cant = 2;
  nota = '';
  isReady = false;
  userData: UsuarioLocalData | null = null;
 
  constructor(
    private supa: SupabaseService,
    private router: Router,
    private toast: ToastController,
  ) {
    addIcons({ qrCodeOutline, albumsOutline });
  }

  async ngOnInit() {
    console.log('=== INICIO ngOnInit ingreso-cliente ===');
    
    // Primero intentar obtener datos del localStorage
    try {
      this.userData = await this.supa.getUserDataFromLocal();
      
      if (this.userData && this.userData.auth_id) {
        console.log('✅ Datos de usuario obtenidos del localStorage:', this.userData);
        // Actualizar idUsuario en el servicio con los datos locales
        this.supa.idUsuario = this.userData.auth_id;
        console.log('✅ idUsuario actualizado a:', this.supa.idUsuario);
        
        // Marcar como listo - no necesitamos verificar sesión de Supabase
        // porque usaremos los datos locales para las consultas
        this.isReady = true;
        console.log('✅ Componente listo con datos locales');
        return;
      } else {
        console.log('❌ No hay datos en localStorage o están incompletos');
      }
    } catch (error) {
      console.error('❌ Error al obtener datos del localStorage:', error);
    }

    // Si no hay datos en localStorage, intentar verificar la sesión de Supabase
    try {
      console.log('🔄 Intentando verificar sesión de Supabase...');
      await this.supa.ensureSessionOrThrow();
      console.log('✅ Sesión verificada correctamente en ingreso-cliente');
      this.isReady = true;
    } catch (error) {
      console.error('❌ Error al verificar sesión en ingreso-cliente:', error);
      this.msg('Error de sesión. Por favor, inicia sesión nuevamente.', true);
      // Redirigir al login si no hay sesión válida
      this.router.navigate(['/login']);
    }
    
    console.log('=== FIN ngOnInit ingreso-cliente ===');
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
  console.log('=== INICIO inscribirme() ===');
  console.log('isReady:', this.isReady);
  console.log('userData:', this.userData);
  console.log('idUsuario en servicio:', this.supa.idUsuario);
  
  // Verificar que el componente esté listo
  if (!this.isReady) {
    console.log('❌ Componente no está listo');
    this.msg('El componente aún se está inicializando. Intenta nuevamente.', true);
    return;
  }

  try {
    // Asegurar que tenemos el idUsuario correcto
    if (this.userData && this.userData.auth_id) {
      console.log('✅ Usando datos locales, idUsuario:', this.userData.auth_id);
      this.supa.idUsuario = this.userData.auth_id;
    } else if (!this.supa.idUsuario) {
      console.log('❌ No hay idUsuario disponible');
      throw new Error('No hay datos de usuario disponibles');
    }
    
    console.log('🔄 Obteniendo estado de espera...');
    const d = await this.supa.getWaitStatusDetail();
    console.log('Estado obtenido:', d);

    if (!d || d.estado === 'noAtendido') {
      console.log('📝 Mostrando formulario de inscripción');
      this.cant = 2;
      this.nota = '';
      this.ui = 'form';
      return;
    }
    if (d.estado === 'esperando') {
      console.log('⏳ Usuario ya está en lista de espera');
      this.ui = 'esperando';
      return;
    }
    if (d.estado === 'asignado') {
      console.log('✅ Usuario tiene mesa asignada:', d.numero_mesa);
      this.mesa_numero = d.numero_mesa ?? null;
      this.ui = 'mesa-lista';
      return;
    }

    // fallback
    console.log('📝 Fallback: mostrando formulario');
    this.ui = 'form';
  } catch (e: any) {
    console.error('❌ Error en inscribirme():', e);
    this.msg(e?.message || 'Error al consultar tu estado.', true);
  }
  
  console.log('=== FIN inscribirme() ===');
}


  async confirmarInscripcion() {
    console.log('=== INICIO confirmarInscripcion() ===');
    
    if (!Number.isInteger(this.cant) || this.cant < 1 || this.cant > 12) {
      console.log('❌ Cantidad inválida:', this.cant);
      this.msg('Ingresá una cantidad válida (1–12).', true);
      return;
    }
    
    try {
      // Asegurar que tenemos el idUsuario correcto
      if (this.userData && this.userData.auth_id) {
        console.log('✅ Usando datos locales, idUsuario:', this.userData.auth_id);
        this.supa.idUsuario = this.userData.auth_id;
      } else if (!this.supa.idUsuario) {
        console.log('❌ No hay idUsuario disponible');
        throw new Error('No hay datos de usuario disponibles');
      }
      
      console.log('🔄 Inscribiendo en lista de espera...');
      console.log('Cantidad:', this.cant, 'Nota:', this.nota);
      
      await this.supa.joinWaitlist(this.cant, this.nota?.trim() || undefined);
      
      console.log('✅ Inscripción exitosa');
      this.ui = 'none';
      this.msg('¡Listo! Quedaste en la lista de espera.');
    } catch (e: any) {
      console.error('❌ Error en confirmarInscripcion():', e);
      this.msg(e?.message || 'No se pudo inscribir.', true);
    }
    
    console.log('=== FIN confirmarInscripcion() ===');
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