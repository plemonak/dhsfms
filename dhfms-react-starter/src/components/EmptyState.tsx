export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--dh-muted)' }}>
      <strong>{title}</strong>
      {subtitle && <div style={{ marginTop: 6 }}>{subtitle}</div>}
    </div>
  );
}
