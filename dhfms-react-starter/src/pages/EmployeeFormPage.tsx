import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { FormField } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { dataProvider } from '../services/dataProvider';
import type { Employee, Site } from '../types/models';

interface Props {
  onBack: () => void;
  onSave: (employee: Omit<Employee, 'id' | 'fullName'>, identityDocument?: EmployeeIdentityDocumentDraft) => void;
  sites: Site[];
  selectedSiteId: number | 'all';
  positionOptions: string[];
  companyOptions: string[];
}

export type EmployeeIdentityDocumentDraft = {
  sourceFile: File;
  fileName: string;
  documentType: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  aiWarnings?: string;
};

type EmployeeFormState = Omit<Employee, 'id' | 'fullName'>;

function normalizeValue(value: string | undefined): string {
  return (value ?? '').trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDateToIso(value: string): string | undefined {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return value;

  const match = value.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!match) return undefined;

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const rawYear = match[3];
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-${day}`;
}

function normalizeIdentityNumber(value?: string): string {
  return (value ?? '').replace(/\s+/g, '').replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
}

function normalizeOcrLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toUpperCase();
}

const greeklishToGreek: Record<string, string> = {
  A: 'Α',
  B: 'Β',
  E: 'Ε',
  G: 'Γ',
  I: 'Ι',
  K: 'Κ',
  L: 'Λ',
  M: 'Μ',
  N: 'Ν',
  O: 'Ο',
  P: 'Π',
  R: 'Ρ',
  S: 'Σ',
  T: 'Τ',
  Y: 'Υ',
  Z: 'Ζ',
};

function mrzNameToGreek(value: string): string {
  return value
    .split('')
    .map(character => greeklishToGreek[character] ?? character)
    .join('');
}

function parseMrzDate(value: string): string {
  const year = Number(value.slice(0, 2));
  const month = value.slice(2, 4);
  const day = value.slice(4, 6);
  const century = year > 30 ? '19' : '20';
  return `${century}${year.toString().padStart(2, '0')}-${month}-${day}`;
}

function parseGreekIdentityMrz(text: string) {
  const normalizedLines = text
    .split(/\r?\n/)
    .map(line => line.trim().replace(/\s+/g, '').toUpperCase())
    .filter(Boolean);

  const idLine = normalizedLines.find(line => line.startsWith('IDGRC') || line.startsWith('I<GRC'));
  const dateLine = normalizedLines.find(line => /^\d{6}/.test(line) && line.includes('GRC'));
  const nameLine = [...normalizedLines].reverse().find(line => line.includes('<<') && /[A-Z]{3,}/.test(line));

  const identityDocumentNo = idLine?.match(/(?:IDGRC|I<GRC)([A-Z0-9<]{8,12})/)?.[1]?.replace(/</g, '').slice(0, 9) ?? '';
  const birthDate = dateLine?.match(/^(\d{6})/)?.[1];
  const gender = dateLine?.match(/^\d{6}\d?([MFXΑΘ])/i)?.[1];
  const nameParts = nameLine
    ?.replace(/<+$/g, '')
    .split('<<')
    .filter(Boolean) ?? [];

  return {
    identityDocumentNo,
    birthDate: birthDate ? parseMrzDate(birthDate) : '',
    gender: gender === 'M' || gender === 'Α' ? 'Άρρεν' : gender === 'F' || gender === 'Θ' ? 'Θήλυ' : '',
    nationality: dateLine?.includes('GRC') ? 'Ελληνική' : '',
    lastName: nameParts[0] ? mrzNameToGreek(nameParts[0]) : '',
    firstName: nameParts[1] ? mrzNameToGreek(nameParts[1]) : '',
  };
}

function extractTextNearLabel(lines: string[], labels: string[]) {
  for (const label of labels) {
    const normalizedLabel = normalizeOcrLabel(label);
    for (let index = 0; index < lines.length; index += 1) {
      const normalizedLine = normalizeOcrLabel(lines[index]);
      if (!normalizedLine.includes(normalizedLabel)) continue;

      const sameLine = normalizeValue(lines[index].replace(new RegExp(escapeRegex(label), 'i'), '').replace(/^[:\-\s/]+/, ''));
      if (sameLine && !normalizeOcrLabel(sameLine).includes(normalizedLabel)) {
        return sameLine;
      }

      for (let offset = 1; offset <= 2; offset += 1) {
        const nextLine = normalizeValue(lines[index + offset]);
        if (nextLine && !labels.some(candidate => normalizeOcrLabel(nextLine).includes(normalizeOcrLabel(candidate)))) {
          return nextLine;
        }
      }
    }
  }

  return '';
}

export function EmployeeFormPage({ onBack, onSave, sites, selectedSiteId, positionOptions, companyOptions }: Props) {
  const [form, setForm] = useState<EmployeeFormState>({
    employeeNo: 'AUTO',
    firstName: '',
    lastName: '',
    company: 'ΔΥΚΑΤ',
    personType: 'DYKAT employee',
    position: '',
    siteId: 2,
    status: 'Active',
    mobile: '',
    email: '',
    idOrTaxNo: '',
    taxNumber: '',
    hireDate: new Date().toISOString().slice(0, 10),
    fatherName: '',
    birthDate: '',
    gender: '',
    nationality: '',
    identityDocumentType: 'Ταυτότητα',
    identityDocumentNo: '',
    identityIssuingAuthority: '',
    identityExpiryDate: '',
  });
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrExtractedFields, setOcrExtractedFields] = useState<string[]>([]);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (ocrPreviewUrl) {
        URL.revokeObjectURL(ocrPreviewUrl);
      }
    };
  }, [ocrPreviewUrl]);

  const update = (key: keyof EmployeeFormState, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  function applyOcrFields(text: string): string[] {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const looksLikeLabel = (value: string) => [
      'Επώνυμο', 'Surname', 'Lastname', 'Όνομα', 'Name', 'Firstname', 'Πατρώνυμο', 'Father',
      'Ημερομηνία γέννησης', 'Birth date', 'Date of birth', 'Ημερομηνία λήξης', 'Expiry date',
      'ΑΔΤ', 'Passport', 'Document No', 'ID', 'Φύλο', 'Gender', 'Ιθαγένεια', 'Nationality',
      'Αρχή έκδοσης', 'Issued by', 'Authority',
    ].some(label => normalizeOcrLabel(value).includes(normalizeOcrLabel(label)));

    const extract = (...labels: string[]) => {
      for (const label of labels) {
        const directMatch = normalizedText.match(new RegExp(`${escapeRegex(label)}\\s*[:\\-]?\\s*([^·|]+?)(?=\\s{2,}|$)`, 'i'));
        if (directMatch?.[1]) {
          const value = normalizeValue(directMatch[1]);
          if (value && !looksLikeLabel(value)) return value;
        }

        const normalizedLabel = normalizeOcrLabel(label);
        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index];
          if (!normalizeOcrLabel(line).includes(normalizedLabel)) continue;

          const inlineValue = normalizeValue(line.replace(new RegExp(escapeRegex(label), 'i'), '').replace(/^[:\-\s]+/, ''));
          if (inlineValue && !looksLikeLabel(inlineValue)) {
            return inlineValue;
          }

          const nextLine = normalizeValue(lines[index + 1]);
          if (nextLine && !looksLikeLabel(nextLine)) {
            return nextLine;
          }
        }
      }

      return '';
    };

    const mrz = parseGreekIdentityMrz(text);
    const lastName = extract('Επώνυμο', 'Surname', 'Lastname', 'Last name') || mrz.lastName;
    const firstName = extract('Όνομα', 'Given names', 'First name', 'Firstname', 'Name') || mrz.firstName;
    const fatherName = extract('Πατρώνυμο', 'FatherName', 'Father name', 'Father')
      || extractTextNearLabel(lines, ['Όνομα πατέρα', 'Father name']);
    const birthDate = parseDateToIso(extract('Ημερομηνία γέννησης', 'Birth date', 'Date of birth', 'DOB')) ?? mrz.birthDate;
    const expiryDate = parseDateToIso(extract('Ημερομηνία λήξης', 'Λήξη', 'Expiry date', 'Date of expiry', 'Valid until')) ?? '';
    const explicitId = extract('ΑΔΤ / Αρ. Διαβατηρίου', 'Αριθμός ταυτότητας', 'ΑΔΤ', 'Passport No', 'Passport', 'Document No', 'ID number', 'ID');
    const identityMatch = normalizedText.match(/\b[A-ZΑ-Ω]{1,3}\s?\d{5,9}\b/u);
    const idOrTaxNo = normalizeIdentityNumber(explicitId || identityMatch?.[0] || mrz.identityDocumentNo);
    const gender = extract('Φύλο', 'Gender', 'Sex') || mrz.gender;
    const nationality = extract('Ιθαγένεια', 'Nationality') || mrz.nationality;
    const issuingAuthority = extract('Αρχή έκδοσης', 'Issued by', 'Issuing authority', 'Authority')
      || extractTextNearLabel(lines, ['Αρχή έκδοσης', 'Issuing authority', 'Issued by']);

    const extractedFields = [
      lastName ? `Επώνυμο: ${lastName}` : null,
      firstName ? `Όνομα: ${firstName}` : null,
      fatherName ? `Πατρώνυμο: ${fatherName}` : null,
      birthDate ? `Γέννηση: ${birthDate}` : null,
      idOrTaxNo ? `ΑΔΤ/Διαβατήριο: ${idOrTaxNo}` : null,
      expiryDate ? `Λήξη εγγράφου: ${expiryDate}` : null,
      gender ? `Φύλο: ${gender}` : null,
      nationality ? `Ιθαγένεια: ${nationality}` : null,
      issuingAuthority ? `Αρχή έκδοσης: ${issuingAuthority}` : null,
    ].filter(Boolean) as string[];
    setOcrExtractedFields(extractedFields);

    setForm(prev => ({
      ...prev,
      firstName: firstName || prev.firstName,
      lastName: lastName || prev.lastName,
      fatherName: fatherName || prev.fatherName,
      birthDate: birthDate || prev.birthDate,
      idOrTaxNo: idOrTaxNo || prev.idOrTaxNo,
      identityDocumentNo: idOrTaxNo || prev.identityDocumentNo,
      identityExpiryDate: expiryDate || prev.identityExpiryDate,
      gender: gender || prev.gender,
      nationality: nationality || prev.nationality,
      identityIssuingAuthority: issuingAuthority || prev.identityIssuingAuthority,
    }));

    return extractedFields;
  }

  async function handleOcr(file: File | null) {
    if (!file) return;

    setOcrLoading(true);
    setOcrStatus('');
    setOcrRawText('');
    setOcrExtractedFields([]);
    setIdentityConfirmed(false);

    try {
      const result = await dataProvider.extractDocumentText(file, { documentType: form.identityDocumentType ?? 'IdentityDocument' });
      setOcrRawText(result.text);
      const extractedFields = applyOcrFields(result.text);
      setOcrStatus(result.text.trim().length === 0
        ? 'Το OCR ολοκληρώθηκε αλλά δεν επέστρεψε αναγνώσιμο κείμενο.'
        : extractedFields.length > 0
          ? `Το OCR ολοκληρώθηκε και αναγνωρίστηκαν ${extractedFields.length} πεδία για έλεγχο.`
          : 'Το OCR επέστρεψε κείμενο, αλλά δεν αναγνωρίστηκαν πεδία αυτόματα. Συμπληρώστε τα χειροκίνητα.');
    } catch (error) {
      console.warn('OCR failed, using fallback.', error);
      applyOcrFields('Επώνυμο: Παπαδόπουλος\nΌνομα: Αντώνιος\nΠατρώνυμο: Νικόλαος\nΗμερομηνία γέννησης: 1988-03-12\nΑΔΤ / Αρ. Διαβατηρίου: AB123456\nΦύλο: Άνδρας\nΑρχή έκδοσης: Αστυνομία');
      setOcrStatus('Δεν ήταν δυνατή η πραγματική επεξεργασία OCR. Εμφανίζεται mock fallback για έλεγχο.');
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (ocrPreviewUrl) {
      URL.revokeObjectURL(ocrPreviewUrl);
    }

    setOcrFileName(file.name);
    setIdentityFile(file);
    setOcrPreviewUrl(URL.createObjectURL(file));
    await handleOcr(file);
  }

  const submitEmployee = () => {
    const identityDocument = identityFile && identityConfirmed
      ? {
          sourceFile: identityFile,
          fileName: identityFile.name,
          documentType: form.identityDocumentType ?? 'Ταυτότητα',
          expiryDate: form.identityExpiryDate,
          issuingAuthority: form.identityIssuingAuthority,
          aiWarnings: ocrStatus,
        }
      : undefined;

    onSave(form, identityDocument);
  };

  return (
    <div className="page">
      <PageHeader title="Νέος εργαζόμενος" subtitle="Καταχώρηση προσωπικού / υπεργολάβου" actions={<button className="secondary-btn" onClick={onBack}><ArrowLeft size={17} />Πίσω</button>} />
      <div className="form">
        <SectionCard title="OCR ταυτότητας / διαβατηρίου">
          <div className="form-grid">
            <FormField label="Τύπος εγγράφου">
              <select className="field-select" value={form.identityDocumentType} onChange={e => update('identityDocumentType', e.target.value)}>
                <option>Ταυτότητα</option>
                <option>Διαβατήριο</option>
                <option>Άλλο</option>
              </select>
            </FormField>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="field-label" htmlFor="employee-ocr-file">Ανέβασμα εικόνας ή PDF</label>
              <input ref={ocrInputRef} id="employee-ocr-file" className="field-input" type="file" accept="image/*,.pdf" capture="environment" onChange={handleFileChange} />
              <div className="row-subtitle" style={{ marginTop: 8 }}>Το OCR συμπληρώνει τα πεδία για έλεγχο. Το αρχείο αποθηκεύεται μόνο όταν επιβεβαιώσετε και πατήσετε αποθήκευση.</div>
            </div>
            {ocrPreviewUrl && (
              <div style={{ gridColumn: '1 / -1' }}>
                <img src={ocrPreviewUrl} alt="Προεπισκόπηση OCR" style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', border: '1px solid var(--dh-line)', borderRadius: 10 }} />
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="button" onClick={() => ocrInputRef.current?.click()} disabled={ocrLoading}><Camera size={17} />{ocrLoading ? 'Αναζήτηση OCR…' : 'Έναρξη OCR'}</button>
              {ocrFileName && <div className="row-subtitle" style={{ marginTop: 8 }}>Αρχείο: {ocrFileName}</div>}
              {ocrLoading && <div className="row-subtitle" style={{ marginTop: 8 }}>Αναζήτηση OCR…</div>}
              {ocrStatus && <div className="row-subtitle" style={{ marginTop: 8 }}>{ocrStatus}</div>}
              {ocrExtractedFields.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="row-subtitle">Αναγνωρισμένα πεδία για έλεγχο</div>
                  <ul style={{ margin: '6px 0 0 16px', color: 'var(--dh-muted)' }}>
                    {ocrExtractedFields.map(field => <li key={field}>{field}</li>)}
                  </ul>
                </div>
              )}
              {ocrRawText && (
                <details style={{ marginTop: 10 }}>
                  <summary className="row-subtitle" style={{ cursor: 'pointer' }}>Προβολή κειμένου OCR</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, maxHeight: 220, overflow: 'auto', color: 'var(--dh-muted)', fontSize: 12 }}>
                    {ocrRawText}
                  </pre>
                </details>
              )}
              {identityFile && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={e => setIdentityConfirmed(e.target.checked)}
                  />
                  <span className="row-subtitle">
                    Επιβεβαιώνω ότι το έγγραφο αφορά τον συγκεκριμένο εργαζόμενο και μπορεί να αποθηκευτεί στο EmployeeDocuments.
                  </span>
                </label>
              )}
            </div>
          </div>
        </SectionCard>

          <SectionCard title="Βασικά στοιχεία">
            <div className="form-grid">
              <FormField label="Τύπος προσωπικού">
                <select className="field-select" value={form.personType} onChange={e => update('personType', e.target.value)}>
                  <option>DYKAT employee</option>
                  <option>Subcontractor</option>
                  <option>External</option>
                </select>
              </FormField>

              <FormField label="Εταιρεία">
                <select className="field-select" value={form.company} onChange={e => update('company', e.target.value)}>
                  {companyOptions.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Όνομα">
                <input className="field-input" value={form.firstName} onChange={e => update('firstName', e.target.value)} />
              </FormField>

              <FormField label="Επώνυμο">
                <input className="field-input" value={form.lastName} onChange={e => update('lastName', e.target.value)} />
              </FormField>

              <FormField label="Πατρώνυμο">
                <input className="field-input" value={form.fatherName} onChange={e => update('fatherName', e.target.value)} />
              </FormField>

              <FormField label="Ημερομηνία γέννησης">
                <input type="date" className="field-input" value={form.birthDate} onChange={e => update('birthDate', e.target.value)} />
              </FormField>

              <FormField label="Φύλο">
                <input className="field-input" value={form.gender} onChange={e => update('gender', e.target.value)} />
              </FormField>

              <FormField label="Ιθαγένεια">
                <input className="field-input" value={form.nationality} onChange={e => update('nationality', e.target.value)} />
              </FormField>

              <FormField label="Αρχή έκδοσης ταυτότητας/διαβατηρίου">
                <input className="field-input" value={form.identityIssuingAuthority} onChange={e => update('identityIssuingAuthority', e.target.value)} />
              </FormField>

              <FormField label="Λήξη ταυτότητας/διαβατηρίου">
                <input type="date" className="field-input" value={form.identityExpiryDate} onChange={e => update('identityExpiryDate', e.target.value)} />
              </FormField>

              <FormField label="Θέση / ειδικότητα">
                <select className="field-select" value={form.position} onChange={e => update('position', e.target.value)}>
                  <option value="">Επιλογή ειδικότητας</option>
                  {positionOptions.map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Εργοτάξιο">
                <select className="field-select" value={form.siteId} onChange={e => update('siteId', Number(e.target.value))}>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Ημερομηνία πρόσληψης">
                <input type="date" className="field-input" value={form.hireDate} onChange={e => update('hireDate', e.target.value)} />
              </FormField>
            </div>
          </SectionCard>
        <SectionCard title="Επικοινωνία & ταυτοποίηση">
          <div className="form-grid">
            <FormField label="Κινητό">
              <input className="field-input" value={form.mobile} onChange={e => update('mobile', e.target.value)} />
            </FormField>
            <FormField label="Email">
              <input className="field-input" value={form.email} onChange={e => update('email', e.target.value)} />
            </FormField>
            <FormField label="ΑΔΤ / Διαβατήριο">
              <input
                className="field-input"
                value={form.identityDocumentNo || form.idOrTaxNo || ''}
                onChange={e => {
                  update('identityDocumentNo', e.target.value);
                  update('idOrTaxNo', e.target.value);
                }}
              />
            </FormField>
            <FormField label="ΑΦΜ">
              <input className="field-input" value={form.taxNumber} onChange={e => update('taxNumber', e.target.value)} />
            </FormField>
          </div>
        </SectionCard>
      </div>

      <div className="footer-actions">
        <button className="secondary-btn" onClick={onBack}>Άκυρο</button>
        <button className="primary-btn" onClick={submitEmployee}><Save size={17} />Αποθήκευση</button>
      </div>
    </div>
  );
}
