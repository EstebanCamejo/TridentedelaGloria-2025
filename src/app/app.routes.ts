import { Routes } from '@angular/router';
import { loginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './home/tab2.page';
import { RegistroClienteAnonimoComponent } from './components/registro-cliente-anonimo/registro-cliente-anonimo.component';
import { RegistroClienteComponent } from './components/registro-cliente/registro-cliente.component';

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
    {
    path: 'registro-cliente',
    component: RegistroClienteComponent,
    pathMatch: 'full',
  },
    {
    path: 'registro-cliente-anonimo',
    component: RegistroClienteAnonimoComponent,
    pathMatch: 'full',
  }

];
