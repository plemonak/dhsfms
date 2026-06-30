import { integrationConfig, isFlowConfigured } from './integrationConfig';
import type { Employee, EvidenceDocument, PpeCatalogItem, ProjectStaffMember, Site, TrainingTopic, Vehicle } from '../types/models';

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
  issueDate: string;
  issuedBy: string;
  siteName?: string;
  pdfFileName: string;
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
  employees: Array<{ email: string; fullName: string }>;
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

function logMockFallback(operation: string, reason: string) {
  console.info(`[FlowClient][MockFallback] ${operation}: ${reason}`);
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
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
  const result = await invokeFlowData<Record<string, unknown>>(
    'createEmployee',
    integrationConfig.powerAutomateFlows.createEmployee,
    { ...payload, flowType: 'create-employee' },
    payload
  );
  const responseId = typeof result.data.id === 'number' ? result.data.id : undefined;
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

export async function generateTrainingPdf(input: GenerateTrainingPdfInput): Promise<{ pdfUrl: string; status?: string }> {
  const result = await invokeFlow(
    integrationConfig.powerAutomateFlows.trainingAttendancePdf,
    { ...input, flowType: 'training-attendance-pdf' },
    '#'
  );
  return { pdfUrl: result.url ?? '#', status: result.status };
}

export async function generatePpeIssuePdf(input: GeneratePpeIssuePdfInput): Promise<{ pdfUrl: string; status?: string }> {
  const result = await invokeFlow(
    integrationConfig.powerAutomateFlows.ppeIssuePdf,
    { ...input, flowType: 'ppe-issue-pdf' },
    '#'
  );
  return { pdfUrl: result.url ?? '#', status: result.status };
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

  return {
    text: typeof result.data.text === 'string' ? result.data.text : '',
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