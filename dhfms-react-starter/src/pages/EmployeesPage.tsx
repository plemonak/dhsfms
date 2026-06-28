import { Plus, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import type { Employee } from '../types/models';

interface Props {
  employees: Employee[];
  onOpen: (employeeId: number) => void;
  onNew: () => void;
}

type AssistantAction = 'training' | 'toolbox' | null;

function initials(employee: Employee) {
  return `${employee.lastName[0] ?? ''}${employee.firstName[0] ?? ''}`;
}

export function EmployeesPage({ employees, onOpen, onNew }: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<AssistantAction>(null);
  const [trainingTopic, setTrainingTopic] = useState('Εισαγωγική Εκπαίδευση');
  const [trainerName, setTrainerName] = useState('ProjectStaff');
  const [trainingDate, setTrainingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTraineeIds, setSelectedTraineeIds] = useState<number[]>([]);
  const [toolboxTopic, setToolboxTopic] = useState('');

  const selectedEmployee = useMemo(() => employees.find(employee => employee.id === selectedEmployeeId), [employees, selectedEmployeeId]);

  function handleSelectEmployee(employeeId: number) {
    setSelectedEmployeeId(employeeId);
    onOpen(employeeId);
  }

  function handleOpenTraining() {
    setActiveAction('training');
    setSelectedTraineeIds(selectedEmployeeId ? [selectedEmployeeId] : []);
    setTrainingTopic('Εισαγωγική Εκπαίδευση');
    setTrainerName('ProjectStaff');
    setTrainingDate(new Date().toISOString().split('T')[0]);
  }

  function handleOpenToolbox() {
    setActiveAction('toolbox');
    setToolboxTopic('');
  }

  function toggleTrainee(employeeId: number) {
    setSelectedTraineeIds(current => current.includes(employeeId) ? current.filter(id => id !== employeeId) : [...current, employeeId]);
  }

  return (
    <div className="page">
      <PageHeader
        title="Προσωπικό"
        subtitle="Μητρώο εργαζομένων, υπεργολάβων και εξωτερικών συνεργατών"
        actions={(
          <div className="personnel-actions">
            <button className="secondary-btn" onClick={handleOpenTraining}><Plus size={17} />Νέα εκπαίδευση</button>
            <button className="secondary-btn" onClick={handleOpenToolbox}><Plus size={17} />Νέο Toolbox Talk</button>
            <button className="primary-btn" onClick={onNew}><Plus size={18} />Νέος εργαζόμενος</button>
          </div>
        )}
      />

      <div className="toolbar">
        <input className="search-input" placeholder="Αναζήτηση με όνομα, κωδικό, εταιρεία ή ειδικότητα" />
        <button className="secondary-btn"><SlidersHorizontal size={17} /> Φίλτρα</button>
      </div>

      <div className="card">
        {employees.map(employee => (
          <div className={`row clickable ${selectedEmployeeId === employee.id ? 'selected-row' : ''}`} key={employee.id} onClick={() => handleSelectEmployee(employee.id)}>
            <div className="avatar">{initials(employee)}</div>
            <div className="row-main">
              <div className="row-title">{employee.fullName}</div>
              <div className="row-subtitle">{employee.employeeNo} · {employee.position} · {employee.company}</div>
            </div>
            <StatusBadge status={employee.status} />
          </div>
        ))}
      </div>

      {activeAction && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <div className="row-title">{activeAction === 'training' ? 'Νέα εκπαίδευση' : 'Νέο Toolbox Talk'}</div>
                <div className="row-subtitle">{activeAction === 'training' ? 'Δημιουργία νέας εκπαίδευσης για τον επιλεγμένο εργαζόμενο' : 'Προσωρινό πεδίο δημιουργίας Toolbox Talk'}</div>
              </div>
              <button className="secondary-btn" onClick={() => setActiveAction(null)}><X size={17} /></button>
            </div>

            {activeAction === 'training' ? (
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="field">
                  <label className="field-label" htmlFor="training-topic">Θέμα εκπαίδευσης</label>
                  <input id="training-topic" className="field-input" value={trainingTopic} onChange={event => setTrainingTopic(event.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="training-date">Ημερομηνία</label>
                  <input id="training-date" className="field-input" type="date" value={trainingDate} onChange={event => setTrainingDate(event.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="trainer-name">Εκπαιδευτής / υπεύθυνος</label>
                  <select id="trainer-name" className="field-select" value={trainerName} onChange={event => setTrainerName(event.target.value)}>
                    <option value="ProjectStaff">ProjectStaff</option>
                    <option value="HSE Manager">HSE Manager</option>
                    <option value="Site Manager">Site Manager</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Επιλεγμένος εργαζόμενος</label>
                  <div className="row-title">{selectedEmployee?.fullName ?? 'Δεν έχει επιλεγεί εργαζόμενος'}</div>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Συμμετέχοντες</label>
                  <div className="training-chip-list">
                    {employees.map(employee => (
                      <label key={employee.id} className="training-chip">
                        <input type="checkbox" checked={selectedTraineeIds.includes(employee.id)} onChange={() => toggleTrainee(employee.id)} />
                        <span>{employee.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <button className="primary-btn" onClick={() => setActiveAction(null)}>Αποθήκευση προσχέδιου</button>
                </div>
              </div>
            ) : (
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label" htmlFor="toolbox-topic">Θέμα Toolbox Talk</label>
                  <input id="toolbox-topic" className="field-input" value={toolboxTopic} onChange={event => setToolboxTopic(event.target.value)} placeholder="Π.χ. Εβδομαδιαία ενημέρωση ασφάλειας" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <div className="row-subtitle">Αυτό το βήμα είναι προσωρινό placeholder μέχρι να υλοποιηθεί πλήρως το Toolbox Talk module.</div>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <button className="primary-btn" onClick={() => setActiveAction(null)}>Δημιουργία placeholder</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
