import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DataService } from '../core/services/data.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private dataService = inject(DataService);
  isCollapsed = false;

  navGroups = [
    {
      label: 'QUALITY CONTROL',
      items: [
        { label: 'Quality Dashboard', route: '/quality/dashboard', icon: '📊' },
        { label: 'Inspections', route: '/quality/inspections', icon: '🔍' },
        { label: 'Defects', route: '/quality/defects', icon: '⚠️' },
        { label: 'Corrective Actions', route: '/quality/capa', icon: '✅' }
      ]
    }
  ];

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  resetData(): void {
    if (confirm('Restore demo quality dataset? All custom records will be reverted to initial demo data.')) {
      this.dataService.resetAllData();
      window.location.reload();
    }
  }
}
