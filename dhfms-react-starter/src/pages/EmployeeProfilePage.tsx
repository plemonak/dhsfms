import { ArrowLeft, FilePlus2, PenSquare } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatusBadge } from '../components/StatusBadge';
import type { Employee, EvidenceDocument, PpeIssue, TrainingSession } from '../types/models';

interface Props {
  employee?: Employee;
  trainings: TrainingSession[];
  documents: EvidenceDocument[];
  ppeIssues: PpeIssue[];
  activeTab: 'ppe' | 'training' | 'medical' | 'licenses';
  onTabChange: (tab: Props['activeTab']) => void;
  onBack: () => void;
  onEdit: () => void;
  onTraining: () => void;
}

export function EmployeeProfilePage({ employee, trainings, documents, ppeIssues, activeTab, onTabChange, onBack, onEdit, onTraining }: Props) {
  if (!employee) return <EmptyState title="Δεν βρέθηκε εργαζόμενος" />;
  const employeeTrainings = trainings.filter(t => t.participantIds.includes(employee.id));
  const medicalDocs = documents.filter(d => d.documentType.toLowerCase().includes('ιατρ') || d.documentType.toLowerCase().includes('fit'));
  const licenseDocs = documents.filter(d => d.documentType.toLowerCase().includes('άδεια') || d.documentType.toLowerCase().includes('license'));

  return (
    <div className="page">
      <PageHeader
        title="Καρτέλα εργαζομένου"
        subtitle={employee.fullName}
        actions={<button className="secondary-btn" onClick={onBack}><ArrowLeft size={17} />Πίσω</button>}
      />

      <div className="profile-hero">
        <div className="avatar">{employee.lastName[0]}{employee.firstName[0]}</div>
        <div className="row-main">
          <div className="profile-name">{employee.fullName}</div>
          <div className="profile-meta">{employee.position} · {employee.company} · {employee.employeeNo}</div>
        </div>
        <StatusBadge status={employee.status} />
      </div>

      <div style={{ marginTop: 14 }} className="card">
        <div className="tabs">
          <button className={`tab ${activeTab === 'ppe' ? 'active' : ''}`} onClick={() => onTabChange('ppe')}>ΜΑΠ</button>
          <button className={`tab ${activeTab === 'training' ? 'active' : ''}`} onClick={() => onTabChange('training')}>Εκπαιδεύσεις</button>
          <button className={`tab ${activeTab === 'medical' ? 'active' : ''}`} onClick={() => onTabChange('medical')}>Ιατρικά</button>
          <button className={`tab ${activeTab === 'licenses' ? 'active' : ''}`} onClick={() => onTabChange('licenses')}>Άδειες</button>
        </div>
        <div className="card-pad">
          {activeTab === 'ppe' && (
            <>
              <button className="primary-btn"><FilePlus2 size={17} />Νέα χορήγηση ΜΑΠ</button>
              <div style={{ marginTop: 12 }}>
                {ppeIssues.map(issue => <div className="row" key={issue.id}><div className="row-main"><div className="row-title">Χορήγηση ΜΑΠ #{issue.id}</div><div className="row-subtitle">{issue.issueDate} · Εκδόθηκε από {issue.issuedBy}</div></div><StatusBadge status={issue.status} /></div>)}
              </div>
            </>
          )}
          {activeTab === 'training' && (
            <>
              <button className="primary-btn" onClick={onTraining}><FilePlus2 size={17} />Νέα εκπαίδευση</button>
              <div style={{ marginTop: 12 }}>
                {employeeTrainings.map(t => <div className="row" key={t.id}><div className="row-main"><div className="row-title">{t.title}</div><div className="row-subtitle">{t.date} · {t.trainerName}</div></div><StatusBadge status={t.status} /></div>)}
              </div>
            </>
          )}
          {activeTab === 'medical' && medicalDocs.map(d => <div className="row" key={d.id}><div className="row-main"><div className="row-title">{d.documentType}</div><div className="row-subtitle">Λήξη: {d.expiryDate ?? '-'}</div></div><StatusBadge status={d.status} /></div>)}
          {activeTab === 'licenses' && licenseDocs.map(d => <div className="row" key={d.id}><div className="row-main"><div className="row-title">{d.documentType}</div><div className="row-subtitle">Λήξη: {d.expiryDate ?? '-'}</div></div><StatusBadge status={d.status} /></div>)}
        </div>
      </div>

      <SectionCard title="Βασικά στοιχεία">
        <div className="form-grid">
          <div><div className="field-label">Αριθμός εργαζομένου</div><strong>{employee.employeeNo}</strong></div>
          <div><div className="field-label">Κατηγορία</div><strong>{employee.personType}</strong></div>
          <div><div className="field-label">Κινητό</div><strong>{employee.mobile ?? '-'}</strong></div>
          <div><div className="field-label">Email</div><strong>{employee.email ?? '-'}</strong></div>
          <div><div className="field-label">ΑΔΤ / Διαβατήριο / ΑΦΜ</div><strong>{employee.idOrTaxNo ?? '-'}</strong></div>
        </div>
      </SectionCard>

      <div className="footer-actions">
        <button className="secondary-btn" onClick={onEdit}><PenSquare size={17} />Επεξεργασία</button>
      </div>
    </div>
  );
}
