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

interface OcrWordBox {
  text: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerY: number;
  height: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function normalizeForMatch(value: string): string {
  return cleanOcrCandidate(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function extractOcrWords(annotation: unknown): OcrWordBox[] {
  const root = asRecord(annotation);
  if (!root) return [];

  const words: OcrWordBox[] = [];

  for (const page of asArray(root.pages)) {
    for (const block of asArray(asRecord(page)?.blocks)) {
      for (const paragraph of asArray(asRecord(block)?.paragraphs)) {
        for (const word of asArray(asRecord(paragraph)?.words)) {
          const wordRecord = asRecord(word);
          if (!wordRecord) continue;

          const textValue = asArray(wordRecord.symbols)
            .map(symbol => asRecord(symbol)?.text)
            .filter((entry): entry is string => typeof entry === 'string')
            .join('');

          const vertices = asArray(asRecord(wordRecord.boundingBox)?.vertices)
            .map(vertex => asRecord(vertex))
            .filter((vertex): vertex is Record<string, unknown> => Boolean(vertex));

          const xs = vertices.map(vertex => getNumber(vertex.x) ?? 0);
          const ys = vertices.map(vertex => getNumber(vertex.y) ?? 0);

          if (!textValue || xs.length === 0 || ys.length === 0) continue;

          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          words.push({
            text: textValue,
            minX,
            maxX,
            minY,
            maxY,
            centerY: (minY + maxY) / 2,
            height: Math.max(1, maxY - minY),
          });
        }
      }
    }
  }

  return words;
}

function groupOcrWordsIntoRows(words: OcrWordBox[]): OcrWordBox[][] {
  const sorted = [...words].sort((a, b) => a.centerY - b.centerY);
  const medianHeight = [...words].sort((a, b) => a.height - b.height)[Math.floor(words.length / 2)]?.height ?? 10;
  const threshold = Math.max(8, medianHeight * 0.75);
  const rows: OcrWordBox[][] = [];

  for (const word of sorted) {
    const row = rows.find(candidate => {
      const averageY = candidate.reduce((sum, item) => sum + item.centerY, 0) / candidate.length;
      return Math.abs(averageY - word.centerY) <= threshold;
    });

    if (row) {
      row.push(word);
    } else {
      rows.push([word]);
    }
  }

  return rows.map(row => row.sort((a, b) => a.minX - b.minX));
}

function getStructuredValueRightOfLabel(annotation: unknown, labels: string[], skipLabels: string[] = []): string {
  const rows = groupOcrWordsIntoRows(extractOcrWords(annotation));

  for (const row of rows) {
    const rowText = normalizeForMatch(row.map(word => word.text).join(' '));

    if (skipLabels.some(label => rowText.includes(normalizeForMatch(label)))) {
      continue;
    }

    const matchedLabel = labels.find(label => rowText.includes(normalizeForMatch(label)));
    if (!matchedLabel) continue;

    const labelTokens = normalizeForMatch(matchedLabel).split(/\s+/).filter(Boolean);
    const labelWords = row.filter(word => labelTokens.includes(normalizeForMatch(word.text)));

    if (labelWords.length === 0) continue;

    const labelEndX = Math.max(...labelWords.map(word => word.maxX));
    const value = cleanOcrCandidate(row.filter(word => word.minX > labelEndX + 4).map(word => word.text).join(' '));

    if (value) {
      return value;
    }
  }

  return '';
}


function getImmediateRightValue(words: OcrWordBox[]): string {
  if (words.length === 0) {
    return '';
  }

  const sorted = [...words].sort((a, b) => a.minX - b.minX);
  const selected: OcrWordBox[] = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = selected[selected.length - 1];
    const current = sorted[index];
    const gap = current.minX - previous.maxX;

    if (gap > 45) {
      break;
    }

    selected.push(current);
  }

  return cleanOcrCandidate(selected.map(word => word.text).join(' '));
}


function getMeLicenseValueRightOfLabel(annotation: unknown, labels: string[], skipLabels: string[] = []): string {
  const words = extractOcrWords(annotation);
  const rows = groupOcrWordsIntoRows(words);

  for (const row of rows) {
    const rowText = normalizeForMatch(row.map(word => word.text).join(' '));

    if (skipLabels.some(label => rowText.includes(normalizeForMatch(label)))) {
      continue;
    }

    const matchedLabel = labels.find(label => {
      const tokens = normalizeForMatch(label).split(/\s+/).filter(token => token.length > 1);
      return tokens.every(token => rowText.includes(token));
    });

    if (!matchedLabel) {
      continue;
    }

    const labelTokens = normalizeForMatch(matchedLabel).split(/\s+/).filter(token => token.length > 1);

    const labelWords = row.filter(word => {
      const normalizedWord = normalizeForMatch(word.text);
      return labelTokens.some(token => normalizedWord.includes(token) || token.includes(normalizedWord));
    });

    const effectiveLabelWords = labelWords.length > 0 ? labelWords : row.slice(0, Math.min(3, row.length));
    const labelEndX = Math.max(...effectiveLabelWords.map(word => word.maxX));
    const labelCenterY = effectiveLabelWords.reduce((sum, word) => sum + word.centerY, 0) / effectiveLabelWords.length;
    const labelHeight = Math.max(...effectiveLabelWords.map(word => word.height));

    const rightWords = words
      .filter(word =>
        word.minX > labelEndX + 8 &&
        Math.abs(word.centerY - labelCenterY) <= Math.max(18, labelHeight * 1.6)
      )
      .sort((a, b) => a.minX - b.minX);

    const value = getImmediateRightValue(rightWords);

    if (value) {
      return value;
    }
  }

  return '';
}


function detectVehicleCategoryFromOcrText(text: string, typeOptions: string[]): string | undefined {
  const normalized = normalizeForMatch(text);

  if (
    normalized.includes('ΜΗΧΑΝΗΜΑΤΟΣ ΕΡΓΩΝ') ||
    normalized.includes('ΜΗΧΑΝΗΜΑΤΟΣ ΕΡΓΟΥ') ||
    normalized.includes('ΕΙΔΟΣ ME') ||
    normalized.includes('ΕΙΔΟΣ ΜΕ') ||
    normalized.includes('ΤΥΠΟΥ ΜΕ')
  ) {
    return typeOptions.find(option => option.toLowerCase().includes('μηχ')) ?? 'Μηχάνημα Έργου';
  }

  if (normalized.includes('ΑΔΕΙΑ ΚΥΚΛΟΦΟΡΙΑΣ ΟΧΗΜΑΤΟΣ')) {
    return typeOptions.find(option => option.toLowerCase().includes('όχη') || option.toLowerCase().includes('οχη')) ?? 'Όχημα';
  }

  return undefined;
}


function getManufacturerStrictRightOfLabel(annotation: unknown): string {
  return getMeLicenseValueRightOfLabel(
    annotation,
    ['Εργοστ. κατασκευής', 'Εργοστ κατασκευής'],
    ['κινητ', 'ΧΩΡ', 'ΚΑΔ', 'ΕΚΣΚΑΦΕΑ']
  );
}


interface ParsedVehicleOcrFields {
  plate?: string;
  chassisNumber?: string;
  manufacturer?: string;
  model?: string;
}

function cleanOcrCandidate(value: string): string {
  return value
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;.·-]+|[\s:;.·-]+$/g, '')
    .trim();
}

function getValueNearLabel(text: string, labels: string[], skipLabels: string[] = []): string {
  const lines = normalizeOcrText(text)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lowerLine = line.toLowerCase();

    if (skipLabels.some(skip => lowerLine.includes(skip.toLowerCase()))) {
      continue;
    }

    for (const label of labels) {
      const lowerLabel = label.toLowerCase();
      const labelIndex = lowerLine.indexOf(lowerLabel);

      if (labelIndex >= 0) {
        const directValue = cleanOcrCandidate(line.slice(labelIndex + label.length));

        if (directValue) {
          return directValue;
        }

        return cleanOcrCandidate(lines[index + 1] ?? '');
      }
    }
  }

  return '';
}

function isValidChassisCandidate(value: string): boolean {
  const cleaned = cleanOcrCandidate(value).toLowerCase();

  if (!cleaned) return false;
  if (!/[0-9a-zα-ω]/i.test(cleaned)) return false;

  const rejectedWords = [
    'εργοστ',
    'κατασκευ',
    'κινητ',
    'τύπος',
    'τυπος',
    'μοντέλο',
    'μοντελο',
    'καύσιμο',
    'καυσιμο',
    'ισχύς',
    'ισχυς'
  ];

  return !rejectedWords.some(word => cleaned.includes(word));
}


function normalizeMeLicenseNumber(value: string): string {
  const cleaned = cleanOcrCandidate(value)
    .replace(/[.·]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bME\b/i, 'ΜΕ')
    .replace(/\bIX\b/i, 'ΙΧ')
    .trim();

  const match = cleaned.match(/(?:ΜΕ\s*)?(\d{4,8})(?:\s*(ΙΧ|IX))?/i);

  if (!match) {
    return '';
  }

  return `ΜΕ ${match[1]}${match[2] ? ' ΙΧ' : ''}`;
}

function extractMeLicenseNumber(text: string, fullTextAnnotation?: unknown): string {
  const structuredValue = getMeLicenseValueRightOfLabel(fullTextAnnotation, [
    'ΑΡΙΘΜΟΣ ΑΔΕΙΑΣ',
    'Αριθμός Αδείας',
    'Αριθμός Άδειας'
  ]);

  const structuredLicense = normalizeMeLicenseNumber(structuredValue);

  if (structuredLicense) {
    return structuredLicense;
  }

  const singleLine = normalizeOcrText(text).replace(/\s+/g, ' ');
  const fallbackMatch =
    singleLine.match(/ΑΡΙΘΜΟΣ\s+ΑΔΕΙΑΣ[^0-9]{0,100}(\d{4,8})(?:[^A-ZΑ-Ω0-9]{0,20}(ΙΧ|IX))?/i) ??
    singleLine.match(/(?:ΜΕ|ME)[^0-9]{0,60}(\d{4,8})(?:[^A-ZΑ-Ω0-9]{0,20}(ΙΧ|IX))?/i);

  if (!fallbackMatch) {
    return '';
  }

  return `ΜΕ ${fallbackMatch[1]}${fallbackMatch[2] ? ' ΙΧ' : ''}`;
}


function parseBasicVehicleOcrFields(text: string, fullTextAnnotation?: unknown): ParsedVehicleOcrFields {
  const normalized = normalizeOcrText(text);
  const plate = extractMeLicenseNumber(normalized, fullTextAnnotation);

  const chassisCandidate = getMeLicenseValueRightOfLabel(fullTextAnnotation, ['Αριθμός Πλαισίου', 'Αριθμος Πλαισιου', 'VIN']) || getValueNearLabel(normalized, ['Αριθμός Πλαισίου', 'Αριθμος Πλαισιου', 'Αρ. Πλαισίου', 'Αρ Πλαισίου', 'Πλαίσιο', 'Πλαισίου', 'VIN']);

  return {
    plate,
    chassisNumber: isValidChassisCandidate(chassisCandidate) ? chassisCandidate : '',
    manufacturer: getManufacturerStrictRightOfLabel(fullTextAnnotation),
    model: getMeLicenseValueRightOfLabel(fullTextAnnotation, ['Τύπος', 'Τύπος / Μοντέλο', 'Μοντέλο'], ['Τύπος κινητήρα', 'Κωδικός Έγκρισης τύπου', 'Έγκρισης τύπου']) || getValueNearLabel(normalized, ['Τύπος', 'Τύπος / Μοντέλο', 'Μοντέλο'], ['Τύπος κινητήρα', 'Κωδικός Έγκρισης τύπου', 'Έγκρισης τύπου']),
  };
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
      const result = await dataProvider.extractDocumentText(file, { documentType: 'VehicleInitialDocument' });
      const text = result.text ?? '';

      const isDemoOcr = (result as { status?: string }).status === 'demo';

      const parsedVehicleFields = parseBasicVehicleOcrFields(text, (result as { fullTextAnnotation?: unknown }).fullTextAnnotation);

      const nextPlate = parsedVehicleFields.plate || getOcrValue(text, ['Πινακίδα', 'Αριθμός κυκλοφορίας', 'RegistrationNumber']);
      const nextChassisNumber = parsedVehicleFields.chassisNumber;
      const nextManufacturer = parsedVehicleFields.manufacturer;
      const nextModel = parsedVehicleFields.model;

      setForm(prev => {
        const documentCategory = detectVehicleCategoryFromOcrText(text, typeOptions) ?? prev.type;

        return {
          ...prev,
          plate: nextPlate || prev.plate,
          code: prev.code,
          type: documentCategory,
          chassisNumber: nextChassisNumber || prev.chassisNumber,
          manufacturer: nextManufacturer || prev.manufacturer,
          model: nextModel || prev.model,
        };
      });

      setOcrExtractedFields(
        text
          .split(/\n/)
          .map(line => line.trim())
          .filter(Boolean)
          .slice(0, 40)
      );

      setOcrStatus(
        isDemoOcr
          ? 'Demo OCR: τα πεδία προσυμπληρώθηκαν δοκιμαστικά. Ελέγξτε και διορθώστε πριν την αποθήκευση.'
          : result.confidence > 0.2
            ? 'Το OCR ολοκληρώθηκε. Ελέγξτε τα πεδία πριν την αποθήκευση.'
            : 'Το OCR επέστρεψε χαμηλή βεβαιότητα. Ελέγξτε προσεκτικά τα πεδία πριν την αποθήκευση.'
      );
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
          <p className="row-subtitle" style={{ marginTop: 8 }}>
            Ανεβάστε άδεια ή αποδεικτικό αριθμού πλαισίου/VIN. Το OCR θα προσπαθήσει να αναγνωρίσει αριθμό άδειας, αριθμό πλαισίου, εργοστάσιο και τύπο/μοντέλο. Η κατηγορία παραμένει διαθέσιμη για τελικό έλεγχο.
          </p>


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

            <FormField label="Αριθμός άδειας / πινακίδα">
              <input className="field-input" value={form.plate} onChange={e => update('plate', e.target.value)} />
            </FormField>

            <FormField label="Αριθμός πλαισίου / VIN">
              <input className="field-input" value={form.chassisNumber ?? ''} onChange={e => update('chassisNumber', e.target.value)} />
            </FormField>

            <FormField label="Εργοστάσιο κατασκευής">
              <input className="field-input" value={form.manufacturer ?? ''} onChange={e => update('manufacturer', e.target.value)} />
            </FormField>

            <FormField label="Τύπος / μοντέλο">
              <input className="field-input" value={form.model ?? ''} onChange={e => update('model', e.target.value)} />
            </FormField>

            <FormField label="Κατηγορία">
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
