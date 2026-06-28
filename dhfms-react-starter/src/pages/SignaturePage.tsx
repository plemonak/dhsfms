import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SignaturePanel } from '../components/SignaturePanel';

export function SignaturePage() {
  return (
    <div className="page">
      <PageHeader title="Υπογραφή & PDF" subtitle="Εκπαίδευση / ΜΑΠ / αποδεικτικό" />
      <SectionCard title="Δήλωση">
        Με την υπογραφή δηλώνεται ότι έγινε ενημέρωση για τις απαιτήσεις, ότι τα στοιχεία είναι ορθά και ότι θα παραχθεί αποδεικτικό PDF.
      </SectionCard>
      <SignaturePanel signer="Αναστασίου Γεώργιος" />
      <div className="footer-actions"><button className="secondary-btn">Άκυρο</button><button className="primary-btn">Υποβολή & δημιουργία PDF</button></div>
    </div>
  );
}
