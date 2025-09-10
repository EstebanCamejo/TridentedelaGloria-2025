import { Routes } from '@angular/router';
import { loginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

import { Tab1Page } from './tab1/tab1.page';
import { HomeComponent } from './home/tab2.page';


export const routes: Routes = [
  {
    path: '',
    component: loginComponent,
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: loginComponent,
    pathMatch: 'full',
  },
  {
    path: 'register',
    component: RegisterComponent,
    pathMatch: 'full',
  },
  {path: 'home',component: HomeComponent,pathMatch: 'full',},

];
