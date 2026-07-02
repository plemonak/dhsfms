import { ArrowLeft, FilePlus2, FileText, PenSquare } from 'lucide-react';
import type { EquipmentItem, PpeAssignment, SpecialtyMatrixEntry, TrainingTopic } from '../types/models';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { GreekDateInput } from '../components/GreekDateInput';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SignaturePad } from '../components/SignaturePad';
import { StatusBadge } from '../components/StatusBadge';
import { QrPreviewModal } from '../components/QrPreviewModal';
import { dataProvider } from '../services/dataProvider';
import { currentUser } from '../data/mockData';
import type { Employee, EvidenceDocument, PpeIssue, Site, TrainingSession } from '../types/models';

type TrainingWorkflowTab = 'new' | 'signatures' | 'history' | 'attendance';

interface Props {
  employee?: Employee;
  employees: Employee[];
  sites: Site[];
  trainings: TrainingSession[];
  documents: EvidenceDocument[];
  ppeIssues: PpeIssue[];
  onPpeIssuesChanged: () => void;
  activeTab: 'ppe' | 'training' | 'medical' | 'licenses';
  onTabChange: (tab: Props['activeTab']) => void;
  onBack: () => void;
  onEdit: () => void;
}

const EVERYONE_SPECIALTY = 'όλοι';

// Το SharePoint κρατάει σταθερές αγγλικές τιμές (για μελλοντική πολυγλωσσική υποστήριξη) —
// εδώ γίνεται μόνο η μετάφραση εμφάνισης.
const PPE_ASSIGNMENT_STATUS_LABELS: Record<PpeAssignment['status'], string> = {
  Active: 'Ενεργό',
  Replaced: 'Αντικαταστάθηκε',
  Lost: 'Απώλεια',
  Damaged: 'Φθορά',
  Returned: 'Επιστράφηκε',
  Cancelled: 'Ακυρώθηκε',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatGreekDate(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildPpeFileNamePrefix(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyymmdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const hhmmss = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${yyyymmdd}-${hhmmss}`;
}

export function EmployeeProfilePage({ employee, employees, sites, trainings, documents, ppeIssues, onPpeIssuesChanged, activeTab, onTabChange, onBack, onEdit }: Props) {
  if (!employee) return <EmptyState title="Δεν βρέθηκε εργαζόμενος" />;
  const employeeSite = sites.find(site => site.id === employee.siteId);
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
  const [equipmentCatalog, setEquipmentCatalog] = useState<EquipmentItem[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);
  const [trainingMaterialUrl, setTrainingMaterialUrl] = useState('https://example.com/training-material.pdf');
  const [trainingStatus, setTrainingStatus] = useState<'Εκκρεμής' | 'Ολοκληρωμένη'>('Εκκρεμής');
  const [trainingPdfUrl, setTrainingPdfUrl] = useState<string | null>(null);
  const [traineeSignedIds, setTraineeSignedIds] = useState<number[]>([]);
  const [ppeWorkflowOpen, setPpeWorkflowOpen] = useState(false);
  const [selectedPpeCategoryKeys, setSelectedPpeCategoryKeys] = useState<string[]>([]);
  const [ppeItemDetails, setPpeItemDetails] = useState<Record<string, { model: string; size: string; expiryDate: string }>>({});
  const [ppePdfUrl, setPpePdfUrl] = useState<string | null>(null);
  const [ppeEmployeeSignature, setPpeEmployeeSignature] = useState<string | null>(null);
  const [selectedIssuerId, setSelectedIssuerId] = useState<number | null>(null);
  const [specialtyMatrix, setSpecialtyMatrix] = useState<SpecialtyMatrixEntry[]>([]);
  const [ppeAssignments, setPpeAssignments] = useState<PpeAssignment[]>([]);
  const [updatingPpeAssignmentId, setUpdatingPpeAssignmentId] = useState<number | null>(null);
  const [showInactivePpe, setShowInactivePpe] = useState(false);
  const [ppeToast, setPpeToast] = useState<string | null>(null);
  const [pendingPpeStatusChange, setPendingPpeStatusChange] = useState<{ id: number; status: PpeAssignment['status']; category: string } | null>(null);
  const [mandatoryReissueCategory, setMandatoryReissueCategory] = useState<string | null>(null);
  const reissueTargetKeyRef = useRef<string | null>(null);
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
    void dataProvider.getEquipmentCatalog(employee.siteId).then(setEquipmentCatalog);
    void dataProvider.getSpecialtyMatrix().then(setSpecialtyMatrix);
    void dataProvider.getPpeAssignments(employee.id).then(setPpeAssignments);
  }, [employee.id, employee.siteId]);

  async function refreshPpeAssignments() {
    if (!employee) return;
    setPpeAssignments(await dataProvider.getPpeAssignments(employee.id));
  }

  // Κανονικοποίηση Unicode (NFC) πριν τη σύγκριση — τα ελληνικά με τόνο μπορεί να έρθουν από το
  // SharePoint σε διαφορετική (αποσυντεθειμένη) μορφή που φαίνεται ίδια αλλά δεν ταιριάζει σε ===.
  function normalizeText(value: string): string {
    return value.normalize('NFC').trim().toLowerCase();
  }

  // Ειδικότητες του εργαζομένου (το Position μπορεί να έχει πάνω από μία, χωρισμένες με " / "),
  // συν το "όλοι" που ισχύει για κάθε εργαζόμενο στο εργοτάξιο.
  const employeeSpecialties = [
    ...employee.position.split(' / ').map(part => part.trim()).filter(Boolean),
    EVERYONE_SPECIALTY,
  ].map(normalizeText);

  // Οι κατηγορίες ΜΑΠ έρχονται απευθείας από το SpecialtyMatrix (όχι από ξεχωριστό κατάλογο) —
  // το EN πρότυπο εξαρτάται από ειδικότητα, οπότε προτιμάμε την πιο συγκεκριμένη αντιστοίχιση
  // (π.χ. "Χειριστής" αντί για το γενικό "Όλοι") όταν υπάρχουν και οι δύο.
  const ppeCategoryOptions = (() => {
    const everyoneKey = normalizeText(EVERYONE_SPECIALTY);
    const byKey = new Map<string, { key: string; category: string; standard?: string; mandatory: boolean; specificity: number }>();
    for (const entry of specialtyMatrix) {
      const specialtyKey = normalizeText(entry.specialty);
      if (!employeeSpecialties.includes(specialtyKey)) continue;
      const key = normalizeText(entry.ppeCategory);
      const specificity = specialtyKey === everyoneKey ? 0 : 1;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { key, category: entry.ppeCategory, standard: entry.standard, mandatory: entry.isMandatory, specificity });
      } else {
        existing.mandatory = existing.mandatory || entry.isMandatory;
        if (specificity > existing.specificity) {
          existing.category = entry.ppeCategory;
          existing.standard = entry.standard;
          existing.specificity = specificity;
        }
      }
    }
    return Array.from(byKey.values());
  })();
  const mandatoryPpeOptions = ppeCategoryOptions.filter(o => o.mandatory);
  const optionalPpeOptions = ppeCategoryOptions.filter(o => !o.mandatory);
  const selectedIssuer = projectStaff.find(person => person.id === selectedIssuerId);
  const selectedIssuerName = selectedIssuer?.displayName ?? selectedIssuer?.title ?? '';

  useEffect(() => {
    if (ppeWorkflowOpen) {
      if (reissueTargetKeyRef.current) {
        setSelectedPpeCategoryKeys([reissueTargetKeyRef.current]);
        reissueTargetKeyRef.current = null;
      } else {
        setSelectedPpeCategoryKeys(mandatoryPpeOptions.map(o => o.key));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ppeWorkflowOpen, specialtyMatrix]);

  function togglePpeCategory(key: string) {
    setSelectedPpeCategoryKeys(current => current.includes(key) ? current.filter(entry => entry !== key) : [...current, key]);
  }

  function updatePpeItemDetail(key: string, field: 'model' | 'size' | 'expiryDate', value: string) {
    setPpeItemDetails(current => ({
      ...current,
      [key]: {
        model: current[key]?.model ?? '',
        size: current[key]?.size ?? '',
        expiryDate: current[key]?.expiryDate ?? '',
        [field]: value,
      },
    }));
  }

  const selectedHistoryItem = employeeTrainings.find(item => item.id === selectedHistoryId) ?? employeeTrainings[0];

  function toggleTrainee(id: number) {
    setSelectedTraineeIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
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
    if (!selectedPpeCategoryKeys.length || !ppeSignature || !ppeEmployeeSignature || !selectedIssuerId) return;
    const issuer = projectStaff.find(person => person.id === selectedIssuerId);
    const issuerName = issuer?.displayName ?? issuer?.title ?? `Στέλεχος #${selectedIssuerId}`;
    const selectedOptions = ppeCategoryOptions.filter(o => selectedPpeCategoryKeys.includes(o.key));
    const ppeItemsSummary = selectedOptions
      .map(o => {
        const detail = ppeItemDetails[o.key];
        const extra = [detail?.model, detail?.size].filter(Boolean).join(' · ');
        return `${o.category}${o.standard ? ` (${o.standard})` : ''}${extra ? ` - ${extra}` : ''}`;
      })
      .join(', ');
    const ppeItemsHtml = selectedOptions
      .map(o => {
        const detail = ppeItemDetails[o.key];
        return `<tr><td>${escapeHtml(o.category)}</td><td>${o.standard ? escapeHtml(o.standard) : '-'}</td><td>${escapeHtml(detail?.model || '-')}</td><td>${escapeHtml(detail?.size || '-')}</td></tr>`;
      })
      .join('');

    const createdIssue = await dataProvider.createPpeIssue({
      employeeId: employee.id,
      employeeName: employee.fullName,
      siteId: employee.siteId,
      issuedById: selectedIssuerId,
      issuedByName: issuerName,
      ppeItemsSummary,
    });

    await Promise.all(selectedOptions.map(o => {
      const detail = ppeItemDetails[o.key];
      return dataProvider.createPpeAssignment({
        issuanceId: createdIssue.id,
        ppeCategory: o.category,
        ppeModel: detail?.model || undefined,
        quantity: 1,
        expiryDate: detail?.expiryDate || undefined,
      });
    }));

    const result = await dataProvider.generatePpeIssuePdf({
      employeeId: employee.id,
      employeeName: employee.fullName,
      employeeNo: employee.employeeNo,
      issueDate: new Date().toISOString().slice(0, 10),
      issuedBy: issuerName,
      siteName: employeeSite?.name ?? '-',
      pdfFileName: `${buildPpeFileNamePrefix()}-ppe-${employee.fullName}.pdf`,
      ppeItemsSummary,
      ppeItemsHtml,
      issuerSignatureBase64: ppeSignature,
      employeeSignatureBase64: ppeEmployeeSignature,
      ppeIssueId: createdIssue.id,
    });
    if (result.pdfUrl && result.pdfUrl !== '#') {
      await dataProvider.attachPpeIssuePdf(createdIssue.id, result.pdfUrl);
    }
    setPpePdfUrl(result.pdfUrl);
    setPpeWorkflowOpen(false);
    setSelectedPpeCategoryKeys([]);
    setPpeItemDetails({});
    setPpeSignature(null);
    setPpeEmployeeSignature(null);
    setSelectedIssuerId(null);
    onPpeIssuesChanged();
    void refreshPpeAssignments();
  }

  async function applyPpeAssignmentStatus(id: number, status: PpeAssignment['status'], category: string) {
    setUpdatingPpeAssignmentId(id);
    try {
      await dataProvider.updatePpeAssignmentStatus(id, status, currentUser.displayName);
      await refreshPpeAssignments();
      setPpeToast(`Το ΜΑΠ καταχωρήθηκε ως «${PPE_ASSIGNMENT_STATUS_LABELS[status]}».`);
      setTimeout(() => setPpeToast(null), 3000);
      const isMandatory = mandatoryPpeOptions.some(o => normalizeText(o.category) === normalizeText(category));
      if (isMandatory) setMandatoryReissueCategory(category);
    } finally {
      setUpdatingPpeAssignmentId(null);
    }
  }

  async function saveEquipmentAssignment() {
    if (!employee || !selectedEquipmentId || !equipmentIssuerSignature || !employeeSignature) return;
    const result = await dataProvider.generateEquipmentAssignmentPdf({
      employeeId: employee.id,
      employeeName: employee.fullName,
      issueDate: equipmentIssueDate,
      issuedBy: trainerName,
      siteName: employeeSite?.name ?? '-',
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

  const inactivePpeAssignments = ppeAssignments.filter(a => a.status !== 'Active');
  const activePpeAssignments = ppeAssignments.filter(a => a.status === 'Active');
  const visiblePpeAssignments = showInactivePpe ? ppeAssignments : activePpeAssignments;

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
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label className="field-label" htmlFor="ppe-issuer-select">Εκδότης</label>
                    <select
                      id="ppe-issuer-select"
                      className="field-select"
                      value={selectedIssuerId ?? ''}
                      onChange={event => setSelectedIssuerId(event.target.value ? Number(event.target.value) : null)}
                    >
                      <option value="">-- Επιλογή --</option>
                      {projectStaff.map(person => (
                        <option key={person.id} value={person.id}>{person.displayName ?? person.title ?? `Στέλεχος #${person.id}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="section-title">Υποχρεωτικά ΜΑΠ (βάσει ειδικότητας)</div>
                  {mandatoryPpeOptions.length === 0 && <div className="row-subtitle">Δεν βρέθηκαν υποχρεωτικά ΜΑΠ για την ειδικότητα «{employee.position}».</div>}
                  {mandatoryPpeOptions.map(option => (
                    <div key={option.key} className="card card-pad" style={{ marginTop: 8 }}>
                      <label className="training-chip" style={{ display: 'flex', alignItems: 'center' }}>
                        <input type="checkbox" checked={selectedPpeCategoryKeys.includes(option.key)} onChange={() => togglePpeCategory(option.key)} />
                        <span>{option.category}{option.standard ? ` · ${option.standard}` : ''}</span>
                      </label>
                      {selectedPpeCategoryKeys.includes(option.key) && (
                        <div className="form-grid" style={{ marginTop: 8 }}>
                          <input className="field-input" style={{ minHeight: 32, padding: '6px 10px' }} type="text" placeholder="Μοντέλο (προαιρετικά)" value={ppeItemDetails[option.key]?.model ?? ''} onChange={e => updatePpeItemDetail(option.key, 'model', e.target.value)} />
                          <input className="field-input" style={{ minHeight: 32, padding: '6px 10px' }} type="text" placeholder="Νούμερο/Μέγεθος (προαιρετικά)" value={ppeItemDetails[option.key]?.size ?? ''} onChange={e => updatePpeItemDetail(option.key, 'size', e.target.value)} />
                          <label className="field-label" style={{ fontSize: 12 }}>Ημερομηνία λήξης</label>
                          <GreekDateInput value={ppeItemDetails[option.key]?.expiryDate ?? ''} onChange={value => updatePpeItemDetail(option.key, 'expiryDate', value)} />
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="section-title" style={{ marginTop: 16 }}>Προαιρετικά ΜΑΠ</div>
                  {optionalPpeOptions.map(option => (
                    <div key={option.key} className="card card-pad" style={{ marginTop: 8 }}>
                      <label className="training-chip" style={{ display: 'flex', alignItems: 'center' }}>
                        <input type="checkbox" checked={selectedPpeCategoryKeys.includes(option.key)} onChange={() => togglePpeCategory(option.key)} />
                        <span>{option.category}{option.standard ? ` · ${option.standard}` : ''}</span>
                      </label>
                      {selectedPpeCategoryKeys.includes(option.key) && (
                        <div className="form-grid" style={{ marginTop: 8 }}>
                          <input className="field-input" style={{ minHeight: 32, padding: '6px 10px' }} type="text" placeholder="Μοντέλο (προαιρετικά)" value={ppeItemDetails[option.key]?.model ?? ''} onChange={e => updatePpeItemDetail(option.key, 'model', e.target.value)} />
                          <input className="field-input" style={{ minHeight: 32, padding: '6px 10px' }} type="text" placeholder="Νούμερο/Μέγεθος (προαιρετικά)" value={ppeItemDetails[option.key]?.size ?? ''} onChange={e => updatePpeItemDetail(option.key, 'size', e.target.value)} />
                          <label className="field-label" style={{ fontSize: 12 }}>Ημερομηνία λήξης</label>
                          <GreekDateInput value={ppeItemDetails[option.key]?.expiryDate ?? ''} onChange={value => updatePpeItemDetail(option.key, 'expiryDate', value)} />
                        </div>
                      )}
                    </div>
                  ))}
                  <SectionCard title="Δήλωση Εκδότη">
                    Ως εκδότης, βεβαιώνω ότι χορήγησα τα ανωτέρω ΜΑΠ στον εργαζόμενο και τον ενημέρωσα για τη σωστή χρήση, συντήρηση και αποθήκευσή τους.
                  </SectionCard>
                  <div style={{ marginTop: 12 }}>
                    <SignaturePad signer={selectedIssuerName || 'Εκδότης'} title="Υπογραφή εκδότη" subtitle="Υπογραφή για τη χορήγηση ΜΑΠ" documentId={`ppe-issuer-${employee.id}`} onSignatureCaptured={({ signatureData }) => setPpeSignature(signatureData)} />
                  </div>
                  <SectionCard title="Δήλωση Εργαζομένου">
                    Εγώ, ο κάτωθι υπογεγραμμένος εργαζόμενος, βεβαιώνω ότι ενημερώθηκα και εκπαιδεύτηκα σχετικά με το πώς και πότε να εφαρμόζω και να χρησιμοποιώ σωστά τα ΜΑΠ μου, καθώς και πώς να τα καθαρίζω, να τα συντηρώ, να τα αποθηκεύω και να τα απορρίπτω. Θα χρησιμοποιώ όλα τα απαιτούμενα για την εργασία μου ΜΑΠ, θα τα επιθεωρώ πριν από τη χρήση, και θα αναφέρω οποιαδήποτε ζημιά στον προϊστάμενο ή τον εργοδότη μου.
                  </SectionCard>
                  <div style={{ marginTop: 12 }}>
                    <SignaturePad signer={employee.fullName} title="Υπογραφή εργαζομένου" subtitle="Υπογραφή για τη χορήγηση ΜΑΠ" documentId={`ppe-employee-${employee.id}`} onSignatureCaptured={({ signatureData }) => setPpeEmployeeSignature(signatureData)} />
                  </div>
                  <button className="primary-btn" type="button" style={{ marginTop: 12 }} onClick={() => void savePpeWorkflow()} disabled={!selectedPpeCategoryKeys.length || !ppeSignature || !ppeEmployeeSignature || !selectedIssuerId}>Αποθήκευση PDF</button>
                </div>
              )}
              {ppePdfUrl && (
                <div className="jsa-selection-summary" style={{ marginTop: 12 }}>
                  Η χορήγηση ΜΑΠ αποθηκεύτηκε. <a href={ppePdfUrl} target="_blank" rel="noreferrer">Άνοιγμα PDF</a>
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
                <div className="section-title">ΜΑΠ σε χρήση</div>
                {ppeToast && <div className="toast-banner">{ppeToast}</div>}
                {visiblePpeAssignments.length === 0 && <div className="row-subtitle">Δεν υπάρχουν καταγεγραμμένα ΜΑΠ.</div>}
                {visiblePpeAssignments.map(assignment => (
                  <div className="row" key={assignment.id}>
                    <div className="row-main">
                      <div className="row-title">{assignment.ppeCategory}{assignment.ppeModel ? ` · ${assignment.ppeModel}` : ''}</div>
                      <div className="row-subtitle">
                        {assignment.expiryDate ? `Λήξη: ${formatGreekDate(assignment.expiryDate)}` : 'Χωρίς καταχωρημένη λήξη'}
                      </div>
                    </div>
                    <span className={`badge ${assignment.status}`}>{PPE_ASSIGNMENT_STATUS_LABELS[assignment.status]}</span>
                    {(() => {
                      const relatedPdfUrl = ppeIssues.find(issue => issue.id === assignment.issuanceId)?.pdfUrl;
                      return relatedPdfUrl ? (
                        <a className="icon-btn" href={relatedPdfUrl} target="_blank" rel="noreferrer" title="Άνοιγμα φόρμας χρέωσης (PDF)">
                          <FileText size={16} />
                        </a>
                      ) : null;
                    })()}
                    {assignment.status === 'Active' && (
                      <select
                        className="field-select"
                        style={{ minHeight: 30, padding: '4px 8px', width: 'auto' }}
                        value=""
                        disabled={updatingPpeAssignmentId === assignment.id}
                        onChange={e => {
                          const status = e.target.value as PpeAssignment['status'];
                          if (status) setPendingPpeStatusChange({ id: assignment.id, status, category: assignment.ppeCategory });
                          e.target.value = '';
                        }}
                      >
                        <option value="">Ενέργεια...</option>
                        <option value="Replaced">Αντικατάσταση</option>
                        <option value="Lost">Απώλεια</option>
                        <option value="Damaged">Φθορά</option>
                        <option value="Returned">Επιστροφή</option>
                        <option value="Cancelled">Ακύρωση</option>
                      </select>
                    )}
                  </div>
                ))}
                {inactivePpeAssignments.length > 0 && (
                  <button className="secondary-btn" type="button" style={{ marginTop: 8 }} onClick={() => setShowInactivePpe(v => !v)}>
                    {showInactivePpe ? 'Απόκρυψη ιστορικού' : `Ιστορικό (${inactivePpeAssignments.length})`}
                  </button>
                )}
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
      <ConfirmDialog
        open={pendingPpeStatusChange !== null}
        title="Ενέργεια ΜΑΠ"
        message={pendingPpeStatusChange ? `Να καταχωρηθεί το ΜΑΠ ως «${PPE_ASSIGNMENT_STATUS_LABELS[pendingPpeStatusChange.status]}»; Η ενέργεια καταγράφεται και δεν αναιρείται από την εφαρμογή.` : ''}
        confirmLabel={pendingPpeStatusChange ? PPE_ASSIGNMENT_STATUS_LABELS[pendingPpeStatusChange.status] : 'Επιβεβαίωση'}
        onCancel={() => setPendingPpeStatusChange(null)}
        onConfirm={() => {
          if (pendingPpeStatusChange) void applyPpeAssignmentStatus(pendingPpeStatusChange.id, pendingPpeStatusChange.status, pendingPpeStatusChange.category);
          setPendingPpeStatusChange(null);
        }}
      />
      <ConfirmDialog
        open={mandatoryReissueCategory !== null}
        title="Υποχρεωτικό ΜΑΠ"
        message={`Το «${mandatoryReissueCategory}» είναι υποχρεωτικό για την ειδικότητα και πρέπει να χρεωθεί νέο. Θέλετε να συνεχίσετε σε νέα χορήγηση;`}
        confirmLabel="Ναι"
        cancelLabel="Όχι"
        onCancel={() => setMandatoryReissueCategory(null)}
        onConfirm={() => {
          const matchedKey = ppeCategoryOptions.find(o => normalizeText(o.category) === normalizeText(mandatoryReissueCategory ?? ''))?.key ?? null;
          reissueTargetKeyRef.current = matchedKey;
          setMandatoryReissueCategory(null);
          if (matchedKey) setSelectedPpeCategoryKeys([matchedKey]);
          setPpeWorkflowOpen(true);
        }}
      />
    </div>
  );
}
