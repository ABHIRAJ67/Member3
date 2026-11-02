import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  DefectRecord, DefectCategory, DefectSeverity, DefectStatus,
  QualityInspection
} from '../../core/models/interfaces';

type ModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-defects',
  standalone: true,
  imports: [FormsModule, DatePipe, NgClass],
  templateUrl: './defects.component.html',
  styleUrl: './defects.component.css'
})
export class DefectsComponent implements OnInit {
  private dataService = inject(DataService);
  private notif = inject(NotificationService);

  allDefects: DefectRecord[] = [];
  filteredDefects: DefectRecord[] = [];
  allInspections: QualityInspection[] = [];

  searchQuery = '';
  filterSeverity = '';
  filterCategory = '';
  filterStatus = '';
  filterInspectionId = '';

  modalOpen = false;
  modalMode: ModalMode = 'create';
  selectedDefect: DefectRecord | null = null;
  deleteConfirmId: string | null = null;

  formData: Partial<DefectRecord> = {};
  formError = '';

  linkedInspection: QualityInspection | null = null;

  readonly defectCategories: DefectCategory[] = [
    'Dimensional Defect', 'Surface Defect', 'Material Defect',
    'Functional Defect', 'Assembly Defect', 'Packaging Defect',
    'Electrical Defect', 'Other'
  ];

  readonly defectSeverities: DefectSeverity[] = ['Critical', 'Major', 'Minor'];

  readonly defectStatuses: DefectStatus[] = [
    'Open', 'Under Investigation', 'Corrective Action Assigned', 'Resolved', 'Closed'
  ];

  readonly departments = [
    'Quality Assurance', 'CNC Machining', 'Electronics Assembly', 'Surface Treatment',
    'Procurement', 'Welding', 'Assembly', 'Injection Moulding', 'Testing'
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.allInspections = this.dataService.getInspections();
    this.allDefects = this.dataService.getDefects()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allDefects];
    const q = this.searchQuery.toLowerCase();
    if (q) {
      result = result.filter(d =>
        d.id.toLowerCase().includes(q) ||
        d.inspectionId.toLowerCase().includes(q) ||
        d.productName.toLowerCase().includes(q) ||
        d.batchNumber.toLowerCase().includes(q) ||
        d.defectDescription.toLowerCase().includes(q) ||
        d.responsibleDepartment.toLowerCase().includes(q)
      );
    }
    if (this.filterSeverity) result = result.filter(d => d.severity === this.filterSeverity);
    if (this.filterCategory) result = result.filter(d => d.defectCategory === this.filterCategory);
    if (this.filterStatus) result = result.filter(d => d.status === this.filterStatus);
    if (this.filterInspectionId) result = result.filter(d => d.inspectionId === this.filterInspectionId);
    this.filteredDefects = result;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterSeverity = '';
    this.filterCategory = '';
    this.filterStatus = '';
    this.filterInspectionId = '';
    this.applyFilters();
  }

  openCreate(): void {
    this.formError = '';
    this.linkedInspection = null;
    this.formData = {
      inspectionId: '',
      productionOrderRef: '',
      productName: '',
      batchNumber: '',
      defectCategory: 'Dimensional Defect',
      defectDescription: '',
      defectiveQuantity: 1,
      severity: 'Minor',
      rootCause: '',
      responsibleDepartment: 'Quality Assurance',
      detectionDate: new Date().toISOString().split('T')[0],
      status: 'Open'
    };
    this.modalMode = 'create';
    this.modalOpen = true;
  }

  openEdit(defect: DefectRecord): void {
    if (defect.status === 'Closed') {
      this.notif.warning('Closed defect records cannot be edited.');
      return;
    }
    this.formError = '';
    this.formData = { ...defect };
    this.linkedInspection = this.dataService.getInspection(defect.inspectionId) || null;
    this.modalMode = 'edit';
    this.modalOpen = true;
  }

  openView(defect: DefectRecord): void {
    this.selectedDefect = defect;
    this.linkedInspection = this.dataService.getInspection(defect.inspectionId) || null;
    this.modalMode = 'view';
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.selectedDefect = null;
    this.formData = {};
    this.formError = '';
    this.linkedInspection = null;
  }

  onInspectionChange(): void {
    const insp = this.dataService.getInspection(this.formData.inspectionId!);
    if (insp) {
      this.linkedInspection = insp;
      this.formData.productionOrderRef = insp.productionOrderRef;
      this.formData.productName = insp.productName;
      this.formData.batchNumber = insp.batchNumber;
    } else {
      this.linkedInspection = null;
    }
  }

  getRemainingDefectQty(): number {
    if (!this.linkedInspection) return 0;
    const existingQty = this.allDefects
      .filter(d => d.inspectionId === this.linkedInspection!.id && d.id !== this.formData.id)
      .reduce((sum, d) => sum + d.defectiveQuantity, 0);
    return Math.max(0, this.linkedInspection.defectiveQuantity - existingQty);
  }

  submitForm(): void {
    this.formError = '';
    const f = this.formData;

    if (!f.inspectionId || !f.defectCategory || !f.defectDescription || !f.severity || !f.status ||
      !f.responsibleDepartment || !f.detectionDate) {
      this.formError = 'Please fill in all required fields.';
      return;
    }
    if ((f.defectiveQuantity ?? 0) <= 0) {
      this.formError = 'Defective Quantity must be greater than zero.';
      return;
    }

    const defect: DefectRecord = {
      id: this.modalMode === 'create'
        ? this.dataService.generateId('DEF')
        : f.id!,
      inspectionId: f.inspectionId!,
      productionOrderRef: f.productionOrderRef || '',
      productName: f.productName || '',
      batchNumber: f.batchNumber || '',
      defectCategory: f.defectCategory as DefectCategory,
      defectDescription: f.defectDescription!,
      defectiveQuantity: Number(f.defectiveQuantity),
      severity: f.severity as DefectSeverity,
      rootCause: f.rootCause || '',
      responsibleDepartment: f.responsibleDepartment!,
      detectionDate: f.detectionDate!,
      status: f.status as DefectStatus,
      createdAt: f.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = this.dataService.saveDefect(defect);
    if (result.success) {
      this.notif.success(result.message);
      this.closeModal();
      this.loadData();
    } else {
      this.formError = result.message;
    }
  }

  confirmDelete(id: string): void { this.deleteConfirmId = id; }

  executeDelete(): void {
    if (!this.deleteConfirmId) return;
    const result = this.dataService.deleteDefect(this.deleteConfirmId);
    if (result.success) {
      this.notif.success(result.message);
      this.loadData();
    } else {
      this.notif.error(result.message);
    }
    this.deleteConfirmId = null;
  }

  cancelDelete(): void { this.deleteConfirmId = null; }

  getBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Open': 'badge-open',
      'Under Investigation': 'badge-under-investigation',
      'Corrective Action Assigned': 'badge-in-progress',
      'Resolved': 'badge-resolved',
      'Closed': 'badge-closed',
      'Critical': 'badge-critical',
      'Major': 'badge-high',
      'Minor': 'badge-low'
    };
    return map[status] || 'badge-pending';
  }

  getLinkedInspectionLabel(inspectionId: string): string {
    const insp = this.allInspections.find(i => i.id === inspectionId);
    return insp ? `${insp.id} – ${insp.productName}` : inspectionId;
  }
}

