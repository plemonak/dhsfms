import { AlertTriangle, Building2, Car, ClipboardCheck, HardHat, Search, ShieldAlert, Users, Wrench } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { ModuleTile } from '../components/ModuleTile';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SiteContextBar } from '../components/SiteContextBar';
import { StatusBadge } from '../components/StatusBadge';
import type { Employee, PageKey, Site, TrainingSession, Vehicle } from '../types/models';

interface Props {
  site?: Site;
  sites: Site[];
  selectedSiteId: number | 'all';
  employees: Employee[];
  vehicles: Vehicle[];
  trainings: TrainingSession[];
  totalEmployees: number;
  totalVehicles: number;
  onNavigate: (page: PageKey) => void;
  onSiteChange: (siteId: number | 'all') => void;
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
  onNavigate,
  onSiteChange,
}: Props) {
  const isAllSites = selectedSiteId === 'all';
  const scopeText = isAllSites ? 'σύνολο ΔΥΚΑΤ' : 'στο εργοτάξιο';
  const pendingTrainings = trainings.filter(t => t.status === 'Pending');
  const personnelCount = isAllSites ? totalEmployees : employees.length;
  const vehicleCount = isAllSites ? totalVehicles : vehicles.length;

  return (
    <div className="page">
      <PageHeader title="Κέντρο ελέγχου" subtitle="Γρήγορη εικόνα έργου, προσωπικού, στόλου και εκκρεμοτήτων" />
      <SiteContextBar site={site} sites={sites} selectedSiteId={selectedSiteId} onSiteChange={onSiteChange} />

      <div className="grid four">
        <MetricCard label={`Προσωπικό ${scopeText}`} value={personnelCount} />
        <MetricCard label={`Οχήματα & ΜΕ ${scopeText}`} value={vehicleCount} />
        {isAllSites && <MetricCard label="Εργοτάξια" value={sites.length} />}
        <MetricCard label={`Εκκρεμείς υπογραφές ${scopeText}`} value={pendingTrainings.length} alert={pendingTrainings.length > 0} />
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
    </div>
  );
}
