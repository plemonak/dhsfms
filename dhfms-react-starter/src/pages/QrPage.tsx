import { PageHeader } from '../components/PageHeader';

export function QrPage() {
  return (
    <div className="page">
      <PageHeader title="QR Preview" subtitle="Payload χωρίς προσωπικά δεδομένα" />
      <div className="qr-panel">
        <div className="qr-box">QR</div>
        <div>
          <div className="site-label">Payload</div>
          <h2>AEGIS|EMP|1</h2>
          <p>Το QR δεν περιέχει ονοματεπώνυμο, τηλέφωνο, ΑΦΜ ή άλλο προσωπικό δεδομένο. Περιέχει μόνο τύπο εγγραφής και ID.</p>
        </div>
      </div>
    </div>
  );
}
