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
    vehicleDocuments: readEnv('VITE_SHAREPOINT_LIST_VEHICLE_DOCUMENTS') ?? 'VehicleDocuments',
    equipment: readEnv('VITE_SHAREPOINT_LIST_EQUIPMENT') ?? 'Equipment',
    assets: readEnv('VITE_SHAREPOINT_LIST_ASSETS') ?? 'Assets',
  },
  powerAutomateBaseUrl: readEnv('VITE_POWERAUTOMATE_BASE_URL'),
  evidenceRootFolder: readEnv('VITE_SHAREPOINT_EVIDENCE_ROOT_FOLDER'),
  powerAutomateFlows: {
    getEmployees: readEnv('VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEES'),
    getVehicles: readEnv('VITE_POWERAUTOMATE_FLOW_GET_VEHICLES'),
    getSites: readEnv('VITE_POWERAUTOMATE_FLOW_GET_SITES'),
    getProjectStaff: readEnv('VITE_POWERAUTOMATE_FLOW_GET_PROJECT_STAFF'),
    getTrainingTopics: readEnv('VITE_POWERAUTOMATE_FLOW_GET_TRAINING_TOPICS'),
    getPpeCatalog: readEnv('VITE_POWERAUTOMATE_FLOW_GET_PPE_CATALOG'),
      createEmployee: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_EMPLOYEE'),
      createVehicle: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_VEHICLE'),
    createTraining: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_TRAINING'),
    createPpeIssue: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_PPE_ISSUE'),
    ppeIssuePdf: readEnv('VITE_POWERAUTOMATE_FLOW_PPE_ISSUE_PDF'),
    trainingAttendancePdf: readEnv('VITE_POWERAUTOMATE_FLOW_TRAINING_ATTENDANCE_PDF'),
    evidenceUpload: readEnv('VITE_POWERAUTOMATE_FLOW_UPLOAD_EVIDENCE'),
    qrPdf: readEnv('VITE_POWERAUTOMATE_FLOW_QR_PDF'),
    ocrDocument: readEnv('VITE_POWERAUTOMATE_FLOW_OCR_DOCUMENT'),
  },
  ocrEndpoint: readEnv('VITE_OCR_ENDPOINT'),
  signatureEndpoint: readEnv('VITE_SIGNATURE_ENDPOINT'),
  qrPrintEndpoint: readEnv('VITE_QR_PRINT_ENDPOINT'),
};

export function isSharePointConfigured() {
  return Boolean(integrationConfig.sharePointSiteUrl);
}

export function isFlowConfigured() {
  return Boolean(
    integrationConfig.enableRealIntegrations &&
      (integrationConfig.powerAutomateBaseUrl ||
        Object.values(integrationConfig.powerAutomateFlows).some(Boolean))
  );
}
