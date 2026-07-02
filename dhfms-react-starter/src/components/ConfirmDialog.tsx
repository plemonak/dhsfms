interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Επιβεβαίωση', cancelLabel = 'Άκυρο', onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" style={{ width: 'min(420px, 100%)' }} onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <div className="section-title">{title}</div>
        </div>
        <p className="row-subtitle" style={{ marginBottom: 16 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="secondary-btn" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className="danger-btn" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
