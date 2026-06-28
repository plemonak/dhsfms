import { integrationConfig, isFlowConfigured, isSharePointConfigured } from './integrationConfig';
import { generateTrainingPdf, uploadEvidence } from './flowClient';
import { SharePointProviderNotConnectedYet } from './sharePointProvider';
import { documents, trainings } from '../data/mockData';
import type { EvidenceDocument, TrainingSession } from '../types/models';

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
  private provider = isSharePointConfigured() ? new SharePointProviderNotConnectedYet() : null;

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

  async uploadEvidence(file: File, folderPath: string) {
    if (!isFlowConfigured()) {
      return uploadEvidence(file, folderPath);
    }
    return uploadEvidence(file, folderPath);
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
    if (!integrationConfig.qrPrintEndpoint) {
      return { qrUrl: 'mock-qr-placeholder', payload };
    }
    return { qrUrl: 'configured-qr-endpoint', payload };
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
