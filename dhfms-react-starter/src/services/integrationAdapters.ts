import { integrationConfig, isFlowConfigured, isSharePointConfigured } from './integrationConfig';
import {
  createEmployeeFlow,
  createPpeIssueFlow,
  createQrPrintPayload,
  createTrainingFlow,
  generatePpeIssuePdf,
  generateTrainingAttendancePdf,
  generateTrainingPdf,
  getEmployeesFlow,
  getPpeCatalogFlow,
  getProjectStaffFlow,
  getTrainingTopicsFlow,
  ocrDocumentPlaceholder,
  uploadEvidence,
} from './flowClient';
import { documents, trainings } from '../data/mockData';
import type { Employee, PpeCatalogItem, ProjectStaffMember, TrainingTopic } from '../types/models';
import type { EvidenceDocument, TrainingSession } from '../types/models';
import QRCode from 'qrcode';

export interface SharePointListItemPayload {
  listName: string;
  item: Record<string, unknown>;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

export interface SignaturePayload {
  signerName: string;
  documentId: string;
}

export interface SignatureResult {
  signatureUrl: string;
  status: 'pending' | 'completed';
}

export interface QrResult {
  qrUrl: string;
  payload: string;
}

export class SharePointAdapter {
  private normalizeListName(listName: string): string {
    return listName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  async createListItem(payload: SharePointListItemPayload): Promise<{ id?: number; status: string }> {
    const normalized = this.normalizeListName(payload.listName);
    if (normalized.includes('training')) {
      return createTrainingFlow(payload.item);
    }
    if (normalized.includes('ppe')) {
      return createPpeIssueFlow(payload.item);
    }
    console.info(`[SharePointAdapter][MockFallback] No configured flow mapping for write list '${payload.listName}'.`);
    if (!isFlowConfigured()) {
      return { id: Date.now(), status: 'mock-fallback' };
    }
    return { id: Date.now(), status: 'mock-fallback' };
  }

  async getListItems(listName: string): Promise<unknown[]> {
    const normalized = this.normalizeListName(listName);
    if (normalized === 'employees') {
      return getEmployeesFlow(undefined, [] as Employee[]);
    }
    if (normalized === 'projectstaff') {
      return getProjectStaffFlow(undefined, [] as ProjectStaffMember[]);
    }
    if (normalized.includes('trainingtopic')) {
      return getTrainingTopicsFlow([] as TrainingTopic[]);
    }
    if (normalized.includes('ppecatalog')) {
      return getPpeCatalogFlow([] as PpeCatalogItem[]);
    }
    console.info(`[SharePointAdapter][MockFallback] No configured flow mapping for read list '${listName}'.`);
    return [];
  }
}

export class FlowAdapter {
  async triggerTrainingPdf(input: { trainingSessionId: number; trainingTitle: string; trainerName: string; trainerSignature: string; participantsJson: string; pdfFileName: string }) {
    if (!isFlowConfigured()) {
      return generateTrainingPdf({ ...input, trainerSignature: input.trainerSignature || 'mock-signature' });
    }
    return generateTrainingPdf({ ...input, trainerSignature: input.trainerSignature || 'placeholder' });
  }

  async generatePpeIssuePdf(input: { employeeId: number; employeeName: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string }) {
    return generatePpeIssuePdf(input);
  }

  async generateEquipmentAssignmentPdf(input: { employeeId: number; employeeName: string; issueDate: string; issuedBy: string; siteName?: string; pdfFileName: string }) {
    return generatePpeIssuePdf(input);
  }

  async generateTrainingAttendancePdf(input: { trainingSessionId: number; trainingTitle: string; trainingDate: string; trainerName: string; participantsJson: string; pdfFileName: string }) {
    return generateTrainingAttendancePdf(input);
  }

  async uploadEvidence(file: File, folderPath: string) {
    if (!isFlowConfigured()) {
      return uploadEvidence(file, folderPath);
    }
    return uploadEvidence(file, folderPath);
  }

  async createQrPrintPayload(payload: string) {
    return createQrPrintPayload(payload);
  }

  async ocrDocumentPlaceholder(input: { fileName: string; contentType?: string; documentType?: string }) {
    return ocrDocumentPlaceholder(input);
  }
}

export class OcrAdapter {
  async extractText(file: File): Promise<OcrResult> {
    if (!integrationConfig.ocrEndpoint) {
      return { text: 'OCR placeholder – configure VITE_OCR_ENDPOINT to enable real extraction.', confidence: 0.1 };
    }
    return { text: 'OCR endpoint configured; extraction pending.', confidence: 0.2 };
  }
}

export class SignatureAdapter {
  async captureSignature(payload: SignaturePayload): Promise<SignatureResult> {
    if (!integrationConfig.signatureEndpoint) {
      return { signatureUrl: 'mock-signature-placeholder', status: 'pending' };
    }
    return { signatureUrl: 'configured-signature-endpoint', status: 'pending' };
  }
}

export class QrAdapter {
  async generateQr(payload: string): Promise<QrResult> {
    try {
      const qrUrl = await QRCode.toDataURL(payload, {
        margin: 1,
        width: 240,
        color: {
          dark: '#1A3A5C',
          light: '#FFFFFF',
        },
      });
      return { qrUrl, payload };
    } catch (error) {
      console.warn('QR generation failed, falling back to placeholder.', error);
      return { qrUrl: 'mock-qr-placeholder', payload };
    }
  }

  async printQr(payload: string) {
    return this.generateQr(payload);
  }
}

export function getTrainingIntegrationFallback() {
  return {
    trainings,
    documents,
    hasSharePoint: isSharePointConfigured(),
    hasFlow: isFlowConfigured(),
  };
}
