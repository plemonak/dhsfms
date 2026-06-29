import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { FormField } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import type { Site, Vehicle } from '../types/models';

interface Props {
  onBack: () => void;
  onSave: (vehicle: Omit<Vehicle, 'id'>) => void;
  sites: Site[];
  selectedSiteId: number | 'all';
  ownerOptions: string[];
  typeOptions: string[];
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

  const update = (key: keyof Omit<Vehicle, 'id'>, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="page">
      <PageHeader title="Νέο όχημα / μηχάνημα" subtitle="Καταχώρηση οχήματος ή μηχανήματος έργου" actions={<button className="secondary-btn" onClick={onBack}><ArrowLeft size={17} />Πίσω</button>} />

      <div className="form">
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
