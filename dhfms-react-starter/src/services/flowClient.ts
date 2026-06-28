export interface GenerateTrainingPdfInput {
  trainingSessionId: number;
  trainingTitle: string;
  trainerName: string;
  trainerSignature: string;
  participantsJson: string;
  pdfFileName: string;
}

export async function generateTrainingPdf(input: GenerateTrainingPdfInput): Promise<{ pdfUrl: string }> {
  console.info('PDF generation placeholder. Replace with Power Automate / HTTP trigger / SharePoint-triggered flow.', input);
  return { pdfUrl: '#' };
}

export async function uploadEvidence(file: File, folderPath: string): Promise<{ url: string }> {
  console.info('Evidence upload placeholder. Replace with SharePoint document library upload.', { fileName: file.name, folderPath });
  return { url: URL.createObjectURL(file) };
}
