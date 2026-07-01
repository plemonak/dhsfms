import { BriefcaseBusiness, Car, ClipboardCheck, Home, QrCode, Settings, Users, Wrench } from 'lucide-react';
import type { AppUser, PageKey } from '../types/models';

interface AppShellProps {
  user: AppUser;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
}

const navItems: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Home', icon: <Home size={18} /> },
  { key: 'employees', label: 'Προσωπικό', icon: <Users size={18} /> },
  { key: 'jsa-signoff', label: 'JSA Υπογραφές', icon: <ClipboardCheck size={18} /> },
  { key: 'vehicles', label: 'Οχήματα & ΜΕ', icon: <Car size={18} /> },
  { key: 'equipment', label: 'Εξοπλισμός', icon: <Wrench size={18} /> },
  { key: 'sites', label: 'Εργοτάξια', icon: <BriefcaseBusiness size={18} /> },
  { key: 'qr', label: 'QR', icon: <QrCode size={18} /> },
  { key: 'settings', label: 'Ρυθμίσεις', icon: <Settings size={18} /> },
];

export function AppShell({ user, currentPage, onNavigate, children }: AppShellProps) {
  const builtAt = new Date(__APP_BUILT_AT__);
  const buildLabel = Number.isNaN(builtAt.getTime())
    ? __APP_COMMIT__
    : `${__APP_COMMIT__} · ${builtAt.toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">Δ</div>
          <div>
            <div className="brand-title">DYKAT HSEFMS</div>
            <div className="brand-subtitle">Σύστημα Διαχείρισης ΥΑΕ & Στόλου</div>
          </div>
        </div>
        <div className="header-status">
          <div className="build-pill" title={`Branch: ${__APP_BRANCH__} · Build: ${__APP_BUILT_AT__}`}>
            {__APP_BRANCH__} · {buildLabel}
          </div>
          <div className="user-pill">
            <span>{user.role}</span>
            <div className="user-avatar" title={user.displayName}>{user.initials}</div>
          </div>
        </div>
      </header>

      <div className="layout">
        <nav className="side-nav" aria-label="Κύρια πλοήγηση">
          {navItems.map(item => (
            <button
              key={item.key}
              type="button"
              className={`nav-button ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
