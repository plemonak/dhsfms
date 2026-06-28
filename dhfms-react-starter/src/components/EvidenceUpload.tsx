import { Camera, FileUp, FileText } from 'lucide-react';

export function EvidenceUpload() {
  return (
    <div className="evidence-drop">
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
        <Camera /> <FileUp /> <FileText />
      </div>
      <strong>Φωτογραφία / JPG / PDF</strong>
      <div style={{ color: 'var(--dh-muted)', marginTop: 4 }}>Προσωρινά demo component. Σύνδεση με SharePoint library στο επόμενο βήμα.</div>
    </div>
  );
}
