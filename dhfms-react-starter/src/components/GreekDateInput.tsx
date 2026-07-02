interface Props {
  value: string;
  onChange: (isoValue: string) => void;
  yearsAhead?: number;
  yearsBack?: number;
}

export function GreekDateInput({ value, onChange, yearsAhead = 12, yearsBack = 2 }: Props) {
  const [year, month, day] = value ? value.split('-') : ['', '', ''];

  function update(newDay: string, newMonth: string, newYear: string) {
    if (newDay && newMonth && newYear) {
      onChange(`${newYear}-${newMonth}-${newDay}`);
    } else {
      onChange('');
    }
  }

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: yearsBack + yearsAhead + 1 }, (_, i) => String(currentYear - yearsBack + i));

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select className="field-select" style={{ width: 62, minHeight: 32, padding: '6px 4px' }} value={day} onChange={e => update(e.target.value, month, year)}>
        <option value="">ΗΗ</option>
        {days.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className="field-select" style={{ width: 62, minHeight: 32, padding: '6px 4px' }} value={month} onChange={e => update(day, e.target.value, year)}>
        <option value="">ΜΜ</option>
        {months.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select className="field-select" style={{ width: 78, minHeight: 32, padding: '6px 4px' }} value={year} onChange={e => update(day, month, e.target.value)}>
        <option value="">ΕΕΕΕ</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
