import { ArrowLeft, Camera, Save } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { FormField } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { dataProvider } from '../services/dataProvider';
import type { Site, Vehicle } from '../types/models';

interface Props {
  onBack: () => void;
  onSave: (vehicle: Omit<Vehicle, 'id'>) => void;
  sites: Site[];
  selectedSiteId: number | 'all';
  ownerOptions: string[];
  typeOptions: string[];
}

function normalizeOcrText(value: string): string {
  return value
    .replace(/\r/g, '\n')
    .replace(/[：]/g, ':')
    .trim();
}

function getOcrValue(text: string, labels: string[]): string {
  const lines = normalizeOcrText(text)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (labels.some(label => key.includes(label.toLowerCase()))) {
      return value;
    }
  }

  return '';
}

export function VehicleFormPage({ onBack, onSave, sites, selectedSiteId, ownerOptions, typeOptions }: Props) {
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>({
    code: 'AUTO',
    plate: '',
    type: typeOptions[0] ?? 'Όχημα',
    owner: ownerOptions[0] ?? 'ΔΥΚΑΤ',
    siteId: selectedSiteId === 'all' ? (sites[0]?.id ?? 0) : selectedSiteId,
    status: 'Active',
  });

  const [ocrDocumentType, setOcrDocumentType] = useState('Άδεια Κυκλοφορίας / Αποδεικτικό Αριθμού Πλαισίου');
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrExtractedFields, setOcrExtractedFields] = useState<string[]>([]);
  const ocrInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (ocrPreviewUrl) {
        URL.revokeObjectURL(ocrPreviewUrl);
      }
    };
  }, [ocrPreviewUrl]);

  const update = (key: keyof Omit<Vehicle, 'id'>, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  async function handleOcrFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (ocrPreviewUrl) {
      URL.revokeObjectURL(ocrPreviewUrl);
    }

    setOcrLoading(true);
    setOcrFileName(file.name);
    setOcrPreviewUrl(URL.createObjectURL(file));
    setOcrStatus('');
    setOcrExtractedFields([]);

    try {
      const result = await dataProvider.extractDocumentText(file, { documentType: ocrDocumentType });
      const text = result.text ?? '';

      if ((result as { status?: string }).status === 'demo') {
        setOcrStatus('Demo OCR: το αποτέλεσμα εμφανίστηκε μόνο για έλεγχο και δεν χρησιμοποιήθηκε για αυτόματη συμπλήρωση πεδίων.');
        return;
      }

      const nextPlate = getOcrValue(text, ['Πινακίδα', 'Αριθμός κυκλοφορίας', 'RegistrationNumber']);
      const nextCode = getOcrValue(text, ['Κωδικός', 'VehicleID']);
      const nextType = getOcrValue(text, ['Τύπος', 'VehicleType']);
      const nextOwner = getOcrValue(text, ['Ιδιοκτησία', 'Ιδιοκτήτης', 'Owner']);

      setForm(prev => ({
        ...prev,
        plate: nextPlate || prev.plate,
        code: nextCode || prev.code,
        type: nextType || prev.type,
        owner: nextOwner || prev.owner,
      }));

      setOcrExtractedFields(
        text
          .split(/\n/)
          .map(line => line.trim())
          .filter(Boolean)
          .slice(0, 8)
      );

      setOcrStatus(result.confidence > 0.2 ? 'Το OCR ολοκληρώθηκε. Ελέγξτε τα πεδία πριν την αποθήκευση.' : 'Ενεργοποιήθηκε demo OCR. Ελέγξτε τα πεδία πριν την αποθήκευση.');
    } catch (error) {
      console.warn('Vehicle OCR failed.', error);
      setOcrStatus('Δεν ήταν δυνατή η επεξεργασία OCR.');
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Νέο όχημα / μηχάνημα" subtitle="Καταχώρηση οχήματος ή μηχανήματος έργου" actions={<button className="secondary-btn" onClick={onBack}><ArrowLeft size={17} />Πίσω</button>} />

      <div className="form">
        <SectionCard title="OCR αρχικής καταχώρησης οχήματος / ΜΕ">
          <FormField label="Τύπος εγγράφου">
            <select className="field-select" value={ocrDocumentType} onChange={e => setOcrDocumentType(e.target.value)}>
              <option value="Άδεια Κυκλοφορίας Οχήματος">Άδεια Κυκλοφορίας Οχήματος</option>
              <option value="Άδεια Κυκλοφορίας / Χρήσης Μηχανήματος Έργου">Άδεια Κυκλοφορίας / Χρήσης Μηχανήματος Έργου</option>
              <option value="Αποδεικτικό Αριθμού Πλαισίου">Αποδεικτικό Αριθμού Πλαισίου / VIN</option>
            </select>
          </FormField>

          <input ref={ocrInputRef} className="field-input" style={{ marginTop: 10 }} type="file" accept="image/*,.pdf" onChange={handleOcrFileChange} />

          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="primary-btn" type="button" onClick={() => ocrInputRef.current?.click()} disabled={ocrLoading}>
              <Camera size={17} />{ocrLoading ? 'Ανάγνωση…' : 'Έναρξη OCR'}
            </button>
            {ocrFileName && <span className="row-subtitle">Αρχείο: {ocrFileName}</span>}
          </div>

          {ocrPreviewUrl && <img src={ocrPreviewUrl} alt="Προεπισκόπηση OCR" style={{ marginTop: 12, maxWidth: '100%', maxHeight: 220, objectFit: 'contain', border: '1px solid var(--dh-line)', borderRadius: 10 }} />}
          {ocrStatus && <div className="row-subtitle" style={{ marginTop: 10 }}>{ocrStatus}</div>}

          {ocrExtractedFields.length > 0 && (
            <ul style={{ margin: '8px 0 0 18px', color: 'var(--dh-muted)' }}>
              {ocrExtractedFields.map(field => <li key={field}>{field}</li>)}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Βασικά στοιχεία">
          <div className="form-grid">
            <FormField label="Κωδικός">
              <input className="field-input" value={form.code} onChange={e => update('code', e.target.value)} />
            </FormField>

            <FormField label="Πινακίδα / αριθμός κυκλοφορίας">
              <input className="field-input" value={form.plate} onChange={e => update('plate', e.target.value)} />
            </FormField>

            <FormField label="Τύπος">
              <select className="field-select" value={form.type} onChange={e => update('type', e.target.value)}>
                {typeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Ιδιοκτήτης / εταιρεία">
              <select className="field-select" value={form.owner} onChange={e => update('owner', e.target.value)}>
                {ownerOptions.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
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

            <FormField label="Κατάσταση">
              <select className="field-select" value={form.status} onChange={e => update('status', e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Expired">Expired</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </FormField>
          </div>
        </SectionCard>
      </div>

      <div className="footer-actions">
        <button className="secondary-btn" onClick={onBack}>Άκυρο</button>
        <button className="primary-btn" onClick={() => onSave(form)}><Save size={17} />Αποθήκευση</button>
      </div>
    </div>
  );
}
