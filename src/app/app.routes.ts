// import { Routes } from '@angular/router';
// import { loginComponent } from './components/login/login.component';
// import { RegisterComponent } from './components/register/register.component';
// <<<<<<< SofiaDorbessan
// import { HomeComponent } from './home/tab2.page';
// import { RegistroClienteAnonimoComponent } from './components/registro-cliente-anonimo/registro-cliente-anonimo.component';
// import { RegistroClienteComponent } from './components/registro-cliente/registro-cliente.component';
// =======
// import { HomeComponent } from './components/home/tab2.page';

// >>>>>>> main

// export const routes: Routes = [
//   {
//     path: '',
//     component: loginComponent,
//     pathMatch: 'full',
//   },
//   {
//     path: 'login',
//     component: loginComponent,
//     pathMatch: 'full',
//   },
//   {
//     path: 'register',
//     component: RegisterComponent,
//     pathMatch: 'full',
//   },
//   {path: 'home',component: HomeComponent,pathMatch: 'full',},
// <<<<<<< SofiaDorbessan
//     {
//     path: 'registro-cliente',
//     component: RegistroClienteComponent,
//     pathMatch: 'full',
//   },
//     {
//     path: 'registro-cliente-anonimo',
//     component: RegistroClienteAnonimoComponent,
//     pathMatch: 'full',
//   }
// =======
//   { path: 'admin/pendientes', loadComponent: () =>
//     import('./components/admin/pendientes/pendientes.component').then(m => m.PendientesComponent) },
//   { path: 'admin/alta-usuario', loadComponent: () =>
//       import('./components/admin/alta-usuario/alta-usuario.component').then(m => m.AltaUsuarioComponent) },
//   { path: 'admin/alta-mesa', loadComponent: () =>
//       import('./components/admin/alta-mesa/alta-mesa.component').then(m => m.AltaMesaComponent) },
//   { path: 'admin/notas', loadComponent: () =>
//       import('./components/admin/resultados-encuestas/resultados-encuestas.component').then(m => m.ResultadosEncuestasComponent) },

// >>>>>>> main

// ];


import { Routes } from '@angular/router';
import { loginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/tab2.page';
import { RegistroClienteAnonimoComponent } from './components/registro-cliente-anonimo/registro-cliente-anonimo.component';
import { RegistroClienteComponent } from './components/registro-cliente/registro-cliente.component';
import { HomeClienteComponent } from './components/home-cliente/home-cliente.component';

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
  {
    path: 'home',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'registro-cliente',
    component: RegistroClienteComponent,
    pathMatch: 'full',
  },
  {
    path: 'registro-cliente-anonimo',
    component: RegistroClienteAnonimoComponent,
    pathMatch: 'full',
  },
    {
    path: 'home-cliente',
    component: HomeClienteComponent,
    pathMatch: 'full',
  },
  {
    path: 'admin/pendientes',
    loadComponent: () =>
      import('./components/admin/pendientes/pendientes.component').then(
        (m) => m.PendientesComponent
      ),
  },
  {
    path: 'admin/alta-usuario',
    loadComponent: () =>
      import('./components/admin/alta-usuario/alta-usuario.component').then(
        (m) => m.AltaUsuarioComponent
      ),
  },
  {
    path: 'admin/alta-mesa',
    loadComponent: () =>
      import('./components/admin/alta-mesa/alta-mesa.component').then(
        (m) => m.AltaMesaComponent
      ),
  },
  {
    path: 'admin/notas',
    loadComponent: () =>
      import(
        './components/admin/resultados-encuestas/resultados-encuestas.component'
      ).then((m) => m.ResultadosEncuestasComponent),
  },
];

