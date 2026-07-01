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

  function applyOcrFields(text: string) {
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    const extract = (label: string) => {
      const match = normalizedText.match(new RegExp(`${escapeRegex(label)}\\s*[:\-]\\s*(.+)`, 'i'));
      return match ? normalizeValue(match[1].split(/\s{2,}/)[0]) : '';
    };

    const lastName = extract('Επώνυμο') || extract('Surname') || extract('Lastname');
    const firstName = extract('Όνομα') || extract('Name') || extract('Firstname');
    const fatherName = extract('Πατρώνυμο') || extract('Father') || extract('FatherName');
    const birthDate = parseDateToIso(extract('Ημερομηνία γέννησης') || extract('Birth date') || extract('Date of birth')) ?? '';
    const expiryDate = parseDateToIso(extract('Ημερομηνία λήξης') || extract('Λήξη') || extract('Expiry date') || extract('Date of expiry')) ?? '';
    const explicitId = extract('ΑΔΤ / Αρ. Διαβατηρίου') || extract('ΑΔΤ') || extract('Passport') || extract('Passport No') || extract('Document No') || extract('ID');
    const identityMatch = normalizedText.match(/\b[A-ZΑ-Ω]{1,3}\s?\d{5,9}\b/u);
    const idOrTaxNo = normalizeIdentityNumber(explicitId || identityMatch?.[0]);
    const gender = extract('Φύλο') || extract('Gender');
    const nationality = extract('Ιθαγένεια') || extract('Nationality');
    const issuingAuthority = extract('Αρχή έκδοσης') || extract('Issued by') || extract('Authority');

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
  }

  async function handleOcr(file: File | null) {
    if (!file) return;

    setOcrLoading(true);
    setOcrStatus('');
    setOcrExtractedFields([]);
    setIdentityConfirmed(false);

    try {
      const result = await dataProvider.extractDocumentText(file, { documentType: form.identityDocumentType ?? 'IdentityDocument' });
      applyOcrFields(result.text);
      setOcrStatus(result.text.trim().length === 0
        ? 'Το OCR ολοκληρώθηκε αλλά δεν επέστρεψε αναγνώσιμο κείμενο.'
        : result.confidence > 0.2
          ? 'Το OCR ολοκληρώθηκε και τα πεδία συμπληρώθηκαν για έλεγχο.'
          : 'Το OCR επέστρεψε κείμενο με χαμηλή βεβαιότητα. Ελέγξτε και συμπληρώστε τα πεδία πριν την αποθήκευση.');
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
