import { EvidenceUpload } from '../components/EvidenceUpload';
import { FormField } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';

export function EvidencePage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} />
      <SectionCard title="Στοιχεία εγγράφου">
        <div className="form-grid">
          <FormField label="Τύπος εγγράφου"><select className="field-select"><option>Ιατρική βεβαίωση</option><option>Άδεια / Πιστοποίηση</option><option>Ασφάλεια οχήματος</option></select></FormField>
          <FormField label="Κατάσταση"><select className="field-select"><option>Active</option><option>Pending</option><option>Missing</option></select></FormField>
          <FormField label="Ημερομηνία έκδοσης"><input type="date" className="field-input" defaultValue="2026-06-27" /></FormField>
          <FormField label="Ημερομηνία λήξης"><input type="date" className="field-input" defaultValue="2027-06-27" /></FormField>
        </div>
      </SectionCard>
      <SectionCard title="Τεκμήριο">
        <EvidenceUpload />
      </SectionCard>
      <div className="footer-actions"><button className="secondary-btn">Άκυρο</button><button className="primary-btn">Προσθήκη εγγράφου</button></div>
    </div>
  );
}
