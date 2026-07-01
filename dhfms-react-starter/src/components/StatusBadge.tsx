import type { Status } from '../types/models';

const labels: Record<Status, string> = {
  Active: 'Ενεργό',
  Inactive: 'Ανενεργό',
  Pending: 'Εκκρεμεί',
  Expired: 'Ληγμένο',
  Missing: 'Ελλιπές',
  Completed: 'Ολοκληρωμένο',
  Draft: 'Πρόχειρο',
  Cancelled: 'Ακυρώθηκε',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${status}`}>{labels[status]}</span>;
}
