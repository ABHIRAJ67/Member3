import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'quality/dashboard', pathMatch: 'full' },

  // Member 3: Quality Control & Inspection Management System
  {
    path: 'quality/dashboard',
    loadComponent: () => import('./modules/quality/quality-dashboard.component').then(m => m.QualityDashboardComponent)
  },
  {
    path: 'quality/inspections',
    loadComponent: () => import('./modules/quality/inspections.component').then(m => m.InspectionsComponent)
  },
  {
    path: 'quality/defects',
    loadComponent: () => import('./modules/quality/defects.component').then(m => m.DefectsComponent)
  },
  {
    path: 'quality/capa',
    loadComponent: () => import('./modules/quality/capa.component').then(m => m.CAPAComponent)
  },

  { path: '**', redirectTo: 'quality/dashboard' }
];
