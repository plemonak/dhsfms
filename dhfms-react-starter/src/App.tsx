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
  const [profileTab, setProfileTab] = useState<'ppe' | 'training' | 'medical' | 'licenses'>('ppe');
  const [selectedSiteId] = useState(2);

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

  const selectedSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);
  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmployeeId), [employees, selectedEmployeeId]);
  const siteEmployees = useMemo(() => employees.filter(e => e.siteId === selectedSiteId), [employees, selectedSiteId]);
  const siteVehicles = useMemo(() => vehicles.filter(v => v.siteId === selectedSiteId), [vehicles, selectedSiteId]);
  const siteTrainings = useMemo(() => trainings.filter(t => t.siteId === selectedSiteId), [trainings, selectedSiteId]);

  async function handleCreateEmployee(employee: Omit<Employee, 'id' | 'fullName'>) {
    const created = await dataProvider.createEmployee(employee);
    setEmployees(await dataProvider.getEmployees());
    setSelectedEmployeeId(created.id);
    setPage('employee-profile');
  }

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <DashboardPage site={selectedSite} employees={siteEmployees} vehicles={siteVehicles} trainings={siteTrainings} onNavigate={setPage} />;
      case 'employees':
        return <EmployeesPage employees={employees} onOpen={(id) => { setSelectedEmployeeId(id); setProfileTab('ppe'); setPage('employee-profile'); }} onNew={() => setPage('employee-form')} />;
      case 'employee-profile':
        return <EmployeeProfilePage employee={selectedEmployee} trainings={trainings} documents={documents.filter(d => d.entityType === 'employee' && d.entityId === selectedEmployeeId)} ppeIssues={ppeIssues.filter(p => p.employeeId === selectedEmployeeId)} activeTab={profileTab} onTabChange={setProfileTab} onBack={() => setPage('employees')} onEdit={() => setPage('employee-form')} onTraining={() => setPage('training')} />;
      case 'employee-form':
        return <EmployeeFormPage onBack={() => setPage(selectedEmployeeId ? 'employee-profile' : 'employees')} onSave={handleCreateEmployee} />;
      case 'training':
        return <SignaturePage />;
      case 'ppe':
        return <GenericListPage title="Χορηγήσεις ΜΑΠ" subtitle="ΜΑΠ, υπογραφές εργαζομένου και εκδότη" addLabel="Νέα χορήγηση" rows={ppeIssues.map(p => ({ id: p.id, title: `Χορήγηση ΜΑΠ #${p.id}`, subtitle: p.issueDate, status: p.status }))} />;
      case 'medical':
        return <EvidencePage title="Ιατρικές βεβαιώσεις" subtitle="Fit to work, λήξεις και τεκμήρια" />;
      case 'licenses':
        return <EvidencePage title="Άδειες / Πιστοποιήσεις" subtitle="Άδειες εργαζομένων, πιστοποιήσεις και λήξεις" />;
      case 'vehicles':
        return <GenericListPage title="Οχήματα & Μηχανήματα" subtitle="Στόλος, έγγραφα, ασφάλειες, ΚΤΕΟ" addLabel="Νέο όχημα" rows={vehicles.map(v => ({ id: v.id, title: `${v.plate} · ${v.type}`, subtitle: `${v.code} · ${v.owner}`, status: v.status }))} />;
      case 'equipment':
        return <GenericListPage title="Εξοπλισμός" subtitle="Εργαλεία, πιστοποιητικά, QR και έλεγχοι" addLabel="Νέο στοιχείο" />;
      case 'sites':
        return <GenericListPage title="Εργοτάξια" subtitle="Έργα, sites και συντεταγμένες" addLabel="Νέο εργοτάξιο" rows={sites.map(s => ({ id: s.id, title: s.name, subtitle: s.phase, status: s.status }))} />;
      case 'contractors':
        return <GenericListPage title="Υπεργολάβοι" subtitle="Εταιρείες, έγκριση και στοιχεία επικοινωνίας" addLabel="Νέος υπεργολάβος" />;
      case 'smart-docs':
        return <EvidencePage title="Smart Document Capture" subtitle="Demo OCR, review πεδίων και τεκμήρια" />;
      case 'qr':
        return <QrPage />;
      case 'settings':
        return <GenericListPage title="Ρυθμίσεις" subtitle="Ρόλοι, permissions, access assignments και demo data" addLabel="Νέα ρύθμιση" />;
      default:
        return <DashboardPage site={selectedSite} employees={siteEmployees} vehicles={siteVehicles} trainings={siteTrainings} onNavigate={setPage} />;
    }
  }

  return (
    <AppShell user={currentUser} currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </AppShell>
  );
}
