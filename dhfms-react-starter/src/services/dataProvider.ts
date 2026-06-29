import type { Employee, EquipmentItem, EvidenceDocument, PpeCatalogItem, PpeIssue, ProjectStaffMember, Site, TrainingSession, TrainingTopic, Vehicle } from '../types/models';
import { documents, employees, equipmentCatalog, ppeCatalog, ppeIssues, projectStaff, sites, trainingTopics, trainings, vehicles } from '../data/mockData';
import { FlowAdapter, OcrAdapter, QrAdapter, SharePointAdapter, SignatureAdapter } from './integrationAdapters';
import { integrationConfig } from './integrationConfig';
import { createTrainingFlow, getEmployeesFlow, getPpeCatalogFlow, getProjectStaffFlow, getTrainingTopicsFlow, getVehiclesFlow } from './flowClient';

export interface IDataProvider {
  getSites(): Promise<Site[]>;
  getEmployees(siteId?: number): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getProjectStaff(siteId?: number): Promise<ProjectStaffMember[]>;
  getTrainingTopics(): Promise<TrainingTopic[]>;
  getPpeCatalog(): Promise<PpeCatalogItem[]>;
  getEquipmentCatalog(siteId?: number): Promise<EquipmentItem[]>;
  createEmployee(employee: Omit<Employee, 'id' | 'fullName'>): Promise<Employee>;
  getVehicles(siteId?: number): Promise<Vehicle[]>;
  getTrainings(siteId?: number): Promise<TrainingSession[]>;
  getDocuments(entityType?: EvidenceDocument['entityType'], entityId?: number): Promise<EvidenceDocument[]>;
  getPpeIssues(employeeId?: number): Promise<PpeIssue[]>;
  createTrainingRecord(payload: Record<string, unknown>): Promise<{ id?: number; status: string }>;
  triggerTrainingPdf(input: { trainingSessionId: number; trainingTitle: string; trainerName: string; trainerSignature: string; participantsJson: string; pdfFileName: string }): Promise<{ pdfUrl: string }>;
  generatePpeIssuePdf(input: { employeeId: number; employeeName: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string }): Promise<{ pdfUrl: string }>;
  generateEquipmentAssignmentPdf(input: { employeeId: number; employeeName: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string }): Promise<{ pdfUrl: string }>;
  extractDocumentText(file: File): Promise<{ text: string; confidence: number }>;
  captureSignature(payload: { signerName: string; documentId: string }): Promise<{ signatureUrl: string; status: 'pending' | 'completed' }>;
  generateQr(payload: string): Promise<{ qrUrl: string; payload: string }>;
}

export class MockDataProvider implements IDataProvider {
  private employeeStore = [...employees];
  private trainingStore = [...trainings];
  private sharePointAdapter = new SharePointAdapter();
  private flowAdapter = new FlowAdapter();
  private ocrAdapter = new OcrAdapter();
  private signatureAdapter = new SignatureAdapter();
  private qrAdapter = new QrAdapter();

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
    return this.readSharePointList<Site>(integrationConfig.sharePointLists.sites, sites);
  }

  async getEmployees(siteId?: number): Promise<Employee[]> {
    const employeesFromSharePoint = await getEmployeesFlow(siteId, this.employeeStore);
    const filtered = siteId ? employeesFromSharePoint.filter(e => e.siteId === siteId) : employeesFromSharePoint;
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

    const createdRemote = await this.sharePointAdapter.createListItem({
      listName: integrationConfig.sharePointLists.employees,
      item: {
        ...employee,
        FullName: created.fullName,
      },
    });

    if (createdRemote.status !== 'mock-fallback' && createdRemote.id) {
      created.id = createdRemote.id;
    }

    this.employeeStore = [created, ...this.employeeStore];
    return created;
  }

  async getVehicles(siteId?: number): Promise<Vehicle[]> {
    const vehiclesFromSharePoint = await getVehiclesFlow(siteId, vehicles);
    const filtered = siteId ? vehiclesFromSharePoint.filter(v => v.siteId === siteId) : vehiclesFromSharePoint;
    return filtered.length > 0 ? filtered : vehicles.filter(v => (siteId ? v.siteId === siteId : true));
  }

  async getTrainings(siteId?: number): Promise<TrainingSession[]> {
    const trainingsFromSharePoint = await this.readSharePointList<TrainingSession>(integrationConfig.sharePointLists.trainings, this.trainingStore);
    const resolved = trainingsFromSharePoint.length > 0 ? trainingsFromSharePoint : this.trainingStore;
    return siteId ? resolved.filter(t => t.siteId === siteId) : resolved;
  }

  async getDocuments(entityType?: EvidenceDocument['entityType'], entityId?: number): Promise<EvidenceDocument[]> {
    const documentsFromSharePoint = await this.readSharePointList<EvidenceDocument>(integrationConfig.sharePointLists.medical, documents as EvidenceDocument[]);
    const filtered = documentsFromSharePoint.filter(d => (!entityType || d.entityType === entityType) && (!entityId || d.entityId === entityId));
    return filtered.length > 0 ? filtered : documents.filter(d => (!entityType || d.entityType === entityType) && (!entityId || d.entityId === entityId));
  }

  async getPpeIssues(employeeId?: number): Promise<PpeIssue[]> {
    const ppeIssuesFromSharePoint = await this.readSharePointList<PpeIssue>(integrationConfig.sharePointLists.ppe, ppeIssues);
    return employeeId ? ppeIssuesFromSharePoint.filter(p => p.employeeId === employeeId) : ppeIssuesFromSharePoint;
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

  async generatePpeIssuePdf(input: { employeeId: number; employeeName: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string }) {
    return this.flowAdapter.generatePpeIssuePdf(input);
  }

  async generateEquipmentAssignmentPdf(input: { employeeId: number; employeeName: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string }) {
    return this.flowAdapter.generateEquipmentAssignmentPdf(input);
  }

  async extractDocumentText(file: File) {
    return this.ocrAdapter.extractText(file);
  }

  async captureSignature(payload: { signerName: string; documentId: string }) {
    return this.signatureAdapter.captureSignature(payload);
  }

  async generateQr(payload: string) {
    return this.qrAdapter.generateQr(payload);
  }
}

export const dataProvider: IDataProvider = new MockDataProvider();
