import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'tickets',
    loadComponent: () =>
      import('./components/ticket-list/ticket-list.component').then((m) => m.TicketListComponent),
  },
  {
    path: 'tickets/new',
    loadComponent: () =>
      import('./components/ticket-create/ticket-create.component').then(
        (m) => m.TicketCreateComponent,
      ),
  },
  {
    path: 'tickets/:id',
    loadComponent: () =>
      import('./components/ticket-detail/ticket-detail.component').then(
        (m) => m.TicketDetailComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
