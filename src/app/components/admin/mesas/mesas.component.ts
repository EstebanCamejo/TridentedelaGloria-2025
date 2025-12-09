import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject, NgZone, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton,
         IonBadge, IonIcon, IonRefresher, IonRefresherContent, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, pencil, refresh, trash, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { ModalController } from '@ionic/angular';
import { AltaMesaComponent } from '../alta-mesa/alta-mesa.component';
import { MesasService, MesaRow } from 'src/app/services/mesas.service';
import { MesasStateService } from 'src/app/services/mesas-state.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import type { RefresherCustomEvent, ViewWillEnter, ViewDidEnter } from '@ionic/angular';
import { ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { register } from 'swiper/element/bundle';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.scss'],
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButton,
    IonBadge, IonIcon, IonRefresher, IonRefresherContent
  ],
  providers: [ModalController],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MesasComponent implements OnInit, OnDestroy, ViewWillEnter, ViewDidEnter {
  private modalCtrl = inject(ModalController);
  private mesasSrv = inject(MesasService);
  private mesasState = inject(MesasStateService);
  private alertCtrl = inject(AlertController);
  private mesasSubscription?: Subscription;

  mesas: MesaRow[] = [];
  cargando = false;
  currentSlide: number = 0;

  trackById = (_: number, m: MesaRow) => m.id;

  // Placeholder inline: NO hace request a assets ni a la red
  readonly phSvg =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
      <rect width="100%" height="100%" rx="12" fill="#f6ecdc"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
            font-family="Inter, Arial" font-size="12" fill="#5d2222">S/F</text>
    </svg>`
  );

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private router: Router,
    private spinner: SpinnerService,
    private toast: ToastrService
  ) {
    addIcons({ add, pencil, refresh, trash, chevronBackOutline, chevronForwardOutline });
    register(); // Registrar Swiper
  }

  ngOnInit() {
    // 🆕 Obtener el estado actual inmediatamente (por si el observable ya tiene datos)
    const mesasActuales = this.mesasState.getMesas();
    if (mesasActuales.length > 0) {
      console.log('[mesas] Ya hay mesas en el estado, actualizando UI inmediatamente:', mesasActuales.length);
      this.zone.run(() => {
        this.mesas = [...mesasActuales];
        this.cdr.markForCheck();
      });
    }

    // 🆕 Suscribirse al estado de mesas del servicio singleton
    // BehaviorSubject emite el valor actual inmediatamente al suscribirse
    this.mesasSubscription = this.mesasState.mesas$.subscribe(mesas => {
      console.log('[mesas] Observable emitió. Total mesas:', mesas.length);
      this.zone.run(() => {
        this.mesas = [...mesas];
        this.cdr.markForCheck();
        console.log('[mesas] Estado actualizado desde servicio. Total:', mesas.length, 'this.mesas.length =', this.mesas.length);
      });
    });

    // Cargar mesas desde Supabase (primera vez o si no hay datos)
    // Usar setTimeout para asegurar que la suscripción esté lista
    setTimeout(() => {
      this.cargarMesas();
    }, 0);
  }

  ngOnDestroy() {
    // Limpiar suscripción
    this.mesasSubscription?.unsubscribe();
  }
  
  async ionViewWillEnter(): Promise<void> {
    // Forzar recarga cuando se vuelve a esta vista
    console.log('[mesas] ionViewWillEnter: recargando mesas...');
    console.log('[mesas] Estado actual: mesas.length =', this.mesas.length, 'cargando =', this.cargando);
    
    // 🆕 Verificar si ya hay mesas en el estado antes de cargar
    const mesasEnEstado = this.mesasState.getMesas();
    console.log('[mesas] Mesas en estado al entrar:', mesasEnEstado.length);
    
    if (mesasEnEstado.length > 0) {
      // Si ya hay mesas en el estado, actualizar la UI inmediatamente
      console.log('[mesas] Actualizando UI con mesas existentes en estado...');
      this.zone.run(() => {
        this.mesas = [...mesasEnEstado];
        this.cdr.markForCheck();
        console.log('[mesas] UI actualizada. mesas.length =', this.mesas.length);
      });
    }
    
    // Recargar mesas desde Supabase (actualizará el observable y la UI se actualizará automáticamente)
    await this.cargarMesas();
  }
  
  async ionViewDidEnter(): Promise<void> {
    // Verificar que las mesas se cargaron correctamente
    console.log('[mesas] ionViewDidEnter: verificando mesas...');
    
    // 🆕 Verificación con delay para asegurar que todo esté sincronizado
    setTimeout(() => {
      const mesasEnEstado = this.mesasState.getMesas();
      console.log('[mesas] ionViewDidEnter (después de delay): mesas.length =', this.mesas.length, 'mesasEnEstado.length =', mesasEnEstado.length, 'cargando =', this.cargando);
      
      // 🆕 CRÍTICO: Si cargando está en true pero ya hay mesas, forzar reset
      if (this.cargando && (this.mesas.length > 0 || mesasEnEstado.length > 0)) {
        console.log('[mesas] ⚠️ cargando está en true pero hay mesas, forzando reset de cargando...');
        this.zone.run(() => {
          this.cargando = false;
          this.cdr.markForCheck();
          console.log('[mesas] ✅ cargando = false (forzado en ionViewDidEnter)');
        });
      }
      
      // Si hay mesas en el estado pero no en la UI, forzar actualización
      if (mesasEnEstado.length > 0 && this.mesas.length === 0) {
        console.log('[mesas] ⚠️ Hay mesas en el estado pero no en la UI, forzando actualización...');
        this.zone.run(() => {
          this.mesas = [...mesasEnEstado];
          this.cargando = false; // Asegurar que cargando esté en false
          this.cdr.markForCheck();
          console.log('[mesas] ✅ UI actualizada forzadamente. mesas.length =', this.mesas.length);
        });
      }
      
      // Si no hay mesas después de un momento, intentar recargar una vez más
      if (this.mesas.length === 0 && !this.cargando && mesasEnEstado.length === 0) {
        console.log('[mesas] ⚠️ No hay mesas visibles después de cargar, intentando recargar...');
        setTimeout(async () => {
          const mesasActuales = this.mesasState.getMesas();
          if (mesasActuales.length === 0 && !this.cargando) {
            await this.cargarMesas();
          } else if (mesasActuales.length > 0 && this.mesas.length === 0) {
            // Forzar actualización si hay mesas en el estado
            console.log('[mesas] ⚠️ Forzando actualización final...');
            this.zone.run(() => {
              this.mesas = [...mesasActuales];
              this.cargando = false; // Asegurar que cargando esté en false
              this.cdr.markForCheck();
              console.log('[mesas] ✅ UI actualizada finalmente. mesas.length =', this.mesas.length);
            });
          }
        }, 500);
      }
    }, 100);
  }
 
  async cargarMesas(ev?: CustomEvent) {
    // 🆕 Evitar múltiples llamadas concurrentes usando un flag simple
    // PERO si viene de pull-to-refresh, siempre ejecutar
    if (this.cargando && !ev) {
      console.log('[mesas] cargarMesas - Ya hay una carga en curso, omitiendo...');
      // 🆕 Si cargando está en true por mucho tiempo, forzar reset
      setTimeout(() => {
        if (this.cargando) {
          console.log('[mesas] ⚠️ cargando está en true por mucho tiempo, forzando reset...');
          this.zone.run(() => {
            this.cargando = false;
            this.cdr.markForCheck();
          });
        }
      }, 5000); // 5 segundos de timeout
      return;
    }
    
    console.time('[mesas] cargarMesas');
    console.log('[mesas] cargarMesas - Iniciando carga de mesas...');
    console.log('[mesas] Estado ANTES de cargar: mesas.length =', this.mesas.length, 'cargando =', this.cargando);
    
    try {
      // Actualizar estado de carga dentro de NgZone
      this.zone.run(() => {
        this.cargando = true;
        this.cdr.markForCheck();
        console.log('[mesas] cargando = true (marcado)');
      });
      
      if (!ev) {
        // Solo mostrar spinner si no es pull-to-refresh (que ya tiene su propio indicador)
        this.spinner.show({ immediate: true });
      }
      
      // 🆕 Usar el servicio de estado para cargar mesas
      // El servicio actualizará automáticamente el observable y la UI se actualizará
      console.log('[mesas] Llamando a mesasState.cargarMesas()...');
      const mesasCargadas = await this.mesasState.cargarMesas();
      console.log('[mesas] cargarMesas() completado. Mesas cargadas:', mesasCargadas.length);
      
      // 🆕 Verificar que el observable se actualizó
      const mesasEnEstado = this.mesasState.getMesas();
      console.log('[mesas] Mesas en estado después de cargar:', mesasEnEstado.length);
      console.log('[mesas] Mesas en componente después de cargar:', this.mesas.length);
      
      // 🆕 Si hay mesas en el estado pero no en el componente, forzar actualización
      if (mesasEnEstado.length > 0 && this.mesas.length === 0) {
        console.log('[mesas] ⚠️ Forzando actualización de UI después de cargar...');
        this.zone.run(() => {
          this.mesas = [...mesasEnEstado];
          this.cdr.markForCheck();
          console.log('[mesas] UI actualizada. mesas.length =', this.mesas.length);
        });
      }
      
    } catch (e: any) {
      console.error('[mesas] cargarMesas error:', e);
      console.error('[mesas] Error completo:', JSON.stringify(e, null, 2));
      
      const errorMessage = e?.message || e?.error?.message || 'ERROR AL CARGAR LAS MESAS';
      console.error('[mesas] Mostrando toast de error:', errorMessage);
      
      this.toast.error(errorMessage.toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 5000
      });
    } finally {
      // Asegurar que el estado de carga se actualice incluso si hay errores
      console.log('[mesas] cargarMesas - finally block, ocultando spinner...');
      console.log('[mesas] Estado ANTES de finally: mesas.length =', this.mesas.length, 'cargando =', this.cargando);
      
      // 🆕 CRÍTICO: Asegurar que cargando se ponga en false SIEMPRE
      // Usar setTimeout para asegurar que se ejecute incluso si hay problemas
      setTimeout(() => {
        this.zone.run(() => {
          this.cargando = false;
          this.cdr.markForCheck();
          console.log('[mesas] ✅ cargando = false (marcado en finally con timeout)');
        });
      }, 0);
      
      // También ponerlo inmediatamente (por si el timeout no es necesario)
      this.zone.run(() => {
        this.cargando = false;
        this.cdr.markForCheck();
        console.log('[mesas] ✅ cargando = false (marcado en finally inmediato)');
      });
      
      if (!ev) {
        this.spinner.hide();
        console.log('[mesas] Spinner ocultado');
      }
      
      // cerrar refresher de forma segura, si vino de pull-to-refresh
      try {
        (ev as any)?.detail?.complete?.();
      } catch (err) {
        console.error('[mesas] Error al completar refresher:', err);
      }
      
      // Verificar después de un momento que cargando esté en false
      setTimeout(() => {
        console.log('[mesas] Verificación final: mesas.length =', this.mesas.length, 'cargando =', this.cargando);
        if (this.cargando) {
          console.error('[mesas] ❌ ERROR: cargando sigue en true después de finally! Forzando reset...');
          this.zone.run(() => {
            this.cargando = false;
            this.cdr.markForCheck();
          });
        }
      }, 100);
      
      console.log('[mesas] Estado DESPUÉS de finally: mesas.length =', this.mesas.length, 'cargando =', this.cargando);
      console.timeEnd('[mesas] cargarMesas');
    }
  }
  
  

  // async cargarMesas(ev?: RefresherCustomEvent) {
  //   try {
  //     this.cargando = true;
  //     this.cdr.markForCheck();   //
  //     this.mesas = await this.mesasSrv.listarMesas();
  //     console.log('[mesas] cargadas', this.mesas.length);
  //   } catch (e) {
  //     console.error('[mesas] cargarMesas error', e);
  //   } finally {
  //     this.cargando = false;
  //     ev?.detail?.complete?.();
  //     // 👇 en Ionic 7 se completa así
  //   }
  // }
  
  
  private async recargarVista() {
    // fuerza un reload del componente sin tocar el historial
    await this.router.navigateByUrl('/home-admin', { skipLocationChange: true });
    await this.router.navigateByUrl('/admin/mesas', { replaceUrl: true });
    // y por las dudas, pedimos los datos otra vez
    await this.cargarMesas();
  }

  // NUEVA (modal sin id)
  async crearMesa() {
    const modal = await this.modalCtrl.create({
      component: AltaMesaComponent,
      canDismiss: true,
      breakpoints: [0, 0.9],
      initialBreakpoint: 0.9
    });
    await modal.present();
  
    // 👇 Esperar a que el modal se cierre
    const { role, data } = await modal.onWillDismiss();
    console.log('[mesas] modal role =', role);
  
    if (role === 'saved') {
      // 🆕 Actualización optimista usando el servicio de estado
      console.log('[mesas] Mesa creada exitosamente. Agregando a la UI de forma optimista...');
      
      // Si la pantalla de alta devolvió la mesa creada, agregarla al servicio de estado
      if (data?.mesa) {
        // Agregar optimistamente al servicio (actualiza la UI automáticamente vía observable)
        this.mesasState.agregarMesaOptimista(data.mesa);
        
        // 🆕 NO sincronizar automáticamente para evitar problemas de LockManager
        // La mesa ya está visible en la UI de forma optimista
        // El usuario puede sincronizar manualmente con pull-to-refresh cuando quiera
        console.log('[mesas] Mesa agregada optimistamente. Sincronización manual disponible con pull-to-refresh.');
      } else {
        // Si no hay datos de mesa, hacer un pequeño delay y recargar
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.recargarVista();
      }
      
      // Navegar al panel del admin después de crear la mesa
      console.log('[mesas] ✅ Mesa creada, navegando al panel del admin');
      this.router.navigateByUrl('/home-admin', { replaceUrl: true });
    }
  }
  


  // EDITAR (modal con id)
  async editarMesa(mesa: MesaRow) {
    console.log('[mesas] Editando mesa:', mesa);
    if (!mesa || !mesa.id) {
      console.error('[mesas] Mesa o ID inválido:', mesa);
      return;
    }
    
    const modal = await this.modalCtrl.create({
      componentProps: { mesaId: mesa.id },
      component: AltaMesaComponent,
      canDismiss: true,
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    console.log('[mesas] modal role =', role);
    if (role === 'saved') await this.recargarVista();
    
  }
  estadoColor(estado: MesaRow['estado']) {
    switch (estado) {
      case 'libre': return 'success';
      case 'ocupada': return 'danger';
      case 'reservada': return 'warning';
      case 'bloqueada': return 'medium';
      default: return 'medium';
    }
  }

  estadoTexto(estado: MesaRow['estado']): string {
    switch (estado) {
      case 'libre': return 'LIBRE';
      case 'ocupada': return 'OCUPADA';
      case 'reservada': return 'RESERVADA';
      case 'bloqueada': return 'BLOQUEADA';
      default: return String(estado).toUpperCase();
    }
  }

  tipoTexto(tipo: MesaRow['tipo']): string {
    switch (tipo) {
      case 'vip': return 'EXCLUSIVA';
      case 'estandar': return 'ESTÁNDAR';
      case 'mov_reducida': return 'MOVILIDAD REDUCIDA';
      default: return String(tipo).toUpperCase();
    }
  }

  async mostrarOpcionesMesa(m: MesaRow) {
    const alert = await this.alertCtrl.create({
      header: 'MESA #' + m.numero,
      cssClass: 'mesas-alert-options',
      buttons: [
        {
          text: '✏️',
          role: 'edit',
          cssClass: 'mesas-alert-btn-edit',
          handler: () => {
            this.editarMesa(m);
            return true;
          }
        },
        {
          text: '🗑️',
          role: 'destructive',
          cssClass: 'mesas-alert-btn-delete',
          handler: () => {
            this.confirmarEliminacion(m);
            return true;
          }
        }
      ]
    });
    
    await alert.present();
    
    // Función robusta para aplicar estilos a los botones de opciones
    const applyStyles = () => {
      const selectors = [
        '.alert-wrapper.mesas-alert-options',
        '.alert-wrapper',
        'ion-alert.mesas-alert-options',
        'ion-alert'
      ];
      
      let alertWrapper: Element | null = null;
      for (const selector of selectors) {
        alertWrapper = document.querySelector(selector);
        if (alertWrapper) break;
      }
      
      if (!alertWrapper) return;
      
      const buttonSelectors = [
        '.alert-button',
        'button.alert-button',
        '.alert-button-group button',
        'button[class*="alert-button"]'
      ];
      
      let buttons: NodeListOf<Element> | null = null;
      for (const selector of buttonSelectors) {
        buttons = alertWrapper.querySelectorAll(selector);
        if (buttons && buttons.length > 0) break;
      }
      
      if (!buttons || buttons.length === 0) return;
      
      buttons.forEach((btn: any) => {
        if (!btn || !btn.style) return;
        
        btn.style.setProperty('width', 'calc(50% - 7.5px)', 'important');
        btn.style.setProperty('height', '150px', 'important');
        btn.style.setProperty('font-size', '80px', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('display', 'flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('flex', '1 1 50%', 'important');
        btn.style.setProperty('border-radius', '16px', 'important');
        btn.style.setProperty('box-shadow', '0 8px 16px rgba(0, 0, 0, 0.5)', 'important');
        
        if (btn.classList.contains('mesas-alert-btn-edit')) {
          btn.style.setProperty('background', '#28a745', 'important');
          btn.style.setProperty('border', '4px solid #1e7e34', 'important');
        } else if (btn.classList.contains('mesas-alert-btn-delete')) {
          btn.style.setProperty('background', '#dc3545', 'important');
          btn.style.setProperty('border', '4px solid #bd2130', 'important');
        }
        
        const buttonInner = btn.querySelector('.button-inner') || btn.querySelector('span');
        if (buttonInner) {
          (buttonInner as HTMLElement).style.setProperty('font-size', '80px', 'important');
          (buttonInner as HTMLElement).style.setProperty('color', '#ffffff', 'important');
          (buttonInner as HTMLElement).style.setProperty('display', 'flex', 'important');
          (buttonInner as HTMLElement).style.setProperty('align-items', 'center', 'important');
          (buttonInner as HTMLElement).style.setProperty('justify-content', 'center', 'important');
        }
      });
      
      const buttonGroup = alertWrapper.querySelector('.alert-button-group');
      if (buttonGroup) {
        (buttonGroup as HTMLElement).style.setProperty('display', 'flex', 'important');
        (buttonGroup as HTMLElement).style.setProperty('flex-direction', 'row', 'important');
        (buttonGroup as HTMLElement).style.setProperty('gap', '15px', 'important');
        (buttonGroup as HTMLElement).style.setProperty('width', '100%', 'important');
      }
    };

    // Aplicar múltiples veces para asegurar que se apliquen
    setTimeout(applyStyles, 50);
    setTimeout(applyStyles, 150);
    setTimeout(applyStyles, 300);
    setTimeout(applyStyles, 500);

    // MutationObserver para detectar cambios en el DOM
    const observer = new MutationObserver(() => {
      applyStyles();
    });

    setTimeout(() => {
      const alertElement = document.querySelector('.alert-wrapper') || document.querySelector('ion-alert');
      if (alertElement) {
        observer.observe(alertElement, {
          childList: true,
          subtree: true,
          attributes: true
        });
        
        setTimeout(() => {
          observer.disconnect();
        }, 2000);
      }
    }, 100);
  }

  async confirmarEliminacion(m: MesaRow) {
    const alert = await this.alertCtrl.create({
      header: 'CONFIRMAR ELIMINACIÓN',
      cssClass: 'mesas-alert-confirm',
      buttons: [
        { 
          text: '✗',
          role: 'cancel',
          cssClass: 'mesas-alert-btn-cancel',
          handler: () => {
            return true;
          }
        },
        {
          text: '✓',
          role: 'confirm',
          cssClass: 'mesas-alert-btn-confirm',
          handler: async () => {
            await alert.dismiss();
            
            // 🆕 Guardar la mesa antes de eliminar para rollback si falla
            const mesaAEliminar = m;
            
            // 🆕 Eliminar optimistamente del servicio de estado (actualiza UI inmediatamente)
            this.mesasState.eliminarMesaOptimista(m.id);
            
            // Mostrar spinner
            this.spinner.show({ immediate: true, minMs: 1000 });
          
            try {
              // llamada real al backend
              await this.mesasSrv.eliminarMesa(m.id);
              
              this.toast.success('MESA ELIMINADA EXITOSAMENTE', '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
          
              // 🆕 NO sincronizar automáticamente para evitar problemas de LockManager
              // La mesa ya fue eliminada de la UI de forma optimista
              // El usuario puede sincronizar manualmente con pull-to-refresh cuando quiera
              console.log('[mesas] Mesa eliminada optimistamente. Sincronización manual disponible con pull-to-refresh.');
          
            } catch (e: any) {
              console.error('[mesas] eliminarMesa error', e);
              // 🆕 Rollback: restaurar la mesa en el servicio de estado
              this.mesasState.agregarMesaOptimista(mesaAEliminar);
          
              // mensajes típicos que vimos en tus logs
              const msg = String(e?.message || e);
              if (msg.toLowerCase().includes('rls') || msg.toLowerCase().includes('permission')) {
                this.toast.error('NO SE PUDO ELIMINAR. VERIFICÁ PERMISOS/RLS', '', {
                  positionClass: 'toast-center',
                  timeOut: 4000
                });
              } else {
                this.toast.error('NO SE PUDO ELIMINAR LA MESA', '', {
                  positionClass: 'toast-center',
                  timeOut: 3000
                });
              }
            } finally {
              this.spinner.hide();
            }
          }
        }
      ]
    });
    
    await alert.present();
    
    // Función robusta para aplicar estilos
    const applyStyles = () => {
      const selectors = [
        '.alert-wrapper.mesas-alert-confirm',
        '.alert-wrapper',
        'ion-alert.mesas-alert-confirm',
        'ion-alert'
      ];
      
      let alertWrapper: Element | null = null;
      for (const selector of selectors) {
        alertWrapper = document.querySelector(selector);
        if (alertWrapper) break;
      }
      
      if (!alertWrapper) return;
      
      const buttonSelectors = [
        '.alert-button',
        'button.alert-button',
        '.alert-button-group button',
        'button[class*="alert-button"]'
      ];
      
      let buttons: NodeListOf<Element> | null = null;
      for (const selector of buttonSelectors) {
        buttons = alertWrapper.querySelectorAll(selector);
        if (buttons && buttons.length > 0) break;
      }
      
      if (!buttons || buttons.length === 0) return;
      
      buttons.forEach((btn: any) => {
        if (!btn || !btn.style) return;
        
        btn.style.setProperty('width', 'calc(50% - 7.5px)', 'important');
        btn.style.setProperty('height', '100px', 'important');
        btn.style.setProperty('font-size', '64px', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('display', 'flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('flex', '1 1 50%', 'important');
        
        const buttonText = btn.textContent || btn.innerText || '';
        const hasCheckmark = buttonText.includes('✓');
        
        if (btn.classList.contains('mesas-alert-btn-cancel')) {
          btn.style.setProperty('background', '#dc3545', 'important');
          btn.style.setProperty('border', '4px solid #bd2130', 'important');
        } else if (btn.classList.contains('mesas-alert-btn-confirm') || hasCheckmark) {
          btn.style.setProperty('background', '#28a745', 'important');
          btn.style.setProperty('border', '4px solid #1e7e34', 'important');
        }
        
        const buttonInner = btn.querySelector('.button-inner') || btn.querySelector('span');
        if (buttonInner) {
          (buttonInner as HTMLElement).style.setProperty('font-size', '64px', 'important');
          (buttonInner as HTMLElement).style.setProperty('color', '#ffffff', 'important');
        }
      });
      
      const buttonGroup = alertWrapper.querySelector('.alert-button-group');
      if (buttonGroup) {
        (buttonGroup as HTMLElement).style.setProperty('display', 'flex', 'important');
        (buttonGroup as HTMLElement).style.setProperty('flex-direction', 'row', 'important');
        (buttonGroup as HTMLElement).style.setProperty('gap', '15px', 'important');
        (buttonGroup as HTMLElement).style.setProperty('width', '100%', 'important');
      }
    };

    // Aplicar múltiples veces para asegurar que se apliquen
    setTimeout(applyStyles, 50);
    setTimeout(applyStyles, 150);
    setTimeout(applyStyles, 300);
    setTimeout(applyStyles, 500);

    // MutationObserver para detectar cambios en el DOM
    const observer = new MutationObserver(() => {
      applyStyles();
    });

    setTimeout(() => {
      const alertElement = document.querySelector('.alert-wrapper') || document.querySelector('ion-alert');
      if (alertElement) {
        observer.observe(alertElement, {
          childList: true,
          subtree: true,
          attributes: true
        });
        
        setTimeout(() => {
          observer.disconnect();
        }, 2000);
      }
    }, 100);
  }

  async eliminarMesa(m: MesaRow) {
    // Este método ya no se usa directamente, pero lo mantenemos por compatibilidad
    await this.confirmarEliminacion(m);
  }
  



  // async eliminarMesa(m: MesaRow) {
  //   // Confirmación simple (podés usar IonAlert si preferís)
  //   const seguro = confirm(`¿Eliminar la mesa #${m.numero}? Esta acción no se puede deshacer.`);
  //   if (!seguro) return;
  
  //   // Optimista: quitamos de la lista y guardamos copia para rollback
  //   const snapshot = this.mesas;
  //   this.mesas = this.mesas.filter(x => x.id !== m.id);
  
  //   try {
  //     const ok = await this.mesasSrv.eliminarMesa(m.id);
  //     if (!ok) {
  //       // No se eliminó (RLS o inexistente) -> rollback visual
  //       this.mesas = snapshot;
  //       throw new Error('No se pudo eliminar. Verificá permisos/RLS.');
  //     }
  //     // Aseguramos sincronía por si hay latencia en la replicación
  //     setTimeout(() => this.cargarMesas(), 250);
  //   } catch (e) {
  //     // Rollback ya hecho si falló
  //     console.error('[mesas] eliminarMesa error', e);
  //   }
  // }

  // Métodos para manejar la paginación del swiper
  onSlideChange(event: any) {
    this.currentSlide = event.detail[0].activeIndex;
    this.cdr.markForCheck();
  }

  goToPrevious(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slidePrev();
    }
  }

  goToNext(swiperEl: any) {
    if (swiperEl && swiperEl.swiper) {
      swiperEl.swiper.slideNext();
    }
  }
}
