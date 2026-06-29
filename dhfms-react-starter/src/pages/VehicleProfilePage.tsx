import { useMemo, useState } from 'react';
import { ArrowLeft, FileText, History, Upload } from 'lucide-react';
import type { EvidenceDocument, Vehicle } from '../types/models';

interface VehicleProfilePageProps {
  vehicle?: Vehicle;
  documents: EvidenceDocument[];
  onBack: () => void;
}

type VehicleDocumentCategory = {
  key: string;
  title: string;
  subtitle: string;
  expiry?: string;
  keywords: string[];
  hasExpiry: boolean;
};

function isExpired(date?: string): boolean {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
}

function isExpiringSoon(date?: string): boolean {
  if (!date) return false;
  const today = new Date(new Date().toDateString());
  const expiry = new Date(date);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
}

function documentMatches(document: EvidenceDocument, keywords: string[]): boolean {
  const value = document.documentType.toLowerCase();
  return keywords.some(keyword => value.includes(keyword.toLowerCase()));
}

function sortDocuments(documents: EvidenceDocument[]): EvidenceDocument[] {
  return [...documents].sort((a, b) => {
    const aDate = a.expiryDate ?? a.issueDate ?? '';
    const bDate = b.expiryDate ?? b.issueDate ?? '';
    return bDate.localeCompare(aDate);
  });
}

function statusLabel(category: VehicleDocumentCategory, current?: EvidenceDocument): string {
  if (!current) return 'Λείπει';
  const expiry = current.expiryDate ?? category.expiry;

  if (!category.hasExpiry) return 'Διαθέσιμο';
  if (isExpired(expiry)) return 'Ληγμένο';
  if (isExpiringSoon(expiry)) return 'Λήγει σύντομα';
  return 'Ενεργό';
}

export function VehicleProfilePage({ vehicle, documents, onBack }: VehicleProfilePageProps) {
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const categories = useMemo<VehicleDocumentCategory[]>(() => {
    const extra = vehicle as Vehicle & {
      emissionsCardExpiry?: string;
      liftingCertificateExpiry?: string;
    };

    return [
      {
        key: 'license',
        title: 'Άδεια',
        subtitle: 'Άδεια κυκλοφορίας / άδεια χρήσης ΜΕ / αποδεικτικό αριθμού πλαισίου',
        keywords: ['άδεια', 'κυκλοφορίας', 'registration', 'license', 'vin', 'πλαισίου'],
        hasExpiry: false,
      },
      {
        key: 'insurance',
        title: 'Ασφάλεια',
        subtitle: 'Ασφαλιστήριο συμβόλαιο',
        expiry: vehicle?.insuranceExpiry,
        keywords: ['ασφάλεια', 'ασφαλιστήριο', 'insurance'],
        hasExpiry: true,
      },
      {
        key: 'kteo',
        title: 'ΚΤΕΟ',
        subtitle: 'Περιοδικός τεχνικός έλεγχος',
        expiry: vehicle?.kteoExpiry,
        keywords: ['κτεο', 'τεχνικός έλεγχος', 'roadworthiness'],
        hasExpiry: true,
      },
      {
        key: 'emissions',
        title: 'Κάρτα Καυσαερίων',
        subtitle: 'Κάρτα ελέγχου καυσαερίων',
        expiry: extra.emissionsCardExpiry,
        keywords: ['καυσαερίων', 'emissions'],
        hasExpiry: true,
      },
      {
        key: 'lifting',
        title: 'Πιστοποιητικό Ανυψωτικής Ικανότητας',
        subtitle: 'Πιστοποιητικό ανύψωσης / lifting certificate',
        expiry: extra.liftingCertificateExpiry,
        keywords: ['ανυψωτικής', 'ανύψωσης', 'lifting'],
        hasExpiry: true,
      },
    ];
  }, [vehicle]);

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
      <div className="page-header">
        <div>
          <button className="secondary-btn" type="button" onClick={onBack}>
            <ArrowLeft size={17} /> Επιστροφή
          </button>
          <h1>{vehicle.plate || vehicle.code}</h1>
          <p>{vehicle.code} · {vehicle.type} · {vehicle.owner}</p>
        </div>
        <strong>{vehicle.status}</strong>
      </div>

      <div className="card">
        <h2>Έγγραφα συμμόρφωσης</h2>
        <p className="row-subtitle">
          Η τρέχουσα έκδοση εμφανίζεται πρώτη. Τα παλαιά/ληγμένα έγγραφα διατηρούνται στο ιστορικό.
        </p>

        {categories.map(category => {
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

                <div style={{ marginTop: 8 }}>
                  <strong>Κατάσταση:</strong> {label}
                  {category.hasExpiry && (
                    <span> · <strong>Λήξη:</strong> {expiry || 'Δεν έχει καταχωρηθεί'}</span>
                  )}
                </div>

                {showHistory && (
                  <div style={{ marginTop: 10 }}>
                    {historyDocuments.length === 0 ? (
                      <div className="row-subtitle">Δεν υπάρχει ιστορικό για αυτή την κατηγορία.</div>
                    ) : (
                      historyDocuments.map(document => (
                        <div className="row-subtitle" key={document.id}>
                          {document.documentType} · Λήξη: {document.expiryDate || '—'} · Status: {document.status}
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

                <button className="primary-btn" type="button" disabled>
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
