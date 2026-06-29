import { integrationConfig, isFlowConfigured } from './integrationConfig';
import type { Employee, PpeCatalogItem, ProjectStaffMember, TrainingTopic, Vehicle } from '../types/models';

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
    }

    throw new Error('Flow response did not contain expected payload.');
  } catch (error) {
    logMockFallback(operation, 'Flow invocation failed. Using local mock data.');
    console.warn(`${operation} flow invocation failed. Falling back to mock data.`, error);
    return { data: fallback, status: 'mock-fallback' };
  }
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
      owner: toDisplayText(raw.owner) ?? 'Unknown',
      siteId: Number(raw.siteId ?? siteId ?? 2),
      status: (toDisplayText(raw.status) ?? 'Active') as Vehicle['status'],
      insuranceExpiry: toDisplayText(raw.insuranceExpiry),
      kteoExpiry: toDisplayText(raw.kteoExpiry),
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
  return result.data;
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
  const payload = {
    fileName: file.name,
    folderPath,
    contentType: file.type || 'application/octet-stream',
    flowType: 'upload-evidence',
  };

  const result = await invokeFlow(integrationConfig.powerAutomateFlows.evidenceUpload, payload, URL.createObjectURL(file));
  return {
    url: result.url ?? URL.createObjectURL(file),
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

export async function ocrDocumentPlaceholder(input: { fileName: string; contentType?: string; documentType?: string }): Promise<{ text: string; confidence: number; status?: string }> {
  const result = await invokeFlow(
    integrationConfig.powerAutomateFlows.ocrDocument,
    { ...input, flowType: 'ocr-document-placeholder' },
    '#'
  );
  return {
    text: result.status === 'completed' ? 'OCR flow invocation placeholder completed.' : 'OCR placeholder – configure a Power Automate endpoint to enable real extraction.',
    confidence: result.status === 'completed' ? 0.95 : 0.1,
    status: result.status,
  };
}
