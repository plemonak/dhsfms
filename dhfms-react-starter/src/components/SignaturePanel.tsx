import { PenLine } from 'lucide-react';

export function SignaturePanel({ signer }: { signer: string }) {
  return (
    <div className="card card-pad">
      <div className="form-section-title">Υπογραφή</div>
      <div className="page-subtitle" style={{ marginBottom: 10 }}>Υπογράφων: {signer}</div>
      <div className="signature-pad">
        <div style={{ textAlign: 'center' }}>
          <PenLine size={34} />
          <div>Περιοχή υπογραφής</div>
        </div>
      </div>
    </div>
  );
}
