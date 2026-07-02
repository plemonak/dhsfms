import type { Employee, EmployeeLicense, EquipmentItem, EvidenceDocument, Inspection, InspectionPhoto, MedicalCertificate, PpeAssignment, PpeAssignmentStatus, PpeCatalogItem, PpeIssue, ProjectStaffMember, SpecialtyMatrixEntry, Site, TrainingSession, TrainingTopic, Vehicle } from '../types/models';
import { documents, employees, equipmentCatalog, ppeCatalog, ppeIssues, projectStaff, sites, trainingTopics, trainings, vehicles } from '../data/mockData';
import { FlowAdapter, OcrAdapter, QrAdapter, SharePointAdapter, SignatureAdapter } from './integrationAdapters';
import { integrationConfig } from './integrationConfig';
import {
  cancelPpeIssueFlow,
  createEmployeeFlow,
  createEmployeeLicenseFlow,
  createInspectionFlow,
  createInspectionPhotoFlow,
  createPpeAssignmentFlow,
  createPpeIssueFlow,
  createTrainingFlow,
  getEmployeeDocumentsFlow,
  getEmployeeLicensesFlow,
  getEmployeesFlow,
  getInspectionsFlow,
  getMedicalCertificatesFlow,
  getPpeAssignmentsFlow,
  getPpeCatalogFlow,
  getProjectStaffFlow,
  getSpecialtyMatrixFlow,
  getTrainingTopicsFlow,
  getVehicleDocumentsFlow,
  getVehiclesFlow,
  getSitesFlow,
  updatePpeAssignmentStatusFlow,
  uploadLicenseEvidenceFlow,
  updateVehicleFlow,
  uploadInspectionPhotoFlow,
} from './flowClient';

export interface IDataProvider {
  getSites(): Promise<Site[]>;
  getEmployees(siteId?: number): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getProjectStaff(siteId?: number): Promise<ProjectStaffMember[]>;
  getTrainingTopics(): Promise<TrainingTopic[]>;
  getPpeCatalog(): Promise<PpeCatalogItem[]>;
  getEquipmentCatalog(siteId?: number): Promise<EquipmentItem[]>;
  createEmployee(employee: Omit<Employee, 'id' | 'fullName'>): Promise<Employee>;
  createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle>;
  updateVehicle(vehicle: Vehicle): Promise<Vehicle>;
  getVehicles(siteId?: number): Promise<Vehicle[]>;
  getTrainings(siteId?: number): Promise<TrainingSession[]>;
  getDocuments(entityType?: EvidenceDocument['entityType'], entityId?: number): Promise<EvidenceDocument[]>;
  getPpeIssues(employeeId?: number): Promise<PpeIssue[]>;
  getSpecialtyMatrix(): Promise<SpecialtyMatrixEntry[]>;
  createPpeIssue(input: { employeeId: number; employeeName: string; siteId: number; issuedById: number; issuedByName: string; ppeItemsSummary: string }): Promise<PpeIssue>;
  attachPpeIssuePdf(ppeIssueId: number, pdfUrl: string): Promise<void>;
  cancelPpeIssue(ppeIssueId: number, cancelledBy: string): Promise<void>;
  getPpeAssignments(employeeId?: number): Promise<PpeAssignment[]>;
  createPpeAssignment(input: { issuanceId: number; ppeCategory: string; ppeModel?: string; quantity: number; expiryDate?: string }): Promise<PpeAssignment>;
  updatePpeAssignmentStatus(ppeAssignmentId: number, status: PpeAssignmentStatus, changedBy: string): Promise<void>;
  getMedicalCertificates(employeeId?: number): Promise<MedicalCertificate[]>;
  getEmployeeLicenses(employeeId?: number): Promise<EmployeeLicense[]>;
  createEmployeeLicense(input: { employeeId: number; employeeNo?: string; employeeName?: string; licenseType: string; licenseGrade?: string; licenseSpecialty?: string[]; licenseNo?: string; issueDate?: string; expiryDate?: string }, file?: File): Promise<EmployeeLicense>;
  getInspections(siteId?: number): Promise<Inspection[]>;
  createInspection(inspection: Omit<Inspection, 'id'>): Promise<Inspection>;
  uploadInspectionPhoto(file: File, folderPath: string): Promise<{ url: string; fileName: string; status?: string }>;
  addInspectionPhoto(photo: Omit<InspectionPhoto, 'id'>): Promise<InspectionPhoto>;
  createTrainingRecord(payload: Record<string, unknown>): Promise<{ id?: number; status: string }>;
  triggerTrainingPdf(input: { trainingSessionId: number; trainingTitle: string; trainerName: string; trainerSignature: string; participantsJson: string; pdfFileName: string }): Promise<{ pdfUrl: string }>;
  generatePpeIssuePdf(input: { employeeId: number; employeeName: string; employeeNo?: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string; ppeItemsSummary?: string; ppeItemsHtml?: string; issuerSignatureBase64?: string; employeeSignatureBase64?: string; ppeIssueId?: number }): Promise<{ pdfUrl: string }>;
  generateEquipmentAssignmentPdf(input: { employeeId: number; employeeName: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string }): Promise<{ pdfUrl: string }>;
  uploadEvidence(file: File, folderPath: string): Promise<{ url: string; status?: string; fileName: string }>;
  uploadEmployeeDocument(file: File, input: { employeeId: number; employeeName: string; documentType: string; issueDate?: string; expiryDate?: string; issuingAuthority?: string; mandatory?: boolean; aiWarnings?: string; notes?: string }): Promise<{ url: string; status?: string; fileName: string }>;
  extractDocumentText(file: File, options?: { documentType?: string; vehicleId?: number; vehiclePlate?: string }): Promise<{ text: string; confidence: number }>;
  captureSignature(payload: { signerName: string; documentId: string }): Promise<{ signatureUrl: string; status: 'pending' | 'completed' }>;
  generateQr(payload: string): Promise<{ qrUrl: string; payload: string }>;
}

export class MockDataProvider implements IDataProvider {
  private employeeStore = [...employees];
  private vehicleStore = [...vehicles];
  private trainingStore = [...trainings];
  private inspectionStore: Inspection[] = [];
  private inspectionPhotoStore: InspectionPhoto[] = [];
  private ppeIssueStore = [...ppeIssues];
  private ppeAssignmentStore: PpeAssignment[] = [];
  private medicalCertificateStore: MedicalCertificate[] = [];
  private employeeLicenseStore: EmployeeLicense[] = [];
  private sharePointAdapter = new SharePointAdapter();
  private flowAdapter = new FlowAdapter();
  private ocrAdapter = new OcrAdapter();
  private signatureAdapter = new SignatureAdapter();
  private qrAdapter = new QrAdapter();

  private normalizeVehicleDocumentKey(value?: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '')
      .toUpperCase()
      .replace(/Μ/g, 'M')
      .replace(/Ε/g, 'E')
      .replace(/Ι/g, 'I')
      .replace(/Χ/g, 'X');
  }

  private extractVehicleKeyFromDocument(document: EvidenceDocument & Record<string, unknown>): string | undefined {
    const rawPath = String(document.folderPath ?? document.title ?? document.documentType ?? '');
    const parts = rawPath.split('/').map(part => part.trim()).filter(Boolean);
    const vehiclesIndex = parts.findIndex(part => this.normalizeVehicleDocumentKey(part) === 'VEHICLES');
    const vehicleKey = vehiclesIndex >= 0 ? parts[vehiclesIndex + 1] : parts[0];
    return vehicleKey || undefined;
  }

  private extractDocumentTypeFromPath(document: EvidenceDocument & Record<string, unknown>): string {
    const explicitType = typeof document.documentType === 'string' ? document.documentType : undefined;
    const rawPath = String(document.folderPath ?? document.title ?? explicitType ?? '');
    const parts = rawPath.split('/').map(part => part.trim()).filter(Boolean);
    const vehiclesIndex = parts.findIndex(part => this.normalizeVehicleDocumentKey(part) === 'VEHICLES');
    const category = vehiclesIndex >= 0 ? parts[vehiclesIndex + 2] : undefined;

    if (category) {
      const normalized = this.normalizeVehicleDocumentKey(category);
      if (normalized.includes('INSURANCE')) return 'Ασφάλεια';
      if (normalized.includes('LICENSE') || normalized.includes('ADEIA')) return 'Άδεια / VIN';
      if (normalized.includes('KTEO')) return 'ΚΤΕΟ';
      if (normalized.includes('EMISSIONS')) return 'Κάρτα Καυσαερίων';
      if (normalized.includes('LIFTING')) return 'Πιστοποιητικό Ανυψωτικής Ικανότητας';
      return category;
    }

    return explicitType ?? 'Έγγραφο οχήματος';
  }

  private attachVehicleDocumentEntities(rawDocuments: Array<EvidenceDocument & Record<string, unknown>>): EvidenceDocument[] {
    return rawDocuments.map((document) => {
      const vehicleKey = this.normalizeVehicleDocumentKey(
        String(document.vehicleKey ?? this.extractVehicleKeyFromDocument(document) ?? '')
      );

      const matchedVehicle = this.vehicleStore.find(vehicle => {
        const keys = [vehicle.plate, vehicle.code, vehicle.chassisNumber].map(value => this.normalizeVehicleDocumentKey(value));
        return vehicleKey && keys.some(key => key && key === vehicleKey);
      });

      return {
        id: document.id || Date.now(),
        entityType: 'vehicle',
        entityId: document.entityId || matchedVehicle?.id || 0,
        documentType: this.extractDocumentTypeFromPath(document),
        fileName: document.fileName,
        issueDate: document.issueDate,
        expiryDate: document.expiryDate,
        status: document.status ?? 'Active',
        url: document.url,
      };
    });
  }

  private async readSharePointList<T>(listName: string, fallback: T[]): Promise<T[]> {
    try {
      const items = await this.sharePointAdapter.getListItems(listName);
      if (Array.isArray(items) && items.length > 0) {
        return items as T[];
      }
    } catch (error) {
      console.warn('SharePoint read failed, falling back to mock data.', error);
    }
    return fallback;
  }

  async getSites(): Promise<Site[]> {
    const sitesFromSharePoint = await getSitesFlow(sites);
    if (integrationConfig.enableRealIntegrations && integrationConfig.powerAutomateFlows.getSites) {
      return sitesFromSharePoint;
    }
    return sitesFromSharePoint.length > 0 ? sitesFromSharePoint : sites;
  }

  async getEmployees(siteId?: number): Promise<Employee[]> {
    const employeesFromSharePoint = await getEmployeesFlow(siteId, this.employeeStore);
    const filtered = siteId ? employeesFromSharePoint.filter(e => e.siteId === siteId) : employeesFromSharePoint;
    if (integrationConfig.enableRealIntegrations && integrationConfig.powerAutomateFlows.getEmployees) {
      return filtered;
    }
    return filtered.length > 0 ? filtered : this.employeeStore.filter(e => (siteId ? e.siteId === siteId : true));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const employeesFromSharePoint = await this.readSharePointList<Employee>(integrationConfig.sharePointLists.employees, this.employeeStore);
    return employeesFromSharePoint.find(e => e.id === id) ?? this.employeeStore.find(e => e.id === id);
  }

  async getProjectStaff(siteId?: number): Promise<ProjectStaffMember[]> {
    const projectStaffFromSharePoint = await getProjectStaffFlow(siteId, projectStaff);
    return siteId ? projectStaffFromSharePoint.filter(person => person.id !== 0) : projectStaffFromSharePoint;
  }

  async getTrainingTopics(): Promise<TrainingTopic[]> {
    return getTrainingTopicsFlow(trainingTopics);
  }

  async getPpeCatalog(): Promise<PpeCatalogItem[]> {
    return getPpeCatalogFlow(ppeCatalog);
  }

  async getEquipmentCatalog(siteId?: number): Promise<EquipmentItem[]> {
    return siteId ? equipmentCatalog.filter(item => item.siteId === siteId) : equipmentCatalog;
  }

  async createEmployee(employee: Omit<Employee, 'id' | 'fullName'>): Promise<Employee> {
    const created: Employee = {
      ...employee,
      id: Math.max(...this.employeeStore.map(e => e.id)) + 1,
      fullName: `${employee.lastName} ${employee.firstName}`.trim(),
    };

    if (integrationConfig.enableRealIntegrations && !integrationConfig.powerAutomateFlows.createEmployee) {
      throw new Error('Missing VITE_POWERAUTOMATE_FLOW_CREATE_EMPLOYEE. Employee was not saved to SharePoint.');
    }

    const createdRemote = await createEmployeeFlow({
      ...employee,
      fullName: created.fullName,
      FullName: created.fullName,
    });

    if (integrationConfig.enableRealIntegrations && createdRemote.status === 'mock-fallback') {
      throw new Error('Create employee flow failed. Employee was not saved to SharePoint.');
    }

    if (createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      created.id = createdRemote.id;
    }

    this.employeeStore = [created, ...this.employeeStore];
    return created;
  }

  async getVehicles(siteId?: number): Promise<Vehicle[]> {
    const vehiclesFromSharePoint = await getVehiclesFlow(siteId, vehicles);
    const filtered = siteId ? vehiclesFromSharePoint.filter(v => v.siteId === siteId) : vehiclesFromSharePoint;
    if (integrationConfig.enableRealIntegrations && integrationConfig.powerAutomateFlows.getVehicles) {
      this.vehicleStore = vehiclesFromSharePoint;
      return filtered;
    }
    return filtered.length > 0 ? filtered : this.vehicleStore.filter(v => (siteId ? v.siteId === siteId : true));
  }

  async createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const created: Vehicle = {
      ...vehicle,
      id: Date.now(),
    };

    if (integrationConfig.enableRealIntegrations && !integrationConfig.powerAutomateFlows.createVehicle) {
      throw new Error('Missing VITE_POWERAUTOMATE_FLOW_CREATE_VEHICLE. Vehicle was not saved to SharePoint.');
    }

    const createdRemote = await this.sharePointAdapter.createListItem({
      listName: integrationConfig.sharePointLists.vehicles,
      item: vehicle,
    });

    if (integrationConfig.enableRealIntegrations && createdRemote.status === 'mock-fallback') {
      throw new Error('Create vehicle flow failed. Vehicle was not saved to SharePoint.');
    }

    if (createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      created.id = createdRemote.id;
    }

    this.vehicleStore = [created, ...this.vehicleStore];
    return created;
  }

  async updateVehicle(vehicle: Vehicle): Promise<Vehicle> {
    if (integrationConfig.enableRealIntegrations && !integrationConfig.powerAutomateFlows.updateVehicle) {
      throw new Error('Missing VITE_POWERAUTOMATE_FLOW_UPDATE_VEHICLE. Vehicle changes were not saved to SharePoint.');
    }

    const updatedRemote = await updateVehicleFlow(vehicle as unknown as Record<string, unknown>);

    if (integrationConfig.enableRealIntegrations && updatedRemote.status === 'mock-fallback') {
      throw new Error('Update vehicle flow failed. Vehicle changes were not saved to SharePoint.');
    }

    this.vehicleStore = this.vehicleStore.map(entry => entry.id === vehicle.id ? vehicle : entry);
    return vehicle;
  }

  async getTrainings(siteId?: number): Promise<TrainingSession[]> {
    const trainingsFromSharePoint = await this.readSharePointList<TrainingSession>(integrationConfig.sharePointLists.trainings, this.trainingStore);
    const resolved = trainingsFromSharePoint.length > 0 ? trainingsFromSharePoint : this.trainingStore;
    return siteId ? resolved.filter(t => t.siteId === siteId) : resolved;
  }

  async getDocuments(entityType?: EvidenceDocument['entityType'], entityId?: number): Promise<EvidenceDocument[]> {
    const flowDocuments: EvidenceDocument[] = [];

    if (!entityType || entityType === 'employee') {
      const employeeDocuments = await getEmployeeDocumentsFlow([]);
      const filteredEmployeeDocuments = employeeDocuments.filter(d => d.entityType === 'employee' && (!entityId || d.entityId === entityId));

      if (integrationConfig.enableRealIntegrations && integrationConfig.powerAutomateFlows.getEmployeeDocuments) {
        if (entityType === 'employee') {
          return filteredEmployeeDocuments;
        }
        flowDocuments.push(...filteredEmployeeDocuments);
      } else if (filteredEmployeeDocuments.length > 0) {
        flowDocuments.push(...filteredEmployeeDocuments);
      }
    }

    if (!entityType || entityType === 'vehicle') {
      const vehicleDocuments = this.attachVehicleDocumentEntities(await getVehicleDocumentsFlow([]));
      const filteredVehicleDocuments = vehicleDocuments.filter(d => d.entityType === 'vehicle' && (!entityId || d.entityId === entityId));

      if (integrationConfig.enableRealIntegrations && integrationConfig.powerAutomateFlows.getVehicleDocuments) {
        if (!entityType && flowDocuments.length > 0) {
          return [...flowDocuments, ...filteredVehicleDocuments];
        }
        return filteredVehicleDocuments;
      }

      if (filteredVehicleDocuments.length > 0) {
        flowDocuments.push(...filteredVehicleDocuments);
      }
    }

    if (!entityType && flowDocuments.length > 0) {
      return flowDocuments;
    }

    const documentsFromSharePoint = await this.readSharePointList<EvidenceDocument>(integrationConfig.sharePointLists.medical, documents as EvidenceDocument[]);
    const filtered = documentsFromSharePoint.filter(d => (!entityType || d.entityType === entityType) && (!entityId || d.entityId === entityId));
    return filtered.length > 0 ? filtered : documents.filter(d => (!entityType || d.entityType === entityType) && (!entityId || d.entityId === entityId));
  }

  async getPpeIssues(employeeId?: number): Promise<PpeIssue[]> {
    const ppeIssuesFromSharePoint = await this.readSharePointList<PpeIssue>(integrationConfig.sharePointLists.ppe, this.ppeIssueStore);
    // Το SharePoint δεν έχει ακόμα το pdfUrl (δεν το γράφουμε πίσω εκεί) — κρατάμε το τοπικά γνωστό link
    // ώστε να μη "χάνεται" αμέσως μετά τη δημιουργία του PDF.
    const merged = ppeIssuesFromSharePoint.length > 0
      ? ppeIssuesFromSharePoint.map(item => {
          const known = this.ppeIssueStore.find(entry => entry.id === item.id);
          return known?.pdfUrl && !item.pdfUrl ? { ...item, pdfUrl: known.pdfUrl } : item;
        })
      : this.ppeIssueStore;
    this.ppeIssueStore = merged;
    return employeeId ? merged.filter(p => p.employeeId === employeeId) : merged;
  }

  async getSpecialtyMatrix(): Promise<SpecialtyMatrixEntry[]> {
    return getSpecialtyMatrixFlow([]);
  }

  async createPpeIssue(input: { employeeId: number; employeeName: string; siteId: number; issuedById: number; issuedByName: string; ppeItemsSummary: string }): Promise<PpeIssue> {
    const created: PpeIssue = {
      id: Date.now(),
      employeeId: input.employeeId,
      siteId: input.siteId,
      issueDate: new Date().toISOString().slice(0, 10),
      issuedBy: input.issuedByName,
      status: 'Active',
      ppeItemsSummary: input.ppeItemsSummary,
    };

    const createdRemote = await createPpeIssueFlow({
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      siteId: input.siteId,
      issuedById: input.issuedById,
      issuedByName: input.issuedByName,
      issueDate: created.issueDate,
      status: created.status,
      ppeItemsSummary: created.ppeItemsSummary,
      flowType: 'create-ppe-issue',
    });
    if (createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      created.id = createdRemote.id;
    }

    this.ppeIssueStore = [created, ...this.ppeIssueStore];
    return created;
  }

  async attachPpeIssuePdf(ppeIssueId: number, pdfUrl: string): Promise<void> {
    this.ppeIssueStore = this.ppeIssueStore.map(issue => issue.id === ppeIssueId ? { ...issue, pdfUrl } : issue);
  }

  async cancelPpeIssue(ppeIssueId: number, cancelledBy: string): Promise<void> {
    const cancelledDate = new Date().toISOString();
    await cancelPpeIssueFlow(ppeIssueId, cancelledBy, cancelledDate);
    this.ppeIssueStore = this.ppeIssueStore.map(issue => issue.id === ppeIssueId ? { ...issue, status: 'Cancelled', cancelledBy, cancelledDate } : issue);
  }

  async getPpeAssignments(employeeId?: number): Promise<PpeAssignment[]> {
    const assignmentsFromSharePoint = await getPpeAssignmentsFlow(this.ppeAssignmentStore);
    this.ppeAssignmentStore = assignmentsFromSharePoint.length > 0 ? assignmentsFromSharePoint : this.ppeAssignmentStore;
    if (!employeeId) return this.ppeAssignmentStore;
    const issuanceIds = new Set(this.ppeIssueStore.filter(issue => issue.employeeId === employeeId).map(issue => issue.id));
    return this.ppeAssignmentStore.filter(assignment => issuanceIds.has(assignment.issuanceId));
  }

  async getMedicalCertificates(employeeId?: number): Promise<MedicalCertificate[]> {
    const fromSharePoint = await getMedicalCertificatesFlow(this.medicalCertificateStore);
    this.medicalCertificateStore = fromSharePoint.length > 0 ? fromSharePoint : this.medicalCertificateStore;
    if (!employeeId) return this.medicalCertificateStore;
    return this.medicalCertificateStore.filter(cert => cert.employeeId === employeeId);
  }

  async getEmployeeLicenses(employeeId?: number): Promise<EmployeeLicense[]> {
    const fromSharePoint = await getEmployeeLicensesFlow(this.employeeLicenseStore);
    this.employeeLicenseStore = fromSharePoint.length > 0 ? fromSharePoint : this.employeeLicenseStore;
    if (!employeeId) return this.employeeLicenseStore;
    return this.employeeLicenseStore.filter(license => license.employeeId === employeeId);
  }

  async createEmployeeLicense(input: { employeeId: number; employeeNo?: string; employeeName?: string; licenseType: string; licenseGrade?: string; licenseSpecialty?: string[]; licenseNo?: string; issueDate?: string; expiryDate?: string }, file?: File): Promise<EmployeeLicense> {
    const created: EmployeeLicense = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      employeeId: input.employeeId,
      licenseType: input.licenseType,
      licenseGrade: input.licenseGrade,
      licenseSpecialty: input.licenseSpecialty,
      licenseNo: input.licenseNo,
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,
      status: 'Active',
    };

    const createdRemote = await createEmployeeLicenseFlow(input);
    if (createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      created.id = createdRemote.id;
    }

    if (file && createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      await uploadLicenseEvidenceFlow(createdRemote.id, input.employeeNo, input.employeeName, file);
    }

    this.employeeLicenseStore = [created, ...this.employeeLicenseStore];
    return created;
  }

  async createPpeAssignment(input: { issuanceId: number; ppeCategory: string; ppeModel?: string; quantity: number; expiryDate?: string }): Promise<PpeAssignment> {
    const created: PpeAssignment = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      issuanceId: input.issuanceId,
      ppeCategory: input.ppeCategory,
      ppeModel: input.ppeModel,
      quantity: input.quantity,
      expiryDate: input.expiryDate,
      status: 'Active',
    };

    const createdRemote = await createPpeAssignmentFlow(input);
    if (createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      created.id = createdRemote.id;
    }

    this.ppeAssignmentStore = [created, ...this.ppeAssignmentStore];
    return created;
  }

  async updatePpeAssignmentStatus(ppeAssignmentId: number, status: PpeAssignmentStatus, changedBy: string): Promise<void> {
    const changedDate = new Date().toISOString();
    await updatePpeAssignmentStatusFlow(ppeAssignmentId, status, changedBy, changedDate);
    this.ppeAssignmentStore = this.ppeAssignmentStore.map(assignment =>
      assignment.id === ppeAssignmentId ? { ...assignment, status, cancelledBy: changedBy, cancelledDate: changedDate } : assignment
    );
  }

  async getInspections(siteId?: number): Promise<Inspection[]> {
    const raw = await getInspectionsFlow([]);
    const mapped: Inspection[] = raw.map((item) => ({
      id: item.id,
      title: item.title,
      siteId: item.siteId,
      inspectionDate: item.inspectionDate,
      inspectorId: item.inspectorId,
      latitude: item.latitude,
      longitude: item.longitude,
      overallHsFindings: item.overallHsFindings,
      overallEnvFindings: item.overallEnvFindings,
      overallSeverity: item.overallSeverity as Inspection['overallSeverity'],
      overallRecommendations: item.overallRecommendations,
      observations: item.observations,
    }));

    const resolved = mapped.length > 0 ? mapped : this.inspectionStore;
    this.inspectionStore = resolved;
    return siteId ? resolved.filter((i) => i.siteId === siteId) : resolved;
  }

  async createInspection(inspection: Omit<Inspection, 'id'>): Promise<Inspection> {
    const created: Inspection = { ...inspection, id: Date.now() };

    const createdRemote = await createInspectionFlow(inspection);
    if (createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      created.id = createdRemote.id;
    }

    this.inspectionStore = [created, ...this.inspectionStore];
    return created;
  }

  async uploadInspectionPhoto(file: File, folderPath: string) {
    return uploadInspectionPhotoFlow(file, folderPath);
  }

  async addInspectionPhoto(photo: Omit<InspectionPhoto, 'id'>): Promise<InspectionPhoto> {
    const created: InspectionPhoto = { ...photo, id: Date.now() };

    const createdRemote = await createInspectionPhotoFlow({
      inspectionId: photo.inspectionId,
      title: photo.title,
      photoUrl: photo.photoUrl ?? '',
      inspectorPhotoComment: photo.inspectorPhotoComment,
    });
    if (createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      created.id = createdRemote.id;
    }

    this.inspectionPhotoStore = [created, ...this.inspectionPhotoStore];
    return created;
  }

  async createTrainingRecord(payload: Record<string, unknown>) {
    const existingId = typeof payload.id === 'number' ? payload.id : undefined;
    const created: TrainingSession = {
      id: existingId ?? Math.max(...this.trainingStore.map(entry => entry.id)) + 1,
      title: String(payload.title ?? 'Training Draft'),
      date: String(payload.date ?? new Date().toISOString().slice(0, 10)),
      trainerName: String(payload.trainerName ?? 'Mock Trainer'),
      siteId: Number(payload.siteId ?? 2),
      participantIds: Array.isArray(payload.participantIds) ? payload.participantIds as number[] : [],
      status: (payload.status as TrainingSession['status']) ?? 'Draft',
      pdfUrl: typeof payload.pdfUrl === 'string' ? payload.pdfUrl : undefined,
    };

    const existingIndex = this.trainingStore.findIndex(entry => entry.id === created.id);
    if (existingIndex >= 0) {
      this.trainingStore[existingIndex] = created;
    } else {
      this.trainingStore = [created, ...this.trainingStore];
    }

    const createdRemote = await createTrainingFlow(payload);
    return { id: createdRemote.id ?? created.id, status: createdRemote.status === 'mock-fallback' ? 'mock-fallback' : 'created' };
  }

  async triggerTrainingPdf(input: { trainingSessionId: number; trainingTitle: string; trainerName: string; trainerSignature: string; participantsJson: string; pdfFileName: string }) {
    return this.flowAdapter.triggerTrainingPdf(input);
  }

  async generatePpeIssuePdf(input: { employeeId: number; employeeName: string; employeeNo?: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string; ppeItemsSummary?: string; ppeItemsHtml?: string; issuerSignatureBase64?: string; employeeSignatureBase64?: string; ppeIssueId?: number }) {
    return this.flowAdapter.generatePpeIssuePdf(input);
  }

  async generateEquipmentAssignmentPdf(input: { employeeId: number; employeeName: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string }) {
    return this.flowAdapter.generateEquipmentAssignmentPdf(input);
  }

  async uploadEvidence(file: File, folderPath: string) {
    return this.flowAdapter.uploadEvidence(file, folderPath);
  }

  async uploadEmployeeDocument(file: File, input: { employeeId: number; employeeName: string; documentType: string; issueDate?: string; expiryDate?: string; issuingAuthority?: string; mandatory?: boolean; aiWarnings?: string; notes?: string }) {
    return this.flowAdapter.uploadEmployeeDocument(file, input);
  }

  async extractDocumentText(file: File, options?: { documentType?: string; vehicleId?: number; vehiclePlate?: string }) {
    return this.ocrAdapter.extractText(file, options);
  }

  async captureSignature(payload: { signerName: string; documentId: string }) {
    return this.signatureAdapter.captureSignature(payload);
  }

  async generateQr(payload: string) {
    return this.qrAdapter.generateQr(payload);
  }
}

export const dataProvider: IDataProvider = new MockDataProvider();
