import { integrationConfig, isFlowConfigured } from './integrationConfig';

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

async function invokeFlow(endpoint: string | undefined, payload: Record<string, unknown>, fallbackUrl: string): Promise<FlowResult> {
  if (!isFlowConfigured() || !endpoint) {
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
    console.warn('Power Automate flow invocation failed. Falling back to mock response.', error);
    return {
      status: 'mock-fallback',
      message: 'Power Automate flow invocation failed. Returning mock fallback.',
      url: fallbackUrl,
      payload,
    };
  }
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
