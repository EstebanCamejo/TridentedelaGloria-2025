import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, ViewEncapsulation, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar,
  IonButton, IonIcon,
  IonSpinner, IonSearchbar,
  IonCard,
  IonAvatar
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, refresh, chevronBackOutline, chevronForwardOutline, close, checkmark } from 'ionicons/icons';
import { ToastrService } from 'ngx-toastr';
import { AdminPendientesService, PendingClient } from 'src/app/services/admin-pendientes.service';
import { AlertController } from '@ionic/angular';
import { SpinnerService } from 'src/app/services/spinner.service';
import { register } from 'swiper/element/bundle';

@Component({
  selector: 'app-pendientes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonToolbar,
    IonButton, IonIcon,
    IonSpinner, IonSearchbar,
    IonCard,
    IonAvatar
  ],
  templateUrl: './pendientes.component.html',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PendientesComponent implements OnInit, OnDestroy, AfterViewInit {
  loading = true;
  items: PendingClient[] = [];
  filtered: PendingClient[] = [];
  chanSub?: ReturnType<AdminPendientesService['watch']>;
  loadingId: string | null = null;
  searchQuery: string = '';

  @ViewChild('swiperPendientes', { static: false }) swiperPendientes?: any;

  currentSlide: number = 0;

  constructor(
    private srv: AdminPendientesService,
    private toast: ToastrService,
    private alertCtrl: AlertController,
    private spinner: SpinnerService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmarkCircle, closeCircle, refresh, chevronBackOutline, chevronForwardOutline, close, checkmark });
    register(); // Registrar Swiper
  }

  async ngOnInit() {
    await this.load();
    this.chanSub = this.srv.watch(() => this.load(false));
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 100);
  }

  // Métodos para manejar la paginación de Swiper
  onSlideChange(event: any) {
    this.currentSlide = event.detail[0].activeIndex;
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

  ngOnDestroy(): void {
    this.chanSub?.unsubscribe();
  }

  async load(withSpinner = true) {
    try {
      if (withSpinner) this.loading = true;
      this.items = await this.srv.list();
      this.filtered = this.items;
      this.currentSlide = 0;
    } catch (e: any) {
      this.toast.error((e?.message || 'ERROR CARGANDO PENDIENTES').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.loading = false;
    }
  }

  handleRefresh(ev: CustomEvent) {
    this.load(false).finally(() => (ev.target as any).complete());
  }

  search(q: string | null | undefined) {
    const s = (q || '').trim().toLowerCase();
    this.filtered = !s
      ? this.items
      : this.items.filter(it =>
          `${it.nombres} ${it.apellidos}`.toLowerCase().includes(s) ||
          it.email.toLowerCase().includes(s)
        );
    this.currentSlide = 0;
  }

  async approve(it: PendingClient) {
    if (this.loadingId) return;
    this.loadingId = it.id;
    try {
      await this.srv.approve(it.id, it.email, it.nombres, it.apellidos);
      this.toast.success(`APROBADO: ${it.nombres.toUpperCase()} ${it.apellidos.toUpperCase()}`, '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
      await this.load(false);
    } catch (e: any) {
      this.toast.error((e?.message || 'NO SE PUDO APROBAR').toUpperCase(), '', {
        positionClass: 'toast-center',
        timeOut: 3000
      });
    } finally {
      this.loadingId = null;
    }
  }

  async confirmarAprobacion(it: PendingClient) {
    const alert = await this.alertCtrl.create({
      header: 'APROBAR CLIENTE',
      cssClass: 'pend-alert-confirm',
      buttons: [
        { 
          text: '✗',
          role: 'cancel',
          cssClass: 'pend-alert-btn-cancel',
          handler: () => {
            return true;
          }
        },
        {
          text: '✓',
          role: 'confirm',
          cssClass: 'pend-alert-btn-confirm',
          handler: async () => {
            if (this.loadingId) return;
            this.loadingId = it.id;
            await alert.dismiss();
            this.spinner.show({ immediate: true, minMs: 1000 });
            try {
              const res = await this.srv.approve(it.id, it.email, it.nombres, it.apellidos);
              this.toast.success(`APROBADO: ${it.nombres.toUpperCase()} ${it.apellidos.toUpperCase()}`, '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
              if (!res.ok) {
                this.toast.warning(`APROBADO, PERO EL CORREO NO SE ENVIÓ${res.detail ? `: ${res.detail.toUpperCase()}` : ''}`, '', {
                  positionClass: 'toast-center',
                  timeOut: 6000
                });
              }
              await this.load(false);
            } catch (e: any) {
              this.toast.error((e?.message || 'NO SE PUDO APROBAR').toUpperCase(), '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
            } finally {
              this.loadingId = null;
              this.spinner.hide();
            }
          }
        }
      ]
    });
    await alert.present();
    
    // Función robusta para aplicar estilos
    const applyStyles = () => {
      // Múltiples selectores para encontrar el alert
      const selectors = [
        '.alert-wrapper.pend-alert-confirm',
        '.alert-wrapper',
        'ion-alert.pend-alert-confirm',
        'ion-alert'
      ];
      
      let alertWrapper: Element | null = null;
      for (const selector of selectors) {
        alertWrapper = document.querySelector(selector);
        if (alertWrapper) break;
      }
      
      if (!alertWrapper) return;
      
      // Buscar botones con múltiples selectores
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
        
        // Aplicar estilos inline directamente con setProperty para !important
        btn.style.setProperty('width', 'calc(50% - 7.5px)', 'important');
        btn.style.setProperty('min-width', 'calc(50% - 7.5px)', 'important');
        btn.style.setProperty('max-width', 'calc(50% - 7.5px)', 'important');
        btn.style.setProperty('height', '100px', 'important');
        btn.style.setProperty('min-height', '100px', 'important');
        btn.style.setProperty('font-size', '64px', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('display', 'flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('flex', '1 1 50%', 'important');
        btn.style.setProperty('border-radius', '12px', 'important');
        btn.style.setProperty('padding', '0', 'important');
        btn.style.setProperty('margin', '0', 'important');
        btn.style.setProperty('box-sizing', 'border-box', 'important');
        
        // Aplicar colores según la clase y el contenido
        // Verificar si el botón contiene una tilde (✓) para aplicar verde
        const buttonText = btn.textContent || btn.innerText || '';
        const hasCheckmark = buttonText.includes('✓');
        
        if (btn.classList.contains('pend-alert-btn-cancel')) {
          // Cancelar siempre es rojo
          btn.style.setProperty('background', '#dc3545', 'important');
          btn.style.setProperty('background-color', '#dc3545', 'important');
          btn.style.setProperty('border', '4px solid #bd2130', 'important');
        } else if (btn.classList.contains('pend-alert-btn-confirm') || (btn.classList.contains('pend-alert-btn-reject') && hasCheckmark)) {
          // Confirmar o rechazar con tilde es verde
          btn.style.setProperty('background', '#28a745', 'important');
          btn.style.setProperty('background-color', '#28a745', 'important');
          btn.style.setProperty('border', '4px solid #1e7e34', 'important');
        } else if (btn.classList.contains('pend-alert-btn-reject')) {
          // Rechazar sin tilde es rojo (por si acaso)
          btn.style.setProperty('background', '#dc3545', 'important');
          btn.style.setProperty('background-color', '#dc3545', 'important');
          btn.style.setProperty('border', '4px solid #bd2130', 'important');
        }
        
        // Aplicar al texto interno también
        const buttonInner = btn.querySelector('.button-inner') || btn.querySelector('span');
        if (buttonInner) {
          (buttonInner as HTMLElement).style.setProperty('font-size', '64px', 'important');
          (buttonInner as HTMLElement).style.setProperty('color', '#ffffff', 'important');
          (buttonInner as HTMLElement).style.setProperty('font-weight', '700', 'important');
          (buttonInner as HTMLElement).style.setProperty('display', 'flex', 'important');
          (buttonInner as HTMLElement).style.setProperty('align-items', 'center', 'important');
          (buttonInner as HTMLElement).style.setProperty('justify-content', 'center', 'important');
        }
      });
      
      // Ajustar el grupo de botones
      const buttonGroupSelectors = [
        '.alert-button-group',
        '.alert-button-group-vertical',
        '[class*="button-group"]'
      ];
      
      let buttonGroup: Element | null = null;
      for (const selector of buttonGroupSelectors) {
        buttonGroup = alertWrapper.querySelector(selector);
        if (buttonGroup) break;
      }
      
      if (buttonGroup) {
        (buttonGroup as HTMLElement).style.setProperty('display', 'flex', 'important');
        (buttonGroup as HTMLElement).style.setProperty('flex-direction', 'row', 'important');
        (buttonGroup as HTMLElement).style.setProperty('justify-content', 'center', 'important');
        (buttonGroup as HTMLElement).style.setProperty('gap', '15px', 'important');
        (buttonGroup as HTMLElement).style.setProperty('width', '100%', 'important');
        (buttonGroup as HTMLElement).style.setProperty('padding', '20px', 'important');
        (buttonGroup as HTMLElement).style.setProperty('box-sizing', 'border-box', 'important');
      }
    };
    
    // Aplicar estilos múltiples veces para asegurar que se apliquen
    setTimeout(applyStyles, 50);
    setTimeout(applyStyles, 150);
    setTimeout(applyStyles, 300);
    setTimeout(applyStyles, 500);
    
    // Usar MutationObserver para detectar cuando se renderiza completamente
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
        
        // Desconectar después de 2 segundos
        setTimeout(() => {
          observer.disconnect();
        }, 2000);
      }
    }, 100);
  }
  
  async confirmarRechazo(it: PendingClient) {
    const alert = await this.alertCtrl.create({
      header: 'RECHAZAR CLIENTE',
      cssClass: 'pend-alert-confirm',
      buttons: [
        { 
          text: '✗',
          role: 'cancel',
          cssClass: 'pend-alert-btn-cancel',
          handler: () => {
            return true;
          }
        },
        {
          text: '✓',
          role: 'destructive',
          cssClass: 'pend-alert-btn-reject',
          handler: async () => {
            if (this.loadingId) return;
            this.loadingId = it.id;
            await alert.dismiss();
            this.spinner.show({ immediate: true, minMs: 1000 });
            try {
              const res = await this.srv.reject(it.id, it.email, it.nombres, it.apellidos);
              this.toast.info(`RECHAZADO: ${it.nombres.toUpperCase()} ${it.apellidos.toUpperCase()}`, '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
              if (!res.ok) {
                this.toast.warning(`RECHAZADO, PERO EL CORREO NO SE ENVIÓ${res.detail ? `: ${res.detail.toUpperCase()}` : ''}`, '', {
                  positionClass: 'toast-center',
                  timeOut: 6000
                });
              }
              await this.load(false);
            } catch (e: any) {
              this.toast.error((e?.message || 'NO SE PUDO RECHAZAR').toUpperCase(), '', {
                positionClass: 'toast-center',
                timeOut: 3000
              });
            } finally {
              this.loadingId = null;
              this.spinner.hide();
            }
          }
        }
      ]
    });
    await alert.present();
    
    // Función robusta para aplicar estilos
    const applyStyles = () => {
      // Múltiples selectores para encontrar el alert
      const selectors = [
        '.alert-wrapper.pend-alert-confirm',
        '.alert-wrapper',
        'ion-alert.pend-alert-confirm',
        'ion-alert'
      ];
      
      let alertWrapper: Element | null = null;
      for (const selector of selectors) {
        alertWrapper = document.querySelector(selector);
        if (alertWrapper) break;
      }
      
      if (!alertWrapper) return;
      
      // Buscar botones con múltiples selectores
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
        
        // Aplicar estilos inline directamente con setProperty para !important
        btn.style.setProperty('width', 'calc(50% - 7.5px)', 'important');
        btn.style.setProperty('min-width', 'calc(50% - 7.5px)', 'important');
        btn.style.setProperty('max-width', 'calc(50% - 7.5px)', 'important');
        btn.style.setProperty('height', '100px', 'important');
        btn.style.setProperty('min-height', '100px', 'important');
        btn.style.setProperty('font-size', '64px', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('display', 'flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('flex', '1 1 50%', 'important');
        btn.style.setProperty('border-radius', '12px', 'important');
        btn.style.setProperty('padding', '0', 'important');
        btn.style.setProperty('margin', '0', 'important');
        btn.style.setProperty('box-sizing', 'border-box', 'important');
        
        // Aplicar colores según la clase y el contenido
        // Verificar si el botón contiene una tilde (✓) para aplicar verde
        const buttonText = btn.textContent || btn.innerText || '';
        const hasCheckmark = buttonText.includes('✓');
        
        if (btn.classList.contains('pend-alert-btn-cancel')) {
          // Cancelar siempre es rojo
          btn.style.setProperty('background', '#dc3545', 'important');
          btn.style.setProperty('background-color', '#dc3545', 'important');
          btn.style.setProperty('border', '4px solid #bd2130', 'important');
        } else if (btn.classList.contains('pend-alert-btn-confirm') || (btn.classList.contains('pend-alert-btn-reject') && hasCheckmark)) {
          // Confirmar o rechazar con tilde es verde
          btn.style.setProperty('background', '#28a745', 'important');
          btn.style.setProperty('background-color', '#28a745', 'important');
          btn.style.setProperty('border', '4px solid #1e7e34', 'important');
        } else if (btn.classList.contains('pend-alert-btn-reject')) {
          // Rechazar sin tilde es rojo (por si acaso)
          btn.style.setProperty('background', '#dc3545', 'important');
          btn.style.setProperty('background-color', '#dc3545', 'important');
          btn.style.setProperty('border', '4px solid #bd2130', 'important');
        }
        
        // Aplicar al texto interno también
        const buttonInner = btn.querySelector('.button-inner') || btn.querySelector('span');
        if (buttonInner) {
          (buttonInner as HTMLElement).style.setProperty('font-size', '64px', 'important');
          (buttonInner as HTMLElement).style.setProperty('color', '#ffffff', 'important');
          (buttonInner as HTMLElement).style.setProperty('font-weight', '700', 'important');
          (buttonInner as HTMLElement).style.setProperty('display', 'flex', 'important');
          (buttonInner as HTMLElement).style.setProperty('align-items', 'center', 'important');
          (buttonInner as HTMLElement).style.setProperty('justify-content', 'center', 'important');
        }
      });
      
      // Ajustar el grupo de botones
      const buttonGroupSelectors = [
        '.alert-button-group',
        '.alert-button-group-vertical',
        '[class*="button-group"]'
      ];
      
      let buttonGroup: Element | null = null;
      for (const selector of buttonGroupSelectors) {
        buttonGroup = alertWrapper.querySelector(selector);
        if (buttonGroup) break;
      }
      
      if (buttonGroup) {
        (buttonGroup as HTMLElement).style.setProperty('display', 'flex', 'important');
        (buttonGroup as HTMLElement).style.setProperty('flex-direction', 'row', 'important');
        (buttonGroup as HTMLElement).style.setProperty('justify-content', 'center', 'important');
        (buttonGroup as HTMLElement).style.setProperty('gap', '15px', 'important');
        (buttonGroup as HTMLElement).style.setProperty('width', '100%', 'important');
        (buttonGroup as HTMLElement).style.setProperty('padding', '20px', 'important');
        (buttonGroup as HTMLElement).style.setProperty('box-sizing', 'border-box', 'important');
      }
    };
    
    // Aplicar estilos múltiples veces para asegurar que se apliquen
    setTimeout(applyStyles, 50);
    setTimeout(applyStyles, 150);
    setTimeout(applyStyles, 300);
    setTimeout(applyStyles, 500);
    
    // Usar MutationObserver para detectar cuando se renderiza completamente
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
        
        // Desconectar después de 2 segundos
        setTimeout(() => {
          observer.disconnect();
        }, 2000);
      }
    }, 100);
  }
  
  trackById(_: number, it: PendingClient) { 
    return it.id; 
  }
}
