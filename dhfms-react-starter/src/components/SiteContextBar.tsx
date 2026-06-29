import type { Site } from '../types/models';

interface Props {
  site?: Site;
  sites?: Site[];
  selectedSiteId?: number | 'all';
  onSiteChange?: (siteId: number | 'all') => void;
}

export function SiteContextBar({ site, sites = [], selectedSiteId = 'all', onSiteChange }: Props) {
  const allSitesLabel = 'ΔΥΚΑΤ – Όλα τα εργοτάξια';
  const activeLabel = selectedSiteId === 'all'
    ? allSitesLabel
    : site
      ? `${site.name}${site.phase ? ` — ${site.phase}` : ''}`
      : 'Δεν έχει επιλεγεί έργο';

  return (
    <div className="site-context">
      <div>
        <div className="site-label">Πεδίο προβολής</div>
        <div className="site-name">{activeLabel}</div>
      </div>

      {sites.length > 0 && onSiteChange ? (
        <select
          className="site-select"
          value={selectedSiteId}
          onChange={(event) => {
            const value = event.target.value;
            onSiteChange(value === 'all' ? 'all' : Number(value));
          }}
          aria-label="Επιλογή πεδίου προβολής"
        >
          <option value="all">{allSitesLabel}</option>
          {sites.map(siteOption => (
            <option key={siteOption.id} value={siteOption.id}>
              {siteOption.name}{siteOption.phase ? ` — ${siteOption.phase}` : ''}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
