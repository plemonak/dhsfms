import { Plus, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import type { Employee } from '../types/models';

interface Props {
  employees: Employee[];
  onOpen: (employeeId: number) => void;
  onNew: () => void;
}

function initials(employee: Employee) {
  return `${employee.lastName[0] ?? ''}${employee.firstName[0] ?? ''}`;
}

export function EmployeesPage({ employees, onOpen, onNew }: Props) {
  return (
    <div className="page">
      <PageHeader
        title="Προσωπικό"
        subtitle="Μητρώο εργαζομένων, υπεργολάβων και εξωτερικών συνεργατών"
        actions={<button className="primary-btn" onClick={onNew}><Plus size={18} />Νέος εργαζόμενος</button>}
      />

      <div className="toolbar">
        <input className="search-input" placeholder="Αναζήτηση με όνομα, κωδικό, εταιρεία ή ειδικότητα" />
        <button className="secondary-btn"><SlidersHorizontal size={17} /> Φίλτρα</button>
      </div>

      <div className="card">
        {employees.map(employee => (
          <div className="row clickable" key={employee.id} onClick={() => onOpen(employee.id)}>
            <div className="avatar">{initials(employee)}</div>
            <div className="row-main">
              <div className="row-title">{employee.fullName}</div>
              <div className="row-subtitle">{employee.employeeNo} · {employee.position} · {employee.company}</div>
            </div>
            <StatusBadge status={employee.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
