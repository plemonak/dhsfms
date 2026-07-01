export type Role = 'System Admin' | 'HSE Manager' | 'Site Manager' | 'Foreman' | 'Viewer';
export type Status = 'Active' | 'Inactive' | 'Pending' | 'Expired' | 'Missing' | 'Completed' | 'Draft';

export interface Site {
  id: number;
  name: string;
  phase?: string;
  status: Status;
  coordinates?: string;
}

export interface Employee {
  id: number;
  employeeNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  company: string;
  contractor?: string;
  personType: 'DYKAT employee' | 'Subcontractor' | 'External';
  position: string;
  siteId: number;
  status: Status;
  mobile?: string;
  email?: string;
  idOrTaxNo?: string;
  taxNumber?: string;
  fatherName?: string;
  birthDate?: string;
  gender?: string;
  nationality?: string;
  identityDocumentType?: 'Ταυτότητα' | 'Διαβατήριο' | 'Άλλο';
  identityDocumentNo?: string;
  identityIssuingAuthority?: string;
  identityExpiryDate?: string;
  hireDate?: string;
}

export interface ProjectStaffMember {
  id: number;
  displayName: string;
  title?: string;
  responsibleName?: string;
  email?: string;
}

export interface Vehicle {
  id: number;
  code: string;
  plate: string;
  type: string;
  chassisNumber?: string;
  manufacturer?: string;
  model?: string;
  owner: string;
  siteId: number;
  status: Status;
  isImmobilized?: boolean;
  insuranceExpiry?: string;
  kteoExpiry?: string;
  emissionsCardExpiry?: string;
  liftingCertificateExpiry?: string;
}

export interface TrainingSession {
  id: number;
  title: string;
  date: string;
  trainerName: string;
  siteId: number;
  participantIds: number[];
  status: Status;
  pdfUrl?: string;
}

export interface TrainingTopic {
  id: number;
  title: string;
  competency?: string;
  materialUrl?: string;
  source?: string;
}

export interface EvidenceDocument {
  id: number;
  entityType: 'employee' | 'vehicle' | 'asset' | 'training' | 'ppe';
  entityId: number;
  documentType: string;
  fileName?: string;
  issueDate?: string;
  expiryDate?: string;
  status: Status;
  url?: string;
}

export interface PpeIssue {
  id: number;
  employeeId: number;
  siteId: number;
  issueDate: string;
  issuedBy: string;
  status: Status;
}

export interface PpeCatalogItem {
  id: number;
  ppeType: string;
  model: string;
  size: string;
  enCertification: string;
  issueDate: string;
  replacementDate?: string;
  expiryDate?: string;
  quantity: number;
  notes?: string;
}

export interface EquipmentItem {
  id: number;
  name: string;
  serial?: string;
  siteId: number;
  status: Status;
}

export type InspectionSeverity = 'Χαμηλή' | 'Μέτρια' | 'Υψηλή' | 'Κρίσιμη';

export interface Inspection {
  id: number;
  title: string;
  siteId: number;
  inspectionDate: string;
  inspectorId: number; // ProjectStaffMember id
  latitude?: number;
  longitude?: number;
  overallHsFindings?: string;
  overallEnvFindings?: string;
  overallSeverity?: InspectionSeverity;
  overallRecommendations?: string;
  observations?: string;
}

export interface InspectionPhoto {
  id: number;
  inspectionId: number;
  title: string;
  photoUrl?: string;
  inspectorPhotoComment?: string;
  // AI_* πεδία γεμίζουν στη Φάση 4 (Gemini Vision) — προς το παρόν προαιρετικά/κενά
  aiHsFindings?: string;
  aiEnvFindings?: string;
  aiSeverity?: InspectionSeverity;
  aiRecommendations?: string;
}

export interface AppUser {
  displayName: string;
  email: string;
  role: Role;
  initials: string;
}

export type PageKey =
  | 'dashboard'
  | 'employees'
  | 'employee-profile'
  | 'employee-form'
  | 'training'
  | 'jsa-signoff'
  | 'inspections'
  | 'inspection-form'
  | 'ppe'
  | 'medical'
  | 'licenses'
  | 'vehicles'
  | 'vehicle-form'
  | 'vehicle-profile'
  | 'sites'
  | 'contractors'
  | 'equipment'
  | 'smart-docs'
  | 'qr'
  | 'settings';
