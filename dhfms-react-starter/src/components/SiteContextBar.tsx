import type { Site } from '../types/models';

interface Props {
  site?: Site;
  onChange?: () => void;
}

export function SiteContextBar({ site, onChange }: Props) {
  return (
    <div className="site-context">
      <div>
        <div className="site-label">Ενεργό έργο</div>
        <div className="site-name">{site ? `${site.name}${site.phase ? ` — ${site.phase}` : ''}` : 'Δεν έχει επιλεγεί έργο'}</div>
      </div>
      <button className="site-action" type="button" onClick={onChange}>Αλλαγή ▾</button>
    </div>
  );
}
