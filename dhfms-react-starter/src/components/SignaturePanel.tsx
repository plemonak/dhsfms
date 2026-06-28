import { SignaturePad } from './SignaturePad';

export function SignaturePanel({ signer }: { signer: string }) {
  return (
    <SignaturePad
      signer={signer}
      title="Υπογραφή"
      subtitle="Συμπληρώστε τη δήλωση και αποθηκεύστε την υπογραφή σας."
      documentId="demo-signature"
      onSignatureCaptured={() => undefined}
    />
  );
}
