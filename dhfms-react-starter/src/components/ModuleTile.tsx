interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function ModuleTile({ icon, title, subtitle, disabled, onClick }: Props) {
  return (
    <button type="button" className={`tile ${disabled ? 'disabled' : ''}`} disabled={disabled} onClick={onClick}>
      <span className="tile-icon">{icon}</span>
      <span>
        <div className="tile-title">{title}</div>
        <div className="tile-subtitle">{subtitle}</div>
      </span>
    </button>
  );
}
