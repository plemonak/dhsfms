import { integrationConfig, isFlowConfigured, isSharePointConfigured } from './integrationConfig';
import { createQrPrintPayload, generatePpeIssuePdf, generateTrainingAttendancePdf, generateTrainingPdf, ocrDocumentPlaceholder, uploadEvidence } from './flowClient';
import { SharePointProvider } from './sharePointProvider';
import { documents, trainings } from '../data/mockData';
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
  private provider = isSharePointConfigured() ? new SharePointProvider() : null;

  async createListItem(payload: SharePointListItemPayload): Promise<{ id?: number; status: string }> {
    if (!this.provider) {
      return { id: Date.now(), status: 'mock-fallback' };
    }
    return this.provider.createListItem(payload);
  }

  async getListItems(listName: string): Promise<unknown[]> {
    if (!this.provider) {
      return [];
    }
    return this.provider.getListItems(listName);
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
