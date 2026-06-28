import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SignaturePanel } from '../components/SignaturePanel';

export function SignaturePage() {
  const [demoSignature, setDemoSignature] = useState<string | null>(null);

  return (
    <div className="page">
      <PageHeader title="Υπογραφή & PDF" subtitle="Εκπαίδευση / ΜΑΠ / αποδεικτικό" />
      <SectionCard title="Δήλωση">
        Με την υπογραφή δηλώνεται ότι έγινε ενημέρωση για τις απαιτήσεις, ότι τα στοιχεία είναι ορθά και ότι θα παραχθεί αποδεικτικό PDF.
      </SectionCard>
      <SignaturePanel signer="Αναστασίου Γεώργιος" />
      <div className="card card-pad" style={{ marginTop: 12 }}>
        <div className="section-title">Αποθηκευμένο demo record</div>
        <div className="row-subtitle">{demoSignature ? 'Η υπογραφή αποθηκεύτηκε ως βάση64 PNG για μελλοντική χρήση σε PDF ή upload.' : 'Αποθηκεύστε μια υπογραφή για να προβάλετε το demo record.'}</div>
        {demoSignature && <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>{demoSignature.slice(0, 180)}...</pre>}
      </div>
      <div className="footer-actions"><button className="secondary-btn">Άκυρο</button><button className="primary-btn">Υποβολή & δημιουργία PDF</button></div>
    </div>
  );
}
