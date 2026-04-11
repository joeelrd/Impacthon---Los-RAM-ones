import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import MoleculeViewer from '../components/MoleculeViewer';
import ChatbotPanel from '../components/ChatbotPanel';
import BiologistGuide from '../components/BiologistGuide';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Activity, Cpu, ArrowLeft, Download, AlertTriangle,
  Bot, Bookmark, BookmarkCheck, X, Crown, Trash2, Loader2
} from 'lucide-react';

interface LimitInfo {
  count: number;
  limit: number;
  isPremium: boolean;
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

      {/* PANEL PRINCIPAL IZQUIERDO */}
      <div className="glass-panel" style={{ padding: '2rem', flex: 1, minWidth: 0 }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <ArrowLeft size={24} />
            </Link>
            <h2 style={{ margin: 0 }}>Resultados Job: <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.9em' }}>{jobId}</span></h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
                <MoleculeViewer pdbData={outputs.structural_data.pdb_file} />
              </div>
            </div>

            {/* Fila de paneles: Biológico + HPC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

              {/* Panel Biológico */}
              <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} /> Panel Biológico
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Solubilidad</span>
                      <span>{outputs.biological_data?.solubility_score?.toFixed(1) || 0}%
                        <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '4px' }}>({outputs.biological_data?.solubility_prediction || 'N/A'})</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px' }}>
                      <div style={{ width: `${outputs.biological_data?.solubility_score || 0}%`, background: 'var(--accent-cyan)', height: '100%', borderRadius: '3px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Inestabilidad</span>
                      <span>{outputs.biological_data?.instability_index?.toFixed(1) || 0}
                        <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '4px' }}>({outputs.biological_data?.stability_status || 'N/A'})</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px' }}>
                      <div style={{ width: `${Math.min(outputs.biological_data?.instability_index || 0, 100)}%`, background: outputs.biological_data?.stability_status === 'stable' ? '#10b981' : '#ef4444', height: '100%', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>

                {outputs.biological_data?.secondary_structure_prediction && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Proyecciones Estructura Secundaria
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { label: 'Hélice', pct: outputs.biological_data.secondary_structure_prediction.helix_percent, color: '#65cbf3' },
                        { label: 'Hoja-β', pct: outputs.biological_data.secondary_structure_prediction.strand_percent, color: '#10b981' },
                        { label: 'Coil',   pct: outputs.biological_data.secondary_structure_prediction.coil_percent,   color: '#94a3b8' },
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
                      <span style={{ color: outputs.biological_data?.toxicity_alerts?.length ? '#ff7d45' : '#10b981' }}>
                        {outputs.biological_data?.toxicity_alerts?.length || 0}
                      </span>
                    </div>
                    {outputs.biological_data?.toxicity_alerts?.map((alert: string, i: number) => (
                      <div key={i} style={{ fontSize: '0.8rem', color: '#ff7d45', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> <span style={{ lineHeight: '1.4' }}>{alert}</span>
                      </div>
                    ))}
                  </div>

                  {outputs.biological_data?.allergenicity_alerts?.length > 0 && (
                    <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Alertas Alergenicidad</span>
                        <span style={{ color: '#facc15' }}>{outputs.biological_data.allergenicity_alerts.length}</span>
                      </div>
                      {outputs.biological_data.allergenicity_alerts.map((alert: string, i: number) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: '#facc15', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> <span style={{ lineHeight: '1.4' }}>{alert}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* HPC Contabilidad */}
              <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} /> HPC Contabilidad
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Horas CPU</div>
                    <div style={{ fontWeight: 'bold' }}>{accounting?.cpu_hours?.toFixed(4) || "0.0000"}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Horas GPU</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{accounting?.gpu_hours?.toFixed(4) || "0.0000"}</div>
                  </div>
                  {accounting?.total_wall_time_seconds && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Tiempo total en cola: {accounting.total_wall_time_seconds}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CHATBOT PANEL */}
      {status === 'COMPLETED' && outputs && (
        <div style={{ width: '420px', flexShrink: 0, position: 'sticky', top: '1rem' }}>
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