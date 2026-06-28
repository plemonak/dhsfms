import type { Employee, EvidenceDocument, PpeIssue, Site, TrainingSession, Vehicle } from '../types/models';
import { documents, employees, ppeIssues, sites, trainings, vehicles } from '../data/mockData';

export interface IDataProvider {
  getSites(): Promise<Site[]>;
  getEmployees(siteId?: number): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: Omit<Employee, 'id' | 'fullName'>): Promise<Employee>;
  getVehicles(siteId?: number): Promise<Vehicle[]>;
  getTrainings(siteId?: number): Promise<TrainingSession[]>;
  getDocuments(entityType?: EvidenceDocument['entityType'], entityId?: number): Promise<EvidenceDocument[]>;
  getPpeIssues(employeeId?: number): Promise<PpeIssue[]>;
}

export class MockDataProvider implements IDataProvider {
  private employeeStore = [...employees];

  async getSites(): Promise<Site[]> {
    return sites;
  }

  async getEmployees(siteId?: number): Promise<Employee[]> {
    return siteId ? this.employeeStore.filter(e => e.siteId === siteId) : this.employeeStore;
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employeeStore.find(e => e.id === id);
  }

  async createEmployee(employee: Omit<Employee, 'id' | 'fullName'>): Promise<Employee> {
    const created: Employee = {
      ...employee,
      id: Math.max(...this.employeeStore.map(e => e.id)) + 1,
      fullName: `${employee.lastName} ${employee.firstName}`.trim(),
    };
    this.employeeStore = [created, ...this.employeeStore];
    return created;
  }

  async getVehicles(siteId?: number): Promise<Vehicle[]> {
    return siteId ? vehicles.filter(v => v.siteId === siteId) : vehicles;
  }

  async getTrainings(siteId?: number): Promise<TrainingSession[]> {
    return siteId ? trainings.filter(t => t.siteId === siteId) : trainings;
  }

  async getDocuments(entityType?: EvidenceDocument['entityType'], entityId?: number): Promise<EvidenceDocument[]> {
    return documents.filter(d => (!entityType || d.entityType === entityType) && (!entityId || d.entityId === entityId));
  }

  async getPpeIssues(employeeId?: number): Promise<PpeIssue[]> {
    return employeeId ? ppeIssues.filter(p => p.employeeId === employeeId) : ppeIssues;
  }
}

export const dataProvider: IDataProvider = new MockDataProvider();
