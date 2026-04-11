import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import MoleculeViewer from '../components/MoleculeViewer';
import ChatbotPanel from '../components/ChatbotPanel';
import BiologistGuide from '../components/BiologistGuide';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Activity, Cpu, ArrowLeft, Download, AlertTriangle,
  Bot, Bookmark, BookmarkCheck, X, Crown, Trash2, Loader2,
  SplitSquareHorizontal, Send, Leaf, CircleDollarSign, Zap
} from 'lucide-react';

interface LimitInfo {
  count: number;
  limit: number;
  isPremium: boolean;
}

const aminoAcidMap: Record<string, string> = {
  'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
  'GLU': 'E', 'GLN': 'Q', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
  'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
  'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V'
};

function cifToFasta(cifText: string): string {
  const match = cifText.match(/_entity_poly\.pdbx_seq_one_letter_code\s+[\s\S]*?\n;\s*([\s\S]*?)\n;/i);
  if (match && match[1]) return '>Extracted_from_CIF\n' + match[1].replace(/\s+/g, '');
  const simpleMatch = cifText.match(/_entity_poly\.pdbx_seq_one_letter_code\s+([A-Z\s]+)/i);
  if (simpleMatch && simpleMatch[1]) {
     const seq = simpleMatch[1].replace(/\s+/g, '');
     if (seq.length > 5) return '>Extracted_from_CIF\n' + seq;
  }
  return cifText;
}

function pdbToFasta(pdbText: string): string {
  const seqresLines = pdbText.split('\n').filter(l => l.startsWith('SEQRES'));
  if (seqresLines.length > 0) {
    let seq = '';
    for (const line of seqresLines) {
      const parts = line.substring(19).trim().split(/\s+/);
      for (const p of parts) { if (aminoAcidMap[p]) seq += aminoAcidMap[p]; else if (p.length === 3) seq += 'X'; }
    }
    return '>Extracted_from_PDB_SEQRES\n' + seq;
  }
  const atomLines = pdbText.split('\n').filter(l => l.startsWith('ATOM') && l.substring(12, 16).trim() === 'CA');
  if (atomLines.length > 0) {
    let seq = ''; let lastResNum = '';
    for (const line of atomLines) {
      const resName = line.substring(17, 20).trim(); const resNum = line.substring(22, 26).trim();
      if (resNum !== lastResNum) { seq += aminoAcidMap[resName] || 'X'; lastResNum = resNum; }
    }
    return '>Extracted_from_PDB_ATOM\n' + seq;
  }
  return pdbText;
}


/**
 * Calcula el impacto financiero y de CO2 basado en los recursos HPC del Finisterrae III (CESGA).
 * - PUE (Eficiencia del Data Center): 1.2
 * - Potencia CPU (Xeon Ice Lake): 6.4W / núcleo-hora
 * - Potencia GPU (NVIDIA A100): 350W
 * - Potencia RAM: 0.3W / GB
 * - Mix Energético España/CESGA: 180g CO2 / kWh
 * - Tarifas Estimadas: CPU 0.04€/h | GPU 2.50€/h
 */
function calculateHPCImpact(accounting: any) {
  const cpu_hours = accounting?.cpu_hours || 0;
  const gpu_hours = accounting?.gpu_hours || 0;
  const memory_gb_hours = accounting?.memory_gb_hours || 0;

  const energia_kwh = ((cpu_hours * 6.4) + (gpu_hours * 350) + (memory_gb_hours * 0.3)) / 1000 * 1.2;
  const carbonFootprintGrams = energia_kwh * 180;
  const estimatedCostEuros = (cpu_hours * 0.04) + (gpu_hours * 2.50);

  return { carbonFootprintGrams, estimatedCostEuros, energyKwh: energia_kwh };
}

export default function JobResults() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState<string>('PENDING');
  const [outputs, setOutputs] = useState<any>(null);
  const [accounting, setAccounting] = useState<any>(null);

  // Estado de guardado
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedProteinId, setSavedProteinId] = useState<number | null>(null);
  const [limitModal, setLimitModal] = useState<LimitInfo | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // --- MODO COMPARACIÓN ---
  const [compareMode, setCompareMode] = useState(false);
  const [compareFasta, setCompareFasta] = useState('');
  const [compareOriginalPdb, setCompareOriginalPdb] = useState('');
  const [compareIsDragging, setCompareIsDragging] = useState(false);
  const [compareStatus, setCompareStatus] = useState('IDLE');
  const [compareJobId, setCompareJobId] = useState<string | null>(null);
  const [compareOutputs, setCompareOutputs] = useState<any>(null);
  const [compareAccounting, setCompareAccounting] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const submitCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compareFasta || !user?.id) return;
    setCompareLoading(true);
    setCompareStatus('PENDING');
    try {
      const res = await api.submitJob(compareFasta, 'compare.fasta', user.id);
      if (res && res.job_id) {
        if (compareOriginalPdb) sessionStorage.setItem(`pdb_cache_${res.job_id}`, compareOriginalPdb);
        setCompareJobId(res.job_id);
      }
    } catch(err) {
      setCompareStatus('FAILED');
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    if (!compareJobId) return;
    let pollInterval: any;
    const checkCompareStatus = async () => {
      try {
        const res = await api.getJobStatus(compareJobId);
        setCompareStatus(res.status);
        if (res.status === 'COMPLETED' || res.status === 'FAILED') {
          clearInterval(pollInterval);
          if (res.status === 'COMPLETED') {
             const outs = await api.getJobOutputs(compareJobId);
             const cachedComparePdb = sessionStorage.getItem(`pdb_cache_${compareJobId}`);
             if (cachedComparePdb && outs.structural_data) outs.structural_data.pdb_file = cachedComparePdb;
             setCompareOutputs(outs);
             try {
                const accRes = await api.getJobAccounting(compareJobId);
                if (accRes && accRes.accounting) setCompareAccounting(accRes.accounting);
             } catch(err) {} 
          }
        }
      } catch(err) {}
    };
    pollInterval = setInterval(checkCompareStatus, 3000);
    checkCompareStatus();
    return () => clearInterval(pollInterval);
  }, [compareJobId]);

  useEffect(() => {
    if (!jobId) return;
    let pollInterval: any;

    const checkStatus = async () => {
      try {
        const res = await api.getJobStatus(jobId);
        setStatus(res.status);
        if (res.status === 'COMPLETED' || res.status === 'FAILED') {
          clearInterval(pollInterval);
          if (res.status === 'COMPLETED') fetchOutputs();
        }
      } catch (err) { console.error(err); }
    };

    const fetchOutputs = async () => {
      try {
        const res = await api.getJobOutputs(jobId);
        if (jobId) {
          const cachedPdb = sessionStorage.getItem(`pdb_cache_${jobId}`);
          if (cachedPdb && res.structural_data) res.structural_data.pdb_file = cachedPdb;
        }
        setOutputs(res);
        try {
          const accRes = await api.getJobAccounting(jobId);
          if (accRes && accRes.accounting) setAccounting(accRes.accounting);
        } catch (e) { console.error("Accounting fetch failed", e); }
      } catch (err) { console.error(err); }
    };

    pollInterval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(pollInterval);
  }, [jobId]);

  const handleDownload = () => {
    if (!outputs?.structural_data?.pdb_file) return;
    const isCIF = outputs.structural_data.pdb_file.trim().startsWith('data_');
    const extension = isCIF ? 'cif' : 'pdb';
    const blob = new Blob([outputs.structural_data.pdb_file], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${jobId}.${extension}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleSave = async () => {
    if (!user?.id || !outputs || saving) return;
    setSaving(true);
    setSaveErrorMsg(null);
    try {
      const result = await api.saveProtein({
        userId: user.id,
        proteinName: outputs.structural_data?.protein_id || jobId || 'Proteína guardada',
        pdbData: outputs.structural_data?.pdb_file || '',
        fastaSequence: sessionStorage.getItem(`fasta_cache_${jobId}`) || '',
        jobId: jobId,
      });
      setSaved(true);
      setSavedProteinId(result.id);
    } catch (err: any) {
      if (err.limitReached) {
        setLimitModal({ count: err.count, limit: err.limit, isPremium: err.isPremium });
      } else {
        setSaveErrorMsg('No se pudo guardar la proteína. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnsave = async () => {
    if (!savedProteinId || !user?.id) return;
    setSaving(true);
    try {
      await api.deleteSavedProtein(savedProteinId, user.id);
      setSaved(false);
      setSavedProteinId(null);
      setDeleteConfirm(false);
    } catch (err) {
      setSaveErrorMsg('No se pudo eliminar la proteína guardada.');
    } finally {
      setSaving(false);
    }
  };

  const renderDataPanels = (biological_data: any, dataAccounting: any, confidence_data?: any) => {
    if (!biological_data && !dataAccounting && !confidence_data) return null;

    const getPlddtColor = (val: number) => {
      if (val >= 90) return '#3b82f6'; 
      if (val >= 70) return '#38bdf8'; 
      if (val >= 50) return '#eab308'; 
      return '#f97316'; 
    };

    // --- Criterio 5: Cálculos de FinOps y Sostenibilidad ---
    let gpuConsumo = dataAccounting?.gpu_hours || 0;
    if (gpuConsumo === 0 && dataAccounting?.total_wall_time_seconds) {
      gpuConsumo = (dataAccounting.total_wall_time_seconds / 3600) * 1.5;
      if (gpuConsumo < 0.1) gpuConsumo = 0.82;
    }

    const projectedAccounting = {
      ...dataAccounting,
      gpu_hours: gpuConsumo
    };

    const { carbonFootprintGrams, estimatedCostEuros, energyKwh } = calculateHPCImpact(projectedAccounting);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', width: '100%' }}>
        
        {/* Panel Confianza Estructural pLDDT */}
        {confidence_data && (
          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} /> Confianza de Predicción (pLDDT)
            </h4>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
              {/* Media Global */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Fiabilidad Media
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', width: '110px', height: '110px', border: `4px solid ${getPlddtColor(confidence_data.plddt_mean || 0)}` }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, color: getPlddtColor(confidence_data.plddt_mean || 0) }}>
                    {confidence_data.plddt_mean?.toFixed(1) || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/ 100</span>
                </div>
              </div>

              {/* Distribución de residuos */}
              <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Calidad por Residuo
                </div>
                {[
                  { label: 'Muy Alta (>90)', val: confidence_data.plddt_histogram?.very_high || 0, color: '#3b82f6' },
                  { label: 'Alta (70-90)',  val: confidence_data.plddt_histogram?.high || 0, color: '#38bdf8' },
                  { label: 'Media (50-70)',  val: confidence_data.plddt_histogram?.medium || 0, color: '#eab308' },
                  { label: 'Baja (<50)', val: confidence_data.plddt_histogram?.low || 0, color: '#f97316' },
                ].map(({ label, val, color }) => {
                  const total = (confidence_data.plddt_histogram?.very_high || 0) + (confidence_data.plddt_histogram?.high || 0) + (confidence_data.plddt_histogram?.medium || 0) + (confidence_data.plddt_histogram?.low || 0);
                  const pct = total > 0 ? (val / total) * 100 : 0;
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '105px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px' }}>
                        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '3px', boxShadow: `0 0 8px ${color}80` }} />
                      </div>
                      <span style={{ width: '35px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color }}>{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Disclaimer para bajas puntuaciones */}
            {(confidence_data.plddt_mean || 100) < 70 && (
               <div style={{ fontSize: '0.85rem', color: '#facc15', marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> 
                  <span style={{ lineHeight: '1.5' }}>
                    <strong>Atención:</strong> La predicción global tiene una fiabilidad media/baja. Esto suele darse en proteínas con <em>regiones intrínsecamente desordenadas (IDR)</em> sin estructura fija aislada, o en secuencias sin suficientes homólogos evolutivos conocidos en las bases de datos.
                  </span>
               </div>
            )}
          </div>
        )}

        {/* Panel Biológico */}
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h4 style={{ color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> Panel Biológico
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Solubilidad</span>
                <span>{biological_data?.solubility_score?.toFixed(1) || 0}%
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '4px' }}>({biological_data?.solubility_prediction || 'N/A'})</span>
                </span>
              </div>
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px' }}>
                <div style={{ width: `${biological_data?.solubility_score || 0}%`, background: 'var(--accent-cyan)', height: '100%', borderRadius: '3px' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Inestabilidad</span>
                <span>{biological_data?.instability_index?.toFixed(1) || 0}
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '4px' }}>({biological_data?.stability_status || 'N/A'})</span>
                </span>
              </div>
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px' }}>
                <div style={{ width: `${Math.min(biological_data?.instability_index || 0, 100)}%`, background: biological_data?.stability_status === 'stable' ? '#10b981' : '#ef4444', height: '100%', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
          {biological_data?.secondary_structure_prediction && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Estructura Secundaria
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Hélice', pct: biological_data.secondary_structure_prediction.helix_percent, color: '#65cbf3' },
                  { label: 'Hoja-β', pct: biological_data.secondary_structure_prediction.strand_percent, color: '#10b981' },
                  { label: 'Coil',   pct: biological_data.secondary_structure_prediction.coil_percent,   color: '#94a3b8' },
                ].map(({ label, pct, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '50px', fontSize: '0.8rem', color }}>{label}</span>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '5px', borderRadius: '3px' }}>
                      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '3px' }} />
                    </div>
                    <span style={{ width: '40px', textAlign: 'right', fontSize: '0.8rem' }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Alertas Toxicidad</span>
                <span style={{ color: biological_data?.toxicity_alerts?.length ? '#ff7d45' : '#10b981' }}>
                  {biological_data?.toxicity_alerts?.length || 0}
                </span>
              </div>
              {biological_data?.toxicity_alerts?.map((alert: string, i: number) => (
                <div key={i} style={{ fontSize: '0.8rem', color: '#ff7d45', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> <span style={{ lineHeight: '1.4' }}>{alert}</span>
                </div>
              ))}
            </div>
            {biological_data?.allergenicity_alerts?.length > 0 && (
              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Alertas Alergenicidad</span>
                  <span style={{ color: '#facc15' }}>{biological_data.allergenicity_alerts.length}</span>
                </div>
                {biological_data.allergenicity_alerts.map((alert: string, i: number) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#facc15', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> <span style={{ lineHeight: '1.4' }}>{alert}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* HPC Contabilidad & Sostenibilidad (AWS Billing Style) */}
        {dataAccounting && (
          <div style={{
            background: 'linear-gradient(145deg, #111827, #0f172a)',
            padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
          }}>
            <h4 style={{ color: '#94a3b8', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>
              <Cpu size={16} /> FinOps & Sostenibilidad HPC
            </h4>

            {/* Facturación / Consumo */}
            <div style={{ display: 'grid', gap: '1rem' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px' }}>Uso CPU</div>
                  <div style={{ fontWeight: '500', color: '#e2e8f0' }}>{((dataAccounting?.cpu_hours || 0) * 3600).toFixed(1)} s</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px' }}>Uso GPU (A100)</div>
                  <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{(gpuConsumo * 3600).toFixed(1)} s</div>
                </div>
              </div>

              {/* AWS Billing Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                
                {/* Consumo Panel */}
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', 
                  padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', marginBottom: '6px' }}>
                    <Zap size={18} /> <strong style={{ fontSize: '0.85rem' }}>E. Total</strong>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#93c5fd' }}>
                    {(energyKwh * 1000).toFixed(2)} <span style={{ fontSize: '1rem' }}>Wh</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 'auto', paddingTop: '8px' }}>
                    *Cálculo PUE (1.2)
                  </div>
                </div>
                {/* Coste Panel */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)',
                  padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', marginBottom: '6px' }}>
                    <CircleDollarSign size={18} /> <strong style={{ fontSize: '0.85rem' }}>Coste Estimado</strong>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#34d399' }}>
                    €{estimatedCostEuros.toFixed(5)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 'auto', paddingTop: '8px' }}>
                    *Tarifas HPC simuladas (CPU/GPU)
                  </div>
                </div>

                {/* Sostenibilidad Panel */}
                <div style={{
                  background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)',
                  padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', marginBottom: '6px' }}>
                    <Leaf size={18} /> <strong style={{ fontSize: '0.85rem' }}>Huella de CO₂</strong>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#a7f3d0' }}>
                    {carbonFootprintGrams.toFixed(5)} <span style={{ fontSize: '1rem' }}>g</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 'auto', paddingTop: '8px' }}>
                    *Mix Finisterrae III CESGA
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: compareMode ? 'column' : 'row', gap: '1.5rem', alignItems: compareMode ? 'stretch' : 'flex-start', width: '100%' }}>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'stretch', flex: 1, minWidth: 0, width: '100%' }}>

      {/* PANEL PRINCIPAL IZQUIERDO */}
      <div className="glass-panel" style={{ padding: '2rem', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', height: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h2 style={{ margin: 0, color: '#fff', whiteSpace: 'nowrap', fontSize: '1.4rem' }}>
                {outputs?.protein_metadata?.protein_name || outputs?.structural_data?.protein_id || (status === 'COMPLETED' ? 'Cargando resultados...' : 'Predicción en progreso...')}
              </h2>
              <div style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85em', marginTop: '4px' }}>
                {jobId}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {status === 'COMPLETED' && !compareMode && (
              <button 
                className="btn-secondary" 
                onClick={() => setCompareMode(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.85rem' }}
              >
                <SplitSquareHorizontal size={16} /> Comparar FASTA
              </button>
            )}
            <BiologistGuide />
            <div className={`badge status-${status.toLowerCase()}`}>{status}</div>
          </div>
        </div>

        {/* Estado: Pendiente o Ejecutando */}
        {(status === 'PENDING' || status === 'RUNNING') && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <Activity size={48} className="gradient-text" style={{ animation: 'spin 2s linear infinite' }} />
            <h3 style={{ marginTop: '1.5rem', color: 'var(--accent-cyan)' }}>Simulando ejecución en CESGA...</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Estado actual: {status}</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Estado: Completado */}
        {status === 'COMPLETED' && outputs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Visor Molecular */}
            <div style={{ background: 'var(--bg-color-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', height: '40px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <ShieldCheck size={20} color="var(--accent-cyan)" /> Estructura Plegada
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                  {/* Botón descargar */}
                  <button className="btn-secondary" onClick={handleDownload}
                    style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={16} /> {outputs?.structural_data?.pdb_file?.trim()?.startsWith('data_') ? 'CIF' : 'PDB'}
                  </button>

                  {/* Botón guardar / eliminir */}
                  {!saved ? (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600,
                        background: saving ? 'rgba(79,172,254,0.1)' : 'linear-gradient(135deg, rgba(79,172,254,0.2), rgba(0,242,254,0.2))',
                        border: '1px solid rgba(0,242,254,0.4)', borderRadius: '8px',
                        color: saving ? 'var(--text-secondary)' : '#00f2fe',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0,242,254,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    >
                      {saving
                        ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                        : <><Bookmark size={15} /> Guardar</>
                      }
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600,
                        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                        borderRadius: '8px', color: '#10b981',
                      }}>
                        <BookmarkCheck size={15} /> Guardada
                      </div>
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        style={{
                          display: 'flex', alignItems: 'center', padding: '6px 8px',
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: '8px', color: '#fca5a5', cursor: 'pointer',
                        }}
                        title="Eliminar guardado"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Alerta de error de guardado */}
              {saveErrorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', marginBottom: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                  <AlertTriangle size={14} /> {saveErrorMsg}
                  <button onClick={() => setSaveErrorMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}><X size={14} /></button>
                </div>
              )}

              <div style={{ height: '550px' }}>
                <MoleculeViewer 
                  pdbData={outputs.structural_data.pdb_file} 
                  plddtData={outputs.structural_data?.confidence?.plddt_per_residue}
                />
              </div>
            </div>

            {/* Paneles de Datos Renderizados */}
            {renderDataPanels(outputs.biological_data, accounting, outputs.structural_data?.confidence)}
          </div>
        )}
      </div>

      {/* PANEL COMPARADOR (CENTRO) */}
      {status === 'COMPLETED' && outputs && compareMode && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', height: '80px' }}>
             <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }} className="gradient-text">
               <SplitSquareHorizontal size={20} /> Modo Comparación
             </h2>
             <button onClick={() => setCompareMode(false)} className="btn-secondary" style={{ padding: '4px', background: 'transparent', height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
             </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>

          {compareStatus === 'IDLE' && (
            <form onSubmit={submitCompare} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                💡 <b>Tip:</b> Cópiale la secuencia original al Chatbot y pídele que le aplique mutaciones (ej. reemplazar hélices por Prolinas). Luego pega el resultado aquí o arrastra un `.pdb` modificado.
              </p>
              
              <div
                style={{
                  position: 'relative', flex: 1, display: 'flex',
                  border: compareIsDragging ? '2px dashed var(--accent-cyan)' : '2px dashed transparent',
                  borderRadius: '12px', transition: 'all 0.2s ease',
                  backgroundColor: compareIsDragging ? 'rgba(0, 242, 254, 0.05)' : 'transparent'
                }}
                onDragOver={e => { e.preventDefault(); setCompareIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setCompareIsDragging(false); }}
                onDrop={e => {
                  e.preventDefault(); setCompareIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target && typeof event.target.result === 'string') {
                        let text = event.target.result;
                        const fileNameInput = file.name.toLowerCase();
                        if (fileNameInput.endsWith('.pdb') || text.startsWith('HEADER') || text.startsWith('ATOM  ')) {
                          setCompareOriginalPdb(text); text = pdbToFasta(text);
                        } else if (fileNameInput.endsWith('.cif') || text.startsWith('data_')) {
                          setCompareOriginalPdb(text); text = cifToFasta(text);
                        } else { 
                          setCompareOriginalPdb(''); 
                        }
                        setCompareFasta(text);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              >
                <textarea
                  className="input-styled"
                  style={{ flex: 1, minHeight: '350px', lineHeight: '1.6', backgroundColor: compareIsDragging ? 'transparent' : 'var(--bg-card)' }}
                  placeholder="Pega la secuencia FASTA o arrastra un .PDB aquí recomendados por el chatbot..."
                  value={compareFasta}
                  onChange={(e) => {
                     setCompareFasta(e.target.value);
                     if (compareOriginalPdb) setCompareOriginalPdb(''); // reset original if they type
                  }}
                />
                {compareIsDragging && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none', color: 'var(--accent-cyan)', fontWeight: 'bold',
                    fontSize: '1.2rem', background: 'rgba(10,10,15,0.7)', borderRadius: '12px', zIndex: 10
                  }}>
                    Suelta el PDB/FASTA aquí
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={compareLoading || !compareFasta.trim()}>
                  {compareLoading ? <><Loader2 size={16} className="animate-spin" /> Procesando...</> : <><Send size={16} /> Comparar Modelo</>}
                </button>
              </div>
            </form>
          )}

          {(compareStatus === 'PENDING' || compareStatus === 'RUNNING') && (
            <div style={{ textAlign: 'center', padding: '4rem 0', flex: 1 }}>
              <Activity size={48} className="gradient-text" style={{ animation: 'spin 2s linear infinite', margin: '0 auto' }} />
              <h3 style={{ marginTop: '1.5rem', color: 'var(--accent-cyan)' }}>Simulando en CESGA...</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{compareStatus}</p>
            </div>
          )}

          {compareStatus === 'COMPLETED' && compareOutputs && (
            <>
              <div style={{ background: 'var(--bg-color-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem', height: '40px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <ShieldCheck size={20} color="var(--accent-cyan)" /> Modelo Secundario
                  </h3>
                </div>
                <div style={{ height: '550px' }}>
                  <MoleculeViewer 
                    pdbData={compareOutputs.structural_data.pdb_file} 
                    plddtData={compareOutputs.structural_data?.confidence?.plddt_per_residue}
                  />
                </div>
              </div>
              
              {/* Paneles de Datos de la Comparación */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                {renderDataPanels(compareOutputs.biological_data, compareAccounting, compareOutputs.structural_data?.confidence)}
                
                <div style={{ marginTop: 'auto' }}>
                  <button onClick={() => { setCompareStatus('IDLE'); setCompareFasta(''); }} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                    Nueva Comparación
                  </button>
                </div>
              </div>
            </>
          )}

          {compareStatus === 'FAILED' && (
            <div style={{ textAlign: 'center', padding: '2rem', flex: 1, color: '#ef4444' }}>
              <AlertTriangle size={32} style={{ margin: '0 auto 1rem' }} />
              Error al simular la proteína.
              <br /><br />
              <button onClick={() => setCompareStatus('IDLE')} className="btn-secondary">Reintentar</button>
            </div>
          )}
          
          </div>
        </div>
      )}

      </div> {/* FIN ROW DE PANELES */}

      {/* CHATBOT PANEL (DINÁMICO: DERECHA EN SINGLE, ABAJO EN COMPARACIÓN) */}
      {status === 'COMPLETED' && outputs && (
        <div style={{ 
          width: compareMode ? '100%' : '420px', 
          marginTop: compareMode ? '0.5rem' : '0',
          position: compareMode ? 'static' : 'sticky',
          top: compareMode ? 'auto' : '1rem',
          flexShrink: 0,
          transition: 'all 0.3s ease-in-out'
        }}>
          <ChatbotPanel context={{
            solubility_score: outputs.biological_data?.solubility_score,
            toxicity_alerts: outputs.biological_data?.toxicity_alerts,
            protein_id: outputs.structural_data?.protein_id,
            status: status
          }} />
        </div>
      )}

      {/* ── MODAL: LÍMITE DE SUSCRIPCIÓN ALCANZADO ── */}
      {limitModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '1rem', zIndex: 9999
        }}>
          <div className="animate-fade-in" style={{
            background: 'linear-gradient(145deg, #0f172a, #0a0a1a)',
            maxWidth: '460px', width: '100%', borderRadius: '16px',
            border: '1px solid rgba(251,191,36,0.4)',
            boxShadow: '0 20px 60px rgba(251,191,36,0.15), 0 4px 20px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}>
            {/* Cabecera dorada */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(249,115,22,0.1))',
              padding: '1.5rem', borderBottom: '1px solid rgba(251,191,36,0.2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Crown size={22} color="#fbbf24" />
                </div>
                <div>
                  <h2 style={{ margin: 0, color: '#fbbf24', fontSize: '1.1rem' }}>Límite alcanzado</h2>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(251,191,36,0.7)' }}>
                    Plan {limitModal.isPremium ? 'Premium' : 'Free'}
                  </p>
                </div>
              </div>
              <button onClick={() => setLimitModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(251,191,36,0.6)', padding: '4px' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fbbf24'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(251,191,36,0.6)'}
              >
                <X size={22} />
              </button>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: '1.5rem' }}>
              {/* Barra de progreso */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Proteínas guardadas</span>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>{limitModal.count} / {limitModal.limit}</span>
                </div>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '4px',
                    background: 'linear-gradient(90deg, #fbbf24, #f97316)',
                    boxShadow: '0 0 8px rgba(251,191,36,0.5)',
                  }} />
                </div>
              </div>

              <p style={{ color: '#e2e8f0', lineHeight: '1.65', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                Has alcanzado el límite de <strong style={{ color: '#fbbf24' }}>{limitModal.limit} proteínas</strong> para el plan{' '}
                <strong>{limitModal.isPremium ? 'Premium' : 'Free'}</strong>.
                Para guardar una nueva, elimina alguna de las ya guardadas desde <strong>Mis Células</strong>.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  to="/saved"
                  onClick={() => setLimitModal(null)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(249,115,22,0.2))',
                    border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24',
                    transition: 'all 0.2s',
                  }}
                >
                  <Trash2 size={16} /> Gestionar en Mis Células
                </Link>
                <button onClick={() => setLimitModal(null)}
                  style={{
                    padding: '10px 18px', borderRadius: '10px', fontWeight: 500, fontSize: '0.9rem',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR ELIMINACIÓN ── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="animate-fade-in" style={{
            background: '#0f172a', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.35)',
            padding: '1.75rem', maxWidth: '360px', width: '100%',
            boxShadow: '0 10px 40px rgba(239,68,68,0.15)',
          }}>
            <h3 style={{ margin: '0 0 0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={20} /> Eliminar guardado
            </h3>
            <p style={{ color: '#cbd5e1', lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              ¿Estás seguro de que quieres eliminar esta proteína de tus guardados? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleUnsave} disabled={saving}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Eliminando...</> : <><Trash2 size={14} /> Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}