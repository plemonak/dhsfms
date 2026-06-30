import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, FileText, History, Pencil, Upload } from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import type { EvidenceDocument, Vehicle } from '../types/models';

interface VehicleProfilePageProps {
  vehicle?: Vehicle;
  documents: EvidenceDocument[];
  onBack: () => void;
  onEdit: () => void;
  onAddDocument: (document: Omit<EvidenceDocument, 'id'>) => void;
}

type VehicleDocumentCategory = {
  key: string;
  title: string;
  subtitle: string;
  expiry?: string;
  keywords: string[];
  hasExpiry: boolean;
  required: boolean;
  applicable: boolean;
  legalNote?: string;
};

type InsuranceOcrResult = {
  startDate?: string;
  expiryDate?: string;
  matchedVehicle: boolean;
  matchedBy?: 'plate' | 'chassis';
  warning?: string;
};

type PendingVehicleDocument = Omit<EvidenceDocument, 'id'> & {
  fileName?: string;
  sourceFile?: File;
  evidenceFolderPath?: string;
  matchedVehicle?: boolean;
  matchedBy?: 'plate' | 'chassis';
  vehicleMatchConfirmed?: boolean;
  warning?: string;
};

function isExpired(date?: string): boolean {
  if (!date) return false;
  const parsedDate = parseDateForComparison(date);
  if (!parsedDate) return false;
  return parsedDate < new Date(new Date().toDateString());
}

function isExpiringSoon(date?: string): boolean {
  if (!date) return false;
  const today = new Date(new Date().toDateString());
  const expiry = parseDateForComparison(date);
  if (!expiry) return false;
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
}

function documentMatches(document: EvidenceDocument, keywords: string[]): boolean {
  const value = document.documentType.toLowerCase();
  return keywords.some(keyword => value.includes(keyword.toLowerCase()));
}

function sortDocuments(documents: EvidenceDocument[]): EvidenceDocument[] {
  return [...documents].sort((a, b) => {
    const aDate = parseDateForComparison(a.expiryDate ?? a.issueDate);
    const bDate = parseDateForComparison(b.expiryDate ?? b.issueDate);
    return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
  });
}

function statusLabel(category: VehicleDocumentCategory, current?: EvidenceDocument): string {
  if (!category.applicable) return 'Δεν απαιτείται';
  if (!current) return 'Λείπει';
  const expiry = current.expiryDate ?? category.expiry;

  if (!category.hasExpiry) return 'Διαθέσιμο';
  if (isExpired(expiry)) return 'Ληγμένο';
  if (isExpiringSoon(expiry)) return 'Λήγει σύντομα';
  return 'Ενεργό';
}

function formatDateForDisplay(date?: string): string {
  if (!date) return '';

  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const slashMatch = date.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];

    // Legacy flow/browser dates may arrive as MM/DD/YYYY. Ambiguous dates are treated as legacy MM/DD.
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  return date;
}

function parseDateForComparison(date?: string): Date | undefined {
  const displayDate = formatDateForDisplay(date);
  const match = displayDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  return new Date(year, month - 1, day);
}

function normalizeForSearch(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toUpperCase()
    .replace(/Μ/g, 'M')
    .replace(/Ε/g, 'E')
    .replace(/Ι/g, 'I')
    .replace(/Χ/g, 'X');
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

function normalizeDateInput(value: string): string {
  return parseDateToIso(value) ?? value;
}

function extractAllIsoDates(text: string): string[] {
  const matches = Array.from(text.matchAll(/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/g));
  return matches
    .map(match => parseDateToIso(match[0]))
    .filter((date): date is string => Boolean(date));
}

function extractDateNearLabel(text: string, labels: string[]): string | undefined {
  const lines = text
    .split(/\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const normalizedLabels = labels.map(normalizeForSearch);

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeForSearch(lines[index]);

    if (!normalizedLabels.some(label => normalizedLine.includes(label))) {
      continue;
    }

    const sameLineDate = parseDateToIso(lines[index]);
    if (sameLineDate) return sameLineDate;

    for (let offset = 1; offset <= 4; offset += 1) {
      const nextLineDate = parseDateToIso(lines[index + offset] ?? '');
      if (nextLineDate) return nextLineDate;
    }
  }

  return undefined;
}

function parseInsuranceOcr(text: string, vehicle: Vehicle): InsuranceOcrResult {
  const normalizedText = normalizeForSearch(text);
  const normalizedPlate = normalizeForSearch(vehicle.plate);
  const normalizedChassis = normalizeForSearch(vehicle.chassisNumber);

  const matchedPlate = Boolean(normalizedPlate && normalizedText.includes(normalizedPlate));
  const matchedChassis = Boolean(normalizedChassis && normalizedText.includes(normalizedChassis));
  const matchedVehicle = matchedPlate || matchedChassis;
  const matchedBy = matchedPlate ? 'plate' : matchedChassis ? 'chassis' : undefined;

  const allDates = extractAllIsoDates(text);

  let startDate = extractDateNearLabel(text, [
    'Έναρξη Ασφάλισης',
    'Εναρξη Ασφαλισης',
    'Έναρξη',
    'Εναρξη',
  ]);

  let expiryDate = extractDateNearLabel(text, [
    'Λήξη Ασφάλισης',
    'Ληξη Ασφαλισης',
    'Λήξη',
    'Ληξη',
  ]);

  if (allDates.length >= 3 && (!startDate || !expiryDate)) {
    startDate = startDate ?? allDates[1];
    expiryDate = expiryDate ?? allDates[2];
  } else if (allDates.length >= 2 && (!startDate || !expiryDate)) {
    startDate = startDate ?? allDates[0];
    expiryDate = expiryDate ?? allDates[1];
  }

  return {
    startDate,
    expiryDate,
    matchedVehicle,
    matchedBy,
    warning: matchedVehicle
      ? undefined
      : 'Δεν επιβεβαιώθηκε αυτόματα ταύτιση με αριθμό άδειας/πινακίδα ή αριθμό πλαισίου.',
  };
}

function getVehicleEvidenceFolder(vehicle: Vehicle, category: VehicleDocumentCategory): string {
  const vehicleFolder = vehicle.plate || vehicle.code || String(vehicle.id);
  return `Vehicles/${vehicleFolder}/${category.key}`;
}

function isWorkMachine(vehicle?: Vehicle): boolean {
  const value = `${vehicle?.type ?? ''} ${vehicle?.model ?? ''}`.toLowerCase();
  return value.includes('μηχ') || value.includes('μ.ε') || value.includes('με ') || value.includes('έργου') || value.includes('εργου');
}

function requiresLiftingCertificate(vehicle?: Vehicle): boolean {
  const value = `${vehicle?.type ?? ''} ${vehicle?.model ?? ''}`.toLowerCase();
  return [
    'γεραν',
    'καλαθο',
    'ανυψ',
    'περονο',
    'forklift',
    'crane',
    'platform',
    'telehandler',
  ].some(keyword => value.includes(keyword));
}

export function VehicleProfilePage({ vehicle, documents, onBack, onEdit, onAddDocument }: VehicleProfilePageProps) {
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [uploadCategoryKey, setUploadCategoryKey] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrDetails, setOcrDetails] = useState('');
  const [pendingDocument, setPendingDocument] = useState<PendingVehicleDocument | null>(null);
  const [showNotApplicableDocuments, setShowNotApplicableDocuments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = useMemo<VehicleDocumentCategory[]>(() => {
    const extra = vehicle as Vehicle & {
      emissionsCardExpiry?: string;
      liftingCertificateExpiry?: string;
    };

    const immobilized = Boolean(vehicle?.isImmobilized);
    const workMachine = isWorkMachine(vehicle);
    const liftingRequired = requiresLiftingCertificate(vehicle);

    const categoriesList: VehicleDocumentCategory[] = [
      {
        key: 'license',
        title: workMachine ? 'Άδεια Μηχανήματος Έργου' : 'Άδεια κυκλοφορίας',
        subtitle: workMachine ? 'Άδεια χρήσης/κυκλοφορίας Μ.Ε. και στοιχεία πλαισίου' : 'Άδεια κυκλοφορίας και στοιχεία οχήματος',
        keywords: ['άδεια', 'κυκλοφορίας', 'registration', 'license', 'vin', 'πλαισίου'],
        hasExpiry: false,
        required: true,
        applicable: true,
      },
      {
        key: 'insurance',
        title: 'Ασφάλεια',
        subtitle: immobilized ? 'Δεν ζητείται ως ενεργό έγγραφο όσο είναι δηλωμένο σε ακινησία' : 'Ασφαλιστήριο συμβόλαιο σε ισχύ',
        expiry: vehicle?.insuranceExpiry,
        keywords: ['ασφάλεια', 'ασφαλιστήριο', 'insurance'],
        hasExpiry: true,
        required: !immobilized,
        applicable: !immobilized,
      },
      {
        key: 'kteo',
        title: 'ΚΤΕΟ',
        subtitle: immobilized || workMachine ? 'Δεν ζητείται ως γενικό υποχρεωτικό έγγραφο για αυτή την κατηγορία/κατάσταση' : 'Περιοδικός τεχνικός έλεγχος',
        expiry: vehicle?.kteoExpiry,
        keywords: ['κτεο', 'τεχνικός έλεγχος', 'roadworthiness'],
        hasExpiry: true,
        required: !immobilized && !workMachine,
        applicable: !immobilized && !workMachine,
      },
      {
        key: 'emissions',
        title: 'Κάρτα Καυσαερίων',
        subtitle: immobilized || workMachine ? 'Δεν ζητείται ως γενικό υποχρεωτικό έγγραφο για αυτή την κατηγορία/κατάσταση' : 'Κάρτα ελέγχου καυσαερίων',
        expiry: extra.emissionsCardExpiry,
        keywords: ['καυσαερίων', 'emissions'],
        hasExpiry: true,
        required: !immobilized && !workMachine,
        applicable: !immobilized && !workMachine,
      },
      {
        key: 'road-tax',
        title: 'Τέλη κυκλοφορίας',
        subtitle: immobilized || workMachine ? 'Δεν ζητείται ως ενεργό έγγραφο όσο δεν υπάρχει υποχρέωση κυκλοφορίας' : 'Αποδεικτικό πληρωμής ή νόμιμη απαλλαγή',
        keywords: ['τέλη', 'τελη', 'κυκλοφορίας', 'road tax'],
        hasExpiry: false,
        required: !immobilized && !workMachine,
        applicable: !immobilized && !workMachine,
      },
      {
        key: 'immobilization',
        title: 'Δήλωση ακινησίας',
        subtitle: 'Απαιτείται μόνο όταν το όχημα/Μ.Ε. είναι δηλωμένο σε ακινησία',
        keywords: ['ακινησία', 'ακινησια', 'immobilized'],
        hasExpiry: false,
        required: immobilized,
        applicable: immobilized,
      },
      {
        key: 'lifting',
        title: 'Πιστοποιητικό Ανυψωτικής Ικανότητας',
        subtitle: liftingRequired ? 'Για γερανούς, καλαθοφόρα, περονοφόρα και ανυψωτικά Μ.Ε.' : 'Δεν ζητείται για Μ.Ε. χωρίς ανυψωτική λειτουργία',
        expiry: extra.liftingCertificateExpiry,
        keywords: ['ανυψωτικής', 'ανύψωσης', 'lifting'],
        hasExpiry: true,
        required: !immobilized && liftingRequired,
        applicable: !immobilized && liftingRequired,
      },
      {
        key: 'other',
        title: 'Άλλο έγγραφο',
        subtitle: 'Οποιοδήποτε πρόσθετο έγγραφο σχετικό με το όχημα / Μ.Ε.',
        keywords: ['άλλο', 'other'],
        hasExpiry: false,
        required: false,
        applicable: true,
      },
    ];

    return categoriesList;
  }, [vehicle]);

  const currentInsuranceDocument = useMemo(() => {
    const insuranceCategory = categories.find(category => category.key === 'insurance');
    if (!insuranceCategory) return undefined;
    return sortDocuments(documents.filter(document => documentMatches(document, insuranceCategory.keywords)))[0];
  }, [categories, documents]);

  const hiddenNotApplicableCount = useMemo(
    () => categories.filter(category => !category.applicable && category.key !== 'other').length,
    [categories]
  );

  const visibleCategories = useMemo(
    () => categories.filter(category => showNotApplicableDocuments || category.applicable || category.key === 'other'),
    [categories, showNotApplicableDocuments]
  );

  async function confirmPendingDocument() {
    if (!pendingDocument) return;
    if (!pendingDocument.issueDate || !pendingDocument.expiryDate || !pendingDocument.vehicleMatchConfirmed) {
      setOcrStatus('Συμπληρώστε ημερομηνίες και επιβεβαιώστε ότι το ασφαλιστήριο αφορά το συγκεκριμένο όχημα.');
      return;
    }

    setOcrStatus('Ανέβασμα ασφαλιστηρίου στο SharePoint…');

    try {
      const uploadedEvidence = pendingDocument.sourceFile
        ? await dataProvider.uploadEvidence(
            pendingDocument.sourceFile,
            pendingDocument.evidenceFolderPath ?? `Vehicles/${pendingDocument.entityId}/${pendingDocument.documentType}`
          )
        : undefined;

      onAddDocument({
        entityType: pendingDocument.entityType,
        entityId: pendingDocument.entityId,
        documentType: pendingDocument.documentType,
        issueDate: pendingDocument.issueDate,
        expiryDate: pendingDocument.expiryDate,
        status: pendingDocument.expiryDate && isExpired(pendingDocument.expiryDate) ? 'Expired' : 'Active',
        url: uploadedEvidence?.url ?? pendingDocument.url,
        fileName: uploadedEvidence?.fileName ?? pendingDocument.fileName,
      });

      setOcrStatus(uploadedEvidence?.status === 'mock-fallback'
        ? 'Το ανέβασμα στο SharePoint δεν επιβεβαιώθηκε. Το ασφαλιστήριο φαίνεται προσωρινά μόνο σε αυτή τη συνεδρία.'
        : 'Το ασφαλιστήριο ανέβηκε στο SharePoint και καταχωρήθηκε μετά από επιβεβαίωση χρήστη.');
      setOcrDetails('');
      setPendingDocument(null);
    } catch (error) {
      console.warn('Vehicle insurance evidence upload failed.', error);
      setOcrStatus('Δεν ολοκληρώθηκε το ανέβασμα του ασφαλιστηρίου στο SharePoint. Ελέγξτε το upload flow και δοκιμάστε ξανά.');
    }
  }

  async function handleDocumentFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const category = categories.find(item => item.key === uploadCategoryKey);

    event.target.value = '';

    if (!file || !vehicle || !category) return;

    setOcrStatus(category.key === 'insurance' ? 'Ανάγνωση ασφαλιστηρίου…' : 'Ανέβασμα εγγράφου…');
    setOcrDetails('');
    setPendingDocument(null);

    try {
      if (category.key !== 'insurance') {
        const uploadedEvidence = await dataProvider.uploadEvidence(file, getVehicleEvidenceFolder(vehicle, category));

        onAddDocument({
          entityType: 'vehicle',
          entityId: vehicle.id,
          documentType: category.title,
          status: 'Active',
          url: uploadedEvidence.url,
          fileName: uploadedEvidence.fileName,
        });

        setOcrStatus(uploadedEvidence.status === 'mock-fallback'
          ? 'Το ανέβασμα στο SharePoint δεν επιβεβαιώθηκε. Το έγγραφο φαίνεται προσωρινά μόνο σε αυτή τη συνεδρία.'
          : 'Το έγγραφο ανέβηκε στο SharePoint και καταχωρήθηκε στην καρτέλα.');
        setOcrDetails(category.title);
        return;
      }

      const result = await dataProvider.extractDocumentText(file, {
        documentType: category.title,
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
      });

      const text = result.text ?? '';
      const parsed = parseInsuranceOcr(text, vehicle);

      setPendingDocument({
        entityType: 'vehicle',
        entityId: vehicle.id,
        documentType: 'Ασφάλεια',
        issueDate: parsed.startDate,
        expiryDate: parsed.expiryDate,
        status: 'Active',
        url: URL.createObjectURL(file),
        fileName: file.name,
        sourceFile: file,
        evidenceFolderPath: getVehicleEvidenceFolder(vehicle, category),
        matchedVehicle: parsed.matchedVehicle,
        matchedBy: parsed.matchedBy,
        vehicleMatchConfirmed: parsed.matchedVehicle,
        warning: parsed.warning,
      });

      setOcrStatus('Διαβάστηκε ασφαλιστήριο. Επιβεβαιώστε ή διορθώστε τις ημερομηνίες πριν την καταχώρηση.');
      setOcrDetails([
        `Αρχείο: ${file.name}`,
        `Ταύτιση με όχημα: ${parsed.matchedVehicle ? `Ναι (${parsed.matchedBy === 'chassis' ? 'αριθμός πλαισίου' : 'πινακίδα/αριθμός άδειας'})` : 'Όχι / απαιτείται έλεγχος'}`,
        parsed.warning,
      ].filter(Boolean).join(' · '));
    } catch (error) {
      console.warn('Vehicle document OCR/upload failed.', error);
      setOcrStatus('Δεν ήταν δυνατή η ανάγνωση/καταχώρηση του εγγράφου.');
    }
  }

  if (!vehicle) {
    return (
      <div className="page">
        <button className="secondary-btn" type="button" onClick={onBack}>
          <ArrowLeft size={17} /> Επιστροφή
        </button>
        <div className="empty-state">
          <h2>Δεν επιλέχθηκε όχημα / ΜΕ</h2>
          <p>Επιστρέψτε στη λίστα και επιλέξτε όχημα ή μηχάνημα έργου.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleDocumentFileChange} />

      <div className="page-header">
        <div>
          <button className="secondary-btn" type="button" onClick={onBack}>
            <ArrowLeft size={17} /> Επιστροφή
          </button>
          <h1>{vehicle.plate || vehicle.code}</h1>
          <p>{vehicle.code} · {vehicle.type} · {vehicle.owner}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="secondary-btn" type="button" onClick={onEdit}>
            <Pencil size={17} /> Επεξεργασία
          </button>
          <strong>{vehicle.isImmobilized ? 'Ακινησία' : vehicle.status}</strong>
        </div>
      </div>

      <div className="card">
        <h2>Βασικά στοιχεία</h2>
        <div className="vehicle-basic-grid">
          <div className="vehicle-basic-field">
            <span>Αριθμός άδειας / κυκλοφορίας</span>
            <strong>{vehicle.plate || '—'}</strong>
          </div>
          <div className="vehicle-basic-field">
            <span>Αριθμός πλαισίου / VIN</span>
            <strong>{vehicle.chassisNumber || '—'}</strong>
          </div>
          <div className="vehicle-basic-field">
            <span>Εργοστ. κατασκευής</span>
            <strong>{vehicle.manufacturer || '—'}</strong>
          </div>
          <div className="vehicle-basic-field">
            <span>Τύπος</span>
            <strong>{vehicle.model || '—'}</strong>
          </div>
          <div className="vehicle-basic-field">
            <span>Έναρξη ασφάλειας</span>
            <strong>{formatDateForDisplay(currentInsuranceDocument?.issueDate) || 'Δεν έχει καταχωρηθεί'}</strong>
          </div>
          <div className="vehicle-basic-field">
            <span>Λήξη ασφάλειας</span>
            <strong>{formatDateForDisplay(vehicle.insuranceExpiry || currentInsuranceDocument?.expiryDate) || 'Δεν έχει καταχωρηθεί'}</strong>
          </div>
          <div className="vehicle-basic-field">
            <span>Κατάσταση κυκλοφορίας</span>
            <strong>{vehicle.isImmobilized ? 'Δηλωμένο σε ακινησία' : 'Σε χρήση / κυκλοφορία'}</strong>
          </div>
        </div>
      </div>

      {ocrStatus && (
        <div className="card">
          <h2>Τελευταίο OCR εγγράφου</h2>
          <p className="row-subtitle">{ocrStatus}</p>
          {ocrDetails && <p className="row-subtitle">{ocrDetails}</p>}

          {pendingDocument && (
            <div className="form" style={{ marginTop: 12 }}>
              <div className="row-subtitle" style={{ marginBottom: 10 }}>
                <strong>Έλεγχος ταύτισης:</strong>{' '}
                {pendingDocument.matchedVehicle
                  ? `Επιβεβαιώθηκε αυτόματα με ${pendingDocument.matchedBy === 'chassis' ? 'αριθμό πλαισίου' : 'πινακίδα/αριθμό άδειας'}.`
                  : 'Δεν επιβεβαιώθηκε αυτόματα. Ελέγξτε το έγγραφο πριν την καταχώρηση.'}
              </div>

              <div className="form-grid">
                <label>
                  <span>Έναρξη ασφάλισης</span>
                  <input
                    className="field-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="ηη/μμ/εεεε"
                    value={formatDateForDisplay(pendingDocument.issueDate)}
                    onChange={e => setPendingDocument(prev => prev ? { ...prev, issueDate: normalizeDateInput(e.target.value) } : prev)}
                  />
                </label>

                <label>
                  <span>Λήξη ασφάλισης</span>
                  <input
                    className="field-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="ηη/μμ/εεεε"
                    value={formatDateForDisplay(pendingDocument.expiryDate)}
                    onChange={e => setPendingDocument(prev => prev ? { ...prev, expiryDate: normalizeDateInput(e.target.value) } : prev)}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={Boolean(pendingDocument.vehicleMatchConfirmed)}
                  onChange={e => setPendingDocument(prev => prev ? { ...prev, vehicleMatchConfirmed: e.target.checked } : prev)}
                />
                <span className="row-subtitle">
                  Επιβεβαιώνω ότι το ασφαλιστήριο αφορά το συγκεκριμένο όχημα / μηχάνημα ({vehicle.plate || vehicle.code}).
                </span>
              </label>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={confirmPendingDocument}
                  disabled={!pendingDocument.issueDate || !pendingDocument.expiryDate || !pendingDocument.vehicleMatchConfirmed}
                >
                  Επιβεβαίωση & καταχώρηση
                </button>
                <button className="secondary-btn" type="button" onClick={() => setPendingDocument(null)}>
                  Ακύρωση
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2>Έγγραφα συμμόρφωσης</h2>
            <p className="row-subtitle">
              Η τρέχουσα έκδοση εμφανίζεται πρώτη. Τα παλαιά/ληγμένα έγγραφα διατηρούνται στο ιστορικό. Κάθε νέο upload δημιουργεί νέα εγγραφή.
            </p>
          </div>

          {hiddenNotApplicableCount > 0 && (
            <button
              className="secondary-btn"
              type="button"
              onClick={() => setShowNotApplicableDocuments(prev => !prev)}
            >
              {showNotApplicableDocuments ? <EyeOff size={17} /> : <Eye size={17} />}
              {showNotApplicableDocuments ? 'Απόκρυψη μη απαιτούμενων' : `Εμφάνιση μη απαιτούμενων (${hiddenNotApplicableCount})`}
            </button>
          )}
        </div>

        {visibleCategories.map(category => {
          const categoryDocuments = sortDocuments(documents.filter(document => documentMatches(document, category.keywords)));
          const currentDocument = categoryDocuments[0];
          const historyDocuments = categoryDocuments.slice(1);
          const expiry = currentDocument?.expiryDate ?? category.expiry;
          const label = statusLabel(category, currentDocument);
          const showHistory = expandedHistory[category.key];

          return (
            <div className="row" key={category.key}>
              <div className="row-main">
                <div className="row-title">{category.title}</div>
                <div className="row-subtitle">{category.subtitle}</div>
                <div className="row-subtitle" style={{ marginTop: 4 }}>
                  {category.required ? 'Υποχρεωτικό' : category.applicable ? 'Προαιρετικό / πρόσθετο' : 'Δεν απαιτείται για την τρέχουσα κατηγορία ή κατάσταση'}
                </div>
                {currentDocument?.fileName && (
                  <div className="row-subtitle" style={{ marginTop: 4 }}>Αρχείο: {currentDocument.fileName}</div>
                )}

                <div style={{ marginTop: 8 }}>
                  <strong>Κατάσταση:</strong> {label}
                  {category.hasExpiry && (
                    <span> · <strong>Λήξη:</strong> {formatDateForDisplay(expiry) || 'Δεν έχει καταχωρηθεί'}</span>
                  )}
                </div>

                {showHistory && (
                  <div style={{ marginTop: 10 }}>
                    {historyDocuments.length === 0 ? (
                      <div className="row-subtitle">Δεν υπάρχει ιστορικό για αυτή την κατηγορία.</div>
                    ) : (
                      historyDocuments.map(document => (
                        <div className="row-subtitle" key={document.id}>
                          {document.documentType}{document.fileName ? ` · ${document.fileName}` : ''} · Λήξη: {formatDateForDisplay(document.expiryDate) || '—'} · Status: {document.status}
                          {document.url && (
                            <> · <a href={document.url} target="_blank" rel="noreferrer">Άνοιγμα evidence</a></>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {currentDocument?.url ? (
                  <a className="secondary-btn" href={currentDocument.url} target="_blank" rel="noreferrer">
                    <FileText size={17} /> Evidence
                  </a>
                ) : (
                  <button className="secondary-btn" type="button" disabled>
                    <FileText size={17} /> Evidence
                  </button>
                )}

                <button className="secondary-btn" type="button" onClick={() => setExpandedHistory(prev => ({ ...prev, [category.key]: !prev[category.key] }))}>
                  <History size={17} /> Ιστορικό
                </button>

                <button
                  className="primary-btn"
                  type="button"
                  disabled={!category.applicable}
                  onClick={() => {
                    setUploadCategoryKey(category.key);
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload size={17} /> Νέο έγγραφο
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
