import { useState } from 'react';
import { dataProvider } from '../services/dataProvider';
import { GreekDateInput } from './GreekDateInput';

const CERTIFICATE_TYPE_SUGGESTIONS = [
  'Πιστοποιητικό Καταλληλότητας (Ιατρός Εργασίας)',
  'Καρδιολογική εξέταση',
  'Οφθαλμολογική εξέταση',
  'Ακοομετρία',
  'Σπιρομέτρηση',
  'Εργομετρία',
  'Αιματολογικός/Βιοχημικός έλεγχος',
];

interface Props {
  employeeId: number;
  employeeNo?: string;
  employeeName?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function AddMedicalCertificateForm({ employeeId, employeeNo, employeeName, onSaved, onCancel }: Props) {
  const [certificateType, setCertificateType] = useState('');
  const [customType, setCustomType] = useState('');
  const [occupationalDoctor, setOccupationalDoctor] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const isCustomType = certificateType === '__other__';
  const resolvedType = isCustomType ? customType.trim() : certificateType;

  function canSave() {
    return resolvedType !== '';
  }

  async function handleSave() {
    setSaving(true);
    try {
      await dataProvider.createMedicalCertificate({
        employeeId,
        employeeNo,
        employeeName,
        certificateType: resolvedType,
        occupationalDoctor: occupationalDoctor || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        restrictions: restrictions || undefined,
      }, evidenceFile ?? undefined);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-pad" style={{ marginTop: 12 }}>
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label" htmlFor="cert-type-select">Είδος εξέτασης/πιστοποιητικού</label>
        <select
          id="cert-type-select"
          className="field-select"
          value={certificateType}
          onChange={e => setCertificateType(e.target.value)}
        >
          <option value="">-- Επιλογή --</option>
          {CERTIFICATE_TYPE_SUGGESTIONS.map(type => <option key={type} value={type}>{type}</option>)}
          <option value="__other__">Άλλο...</option>
        </select>
      </div>

      {isCustomType && (
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field-label">Περιγραφή εξέτασης</label>
          <input className="field-input" type="text" placeholder="π.χ. Δερματολογική εξέταση" value={customType} onChange={e => setCustomType(e.target.value)} />
        </div>
      )}

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">Ιατρός Εργασίας (προαιρετικά)</label>
        <input className="field-input" type="text" placeholder="Ονοματεπώνυμο ιατρού" value={occupationalDoctor} onChange={e => setOccupationalDoctor(e.target.value)} />
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label className="field-label">Ημερομηνία εξέτασης</label>
        <GreekDateInput value={issueDate} onChange={setIssueDate} />
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label className="field-label">Ημερομηνία λήξης</label>
        <GreekDateInput value={expiryDate} onChange={setExpiryDate} />
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label className="field-label">Περιορισμοί (προαιρετικά)</label>
        <input className="field-input" type="text" placeholder="π.χ. Όχι εργασία σε ύψος" value={restrictions} onChange={e => setRestrictions(e.target.value)} />
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label className="field-label">Σκαναρισμένο αρχείο εξέτασης (PDF ή φωτογραφία, προαιρετικά)</label>
        <input
          className="field-input"
          type="file"
          accept="application/pdf,image/*"
          capture="environment"
          onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)}
        />
        {evidenceFile && <div className="row-subtitle" style={{ marginTop: 4 }}>Επιλέχθηκε: {evidenceFile.name}</div>}
        <div className="row-subtitle" style={{ marginTop: 4 }}>Το αρχείο αποθηκεύεται αλλά δεν εμφανίζεται στην εφαρμογή (περιορισμός πρόσβασης για ιατρικά δεδομένα).</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="secondary-btn" type="button" onClick={onCancel}>Άκυρο</button>
        <button className="primary-btn" type="button" onClick={() => void handleSave()} disabled={!canSave() || saving}>
          {saving ? 'Αποθήκευση...' : 'Αποθήκευση Πιστοποιητικού'}
        </button>
      </div>
    </div>
  );
}
