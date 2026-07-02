import { useRef } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const display = isoToDisplay(value);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      el.focus();
    }
  }

  return (
    <div
      className="field-input"
      style={{ minHeight: 32, padding: '6px 10px', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      onClick={openPicker}
    >
      <span style={{ color: display ? undefined : '#9aa1a8' }}>{display || 'ηη/μμ/εεεε'}</span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
      />
    </div>
  );
}
