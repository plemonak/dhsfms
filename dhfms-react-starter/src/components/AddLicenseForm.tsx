import { useState } from 'react';
import { dataProvider } from '../services/dataProvider';
import { GreekDateInput } from './GreekDateInput';
import {
  DRIVING_LICENSE_CATEGORIES,
  ELECTRICIAN_GRADES_BY_SPECIALTY,
  ELECTRICIAN_SPECIALTIES,
  LICENSE_TYPES,
  MACHINERY_GRADES,
  MACHINERY_SPECIALTY_GROUPS,
  PEI_CATEGORIES,
} from '../data/licenseTaxonomy';

interface Props {
  employeeId: number;
  employeeNo?: string;
  employeeName?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function AddLicenseForm({ employeeId, employeeNo, employeeName, onSaved, onCancel }: Props) {
  const [licenseType, setLicenseType] = useState('');
  const [licenseGrade, setLicenseGrade] = useState('');
  const [licenseSpecialty, setLicenseSpecialty] = useState<string[]>([]);
  const [licenseNo, setLicenseNo] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const isMachinery = licenseType === 'Άδεια Χειριστή Μηχανημάτων Έργου';
  const isElectrician = licenseType === 'Άδεια Ηλεκτρολόγου';
  const isDriving = licenseType === 'Δίπλωμα Οδήγησης';
  const isPei = licenseType === 'Πιστοποιητικό Επαγγελματικής Ικανότητας (ΠΕΙ)';

  const electricianGradeOptions = isElectrician && licenseSpecialty[0] ? ELECTRICIAN_GRADES_BY_SPECIALTY[licenseSpecialty[0]] ?? [] : [];

  function resetTypeDependentFields() {
    setLicenseGrade('');
    setLicenseSpecialty([]);
  }

  function toggleSpecialty(value: string, multi: boolean) {
    if (multi) {
      setLicenseSpecialty(current => current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
    } else {
      setLicenseSpecialty([value]);
      setLicenseGrade('');
    }
  }

  function canSave() {
    if (!licenseType) return false;
    if (isMachinery) return licenseGrade !== '' && licenseSpecialty.length > 0;
    if (isElectrician) return licenseSpecialty.length > 0 && licenseGrade !== '';
    if (isDriving || isPei) return licenseSpecialty.length > 0;
    return false;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await dataProvider.createEmployeeLicense({
        employeeId,
        employeeNo,
        employeeName,
        licenseType,
        licenseGrade: licenseGrade || undefined,
        licenseSpecialty: licenseSpecialty.length > 0 ? licenseSpecialty : undefined,
        licenseNo: licenseNo || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
      }, evidenceFile ?? undefined);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-pad" style={{ marginTop: 12 }}>
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label" htmlFor="license-type-select">Τύπος Άδειας/Πιστοποιητικού</label>
        <select
          id="license-type-select"
          className="field-select"
          value={licenseType}
          onChange={e => { setLicenseType(e.target.value); resetTypeDependentFields(); }}
        >
          <option value="">-- Επιλογή --</option>
          {LICENSE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      {isMachinery && (
        <>
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="field-label" htmlFor="machinery-grade-select">Βαθμίδα</label>
            <select
              id="machinery-grade-select"
              className="field-select"
              value={licenseGrade}
              onChange={e => setLicenseGrade(e.target.value)}
            >
              <option value="">-- Επιλογή --</option>
              {MACHINERY_GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
            </select>
          </div>
          {licenseGrade && (
            <>
              <div className="toast-banner" style={{ background: '#FDF6E3', color: '#8A6D00', borderColor: '#F0E0A0' }}>
                Αν ο εργαζόμενος έχει διαφορετική Βαθμίδα (π.χ. Ομάδα Α σε κάποιες ειδικότητες και Ομάδα Β σε άλλες), καταχώρησε ξεχωριστή άδεια για κάθε Βαθμίδα.
              </div>
              <div className="section-title" style={{ marginTop: 8 }}>Ειδικότητες</div>
              {MACHINERY_SPECIALTY_GROUPS.map(group => (
                <div key={group.group} style={{ marginTop: 8 }}>
                  <div className="row-subtitle" style={{ fontWeight: 700 }}>{group.group}</div>
                  {group.items.map(item => (
                    <label key={item} className="training-chip" style={{ display: 'flex', alignItems: 'flex-start', marginTop: 4 }}>
                      <input type="checkbox" checked={licenseSpecialty.includes(item)} onChange={() => toggleSpecialty(item, true)} />
                      <span style={{ marginLeft: 8 }}>{item}</span>
                    </label>
                  ))}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {isElectrician && (
        <>
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="field-label" htmlFor="electrician-specialty-select">Ειδικότητα</label>
            <select
              id="electrician-specialty-select"
              className="field-select"
              value={licenseSpecialty[0] ?? ''}
              onChange={e => toggleSpecialty(e.target.value, false)}
            >
              <option value="">-- Επιλογή --</option>
              {ELECTRICIAN_SPECIALTIES.map(spec => <option key={spec} value={spec}>{spec}</option>)}
            </select>
          </div>
          {licenseSpecialty[0] && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label className="field-label" htmlFor="electrician-grade-select">Βαθμίδα</label>
              <select
                id="electrician-grade-select"
                className="field-select"
                value={licenseGrade}
                onChange={e => setLicenseGrade(e.target.value)}
              >
                <option value="">-- Επιλογή --</option>
                {electricianGradeOptions.map(grade => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </div>
          )}
        </>
      )}

      {isDriving && (
        <div style={{ marginBottom: 12 }}>
          <div className="section-title">Κατηγορίες</div>
          {DRIVING_LICENSE_CATEGORIES.map(cat => (
            <label key={cat} className="training-chip" style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <input type="checkbox" checked={licenseSpecialty.includes(cat)} onChange={() => toggleSpecialty(cat, true)} />
              <span style={{ marginLeft: 8 }}>{cat}</span>
            </label>
          ))}
        </div>
      )}

      {isPei && (
        <div style={{ marginBottom: 12 }}>
          <div className="section-title">Κατηγορίες</div>
          {PEI_CATEGORIES.map(cat => (
            <label key={cat} className="training-chip" style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <input type="checkbox" checked={licenseSpecialty.includes(cat)} onChange={() => toggleSpecialty(cat, true)} />
              <span style={{ marginLeft: 8 }}>{cat}</span>
            </label>
          ))}
        </div>
      )}

      {licenseType && (
        <>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">Αριθμός άδειας (προαιρετικά)</label>
            <input className="field-input" type="text" placeholder="Αριθμός άδειας" value={licenseNo} onChange={e => setLicenseNo(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">Ημερομηνία έκδοσης</label>
            <GreekDateInput value={issueDate} onChange={setIssueDate} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">Ημερομηνία λήξης</label>
            <GreekDateInput value={expiryDate} onChange={setExpiryDate} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label">Σκαναρισμένο αρχείο άδειας (PDF ή φωτογραφία, προαιρετικά)</label>
            <input
              className="field-input"
              type="file"
              accept="application/pdf,image/*"
              capture="environment"
              onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)}
            />
            {evidenceFile && <div className="row-subtitle" style={{ marginTop: 4 }}>Επιλέχθηκε: {evidenceFile.name}</div>}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="secondary-btn" type="button" onClick={onCancel}>Άκυρο</button>
        <button className="primary-btn" type="button" onClick={() => void handleSave()} disabled={!canSave() || saving}>
          {saving ? 'Αποθήκευση...' : 'Αποθήκευση Άδειας'}
        </button>
      </div>
    </div>
  );
}
