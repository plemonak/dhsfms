import { Camera, Plus, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { QrPreviewModal } from '../components/QrPreviewModal';
import { dataProvider } from '../services/dataProvider';

interface RowItem {
  id: number | string;
  title: string;
  subtitle?: string;
  status?: string;
  qrType?: 'EMP' | 'VEH' | 'EQP';
  qrLabel?: string;
}

interface Props {
  title: string;
  subtitle: string;
  addLabel?: string;
  rows?: RowItem[];
  emptyTitle?: string;
  showLiftingCertificateOption?: boolean;
  showOcrSection?: boolean;
}

export function GenericListPage({ title, subtitle, addLabel = 'Νέα εγγραφή', rows = [], emptyTitle = 'Δεν υπάρχουν εγγραφές ακόμα', showLiftingCertificateOption = false, showOcrSection = true }: Props) {
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrSummary, setOcrSummary] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDocumentType, setOcrDocumentType] = useState('');
  const [ocrFieldSuggestions, setOcrFieldSuggestions] = useState<string[]>([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement | null>(null);
  const [qrPayload, setQrPayload] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrSubtitle, setQrSubtitle] = useState('');

  useEffect(() => {
    return () => {
      if (ocrPreviewUrl) {
        URL.revokeObjectURL(ocrPreviewUrl);
      }
    };
  }, [ocrPreviewUrl]);

  function getFieldSuggestions(documentType: string, text: string) {
    const suggestions: string[] = [];
    const normalized = text.toLowerCase();
    const plateMatch = text.match(/([A-Z]{1,3}-?[0-9]{1,4})/i)?.[1];
    const serialMatch = text.match(/(serial|σειριακό|serial number)[^A-Za-z0-9]*([A-Za-z0-9\-/]{2,20})/i)?.[2];

    switch (documentType) {
      case 'Άδεια Κυκλοφορίας Οχήματος':
        suggestions.push('Αριθμός άδειας / πινακίδας');
        suggestions.push('Ιδιοκτήτης / εταιρεία');
        suggestions.push('Ημερομηνία λήξης');
        suggestions.push('Τύπος οχήματος');
        suggestions.push('Στοιχεία κυκλοφορίας');
        if (plateMatch) suggestions.push(`Πινακίδα: ${plateMatch}`);
        break;
      case 'Άδεια Κυκλοφορίας / Χρήσης Μηχανήματος Έργου':
        suggestions.push('Αριθμός άδειας / πινακίδας');
        suggestions.push('Τύπος μηχανήματος');
        suggestions.push('Ιδιοκτήτης / εταιρεία');
        suggestions.push('Ημερομηνία λήξης');
        suggestions.push('Στοιχεία μηχανήματος');
        break;
      case 'Ασφαλιστήριο Συμβόλαιο':
        suggestions.push('Αριθμός συμβολαίου');
        suggestions.push('Ασφαλιστική εταιρεία');
        suggestions.push('Ημερομηνία έκδοσης');
        suggestions.push('Έναρξη ασφάλισης');
        suggestions.push('Λήξη ασφάλισης');
        suggestions.push('Αριθμός κυκλοφορίας');
        suggestions.push('Μάρκα');
        suggestions.push('Χρήση');
        suggestions.push('Ασφαλισμένος');
        suggestions.push('Σύνολο ασφαλίστρων');
        break;
      case 'ΚΤΕΟ':
        suggestions.push('Αριθμός ΔΤΕ');
        suggestions.push('Αριθμός κυκλοφορίας');
        suggestions.push('Ημερομηνία ελέγχου');
        suggestions.push('Ισχύει μέχρι');
        suggestions.push('Αποτέλεσμα ελέγχου');
        suggestions.push('Χιλιόμετρα');
        suggestions.push('Ελεγκτής');
        suggestions.push('Ελλείψεις / παρατηρήσεις');
        break;
      case 'Κάρτα Ελέγχου Καυσαερίων':
        suggestions.push('Αριθμός κάρτας');
        suggestions.push('Αριθμός κυκλοφορίας');
        suggestions.push('Με καταλύτη: Ναι/Όχι');
        suggestions.push('Ημερομηνία έκδοσης');
        suggestions.push('Ημερομηνία επόμενου ελέγχου');
        break;
      case 'Πιστοποιητικό Ανυψωτικής Ικανότητας / Πιστοποιητικό Ελέγχου Ανυψωτικού Μηχανήματος':
        suggestions.push('Αριθμός πιστοποιητικού');
        suggestions.push('Ημερομηνία έκδοσης');
        suggestions.push('Ημερομηνία επόμενου ελέγχου / λήξης');
        suggestions.push('Φορέας ελέγχου');
        suggestions.push('Τύπος εξοπλισμού');
        suggestions.push('Κατασκευαστής');
        suggestions.push('Μοντέλο');
        suggestions.push('Serial number');
        suggestions.push('Ικανότητα ανύψωσης');
        suggestions.push('Στοιχεία οχήματος / πινακίδα');
        suggestions.push('Αποτέλεσμα ελέγχου');
        if (serialMatch) suggestions.push(`Serial number: ${serialMatch}`);
        if (plateMatch) suggestions.push(`Πινακίδα: ${plateMatch}`);
        break;
      case 'Άδεια Οδήγησης':
        suggestions.push('Αριθμός άδειας');
        suggestions.push('Επώνυμο');
        suggestions.push('Όνομα');
        suggestions.push('Ημερομηνία γέννησης');
        suggestions.push('Τόπος γέννησης');
        suggestions.push('Ημερομηνία έκδοσης');
        suggestions.push('Ημερομηνία λήξης');
        suggestions.push('Εκδούσα αρχή');
        suggestions.push('Κατηγορίες άδειας');
        suggestions.push('Ημερομηνία απόκτησης ανά κατηγορία');
        suggestions.push('Ημερομηνία λήξης ανά κατηγορία');
        suggestions.push('Κωδικοί περιορισμών');
        break;
      case 'Άδεια Χειριστή Μηχανημάτων Έργου':
        suggestions.push('Αριθμός άδειας');
        suggestions.push('Ονοματεπώνυμο');
        suggestions.push('Πατρώνυμο');
        suggestions.push('Τόπος γέννησης');
        suggestions.push('Έτος γέννησης');
        suggestions.push('Ημερομηνία χορήγησης');
        suggestions.push('Ημερομηνία θεώρησης / ανανέωσης');
        suggestions.push('Βαθμίδα');
        suggestions.push('Ομάδα');
        suggestions.push('Ειδικότητα');
        suggestions.push('Περιγραφή μηχανημάτων που καλύπτει η άδεια');
        suggestions.push('Εκδούσα αρχή');
        suggestions.push('Παρατηρήσεις');
        break;
      default:
        if (normalized.includes('plate') || normalized.includes('πινακίδα')) suggestions.push(`Πινακίδα: ${plateMatch ?? '—'}`);
        break;
    }

    return suggestions;
  }

  async function openQrModal(row: RowItem) {
    const payload = `${row.qrType ?? 'EQP'}|${row.id}|${row.qrLabel ?? row.title}`;
    const generated = await dataProvider.generateQr(payload);
    setQrPayload(generated.payload);
    setQrUrl(generated.qrUrl);
    setQrTitle(row.title);
    setQrSubtitle(row.subtitle ?? 'QR για έλεγχο και εκτύπωση');
    setQrModalOpen(true);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file || !ocrDocumentType) {
      setOcrStatus('Επιλέξτε πρώτα τύπο εγγράφου για να ξεκινήσει το OCR.');
      return;
    }

    if (ocrPreviewUrl) {
      URL.revokeObjectURL(ocrPreviewUrl);
    }

    setOcrLoading(true);
    setOcrFileName(file.name);
    setOcrPreviewUrl(URL.createObjectURL(file));
    setOcrStatus('');
    setOcrSummary('');
    setOcrFieldSuggestions([]);

    try {
      const result = await dataProvider.extractDocumentText(file);
      const text = result.text ?? '';
      const preview = text
        .split(/\n/)
        .filter(Boolean)
        .slice(0, 4)
        .join(' · ');
      const suggestions = getFieldSuggestions(ocrDocumentType, text);
      setOcrSummary(preview || 'Δεν βρέθηκαν στοιχεία για προεπισκόπηση.');
      setOcrFieldSuggestions(suggestions);
      setOcrStatus(result.confidence > 0.2 ? 'Το OCR ολοκληρώθηκε και τα στοιχεία είναι έτοιμα για έλεγχο.' : 'Ενεργοποιήθηκε mock OCR fallback.');
    } catch (error) {
      console.warn('OCR failed for generic list page.', error);
      const suggestions = getFieldSuggestions(ocrDocumentType, 'Mock fallback OCR');
      setOcrSummary('Mock fallback OCR: η ανάλυση είναι έτοιμη για έλεγχο χωρίς αυτόματη αποθήκευση.');
      setOcrFieldSuggestions(suggestions);
      setOcrStatus('Δεν ήταν δυνατή η πραγματική επεξεργασία OCR.');
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} actions={<button className="primary-btn"><Plus size={17} />{addLabel}</button>} />
      <div className="toolbar">
        <input className="search-input" placeholder="Αναζήτηση" />
        <button className="secondary-btn"><SlidersHorizontal size={17} />Φίλτρα</button>
      </div>
      {showOcrSection && <div className="card card-pad" style={{ marginBottom: 12 }}>
        <div className="section-title">OCR για έγγραφα / πινακίδες</div>
        <div className="row-subtitle" style={{ marginTop: 6 }}>Επιλέξτε πρώτα τον τύπο εγγράφου. Τα αποτελέσματα εμφανίζονται μόνο για έλεγχο και δεν αποθηκεύονται αυτόματα.</div>
        <select className="field-select" style={{ marginTop: 10 }} value={ocrDocumentType} onChange={event => setOcrDocumentType(event.target.value)}>
          <option value="">Επιλέξτε τύπο εγγράφου</option>
          <option value="Άδεια Κυκλοφορίας Οχήματος">Άδεια Κυκλοφορίας Οχήματος</option>
          <option value="Άδεια Κυκλοφορίας / Χρήσης Μηχανήματος Έργου">Άδεια Κυκλοφορίας / Χρήσης Μηχανήματος Έργου</option>
          <option value="Ασφαλιστήριο Συμβόλαιο">Ασφαλιστήριο Συμβόλαιο</option>
          <option value="ΚΤΕΟ">ΚΤΕΟ</option>
          <option value="Κάρτα Ελέγχου Καυσαερίων">Κάρτα Ελέγχου Καυσαερίων</option>
          {showLiftingCertificateOption && <option value="Πιστοποιητικό Ανυψωτικής Ικανότητας / Πιστοποιητικό Ελέγχου Ανυψωτικού Μηχανήματος">Πιστοποιητικό Ανυψωτικής Ικανότητας / Πιστοποιητικό Ελέγχου Ανυψωτικού Μηχανήματος</option>}
          <option value="Άδεια Οδήγησης">Άδεια Οδήγησης</option>
          <option value="Άδεια Χειριστή Μηχανημάτων Έργου">Άδεια Χειριστή Μηχανημάτων Έργου</option>
        </select>
        <input ref={ocrInputRef} id="ocr-generic-file" className="field-input" style={{ marginTop: 10 }} type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={!ocrDocumentType} />
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="primary-btn" type="button" onClick={() => ocrInputRef.current?.click()} disabled={ocrLoading || !ocrDocumentType}><Camera size={17} />{ocrLoading ? 'Ανάγνωση…' : 'Έναρξη OCR'}</button>
          {ocrFileName && <span className="row-subtitle">Αρχείο: {ocrFileName}</span>}
        </div>
        {ocrPreviewUrl && <img src={ocrPreviewUrl} alt="OCR preview" style={{ marginTop: 12, maxWidth: '100%', maxHeight: 220, objectFit: 'contain', border: '1px solid var(--dh-line)', borderRadius: 10 }} />}
        {ocrStatus && <div className="row-subtitle" style={{ marginTop: 10 }}>{ocrStatus}</div>}
        {ocrSummary && <div className="row-subtitle" style={{ marginTop: 6 }}>Αποτέλεσμα: {ocrSummary}</div>}
        {ocrFieldSuggestions.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="row-subtitle">Προτεινόμενα πεδία για έλεγχο</div>
            <ul style={{ margin: '6px 0 0 16px', color: 'var(--dh-muted)' }}>
              {ocrFieldSuggestions.map(field => <li key={field}>{field}</li>)}
            </ul>
          </div>
        )}
      </div>}
      {rows.length === 0 ? <EmptyState title={emptyTitle} subtitle="Το module υπάρχει στο νέο UI foundation και θα συνδεθεί με SharePoint στο επόμενο βήμα." /> : (
        <div className="card">
          {rows.map(row => (
            <div className="row clickable" key={row.id}>
              <div className="row-main">
                <div className="row-title">{row.title}</div>
                <div className="row-subtitle">{row.subtitle}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(row.qrType || row.qrLabel) && (
                  <button className="secondary-btn" type="button" onClick={event => { event.stopPropagation(); void openQrModal(row); }}>QR</button>
                )}
                <strong>{row.status}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
      <QrPreviewModal open={qrModalOpen} title={qrTitle} subtitle={qrSubtitle} payload={qrPayload} qrUrl={qrUrl} onClose={() => setQrModalOpen(false)} />
    </div>
  );
}
