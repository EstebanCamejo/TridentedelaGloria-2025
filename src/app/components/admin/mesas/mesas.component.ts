import { ChangeDetectorRef, Component, OnInit, inject, NgZone, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton,
         IonBadge, IonIcon, IonRefresher, IonRefresherContent, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, pencil, refresh, trash, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { ModalController } from '@ionic/angular';
import { AltaMesaComponent } from '../alta-mesa/alta-mesa.component';
import { MesasService, MesaRow } from 'src/app/services/mesas.service';
import { SpinnerService } from 'src/app/services/spinner.service';
import { ToastrService } from 'ngx-toastr';
import type { RefresherCustomEvent, ViewWillEnter, ViewDidEnter } from '@ionic/angular';
import { ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { register } from 'swiper/element/bundle';

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
export class MesasComponent implements OnInit, ViewWillEnter, ViewDidEnter {
  private modalCtrl = inject(ModalController);
  private mesasSrv = inject(MesasService);
  private alertCtrl = inject(AlertController);

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
    this.cargarMesas();
  }
  
  async ionViewWillEnter(): Promise<void> {
    // Forzar recarga cuando se vuelve a esta vista
    console.log('[mesas] ionViewWillEnter: recargando mesas...');
    console.log('[mesas] Estado actual: mesas.length =', this.mesas.length, 'cargando =', this.cargando);
    
    // Limpiar array anterior para forzar actualización visual
    this.zone.run(() => {
      this.mesas = [];
      this.cdr.markForCheck();
    });
    
    // Recargar mesas
    await this.cargarMesas();
  }
  
  async ionViewDidEnter(): Promise<void> {
    // Verificar que las mesas se cargaron correctamente
    console.log('[mesas] ionViewDidEnter: verificando mesas...');
    console.log('[mesas] Estado después de cargar: mesas.length =', this.mesas.length, 'cargando =', this.cargando);
    
    // Si no hay mesas después de un momento, intentar recargar una vez más
    if (this.mesas.length === 0 && !this.cargando) {
      console.log('[mesas] ⚠️ No hay mesas visibles después de cargar, intentando recargar...');
      setTimeout(async () => {
        if (this.mesas.length === 0 && !this.cargando) {
          await this.cargarMesas();
        }
      }, 500);
    }
  }
 
  async cargarMesas(ev?: CustomEvent) {
    console.time('[mesas] cargarMesas');
    try {
      // Actualizar estado de carga dentro de NgZone
      this.zone.run(() => {
        this.cargando = true;
        this.cdr.markForCheck();
      });
      
      if (!ev) {
        // Solo mostrar spinner si no es pull-to-refresh (que ya tiene su propio indicador)
        this.spinner.show({ immediate: true });
      }
      
      const list = await this.mesasSrv.listarMesas();
      console.log('[mesas] listarMesas devolvió', list.length, 'mesas');
      
      // Actualizar mesas dentro de NgZone y forzar detección de cambios
      this.zone.run(() => {
        this.mesas = [...list];            // <- nueva referencia
        this.cdr.markForCheck();
        console.log('[mesas] asignado this.mesas, len=', this.mesas.length);
      });
    } catch (e: any) {
      console.error('[mesas] cargarMesas error', e);
      this.toast.error((e?.message || 'ERROR AL CARGAR LAS MESAS').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      // Siempre actualizar estado de carga en finally
      this.zone.run(() => {
        this.cargando = false;
        this.cdr.markForCheck();
      });
      
      if (!ev) {
        this.spinner.hide();
      }
      // cerrar refresher de forma segura, si vino de pull-to-refresh
      try {
        // Ionic 7+: ev.detail.complete() es la forma recomendada
        (ev as any)?.detail?.complete?.();
      } catch {}
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
    const { role } = await modal.onWillDismiss();
    console.log('[mesas] modal role =', role);
  
    if (role === 'saved') {
      // Pequeño delay para asegurar que la mesa se haya guardado completamente en la BD
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
            
            // UI optimista: la saco de la lista ya mismo
            const prev = this.mesas;
            this.mesas = prev.filter(x => x.id !== m.id);
            
            // Mostrar spinner
            this.spinner.show({ immediate: true, minMs: 1000 });
          
            try {
              // llamada real al backend
              await this.mesasSrv.eliminarMesa(m.id);
              
              this.toast.success('MESA ELIMINADA EXITOSAMENTE', '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
          
              // sincronizo por si hay latencia de replicación/caché
              await new Promise(r => setTimeout(r, 120));
              await this.recargarVista();
          
            } catch (e: any) {
              console.error('[mesas] eliminarMesa error', e);
              // rollback si falló por RLS u otro motivo
              this.mesas = prev;
          
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
