import { PenLine, RotateCcw, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  signer: string;
  title?: string;
  subtitle?: string;
  documentId?: string;
  onSignatureCaptured?: (payload: { signer: string; documentId: string; signatureData: string; createdAt: string }) => void;
  initialValue?: string;
}

export function SignaturePad({ signer, title = 'Υπογραφή', subtitle, documentId = 'demo-signature', onSignatureCaptured, initialValue }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(initialValue));
  const [savedSignature, setSavedSignature] = useState<string | undefined>(initialValue);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = 320;
      const height = 190;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#0f172a';
      ctxRef.current = ctx;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      if (savedSignature) {
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 0, 0, width, height);
        };
        image.src = savedSignature;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [savedSignature]);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function beginStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    canvas.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setHasSignature(true);
  }

  function continueStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    event.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function endStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const width = 320;
    const height = 190;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
    setSavedSignature(undefined);
  }

  function saveSignature() {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const signatureData = canvas.toDataURL('image/png');
    setSavedSignature(signatureData);
    onSignatureCaptured?.({
      signer,
      documentId,
      signatureData,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="card card-pad">
      <div className="form-section-title">{title}</div>
      {subtitle && <div className="page-subtitle" style={{ marginBottom: 10 }}>{subtitle}</div>}
      <div className="page-subtitle" style={{ marginBottom: 10 }}>Υπογράφων: {signer}</div>
      <canvas
        ref={canvasRef}
        className="signature-pad"
        onPointerDown={beginStroke}
        onPointerMove={continueStroke}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
        style={{ touchAction: 'none', width: '100%', maxWidth: 320, height: 190 }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button className="secondary-btn" onClick={clearSignature} type="button"><RotateCcw size={16} />Καθαρισμός</button>
        <button className="primary-btn" onClick={saveSignature} type="button"><Save size={16} />Αποθήκευση</button>
      </div>
      {savedSignature && (
        <div style={{ marginTop: 12 }}>
          <div className="row-subtitle">Αποθηκευμένη υπογραφή</div>
          <img src={savedSignature} alt={`Υπογραφή ${signer}`} style={{ marginTop: 8, maxWidth: '100%', height: 70, objectFit: 'contain', border: '1px solid var(--dh-line)', borderRadius: 8, background: '#fff' }} />
        </div>
      )}
      {!savedSignature && (
        <div style={{ marginTop: 8, color: 'var(--dh-muted)', fontSize: 13 }}>
          <PenLine size={14} style={{ display: 'inline-block', marginRight: 4 }} />Σχεδιάστε με το ποντίκι ή το δάχτυλο.
        </div>
      )}
    </div>
  );
}
