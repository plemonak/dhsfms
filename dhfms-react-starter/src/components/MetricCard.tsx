interface Props {
  label: string;
  value: number | string;
  alert?: boolean;
}

export function MetricCard({ label, value, alert }: Props) {
  return (
    <div className="card metric-card">
      <div className={`metric-value ${alert ? 'alert' : ''}`}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}
