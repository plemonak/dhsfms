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
  employees: Employee[];
  vehicles: Vehicle[];
  trainings: TrainingSession[];
  onNavigate: (page: PageKey) => void;
}

export function DashboardPage({ site, employees, vehicles, trainings, onNavigate }: Props) {
  const pendingTrainings = trainings.filter(t => t.status === 'Pending');

  return (
    <div className="page">
      <PageHeader title="Κέντρο ελέγχου" subtitle="Γρήγορη εικόνα έργου, προσωπικού, στόλου και εκκρεμοτήτων" />
      <SiteContextBar site={site} />

      <div className="grid four">
        <MetricCard label="Προσωπικό" value={employees.length} />
        <MetricCard label="Οχήματα & ΜΕ" value={vehicles.length} />
        <MetricCard label="Εκκρεμείς υπογραφές" value={pendingTrainings.length} alert={pendingTrainings.length > 0} />
        <MetricCard label="Εργοτάξια" value={3} />
      </div>

      <div className="section-title">Ενότητες</div>
      <div className="grid three">
        <ModuleTile icon={<Users />} title="Προσωπικό" subtitle={`${employees.length} εργαζόμενοι`} onClick={() => onNavigate('employees')} />
        <ModuleTile icon={<Car />} title="Οχήματα & ΜΕ" subtitle={`${vehicles.length} οχήματα / μηχανήματα`} onClick={() => onNavigate('vehicles')} />
        <ModuleTile icon={<Building2 />} title="Εργοτάξια" subtitle="Έργα και sites" onClick={() => onNavigate('sites')} />
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
