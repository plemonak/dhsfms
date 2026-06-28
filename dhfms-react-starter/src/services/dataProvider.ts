import type { Employee, EvidenceDocument, PpeIssue, Site, TrainingSession, Vehicle } from '../types/models';
import { documents, employees, ppeIssues, sites, trainings, vehicles } from '../data/mockData';
import { FlowAdapter, OcrAdapter, QrAdapter, SharePointAdapter, SignatureAdapter } from './integrationAdapters';
import { integrationConfig } from './integrationConfig';

export interface IDataProvider {
  getSites(): Promise<Site[]>;
  getEmployees(siteId?: number): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: Omit<Employee, 'id' | 'fullName'>): Promise<Employee>;
  getVehicles(siteId?: number): Promise<Vehicle[]>;
  getTrainings(siteId?: number): Promise<TrainingSession[]>;
  getDocuments(entityType?: EvidenceDocument['entityType'], entityId?: number): Promise<EvidenceDocument[]>;
  getPpeIssues(employeeId?: number): Promise<PpeIssue[]>;
  createTrainingRecord(payload: Record<string, unknown>): Promise<{ id?: number; status: string }>;
  triggerTrainingPdf(input: { trainingSessionId: number; trainingTitle: string; trainerName: string; trainerSignature: string; participantsJson: string; pdfFileName: string }): Promise<{ pdfUrl: string }>;
  extractDocumentText(file: File): Promise<{ text: string; confidence: number }>;
  captureSignature(payload: { signerName: string; documentId: string }): Promise<{ signatureUrl: string; status: 'pending' | 'completed' }>;
  generateQr(payload: string): Promise<{ qrUrl: string; payload: string }>;
}

export class MockDataProvider implements IDataProvider {
  private employeeStore = [...employees];
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
    const employeesFromSharePoint = await this.readSharePointList<Employee>(integrationConfig.sharePointLists.employees, this.employeeStore);
    const filtered = siteId ? employeesFromSharePoint.filter(e => e.siteId === siteId) : employeesFromSharePoint;
    return filtered.length > 0 ? filtered : this.employeeStore.filter(e => (siteId ? e.siteId === siteId : true));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const employeesFromSharePoint = await this.readSharePointList<Employee>(integrationConfig.sharePointLists.employees, this.employeeStore);
    return employeesFromSharePoint.find(e => e.id === id) ?? this.employeeStore.find(e => e.id === id);
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
    const vehiclesFromSharePoint = await this.readSharePointList<Vehicle>(integrationConfig.sharePointLists.vehicles, vehicles);
    return siteId ? vehiclesFromSharePoint.filter(v => v.siteId === siteId) : vehiclesFromSharePoint;
  }

  async getTrainings(siteId?: number): Promise<TrainingSession[]> {
    const trainingsFromSharePoint = await this.readSharePointList<TrainingSession>(integrationConfig.sharePointLists.trainings, trainings);
    return siteId ? trainingsFromSharePoint.filter(t => t.siteId === siteId) : trainingsFromSharePoint;
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
    return this.sharePointAdapter.createListItem({ listName: integrationConfig.sharePointLists.trainings, item: payload });
  }

  async triggerTrainingPdf(input: { trainingSessionId: number; trainingTitle: string; trainerName: string; trainerSignature: string; participantsJson: string; pdfFileName: string }) {
    return this.flowAdapter.triggerTrainingPdf(input);
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
