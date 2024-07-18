import { Routes } from '@angular/router';
import { AdminComponent } from './pages/admin/admin.component';
import { StatsComponent } from './pages/stats/stats.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard } from './guards/auth.guard';
import { MainComponent } from './components/main/main.component';

export const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    canActivate: [authGuard],
    children: [
      { path: 'stats', component: StatsComponent },
      { path: 'stats/:season', component: StatsComponent },
      { path: 'stats/:season/:player', component: StatsComponent },
      { path: 'login', component: LoginComponent },
      { path: '', pathMatch: 'full', component: AdminComponent },
      { path: '**', redirectTo: '' }
    ]
  }
];
