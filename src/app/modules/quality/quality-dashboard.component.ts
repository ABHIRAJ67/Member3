import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import {
  QualityDashboardStats,
  QualityInspection,
  DefectRecord,
  CAPARecord
} from '../../core/models/interfaces';

@Component({
  selector: 'app-quality-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgClass, SlicePipe, RouterLink],
  templateUrl: './quality-dashboard.component.html',
  styleUrl: './quality-dashboard.component.css'
})
export class QualityDashboardComponent implements OnInit {
  private dataService = inject(DataService);

  stats!: QualityDashboardStats;
  recentInspections: QualityInspection[] = [];
  criticalDefects: DefectRecord[] = [];
  recentCAPAs: CAPARecord[] = [];

  // Chart data
  inspectionsByType: { label: string; passed: number; failed: number; total: number }[] = [];
  defectsByCategory: { label: string; count: number; percent: number }[] = [];
  defectsBySeverity: { label: string; count: number; color: string }[] = [];
  capaStatusData: { label: string; count: number; color: string }[] = [];
  monthlyTrend: { label: string; passed: number; failed: number; total: number }[] = [];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.stats = this.dataService.getQualityDashboardStats();
    const inspections = this.dataService.getInspections();
    const defects = this.dataService.getDefects();
    const capas = this.dataService.getCAPAs();

    this.recentInspections = [...inspections]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    this.criticalDefects = defects
      .filter(d => d.severity === 'Critical' && d.status !== 'Closed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    this.recentCAPAs = [...capas]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);

    this.buildInspectionsByType(inspections);
    this.buildDefectsByCategory(defects);
    this.buildDefectsBySeverity(defects);
    this.buildCAPAStatus(capas);
    this.buildMonthlyTrend(inspections);
  }

  private buildInspectionsByType(inspections: QualityInspection[]): void {
    const types = ['Incoming Material Inspection', 'In-Process Inspection', 'Final Product Inspection', 'Random Sampling Inspection'];
    this.inspectionsByType = types.map(t => {
      const group = inspections.filter(i => i.inspectionType === t);
      return {
        label: t.replace(' Inspection', ''),
        passed: group.filter(i => i.status === 'Passed').length,
        failed: group.filter(i => i.status === 'Failed' || i.status === 'Reinspection Required').length,
        total: group.length
      };
    }).filter(g => g.total > 0);
  }

  private buildDefectsByCategory(defects: DefectRecord[]): void {
    const categoryMap = new Map<string, number>();
    defects.forEach(d => {
      categoryMap.set(d.defectCategory, (categoryMap.get(d.defectCategory) || 0) + 1);
    });
    const total = defects.length || 1;
    this.defectsByCategory = Array.from(categoryMap.entries())
      .map(([label, count]) => ({ label, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }

  private buildDefectsBySeverity(defects: DefectRecord[]): void {
    const critical = defects.filter(d => d.severity === 'Critical').length;
    const major = defects.filter(d => d.severity === 'Major').length;
    const minor = defects.filter(d => d.severity === 'Minor').length;
    this.defectsBySeverity = [
      { label: 'Critical', count: critical, color: '#ef4444' },
      { label: 'Major', count: major, color: '#f59e0b' },
      { label: 'Minor', count: minor, color: '#10b981' }
    ].filter(d => d.count > 0);
  }

  private buildCAPAStatus(capas: CAPARecord[]): void {
    const statusColors: Record<string, string> = {
      'Open': '#ea580c',
      'Assigned': '#3b82f6',
      'In Progress': '#f59e0b',
      'Pending Verification': '#8b5cf6',
      'Completed': '#10b981',
      'Rejected': '#ef4444'
    };
    const statusMap = new Map<string, number>();
    capas.forEach(c => {
      statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1);
    });
    this.capaStatusData = Array.from(statusMap.entries()).map(([label, count]) => ({
      label, count, color: statusColors[label] || '#64748b'
    }));
  }

  private buildMonthlyTrend(inspections: QualityInspection[]): void {
    const monthMap = new Map<string, { passed: number; failed: number; total: number }>();
    const now = new Date();
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthMap.set(key, { passed: 0, failed: 0, total: 0 });
    }
    inspections.forEach(insp => {
      const d = new Date(insp.inspectionDate);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthMap.has(key)) {
        const m = monthMap.get(key)!;
        m.total++;
        if (insp.status === 'Passed') m.passed++;
        else if (insp.status === 'Failed' || insp.status === 'Reinspection Required') m.failed++;
      }
    });
    this.monthlyTrend = Array.from(monthMap.entries()).map(([label, data]) => ({ label, ...data }));
  }

  getMaxBar(data: { count?: number; passed?: number; failed?: number; total?: number }[]): number {
    return Math.max(...data.map(d => d.count ?? d.total ?? 0), 1);
  }

  getMaxTrendBar(data: { total: number }[]): number {
    return Math.max(...data.map(d => d.total), 1);
  }

  getBarHeight(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 150) : 4;
  }

  getBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Passed': 'badge-pass',
      'Failed': 'badge-fail',
      'Pending': 'badge-pending',
      'In Progress': 'badge-inprogress',
      'Reinspection Required': 'badge-partial',
      'Open': 'badge-open',
      'Under Investigation': 'badge-under-investigation',
      'Corrective Action Assigned': 'badge-in-progress',
      'Resolved': 'badge-resolved',
      'Closed': 'badge-closed',
      'Assigned': 'badge-scheduled',
      'Pending Verification': 'badge-verified',
      'Completed': 'badge-completed',
      'Rejected': 'badge-fail',
      'Critical': 'badge-critical',
      'Major': 'badge-high',
      'Minor': 'badge-low'
    };
    return map[status] || 'badge-pending';
  }
}
