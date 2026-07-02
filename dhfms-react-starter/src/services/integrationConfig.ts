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
    employeeDocuments: readEnv('VITE_SHAREPOINT_LIST_EMPLOYEE_DOCUMENTS') ?? 'EmployeeDocuments',
    ppe: readEnv('VITE_SHAREPOINT_LIST_PPE') ?? 'PPEIssuances',
    vehicles: readEnv('VITE_SHAREPOINT_LIST_VEHICLES') ?? 'Vehicles',
    vehicleDocuments: readEnv('VITE_SHAREPOINT_LIST_VEHICLE_DOCUMENTS') ?? 'VehicleDocuments',
    equipment: readEnv('VITE_SHAREPOINT_LIST_EQUIPMENT') ?? 'Equipment',
    assets: readEnv('VITE_SHAREPOINT_LIST_ASSETS') ?? 'Assets',
    inspections: readEnv('VITE_SHAREPOINT_LIST_INSPECTIONS') ?? 'Inspections',
    inspectionPhotos: readEnv('VITE_SHAREPOINT_LIST_INSPECTION_PHOTOS') ?? 'InspectionPhotos',
    inspectionPhotoFiles: readEnv('VITE_SHAREPOINT_LIST_INSPECTION_PHOTO_FILES') ?? 'InspectionPhotoFiles',
    inspectionFindings: readEnv('VITE_SHAREPOINT_LIST_INSPECTION_FINDINGS') ?? 'InspectionFindings',
    specialtyMatrix: readEnv('VITE_SHAREPOINT_LIST_SPECIALTY_MATRIX') ?? 'SpecialtyMatrix',
    ppeAssignments: readEnv('VITE_SHAREPOINT_LIST_PPE_ASSIGNMENTS') ?? 'PPEAssignments',
  },
  powerAutomateBaseUrl: readEnv('VITE_POWERAUTOMATE_BASE_URL'),
  evidenceRootFolder: readEnv('VITE_SHAREPOINT_EVIDENCE_ROOT_FOLDER'),
  powerAutomateFlows: {
    getEmployees: readEnv('VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEES'),
    getEmployeeDocuments: readEnv('VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEE_DOCUMENTS'),
    getMedicalCertificates: readEnv('VITE_POWERAUTOMATE_FLOW_GET_MEDICAL_CERTIFICATES'),
    createMedicalCertificate: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_MEDICAL_CERTIFICATE'),
    uploadMedicalEvidence: readEnv('VITE_POWERAUTOMATE_FLOW_UPLOAD_MEDICAL_EVIDENCE'),
    getEmployeeLicenses: readEnv('VITE_POWERAUTOMATE_FLOW_GET_EMPLOYEE_LICENSES'),
    createEmployeeLicense: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_EMPLOYEE_LICENSE'),
    updateEmployeeLicense: readEnv('VITE_POWERAUTOMATE_FLOW_UPDATE_EMPLOYEE_LICENSE'),
    cancelEmployeeLicense: readEnv('VITE_POWERAUTOMATE_FLOW_CANCEL_EMPLOYEE_LICENSE'),
    cancelMedicalCertificate: readEnv('VITE_POWERAUTOMATE_FLOW_CANCEL_MEDICAL_CERTIFICATE'),
    uploadLicenseEvidence: readEnv('VITE_POWERAUTOMATE_FLOW_UPLOAD_LICENSE_EVIDENCE'),
    getVehicles: readEnv('VITE_POWERAUTOMATE_FLOW_GET_VEHICLES'),
    getVehicleDocuments: readEnv('VITE_POWERAUTOMATE_FLOW_GET_VEHICLE_DOCUMENTS'),
    getSites: readEnv('VITE_POWERAUTOMATE_FLOW_GET_SITES'),
    getProjectStaff: readEnv('VITE_POWERAUTOMATE_FLOW_GET_PROJECT_STAFF'),
    jsaCreateSignOff: readEnv('VITE_POWERAUTOMATE_FLOW_JSA_CREATE_SIGNOFF'),
    jsaSubmitSignature: readEnv('VITE_POWERAUTOMATE_FLOW_JSA_SUBMIT_SIGNATURE'),
    getJsaLibraryTasks: readEnv('VITE_POWERAUTOMATE_FLOW_GET_JSA_LIBRARY_TASKS'),
    jsaUploadScannedForm: readEnv('VITE_POWERAUTOMATE_FLOW_JSA_UPLOAD_SCANNED_FORM'),
    getTrainingTopics: readEnv('VITE_POWERAUTOMATE_FLOW_GET_TRAINING_TOPICS'),
    getPpeCatalog: readEnv('VITE_POWERAUTOMATE_FLOW_GET_PPE_CATALOG'),
      createEmployee: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_EMPLOYEE'),
      createVehicle: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_VEHICLE'),
      updateVehicle: readEnv('VITE_POWERAUTOMATE_FLOW_UPDATE_VEHICLE'),
    createTraining: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_TRAINING'),
    createPpeIssue: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_PPE_ISSUE'),
    cancelPpeIssue: readEnv('VITE_POWERAUTOMATE_FLOW_CANCEL_PPE_ISSUE'),
    getPpeIssues: readEnv('VITE_POWERAUTOMATE_FLOW_GET_PPE_ISSUES'),
    getSpecialtyMatrix: readEnv('VITE_POWERAUTOMATE_FLOW_GET_SPECIALTY_MATRIX'),
    getPpeAssignments: readEnv('VITE_POWERAUTOMATE_FLOW_GET_PPE_ASSIGNMENTS'),
    createPpeAssignment: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_PPE_ASSIGNMENT'),
    cancelPpeAssignment: readEnv('VITE_POWERAUTOMATE_FLOW_CANCEL_PPE_ASSIGNMENT'),
    ppeIssuePdf: readEnv('VITE_POWERAUTOMATE_FLOW_PPE_ISSUE_PDF'),
    trainingAttendancePdf: readEnv('VITE_POWERAUTOMATE_FLOW_TRAINING_ATTENDANCE_PDF'),
    evidenceUpload: readEnv('VITE_POWERAUTOMATE_FLOW_UPLOAD_EVIDENCE'),
    employeeDocumentUpload: readEnv('VITE_POWERAUTOMATE_FLOW_UPLOAD_EMPLOYEE_DOCUMENT'),
    qrPdf: readEnv('VITE_POWERAUTOMATE_FLOW_QR_PDF'),
    ocrDocument: readEnv('VITE_POWERAUTOMATE_FLOW_OCR_DOCUMENT'),
    getInspections: readEnv('VITE_POWERAUTOMATE_FLOW_GET_INSPECTIONS'),
    createInspection: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_INSPECTION'),
    uploadInspectionPhoto: readEnv('VITE_POWERAUTOMATE_FLOW_UPLOAD_INSPECTION_PHOTO'),
    createInspectionPhoto: readEnv('VITE_POWERAUTOMATE_FLOW_CREATE_INSPECTION_PHOTO'),
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
