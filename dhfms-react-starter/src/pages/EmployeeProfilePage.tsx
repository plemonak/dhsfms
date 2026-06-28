import { ArrowLeft, FilePlus2, PenSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatusBadge } from '../components/StatusBadge';
import type { Employee, EvidenceDocument, PpeIssue, TrainingSession } from '../types/models';

type TrainingWorkflowTab = 'new' | 'signatures' | 'history' | 'attendance';

interface Props {
  employee?: Employee;
  employees: Employee[];
  trainings: TrainingSession[];
  documents: EvidenceDocument[];
  ppeIssues: PpeIssue[];
  activeTab: 'ppe' | 'training' | 'medical' | 'licenses';
  onTabChange: (tab: Props['activeTab']) => void;
  onBack: () => void;
  onEdit: () => void;
}

export function EmployeeProfilePage({ employee, employees, trainings, documents, ppeIssues, activeTab, onTabChange, onBack, onEdit }: Props) {
  if (!employee) return <EmptyState title="Δεν βρέθηκε εργαζόμενος" />;
  const employeeTrainings = trainings.filter(t => t.participantIds.includes(employee.id));
  const medicalDocs = documents.filter(d => d.documentType.toLowerCase().includes('ιατρ') || d.documentType.toLowerCase().includes('fit'));
  const licenseDocs = documents.filter(d => d.documentType.toLowerCase().includes('άδεια') || d.documentType.toLowerCase().includes('license'));
  const siteEmployees = employees.filter(candidate => candidate.siteId === employee.siteId);
  const [activeTrainingTab, setActiveTrainingTab] = useState<TrainingWorkflowTab>('new');
  const [topic, setTopic] = useState('Εισαγωγική Εκπαίδευση');
  const [trainerName, setTrainerName] = useState(employee.fullName);
  const [selectedTraineeIds, setSelectedTraineeIds] = useState<number[]>([employee.id]);
  const [attendanceReady, setAttendanceReady] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  useEffect(() => {
    setActiveTrainingTab('new');
    setTopic('Εισαγωγική Εκπαίδευση');
    setTrainerName(employee.fullName);
    setSelectedTraineeIds([employee.id]);
    setAttendanceReady(false);
    setSelectedHistoryId(null);
  }, [employee.id]);

  const selectedHistoryItem = employeeTrainings.find(item => item.id === selectedHistoryId) ?? employeeTrainings[0];

  function toggleTrainee(id: number) {
    setSelectedTraineeIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

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
            <div className="training-workflow">
              <div className="training-subtabs">
                <button className={`tab ${activeTrainingTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTrainingTab('new')}>Νέα Εκπαίδευση</button>
                <button className={`tab ${activeTrainingTab === 'signatures' ? 'active' : ''}`} onClick={() => setActiveTrainingTab('signatures')}>Υπογραφές</button>
                <button className={`tab ${activeTrainingTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTrainingTab('history')}>Λίστα Εκπαιδεύσεων</button>
                <button className={`tab ${activeTrainingTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTrainingTab('attendance')}>Παρουσιολόγιο</button>
              </div>

              {activeTrainingTab === 'new' && (
                <div className="training-grid">
                  <div className="card card-pad">
                    <div className="field">
                      <label className="field-label" htmlFor="training-topic">Θέμα εκπαίδευσης</label>
                      <input id="training-topic" className="field-input" value={topic} onChange={event => setTopic(event.target.value)} />
                    </div>
                    <div className="field" style={{ marginTop: 12 }}>
                      <label className="field-label" htmlFor="trainer-name">Εκπαιδευτής / υπεύθυνος</label>
                      <input id="trainer-name" className="field-input" value={trainerName} onChange={event => setTrainerName(event.target.value)} />
                    </div>
                    <div className="field" style={{ marginTop: 12 }}>
                      <div className="field-label">Εκπαιδευόμενοι</div>
                      <div className="training-chip-list">
                        {siteEmployees.map(person => (
                          <label key={person.id} className="training-chip">
                            <input type="checkbox" checked={selectedTraineeIds.includes(person.id)} onChange={() => toggleTrainee(person.id)} />
                            <span>{person.fullName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="primary-btn" style={{ marginTop: 14 }} onClick={() => setActiveTrainingTab('signatures')}><FilePlus2 size={17} />Αποθήκευση προσχέδιου</button>
                  </div>
                  <div className="card card-pad">
                    <div className="section-title">Προεπισκόπηση</div>
                    <div className="row-subtitle">Επιλεγμένος εργαζόμενος</div>
                    <div className="row-title" style={{ marginTop: 4 }}>{employee.fullName}</div>
                    <div className="row-subtitle" style={{ marginTop: 8 }}>Θέμα: {topic}</div>
                    <div className="row-subtitle">Εκπαιδευτής: {trainerName}</div>
                    <div className="row-subtitle">Συμμετέχοντες: {selectedTraineeIds.length}</div>
                  </div>
                </div>
              )}

              {activeTrainingTab === 'signatures' && (
                <div className="training-grid">
                  <div className="card card-pad">
                    <div className="section-title">Υπογραφές εκπαίδευσης</div>
                    <div className="training-step">
                      <div className="row-main">
                        <div className="row-title">1. Υπογραφή εκπαιδευτή</div>
                        <div className="row-subtitle">{trainerName}</div>
                      </div>
                      <span className="badge Completed">Υπογεγραμμένο</span>
                    </div>
                    <div className="training-step">
                      <div className="row-main">
                        <div className="row-title">2. Υπογραφές εκπαιδευομένων</div>
                        <div className="row-subtitle">{selectedTraineeIds.length} εκπαιδευόμενοι σε αναμονή</div>
                      </div>
                      <span className="badge Pending">Εκκρεμεί</span>
                    </div>
                    <button className="primary-btn" style={{ marginTop: 14 }} onClick={() => { setAttendanceReady(true); setActiveTrainingTab('attendance'); }}><FilePlus2 size={17} />Δημιουργία παρουσιολογίου PDF</button>
                  </div>
                  <div className="card card-pad">
                    <div className="section-title">Επόμενο βήμα</div>
                    <div className="row-subtitle">Μετά τη δημιουργία του παρουσιολογίου, το αρχείο θα είναι διαθέσιμο στο παρόν υποκατάστημα.</div>
                  </div>
                </div>
              )}

              {activeTrainingTab === 'history' && (
                employeeTrainings.length === 0 ? <EmptyState title="Δεν υπάρχουν καταγεγραμμένες εκπαιδεύσεις." subtitle="Η ιστορικότητα για τον επιλεγμένο εργαζόμενο θα εμφανιστεί εδώ." /> : (
                  <div className="training-list">
                    {employeeTrainings.map(training => (
                      <div className="training-item clickable" key={training.id} onClick={() => { setSelectedHistoryId(training.id); setActiveTrainingTab('attendance'); }}>
                        <div className="training-item-title">{training.title}</div>
                        <div className="training-item-meta">
                          <div><strong>Ημερομηνία:</strong> {training.date}</div>
                          <div><strong>Εκπαιδευτής:</strong> {training.trainerName}</div>
                          <div><strong>Κατάσταση:</strong> <StatusBadge status={training.status} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTrainingTab === 'attendance' && (
                selectedHistoryItem ? (
                  <div className="training-grid">
                    <div className="card card-pad">
                      <div className="section-title">Παρουσιολόγιο εκπαίδευσης</div>
                      <div className="row-title">{selectedHistoryItem.title}</div>
                      <div className="row-subtitle" style={{ marginTop: 8 }}>Εργαζόμενος: {employee.fullName}</div>
                      <div className="row-subtitle">Ημερομηνία: {selectedHistoryItem.date}</div>
                      <div className="row-subtitle">Εκπαιδευτής: {selectedHistoryItem.trainerName}</div>
                      <div className="row-subtitle">Κατάσταση: <StatusBadge status={selectedHistoryItem.status} /></div>
                    </div>
                    <div className="card card-pad">
                      <div className="section-title">Έτοιμο για PDF</div>
                      <div className="row-subtitle">{attendanceReady ? 'Το attendance form δημιουργήθηκε και είναι έτοιμο για υπογραφή και αποστολή.' : 'Ανοίξτε μια καταχώρηση από το ιστορικό για να προβάλετε το παρουσιολόγιο.'}</div>
                    </div>
                  </div>
                ) : <EmptyState title="Δεν υπάρχει επιλεγμένο παρουσιολόγιο." subtitle="Επιλέξτε μια εκπαίδευση από τη λίστα για να προβάλετε το παρόν αρχείο." />
              )}
            </div>
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
