import { integrationConfig, isSharePointConfigured } from './integrationConfig';
import type { Employee, EvidenceDocument, PpeIssue, Site, TrainingSession, Vehicle } from '../types/models';

interface SharePointRecord extends Record<string, unknown> {}

function getValue(item: SharePointRecord, candidates: string[]): unknown {
  for (const candidate of candidates) {
    if (candidate in item && item[candidate] !== undefined && item[candidate] !== null) {
      return item[candidate];
    }
  }
  return undefined;
}

function toText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toStatus(value: unknown): Employee['status'] | Site['status'] | Vehicle['status'] | TrainingSession['status'] | EvidenceDocument['status'] | PpeIssue['status'] | undefined {
  const status = toText(value);
  if (status) {
    return status as Employee['status'];
  }
  return undefined;
}

function normalizeListName(listName: string): string {
  return listName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export class SharePointProvider {
  private readonly enabled: boolean;
  private readonly apiBaseUrl: string;
  private readonly accessToken?: string;

  constructor() {
    this.enabled = isSharePointConfigured();
    const configuredBaseUrl = integrationConfig.sharePointApiUrl || integrationConfig.sharePointSiteUrl;
    this.apiBaseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : '';
    this.accessToken = integrationConfig.sharePointAccessToken;
  }

  async createListItem(payload: { listName: string; item: Record<string, unknown> }) {
    if (!this.enabled || !this.apiBaseUrl) {
      return { id: Date.now(), status: 'mock-fallback' };
    }

    try {
      const targetListName = this.resolveListName(payload.listName);
      const endpoint = `${this.apiBaseUrl}/_api/web/lists/getbytitle('${encodeURIComponent(targetListName)}')/items`;
      const body = {
        ...payload.item,
        __metadata: {
          type: `SP.Data.${targetListName.replace(/[^A-Za-z0-9]/g, '')}ListItem`,
        },
      };
      const result = await this.request<{ d?: { ID?: number } }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { id: result?.d?.ID ?? Date.now(), status: 'connected' };
    } catch (error) {
      console.warn('SharePoint list item create failed, falling back to mock data.', error);
      return { id: Date.now(), status: 'mock-fallback' };
    }
  }

  async getListItems(listName: string) {
    if (!this.enabled || !this.apiBaseUrl) {
      return [];
    }

    try {
      const targetListName = this.resolveListName(listName);
      const endpoint = `${this.apiBaseUrl}/_api/web/lists/getbytitle('${encodeURIComponent(targetListName)}')/items?$orderby=Id desc`;
      const response = await this.request<{ d?: { results?: SharePointRecord[] } } | { value?: SharePointRecord[] } | { results?: SharePointRecord[] }>(endpoint);
      const items = this.extractItems(response);
      return items.map(item => this.mapListItem(targetListName, item));
    } catch (error) {
      console.warn('SharePoint list read failed, falling back to mock data.', error);
      return [];
    }
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    headers.set('Accept', 'application/json;odata=verbose');
    headers.set('Content-Type', 'application/json;odata=verbose');
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const response = await fetch(url, { ...init, headers, mode: 'cors' });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`SharePoint request failed (${response.status}): ${details}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  private extractItems(response: { d?: { results?: SharePointRecord[] } } | { value?: SharePointRecord[] } | { results?: SharePointRecord[] }): SharePointRecord[] {
    if ('value' in response && Array.isArray(response.value)) {
      return response.value;
    }
    if ('results' in response && Array.isArray(response.results)) {
      return response.results;
    }
    if ('d' in response && response.d && 'results' in response.d && Array.isArray(response.d.results)) {
      return response.d.results;
    }
    return [];
  }

  private resolveListName(listName: string): string {
    const normalized = normalizeListName(listName);
    const aliases: Record<string, string> = {
      employees: integrationConfig.sharePointLists.employees,
      projectstaff: integrationConfig.sharePointLists.projectStaff ?? 'ProjectStaff',
      contractors: integrationConfig.sharePointLists.contractors,
      sites: integrationConfig.sharePointLists.sites,
      trainings: integrationConfig.sharePointLists.trainings,
      trainingattendance: integrationConfig.sharePointLists.attendance,
      medicalcertificates: integrationConfig.sharePointLists.medical,
      employeelicenses: integrationConfig.sharePointLists.licenses,
      ppeissuances: integrationConfig.sharePointLists.ppe,
      vehicles: integrationConfig.sharePointLists.vehicles,
      equipment: integrationConfig.sharePointLists.equipment,
      assets: integrationConfig.sharePointLists.assets,
    };
    return aliases[normalized] ?? listName;
  }

  private mapListItem(listName: string, item: SharePointRecord): unknown {
    const normalized = normalizeListName(listName);

    if (normalized.includes('employee') || normalized.includes('projectstaff')) {
      return this.mapEmployee(item);
    }
    if (normalized.includes('site')) {
      return this.mapSite(item);
    }
    if (normalized.includes('vehicle')) {
      return this.mapVehicle(item);
    }
    if (normalized.includes('training')) {
      return this.mapTraining(item);
    }
    if (normalized.includes('medical') || normalized.includes('license')) {
      return this.mapDocument(item);
    }
    if (normalized.includes('ppe')) {
      return this.mapPpe(item);
    }
    if (normalized.includes('equipment')) {
      return {
        id: toNumber(getValue(item, ['Id', 'ID'])) ?? 0,
        name: toText(getValue(item, ['Name', 'Title', 'EquipmentName'])) ?? 'Equipment',
        status: toStatus(getValue(item, ['Status', 'StatusValue'])) ?? 'Active',
        siteId: toNumber(getValue(item, ['SiteId', 'Site_x0020_Id', 'SiteID'])) ?? 0,
      };
    }
    if (normalized.includes('contractor')) {
      return {
        id: toNumber(getValue(item, ['Id', 'ID'])) ?? 0,
        name: toText(getValue(item, ['Title', 'Name', 'ContractorName'])) ?? 'Contractor',
        status: toStatus(getValue(item, ['Status', 'StatusValue'])) ?? 'Active',
      };
    }

    return item;
  }

  private mapEmployee(item: SharePointRecord): Employee {
    const firstName = toText(getValue(item, ['FirstName', 'First_x0020_Name', 'GivenName', 'FirstNameValue'])) ?? '';
    const lastName = toText(getValue(item, ['LastName', 'Last_x0020_Name', 'Surname', 'LastNameValue'])) ?? '';
    const fullName = toText(getValue(item, ['FullName', 'Title', 'DisplayName', 'EmployeeName'])) ?? `${firstName} ${lastName}`.trim();

    return {
      id: toNumber(getValue(item, ['Id', 'ID', 'EmployeeId', 'Employee_x0020_Id'])) ?? 0,
      employeeNo: toText(getValue(item, ['EmployeeNo', 'EmployeeNumber', 'Employee_x0020_No', 'EmployeeID'])) ?? '',
      firstName,
      lastName,
      fullName,
      company: toText(getValue(item, ['Company', 'CompanyName', 'Employer'])) ?? 'Unknown',
      contractor: toText(getValue(item, ['Contractor', 'ContractorName', 'Subcontractor'])) ?? undefined,
      personType: (toText(getValue(item, ['PersonType', 'EmployeeType'])) as Employee['personType']) ?? 'DYKAT employee',
      position: toText(getValue(item, ['Position', 'JobTitle', 'Role'])) ?? '',
      siteId: toNumber(getValue(item, ['SiteId', 'Site_x0020_Id', 'SiteID'])) ?? 0,
      status: toStatus(getValue(item, ['Status', 'StatusValue'])) ?? 'Active',
      mobile: toText(getValue(item, ['Mobile', 'MobilePhone', 'Phone'])) ?? undefined,
      email: toText(getValue(item, ['Email', 'EMail', 'WorkEmail'])) ?? undefined,
      idOrTaxNo: toText(getValue(item, ['IdOrTaxNo', 'TaxNumber', 'TaxID', 'NationalID'])) ?? undefined,
      hireDate: toText(getValue(item, ['HireDate', 'StartDate', 'EmploymentDate'])) ?? undefined,
    };
  }

  private mapSite(item: SharePointRecord): Site {
    return {
      id: toNumber(getValue(item, ['Id', 'ID'])) ?? 0,
      name: toText(getValue(item, ['Name', 'Title', 'SiteName'])) ?? 'Site',
      phase: toText(getValue(item, ['Phase', 'Stage'])) ?? undefined,
      status: toStatus(getValue(item, ['Status', 'StatusValue'])) ?? 'Active',
      coordinates: toText(getValue(item, ['Coordinates', 'Location'])) ?? undefined,
    };
  }

  private mapVehicle(item: SharePointRecord): Vehicle {
    return {
      id: toNumber(getValue(item, ['Id', 'ID'])) ?? 0,
      code: toText(getValue(item, ['Code', 'VehicleCode'])) ?? '',
      plate: toText(getValue(item, ['Plate', 'RegistrationNumber'])) ?? '',
      type: toText(getValue(item, ['Type', 'VehicleType'])) ?? 'Vehicle',
      owner: toText(getValue(item, ['Owner', 'OwnerName'])) ?? 'Unknown',
      siteId: toNumber(getValue(item, ['SiteId', 'Site_x0020_Id', 'SiteID'])) ?? 0,
      status: toStatus(getValue(item, ['Status', 'StatusValue'])) ?? 'Active',
      insuranceExpiry: toText(getValue(item, ['InsuranceExpiry', 'InsuranceDate'])) ?? undefined,
      kteoExpiry: toText(getValue(item, ['KteoExpiry', 'KTEOExpiry'])) ?? undefined,
    };
  }

  private mapTraining(item: SharePointRecord): TrainingSession {
    return {
      id: toNumber(getValue(item, ['Id', 'ID'])) ?? 0,
      title: toText(getValue(item, ['Title', 'TrainingTitle', 'Name'])) ?? 'Training',
      date: toText(getValue(item, ['Date', 'TrainingDate', 'SessionDate'])) ?? '',
      trainerName: toText(getValue(item, ['TrainerName', 'Trainer'])) ?? '',
      siteId: toNumber(getValue(item, ['SiteId', 'Site_x0020_Id', 'SiteID'])) ?? 0,
      participantIds: [],
      status: toStatus(getValue(item, ['Status', 'StatusValue'])) ?? 'Pending',
      pdfUrl: toText(getValue(item, ['PdfUrl', 'PDFUrl'])) ?? undefined,
    };
  }

  private mapDocument(item: SharePointRecord): EvidenceDocument {
    return {
      id: toNumber(getValue(item, ['Id', 'ID'])) ?? 0,
      entityType: 'employee',
      entityId: toNumber(getValue(item, ['EmployeeId', 'Employee_x0020_Id', 'EntityId'])) ?? 0,
      documentType: toText(getValue(item, ['DocumentType', 'Title', 'CertificateType'])) ?? 'Document',
      issueDate: toText(getValue(item, ['IssueDate', 'IssuedDate'])) ?? undefined,
      expiryDate: toText(getValue(item, ['ExpiryDate', 'ValidTo'])) ?? undefined,
      status: toStatus(getValue(item, ['Status', 'StatusValue'])) ?? 'Active',
      url: toText(getValue(item, ['Url', 'FileRef'])) ?? undefined,
    };
  }

  private mapPpe(item: SharePointRecord): PpeIssue {
    return {
      id: toNumber(getValue(item, ['Id', 'ID'])) ?? 0,
      employeeId: toNumber(getValue(item, ['EmployeeId', 'Employee_x0020_Id'])) ?? 0,
      siteId: toNumber(getValue(item, ['SiteId', 'Site_x0020_Id', 'SiteID'])) ?? 0,
      issueDate: toText(getValue(item, ['IssueDate', 'IssuedDate'])) ?? '',
      issuedBy: toText(getValue(item, ['IssuedBy', 'IssuedByName'])) ?? '',
      status: toStatus(getValue(item, ['Status', 'StatusValue'])) ?? 'Pending',
    };
  }
}
