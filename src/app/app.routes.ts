
import { Routes } from '@angular/router';
import { loginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/tab2.page';
import { RegistroClienteAnonimoComponent } from './components/registro-cliente-anonimo/registro-cliente-anonimo.component';
import { RegistroClienteComponent } from './components/registro-cliente/registro-cliente.component';
import { HomeBartenderCocineroComponent } from './components/home-bartender-cocinero/home-bartender-cocinero.component';
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
    path: 'home-bartender-cocinero',
    component: HomeBartenderCocineroComponent,
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
  {
    path: 'bartender-cocinero/nuevo-plato',
    loadComponent: () =>
      import(
        './components/bartender-cocinero/nuevo-plato/nuevo-plato.component'
      ).then((m) => m.NuevoPlatoComponent),
  },
  {
    path: 'bartender-cocinero/nueva-bebida',
    loadComponent: () =>
      import(
        './components/bartender-cocinero/nueva-bebida/nueva-bebida.component'
      ).then((m) => m.NuevaBebidaComponent),
  },
  { path: 'scan/mesa', 
    loadComponent: () => import('./components/maitre/scanner-mesa/scanner-mesa.component')
    .then(m => m.ScannerMesaComponent) 
  },
  {
    path: 'home-maitre',
    loadComponent: () =>
      import('./components/home-maitre/home-maitre.component')
        .then(m => m.HomeMaitreComponent),
  },
  {
    path: 'maitre/lista-espera',
    loadComponent: () =>
    import('./components/maitre/lista-espera/lista-espera.component')
    .then(m => m.ListaEsperaComponent),
  },
  // {
  //   path: 'maitre/asignar-mesa',
  //   loadComponent: () =>
  //     import('./components/maitre/asignar-mesa/asignar-mesa.component')
  //       .then(m => m.AsignarMesaComponent),
  // },
  { 
    path: 'maitre/mesa/:id', 
    loadComponent: () => import('./components/maitre/mesa-info/mesa-info.component').then(m => m.MesaInfoComponent) 
  },
  
];

