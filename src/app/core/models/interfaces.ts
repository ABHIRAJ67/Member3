// ============================================================
// MFG Pro – Quality Control & Inspection Management System
// Core Data Models / TypeScript Interfaces (Member 3 Standalone)
// ============================================================

// ---- Enumerations / Union Types ----

export type InspectionType =
  | 'Incoming Material Inspection'
  | 'In-Process Inspection'
  | 'Final Product Inspection'
  | 'Random Sampling Inspection';

export type InspectionStatus =
  | 'Pending'
  | 'In Progress'
  | 'Passed'
  | 'Failed'
  | 'Reinspection Required';

export type DefectCategory =
  | 'Dimensional Defect'
  | 'Surface Defect'
  | 'Material Defect'
  | 'Functional Defect'
  | 'Assembly Defect'
  | 'Packaging Defect'
  | 'Electrical Defect'
  | 'Other';

export type DefectSeverity = 'Critical' | 'Major' | 'Minor';

export type DefectStatus =
  | 'Open'
  | 'Under Investigation'
  | 'Corrective Action Assigned'
  | 'Resolved'
  | 'Closed';

export type CAPAStatus =
  | 'Open'
  | 'Assigned'
  | 'In Progress'
  | 'Pending Verification'
  | 'Completed'
  | 'Rejected';

export type CAPAPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type VerificationResult = 'Effective' | 'Not Effective' | 'Requires Further Action';

export type FishboneCategory = 'Man' | 'Machine' | 'Method' | 'Material' | 'Measurement' | 'Environment';

// ---- Quality Inspection ----

export interface QualityInspection {
  id: string;
  productionOrderRef: string;
  productName: string;
  batchNumber: string;
  inspectionDate: string;
  inspectorName: string;
  inspectionType: InspectionType;
  totalInspectedQuantity: number;
  goodQuantity: number;
  defectiveQuantity: number;
  status: InspectionStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Defect Record ----

export interface DefectRecord {
  id: string;
  inspectionId: string;
  productionOrderRef: string;
  productName: string;
  batchNumber: string;
  defectCategory: DefectCategory;
  defectDescription: string;
  defectiveQuantity: number;
  severity: DefectSeverity;
  rootCause: string;
  responsibleDepartment: string;
  detectionDate: string;
  status: DefectStatus;
  createdAt: string;
  updatedAt: string;
}

// ---- 5 Whys Analysis ----

export interface FiveWhysAnalysis {
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
}

// ---- Fishbone / Ishikawa ----

export interface FishboneAnalysis {
  man: string;
  machine: string;
  method: string;
  material: string;
  measurement: string;
  environment: string;
}

// ---- CAPA Verification ----

export interface CAPAVerification {
  verificationDate: string;
  verifiedBy: string;
  verificationResult: VerificationResult;
  verificationNotes: string;
}

// ---- CAPA Record ----

export interface CAPARecord {
  id: string;
  relatedDefectId: string;
  problemDescription: string;
  rootCauseAnalysis: string;
  correctiveAction: string;
  preventiveAction: string;
  responsiblePerson: string;
  department: string;
  priority: CAPAPriority;
  createdDate: string;
  targetCompletionDate: string;
  status: CAPAStatus;
  fiveWhys?: FiveWhysAnalysis;
  fishbone?: FishboneAnalysis;
  verification?: CAPAVerification;
  createdAt: string;
  updatedAt: string;
}

// ---- Quality Dashboard Stats ----

export interface QualityDashboardStats {
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  pendingInspections: number;
  inProgressInspections: number;
  reinspectionRequired: number;
  totalDefects: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  openDefects: number;
  resolvedDefects: number;
  openCAPAs: number;
  completedCAPAs: number;
  inProgressCAPAs: number;
  pendingVerificationCAPAs: number;
  firstPassYield: number;
  inspectionPassRate: number;
  defectRate: number;
}

// ---- Reference Production Orders (for dropdown) ----

export interface ProductionOrderRef {
  id: string;
  productName: string;
}
