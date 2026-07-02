interface Props {
  value: string;
  onChange: (isoValue: string) => void;
}

function isoToDisplay(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function GreekDateInput({ value, onChange }: Props) {
  const display = isoToDisplay(value);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        className="field-input"
        style={{ minHeight: 32, padding: '6px 10px' }}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {display && <span className="row-subtitle" style={{ whiteSpace: 'nowrap' }}>= {display}</span>}
    </div>
  );
}
