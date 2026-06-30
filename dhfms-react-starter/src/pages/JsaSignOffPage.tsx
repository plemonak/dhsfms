import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SignaturePad } from '../components/SignaturePad';
import {
  createJsaSignOffFlow,
  getEmployeesFlow,
  getJsaLibraryTasksFlow,
  getProjectStaffFlow,
  getSitesFlow,
  submitJsaSignatureFlow,
  uploadJsaScannedFormFlow,
  type CreateJsaSignOffResult,
} from '../services/flowClient';
import { jsaLibraryFallback } from '../data/jsaLibraryFallback';
import type { Employee, ProjectStaffMember, Site } from '../types/models';

type WizardStep = 'setup' | 'mode' | 'signing' | 'scan-upload' | 'done';
type SigningMode = 'digital' | 'scan';

export function JsaSignOffPage() {
  // ── Library data (Τύπος Έργου → Φάση → Task) ─────────────────
  const [libraryTasks, setLibraryTasks] = useState(jsaLibraryFallback);
  const projectOptions = useMemo(
    () => Array.from(new Set(libraryTasks.map((t) => t.project))).sort(),
    [libraryTasks]
  );

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTaskName, setSelectedTaskName] = useState('');

  const tasksForProject = useMemo(
    () => libraryTasks.filter((t) => t.project === selectedProject),
    [libraryTasks, selectedProject]
  );
  const selectedTask = useMemo(
    () => tasksForProject.find((t) => t.taskName === selectedTaskName),
    [tasksForProject, selectedTaskName]
  );

  // ── Sites / Employees (φιλτραρισμένα ανά εργοτάξιο) ──────────
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>('');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const employeesForSite = useMemo(
    () => allEmployees.filter((e) => e.siteId === selectedSiteId),
    [allEmployees, selectedSiteId]
  );

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<number>>(new Set());

  // ── Λοιπά στοιχεία JSA ────────────────────────────────────────
  const [workSite, setWorkSite] = useState('');
  const [executionDate, setExecutionDate] = useState(() => new Date().toISOString().slice(0, 10));

  // ── Εκπαιδευτής (μόνο αυτός χρειάζεται email) ────────────────
  const [projectStaff, setProjectStaff] = useState<ProjectStaffMember[]>([]);
  const [trainerId, setTrainerId] = useState<number | ''>('');
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [step, setStep] = useState<WizardStep>('setup');
  const [signingMode, setSigningMode] = useState<SigningMode>('digital');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Signing step state (digital mode) ────────────────────────
  const [signOff, setSignOff] = useState<CreateJsaSignOffResult | null>(null);
  const [currentSignerIndex, setCurrentSignerIndex] = useState(0); // 0 = trainer, 1..n = employees
  const [submittingSignature, setSubmittingSignature] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [allSigned, setAllSigned] = useState(false);

  // ── Scan upload state ─────────────────────────────────────────
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // ── Load reference data ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    getJsaLibraryTasksFlow(jsaLibraryFallback).then((data) => {
      if (!cancelled && data.length > 0) setLibraryTasks(data);
    });

    setLoadingStaff(true);
    getProjectStaffFlow(undefined, []).then((data) => {
      if (!cancelled) setProjectStaff(data);
    }).finally(() => {
      if (!cancelled) setLoadingStaff(false);
    });

    getSitesFlow([]).then((data) => {
      if (!cancelled) setSites(data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Φόρτωση εργαζομένων όταν αλλάζει το επιλεγμένο εργοτάξιο
  useEffect(() => {
    if (selectedSiteId === '') {
      setAllEmployees([]);
      return;
    }
    let cancelled = false;
    setLoadingEmployees(true);
    setSelectedEmployeeIds(new Set());
    getEmployeesFlow(Number(selectedSiteId), []).then((data) => {
      if (!cancelled) setAllEmployees(data);
    }).finally(() => {
      if (!cancelled) setLoadingEmployees(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSiteId]);

  // Όταν αλλάζει ο τύπος έργου, καθάρισε την επιλογή task
  useEffect(() => {
    setSelectedTaskName('');
  }, [selectedProject]);

  function toggleEmployee(id: number) {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const trainer = projectStaff.find((p) => p.id === trainerId);
  const trainerEmail = trainer?.email ?? '';
  // Οι εργαζόμενοι ΔΕΝ χρειάζονται email — μόνο ο εκπαιδευτής.
  const validEmployees = employeesForSite.filter((e) => selectedEmployeeIds.has(e.id));

  const canStart =
    selectedProject.trim().length > 0 &&
    selectedTaskName.trim().length > 0 &&
    trainerId !== '' &&
    trainerEmail.trim().length > 0 &&
    validEmployees.length > 0 &&
    !creating;

  async function handleStartSignOff() {
    if (!canStart || !trainer) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createJsaSignOffFlow({
        jsaTaskTitle: selectedTaskName.trim(),
        projectType: selectedProject,
        constructionPhase: selectedTask?.phase,
        workSite: workSite.trim() || undefined,
        executionDate,
        trainerEmail: trainerEmail.trim(),
        trainerName: trainer.displayName ?? trainer.title ?? trainerEmail,
        // Οι εργαζόμενοι περνάνε με employeeNo ως ταυτοποιητικό αντί για email
        // (το flow τους αναγνωρίζει με βάση το όνομα· το πεδίο email μένει κενό).
        employees: validEmployees.map((e) => ({ email: e.email ?? e.employeeNo, fullName: e.fullName })),
      });
      setSignOff(result);
      setStep('mode');
    } catch (err) {
      console.error('Failed to create JSA sign-off', err);
      setCreateError('Αποτυχία δημιουργίας sign-off. Δοκιμάστε ξανά.');
    } finally {
      setCreating(false);
    }
  }

  function handleChooseMode(mode: SigningMode) {
    setSigningMode(mode);
    if (mode === 'digital') {
      setCurrentSignerIndex(0);
      setStep('signing');
    } else {
      setStep('scan-upload');
    }
  }

  const employeeList = validEmployees;
  const totalSigners = 1 + employeeList.length; // trainer + employees
  const isTrainerTurn = currentSignerIndex === 0;
  const currentEmployee = isTrainerTurn ? null : employeeList[currentSignerIndex - 1];
  const currentSignerName = isTrainerTurn ? (trainer?.displayName ?? trainer?.title ?? trainerEmail) : currentEmployee?.fullName ?? '';
  const currentSignerEmail = isTrainerTurn ? trainerEmail : (currentEmployee?.email ?? currentEmployee?.employeeNo ?? '');

  async function handleSignatureCaptured(payload: { signatureData: string }) {
    if (!signOff) return;
    setSubmittingSignature(true);
    setSignatureError(null);
    try {
      const result = await submitJsaSignatureFlow({
        signOffTitle: signOff.signOffTitle,
        signerEmail: currentSignerEmail,
        signerRole: isTrainerTurn ? 'trainer' : 'employee',
        signatureImageBase64: payload.signatureData,
      });

      if (result.allSigned) {
        setAllSigned(true);
        setStep('done');
        return;
      }

      if (currentSignerIndex + 1 < totalSigners) {
        setCurrentSignerIndex((i) => i + 1);
      } else {
        setStep('done');
      }
    } catch (err) {
      console.error('Failed to submit signature', err);
      setSignatureError('Αποτυχία αποθήκευσης υπογραφής. Δοκιμάστε ξανά.');
    } finally {
      setSubmittingSignature(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // αφαιρούμε το data:...;base64, prefix, κρατάμε μόνο το payload
        const base64 = result.split(',')[1] ?? result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleUploadScan() {
    if (!signOff || !scanFile) return;
    setUploadingScan(true);
    setScanError(null);
    try {
      const base64 = await fileToBase64(scanFile);
      await uploadJsaScannedFormFlow({
        signOffTitle: signOff.signOffTitle,
        fileName: scanFile.name,
        fileContentBase64: base64,
      });
      setAllSigned(true);
      setStep('done');
    } catch (err) {
      console.error('Failed to upload scanned form', err);
      setScanError('Αποτυχία ανεβάσματος αρχείου. Δοκιμάστε ξανά.');
    } finally {
      setUploadingScan(false);
    }
  }

  function handlePrintForm() {
    window.print();
  }

  function resetWizard() {
    setStep('setup');
    setSignOff(null);
    setCurrentSignerIndex(0);
    setAllSigned(false);
    setSelectedProject('');
    setSelectedTaskName('');
    setSelectedSiteId('');
    setSelectedEmployeeIds(new Set());
    setWorkSite('');
    setScanFile(null);
    setSigningMode('digital');
  }

  // ════════════════════════════════════════════════════════════
  // RENDER — Setup step
  // ════════════════════════════════════════════════════════════
  if (step === 'setup') {
    return (
      <div className="page">
        <PageHeader title="Εκπαίδευση JSA & Υπογραφές" subtitle="Επιλογή task από τη Βιβλιοθήκη, εκπαιδευτή και συμμετεχόντων" />

        <SectionCard title="Επιλογή JSA από τη Βιβλιοθήκη">
          <div className="form-grid">
            <label className="form-field">
              <span>Τύπος Έργου</span>
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">-- Επιλογή --</option>
                {projectOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Task / JSA</span>
              <select
                value={selectedTaskName}
                onChange={(e) => setSelectedTaskName(e.target.value)}
                disabled={!selectedProject}
              >
                <option value="">{selectedProject ? '-- Επιλογή --' : 'Επιλέξτε πρώτα τύπο έργου'}</option>
                {tasksForProject.map((t) => (
                  <option key={t.taskName} value={t.taskName}>{t.taskName}</option>
                ))}
              </select>
            </label>
          </div>
          {selectedTask && (
            <div className="row-subtitle" style={{ marginTop: 10 }}>
              Φάση: {selectedTask.phase} &nbsp;·&nbsp; Επίπεδο κινδύνου:{' '}
              {selectedTask.risk === 'H' ? 'Υψηλό' : selectedTask.risk === 'M' ? 'Μέτριο' : 'Χαμηλό'}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Εργοτάξιο & Χώρος Εργασίας">
          <div className="form-grid">
            <label className="form-field">
              <span>Εργοτάξιο</span>
              <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">-- Επιλογή --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Συγκεκριμένος Χώρος (προαιρετικά)</span>
              <input type="text" value={workSite} onChange={(e) => setWorkSite(e.target.value)} placeholder="π.χ. Πεδίο Α" />
            </label>
            <label className="form-field">
              <span>Ημερομηνία Εκτέλεσης</span>
              <input type="date" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Εκπαιδευτής">
          {loadingStaff ? (
            <div className="row-subtitle">Φόρτωση προσωπικού...</div>
          ) : (
            <label className="form-field">
              <span>Επιλογή εκπαιδευτή</span>
              <select value={trainerId} onChange={(e) => setTrainerId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">-- Επιλογή --</option>
                {projectStaff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.displayName ?? p.title ?? `Στέλεχος #${p.id}`) + (p.email ? ` (${p.email})` : ' — χωρίς email')}
                  </option>
                ))}
              </select>
              {trainerId !== '' && !trainerEmail && (
                <div className="row-subtitle" style={{ color: 'var(--dh-danger, #c0392b)', marginTop: 4 }}>
                  Ο επιλεγμένος εκπαιδευτής δεν έχει καταχωρημένο email στο ProjectStaff. Απαιτείται για τον εκπαιδευτή.
                </div>
              )}
            </label>
          )}
        </SectionCard>

        <SectionCard title="Συμμετέχοντες (Εργαζόμενοι του εργοταξίου)">
          {selectedSiteId === '' && <div className="row-subtitle">Επιλέξτε πρώτα εργοτάξιο.</div>}
          {selectedSiteId !== '' && loadingEmployees && <div className="row-subtitle">Φόρτωση εργαζομένων...</div>}
          {selectedSiteId !== '' && !loadingEmployees && employeesForSite.length === 0 && (
            <div className="row-subtitle">Δεν βρέθηκαν εργαζόμενοι για αυτό το εργοτάξιο.</div>
          )}
          {selectedSiteId !== '' && !loadingEmployees && employeesForSite.length > 0 && (
            <div className="checkbox-grid">
              {employeesForSite.map((emp) => (
                <label key={emp.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.has(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                  />
                  <span>{emp.fullName}</span>
                </label>
              ))}
            </div>
          )}
          {validEmployees.length > 0 && (
            <div className="row-subtitle" style={{ marginTop: 10 }}>
              Επιλέχθηκαν {validEmployees.length} εργαζόμενοι.
            </div>
          )}
        </SectionCard>

        {createError && (
          <div className="card card-pad" style={{ borderColor: 'var(--dh-danger, #c0392b)', marginTop: 12 }}>
            {createError}
          </div>
        )}

        <div className="footer-actions">
          <button className="primary-btn" type="button" disabled={!canStart} onClick={handleStartSignOff}>
            {creating ? 'Δημιουργία...' : 'Επόμενο: Τρόπος Υπογραφής'}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER — Mode selection step (ψηφιακά ή σκαναρισμένα)
  // ════════════════════════════════════════════════════════════
  if (step === 'mode' && signOff) {
    return (
      <div className="page">
        <PageHeader title="Τρόπος Υπογραφής" subtitle={signOff.signOffTitle} />
        <SectionCard title="Επιλέξτε πώς θα γίνουν οι υπογραφές">
          <div className="mode-choice-grid">
            <button type="button" className="mode-choice-card" onClick={() => handleChooseMode('digital')}>
              <div className="mode-choice-title">📱 Ψηφιακή Υπογραφή</div>
              <div className="mode-choice-desc">
                Κάθε άτομο υπογράφει με δάχτυλο, πένα ή ποντίκι απευθείας στη συσκευή, σειριακά (εκπαιδευτής → εργαζόμενοι).
              </div>
            </button>
            <button type="button" className="mode-choice-card" onClick={() => handleChooseMode('scan')}>
              <div className="mode-choice-title">🖨️ Εκτύπωση & Σκανάρισμα</div>
              <div className="mode-choice-desc">
                Εκτυπώστε την ανυπόγραφη φόρμα, υπογράψτε χειρόγραφα, και ανεβάστε τη σκαναρισμένη/φωτογραφημένη φόρμα.
              </div>
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER — Digital signing step (σειριακά: trainer πρώτος, μετά κάθε employee)
  // ════════════════════════════════════════════════════════════
  if (step === 'signing' && signOff) {
    return (
      <div className="page">
        <PageHeader
          title="Υπογραφές JSA"
          subtitle={`${signOff.signOffTitle} — Υπογράφων ${currentSignerIndex + 1} από ${totalSigners}`}
        />

        <SectionCard title="Δήλωση">
          {isTrainerTurn
            ? 'Ως εκπαιδευτής, βεβαιώνω ότι διεξήγαγα την εκπαίδευση JSA και ότι όλοι οι συμμετέχοντες ενημερώθηκαν πλήρως για τους κινδύνους και τα μέτρα ελέγχου.'
            : 'Με την υπογραφή μου δηλώνω ότι ενημερώθηκα πλήρως για τους κινδύνους και τα μέτρα ελέγχου του παρόντος JSA και θα συμμορφώνομαι με τις απαιτήσεις ασφαλείας.'}
        </SectionCard>

        {signatureError && (
          <div className="card card-pad" style={{ borderColor: 'var(--dh-danger, #c0392b)', marginTop: 12 }}>
            {signatureError}
          </div>
        )}

        <SignaturePad
          key={currentSignerIndex}
          signer={currentSignerName}
          title={isTrainerTurn ? 'Υπογραφή Εκπαιδευτή' : `Υπογραφή — ${currentSignerName}`}
          subtitle={submittingSignature ? 'Αποθήκευση...' : undefined}
          documentId={signOff.signOffTitle}
          onSignatureCaptured={handleSignatureCaptured}
        />

        <div className="card card-pad" style={{ marginTop: 12 }}>
          <div className="section-title">Πρόοδος</div>
          <div className="row-subtitle">
            {isTrainerTurn ? 'Εκπαιδευτής (σε εξέλιξη)' : `Εργαζόμενος ${currentSignerIndex} από ${employeeList.length}`}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER — Scan upload step
  // ════════════════════════════════════════════════════════════
  if (step === 'scan-upload' && signOff) {
    return (
      <div className="page">
        <PageHeader title="Εκτύπωση & Σκανάρισμα" subtitle={signOff.signOffTitle} />

        <SectionCard title="Βήμα 1 — Εκτύπωση Φόρμας">
          <div className="row-subtitle" style={{ marginBottom: 10 }}>
            Εκτυπώστε την ανυπόγραφη φόρμα JSA και συλλέξτε τις χειρόγραφες υπογραφές εκπαιδευτή και συμμετεχόντων.
          </div>
          <button className="secondary-btn" type="button" onClick={handlePrintForm}>
            🖨️ Εκτύπωση
          </button>
        </SectionCard>

        <SectionCard title="Βήμα 2 — Ανέβασμα Σκαναρισμένης Φόρμας">
          <div className="form-field">
            <span>Επιλέξτε αρχείο (PDF ή φωτογραφία)</span>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setScanFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {scanError && (
            <div className="card card-pad" style={{ borderColor: 'var(--dh-danger, #c0392b)', marginTop: 12 }}>
              {scanError}
            </div>
          )}
          <div className="footer-actions">
            <button
              className="primary-btn"
              type="button"
              disabled={!scanFile || uploadingScan}
              onClick={handleUploadScan}
            >
              {uploadingScan ? 'Ανέβασμα...' : 'Ανέβασμα & Ολοκλήρωση'}
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER — Done step
  // ════════════════════════════════════════════════════════════
  return (
    <div className="page">
      <PageHeader title="Ολοκληρώθηκε" subtitle={signOff?.signOffTitle} />
      <SectionCard title="Επιτυχής Καταγραφή">
        {signingMode === 'scan'
          ? 'Η σκαναρισμένη φόρμα ανέβηκε επιτυχώς και αποθηκεύτηκε στο SharePoint.'
          : allSigned
          ? 'Όλες οι υπογραφές καταγράφηκαν. Το PDF δημιουργείται αυτόματα και θα είναι διαθέσιμο στο SharePoint σε λίγα δευτερόλεπτα.'
          : 'Η υπογραφή καταγράφηκε. Αν χρειάζεται να συνεχίσετε με άλλους υπογράφοντες αργότερα, μπορείτε να επιστρέψετε σε αυτή τη σελίδα.'}
      </SectionCard>
      <div className="footer-actions">
        <button className="primary-btn" type="button" onClick={resetWizard}>
          Νέα Εκπαίδευση JSA
        </button>
      </div>
    </div>
  );
}
