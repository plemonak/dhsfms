interface Props {
  title?: string;
  children: React.ReactNode;
}

export function SectionCard({ title, children }: Props) {
  return (
    <section className="card form-section">
      {title && <div className="form-section-title">{title}</div>}
      {children}
    </section>
  );
}
