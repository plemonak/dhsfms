interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
