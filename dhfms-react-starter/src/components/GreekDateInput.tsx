import { useEffect, useState } from 'react';

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
  const [text, setText] = useState(isoToDisplay(value));

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(formatted);

    if (digits.length === 8) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      onChange(`${year}-${month}-${day}`);
    } else if (digits.length === 0) {
      onChange('');
    }
  }

  return (
    <input
      className="field-input"
      style={{ minHeight: 32, padding: '6px 10px' }}
      type="text"
      inputMode="numeric"
      placeholder="ηη/μμ/εεεε"
      value={text}
      maxLength={10}
      onChange={e => handleChange(e.target.value)}
    />
  );
}
