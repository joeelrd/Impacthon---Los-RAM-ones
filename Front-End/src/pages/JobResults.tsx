import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import MoleculeViewer from '../components/MoleculeViewer';
import ChatbotPanel from '../components/ChatbotPanel';
import BiologistGuide from '../components/BiologistGuide';
import { ShieldCheck, Activity, Cpu, ArrowLeft, Download, AlertTriangle, Info, Bot, Zap } from 'lucide-react';

export default function JobResults() {
  const { jobId } = useParams();
  const [status, setStatus] = useState<string>('PENDING');
  const [outputs, setOutputs] = useState<any>(null);
  const [accounting, setAccounting] = useState<any>(null);

  useEffect(() => {
    if (!jobId) return;

    let pollInterval: any;

    const checkStatus = async () => {
      try {
        const res = await api.getJobStatus(jobId);
        setStatus(res.status);
        if (res.status === 'COMPLETED' || res.status === 'FAILED') {
          clearInterval(pollInterval);
          if (res.status === 'COMPLETED') {
            fetchOutputs();
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    const fetchOutputs = async () => {
      try {
        const res = await api.getJobOutputs(jobId);

        // INTERCEPT: Si subimos un PDB real, usamos esa info geométrica 100% precisa
        // en lugar de la versión truncada o simulada que devuelve el supercomputador por defecto
        if (jobId) {
          const cachedPdb = sessionStorage.getItem(`pdb_cache_${jobId}`);
          if (cachedPdb && res.structural_data) {
            res.structural_data.pdb_file = cachedPdb;
            // Opcional: podríamos limpiar el caché aquí, pero lo mantenemos por si el usuario recarga
          }
        }

        setOutputs(res);
        try {
          const accRes = await api.getJobAccounting(jobId);
          if (accRes && accRes.accounting) setAccounting(accRes.accounting);
        } catch (e) {
          console.error("Accounting fetch failed", e);
        }
      } catch (err) {
        console.error(err);
      }
    };

    pollInterval = setInterval(checkStatus, 3000);
    checkStatus(); // Initial check

    return () => clearInterval(pollInterval);
  }, [jobId]);

  const handleDownload = () => {
    if (!outputs?.structural_data?.pdb_file) return;
    const blob = new Blob([outputs.structural_data.pdb_file], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobId}.pdb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

      {/* PANEL PRINCIPAL IZQUIERDO */}
      <div className="glass-panel" style={{ padding: '2rem', flex: 1, minWidth: 0 }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={24} />
            </Link>
            <h2 style={{ margin: 0 }}>Resultados Job: <span style={{ color: 'var(--text-secondary)' }}>{jobId}</span></h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BiologistGuide />
            <div className={`badge status-${status.toLowerCase()}`}>
              {status}
            </div>
          </div>
        </div>

        {/* Estado: Pendiente o Ejecutando */}
        {(status === 'PENDING' || status === 'RUNNING') && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <Activity size={48} className="gradient-text" style={{ animation: 'spin 2s linear infinite' }} />
            <h3 style={{ marginTop: '1.5rem', color: 'var(--accent-cyan)' }}>Simulando ejecución en CESGA...</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Estado actual: {status}
            </p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Estado: Completado */}
        {status === 'COMPLETED' && outputs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Visor Molecular */}
            <div style={{ background: 'var(--bg-color-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={20} color="var(--accent-cyan)" /> Estructura Plegada</h3>
                <button className="btn-secondary" onClick={handleDownload} style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={16} /> PDB
                </button>
              </div>
              <div style={{ height: '550px' }}>
                <MoleculeViewer pdbData={outputs.structural_data.pdb_file} />
              </div>
            </div>

            {/* Fila de paneles: Biológico + HPC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

              {/* Panel Biológico */}
              <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} /> Panel Biológico
                </h4>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                    <span>Solubilidad</span>
                    <span>{outputs.biological_data?.solubility_score?.toFixed(1) || 0}%</span>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px' }}>
                    <div style={{ width: `${outputs.biological_data?.solubility_score || 0}%`, background: 'var(--accent-cyan)', height: '100%', borderRadius: '3px' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                    <span>Alertas de Toxicidad</span>
                    <span style={{ color: outputs.biological_data?.toxicity_alerts?.length ? '#ff7d45' : '#65cbf3' }}>
                      {outputs.biological_data?.toxicity_alerts?.length || 0}
                    </span>
                  </div>
                  {outputs.biological_data?.toxicity_alerts?.map((alert: string, i: number) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: '#ff7d45', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> {alert}
                    </div>
                  ))}
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
      </div> {/* AQUI SE CIERRA CORRECTAMENTE EL glass-panel PRINCIPAL */}

      {/* PANEL DEL CHATBOT: Fuera del glass-panel, a la derecha */}
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

    </div> // AQUI SE CIERRA EL CONTENEDOR FLEX PRINCIPAL
  );
}