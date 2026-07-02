import { AlertTriangle, Building2, Car, ClipboardCheck, HardHat, Search, ShieldAlert, Users, Wrench } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { ModuleTile } from '../components/ModuleTile';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SiteContextBar } from '../components/SiteContextBar';
import { StatusBadge } from '../components/StatusBadge';
import type { Employee, PageKey, PpeAssignment, PpeIssue, Site, SpecialtyMatrixEntry, TrainingSession, Vehicle } from '../types/models';

interface Props {
  site?: Site;
  sites: Site[];
  selectedSiteId: number | 'all';
  employees: Employee[];
  vehicles: Vehicle[];
  trainings: TrainingSession[];
  totalEmployees: number;
  totalVehicles: number;
  ppeIssues: PpeIssue[];
  ppeAssignments: PpeAssignment[];
  specialtyMatrix: SpecialtyMatrixEntry[];
  onNavigate: (page: PageKey) => void;
  onSiteChange: (siteId: number | 'all') => void;
}

const EVERYONE_SPECIALTY = 'όλοι';

function normalizeText(value: string): string {
  return value.normalize('NFC').trim().toLowerCase();
}

export function DashboardPage({
  site,
  sites,
  selectedSiteId,
  employees,
  vehicles,
  trainings,
  totalEmployees,
  totalVehicles,
  ppeIssues,
  ppeAssignments,
  specialtyMatrix,
  onNavigate,
  onSiteChange,
}: Props) {
  const isAllSites = selectedSiteId === 'all';
  const scopeText = isAllSites ? 'σύνολο ΔΥΚΑΤ' : 'στο εργοτάξιο';
  const pendingTrainings = trainings.filter(t => t.status === 'Pending');
  const personnelCount = isAllSites ? totalEmployees : employees.length;
  const vehicleCount = isAllSites ? totalVehicles : vehicles.length;

  // Ασυμφωνίες προτύπων EN: συγκρίνει το πρότυπο που ίσχυε τη στιγμή της χορήγησης (καταγεγραμμένο
  // στο PpeAssignment) με το τρέχον πρότυπο του SpecialtyMatrix για την ειδικότητα/κατηγορία —
  // αν διαφέρουν, το ήδη χορηγημένο ΜΑΠ θεωρείται εκτός συμμόρφωσης.
  function currentStandardFor(employee: Employee, ppeCategory: string): string | undefined {
    const specialties = [...employee.position.split(' / ').map(part => part.trim()).filter(Boolean), EVERYONE_SPECIALTY].map(normalizeText);
    const categoryKey = normalizeText(ppeCategory);
    let best: { standard?: string; specificity: number } | undefined;
    for (const entry of specialtyMatrix) {
      if (normalizeText(entry.ppeCategory) !== categoryKey) continue;
      const specialtyKey = normalizeText(entry.specialty);
      if (!specialties.includes(specialtyKey)) continue;
      const specificity = specialtyKey === normalizeText(EVERYONE_SPECIALTY) ? 0 : 1;
      if (!best || specificity > best.specificity) best = { standard: entry.standard, specificity };
    }
    return best?.standard;
  }

  const employeeIds = new Set(employees.map(e => e.id));
  const issuanceToEmployeeId = new Map(ppeIssues.filter(issue => employeeIds.has(issue.employeeId)).map(issue => [issue.id, issue.employeeId]));

  const standardMismatches = ppeAssignments
    .filter(a => a.status === 'Active' && a.standardAtIssuance)
    .map(a => {
      const employeeId = issuanceToEmployeeId.get(a.issuanceId);
      const employee = employeeId !== undefined ? employees.find(e => e.id === employeeId) : undefined;
      if (!employee) return null;
      const currentStandard = currentStandardFor(employee, a.ppeCategory);
      if (!currentStandard || currentStandard === a.standardAtIssuance) return null;
      return { assignment: a, employee, currentStandard };
    })
    .filter((entry): entry is { assignment: PpeAssignment; employee: Employee; currentStandard: string } => entry !== null);

  return (
    <div className="page">
      <PageHeader title="Κέντρο ελέγχου" subtitle="Γρήγορη εικόνα έργου, προσωπικού, στόλου και εκκρεμοτήτων" />
      <SiteContextBar site={site} sites={sites} selectedSiteId={selectedSiteId} onSiteChange={onSiteChange} />

      <div className="grid four">
        <MetricCard label={`Προσωπικό ${scopeText}`} value={personnelCount} />
        <MetricCard label={`Οχήματα & ΜΕ ${scopeText}`} value={vehicleCount} />
        {isAllSites && <MetricCard label="Εργοτάξια" value={sites.length} />}
        <MetricCard label={`Εκκρεμείς υπογραφές ${scopeText}`} value={pendingTrainings.length} alert={pendingTrainings.length > 0} />
        <MetricCard label="Ασυμφωνίες προτύπων ΜΑΠ (EN)" value={standardMismatches.length} alert={standardMismatches.length > 0} />
      </div>

      <div className="section-title">Ενότητες</div>
      <div className="grid three">
        <ModuleTile icon={<Users />} title="Προσωπικό" subtitle={`${personnelCount} ${scopeText}`} onClick={() => onNavigate('employees')} />
        <ModuleTile icon={<Car />} title="Οχήματα & ΜΕ" subtitle={`${vehicleCount} ${scopeText}`} onClick={() => onNavigate('vehicles')} />
        <ModuleTile icon={<Building2 />} title="Εργοτάξια" subtitle={`${sites.length} ενεργά εργοτάξια`} onClick={() => onNavigate('sites')} />
        <ModuleTile icon={<HardHat />} title="ΜΑΠ" subtitle="Χορηγήσεις και υπογραφές" onClick={() => onNavigate('ppe')} />
        <ModuleTile icon={<Wrench />} title="Εξοπλισμός" subtitle="Εργαλεία, πιστοποιητικά, QR" onClick={() => onNavigate('equipment')} />
        <ModuleTile icon={<Search />} title="Επιθεωρήσεις" subtitle="Φωτογραφίες και ευρήματα" onClick={() => onNavigate('smart-docs')} />
        <ModuleTile icon={<ShieldAlert />} title="Συμβάντα" subtitle="Σε επόμενη φάση" disabled />
        <ModuleTile icon={<ClipboardCheck />} title="Άδειες Εργασίας" subtitle="Σε επόμενη φάση" disabled />
      </div>

      <div className="section-title">Εκκρεμείς Εκπαιδεύσεις</div>
      <SectionCard>
        {pendingTrainings.length === 0 && <div>Δεν υπάρχουν εκκρεμείς εκπαιδεύσεις.</div>}
        {pendingTrainings.map(training => (
          <div key={training.id} className="row clickable" onClick={() => onNavigate('training')}>
            <div className="avatar"><AlertTriangle size={18} /></div>
            <div className="row-main">
              <div className="row-title">{training.title}</div>
              <div className="row-subtitle">{training.trainerName} · {training.date}</div>
            </div>
            <StatusBadge status={training.status} />
          </div>
        ))}
      </SectionCard>

      <div className="section-title">Ασυμφωνίες Προτύπων ΜΑΠ (EN)</div>
      <SectionCard>
        {standardMismatches.length === 0 && <div>Δεν υπάρχουν ασυμφωνίες — όλα τα ενεργά ΜΑΠ πληρούν το τρέχον πρότυπο.</div>}
        {standardMismatches.map(({ assignment, employee, currentStandard }) => (
          <div key={assignment.id} className="row clickable" onClick={() => onNavigate('employees')}>
            <div className="avatar"><ShieldAlert size={18} /></div>
            <div className="row-main">
              <div className="row-title">{employee.fullName} · {assignment.ppeCategory}</div>
              <div className="row-subtitle">Χορηγήθηκε με {assignment.standardAtIssuance}, το τρέχον πρότυπο είναι {currentStandard}</div>
            </div>
            <span className="badge Expired">Ασυμμόρφωση</span>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
