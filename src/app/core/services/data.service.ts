import { Injectable } from '@angular/core';
import {
  QualityInspection,
  DefectRecord,
  CAPARecord,
  QualityDashboardStats,
  ProductionOrderRef,
  InspectionStatus,
  DefectStatus,
  CAPAStatus
} from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class DataService {

  private readonly STORAGE_KEYS = {
    inspections: 'qms_m3_inspections',
    defects: 'qms_m3_defects',
    capas: 'qms_m3_capas',
    initialized: 'qms_m3_standalone_initialized'
  };

  constructor() {
    this.initializeDemoData();
  }

  // ============================================================
  // Generic localStorage helpers
  // ============================================================

  private getItems<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setItems<T>(key: string, items: T[]): void {
    localStorage.setItem(key, JSON.stringify(items));
  }

  generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  // ============================================================
  // Reference Production Orders (supporting data only)
  // ============================================================

  getProductionOrderRefs(): ProductionOrderRef[] {
    return [
      { id: 'PO-2026-001', productName: 'Precision Steel Gearbox Assembly' },
      { id: 'PO-2026-002', productName: 'Anodized Aluminum Chassis Bracket' },
      { id: 'PO-2026-003', productName: 'High-Torque Servomotor Stator' },
      { id: 'PO-2026-004', productName: 'Hydraulic Flow Regulating Valve' },
      { id: 'PO-2026-005', productName: 'Polymer Sensor Enclosure Unit' },
      { id: 'PO-2026-006', productName: 'Titanium Fastener Assembly' },
      { id: 'PO-2026-007', productName: 'Electronic Control Module PCB' },
      { id: 'PO-2026-008', productName: 'Stainless Steel Bearing Housing' }
    ];
  }

  // ============================================================
  // Quality Inspections CRUD
  // ============================================================

  getInspections(): QualityInspection[] {
    return this.getItems<QualityInspection>(this.STORAGE_KEYS.inspections);
  }

  getInspection(id: string): QualityInspection | undefined {
    return this.getInspections().find(i => i.id === id);
  }

  saveInspection(inspection: QualityInspection): { success: boolean; message: string } {
    const inspections = this.getInspections();
    const index = inspections.findIndex(i => i.id === inspection.id);

    // Validate quantity
    if (inspection.goodQuantity + inspection.defectiveQuantity !== inspection.totalInspectedQuantity) {
      return { success: false, message: 'Good Quantity + Defective Quantity must equal Total Inspected Quantity.' };
    }
    if (inspection.totalInspectedQuantity <= 0) {
      return { success: false, message: 'Total Inspected Quantity must be greater than zero.' };
    }

    // Check duplicate (same batch + type + date, exclude self)
    const duplicate = inspections.find(i =>
      i.id !== inspection.id &&
      i.batchNumber === inspection.batchNumber &&
      i.inspectionType === inspection.inspectionType &&
      i.inspectionDate === inspection.inspectionDate
    );
    if (duplicate) {
      return { success: false, message: `An inspection of type "${inspection.inspectionType}" for batch ${inspection.batchNumber} on ${inspection.inspectionDate} already exists (${duplicate.id}).` };
    }

    if (index >= 0) {
      inspections[index] = { ...inspection, updatedAt: new Date().toISOString() };
    } else {
      inspections.push({
        ...inspection,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.setItems(this.STORAGE_KEYS.inspections, inspections);
    return { success: true, message: `Inspection ${inspection.id} saved successfully.` };
  }

  deleteInspection(id: string): { success: boolean; message: string } {
    // Check if defects are linked
    const linkedDefects = this.getDefects().filter(d => d.inspectionId === id);
    if (linkedDefects.length > 0) {
      return { success: false, message: `Cannot delete: ${linkedDefects.length} defect record(s) are linked to this inspection.` };
    }
    const inspections = this.getInspections().filter(i => i.id !== id);
    this.setItems(this.STORAGE_KEYS.inspections, inspections);
    return { success: true, message: 'Inspection deleted successfully.' };
  }

  // ============================================================
  // Defect Records CRUD
  // ============================================================

  getDefects(): DefectRecord[] {
    return this.getItems<DefectRecord>(this.STORAGE_KEYS.defects);
  }

  getDefect(id: string): DefectRecord | undefined {
    return this.getDefects().find(d => d.id === id);
  }

  getDefectsByInspection(inspectionId: string): DefectRecord[] {
    return this.getDefects().filter(d => d.inspectionId === inspectionId);
  }

  saveDefect(defect: DefectRecord): { success: boolean; message: string } {
    const defects = this.getDefects();
    const index = defects.findIndex(d => d.id === defect.id);

    // Validate quantity against linked inspection
    const inspection = this.getInspection(defect.inspectionId);
    if (!inspection) {
      return { success: false, message: 'Linked inspection record not found.' };
    }

    // Total defect quantity registered for this inspection (excluding self)
    const existingDefectQty = defects
      .filter(d => d.inspectionId === defect.inspectionId && d.id !== defect.id)
      .reduce((sum, d) => sum + d.defectiveQuantity, 0);

    if (existingDefectQty + defect.defectiveQuantity > inspection.defectiveQuantity) {
      return {
        success: false,
        message: `Defective quantity exceeds the inspection's defective quantity (${inspection.defectiveQuantity}). Already registered: ${existingDefectQty}.`
      };
    }

    if (index >= 0) {
      defects[index] = { ...defect, updatedAt: new Date().toISOString() };
    } else {
      defects.push({
        ...defect,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.setItems(this.STORAGE_KEYS.defects, defects);
    return { success: true, message: `Defect ${defect.id} saved successfully.` };
  }

  deleteDefect(id: string): { success: boolean; message: string } {
    const linkedCAPAs = this.getCAPAs().filter(c => c.relatedDefectId === id);
    if (linkedCAPAs.length > 0) {
      return { success: false, message: `Cannot delete: ${linkedCAPAs.length} CAPA record(s) are linked to this defect.` };
    }
    const defects = this.getDefects().filter(d => d.id !== id);
    this.setItems(this.STORAGE_KEYS.defects, defects);
    return { success: true, message: 'Defect record deleted successfully.' };
  }

  // ============================================================
  // CAPA Records CRUD
  // ============================================================

  getCAPAs(): CAPARecord[] {
    return this.getItems<CAPARecord>(this.STORAGE_KEYS.capas);
  }

  getCAPA(id: string): CAPARecord | undefined {
    return this.getCAPAs().find(c => c.id === id);
  }

  getCAPAsByDefect(defectId: string): CAPARecord[] {
    return this.getCAPAs().filter(c => c.relatedDefectId === defectId);
  }

  saveCAPA(capa: CAPARecord): { success: boolean; message: string } {
    const capas = this.getCAPAs();
    const index = capas.findIndex(c => c.id === capa.id);

    // Validate: if marking completed, must have verification
    if (capa.status === 'Completed' && !capa.verification?.verificationDate) {
      return { success: false, message: 'A CAPA cannot be marked "Completed" without a verification record. Please add verification first.' };
    }

    // Validate linked defect exists
    const defect = this.getDefect(capa.relatedDefectId);
    if (!defect) {
      return { success: false, message: 'Linked defect record not found.' };
    }

    if (index >= 0) {
      capas[index] = { ...capa, updatedAt: new Date().toISOString() };
    } else {
      capas.push({
        ...capa,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.setItems(this.STORAGE_KEYS.capas, capas);

    // Update linked defect status if CAPA assigned
    if (capa.status === 'Assigned' || capa.status === 'In Progress') {
      if (defect.status === 'Open' || defect.status === 'Under Investigation') {
        defect.status = 'Corrective Action Assigned';
        defect.updatedAt = new Date().toISOString();
        const defects = this.getDefects();
        const di = defects.findIndex(d => d.id === defect.id);
        if (di >= 0) defects[di] = defect;
        this.setItems(this.STORAGE_KEYS.defects, defects);
      }
    }

    return { success: true, message: `CAPA ${capa.id} saved successfully.` };
  }

  deleteCAPA(id: string): { success: boolean; message: string } {
    const capas = this.getCAPAs().filter(c => c.id !== id);
    this.setItems(this.STORAGE_KEYS.capas, capas);
    return { success: true, message: 'CAPA record deleted successfully.' };
  }

  // ============================================================
  // Quality Dashboard Statistics (computed from real data)
  // ============================================================

  getQualityDashboardStats(): QualityDashboardStats {
    const inspections = this.getInspections();
    const defects = this.getDefects();
    const capas = this.getCAPAs();

    const passedInspections = inspections.filter(i => i.status === 'Passed').length;
    const failedInspections = inspections.filter(i => i.status === 'Failed').length;
    const pendingInspections = inspections.filter(i => i.status === 'Pending').length;
    const inProgressInspections = inspections.filter(i => i.status === 'In Progress').length;
    const reinspectionRequired = inspections.filter(i => i.status === 'Reinspection Required').length;

    const criticalDefects = defects.filter(d => d.severity === 'Critical').length;
    const majorDefects = defects.filter(d => d.severity === 'Major').length;
    const minorDefects = defects.filter(d => d.severity === 'Minor').length;
    const openDefects = defects.filter(d => d.status === 'Open').length;
    const resolvedDefects = defects.filter(d => d.status === 'Resolved' || d.status === 'Closed').length;

    const openCAPAs = capas.filter(c => c.status === 'Open' || c.status === 'Assigned').length;
    const completedCAPAs = capas.filter(c => c.status === 'Completed').length;
    const inProgressCAPAs = capas.filter(c => c.status === 'In Progress').length;
    const pendingVerificationCAPAs = capas.filter(c => c.status === 'Pending Verification').length;

    const totalGoodQty = inspections.reduce((sum, i) => sum + i.goodQuantity, 0);
    const totalInspectedQty = inspections.reduce((sum, i) => sum + i.totalInspectedQuantity, 0);
    const totalDefectiveQty = inspections.reduce((sum, i) => sum + i.defectiveQuantity, 0);

    const firstPassYield = totalInspectedQty > 0
      ? Math.round((totalGoodQty / totalInspectedQty) * 1000) / 10
      : 0;

    const inspectionPassRate = inspections.length > 0
      ? Math.round((passedInspections / inspections.length) * 1000) / 10
      : 0;

    const defectRate = totalInspectedQty > 0
      ? Math.round((totalDefectiveQty / totalInspectedQty) * 1000) / 10
      : 0;

    return {
      totalInspections: inspections.length,
      passedInspections,
      failedInspections,
      pendingInspections,
      inProgressInspections,
      reinspectionRequired,
      totalDefects: defects.length,
      criticalDefects,
      majorDefects,
      minorDefects,
      openDefects,
      resolvedDefects,
      openCAPAs,
      completedCAPAs,
      inProgressCAPAs,
      pendingVerificationCAPAs,
      firstPassYield,
      inspectionPassRate,
      defectRate
    };
  }

  // ============================================================
  // Reset & Demo Data Initialization
  // ============================================================

  resetAllData(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    this.initializeDemoData();
  }

  private initializeDemoData(): void {
    if (localStorage.getItem(this.STORAGE_KEYS.initialized)) return;

    const now = new Date();
    const d = (daysOffset: number) => {
      const dt = new Date(now.getTime() + daysOffset * 86400000);
      return dt.toISOString().split('T')[0];
    };

    // ---- Quality Inspections ----
    const inspections: QualityInspection[] = [
      {
        id: 'INS-001',
        productionOrderRef: 'PO-2026-001',
        productName: 'Precision Steel Gearbox Assembly',
        batchNumber: 'BATCH-GBX-001',
        inspectionDate: d(-10),
        inspectorName: 'Arjun Mehta',
        inspectionType: 'Final Product Inspection',
        totalInspectedQuantity: 120,
        goodQuantity: 116,
        defectiveQuantity: 4,
        status: 'Passed',
        notes: 'Minor surface defects found on 4 units. All critical dimensions within tolerance.',
        createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 10 * 86400000).toISOString()
      },
      {
        id: 'INS-002',
        productionOrderRef: 'PO-2026-002',
        productName: 'Anodized Aluminum Chassis Bracket',
        batchNumber: 'BATCH-CHB-001',
        inspectionDate: d(-7),
        inspectorName: 'Priya Sharma',
        inspectionType: 'In-Process Inspection',
        totalInspectedQuantity: 80,
        goodQuantity: 72,
        defectiveQuantity: 8,
        status: 'Failed',
        notes: 'Dimensional deviations exceeding tolerance on 8 units. Root cause: tooling wear.',
        createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 7 * 86400000).toISOString()
      },
      {
        id: 'INS-003',
        productionOrderRef: 'PO-2026-003',
        productName: 'High-Torque Servomotor Stator',
        batchNumber: 'BATCH-STR-001',
        inspectionDate: d(-5),
        inspectorName: 'Rahul Verma',
        inspectionType: 'Incoming Material Inspection',
        totalInspectedQuantity: 50,
        goodQuantity: 50,
        defectiveQuantity: 0,
        status: 'Passed',
        notes: 'All raw material samples passed dimensional and electrical resistance checks.',
        createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 5 * 86400000).toISOString()
      },
      {
        id: 'INS-004',
        productionOrderRef: 'PO-2026-004',
        productName: 'Hydraulic Flow Regulating Valve',
        batchNumber: 'BATCH-VLV-001',
        inspectionDate: d(-3),
        inspectorName: 'Sneha Patel',
        inspectionType: 'Final Product Inspection',
        totalInspectedQuantity: 15,
        goodQuantity: 12,
        defectiveQuantity: 3,
        status: 'Reinspection Required',
        notes: '3 valves failed pressure test at 350 bar. Suspected internal seal defect.',
        createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 3 * 86400000).toISOString()
      },
      {
        id: 'INS-005',
        productionOrderRef: 'PO-2026-002',
        productName: 'Anodized Aluminum Chassis Bracket',
        batchNumber: 'BATCH-CHB-001',
        inspectionDate: d(-2),
        inspectorName: 'Arjun Mehta',
        inspectionType: 'Random Sampling Inspection',
        totalInspectedQuantity: 30,
        goodQuantity: 28,
        defectiveQuantity: 2,
        status: 'Passed',
        notes: 'Re-sampling after tooling correction. Only 2 borderline units flagged.',
        createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 86400000).toISOString()
      },
      {
        id: 'INS-006',
        productionOrderRef: 'PO-2026-005',
        productName: 'Polymer Sensor Enclosure Unit',
        batchNumber: 'BATCH-ENC-001',
        inspectionDate: d(-1),
        inspectorName: 'Kiran Rao',
        inspectionType: 'Incoming Material Inspection',
        totalInspectedQuantity: 100,
        goodQuantity: 95,
        defectiveQuantity: 5,
        status: 'In Progress',
        notes: 'Initial batch screening ongoing. 5 units with surface porosity flagged for further review.',
        createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString()
      },
      {
        id: 'INS-007',
        productionOrderRef: 'PO-2026-006',
        productName: 'Titanium Fastener Assembly',
        batchNumber: 'BATCH-TFA-001',
        inspectionDate: d(0),
        inspectorName: 'Priya Sharma',
        inspectionType: 'In-Process Inspection',
        totalInspectedQuantity: 200,
        goodQuantity: 200,
        defectiveQuantity: 0,
        status: 'Pending',
        notes: 'Scheduled mid-cycle check pending inspector availability.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'INS-008',
        productionOrderRef: 'PO-2026-007',
        productName: 'Electronic Control Module PCB',
        batchNumber: 'BATCH-PCB-001',
        inspectionDate: d(-8),
        inspectorName: 'Rahul Verma',
        inspectionType: 'Final Product Inspection',
        totalInspectedQuantity: 40,
        goodQuantity: 35,
        defectiveQuantity: 5,
        status: 'Failed',
        notes: '5 PCBs with solder bridging defects detected under AOI. Requires rework.',
        createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 8 * 86400000).toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.inspections, inspections);

    // ---- Defect Records ----
    const defects: DefectRecord[] = [
      {
        id: 'DEF-001',
        inspectionId: 'INS-001',
        productionOrderRef: 'PO-2026-001',
        productName: 'Precision Steel Gearbox Assembly',
        batchNumber: 'BATCH-GBX-001',
        defectCategory: 'Surface Defect',
        defectDescription: 'Minor surface scratches detected on gear housing casting at multiple units. Surface finish Ra >3.2 µm.',
        defectiveQuantity: 4,
        severity: 'Minor',
        rootCause: 'Improper handling during CNC transfer between machining and assembly station.',
        responsibleDepartment: 'Machining',
        detectionDate: d(-10),
        status: 'Resolved',
        createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 5 * 86400000).toISOString()
      },
      {
        id: 'DEF-002',
        inspectionId: 'INS-002',
        productionOrderRef: 'PO-2026-002',
        productName: 'Anodized Aluminum Chassis Bracket',
        batchNumber: 'BATCH-CHB-001',
        defectCategory: 'Dimensional Defect',
        defectDescription: 'Hole diameter deviation: +0.15mm over tolerance. Mounting holes at positions H3 and H4 out of specification on 6 units.',
        defectiveQuantity: 6,
        severity: 'Major',
        rootCause: 'CNC drill bit wear causing gradual dimensional drift. Calibration overdue.',
        responsibleDepartment: 'CNC Machining',
        detectionDate: d(-7),
        status: 'Corrective Action Assigned',
        createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 4 * 86400000).toISOString()
      },
      {
        id: 'DEF-003',
        inspectionId: 'INS-002',
        productionOrderRef: 'PO-2026-002',
        productName: 'Anodized Aluminum Chassis Bracket',
        batchNumber: 'BATCH-CHB-001',
        defectCategory: 'Surface Defect',
        defectDescription: 'Anodizing layer uniformity failure. Uneven color distribution indicating electrolyte bath contamination on 2 units.',
        defectiveQuantity: 2,
        severity: 'Minor',
        rootCause: 'Electrolyte bath pH deviation due to delayed chemical top-up.',
        responsibleDepartment: 'Surface Treatment',
        detectionDate: d(-7),
        status: 'Open',
        createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 7 * 86400000).toISOString()
      },
      {
        id: 'DEF-004',
        inspectionId: 'INS-004',
        productionOrderRef: 'PO-2026-004',
        productName: 'Hydraulic Flow Regulating Valve',
        batchNumber: 'BATCH-VLV-001',
        defectCategory: 'Functional Defect',
        defectDescription: 'Internal pressure leakage at 350 bar. Hydraulic seal degradation detected using ultrasonic leak detector.',
        defectiveQuantity: 3,
        severity: 'Critical',
        rootCause: 'Incorrect O-ring material specification (NBR used instead of HNBR). Supplier substitution without approval.',
        responsibleDepartment: 'Procurement',
        detectionDate: d(-3),
        status: 'Under Investigation',
        createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 86400000).toISOString()
      },
      {
        id: 'DEF-005',
        inspectionId: 'INS-008',
        productionOrderRef: 'PO-2026-007',
        productName: 'Electronic Control Module PCB',
        batchNumber: 'BATCH-PCB-001',
        defectCategory: 'Assembly Defect',
        defectDescription: 'Solder bridging between IC pins U12 and U13. Detected by automated optical inspection. Risk of short circuit under load.',
        defectiveQuantity: 5,
        severity: 'Critical',
        rootCause: 'Stencil aperture reduction not applied during solder paste printing. Process parameter deviation.',
        responsibleDepartment: 'Electronics Assembly',
        detectionDate: d(-8),
        status: 'Corrective Action Assigned',
        createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.defects, defects);

    // ---- CAPA Records ----
    const capas: CAPARecord[] = [
      {
        id: 'CAPA-001',
        relatedDefectId: 'DEF-002',
        problemDescription: 'Systematic dimensional deviation in mounting hole diameters of Aluminum Chassis Bracket (BATCH-CHB-001). 6 units rejected at final inspection.',
        rootCauseAnalysis: 'CNC drill tooling worn beyond replacement threshold due to missed preventive maintenance. Tool wear tracking system not in place.',
        correctiveAction: 'Replace all worn drill bits on CNC Station WC-001. Perform immediate dimensional verification on remaining batch units. Quarantine all non-conforming units.',
        preventiveAction: 'Implement mandatory tool life tracking system with automated replacement alerts at 80% tool life. Schedule bi-weekly tool condition audits. Add dimensional check at mid-batch interval.',
        responsiblePerson: 'Arjun Mehta',
        department: 'CNC Machining',
        priority: 'High',
        createdDate: d(-6),
        targetCompletionDate: d(2),
        status: 'In Progress',
        fiveWhys: {
          why1: 'Mounting holes are out of dimensional tolerance.',
          why2: 'CNC drill bits were worn beyond acceptable limits.',
          why3: 'Drill bits were not replaced at scheduled intervals.',
          why4: 'Tool life tracking was not monitored during production run.',
          why5: 'No automated tool wear monitoring system was in place to alert operators.'
        },
        fishbone: {
          man: 'Operator did not check tool condition before production run start',
          machine: 'CNC drill bit worn to 95% tool life without replacement alert',
          method: 'No mandatory mid-batch dimensional verification checkpoint in SOP',
          material: 'Standard HSS drill bits used instead of carbide-tipped for aluminum',
          measurement: 'Diameter measured only at first-off inspection, not at intervals',
          environment: 'Production floor vibration may have accelerated tool wear rate'
        },
        createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 86400000).toISOString()
      },
      {
        id: 'CAPA-002',
        relatedDefectId: 'DEF-004',
        problemDescription: 'Critical hydraulic seal failure in Hydraulic Flow Regulating Valve (BATCH-VLV-001). 3 valves leak at 350 bar. Suspected unauthorized material substitution by supplier.',
        rootCauseAnalysis: 'Supplier substituted approved HNBR O-rings with NBR material without documented change notification. NBR degrades at high temperature hydraulic fluid exposure.',
        correctiveAction: 'Immediate quarantine and recall of all affected valve units. Source HNBR O-rings from approved supplier. 100% pressure test all units in batch before release.',
        preventiveAction: 'Add material certificate verification step to incoming inspection process. Issue Supplier Corrective Action Request (SCAR). Update Approved Supplier List (ASL) with material traceability requirement.',
        responsiblePerson: 'Sneha Patel',
        department: 'Quality Assurance',
        priority: 'Critical',
        createdDate: d(-2),
        targetCompletionDate: d(5),
        status: 'Assigned',
        fiveWhys: {
          why1: 'Hydraulic valves are failing pressure test at 350 bar.',
          why2: 'Internal O-ring seals are degrading prematurely under pressure.',
          why3: 'O-rings are made of NBR material, not the specified HNBR.',
          why4: 'Supplier substituted material without engineering change approval.',
          why5: 'No material certificate verification step exists in incoming inspection.'
        },
        fishbone: {
          man: 'Incoming inspector did not verify material certificate against BOM specification',
          machine: 'Pressure test rig not used for incoming material batch screening',
          method: 'Incoming inspection procedure does not require material composition verification',
          material: 'NBR O-rings substituted for HNBR by supplier without notification',
          measurement: 'No chemical composition testing in incoming inspection protocol',
          environment: 'High-temperature hydraulic fluid accelerates NBR seal degradation'
        },
        createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString()
      },
      {
        id: 'CAPA-003',
        relatedDefectId: 'DEF-005',
        problemDescription: 'Solder bridging defect on PCB batch BATCH-PCB-001. 5 boards failed AOI inspection. Risk of electrical short circuit in field.',
        rootCauseAnalysis: 'Stencil aperture reduction not applied for dense BGA area. Solder paste over-applied creating bridges during reflow.',
        correctiveAction: 'Rework all 5 affected PCBs. Review and update solder paste stencil design. Perform 100% AOI on entire PCB batch.',
        preventiveAction: 'Implement design rule check (DRC) review for stencil aperture at product introduction stage. Add solder paste volume measurement step using SPI machine.',
        responsiblePerson: 'Kiran Rao',
        department: 'Electronics Assembly',
        priority: 'Critical',
        createdDate: d(-6),
        targetCompletionDate: d(-1),
        status: 'Pending Verification',
        fiveWhys: {
          why1: 'PCBs show solder bridging between IC pins.',
          why2: 'Excess solder paste was deposited in the IC area.',
          why3: 'Stencil aperture was not reduced for dense component area.',
          why4: 'Stencil design review did not flag the dense component zone.',
          why5: 'No design rule check for stencil aperture reduction was in place.'
        },
        fishbone: {
          man: 'SMT engineer did not review stencil aperture for BGA components',
          machine: 'SPI (Solder Paste Inspection) machine not used for this batch',
          method: 'Stencil design review checklist did not include aperture reduction verification',
          material: 'Solder paste viscosity slightly higher than specified range',
          measurement: 'AOI run only at final stage, not after paste printing',
          environment: 'Humidity variation in SMT area affected solder paste spread rate'
        },
        createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString()
      }
    ];
    this.setItems(this.STORAGE_KEYS.capas, capas);

    localStorage.setItem(this.STORAGE_KEYS.initialized, 'true');
  }
}
