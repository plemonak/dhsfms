import type { AppUser, Employee, EquipmentItem, EvidenceDocument, PpeCatalogItem, PpeIssue, ProjectStaffMember, Site, TrainingSession, TrainingTopic, Vehicle } from '../types/models';

export const currentUser: AppUser = {
  displayName: 'Panagiotis Lemonakis',
  email: 'plemonak@gmail.com',
  role: 'HSE Manager',
  initials: 'ΠΚ',
};

export const sites: Site[] = [
  { id: 1, name: 'Φ/Β Πάρκο Κιλκίς', phase: 'Φάση Α', status: 'Active', coordinates: '40.993, 22.875' },
  { id: 2, name: 'Σκοπιά Φαρσάλων', phase: 'MV Network', status: 'Active', coordinates: '39.29, 22.38' },
  { id: 3, name: 'Δοξαράς', phase: 'Warehouse Transfer', status: 'Active' },
];

export const employees: Employee[] = [
  { id: 1, employeeNo: 'DYKAT-001', firstName: 'Γεώργιος', lastName: 'Αναστασίου', fullName: 'Αναστασίου Γεώργιος', company: 'DYKAT', personType: 'DYKAT employee', position: 'Χειριστής / Οδηγός', siteId: 2, status: 'Active', mobile: '6971667208', idOrTaxNo: 'Μ-859291/Τ.Α. Καρδίτσας/24-11-1982' },
  { id: 2, employeeNo: 'DYKAT-002', firstName: 'Παναγιώτης', lastName: 'Λεμονάκης', fullName: 'Λεμονάκης Παναγιώτης', company: 'DYKAT', personType: 'DYKAT employee', position: 'HSE Manager', siteId: 2, status: 'Active', email: 'plemonak@gmail.com' },
  { id: 3, employeeNo: 'SUB-001', firstName: 'Αντώνιος', lastName: 'Παπαδόπουλος', fullName: 'Παπαδόπουλος Αντώνιος', company: 'LLESHI', contractor: 'LLESHI', personType: 'Subcontractor', position: 'Εναερίτης', siteId: 1, status: 'Pending' },
  { id: 4, employeeNo: 'DYKAT-003', firstName: 'Μιχάλης', lastName: 'Γεωργίου', fullName: 'Γεωργίου Μιχάλης', company: 'DYKAT', personType: 'DYKAT employee', position: 'Ηλεκτρολόγος ΜΤ', siteId: 1, status: 'Active' },
];

export const projectStaff: ProjectStaffMember[] = [
  { id: 1, displayName: 'Παναγιώτης Λεμονάκης', title: 'HSE Manager', responsibleName: 'Παναγιώτης Λεμονάκης' },
  { id: 2, displayName: 'Μαρία Κωνσταντίνου', title: 'Site Supervisor', responsibleName: 'Μαρία Κωνσταντίνου' },
  { id: 3, displayName: 'Νίκος Καραλής', title: 'Foreman', responsibleName: 'Νίκος Καραλής' },
];

export const vehicles: Vehicle[] = [
  { id: 1, code: 'VEH-001', plate: 'ΡΟΗ-1234', type: 'Φορτηγό', owner: 'DYKAT', siteId: 2, status: 'Active', insuranceExpiry: '2026-12-31', kteoExpiry: '2026-09-20' },
  { id: 2, code: 'ME-001', plate: 'ME-7788', type: 'Καλαθοφόρο', owner: 'Subcontractor', siteId: 1, status: 'Pending', insuranceExpiry: '2026-08-10' },
];

export const trainingTopics: TrainingTopic[] = [
  { id: 1, title: 'Εισαγωγική Εκπαίδευση', competency: 'Προσωπική προστασία', materialUrl: 'https://example.com/training-material-intro.pdf', source: 'SharePoint' },
  { id: 2, title: 'Εργασία σε Ύψος', competency: 'Ασφαλής εργασία σε ύψος', materialUrl: 'https://example.com/training-material-height.pdf', source: 'Competencies' },
  { id: 3, title: 'Ηλεκτρολογική Ασφάλεια ΜΤ', competency: 'Ηλεκτρολογικές εργασίες', materialUrl: 'https://example.com/training-material-electrical.pdf', source: 'Training Topics' },
];

export const trainings: TrainingSession[] = [
  { id: 1, title: 'Εισαγωγική Εκπαίδευση', date: '2026-06-27', trainerName: 'Panagiotis Lemonakis', siteId: 2, participantIds: [1, 3], status: 'Completed', pdfUrl: '#' },
  { id: 2, title: 'Εργασία σε Ύψος', date: '2026-06-23', trainerName: 'Panagiotis Lemonakis', siteId: 1, participantIds: [3, 4], status: 'Pending' },
  { id: 3, title: 'Ηλεκτρολογική Ασφάλεια ΜΤ', date: '2026-06-20', trainerName: 'External Trainer', siteId: 1, participantIds: [4], status: 'Pending' },
];

export const documents: EvidenceDocument[] = [
  { id: 1, entityType: 'employee', entityId: 1, documentType: 'Ιατρική βεβαίωση', issueDate: '2026-01-01', expiryDate: '2027-01-01', status: 'Active' },
  { id: 2, entityType: 'employee', entityId: 1, documentType: 'Άδεια χειριστή', issueDate: '2025-05-01', expiryDate: '2027-05-01', status: 'Active' },
  { id: 3, entityType: 'vehicle', entityId: 1, documentType: 'Ασφάλεια', issueDate: '2026-01-01', expiryDate: '2026-12-31', status: 'Active' },
  { id: 4, entityType: 'employee', entityId: 3, documentType: 'Fit to Work', status: 'Missing' },
];

export const ppeCatalog: PpeCatalogItem[] = [
  { id: 1, ppeType: 'Κράνος', model: 'S1', size: 'M', enCertification: 'EN 397', issueDate: '2026-06-27', replacementDate: '2027-06-27', quantity: 1, notes: 'Κράνος ασφαλείας για εργασία πεδίου' },
  { id: 2, ppeType: 'Γυαλιά προστασίας', model: 'ClearShield', size: 'One Size', enCertification: 'EN 166', issueDate: '2026-06-27', expiryDate: '2027-06-27', quantity: 2, notes: 'Ανθεκτικά σε θραύση' },
  { id: 3, ppeType: 'Μάσκα', model: 'FFP3', size: 'M', enCertification: 'EN 149', issueDate: '2026-06-27', replacementDate: '2026-12-27', quantity: 3, notes: 'Για προστασία από σωματίδια' },
  { id: 4, ppeType: 'Γάντια', model: 'Cut Resistant', size: 'L', enCertification: 'EN 388', issueDate: '2026-06-27', expiryDate: '2027-06-27', quantity: 4, notes: 'Για χειρισμό εργαλείων' },
];

export const equipmentCatalog: EquipmentItem[] = [
  { id: 1, name: 'Ανυψωτικό μηχάνημα', serial: 'EQP-1001', siteId: 2, status: 'Active' },
  { id: 2, name: 'Ηλεκτρική σκούπα', serial: 'EQP-1002', siteId: 1, status: 'Active' },
  { id: 3, name: 'Πυροσβεστικό όχημα', serial: 'EQP-1003', siteId: 2, status: 'Pending' },
];

export const ppeIssues: PpeIssue[] = [
  { id: 1, employeeId: 1, siteId: 2, issueDate: '2026-06-27', issuedBy: 'Panagiotis Lemonakis', status: 'Completed' },
  { id: 2, employeeId: 3, siteId: 1, issueDate: '2026-06-20', issuedBy: 'Panagiotis Lemonakis', status: 'Pending' },
];
