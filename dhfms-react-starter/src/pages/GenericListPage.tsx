import { Plus, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

interface RowItem {
  id: number | string;
  title: string;
  subtitle?: string;
  status?: string;
}

interface Props {
  title: string;
  subtitle: string;
  addLabel?: string;
  rows?: RowItem[];
  emptyTitle?: string;
}

export function GenericListPage({ title, subtitle, addLabel = 'Νέα εγγραφή', rows = [], emptyTitle = 'Δεν υπάρχουν εγγραφές ακόμα' }: Props) {
  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} actions={<button className="primary-btn"><Plus size={17} />{addLabel}</button>} />
      <div className="toolbar">
        <input className="search-input" placeholder="Αναζήτηση" />
        <button className="secondary-btn"><SlidersHorizontal size={17} />Φίλτρα</button>
      </div>
      {rows.length === 0 ? <EmptyState title={emptyTitle} subtitle="Το module υπάρχει στο νέο UI foundation και θα συνδεθεί με SharePoint στο επόμενο βήμα." /> : (
        <div className="card">
          {rows.map(row => <div className="row clickable" key={row.id}><div className="row-main"><div className="row-title">{row.title}</div><div className="row-subtitle">{row.subtitle}</div></div><strong>{row.status}</strong></div>)}
        </div>
      )}
    </div>
  );
}
