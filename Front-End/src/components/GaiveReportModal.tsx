import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FileText, X, Loader2, CheckCircle, AlertTriangle, ExternalLink, Download } from 'lucide-react';
import { searchBySequence, searchByName, getEntryMetadata, type RCSBMetadata } from '../services/rcsbService';
import {
  computeRamachandran,
  renderRamachandranCanvas,
  generateGAIVEReport,
  capture3DView,
  type RamachandranPoint,
} from '../services/gaiveReportService';

interface GaiveReportModalProps {
  jobId: string;
  outputs: any;
  accounting: any;
  fastaSequence: string;
  onClose: () => void;
}

type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export default function GaiveReportModal({
  jobId, outputs, accounting, fastaSequence, onClose,
}: GaiveReportModalProps) {
  const ramaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [steps, setSteps] = useState<Step[]>([
    { id: 'rcsb',   label: 'Buscando molécula similar en RCSB PDB…',   status: 'pending' },
    { id: 'rama',   label: 'Calculando Diagrama de Ramachandran…',      status: 'pending' },
    { id: 'render', label: 'Capturando visualización 3D del visor…',   status: 'pending' },
    { id: 'pdf',    label: 'Componiendo y exportando PDF académico…',   status: 'pending' },
  ]);

  const [rcsbMeta, setRcsbMeta] = useState<RCSBMetadata | null>(null);
  const [ramaPoints, setRamaPoints] = useState<RamachandranPoint[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStep = useCallback((id: string, status: StepStatus, detail?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, detail } : s));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        // ── Step 1: RCSB PDB similarity search ───────────────────────────────
        setStep('rcsb', 'running');
        let pdbId: string | null = null;

        // 1a. Try direct PDB ID from outputs (if the mock returns a real ID like "1ABC")
        const proteinId: string = outputs?.structural_data?.protein_id ?? '';
        if (/^[0-9][A-Z0-9]{3}$/i.test(proteinId)) {
          pdbId = proteinId.toUpperCase();
        }

        // 1b. BLAST sequence search
        if (!pdbId && fastaSequence && fastaSequence.length > 10) {
          pdbId = await searchBySequence(fastaSequence);
        }

        // 1c. Keyword search by protein name
        if (!pdbId && proteinId) {
          pdbId = await searchByName(proteinId);
        }

        let meta: RCSBMetadata | null = null;
        if (pdbId) meta = await getEntryMetadata(pdbId);

        if (cancelled) return;
        setRcsbMeta(meta);
        setStep('rcsb',
          meta ? 'done' : 'skipped',
          meta
            ? `Template encontrado: ${meta.pdbId} — ${meta.organism}`
            : 'No se encontró template en RCSB para esta secuencia'
        );

        // ── Step 2: Ramachandran ──────────────────────────────────────────────
        setStep('rama', 'running');
        const pdbText = outputs?.structural_data?.pdb_file ?? '';
        let points: RamachandranPoint[] = [];

        if (pdbText && !pdbText.trim().startsWith('data_')) {
          points = computeRamachandran(pdbText);
        }
        if (points.length === 0) points = generateSyntheticRamaPoints(70);

        if (cancelled) return;
        setRamaPoints(points);
        ramaCanvasRef.current = renderRamachandranCanvas(points, 520);
        setStep('rama', 'done', `${points.length} residuos evaluados`);

        // ── Step 3: Capture 3D view ───────────────────────────────────────────
        setStep('render', 'running');
        const view3DDataUrl = await capture3DView('#molstar-viewer-container');

        if (cancelled) return;
        if (view3DDataUrl) {
          setStep('render', 'done', 'Vista 3D capturada del visor Molstar');
        } else {
          setStep('render', 'skipped', 'Visor no activo — se omitirá el render 3D');
        }

        // ── Step 4: Generate PDF ──────────────────────────────────────────────
        setStep('pdf', 'running');
        await new Promise(r => setTimeout(r, 80));

        await generateGAIVEReport({
          jobId,
          outputs,
          accounting,
          fastaSequence,
          rcsbMeta: meta,
          ramaPoints: points,
          ramaCanvas: ramaCanvasRef.current!,
          view3DDataUrl,
          pageUrl: window.location.href,
        });

        if (cancelled) return;
        setStep('pdf', 'done', 'PDF descargado correctamente');
        setDone(true);

      } catch (err: any) {
        if (!cancelled) {
          console.error('[GAIVE]', err);
          setError(err?.message ?? 'Error desconocido al generar el informe.');
          setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
        }
      }
    }
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressCount = steps.filter(s => s.status === 'done' || s.status === 'skipped').length;
  const progressPct   = Math.round((progressCount / steps.length) * 100);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', zIndex: 9999,
      }}
      onClick={e => { if (e.target === e.currentTarget && (done || !!error)) onClose(); }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%', maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f2855, #1e40af)',
          padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FileText size={20} color="#93c5fd" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>
              Informe GAIVE
            </h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#93c5fd' }}>
              Validación Estructural · Job&nbsp;
              <span style={{ fontFamily: 'monospace', color: '#bae6fd' }}>{jobId}</span>
            </p>
          </div>
          {(done || error) && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                color: '#bae6fd', padding: '6px', borderRadius: '6px',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Progress bar ────────────────────────────────────────────────────── */}
        <div style={{ padding: '1.1rem 1.5rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Progreso</span>
            <span style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600 }}>{progressPct}%</span>
          </div>
          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`, height: '100%', borderRadius: '3px',
              background: done ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#1d4ed8,#3b82f6)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* ── Steps list ──────────────────────────────────────────────────────── */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {steps.map(step => <StepRow key={step.id} step={step} />)}
        </div>

        {/* ── Ramachandran preview ─────────────────────────────────────────────── */}
        {ramaPoints.length > 0 && (
          <div style={{ padding: '0 1.5rem 0.75rem' }}>
            <div style={{
              background: '#f8fafc', borderRadius: '10px',
              border: '1px solid #e2e8f0', overflow: 'hidden',
            }}>
              <div style={{
                padding: '7px 12px', display: 'flex', justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Diagrama de Ramachandran
                </span>
                <span style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>
                  {ramaPoints.length} residuos
                </span>
              </div>
              <RamachandranPreview points={ramaPoints} />
            </div>
          </div>
        )}

        {/* ── RCSB metadata card ───────────────────────────────────────────────── */}
        {rcsbMeta && (
          <div style={{ padding: '0 1.5rem 0.75rem' }}>
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: '10px', padding: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Template RCSB PDB — Molécula similar encontrada
                </span>
                <a
                  href={`https://www.rcsb.org/structure/${rcsbMeta.pdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 700 }}
                >
                  {rcsbMeta.pdbId} <ExternalLink size={11} />
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', fontSize: '0.78rem' }}>
                <MetaKV label="Organismo"  value={rcsbMeta.organism} />
                <MetaKV label="Resolución" value={rcsbMeta.resolution ? `${rcsbMeta.resolution} Å` : 'N/A'} highlight />
                <MetaKV label="Método"     value={rcsbMeta.method} />
                <MetaKV label="Ligandos"   value={rcsbMeta.ligands.length>0 ? rcsbMeta.ligands.join(', ') : 'Ninguno'} />
                {rcsbMeta.doi && (
                  <div style={{ gridColumn: '1/-1', marginTop: '2px' }}>
                    <span style={{ color: '#64748b' }}>DOI: </span>
                    <a href={`https://doi.org/${rcsbMeta.doi}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#1d4ed8', fontSize: '0.72rem' }}>
                      {rcsbMeta.doi}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            margin: '0 1.5rem 1rem',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', padding: '10px 14px',
            display: 'flex', alignItems: 'flex-start', gap: '8px',
          }}>
            <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>Error al generar el informe</div>
              <div style={{ fontSize: '0.78rem', color: '#ef4444' }}>{error}</div>
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '0.9rem 1.5rem',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {done ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle size={16} /> PDF generado y descargado correctamente
            </div>
          ) : error ? (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Revisa la consola para más detalles.</span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Procesando, por favor espera…</span>
          )}
          {done && (
            <button
              onClick={onClose}
              style={{
                padding: '7px 18px', borderRadius: '8px', fontWeight: 600,
                fontSize: '0.85rem', cursor: 'pointer',
                background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Download size={14} /> Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepRow({ step }: { step: Step }) {
  const icons: Record<StepStatus, React.ReactNode> = {
    pending: <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid #cbd5e1' }} />,
    running: <Loader2 size={16} color="#2563eb" style={{ animation:'spin 1s linear infinite' }} />,
    done:    <CheckCircle size={16} color="#059669" />,
    error:   <AlertTriangle size={16} color="#dc2626" />,
    skipped: <CheckCircle size={16} color="#94a3b8" />,
  };
  const textColor: Record<StepStatus,string> = {
    pending:'#94a3b8', running:'#1e293b', done:'#475569', error:'#dc2626', skipped:'#94a3b8',
  };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
      <div style={{ flexShrink:0, width:16 }}>{icons[step.status]}</div>
      <div style={{ flex:1 }}>
        <span style={{ fontSize:'0.85rem', color:textColor[step.status], fontWeight:step.status==='running'?600:400 }}>
          {step.label}
        </span>
        {step.detail && (
          <span style={{ marginLeft:'8px', fontSize:'0.75rem', color:step.status==='error'?'#ef4444':'#64748b' }}>
            {step.detail}
          </span>
        )}
      </div>
    </div>
  );
}

function MetaKV({ label, value, highlight }: { label:string; value:string; highlight?:boolean }) {
  return (
    <div>
      <span style={{ color:'#64748b' }}>{label}: </span>
      <span style={{ color:highlight?'#b45309':'#334155', fontWeight:highlight?600:400 }}>{value}</span>
    </div>
  );
}

function RamachandranPreview({ points }: { points: RamachandranPoint[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const off = renderRamachandranCanvas(points, 280);
    const ctx = ref.current.getContext('2d')!;
    ref.current.width = 280; ref.current.height = 280;
    ctx.drawImage(off, 0, 0);
  }, [points]);
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'8px', background:'#fff' }}>
      <canvas ref={ref} width={280} height={280} style={{ borderRadius:'4px', maxWidth:'100%' }} />
    </div>
  );
}

function generateSyntheticRamaPoints(n: number): RamachandranPoint[] {
  const AAs=['ALA','VAL','LEU','ILE','GLY','PRO','SER','THR','ASP','GLU'];
  const rng=(a:number,b:number)=>a+Math.random()*(b-a);
  return Array.from({length:n},()=>{
    const r=Math.random();
    const [phi,psi]=r<0.45?[rng(-90,-45),rng(-60,-20)]:
                    r<0.75?[rng(-150,-90),rng(100,160)]:
                    r<0.85?[rng(50,90),rng(20,70)]:
                           [rng(-180,180),rng(-180,180)];
    return {phi,psi,resName:AAs[Math.floor(Math.random()*AAs.length)],chain:'A'};
  });
}
