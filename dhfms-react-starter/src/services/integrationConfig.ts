function readEnv(name: string): string | undefined {
  const value = import.meta.env[name];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

export const integrationConfig = {
  enableRealIntegrations: readEnv('VITE_ENABLE_REAL_INTEGRATIONS') === 'true',
  sharePointSiteUrl: readEnv('VITE_SHAREPOINT_SITE_URL'),
  sharePointApiUrl: readEnv('VITE_SHAREPOINT_API_URL'),
  sharePointAccessToken: readEnv('VITE_SHAREPOINT_ACCESS_TOKEN'),
  sharePointLists: {
    employees: readEnv('VITE_SHAREPOINT_LIST_EMPLOYEES') ?? 'Employees',
    projectStaff: readEnv('VITE_SHAREPOINT_LIST_PROJECTSTAFF') ?? 'ProjectStaff',
    contractors: readEnv('VITE_SHAREPOINT_LIST_CONTRACTORS') ?? 'Contractors',
    sites: readEnv('VITE_SHAREPOINT_LIST_SITES') ?? 'Sites',
    trainings: readEnv('VITE_SHAREPOINT_LIST_TRAININGS') ?? 'TrainingSessions',
    attendance: readEnv('VITE_SHAREPOINT_LIST_ATTENDANCE') ?? 'TrainingAttendance',
    medical: readEnv('VITE_SHAREPOINT_LIST_MEDICAL') ?? 'MedicalCertificates',
    licenses: readEnv('VITE_SHAREPOINT_LIST_LICENSES') ?? 'EmployeeLicenses',
    ppe: readEnv('VITE_SHAREPOINT_LIST_PPE') ?? 'PPEIssuances',
    vehicles: readEnv('VITE_SHAREPOINT_LIST_VEHICLES') ?? 'Vehicles',
    equipment: readEnv('VITE_SHAREPOINT_LIST_EQUIPMENT') ?? 'Equipment',
    assets: readEnv('VITE_SHAREPOINT_LIST_ASSETS') ?? 'Assets',
  },
  powerAutomateBaseUrl: readEnv('VITE_POWERAUTOMATE_BASE_URL'),
  ocrEndpoint: readEnv('VITE_OCR_ENDPOINT'),
  signatureEndpoint: readEnv('VITE_SIGNATURE_ENDPOINT'),
  qrPrintEndpoint: readEnv('VITE_QR_PRINT_ENDPOINT'),
};

export function isSharePointConfigured() {
  return Boolean(integrationConfig.enableRealIntegrations && (integrationConfig.sharePointSiteUrl || integrationConfig.sharePointApiUrl));
}

export function isFlowConfigured() {
  return Boolean(integrationConfig.enableRealIntegrations && integrationConfig.powerAutomateBaseUrl);
}
