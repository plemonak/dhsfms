import { Printer, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  subtitle: string;
  payload: string;
  qrUrl: string;
  onClose: () => void;
}

export function QrPreviewModal({ open, title, subtitle, payload, qrUrl, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="section-title">{title}</div>
            <div className="row-subtitle">{subtitle}</div>
          </div>
          <button className="secondary-btn" type="button" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="qr-panel">
          <img src={qrUrl} alt="QR code" className="qr-preview-image" />
          <div>
            <div className="site-label">Payload</div>
            <h2 style={{ margin: '6px 0 8px' }}>{payload}</h2>
            <p className="row-subtitle">Το QR περιέχει τύπο εγγραφής, αναγνωριστικό και όνομα / πινακίδα / εξοπλισμό για έλεγχο.</p>
            <button className="primary-btn" type="button" onClick={() => window.print()}><Printer size={17} />Εκτύπωση QR</button>
          </div>
        </div>

        <div className="qr-print-card">
          <div className="qr-print-title">{title}</div>
          <div className="qr-print-subtitle">{subtitle}</div>
          <img src={qrUrl} alt="QR code printable" className="qr-print-image" />
          <div className="qr-print-payload">{payload}</div>
        </div>
      </div>
    </div>
  );
}
