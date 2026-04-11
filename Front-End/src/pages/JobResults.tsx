import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import MoleculeViewer from '../components/MoleculeViewer';
import ChatbotPanel from '../components/ChatbotPanel';
import { ShieldCheck, Activity, Cpu, ArrowLeft, Download, AlertTriangle, Info, Bot } from 'lucide-react';

export default function JobResults() {
  const { jobId } = useParams();
  const [status, setStatus] = useState<string>('PENDING');
  const [outputs, setOutputs] = useState<any>(null);
  const [accounting, setAccounting] = useState<any>(null);
  const [tooltip, setTooltip] = useState<{x:number, y:number, text:string} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  useEffect(() => {
    // Draw PAE Matrix Heatmap when outputs load
    if (outputs?.structural_data?.pae_matrix && canvasRef.current) {
      const pae = outputs.structural_data.pae_matrix;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const size = pae.length;
      canvas.width = size;
      canvas.height = size;
      
      const imgData = ctx.createImageData(size, size);
      
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const val = pae[i][j];
          // PAE values min 0 (good, blue), max ~30 (bad, yellow)
          const normalized = Math.min(val / 30, 1.0);
          
          // Color scale: Blue -> Cyan -> Yellow
          let r = Math.floor(normalized * 255);
          let g = Math.floor(normalized * 255 + (1-normalized)*150);
          let b = Math.floor((1 - normalized) * 255);

          const pixelIndex = (i * size + j) * 4;
          imgData.data[pixelIndex] = r;
          imgData.data[pixelIndex + 1] = g;
          imgData.data[pixelIndex + 2] = b;
          imgData.data[pixelIndex + 3] = 255; // Alpha
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [outputs]);

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

  const handleMouseMovePAE = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!outputs?.structural_data?.pae_matrix || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const pae = outputs.structural_data.pae_matrix;
    if(pae[x] && pae[x][y] !== undefined) {
      setTooltip({ x: e.clientX, y: e.clientY - 30, text: `Error estimado res ${x}-${y}: ${pae[x][y].toFixed(2)}Å`});
    }
  };

  // Ya no usamos el texto estático, pero si quieres podemos dejarlo
  // const aiAnalysis = () => { ... }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
      
      {/* Panel principal izquierdo */}
      <div className="glass-panel" style={{ padding: '2rem', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={24} />
            </Link>
            <h2 style={{ margin: 0 }}>Resultados Job: <span style={{ color: 'var(--text-secondary)' }}>{jobId}</span></h2>
          </div>
          <div className={`badge status-${status.toLowerCase()}`}>
            {status}
          </div>
        </div>

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

        {status === 'COMPLETED' && outputs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Visor 3D */}
            <div style={{ background: 'var(--bg-color-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={20} color="var(--accent-cyan)"/> Estructura Plegada</h3>
                <button className="btn-secondary" onClick={handleDownload} style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={16}/> PDB
                </button>
              </div>
              <div style={{ height: '550px' }}>
                <MoleculeViewer pdbData={outputs.structural_data.pdb_file} />
              </div>

              {/* PAE Heatmap */}
              {outputs.structural_data.pae_matrix && (
                <div style={{ position: 'absolute', bottom: '24px', left: '24px', background: 'rgba(10,10,15,0.9)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'crosshair' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={12}/> Heatmap PAE
                  </div>
                  <canvas 
                    ref={canvasRef} 
                    onMouseMove={handleMouseMovePAE}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ width: '120px', height: '120px', imageRendering: 'pixelated', borderRadius: '4px' }}
                  />
                </div>
              )}
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
                      <AlertTriangle size={12}/> {alert}
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
      </div>

      {/* Panel del Chatbot: fuera del glass-panel, a la derecha */}
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

      {/* Tooltip Global */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 10, top: tooltip.y + 10,
          background: 'rgba(0,0,0,0.9)', color: '#fff', padding: '6px 12px',
          borderRadius: '4px', fontSize: '0.8rem', pointerEvents: 'none', zIndex: 9999, border: '1px solid var(--accent-cyan)'
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
