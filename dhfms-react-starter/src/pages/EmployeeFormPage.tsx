import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { FormField } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { dataProvider } from '../services/dataProvider';
import type { Employee } from '../types/models';

interface Props {
  onBack: () => void;
  onSave: (employee: Omit<Employee, 'id' | 'fullName'>) => void;
}

type EmployeeFormState = Omit<Employee, 'id' | 'fullName'> & {
  fatherName: string;
  birthDate: string;
  gender: string;
  issuingAuthority: string;
};

function normalizeValue(value: string | undefined): string {
  return (value ?? '').trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function EmployeeFormPage({ onBack, onSave }: Props) {
  const [form, setForm] = useState<EmployeeFormState>({
    employeeNo: 'AUTO',
    firstName: '',
    lastName: '',
    company: 'DYKAT',
    personType: 'DYKAT employee',
    position: '',
    siteId: 2,
    status: 'Active',
    mobile: '',
    email: '',
    idOrTaxNo: '',
    hireDate: new Date().toISOString().slice(0, 10),
    fatherName: '',
    birthDate: '',
    gender: '',
    issuingAuthority: '',
  });
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
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
    const birthDate = extract('Ημερομηνία γέννησης') || extract('Birth date') || extract('Date of birth');
    const idOrTaxNo = extract('ΑΔΤ / Αρ. Διαβατηρίου') || extract('ΑΔΤ') || extract('Passport') || extract('ID');
    const gender = extract('Φύλο') || extract('Gender');
    const issuingAuthority = extract('Αρχή έκδοσης') || extract('Issued by') || extract('Authority');

    setForm(prev => ({
      ...prev,
      firstName: firstName || prev.firstName,
      lastName: lastName || prev.lastName,
      fatherName: fatherName || prev.fatherName,
      birthDate: birthDate || prev.birthDate,
      idOrTaxNo: idOrTaxNo || prev.idOrTaxNo,
      gender: gender || prev.gender,
      issuingAuthority: issuingAuthority || prev.issuingAuthority,
    }));
  }

  async function handleOcr(file: File | null) {
    if (!file) return;

    setOcrLoading(true);
    setOcrStatus('');

    try {
      const result = await dataProvider.extractDocumentText(file);
      applyOcrFields(result.text);
      setOcrStatus(result.confidence > 0.2 ? 'Το OCR ολοκληρώθηκε και τα πεδία συμπληρώθηκαν για έλεγχο.' : 'Ενεργοποιήθηκε mock OCR fallback. Ελέγξτε τα πεδία πριν την αποθήκευση.');
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
    setOcrPreviewUrl(URL.createObjectURL(file));
    await handleOcr(file);
  }

  const submitEmployee = () => {
    const { fatherName, birthDate, gender, issuingAuthority, ...employeeData } = form;
    onSave(employeeData);
  };

  return (
    <div className="page">
      <PageHeader title="Νέος εργαζόμενος" subtitle="Καταχώρηση προσωπικού / υπεργολάβου" actions={<button className="secondary-btn" onClick={onBack}><ArrowLeft size={17} />Πίσω</button>} />
      <div className="form">
        <SectionCard title="OCR ταυτότητας (προαιρετικό)">
          <div className="form-grid">
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="field-label" htmlFor="employee-ocr-file">Ανέβασμα εικόνας / φωτογραφία ταυτότητας</label>
              <input ref={ocrInputRef} id="employee-ocr-file" className="field-input" type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
              <div className="row-subtitle" style={{ marginTop: 8 }}>Η OCR συμπληρώνει τα πεδία για έλεγχο. Δεν αποθηκεύονται αυτόματα οι τιμές.</div>
            </div>
            {ocrPreviewUrl && (
              <div style={{ gridColumn: '1 / -1' }}>
                <img src={ocrPreviewUrl} alt="Προεπισκόπηση OCR" style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', border: '1px solid var(--dh-line)', borderRadius: 10 }} />
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="button" onClick={() => ocrInputRef.current?.click()} disabled={ocrLoading}><Camera size={17} />{ocrLoading ? 'Αναζήτηση OCR…' : 'Έναρξη OCR'}</button>
              {ocrFileName && <div className="row-subtitle" style={{ marginTop: 8 }}>Αρχείο: {ocrFileName}</div>}
              {ocrStatus && <div className="row-subtitle" style={{ marginTop: 8 }}>{ocrStatus}</div>}
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
              <input className="field-input" value={form.company} onChange={e => update('company', e.target.value)} />
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
            <FormField label="Αρχή έκδοσης">
              <input className="field-input" value={form.issuingAuthority} onChange={e => update('issuingAuthority', e.target.value)} />
            </FormField>
            <FormField label="Θέση / ειδικότητα">
              <input className="field-input" value={form.position} onChange={e => update('position', e.target.value)} />
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
            <FormField label="ΑΔΤ / Διαβατήριο / ΑΦΜ">
              <input className="field-input" value={form.idOrTaxNo} onChange={e => update('idOrTaxNo', e.target.value)} />
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
