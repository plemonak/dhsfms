import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { FormField } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import type { Employee } from '../types/models';

interface Props {
  onBack: () => void;
  onSave: (employee: Omit<Employee, 'id' | 'fullName'>) => void;
}

export function EmployeeFormPage({ onBack, onSave }: Props) {
  const [form, setForm] = useState<Omit<Employee, 'id' | 'fullName'>>({
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
  });

  const update = (key: keyof typeof form, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="page">
      <PageHeader title="Νέος εργαζόμενος" subtitle="Καταχώρηση προσωπικού / υπεργολάβου" actions={<button className="secondary-btn" onClick={onBack}><ArrowLeft size={17} />Πίσω</button>} />
      <div className="form">
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
        <button className="primary-btn" onClick={() => onSave(form)}><Save size={17} />Αποθήκευση</button>
      </div>
    </div>
  );
}
