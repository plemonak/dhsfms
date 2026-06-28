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
  hireDate?: string;
}

export interface ProjectStaffMember {
  id: number;
  displayName: string;
  title?: string;
  responsibleName?: string;
}

export interface Vehicle {
  id: number;
  code: string;
  plate: string;
  type: string;
  owner: string;
  siteId: number;
  status: Status;
  insuranceExpiry?: string;
  kteoExpiry?: string;
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

export interface EvidenceDocument {
  id: number;
  entityType: 'employee' | 'vehicle' | 'asset' | 'training' | 'ppe';
  entityId: number;
  documentType: string;
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
  | 'ppe'
  | 'medical'
  | 'licenses'
  | 'vehicles'
  | 'vehicle-profile'
  | 'sites'
  | 'contractors'
  | 'equipment'
  | 'smart-docs'
  | 'qr'
  | 'settings';
