import { integrationConfig, isFlowConfigured } from './integrationConfig';
import type { Employee, EmployeeLicense, EvidenceDocument, MedicalCertificate, PpeAssignment, PpeCatalogItem, PpeIssue, ProjectStaffMember, SpecialtyMatrixEntry, Site, TrainingTopic, Vehicle } from '../types/models';

export interface GenerateTrainingPdfInput {
  trainingSessionId: number;
  trainingTitle: string;
  trainerName: string;
  trainerSignature: string;
  participantsJson: string;
  pdfFileName: string;
}

export interface GeneratePpeIssuePdfInput {
  employeeId: number;
  employeeName: string;
  employeeNo?: string;
  issueDate: string;
  issuedBy: string;
  siteName?: string;
  pdfFileName: string;
  ppeItemsSummary?: string;
  ppeItemsHtml?: string;
  issuerSignatureBase64?: string;
  employeeSignatureBase64?: string;
  ppeIssueId?: number;
}

export interface GenerateTrainingAttendancePdfInput {
  trainingSessionId: number;
  trainingTitle: string;
  trainingDate: string;
  trainerName: string;
  participantsJson: string;
  pdfFileName: string;
}
export interface CreateJsaSignOffInput {
  jsaTaskTitle: string;
  projectType?: string;
  constructionPhase?: string;
  workSite?: string;
  executionDate?: string;
  trainerEmail: string;
  trainerName: string;
  employees: Array<{ employeeNo: string; fullName: string }>;
}

export interface CreateJsaSignOffResult {
  signOffTitle: string;
  employeeCount: number;
  status: string;
}

export interface SubmitJsaSignatureInput {
  signOffTitle: string;
  signerEmail: string;
  signerRole: 'trainer' | 'employee';
  signatureImageBase64: string;
}

export interface SubmitJsaSignatureResult {
  signOffTitle: string;
  signerEmail: string;
  signerRole: string;
  allSigned: boolean;
  status: string;
}
export interface FlowResult {
  status: 'mock-fallback' | 'completed';
  message: string;
  url?: string;
  payload?: Record<string, unknown>;
}

const FLOW_TIMEOUT_MS = 45000;

function logMockFallback(operation: string, reason: string) {
  console.info(`[FlowClient][MockFallback] ${operation}: ${reason}`);
}

async function fetchFlow(endpoint: string, payload: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FLOW_TIMEOUT_MS);

  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function invokeFlow(endpoint: string | undefined, payload: Record<string, unknown>, fallbackUrl: string): Promise<FlowResult> {
  if (!isFlowConfigured() || !endpoint) {
    logMockFallback('invokeFlow', `Missing flow URL or integrations disabled for payload type: ${String(payload.flowType ?? 'unknown')}.`);
    return {
      status: 'mock-fallback',
      message: 'Power Automate flow URL not configured. Returning mock fallback.',
      url: fallbackUrl,
      payload,
    };
  }

  try {
    const response = await fetchFlow(endpoint, payload);

    if (!response.ok) {
      throw new Error(`Flow request failed with status ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    return {
      status: 'completed',
      message: 'Power Automate flow executed.',
      url: (data as { url?: string }).url ?? fallbackUrl,
      payload,
    };
  } catch (error) {
    logMockFallback('invokeFlow', 'Flow invocation failed. See warning for details.');
    console.warn('Power Automate flow invocation failed. Falling back to mock response.', error);
    return {
      status: 'mock-fallback',
      message: 'Power Automate flow invocation failed. Returning mock fallback.',
      url: fallbackUrl,
      payload,
    };
  }
}

async function invokeFlowData<T>(
  operation: string,
  endpoint: string | undefined,
  payload: Record<string, unknown>,
  fallback: T
): Promise<{ data: T; status: 'mock-fallback' | 'completed' }> {
  if (!isFlowConfigured() || !endpoint) {
    logMockFallback(operation, 'Missing flow URL or integrations disabled.');
    return { data: fallback, status: 'mock-fallback' };
  }

  try {
    const response = await fetchFlow(endpoint, payload);

    if (!response.ok) {
      throw new Error(`Flow request failed with status ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    if (Array.isArray(data)) {
      return { data: data as T, status: 'completed' };
    }
    if (data && typeof data === 'object') {
      const mapped = (data as { value?: T; items?: T }).value ?? (data as { value?: T; items?: T }).items;
      if (mapped !== undefined) {
        return { data: mapped, status: 'completed' };
      }
      return { data: data as T, status: 'completed' };
    }

    throw new Error('Flow response did not contain expected payload.');
  } catch (error) {
    logMockFallback(operation, 'Flow invocation failed. Using local mock data.');
    console.warn(`${operation} flow invocation failed. Falling back to mock data.`, error);
    return { data: fallback, status: 'mock-fallback' };
  }
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

export async function getEmployeesFlow(siteId: number | undefined, fallback: Employee[]): Promise<Employee[]> {
  const result = await invokeFlowData<Employee[]>(
    'getEmployees',
    integrationConfig.powerAutomateFlows.getEmployees,
    { siteId, flowType: 'get-employees' },
    fallback
  );

  function toDisplayText(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => toDisplayText(entry))
        .filter((entry): entry is string => Boolean(entry))
        .join(' / ');
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const lookupValue = record.Value ?? record.Title ?? record.Name ?? record.DisplayName;
      return lookupValue === undefined || lookupValue === null ? undefined : String(lookupValue);
    }

    return String(value);
  }

  return result.data.map((employee) => {
    const raw = employee as Employee & Record<string, unknown>;

    const firstName = toDisplayText(raw.firstName) ?? '';
    const lastName = toDisplayText(raw.lastName) ?? '';
    const fullName =
      toDisplayText(raw.fullName) ??
      `${lastName} ${firstName}`.trim();

    const company = toDisplayText(raw.company) ?? 'DYKAT';
    const contractor = toDisplayText(raw.contractor);

    return {
      ...employee,
      id: Number(raw.id ?? raw.ID ?? 0),
      employeeNo: toDisplayText(raw.employeeNo) ?? '',
      firstName,
      lastName,
      fullName,
      position: toDisplayText(raw.position) ?? '',
      status: (toDisplayText(raw.status) ?? 'Active') as Employee['status'],
      email: toDisplayText(raw.email),
      mobile: toDisplayText(raw.mobile),
      idOrTaxNo: toDisplayText(raw.idOrTaxNo ?? raw.IDOrPassport ?? raw.IdentityDocumentNo),
      taxNumber: toDisplayText(raw.taxNumber ?? raw.TaxNumber ?? raw.AFM),
      fatherName: toDisplayText(raw.fatherName ?? raw.FatherName),
      birthDate: toDisplayText(raw.birthDate ?? raw.BirthDate),
      gender: toDisplayText(raw.gender ?? raw.Gender),
      nationality: toDisplayText(raw.nationality ?? raw.Nationality),
      identityDocumentType: toDisplayText(raw.identityDocumentType ?? raw.IdentityDocumentType) as Employee['identityDocumentType'],
      identityDocumentNo: toDisplayText(raw.identityDocumentNo ?? raw.IdentityDocumentNo ?? raw.IDOrPassport),
      identityIssuingAuthority: toDisplayText(raw.identityIssuingAuthority ?? raw.IdentityIssuingAuthority),
      identityExpiryDate: toDisplayText(raw.identityExpiryDate ?? raw.IdentityExpiryDate),
      hireDate: toDisplayText(raw.hireDate ?? raw.HireDate),
      company,
      contractor: contractor ?? (company !== 'DYKAT' ? company : undefined),
      siteId: employee.siteId ?? siteId ?? 2,
      personType:
        employee.personType ??
        (company !== 'DYKAT' ? 'Subcontractor' : 'DYKAT employee'),
    };
  });
}

export async function getSitesFlow(fallback: Site[]): Promise<Site[]> {
  const result = await invokeFlowData<Site[]>(
    'getSites',
    integrationConfig.powerAutomateFlows.getSites,
    { flowType: 'get-sites' },
    fallback
  );

  function toDisplayText(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => toDisplayText(entry))
        .filter((entry): entry is string => Boolean(entry))
        .join(' / ');
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const lookupValue = record.Value ?? record.Title ?? record.Name ?? record.DisplayName;
      return lookupValue === undefined || lookupValue === null ? undefined : String(lookupValue);
    }

    return String(value);
  }

  return result.data.map((site) => {
    const raw = site as Site & Record<string, unknown>;

    return {
      ...site,
      id: Number(raw.id ?? raw.ID ?? 0),
      name: toDisplayText(raw.name ?? raw.Name ?? raw.Title ?? raw.SiteName ?? raw.siteName) ?? 'Site',
      phase: toDisplayText(raw.phase ?? raw.Phase),
      status: (toDisplayText(raw.status ?? raw.Status) ?? 'Active') as Site['status'],
      coordinates: toDisplayText(raw.coordinates ?? raw.Coordinates),
    };
  });
}


export async function getVehiclesFlow(siteId: number | undefined, fallback: Vehicle[]): Promise<Vehicle[]> {
  const result = await invokeFlowData<Vehicle[]>(
    'getVehicles',
    integrationConfig.powerAutomateFlows.getVehicles,
    { siteId, flowType: 'get-vehicles' },
    fallback
  );

  function toDisplayText(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => toDisplayText(entry))
        .filter((entry): entry is string => Boolean(entry))
        .join(' / ');
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const lookupValue = record.Value ?? record.Title ?? record.Name ?? record.DisplayName;
      return lookupValue === undefined || lookupValue === null ? undefined : String(lookupValue);
    }

    return String(value);
  }

  return result.data.map((vehicle) => {
    const raw = vehicle as Vehicle & Record<string, unknown>;

    return {
      ...vehicle,
      id: Number(raw.id ?? raw.ID ?? 0),
      code: toDisplayText(raw.code) ?? '',
      plate: toDisplayText(raw.plate) ?? '',
      type: toDisplayText(raw.type) ?? 'Vehicle',
      chassisNumber: toDisplayText(raw.chassisNumber ?? raw.ChassisNumber ?? raw.VIN),
      manufacturer: toDisplayText(raw.manufacturer ?? raw.Manufacturer ?? raw.Make),
      model: toDisplayText(raw.model ?? raw.Model),
      owner: toDisplayText(raw.owner) ?? 'Unknown',
      siteId: Number(raw.siteId ?? siteId ?? 2),
      status: (toDisplayText(raw.status) ?? 'Active') as Vehicle['status'],
      isImmobilized: Boolean(raw.isImmobilized ?? raw.IsImmobilized ?? raw.Immobilized),
      insuranceExpiry: toDisplayText(raw.insuranceExpiry ?? raw.InsuranceExpiry),
      kteoExpiry: toDisplayText(raw.kteoExpiry ?? raw.KteoExpiry ?? raw.KTEOExpiry),
      emissionsCardExpiry: toDisplayText(raw.emissionsCardExpiry ?? raw.EmissionsCardExpiry),
      liftingCertificateExpiry: toDisplayText(raw.liftingCertificateExpiry ?? raw.LiftingCertificateExpiry),
    };
  });
}

export async function getVehicleDocumentsFlow(fallback: EvidenceDocument[] = []): Promise<Array<EvidenceDocument & Record<string, unknown>>> {
  const result = await invokeFlowData<Array<EvidenceDocument & Record<string, unknown>>>(
    'getVehicleDocuments',
    integrationConfig.powerAutomateFlows.getVehicleDocuments,
    { flowType: 'get-vehicle-documents' },
    fallback as Array<EvidenceDocument & Record<string, unknown>>
  );

  function toDisplayText(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const lookupValue = record.Value ?? record.Title ?? record.Name ?? record.DisplayName;
      return lookupValue === undefined || lookupValue === null ? undefined : String(lookupValue);
    }

    return String(value);
  }

  return result.data.map((document) => {
    const raw = document as EvidenceDocument & Record<string, unknown>;
    const title = toDisplayText(raw.title ?? raw.Title ?? raw.documentType) ?? 'Vehicle document';

    return {
      ...document,
      id: Number(raw.id ?? raw.ID ?? raw.itemId ?? 0),
      entityType: 'vehicle',
      entityId: Number(raw.entityId ?? raw.vehicleId ?? raw.VehicleId ?? 0),
      documentType: toDisplayText(raw.documentType ?? raw.DocumentType ?? raw.category ?? raw.Category) ?? title,
      fileName: toDisplayText(raw.fileName ?? raw.FileName ?? raw.attachmentName ?? raw.AttachmentName),
      issueDate: toDisplayText(raw.issueDate ?? raw.IssueDate),
      expiryDate: toDisplayText(raw.expiryDate ?? raw.ExpiryDate),
      status: (toDisplayText(raw.status ?? raw.Status) ?? 'Active') as EvidenceDocument['status'],
      url: toDisplayText(raw.url ?? raw.Url ?? raw.link ?? raw.Link ?? raw.itemUrl ?? raw.ItemUrl),
      title,
      folderPath: toDisplayText(raw.folderPath ?? raw.FolderPath ?? title),
      vehicleKey: toDisplayText(raw.vehicleKey ?? raw.VehicleKey),
    };
  });
}

export async function getEmployeeDocumentsFlow(fallback: EvidenceDocument[] = []): Promise<Array<EvidenceDocument & Record<string, unknown>>> {
  const result = await invokeFlowData<Array<EvidenceDocument & Record<string, unknown>>>(
    'getEmployeeDocuments',
    integrationConfig.powerAutomateFlows.getEmployeeDocuments,
    { flowType: 'get-employee-documents' },
    fallback as Array<EvidenceDocument & Record<string, unknown>>
  );

  function toDisplayText(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const lookupValue = record.Value ?? record.Title ?? record.Name ?? record.DisplayName;
      return lookupValue === undefined || lookupValue === null ? undefined : String(lookupValue);
    }

    return String(value);
  }

  return result.data.map((document) => {
    const raw = document as EvidenceDocument & Record<string, unknown>;
    const employeeValue = raw.employeeId ?? raw.EmployeeId ?? raw.EmployeeID ?? raw.Employee;
    const employeeId = typeof employeeValue === 'object' && employeeValue
      ? Number((employeeValue as Record<string, unknown>).Id ?? (employeeValue as Record<string, unknown>).ID ?? 0)
      : Number(employeeValue ?? 0);

    return {
      ...document,
      id: Number(raw.id ?? raw.ID ?? raw.itemId ?? 0),
      entityType: 'employee',
      entityId: employeeId,
      documentType: toDisplayText(raw.documentType ?? raw.DocumentType ?? raw.EmployeeDocumentType ?? raw.Employee_x0020_Document_x0020_Type) ?? 'Έγγραφο εργαζομένου',
      fileName: toDisplayText(raw.fileName ?? raw.FileName ?? raw.attachmentName ?? raw.AttachmentName),
      issueDate: toDisplayText(raw.issueDate ?? raw.IssueDate ?? raw.Issue_x0020_Date),
      expiryDate: toDisplayText(raw.expiryDate ?? raw.ExpiryDate ?? raw.Expiry_x0020_Date),
      status: (toDisplayText(raw.status ?? raw.Status ?? raw.EmployeeDocumentStatus ?? raw.Employee_x0020_Document_x0020_Status) ?? 'Active') as EvidenceDocument['status'],
      url: toDisplayText(raw.url ?? raw.Url ?? raw.link ?? raw.Link ?? raw.itemUrl ?? raw.ItemUrl),
    };
  });
}


export async function getProjectStaffFlow(siteId: number | undefined, fallback: ProjectStaffMember[]): Promise<ProjectStaffMember[]> {
  const result = await invokeFlowData<ProjectStaffMember[]>(
    'getProjectStaff',
    integrationConfig.powerAutomateFlows.getProjectStaff,
    { siteId, flowType: 'get-project-staff' },
    fallback
  );

  function toDisplayText(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const lookupValue = record.Value ?? record.Title ?? record.Name ?? record.DisplayName;
      return lookupValue === undefined || lookupValue === null ? undefined : String(lookupValue);
    }
    return String(value);
  }

  return result.data.map((staff) => {
    const raw = staff as ProjectStaffMember & Record<string, unknown>;
    return {
      ...staff,
      id: Number(raw.id ?? raw.ID ?? 0),
      displayName: toDisplayText(raw.displayName ?? raw.DisplayName ?? raw.Title ?? raw.FullName) ?? 'Στέλεχος',
      title: toDisplayText(raw.title ?? raw.Title),
      responsibleName: toDisplayText(raw.responsibleName ?? raw.ResponsibleName),
      email: toDisplayText(raw.email ?? raw.Email),
    };
  });
}

export async function getTrainingTopicsFlow(fallback: TrainingTopic[]): Promise<TrainingTopic[]> {
  const result = await invokeFlowData<TrainingTopic[]>(
    'getTrainingTopics',
    integrationConfig.powerAutomateFlows.getTrainingTopics,
    { flowType: 'get-training-topics' },
    fallback
  );
  return result.data;
}

export async function getPpeCatalogFlow(fallback: PpeCatalogItem[]): Promise<PpeCatalogItem[]> {
  const result = await invokeFlowData<PpeCatalogItem[]>(
    'getPpeCatalog',
    integrationConfig.powerAutomateFlows.getPpeCatalog,
    { flowType: 'get-ppe-catalog' },
    fallback
  );
  return result.data;
}

export async function createEmployeeFlow(payload: Record<string, unknown>): Promise<{ id?: number; status: string }> {
  const enrichedPayload = {
    ...payload,
    Title: payload.fullName ?? `${payload.lastName ?? ''} ${payload.firstName ?? ''}`.trim(),
    FullName: payload.fullName ?? `${payload.lastName ?? ''} ${payload.firstName ?? ''}`.trim(),
    FirstName: payload.firstName,
    LastName: payload.lastName,
    EmployeeNo: payload.employeeNo,
    Position: payload.position,
    Company: payload.company,
    Contractor: payload.company,
    PersonType: payload.personType,
    Mobile: payload.mobile,
    Email: payload.email,
    TaxNumber: payload.taxNumber,
    AFM: payload.taxNumber,
    IdentityDocumentNo: payload.identityDocumentNo ?? payload.idOrTaxNo,
    IDOrPassport: payload.idOrTaxNo,
    FatherName: payload.fatherName,
    BirthDate: payload.birthDate,
    Gender: payload.gender,
    Nationality: payload.nationality,
    IdentityDocumentType: payload.identityDocumentType,
    IdentityIssuingAuthority: payload.identityIssuingAuthority,
    IdentityExpiryDate: payload.identityExpiryDate,
    HireDate: payload.hireDate,
    Status: payload.status,
    SiteId: payload.siteId,
  };

  const result = await invokeFlowData<Record<string, unknown>>(
    'createEmployee',
    integrationConfig.powerAutomateFlows.createEmployee,
    { ...enrichedPayload, flowType: 'create-employee' },
    enrichedPayload
  );
  const rawId = result.data.id ?? result.data.ID ?? result.data.itemId;
  const responseId = typeof rawId === 'number' ? rawId : Number.isFinite(Number(rawId)) ? Number(rawId) : undefined;
  return { id: responseId, status: result.status };
}

export async function createVehicleFlow(payload: Record<string, unknown>): Promise<{ id?: number; status: string }> {
  const enrichedPayload = {
    ...payload,
    Title: payload.plate ?? payload.code,
    VehicleID: payload.code,
    RegistrationNumber: payload.plate,
    VIN: payload.chassisNumber,
    ChassisNumber: payload.chassisNumber,
    Make: payload.manufacturer,
    Manufacturer: payload.manufacturer,
    Model: payload.model,
    VehicleType: payload.type,
    OwnershipStatus: payload.owner,
    Status: payload.status,
    IsImmobilized: payload.isImmobilized,
    InsuranceExpiry: payload.insuranceExpiry,
    KTEOExpiry: payload.kteoExpiry,
    EmissionsCardExpiry: payload.emissionsCardExpiry,
    LiftingCertificateExpiry: payload.liftingCertificateExpiry,
    SiteId: payload.siteId,
  };

  const result = await invokeFlowData<Record<string, unknown>>(
    'createVehicle',
    integrationConfig.powerAutomateFlows.createVehicle,
    { ...enrichedPayload, flowType: 'create-vehicle' },
    enrichedPayload
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}

export async function updateVehicleFlow(payload: Record<string, unknown>): Promise<{ id?: number; status: string }> {
  const enrichedPayload = {
    ...payload,
    ID: payload.id,
    Title: payload.plate ?? payload.code,
    VehicleID: payload.code,
    RegistrationNumber: payload.plate,
    VIN: payload.chassisNumber,
    ChassisNumber: payload.chassisNumber,
    Make: payload.manufacturer,
    Manufacturer: payload.manufacturer,
    Model: payload.model,
    VehicleType: payload.type,
    OwnershipStatus: payload.owner,
    Status: payload.status,
    IsImmobilized: payload.isImmobilized,
    SiteId: payload.siteId,
  };

  const result = await invokeFlowData<Record<string, unknown>>(
    'updateVehicle',
    integrationConfig.powerAutomateFlows.updateVehicle,
    { ...enrichedPayload, flowType: 'update-vehicle' },
    enrichedPayload
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}

export async function createTrainingFlow(payload: Record<string, unknown>): Promise<{ id?: number; status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'createTraining',
    integrationConfig.powerAutomateFlows.createTraining,
    { ...payload, flowType: 'create-training' },
    payload
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}

export async function createPpeIssueFlow(payload: Record<string, unknown>): Promise<{ id?: number; status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'createPpeIssue',
    integrationConfig.powerAutomateFlows.createPpeIssue,
    { ...payload, flowType: 'create-ppe-issue' },
    payload
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}

// Δεν κάνουμε hard delete των χορηγήσεων ΜΑΠ (χρειάζεται audit trail για επιθεωρήσεις ασφαλείας) —
// σημειώνουμε τη χορήγηση ως 'Cancelled' στο SharePoint.
export async function cancelPpeIssueFlow(ppeIssueId: number, cancelledBy: string, cancelledDate: string): Promise<{ status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'cancelPpeIssue',
    integrationConfig.powerAutomateFlows.cancelPpeIssue,
    { ppeIssueId, cancelledBy, cancelledDate, flowType: 'cancel-ppe-issue' },
    { id: ppeIssueId, status: 'mock-fallback' }
  );
  return { status: result.status };
}

export async function getPpeIssuesFlow(fallback: PpeIssue[]): Promise<PpeIssue[]> {
  const result = await invokeFlowData<Array<Record<string, unknown>>>(
    'getPpeIssues',
    integrationConfig.powerAutomateFlows.getPpeIssues,
    { flowType: 'get-ppe-issues' },
    fallback as unknown as Array<Record<string, unknown>>
  );

  function lookupId(value: unknown): number {
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return Number(record.Id ?? 0);
    }
    return Number(value ?? 0);
  }

  function lookupText(value: unknown): string {
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return String(record.Value ?? record.Title ?? '');
    }
    return String(value ?? '');
  }

  return result.data.map((raw) => ({
    id: Number(raw.id ?? raw.ID ?? 0),
    employeeId: lookupId(raw.employeeId ?? raw.EmployeeId ?? raw.Employee),
    siteId: lookupId(raw.siteId ?? raw.SiteId ?? raw.Site),
    issueDate: String(raw.issueDate ?? raw.IssueDate ?? ''),
    issuedBy: lookupText(raw.issuedBy ?? raw.IssuedBy) || String(raw.issuedBy ?? raw.IssuedBy ?? ''),
    status: (String(raw.status ?? raw.Status ?? 'Active') as PpeIssue['status']),
    ppeItemsSummary: raw.ppeItemsSummary !== undefined || raw.PPEItemsSummary !== undefined ? String(raw.ppeItemsSummary ?? raw.PPEItemsSummary) : undefined,
    pdfUrl: raw.pdfUrl !== undefined || raw.SignedFormLinkLong !== undefined ? String(raw.pdfUrl ?? raw.SignedFormLinkLong) || undefined : undefined,
  }));
}

export async function getPpeAssignmentsFlow(fallback: PpeAssignment[]): Promise<PpeAssignment[]> {
  const result = await invokeFlowData<Array<Record<string, unknown>>>(
    'getPpeAssignments',
    integrationConfig.powerAutomateFlows.getPpeAssignments,
    { flowType: 'get-ppe-assignments' },
    fallback as unknown as Array<Record<string, unknown>>
  );

  function toId(value: unknown): number {
    if (value && typeof value === 'object') {
      return Number((value as Record<string, unknown>).Id ?? 0);
    }
    return Number(value ?? 0);
  }

  function toText(value: unknown): string {
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return String(record.Value ?? record.Title ?? '');
    }
    return String(value ?? '');
  }

  return result.data.map((raw) => ({
    id: Number(raw.id ?? raw.ID ?? 0),
    issuanceId: toId(raw.issuanceId ?? raw.IssuanceId ?? raw.Issuance),
    ppeCategory: toText(raw.ppeCategory ?? raw.PPECategory),
    ppeModel: raw.ppeModel !== undefined || raw.PPEModel !== undefined ? String(raw.ppeModel ?? raw.PPEModel) || undefined : undefined,
    quantity: Number(raw.quantity ?? raw.Quantity ?? 1),
    expiryDate: raw.expiryDate !== undefined || raw.ExpiryDate !== undefined ? String(raw.expiryDate ?? raw.ExpiryDate) || undefined : undefined,
    replacementDate: raw.replacementDate !== undefined || raw.ReplacementDate !== undefined ? String(raw.replacementDate ?? raw.ReplacementDate) || undefined : undefined,
    returnDate: raw.returnDate !== undefined || raw.ReturnDate !== undefined ? String(raw.returnDate ?? raw.ReturnDate) || undefined : undefined,
    equipmentId: raw.equipmentId !== undefined || raw.EquipmentID !== undefined ? String(raw.equipmentId ?? raw.EquipmentID) || undefined : undefined,
    standardAtIssuance: raw.standardAtIssuance !== undefined || raw.StandardAtIssuance !== undefined ? String(raw.standardAtIssuance ?? raw.StandardAtIssuance) || undefined : undefined,
    status: (toText(raw.status ?? raw.Status) || 'Active') as PpeAssignment['status'],
  }));
}

export interface CreatePpeAssignmentInput {
  issuanceId: number;
  ppeCategory: string;
  ppeModel?: string;
  quantity: number;
  expiryDate?: string;
  standardAtIssuance?: string;
}

export async function createPpeAssignmentFlow(input: CreatePpeAssignmentInput): Promise<{ id?: number; status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'createPpeAssignment',
    integrationConfig.powerAutomateFlows.createPpeAssignment,
    { ...input, status: 'Active', flowType: 'create-ppe-assignment' },
    { ...input, status: 'mock-fallback' }
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}

export async function updatePpeAssignmentStatusFlow(ppeAssignmentId: number, newStatus: string, changedBy: string, changedDate: string): Promise<{ status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'updatePpeAssignmentStatus',
    integrationConfig.powerAutomateFlows.cancelPpeAssignment,
    { ppeAssignmentId, status: newStatus, cancelledBy: changedBy, cancelledDate: changedDate, flowType: 'update-ppe-assignment-status' },
    { ppeAssignmentId, status: 'mock-fallback' }
  );
  return { status: result.status };
}

function toLookupId(value: unknown): number {
  if (value && typeof value === 'object') {
    return Number((value as Record<string, unknown>).Id ?? 0);
  }
  return Number(value ?? 0);
}

function toChoiceText(value: unknown): string {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.Value ?? record.Title ?? '');
  }
  return String(value ?? '');
}

export async function getMedicalCertificatesFlow(fallback: MedicalCertificate[]): Promise<MedicalCertificate[]> {
  const result = await invokeFlowData<Array<Record<string, unknown>>>(
    'getMedicalCertificates',
    integrationConfig.powerAutomateFlows.getMedicalCertificates,
    { flowType: 'get-medical-certificates' },
    fallback as unknown as Array<Record<string, unknown>>
  );
  return result.data.map((raw) => ({
    id: Number(raw.id ?? raw.ID ?? 0),
    employeeId: toLookupId(raw.employeeId ?? raw.Employee),
    certificateType: toChoiceText(raw.certificateType ?? raw.CertificateType),
    issueDate: raw.issueDate !== undefined || raw.IssueDate !== undefined ? String(raw.issueDate ?? raw.IssueDate) || undefined : undefined,
    expiryDate: raw.expiryDate !== undefined || raw.ExpiryDate !== undefined ? String(raw.expiryDate ?? raw.ExpiryDate) || undefined : undefined,
    occupationalDoctor: raw.occupationalDoctor !== undefined || raw.OccupationalDoctor !== undefined ? String(raw.occupationalDoctor ?? raw.OccupationalDoctor) || undefined : undefined,
    restrictions: raw.restrictions !== undefined || raw.Restrictions !== undefined ? String(raw.restrictions ?? raw.Restrictions) || undefined : undefined,
    status: toChoiceText(raw.status ?? raw.Status) || 'Active',
  }));
}

export interface CreateMedicalCertificateInput {
  employeeId: number;
  employeeNo?: string;
  employeeName?: string;
  certificateType: string;
  occupationalDoctor?: string;
  issueDate?: string;
  expiryDate?: string;
  restrictions?: string;
}

export async function createMedicalCertificateFlow(input: CreateMedicalCertificateInput): Promise<{ id?: number; status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'createMedicalCertificate',
    integrationConfig.powerAutomateFlows.createMedicalCertificate,
    { ...input, flowType: 'create-medical-certificate' },
    { ...input, status: 'mock-fallback' }
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}

export async function uploadMedicalEvidenceFlow(certificateId: number, employeeNo: string | undefined, employeeName: string | undefined, file: File): Promise<{ status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'uploadMedicalEvidence',
    integrationConfig.powerAutomateFlows.uploadMedicalEvidence,
    {
      certificateId,
      employeeNo,
      employeeName,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileContentBase64: await fileToBase64(file),
      flowType: 'upload-medical-evidence',
    },
    { certificateId, status: 'mock-fallback' }
  );
  return { status: result.status };
}

// Δεν κάνουμε hard delete των ιατρικών πιστοποιητικών, ίδιος λόγος με τις άδειες.
export async function cancelMedicalCertificateFlow(certificateId: number, cancelledBy: string, cancelledDate: string): Promise<{ status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'cancelMedicalCertificate',
    integrationConfig.powerAutomateFlows.cancelMedicalCertificate,
    { certificateId, cancelledBy, cancelledDate, flowType: 'cancel-medical-certificate' },
    { certificateId, status: 'mock-fallback' }
  );
  return { status: result.status };
}

export async function getEmployeeLicensesFlow(fallback: EmployeeLicense[]): Promise<EmployeeLicense[]> {
  const result = await invokeFlowData<Array<Record<string, unknown>>>(
    'getEmployeeLicenses',
    integrationConfig.powerAutomateFlows.getEmployeeLicenses,
    { flowType: 'get-employee-licenses' },
    fallback as unknown as Array<Record<string, unknown>>
  );

  function toHyperlinkUrl(value: unknown): string | undefined {
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const url = record.Url ?? record.Description;
      return typeof url === 'string' && url.length > 0 ? url : undefined;
    }
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  function toChoiceArray(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
      const items = value.map(entry => toChoiceText(entry)).filter(Boolean);
      return items.length > 0 ? items : undefined;
    }
    const text = toChoiceText(value);
    return text ? [text] : undefined;
  }

  return result.data.map((raw) => ({
    id: Number(raw.id ?? raw.ID ?? 0),
    employeeId: toLookupId(raw.employeeId ?? raw.Employee),
    licenseType: toChoiceText(raw.licenseType ?? raw.LicenseType),
    licenseGrade: toChoiceText(raw.licenseGrade ?? raw.LicenseGrade) || undefined,
    licenseSpecialty: toChoiceArray(raw.licenseSpecialty ?? raw.LicenseSpecialty),
    licenseNo: raw.licenseNo !== undefined || raw.LicenseNo !== undefined ? String(raw.licenseNo ?? raw.LicenseNo) || undefined : undefined,
    issueDate: raw.issueDate !== undefined || raw.IssueDate !== undefined ? String(raw.issueDate ?? raw.IssueDate) || undefined : undefined,
    expiryDate: raw.expiryDate !== undefined || raw.ExpiryDate !== undefined ? String(raw.expiryDate ?? raw.ExpiryDate) || undefined : undefined,
    evidenceUrl: toHyperlinkUrl(raw.evidence ?? raw.Evidence),
    status: toChoiceText(raw.status ?? raw.Status) || 'Active',
  }));
}

export interface CreateEmployeeLicenseInput {
  employeeId: number;
  employeeNo?: string;
  employeeName?: string;
  licenseType: string;
  licenseGrade?: string;
  licenseSpecialty?: string[];
  licenseNo?: string;
  issueDate?: string;
  expiryDate?: string;
}

export async function createEmployeeLicenseFlow(input: CreateEmployeeLicenseInput): Promise<{ id?: number; status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'createEmployeeLicense',
    integrationConfig.powerAutomateFlows.createEmployeeLicense,
    { ...input, flowType: 'create-employee-license' },
    { ...input, status: 'mock-fallback' }
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}

export interface UpdateEmployeeLicenseInput {
  licenseId: number;
  licenseType: string;
  licenseGrade?: string;
  licenseSpecialty?: string[];
  licenseNo?: string;
  issueDate?: string;
  expiryDate?: string;
}

export async function updateEmployeeLicenseFlow(input: UpdateEmployeeLicenseInput): Promise<{ status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'updateEmployeeLicense',
    integrationConfig.powerAutomateFlows.updateEmployeeLicense,
    { ...input, flowType: 'update-employee-license' },
    { ...input, status: 'mock-fallback' }
  );
  return { status: result.status };
}

// Δεν κάνουμε hard delete των αδειών (χρειάζεται audit trail για επιθεωρήσεις ασφαλείας) —
// σημειώνουμε την άδεια ως 'Cancelled' στο SharePoint, ίδιο μοτίβο με τις χορηγήσεις ΜΑΠ.
export async function cancelEmployeeLicenseFlow(licenseId: number, cancelledBy: string, cancelledDate: string): Promise<{ status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'cancelEmployeeLicense',
    integrationConfig.powerAutomateFlows.cancelEmployeeLicense,
    { licenseId, cancelledBy, cancelledDate, flowType: 'cancel-employee-license' },
    { licenseId, status: 'mock-fallback' }
  );
  return { status: result.status };
}

export async function uploadLicenseEvidenceFlow(licenseId: number, employeeNo: string | undefined, employeeName: string | undefined, file: File): Promise<{ status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'uploadLicenseEvidence',
    integrationConfig.powerAutomateFlows.uploadLicenseEvidence,
    {
      licenseId,
      employeeNo,
      employeeName,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileContentBase64: await fileToBase64(file),
      flowType: 'upload-license-evidence',
    },
    { licenseId, status: 'mock-fallback' }
  );
  return { status: result.status };
}

export async function getSpecialtyMatrixFlow(fallback: SpecialtyMatrixEntry[]): Promise<SpecialtyMatrixEntry[]> {
  const result = await invokeFlowData<Array<Record<string, unknown>>>(
    'getSpecialtyMatrix',
    integrationConfig.powerAutomateFlows.getSpecialtyMatrix,
    { flowType: 'get-specialty-matrix' },
    fallback as unknown as Array<Record<string, unknown>>
  );

  function toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const text = String(value ?? '').trim().toLowerCase();
    return text === 'yes' || text === 'true' || text === '1';
  }

  // Specialty/PPECategory είναι Lookup πεδία στο SharePoint — έρχονται σαν αντικείμενο { Id, Value },
  // όχι σαν απλό κείμενο.
  function toDisplayText(value: unknown): string {
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return String(record.Value ?? record.Title ?? '');
    }
    return String(value ?? '');
  }

  return result.data.map((raw) => ({
    specialty: toDisplayText(raw.specialty ?? raw.Specialty),
    ppeCategory: toDisplayText(raw.ppeCategory ?? raw.PPECategory),
    standard: raw.standard !== undefined || raw.Standard !== undefined ? String(raw.standard ?? raw.Standard) : undefined,
    isMandatory: toBoolean(raw.isMandatory ?? raw.IsMandatory),
  }));
}

export async function generateTrainingPdf(input: GenerateTrainingPdfInput): Promise<{ pdfUrl: string; status?: string }> {
  const result = await invokeFlow(
    integrationConfig.powerAutomateFlows.trainingAttendancePdf,
    { ...input, flowType: 'training-attendance-pdf' },
    '#'
  );
  return { pdfUrl: result.url ?? '#', status: result.status };
}

export async function generatePpeIssuePdf(input: GeneratePpeIssuePdfInput): Promise<{ pdfUrl: string; status?: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'ppeIssuePdf',
    integrationConfig.powerAutomateFlows.ppeIssuePdf,
    { ...input, flowType: 'ppe-issue-pdf' },
    { pdfUrl: '#' }
  );
  const pdfUrl = typeof result.data.pdfUrl === 'string' ? result.data.pdfUrl : '#';
  return { pdfUrl, status: result.status };
}

export async function generateTrainingAttendancePdf(input: GenerateTrainingAttendancePdfInput): Promise<{ pdfUrl: string; status?: string }> {
  const result = await invokeFlow(
    integrationConfig.powerAutomateFlows.trainingAttendancePdf,
    { ...input, flowType: 'training-attendance-pdf' },
    '#'
  );
  return { pdfUrl: result.url ?? '#', status: result.status };
}

export async function uploadEvidence(file: File, folderPath: string): Promise<{ url: string; status?: string; fileName: string }> {
  const fallbackUrl = URL.createObjectURL(file);
  const payload = {
    fileName: file.name,
    folderPath,
    siteUrl: integrationConfig.sharePointSiteUrl,
    listName: integrationConfig.sharePointLists.vehicleDocuments,
    rootFolder: integrationConfig.evidenceRootFolder,
    contentType: file.type || 'application/octet-stream',
    fileContentBase64: await fileToBase64(file),
    flowType: 'upload-evidence',
  };

  const result = await invokeFlow(integrationConfig.powerAutomateFlows.evidenceUpload, payload, fallbackUrl);
  return {
    url: result.url ?? fallbackUrl,
    status: result.status,
    fileName: file.name,
  };
}

export async function uploadEmployeeDocument(
  file: File,
  input: {
    employeeId: number;
    employeeName: string;
    documentType: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    mandatory?: boolean;
    aiWarnings?: string;
    notes?: string;
  }
): Promise<{ url: string; status?: string; fileName: string }> {
  const fallbackUrl = URL.createObjectURL(file);
  const folderPath = `Employees/${input.employeeId}/${input.documentType}`;
  const payload = {
    fileName: file.name,
    folderPath,
    siteUrl: integrationConfig.sharePointSiteUrl,
    listName: integrationConfig.sharePointLists.employeeDocuments,
    rootFolder: integrationConfig.evidenceRootFolder,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    documentType: input.documentType,
    issueDate: input.issueDate,
    expiryDate: input.expiryDate,
    issuingAuthority: input.issuingAuthority,
    mandatory: input.mandatory ?? true,
    aiWarnings: input.aiWarnings,
    notes: input.notes,
    status: input.expiryDate ? 'Active' : 'Available',
    contentType: file.type || 'application/octet-stream',
    fileContentBase64: await fileToBase64(file),
    flowType: 'upload-employee-document',
  };

  const result = await invokeFlow(integrationConfig.powerAutomateFlows.employeeDocumentUpload, payload, fallbackUrl);
  return {
    url: result.url ?? fallbackUrl,
    status: result.status,
    fileName: file.name,
  };
}

export async function createQrPrintPayload(payload: string): Promise<{ qrUrl: string; payload: string; status?: string }> {
  const result = await invokeFlow(
    integrationConfig.powerAutomateFlows.qrPdf,
    { payload, flowType: 'qr-print-payload' },
    '#'
  );
  return { qrUrl: result.url ?? '#', payload, status: result.status };
}

export async function ocrDocumentPlaceholder(input: {
  fileName: string;
  contentType?: string;
  documentType?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  fileContentBase64?: string;
  ocrFeatureType?: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION';
  languageHints?: string[];
}): Promise<{ text: string; confidence: number; status?: string; documentType?: string; fileName?: string; fullTextAnnotation?: unknown }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'ocrDocument',
    integrationConfig.powerAutomateFlows.ocrDocument,
    { ...input, flowType: 'ocr-document-placeholder' },
    {
      status: 'mock-fallback',
      text: 'OCR placeholder – configure VITE_POWERAUTOMATE_FLOW_OCR_DOCUMENT to enable extraction.',
      confidence: 0.1,
      documentType: input.documentType,
      fileName: input.fileName,
    }
  );

  function extractOcrText(value: unknown): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return '';
      }

      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          return extractOcrText(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }

      return trimmed;
    }

    if (!value || typeof value !== 'object') {
      return '';
    }

    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string') {
      return record.text;
    }

    const annotation = record.fullTextAnnotation;
    if (annotation && typeof annotation === 'object' && typeof (annotation as Record<string, unknown>).text === 'string') {
      return String((annotation as Record<string, unknown>).text);
    }

    const responses = record.responses;
    if (Array.isArray(responses)) {
      for (const response of responses) {
        const responseText = extractOcrText(response);
        if (responseText) {
          return responseText;
        }
      }
    }

    const textAnnotations = record.textAnnotations;
    if (Array.isArray(textAnnotations)) {
      const firstDescription = textAnnotations
        .map(annotation => annotation && typeof annotation === 'object' ? (annotation as Record<string, unknown>).description : undefined)
        .find(description => typeof description === 'string' && description.trim().length > 0);
      if (typeof firstDescription === 'string') {
        return firstDescription;
      }
    }

    const body = record.body;
    if (body) {
      const bodyText = extractOcrText(body);
      if (bodyText) {
        return bodyText;
      }
    }

    for (const key of ['result', 'data', 'ocr', 'visionResponse', 'googleVisionResponse', 'fullText']) {
      const nestedText = extractOcrText(record[key]);
      if (nestedText) {
        return nestedText;
      }
    }

    return '';
  }

  const text = extractOcrText(result.data);

  return {
    text,
    confidence: typeof result.data.confidence === 'number' ? result.data.confidence : 0.1,
    status: typeof result.data.status === 'string' ? result.data.status : result.status,
    documentType: typeof result.data.documentType === 'string' ? result.data.documentType : input.documentType,
    fileName: typeof result.data.fileName === 'string' ? result.data.fileName : input.fileName,
    fullTextAnnotation: result.data.fullTextAnnotation,
  };
}
export async function createJsaSignOffFlow(input: CreateJsaSignOffInput): Promise<CreateJsaSignOffResult> {
  const fallback: CreateJsaSignOffResult = {
    signOffTitle: `JSA-MOCK-${Date.now()}`,
    employeeCount: input.employees.length,
    status: 'mock-fallback',
  };

  const result = await invokeFlowData<CreateJsaSignOffResult>(
    'createJsaSignOff',
    integrationConfig.powerAutomateFlows.jsaCreateSignOff,
    { ...input, flowType: 'jsa-create-signoff' },
    fallback
  );

  return result.data;
}

export async function submitJsaSignatureFlow(input: SubmitJsaSignatureInput): Promise<SubmitJsaSignatureResult> {
  const fallback: SubmitJsaSignatureResult = {
    signOffTitle: input.signOffTitle,
    signerEmail: input.signerEmail,
    signerRole: input.signerRole,
    allSigned: false,
    status: 'mock-fallback',
  };

  const result = await invokeFlowData<SubmitJsaSignatureResult>(
    'submitJsaSignature',
    integrationConfig.powerAutomateFlows.jsaSubmitSignature,
    { ...input, flowType: 'jsa-submit-signature' },
    fallback
  );

  return result.data;
}
export interface JsaLibraryTaskRaw {
  project: string;
  phase: string;
  taskName: string;
  risk: string;
}

export async function getJsaLibraryTasksFlow(fallback: JsaLibraryTaskRaw[]): Promise<JsaLibraryTaskRaw[]> {
  const result = await invokeFlowData<Array<Record<string, unknown>>>(
    'getJsaLibraryTasks',
    integrationConfig.powerAutomateFlows.getJsaLibraryTasks,
    { flowType: 'get-jsa-library-tasks' },
    fallback as unknown as Array<Record<string, unknown>>
  );

  if (result.status === 'mock-fallback') {
    return fallback;
  }

  return result.data.map((raw) => ({
    project: String(raw.ProjectType ?? raw.project ?? ''),
    phase: String(raw.ConstructionPhase ?? raw.phase ?? ''),
    taskName: String(raw.Title ?? raw.taskName ?? ''),
    risk: String(raw.RiskLevel ?? raw.risk ?? 'M'),
  })).filter((t) => t.project && t.taskName);
}
export interface UploadJsaScannedFormInput {
  signOffTitle: string;
  fileName: string;
  fileContentBase64: string;
}

export interface UploadJsaScannedFormResult {
  status: string;
  fileUrl?: string;
}

export async function uploadJsaScannedFormFlow(input: UploadJsaScannedFormInput): Promise<UploadJsaScannedFormResult> {
  const fallback: UploadJsaScannedFormResult = {
    status: 'mock-fallback',
    fileUrl: '#',
  };

  const result = await invokeFlowData<UploadJsaScannedFormResult>(
    'uploadJsaScannedForm',
    integrationConfig.powerAutomateFlows.jsaUploadScannedForm,
    { ...input, flowType: 'jsa-upload-scanned-form' },
    fallback
  );

  return result.data;
}

// ════════════════════════════════════════════════════════════
// Inspections module (Φάση 1)
// ════════════════════════════════════════════════════════════

export interface CreateInspectionInput {
  title: string;
  siteId: number;
  inspectionDate: string;
  inspectorId: number;
  latitude?: number;
  longitude?: number;
  observations?: string;
}

export interface CreateInspectionResult {
  id?: number;
  status: string;
}

export async function createInspectionFlow(input: CreateInspectionInput): Promise<CreateInspectionResult> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'createInspection',
    integrationConfig.powerAutomateFlows.createInspection,
    { ...input, flowType: 'create-inspection' },
    { ...input, status: 'mock-fallback' }
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}

export interface InspectionRaw {
  id: number;
  title: string;
  siteId: number;
  inspectionDate: string;
  inspectorId: number;
  latitude?: number;
  longitude?: number;
  overallHsFindings?: string;
  overallEnvFindings?: string;
  overallSeverity?: string;
  overallRecommendations?: string;
  observations?: string;
}

export async function getInspectionsFlow(fallback: InspectionRaw[]): Promise<InspectionRaw[]> {
  const result = await invokeFlowData<InspectionRaw[]>(
    'getInspections',
    integrationConfig.powerAutomateFlows.getInspections,
    { flowType: 'get-inspections' },
    fallback
  );
  return result.data;
}

// Ξεχωριστή function από uploadEvidence() — ανεβάζει στο InspectionPhotoFiles,
// ΟΧΙ στο VehicleDocuments (uploadEvidence έχει hardcoded listName στο FlowAdapter/backend flow).
export async function uploadInspectionPhotoFlow(
  file: File,
  folderPath: string
): Promise<{ url: string; fileName: string; status: string }> {
  const fallbackUrl = URL.createObjectURL(file);
  const payload = {
    fileName: file.name,
    folderPath,
    siteUrl: integrationConfig.sharePointSiteUrl,
    listName: integrationConfig.sharePointLists.inspectionPhotoFiles,
    contentType: file.type || 'application/octet-stream',
    fileContentBase64: await fileToBase64(file),
    flowType: 'upload-inspection-photo',
  };

  const result = await invokeFlow(integrationConfig.powerAutomateFlows.uploadInspectionPhoto, payload, fallbackUrl);
  return {
    url: result.url ?? fallbackUrl,
    fileName: file.name,
    status: result.status,
  };
}

export interface CreateInspectionPhotoInput {
  inspectionId: number;
  title: string;
  photoUrl: string;
  inspectorPhotoComment?: string;
}

export async function createInspectionPhotoFlow(input: CreateInspectionPhotoInput): Promise<{ id?: number; status: string }> {
  const result = await invokeFlowData<Record<string, unknown>>(
    'createInspectionPhoto',
    integrationConfig.powerAutomateFlows.createInspectionPhoto,
    { ...input, flowType: 'create-inspection-photo' },
    { ...input, status: 'mock-fallback' }
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
  return { id: responseId, status: result.status };
}
