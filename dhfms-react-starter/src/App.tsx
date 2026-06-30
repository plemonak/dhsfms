import { useEffect, useMemo, useState } from 'react';
import { currentUser } from './data/mockData';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeeProfilePage } from './pages/EmployeeProfilePage';
import { EmployeeFormPage } from './pages/EmployeeFormPage';
import { EvidencePage } from './pages/EvidencePage';
import { GenericListPage } from './pages/GenericListPage';
import { QrPage } from './pages/QrPage';
import { SignaturePage } from './pages/SignaturePage';
import { TrainingPage } from './pages/TrainingPage';
import { VehicleFormPage } from './pages/VehicleFormPage';
import type { InitialVehicleDocumentDraft } from './pages/VehicleFormPage';
import { VehicleProfilePage } from './pages/VehicleProfilePage';
import { dataProvider } from './services/dataProvider';
import type { Employee, EvidenceDocument, PageKey, PpeIssue, Site, TrainingSession, Vehicle } from './types/models';

export default function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [ppeIssues, setPpeIssues] = useState<PpeIssue[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>();
  const [profileTab, setProfileTab] = useState<'ppe' | 'training' | 'medical' | 'licenses'>('ppe');
  const [selectedSiteId, setSelectedSiteId] = useState<number | 'all'>('all');

  useEffect(() => {
    async function load() {
      setSites(await dataProvider.getSites());
      setEmployees(await dataProvider.getEmployees());
      setVehicles(await dataProvider.getVehicles());
      setTrainings(await dataProvider.getTrainings());
      setDocuments(await dataProvider.getDocuments());
      setPpeIssues(await dataProvider.getPpeIssues());
    }
    void load();
  }, []);

  const selectedSite = useMemo(() => selectedSiteId === 'all' ? undefined : sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);
  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmployeeId), [employees, selectedEmployeeId]);
  const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
  const siteEmployees = useMemo(() => selectedSiteId === 'all' ? employees : employees.filter(e => e.siteId === selectedSiteId), [employees, selectedSiteId]);
  const siteVehicles = useMemo(() => selectedSiteId === 'all' ? vehicles : vehicles.filter(v => v.siteId === selectedSiteId), [vehicles, selectedSiteId]);
  const siteTrainings = useMemo(() => selectedSiteId === 'all' ? trainings : trainings.filter(t => t.siteId === selectedSiteId), [trainings, selectedSiteId]);
  const employeePositionOptions = useMemo(() => Array.from(new Set(employees.flatMap(employee => employee.position.split(' / ').map(position => position.trim()).filter(Boolean)))).sort(), [employees]);
  const employeeCompanyOptions = useMemo(() => Array.from(new Set(['ΔΥΚΑΤ', ...employees.map(employee => employee.company).filter(Boolean)])).sort(), [employees]);
  const vehicleOwnerOptions = useMemo(() => Array.from(new Set(['ΔΥΚΑΤ', ...vehicles.map(vehicle => vehicle.owner).filter(Boolean)])).sort(), [vehicles]);
  const vehicleTypeOptions = useMemo(() => Array.from(new Set(['Όχημα', 'Μηχάνημα Έργου', ...vehicles.map(vehicle => vehicle.type).filter(Boolean)])).sort(), [vehicles]);

  async function handleCreateEmployee(employee: Omit<Employee, 'id' | 'fullName'>) {
    const created = await dataProvider.createEmployee(employee);
    setEmployees(await dataProvider.getEmployees());
    setSelectedEmployeeId(created.id);
    setPage('employee-profile');
  }

  async function handleCreateVehicle(vehicle: Omit<Vehicle, 'id'>, initialLicenseDocument?: InitialVehicleDocumentDraft) {
    const created = await dataProvider.createVehicle(vehicle);

    if (initialLicenseDocument) {
      const folderPath = `Vehicles/${created.plate || created.code}/Άδεια`;
      const uploaded = initialLicenseDocument.sourceFile
        ? await dataProvider.uploadEvidence(initialLicenseDocument.sourceFile, folderPath)
        : undefined;

      const { sourceFile: _sourceFile, ...documentDraft } = initialLicenseDocument;
      const createdDocument: EvidenceDocument = {
        ...documentDraft,
        id: Date.now(),
        entityType: 'vehicle',
        entityId: created.id,
        fileName: uploaded?.fileName ?? initialLicenseDocument.fileName,
        url: uploaded?.url ?? initialLicenseDocument.url,
      };

      setDocuments(prev => [createdDocument, ...prev]);
    }

    setVehicles(await dataProvider.getVehicles());
    setSelectedVehicleId(created.id);
    setPage('vehicle-profile');
  }

  function handleAddVehicleDocument(document: Omit<EvidenceDocument, 'id'>) {
    const createdDocument: EvidenceDocument = {
      ...document,
      id: Date.now(),
    };

    setDocuments(prev => [createdDocument, ...prev]);

    if (document.entityType === 'vehicle' && document.documentType.toLowerCase().includes('ασφάλεια')) {
      setVehicles(prev => prev.map(vehicle =>
        vehicle.id === document.entityId
          ? { ...vehicle, insuranceExpiry: document.expiryDate }
          : vehicle
      ));
    }
  }

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <DashboardPage site={selectedSite} sites={sites} selectedSiteId={selectedSiteId} onSiteChange={setSelectedSiteId} employees={siteEmployees} vehicles={siteVehicles} trainings={siteTrainings} totalEmployees={employees.length} totalVehicles={vehicles.length} onNavigate={setPage} />;
      case 'employees':
        return <EmployeesPage employees={employees} onOpen={(id) => { setSelectedEmployeeId(id); setProfileTab('ppe'); setPage('employee-profile'); }} onNew={() => setPage('employee-form')} />;
      case 'employee-profile':
        return <EmployeeProfilePage employee={selectedEmployee} employees={employees} trainings={trainings} documents={documents.filter(d => d.entityType === 'employee' && d.entityId === selectedEmployeeId)} ppeIssues={ppeIssues.filter(p => p.employeeId === selectedEmployeeId)} activeTab={profileTab} onTabChange={setProfileTab} onBack={() => setPage('employees')} onEdit={() => setPage('employee-form')} />;
      case 'employee-form':
        return <EmployeeFormPage onBack={() => setPage(selectedEmployeeId ? 'employee-profile' : 'employees')} onSave={handleCreateEmployee} sites={sites} selectedSiteId={selectedSiteId} positionOptions={employeePositionOptions} companyOptions={employeeCompanyOptions} />;
      case 'training':
        return <TrainingPage trainings={siteTrainings} employees={siteEmployees} documents={documents.filter(document => document.entityType === 'training')} />;
      case 'ppe':
        return <GenericListPage title="Χορηγήσεις ΜΑΠ" subtitle="ΜΑΠ, υπογραφές εργαζομένου και εκδότη" addLabel="Νέα χορήγηση" rows={ppeIssues.map(p => ({ id: p.id, title: `Χορήγηση ΜΑΠ #${p.id}`, subtitle: p.issueDate, status: p.status }))} />;
      case 'medical':
        return <EvidencePage title="Ιατρικές βεβαιώσεις" subtitle="Fit to work, λήξεις και τεκμήρια" />;
      case 'licenses':
        return <EvidencePage title="Άδειες / Πιστοποιήσεις" subtitle="Άδειες εργαζομένων, πιστοποιήσεις και λήξεις" />;
      case 'vehicles':
        return <GenericListPage title="Οχήματα & Μηχανήματα" subtitle="Στόλος, έγγραφα, ασφάλειες, ΚΤΕΟ" addLabel="Νέο όχημα" showOcrSection={false} onAdd={() => setPage('vehicle-form')} onRowClick={(id) => { setSelectedVehicleId(id); setPage('vehicle-profile'); }} rows={vehicles.map(v => ({ id: v.id, title: `${v.plate} · ${v.type}`, subtitle: `${v.code} · ${v.owner}`, status: v.status, qrType: 'VEH', qrLabel: v.plate }))} />;
      case 'vehicle-form':
        return <VehicleFormPage onBack={() => setPage('vehicles')} onSave={handleCreateVehicle} sites={sites} selectedSiteId={selectedSiteId} ownerOptions={vehicleOwnerOptions} typeOptions={vehicleTypeOptions} />;
      case 'vehicle-profile':
        return <VehicleProfilePage vehicle={selectedVehicle} documents={documents.filter(document => document.entityType === 'vehicle' && document.entityId === selectedVehicleId)} onBack={() => setPage('vehicles')} onAddDocument={handleAddVehicleDocument} />;
      case 'equipment':
        return <GenericListPage title="Εξοπλισμός" subtitle="Εργαλεία, πιστοποιητικά, QR και έλεγχοι" addLabel="Νέο στοιχείο" showOcrSection={false} rows={[{ id: 1, title: 'Ανυψωτικό μηχάνημα', subtitle: 'EQP-001 · Εργοτάξιο Κιλκίς', status: 'Active', qrType: 'EQP', qrLabel: 'Ανυψωτικό μηχάνημα' }]} />;
      case 'sites':
        return <GenericListPage title="Εργοτάξια" subtitle="Έργα, sites και συντεταγμένες" addLabel="Νέο εργοτάξιο" showOcrSection={false} rows={sites.map(s => ({ id: s.id, title: s.name, subtitle: s.phase, status: s.status }))} />;
      case 'contractors':
        return <GenericListPage title="Υπεργολάβοι" subtitle="Εταιρείες, έγκριση και στοιχεία επικοινωνίας" addLabel="Νέος υπεργολάβος" />;
      case 'smart-docs':
        return <GenericListPage title="Smart Docs" subtitle="Κεντρική περιοχή έξυπνης αρχειοθέτησης εγγράφων, αυτόματης ταξινόμησης, OCR metadata και σύνδεσης εγγράφων με εργαζόμενο, όχημα, εξοπλισμό ή εργοτάξιο." addLabel="Νέο έγγραφο" showOcrSection={false} rows={[]} emptyTitle="Μη ακόμη ενεργό" />;
      case 'qr':
        return <QrPage />;
      case 'settings':
        return <GenericListPage title="Ρυθμίσεις" subtitle="Ρόλοι, permissions, access assignments και demo data" addLabel="Νέα ρύθμιση" />;
      default:
        return <DashboardPage site={selectedSite} sites={sites} selectedSiteId={selectedSiteId} onSiteChange={setSelectedSiteId} employees={siteEmployees} vehicles={siteVehicles} trainings={siteTrainings} totalEmployees={employees.length} totalVehicles={vehicles.length} onNavigate={setPage} />;
    }
  }

  return (
    <AppShell user={currentUser} currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </AppShell>
  );
}
