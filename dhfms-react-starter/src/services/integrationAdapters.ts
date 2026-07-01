import { integrationConfig, isFlowConfigured, isSharePointConfigured } from './integrationConfig';
import {
  createEmployeeFlow,
  createPpeIssueFlow,
  createQrPrintPayload,
  createTrainingFlow,
  createVehicleFlow,
  generatePpeIssuePdf,
  generateTrainingAttendancePdf,
  generateTrainingPdf,
  getEmployeesFlow,
  getPpeCatalogFlow,
  getPpeIssuesFlow,
  getProjectStaffFlow,
  getTrainingTopicsFlow,
  ocrDocumentPlaceholder,
  uploadEmployeeDocument,
  uploadEvidence,
  type GeneratePpeIssuePdfInput,
} from './flowClient';
import { documents, trainings } from '../data/mockData';
import type { Employee, PpeCatalogItem, PpeIssue, ProjectStaffMember, TrainingTopic } from '../types/models';
import type { EvidenceDocument, TrainingSession } from '../types/models';
import QRCode from 'qrcode';
import { createWorker } from 'tesseract.js';

export interface SharePointListItemPayload {
  listName: string;
  item: Record<string, unknown>;
}

export interface OcrResult {
  text: string;
  confidence: number;
  status?: string;
  documentType?: string;
  fileName?: string;
  fullTextAnnotation?: unknown;
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
    if (normalized.includes('employee')) {
      return createEmployeeFlow(payload.item);
    }
    if (normalized.includes('vehicle')) {
      return createVehicleFlow(payload.item);
    }
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
    if (normalized.includes('ppeissuance')) {
      return getPpeIssuesFlow([] as PpeIssue[]);
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

  async generatePpeIssuePdf(input: GeneratePpeIssuePdfInput) {
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

  async uploadEmployeeDocument(
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
  ) {
    return uploadEmployeeDocument(file, input);
  }

  async createQrPrintPayload(payload: string) {
    return createQrPrintPayload(payload);
  }

  async ocrDocumentPlaceholder(input: { fileName: string; contentType?: string; documentType?: string }) {
    return ocrDocumentPlaceholder(input);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

async function preprocessImageForOcr(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.max(2, Math.min(4, Math.ceil(1800 / Math.max(bitmap.width, bitmap.height))));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      bitmap.close();
      return file;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let index = 0; index < data.length; index += 4) {
      const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.55 + 128));
      data[index] = contrasted;
      data[index + 1] = contrasted;
      data[index + 2] = contrasted;
    }

    context.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
    if (!blob) {
      return file;
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-ocr.png', { type: 'image/png' });
  } catch (error) {
    console.warn('OCR image preprocessing failed; using original file.', error);
    return file;
  }
}

export class OcrAdapter {
  private async extractWithTesseract(file: File): Promise<OcrResult> {
    const worker = await createWorker('ell+eng');

    try {
      const result = await worker.recognize(file);

      return {
        text: result.data.text,
        confidence: result.data.confidence / 100,
      };
    } finally {
      await worker.terminate();
    }
  }

  async extractText(file: File, options: { documentType?: string; vehicleId?: number; vehiclePlate?: string } = {}): Promise<OcrResult> {
    const ocrFile = await preprocessImageForOcr(file);

    if (integrationConfig.powerAutomateFlows.ocrDocument) {
      const fileContentBase64 = arrayBufferToBase64(await ocrFile.arrayBuffer());

      const flowResult = await ocrDocumentPlaceholder({
        fileName: ocrFile.name,
        contentType: ocrFile.type,
        documentType: options.documentType,
        vehicleId: options.vehicleId,
        vehiclePlate: options.vehiclePlate,
        fileContentBase64,
        ocrFeatureType: 'DOCUMENT_TEXT_DETECTION',
        languageHints: ['el', 'en'],
      });

      if (flowResult.text.trim().length > 0 || file.type === 'application/pdf') {
        return flowResult;
      }

      const localResult = await this.extractWithTesseract(ocrFile);
      return {
        ...localResult,
        status: 'local-ocr-fallback',
        documentType: options.documentType,
        fileName: file.name,
      };
    }

    return this.extractWithTesseract(ocrFile);
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
