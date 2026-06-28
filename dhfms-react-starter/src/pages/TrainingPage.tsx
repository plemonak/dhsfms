import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { MetricCard } from '../components/MetricCard';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import type { Employee, EvidenceDocument, TrainingSession } from '../types/models';

type TrainingSection = 'assignments' | 'sessions' | 'attendance' | 'evidence';

interface Props {
  trainings: TrainingSession[];
  employees: Employee[];
  documents?: EvidenceDocument[];
}

function getEmployeeName(employeeId: number, employees: Employee[]) {
  return employees.find(employee => employee.id === employeeId)?.fullName ?? 'Εργαζόμενος προς ορισμό';
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TrainingPage({ trainings, employees, documents = [] }: Props) {
  const [activeSection, setActiveSection] = useState<TrainingSection>('sessions');

  const pendingAssignments = useMemo(() => trainings.filter(training => training.status === 'Pending'), [trainings]);
  const scheduledSessions = useMemo(() => trainings.filter(training => training.status !== 'Expired' && training.status !== 'Missing'), [trainings]);
  const attendanceToReview = useMemo(() => trainings.filter(training => training.status === 'Pending').length, [trainings]);
  const evidenceCount = useMemo(() => documents.filter(document => document.entityType === 'training').length, [documents]);

  const assignmentCards = trainings.map(training => ({
    id: training.id,
    title: training.title,
    group: `${training.participantIds.length} εργαζόμενοι`,
    responsible: training.trainerName,
    deadline: formatDate(training.date),
    status: training.status,
  }));

  const sessionCards = trainings.map(training => ({
    id: training.id,
    title: training.title,
    date: formatDate(training.date),
    trainer: training.trainerName,
    participants: `${training.participantIds.length} συμμετέχοντες`,
    status: training.status,
  }));

  const attendanceCards = trainings.map(training => ({
    id: training.id,
    training: training.title,
    employee: getEmployeeName(training.participantIds[0] ?? 0, employees),
    attendance: training.status === 'Pending' ? 'Προς έλεγχο' : 'Παρουσία',
    evaluation: training.status === 'Completed' ? 'Αξιολόγηση: 4/5' : 'Δεν έχει αξιολογηθεί',
    status: training.status,
  }));

  const evidenceCards = documents.filter(document => document.entityType === 'training').map(document => ({
    id: document.id,
    title: document.documentType,
    type: `${document.documentType} · PDF`,
    date: formatDate(document.issueDate ?? ''),
    reviewStatus: document.status === 'Pending' ? 'Προς έλεγχο' : 'Εγκεκριμένο',
    actionLabel: 'Προβολή',
  }));

  const sectionContent: Record<TrainingSection, React.ReactNode> = {
    assignments: assignmentCards.length === 0 ? (
      <EmptyState title="Δεν υπάρχουν αναθέσεις εκπαίδευσης." subtitle="Η λίστα θα συμπληρωθεί όταν προστεθούν νέες αναθέσεις." />
    ) : (
      <div className="training-list">
        {assignmentCards.map(card => (
          <div className="training-item" key={card.id}>
            <div className="training-item-title">{card.title}</div>
            <div className="training-item-meta">
              <div><strong>Ομάδα / εργαζόμενοι:</strong> {card.group}</div>
              <div><strong>Υπεύθυνος:</strong> {card.responsible}</div>
              <div><strong>Προθεσμία:</strong> {card.deadline}</div>
              <div><strong>Κατάσταση:</strong> <StatusBadge status={card.status} /></div>
            </div>
          </div>
        ))}
      </div>
    ),
    sessions: sessionCards.length === 0 ? (
      <EmptyState title="Δεν υπάρχουν προγραμματισμένες εκπαιδεύσεις." subtitle="Οι μελλοντικές συνεδρίες θα εμφανιστούν εδώ." />
    ) : (
      <div className="training-list">
        {sessionCards.map(card => (
          <div className="training-item" key={card.id}>
            <div className="training-item-title">{card.title}</div>
            <div className="training-item-meta">
              <div><strong>Ημερομηνία:</strong> {card.date}</div>
              <div><strong>Εκπαιδευτής:</strong> {card.trainer}</div>
              <div><strong>Συμμετέχοντες:</strong> {card.participants}</div>
              <div><strong>Κατάσταση:</strong> <StatusBadge status={card.status} /></div>
            </div>
          </div>
        ))}
      </div>
    ),
    attendance: attendanceCards.length === 0 ? (
      <EmptyState title="Δεν υπάρχουν παρουσίες προς εμφάνιση." subtitle="Η λίστα συμμετοχών θα ενημερωθεί όταν ολοκληρωθούν οι συνεδρίες." />
    ) : (
      <div className="training-list">
        {attendanceCards.map(card => (
          <div className="training-item" key={card.id}>
            <div className="training-item-title">{card.training}</div>
            <div className="training-item-meta">
              <div><strong>Εργαζόμενος:</strong> {card.employee}</div>
              <div><strong>Υπογραφή / παρουσία:</strong> {card.attendance}</div>
              <div><strong>Αξιολόγηση:</strong> {card.evaluation}</div>
              <div><strong>Κατάσταση:</strong> <StatusBadge status={card.status} /></div>
            </div>
          </div>
        ))}
      </div>
    ),
    evidence: evidenceCards.length === 0 ? (
      <EmptyState title="Δεν υπάρχουν αποδεικτικά προς εμφάνιση." subtitle="Τα αποδεικτικά εκπαίδευσης θα εμφανιστούν εδώ όταν προστεθούν." />
    ) : (
      <div className="training-list">
        {evidenceCards.map(card => (
          <div className="training-item" key={card.id}>
            <div className="training-item-title">{card.title}</div>
            <div className="training-item-meta">
              <div><strong>Τύπος αρχείου:</strong> {card.type}</div>
              <div><strong>Ημερομηνία:</strong> {card.date}</div>
              <div><strong>Κατάσταση ελέγχου:</strong> {card.reviewStatus}</div>
              <div><strong>Ενέργεια:</strong> <button className="secondary-btn training-view-btn">{card.actionLabel}</button></div>
            </div>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div className="page">
      <PageHeader title="Εκπαιδεύσεις" subtitle="Αναθέσεις, συνεδρίες, παρουσίες και αποδεικτικά εκπαίδευσης" />
      <div className="grid training-kpis">
        <MetricCard label="Εκκρεμείς αναθέσεις" value={pendingAssignments.length} alert={pendingAssignments.length > 0} />
        <MetricCard label="Προγραμματισμένες συνεδρίες" value={scheduledSessions.length} />
        <MetricCard label="Παρουσίες προς έλεγχο" value={attendanceToReview} alert={attendanceToReview > 0} />
        <MetricCard label="Αποδεικτικά εκπαίδευσης" value={evidenceCount} />
      </div>
      <div className="card">
        <div className="tabs training-tabs">
          <button className={`tab ${activeSection === 'assignments' ? 'active' : ''}`} onClick={() => setActiveSection('assignments')}>Αναθέσεις</button>
          <button className={`tab ${activeSection === 'sessions' ? 'active' : ''}`} onClick={() => setActiveSection('sessions')}>Συνεδρίες</button>
          <button className={`tab ${activeSection === 'attendance' ? 'active' : ''}`} onClick={() => setActiveSection('attendance')}>Παρουσίες</button>
          <button className={`tab ${activeSection === 'evidence' ? 'active' : ''}`} onClick={() => setActiveSection('evidence')}>Αποδεικτικά</button>
        </div>
        <div className="card-pad training-panel">
          {sectionContent[activeSection]}
        </div>
      </div>
    </div>
  );
}
