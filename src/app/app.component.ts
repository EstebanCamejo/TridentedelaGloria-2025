import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from './explore-container/explore-container.component';
import { TabsPage } from './tabs/tabs.page';
import { ToastrModule } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { SplashScreen } from '@capacitor/splash-screen';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'], // 👈 Asegurate de tener este styleUrls
  imports: [
    IonApp,
    IonRouterOutlet,
    ExploreContainerComponent,
    TabsPage,
    ToastrModule,
    CommonModule,
  ],
})
export class AppComponent {
  constructor(private router: Router) {}
  showSplash = true;

  ngOnInit() {
    setTimeout(() => {
      this.showSplash = false;
      this.router.navigateByUrl('/login'); // redirige al login
    }, 3000);
  }
}
