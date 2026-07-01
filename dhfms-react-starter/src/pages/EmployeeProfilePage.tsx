import { ArrowLeft, FilePlus2, PenSquare } from 'lucide-react';
import type { EquipmentItem, PpeCatalogItem, TrainingTopic } from '../types/models';
import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SignaturePad } from '../components/SignaturePad';
import { StatusBadge } from '../components/StatusBadge';
import { QrPreviewModal } from '../components/QrPreviewModal';
import { dataProvider } from '../services/dataProvider';
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
  const [ppeSignature, setPpeSignature] = useState<string | null>(null);
  const [trainingSignature, setTrainingSignature] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [projectStaff, setProjectStaff] = useState<Array<{ id: number; displayName: string; responsibleName?: string; title?: string }>>([]);
  const [trainingTopics, setTrainingTopics] = useState<TrainingTopic[]>([]);
  const [ppeCatalog, setPpeCatalog] = useState<PpeCatalogItem[]>([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState<EquipmentItem[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);
  const [trainingMaterialUrl, setTrainingMaterialUrl] = useState('https://example.com/training-material.pdf');
  const [trainingStatus, setTrainingStatus] = useState<'Εκκρεμής' | 'Ολοκληρωμένη'>('Εκκρεμής');
  const [trainingPdfUrl, setTrainingPdfUrl] = useState<string | null>(null);
  const [traineeSignedIds, setTraineeSignedIds] = useState<number[]>([]);
  const [ppeWorkflowOpen, setPpeWorkflowOpen] = useState(false);
  const [selectedPpeItems, setSelectedPpeItems] = useState<number[]>([]);
  const [ppePdfUrl, setPpePdfUrl] = useState<string | null>(null);
  const [equipmentWorkflowOpen, setEquipmentWorkflowOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [equipmentIssueDate, setEquipmentIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [equipmentAssignmentPdfUrl, setEquipmentAssignmentPdfUrl] = useState<string | null>(null);
  const [equipmentIssuerSignature, setEquipmentIssuerSignature] = useState<string | null>(null);
  const [employeeSignature, setEmployeeSignature] = useState<string | null>(null);

  useEffect(() => {
    setActiveTrainingTab('new');
    setTopic('Εισαγωγική Εκπαίδευση');
    setTrainerName(employee.fullName);
    setSelectedTrainerId(null);
    setSelectedTraineeIds([employee.id]);
    setAttendanceReady(false);
    setSelectedHistoryId(null);
    setTrainingStatus('Εκκρεμής');
    setTrainingPdfUrl(null);
    setTraineeSignedIds([employee.id]);
    void dataProvider.getProjectStaff(employee.siteId).then(setProjectStaff);
    void dataProvider.getTrainingTopics().then(setTrainingTopics);
    void dataProvider.getPpeCatalog().then(setPpeCatalog);
    void dataProvider.getEquipmentCatalog(employee.siteId).then(setEquipmentCatalog);
  }, [employee.id, employee.siteId]);

  const selectedHistoryItem = employeeTrainings.find(item => item.id === selectedHistoryId) ?? employeeTrainings[0];

  function toggleTrainee(id: number) {
    setSelectedTraineeIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function togglePpeItem(itemId: number) {
    setSelectedPpeItems(current => current.includes(itemId) ? current.filter(entry => entry !== itemId) : [...current, itemId]);
  }

  function toggleTraineeSignature(id: number) {
    setTraineeSignedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  async function saveTrainingWorkflow() {
    if (!employee) return;
    const nextStatus = traineeSignedIds.length >= selectedTraineeIds.length ? 'Ολοκληρωμένη' : 'Εκκρεμής';
    setTrainingStatus(nextStatus);
    if (trainingSignature) {
      const result = await dataProvider.triggerTrainingPdf({
        trainingSessionId: employee.id,
        trainingTitle: topic,
        trainerName: trainerName,
        trainerSignature: trainingSignature,
        participantsJson: JSON.stringify(selectedTraineeIds),
        pdfFileName: `${employee.employeeNo}-${topic}.pdf`,
      });
      setTrainingPdfUrl(result.pdfUrl);
    }
    setActiveTrainingTab('history');
  }

  async function saveTrainingDraft() {
    if (!employee) return;
    await dataProvider.createTrainingRecord({
      id: Date.now(),
      title: topic,
      date: new Date().toISOString().slice(0, 10),
      trainerName: trainerName,
      siteId: employee.siteId,
      participantIds: selectedTraineeIds,
      status: 'Draft',
      pdfUrl: trainingMaterialUrl,
    });
    setActiveTrainingTab('signatures');
    setTrainingStatus('Εκκρεμής');
  }

  async function savePpeWorkflow() {
    if (!employee) return;
    if (!selectedPpeItems.length || !ppeSignature) return;
    const selectedItems = ppeCatalog.filter(item => selectedPpeItems.includes(item.id));
    const result = await dataProvider.generatePpeIssuePdf({
      employeeId: employee.id,
      employeeName: employee.fullName,
      issueDate: new Date().toISOString().slice(0, 10),
      issuedBy: trainerName,
      siteName: 'Εργοτάξιο demo',
      pdfFileName: `${employee.employeeNo}-ppe.pdf`,
    });
    setPpePdfUrl(result.pdfUrl);
    setPpeWorkflowOpen(false);
    console.info('PPE issue saved for catalog items', selectedItems.map(item => item.ppeType));
  }

  async function saveEquipmentAssignment() {
    if (!employee || !selectedEquipmentId || !equipmentIssuerSignature || !employeeSignature) return;
    const result = await dataProvider.generateEquipmentAssignmentPdf({
      employeeId: employee.id,
      employeeName: employee.fullName,
      issueDate: equipmentIssueDate,
      issuedBy: trainerName,
      siteName: 'Εργοτάξιο demo',
      pdfFileName: `${employee.employeeNo}-equipment-assignment.pdf`,
    });
    setEquipmentAssignmentPdfUrl(result.pdfUrl);
    setEquipmentWorkflowOpen(false);
  }

  async function openEmployeeQr() {
    if (!employee) return;
    const payload = `EMP|${employee.id}|${employee.fullName}`;
    const generated = await dataProvider.generateQr(payload);
    setQrPayload(generated.payload);
    setQrUrl(generated.qrUrl);
    setQrModalOpen(true);
  }

  return (
    <div className="page">
      <PageHeader
        title="Καρτέλα εργαζομένου"
        subtitle={employee.fullName}
        actions={(
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="secondary-btn" type="button" onClick={openEmployeeQr}>QR</button>
            <button className="secondary-btn" onClick={onBack}><ArrowLeft size={17} />Πίσω</button>
          </div>
        )}
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
              <button className="primary-btn" type="button" onClick={() => setPpeWorkflowOpen(prev => !prev)}><FilePlus2 size={17} />Νέα χορήγηση ΜΑΠ</button>
              <button className="primary-btn" type="button" style={{ marginLeft: 8 }} onClick={() => setEquipmentWorkflowOpen(prev => !prev)}><FilePlus2 size={17} />+ Νέα Χρέωση Εξοπλισμού</button>
              {ppeWorkflowOpen && (
                <div className="card card-pad" style={{ marginTop: 12 }}>
                  <div className="section-title">Επιλογή ΜΑΠ</div>
                  {ppeCatalog.map(item => (
                    <div key={item.id} className="card card-pad" style={{ marginTop: 8 }}>
                      <label className="training-chip" style={{ display: 'flex', alignItems: 'center' }}>
                        <input type="checkbox" checked={selectedPpeItems.includes(item.id)} onChange={() => togglePpeItem(item.id)} />
                        <span>{item.ppeType} · {item.model} · {item.size}</span>
                      </label>
                      <div className="row-subtitle" style={{ marginTop: 6 }}>EN: {item.enCertification} · Qty: {item.quantity} · Notes: {item.notes}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <SignaturePad signer={employee.fullName} title="Υπογραφή εκδότη" subtitle="Υπογραφή για τη χορήγηση ΜΑΠ" documentId={`ppe-issuer-${employee.id}`} onSignatureCaptured={({ signatureData }) => setPpeSignature(signatureData)} />
                  </div>
                  <button className="primary-btn" type="button" style={{ marginTop: 12 }} onClick={() => void savePpeWorkflow()} disabled={!selectedPpeItems.length || !ppeSignature}>Αποθήκευση και PDF</button>
                  {ppePdfUrl && <div className="row-subtitle" style={{ marginTop: 8 }}>Το signed PPE PDF είναι έτοιμο: {ppePdfUrl}</div>}
                </div>
              )}
              {equipmentWorkflowOpen && (
                <div className="card card-pad" style={{ marginTop: 12 }}>
                  <div className="section-title">Νέα χρέωση εξοπλισμού</div>
                  <div className="field" style={{ marginTop: 12 }}>
                    <label className="field-label" htmlFor="equipment-select">Εξοπλισμός</label>
                    <select id="equipment-select" className="field-select" value={selectedEquipmentId ?? ''} onChange={event => setSelectedEquipmentId(Number(event.target.value) || null)}>
                      <option value="">Επιλέξτε εξοπλισμό</option>
                      {equipmentCatalog.map(item => <option key={item.id} value={item.id}>{item.name} · {item.serial}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ marginTop: 12 }}>
                    <label className="field-label" htmlFor="equipment-issue-date">Ημερομηνία χρέωσης</label>
                    <input id="equipment-issue-date" className="field-input" type="date" value={equipmentIssueDate} onChange={event => setEquipmentIssueDate(event.target.value)} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <SignaturePad signer={employee.fullName} title="Υπογραφή εκδότη" subtitle="Υπογραφή για τη χρέωση εξοπλισμού" documentId={`equipment-issuer-${employee.id}`} onSignatureCaptured={({ signatureData }) => setEquipmentIssuerSignature(signatureData)} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <SignaturePad signer={employee.fullName} title="Υπογραφή εργαζομένου" subtitle="Υπογραφή για τη χρέωση εξοπλισμού" documentId={`equipment-employee-${employee.id}`} onSignatureCaptured={({ signatureData }) => setEmployeeSignature(signatureData)} />
                  </div>
                  <button className="primary-btn" type="button" style={{ marginTop: 12 }} onClick={() => void saveEquipmentAssignment()} disabled={!selectedEquipmentId || !equipmentIssuerSignature || !employeeSignature}>Αποθήκευση και PDF</button>
                  {equipmentAssignmentPdfUrl && <div className="row-subtitle" style={{ marginTop: 8 }}>Το signed equipment assignment PDF είναι έτοιμο: {equipmentAssignmentPdfUrl}</div>}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                {ppeIssues.map(issue => <div className="row" key={issue.id}><div className="row-main"><div className="row-title">Χορήγηση ΜΑΠ #{issue.id}</div><div className="row-subtitle">{issue.issueDate} · Εκδόθηκε από {issue.issuedBy}</div></div><StatusBadge status={issue.status} /></div>)}
              </div>
              <div style={{ marginTop: 14 }}>
                <SignaturePad
                  signer={employee.fullName}
                  title="Υπογραφή χορήγησης ΜΑΠ"
                  subtitle="Η υπογραφή αποθηκεύεται προσωρινά ως demo record για την επόμενη φάση PDF/upload."
                  documentId={`ppe-${employee.id}`}
                  onSignatureCaptured={({ signatureData }) => setPpeSignature(signatureData)}
                />
                {ppeSignature && <div className="row-subtitle" style={{ marginTop: 8 }}>Η υπογραφή ΜΑΠ αποθηκεύτηκε για το demo record.</div>}
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
                      <select id="training-topic" className="field-select" value={topic} onChange={event => {
                        const selectedTopic = trainingTopics.find(item => item.title === event.target.value);
                        setTopic(event.target.value);
                        setTrainingMaterialUrl(selectedTopic?.materialUrl ?? 'https://example.com/training-material.pdf');
                      }}>
                        <option value="">Επιλέξτε θέμα</option>
                        {trainingTopics.map(item => <option key={item.id} value={item.title}>{item.title}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{ marginTop: 12 }}>
                      <label className="field-label" htmlFor="trainer-name">Εκπαιδευτής / υπεύθυνος</label>
                      <select id="trainer-name" className="field-select" value={selectedTrainerId ?? ''} onChange={event => {
                        const nextId = Number(event.target.value);
                        const selectedPerson = projectStaff.find(person => person.id === nextId);
                        setSelectedTrainerId(nextId || null);
                        setTrainerName(selectedPerson?.responsibleName ?? selectedPerson?.displayName ?? employee.fullName);
                      }}>
                        <option value="">Επιλέξτε υπεύθυνο</option>
                        {projectStaff.map(person => <option key={person.id} value={person.id}>{person.responsibleName ?? person.displayName}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{ marginTop: 12 }}>
                      <div className="field-label">Σχετικό υλικό εκπαίδευσης</div>
                      <a href={trainingMaterialUrl} target="_blank" rel="noreferrer">Άνοιγμα TrainingMaterial PDF</a>
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
                    <button className="primary-btn" style={{ marginTop: 14 }} onClick={() => { void saveTrainingDraft(); }}><FilePlus2 size={17} />Αποθήκευση προσχέδιου</button>
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
                    <div style={{ marginTop: 14 }}>
                      <SignaturePad
                        signer={trainerName}
                        title="Υπογραφή εκπαιδευτή"
                        subtitle="Αποθηκεύστε την υπογραφή για το demo record της εκπαίδευσης."
                        documentId={`training-${employee.id}`}
                        onSignatureCaptured={({ signatureData }) => setTrainingSignature(signatureData)}
                      />
                    </div>
                    <button className="primary-btn" style={{ marginTop: 14 }} onClick={() => { setAttendanceReady(true); void saveTrainingWorkflow(); }}><FilePlus2 size={17} />Δημιουργία παρουσιολογίου PDF</button>
                  </div>
                  <div className="card card-pad">
                    <div className="section-title">Επόμενο βήμα</div>
                    <div className="row-subtitle">Μετά τη δημιουργία του παρουσιολογίου, το αρχείο θα είναι διαθέσιμο στο παρόν υποκατάστημα.</div>
                    {trainingSignature && <div className="row-subtitle" style={{ marginTop: 8 }}>Η υπογραφή αποθηκεύτηκε για το demo record.</div>}
                  </div>
                </div>
              )}

              {activeTrainingTab === 'history' && (
                employeeTrainings.length === 0 ? <EmptyState title="Δεν υπάρχουν καταγεγραμμένες εκπαιδεύσεις." subtitle="Η ιστορικότητα για τον επιλεγμένο εργαζόμενο θα εμφανιστεί εδώ." /> : (
                  <div className="training-list">
                    {employeeTrainings.map(training => (
                      <div className="training-item clickable" key={training.id} onClick={() => { setSelectedHistoryId(training.id); setActiveTrainingTab('attendance'); window.open(training.pdfUrl ?? '#', '_blank', 'noopener,noreferrer'); }}>
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
          <div><div className="field-label">Εταιρεία</div><strong>{employee.contractor ?? employee.company}</strong></div>
          <div><div className="field-label">Κινητό</div><strong>{employee.mobile ?? '-'}</strong></div>
          <div><div className="field-label">Email</div><strong>{employee.email ?? '-'}</strong></div>
          <div><div className="field-label">ΑΔΤ / Διαβατήριο</div><strong>{employee.identityDocumentNo ?? employee.idOrTaxNo ?? '-'}</strong></div>
          <div><div className="field-label">ΑΦΜ</div><strong>{employee.taxNumber ?? '-'}</strong></div>
          <div><div className="field-label">Πατρώνυμο</div><strong>{employee.fatherName ?? '-'}</strong></div>
          <div><div className="field-label">Ημερομηνία γέννησης</div><strong>{employee.birthDate ?? '-'}</strong></div>
          <div><div className="field-label">Λήξη ταυτότητας/διαβατηρίου</div><strong>{employee.identityExpiryDate ?? '-'}</strong></div>
        </div>
      </SectionCard>

      <div className="footer-actions">
        <button className="secondary-btn" onClick={onEdit}><PenSquare size={17} />Επεξεργασία</button>
      </div>
      <QrPreviewModal open={qrModalOpen} title={employee.fullName} subtitle="QR εργαζομένου για έλεγχο και εκτύπωση" payload={qrPayload} qrUrl={qrUrl} onClose={() => setQrModalOpen(false)} />
    </div>
  );
}
