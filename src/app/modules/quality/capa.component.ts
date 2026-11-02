import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass, SlicePipe } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  CAPARecord, CAPAStatus, CAPAPriority, VerificationResult,
  DefectRecord, FiveWhysAnalysis, FishboneAnalysis, CAPAVerification
} from '../../core/models/interfaces';

type ModalMode = 'create' | 'edit' | 'view' | 'verify';

@Component({
  selector: 'app-capa',
  standalone: true,
  imports: [FormsModule, DatePipe, NgClass, SlicePipe],
  templateUrl: './capa.component.html',
  styleUrl: './capa.component.css'
})
export class CAPAComponent implements OnInit {
  private dataService = inject(DataService);
  private notif = inject(NotificationService);

  allCAPAs: CAPARecord[] = [];
  filteredCAPAs: CAPARecord[] = [];
  allDefects: DefectRecord[] = [];

  searchQuery = '';
  filterStatus = '';
  filterPriority = '';
  filterDefectId = '';

  modalOpen = false;
  modalMode: ModalMode = 'create';
  selectedCAPA: CAPARecord | null = null;
  deleteConfirmId: string | null = null;

  formData: Partial<CAPARecord> = {};
  formFiveWhys: FiveWhysAnalysis = { why1: '', why2: '', why3: '', why4: '', why5: '' };
  formFishbone: FishboneAnalysis = { man: '', machine: '', method: '', material: '', measurement: '', environment: '' };
  verifyForm: Partial<CAPAVerification> = {};
  formError = '';
  verifyError = '';

  linkedDefect: DefectRecord | null = null;

  readonly capaStatuses: CAPAStatus[] = ['Open', 'Assigned', 'In Progress', 'Pending Verification', 'Completed', 'Rejected'];
  readonly capaPriorities: CAPAPriority[] = ['Low', 'Medium', 'High', 'Critical'];
  readonly verificationResults: VerificationResult[] = ['Effective', 'Not Effective', 'Requires Further Action'];
  readonly departments = [
    'Quality Assurance', 'CNC Machining', 'Electronics Assembly', 'Surface Treatment',
    'Procurement', 'Welding', 'Assembly', 'Injection Moulding', 'Testing', 'Engineering'
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.allDefects = this.dataService.getDefects();
    this.allCAPAs = this.dataService.getCAPAs()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allCAPAs];
    const q = this.searchQuery.toLowerCase();
    if (q) {
      result = result.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.relatedDefectId.toLowerCase().includes(q) ||
        c.problemDescription.toLowerCase().includes(q) ||
        c.responsiblePerson.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
      );
    }
    if (this.filterStatus) result = result.filter(c => c.status === this.filterStatus);
    if (this.filterPriority) result = result.filter(c => c.priority === this.filterPriority);
    if (this.filterDefectId) result = result.filter(c => c.relatedDefectId === this.filterDefectId);
    this.filteredCAPAs = result;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterStatus = '';
    this.filterPriority = '';
    this.filterDefectId = '';
    this.applyFilters();
  }

  openCreate(): void {
    this.formError = '';
    this.linkedDefect = null;
    this.formFiveWhys = { why1: '', why2: '', why3: '', why4: '', why5: '' };
    this.formFishbone = { man: '', machine: '', method: '', material: '', measurement: '', environment: '' };
    this.formData = {
      relatedDefectId: '',
      problemDescription: '',
      rootCauseAnalysis: '',
      correctiveAction: '',
      preventiveAction: '',
      responsiblePerson: '',
      department: 'Quality Assurance',
      priority: 'High',
      createdDate: new Date().toISOString().split('T')[0],
      targetCompletionDate: '',
      status: 'Open'
    };
    this.modalMode = 'create';
    this.modalOpen = true;
  }

  openEdit(capa: CAPARecord): void {
    if (capa.status === 'Completed' || capa.status === 'Rejected') {
      this.notif.warning('Completed or Rejected CAPAs cannot be edited. Reopen first.');
      return;
    }
    this.formError = '';
    this.formData = { ...capa };
    this.formFiveWhys = capa.fiveWhys ? { ...capa.fiveWhys } : { why1: '', why2: '', why3: '', why4: '', why5: '' };
    this.formFishbone = capa.fishbone ? { ...capa.fishbone } : { man: '', machine: '', method: '', material: '', measurement: '', environment: '' };
    this.linkedDefect = this.dataService.getDefect(capa.relatedDefectId) || null;
    this.modalMode = 'edit';
    this.modalOpen = true;
  }

  openView(capa: CAPARecord): void {
    this.selectedCAPA = capa;
    this.linkedDefect = this.dataService.getDefect(capa.relatedDefectId) || null;
    this.modalMode = 'view';
    this.modalOpen = true;
  }

  openVerify(capa: CAPARecord): void {
    if (capa.status !== 'Pending Verification' && capa.status !== 'In Progress') {
      this.notif.warning('Only CAPAs with "Pending Verification" or "In Progress" status can be verified.');
      return;
    }
    this.selectedCAPA = capa;
    this.verifyError = '';
    this.verifyForm = {
      verificationDate: new Date().toISOString().split('T')[0],
      verifiedBy: '',
      verificationResult: 'Effective',
      verificationNotes: ''
    };
    this.modalMode = 'verify';
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.selectedCAPA = null;
    this.formData = {};
    this.formError = '';
    this.verifyError = '';
    this.linkedDefect = null;
  }

  onDefectChange(): void {
    const defect = this.dataService.getDefect(this.formData.relatedDefectId!);
    if (defect) {
      this.linkedDefect = defect;
      if (!this.formData.problemDescription) {
        this.formData.problemDescription = defect.defectDescription;
      }
    } else {
      this.linkedDefect = null;
    }
  }

  submitForm(): void {
    this.formError = '';
    const f = this.formData;

    if (!f.relatedDefectId || !f.problemDescription || !f.correctiveAction ||
      !f.responsiblePerson || !f.department || !f.priority || !f.createdDate || !f.targetCompletionDate || !f.status) {
      this.formError = 'Please fill in all required fields.';
      return;
    }

    // Cannot complete without verification
    if (f.status === 'Completed' && !f.verification?.verificationDate) {
      this.formError = 'A CAPA cannot be marked "Completed" without a verification record. Use the "Verify" action instead.';
      return;
    }

    // Build 5Whys if any filled
    const hasWhys = Object.values(this.formFiveWhys).some(v => v.trim().length > 0);
    const hasFishbone = Object.values(this.formFishbone).some(v => v.trim().length > 0);

    const capa: CAPARecord = {
      id: this.modalMode === 'create'
        ? this.dataService.generateId('CAPA')
        : f.id!,
      relatedDefectId: f.relatedDefectId!,
      problemDescription: f.problemDescription!,
      rootCauseAnalysis: f.rootCauseAnalysis || '',
      correctiveAction: f.correctiveAction!,
      preventiveAction: f.preventiveAction || '',
      responsiblePerson: f.responsiblePerson!,
      department: f.department!,
      priority: f.priority as CAPAPriority,
      createdDate: f.createdDate!,
      targetCompletionDate: f.targetCompletionDate!,
      status: f.status as CAPAStatus,
      fiveWhys: hasWhys ? { ...this.formFiveWhys } : undefined,
      fishbone: hasFishbone ? { ...this.formFishbone } : undefined,
      verification: f.verification,
      createdAt: f.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = this.dataService.saveCAPA(capa);
    if (result.success) {
      this.notif.success(result.message);
      this.closeModal();
      this.loadData();
    } else {
      this.formError = result.message;
    }
  }

  submitVerification(): void {
    this.verifyError = '';
    const v = this.verifyForm;
    if (!v.verificationDate || !v.verifiedBy || !v.verificationResult) {
      this.verifyError = 'Please fill in all verification fields.';
      return;
    }

    const capa = { ...this.selectedCAPA! };
    capa.verification = {
      verificationDate: v.verificationDate!,
      verifiedBy: v.verifiedBy!,
      verificationResult: v.verificationResult as VerificationResult,
      verificationNotes: v.verificationNotes || ''
    };

    if (v.verificationResult === 'Effective') {
      capa.status = 'Completed';
    } else if (v.verificationResult === 'Not Effective') {
      capa.status = 'Rejected';
    } else {
      capa.status = 'In Progress';
    }
    capa.updatedAt = new Date().toISOString();

    const result = this.dataService.saveCAPA(capa);
    if (result.success) {
      this.notif.success(`CAPA ${capa.id} verification recorded. Status: ${capa.status}.`);
      this.closeModal();
      this.loadData();
    } else {
      this.verifyError = result.message;
    }
  }

  reopenCAPA(capa: CAPARecord): void {
    if (!confirm(`Reopen CAPA ${capa.id}? Status will be changed to "In Progress".`)) return;
    const updated = { ...capa, status: 'In Progress' as CAPAStatus, verification: undefined, updatedAt: new Date().toISOString() };
    const result = this.dataService.saveCAPA(updated);
    if (result.success) {
      this.notif.info(`CAPA ${capa.id} reopened for further action.`);
      this.loadData();
    } else {
      this.notif.error(result.message);
    }
  }

  markPendingVerification(capa: CAPARecord): void {
    if (!confirm(`Submit CAPA ${capa.id} for verification?`)) return;
    const updated = { ...capa, status: 'Pending Verification' as CAPAStatus, updatedAt: new Date().toISOString() };
    const result = this.dataService.saveCAPA(updated);
    if (result.success) {
      this.notif.success(`CAPA ${capa.id} submitted for verification.`);
      this.loadData();
    } else {
      this.notif.error(result.message);
    }
  }

  confirmDelete(id: string): void { this.deleteConfirmId = id; }

  executeDelete(): void {
    if (!this.deleteConfirmId) return;
    const result = this.dataService.deleteCAPA(this.deleteConfirmId);
    if (result.success) {
      this.notif.success(result.message);
      this.loadData();
    } else {
      this.notif.error(result.message);
    }
    this.deleteConfirmId = null;
  }

  cancelDelete(): void { this.deleteConfirmId = null; }

  getBadgeClass(key: string): string {
    const map: Record<string, string> = {
      'Open': 'badge-open',
      'Assigned': 'badge-scheduled',
      'In Progress': 'badge-inprogress',
      'Pending Verification': 'badge-partial',
      'Completed': 'badge-completed',
      'Rejected': 'badge-fail',
      'Low': 'badge-low',
      'Medium': 'badge-medium',
      'High': 'badge-high',
      'Critical': 'badge-critical',
      'Effective': 'badge-resolved',
      'Not Effective': 'badge-fail',
      'Requires Further Action': 'badge-pending'
    };
    return map[key] || 'badge-pending';
  }

  isOverdue(capa: CAPARecord): boolean {
    if (capa.status === 'Completed' || capa.status === 'Rejected') return false;
    return new Date(capa.targetCompletionDate) < new Date();
  }

  getDaysRemaining(capa: CAPARecord): number {
    const diff = new Date(capa.targetCompletionDate).getTime() - new Date().getTime();
    return Math.ceil(diff / 86400000);
  }

  getDefectLabel(defectId: string): string {
    const d = this.allDefects.find(d => d.id === defectId);
    return d ? `${d.id} – ${d.defectCategory}` : defectId;
  }

  canVerify(capa: CAPARecord): boolean { return capa.status === 'Pending Verification' || capa.status === 'In Progress'; }
  canReopen(capa: CAPARecord): boolean { return capa.status === 'Completed' || capa.status === 'Rejected'; }
  canSubmitForVerification(capa: CAPARecord): boolean { return capa.status === 'In Progress'; }
}
