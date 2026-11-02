import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { QualityInspection, InspectionType, InspectionStatus, ProductionOrderRef } from '../../core/models/interfaces';

type ModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [FormsModule, DatePipe, NgClass],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.css'
})
export class InspectionsComponent implements OnInit {
  private dataService = inject(DataService);
  private notif = inject(NotificationService);

  allInspections: QualityInspection[] = [];
  filteredInspections: QualityInspection[] = [];
  productionOrderRefs: ProductionOrderRef[] = [];

  searchQuery = '';
  filterStatus = '';
  filterType = '';
  filterDate = '';
  filterOrderRef = '';

  modalOpen = false;
  modalMode: ModalMode = 'create';
  selectedInspection: QualityInspection | null = null;
  deleteConfirmId: string | null = null;

  formData: Partial<QualityInspection> = {};
  formError = '';

  readonly inspectionTypes: InspectionType[] = [
    'Incoming Material Inspection',
    'In-Process Inspection',
    'Final Product Inspection',
    'Random Sampling Inspection'
  ];

  readonly inspectionStatuses: InspectionStatus[] = [
    'Pending', 'In Progress', 'Passed', 'Failed', 'Reinspection Required'
  ];

  ngOnInit(): void {
    this.productionOrderRefs = this.dataService.getProductionOrderRefs();
    this.loadInspections();
  }

  loadInspections(): void {
    this.allInspections = this.dataService.getInspections()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allInspections];
    const q = this.searchQuery.toLowerCase();
    if (q) {
      result = result.filter(i =>
        i.id.toLowerCase().includes(q) ||
        i.productName.toLowerCase().includes(q) ||
        i.batchNumber.toLowerCase().includes(q) ||
        i.inspectorName.toLowerCase().includes(q) ||
        i.productionOrderRef.toLowerCase().includes(q)
      );
    }
    if (this.filterStatus) result = result.filter(i => i.status === this.filterStatus);
    if (this.filterType) result = result.filter(i => i.inspectionType === this.filterType);
    if (this.filterDate) result = result.filter(i => i.inspectionDate === this.filterDate);
    if (this.filterOrderRef) result = result.filter(i => i.productionOrderRef === this.filterOrderRef);
    this.filteredInspections = result;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterStatus = '';
    this.filterType = '';
    this.filterDate = '';
    this.filterOrderRef = '';
    this.applyFilters();
  }

  openCreate(): void {
    this.formError = '';
    this.formData = {
      productionOrderRef: '',
      productName: '',
      batchNumber: '',
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectorName: '',
      inspectionType: 'Final Product Inspection',
      totalInspectedQuantity: 0,
      goodQuantity: 0,
      defectiveQuantity: 0,
      status: 'Pending',
      notes: ''
    };
    this.modalMode = 'create';
    this.modalOpen = true;
  }

  openEdit(insp: QualityInspection): void {
    if (insp.status === 'Closed' as any) {
      this.notif.warning('Closed inspections cannot be edited.');
      return;
    }
    this.formError = '';
    this.formData = { ...insp };
    this.modalMode = 'edit';
    this.modalOpen = true;
  }

  openView(insp: QualityInspection): void {
    this.selectedInspection = insp;
    this.modalMode = 'view';
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.selectedInspection = null;
    this.formData = {};
    this.formError = '';
  }

  onOrderRefChange(): void {
    const ref = this.productionOrderRefs.find(p => p.id === this.formData.productionOrderRef);
    if (ref) this.formData.productName = ref.productName;
  }

  onTotalQtyChange(): void {
    const total = Number(this.formData.totalInspectedQuantity) || 0;
    if (this.formData.goodQuantity !== undefined && this.formData.goodQuantity !== null) {
      this.formData.defectiveQuantity = Math.max(0, total - Number(this.formData.goodQuantity));
    }
  }

  onGoodQtyChange(): void {
    const total = Number(this.formData.totalInspectedQuantity) || 0;
    const good = Number(this.formData.goodQuantity) || 0;
    if (total >= good) {
      this.formData.defectiveQuantity = total - good;
    }
  }

  onDefectiveQtyChange(): void {
    const total = Number(this.formData.totalInspectedQuantity) || 0;
    const def = Number(this.formData.defectiveQuantity) || 0;
    if (total >= def) {
      this.formData.goodQuantity = total - def;
    }
  }

  recalculateQuantities(): void {
    const total = Number(this.formData.totalInspectedQuantity) || 0;
    const good = Number(this.formData.goodQuantity) || 0;
    if (this.formData.defectiveQuantity === undefined || this.formData.defectiveQuantity === null) {
      this.formData.defectiveQuantity = Math.max(0, total - good);
    }
  }

  submitForm(): void {
    this.formError = '';
    const f = this.formData;

    if (!f.productionOrderRef || !f.productName || !f.batchNumber || !f.inspectionDate ||
      !f.inspectorName || !f.inspectionType || !f.status) {
      this.formError = 'Please fill in all required fields.';
      return;
    }
    if ((f.totalInspectedQuantity ?? 0) <= 0) {
      this.formError = 'Total Inspected Quantity must be greater than zero.';
      return;
    }
    if ((f.goodQuantity ?? 0) + (f.defectiveQuantity ?? 0) !== (f.totalInspectedQuantity ?? 0)) {
      this.formError = 'Good Quantity + Defective Quantity must equal Total Inspected Quantity.';
      return;
    }

    const inspection: QualityInspection = {
      id: this.modalMode === 'create'
        ? this.dataService.generateId('INS')
        : f.id!,
      productionOrderRef: f.productionOrderRef!,
      productName: f.productName!,
      batchNumber: f.batchNumber!,
      inspectionDate: f.inspectionDate!,
      inspectorName: f.inspectorName!,
      inspectionType: f.inspectionType as InspectionType,
      totalInspectedQuantity: Number(f.totalInspectedQuantity),
      goodQuantity: Number(f.goodQuantity),
      defectiveQuantity: Number(f.defectiveQuantity),
      status: f.status as InspectionStatus,
      notes: f.notes || '',
      createdAt: f.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = this.dataService.saveInspection(inspection);
    if (result.success) {
      this.notif.success(result.message);
      this.closeModal();
      this.loadInspections();
    } else {
      this.formError = result.message;
    }
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId = id;
  }

  executeDelete(): void {
    if (!this.deleteConfirmId) return;
    const result = this.dataService.deleteInspection(this.deleteConfirmId);
    if (result.success) {
      this.notif.success(result.message);
      this.loadInspections();
    } else {
      this.notif.error(result.message);
    }
    this.deleteConfirmId = null;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  getBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Passed': 'badge-pass',
      'Failed': 'badge-fail',
      'Pending': 'badge-pending',
      'In Progress': 'badge-inprogress',
      'Reinspection Required': 'badge-partial'
    };
    return map[status] || 'badge-pending';
  }

  getPassRate(insp: QualityInspection): string {
    if (insp.totalInspectedQuantity === 0) return '0.0%';
    return ((insp.goodQuantity / insp.totalInspectedQuantity) * 100).toFixed(1) + '%';
  }

  canEdit(insp: QualityInspection): boolean {
    return insp.status !== 'Passed' && insp.status !== 'Failed';
  }
}

