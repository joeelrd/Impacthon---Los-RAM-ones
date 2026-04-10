import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import MoleculeViewer from '../components/MoleculeViewer';
import { ShieldCheck, Activity, Cpu, ArrowLeft, Download, AlertTriangle } from 'lucide-react';

export default function JobResults() {
  const { jobId } = useParams();
  const [status, setStatus] = useState<string>('PENDING');
  const [outputs, setOutputs] = useState<any>(null);
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
        setOutputs(res);
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

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          
          {/* Left Column: 3D Viewer & PAE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Viewer Section */}
            <div style={{ background: 'var(--bg-color-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={20} color="var(--accent-cyan)"/> Estructura 3D</h3>
                <button className="btn-secondary" onClick={handleDownload} style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={16}/> Descargar PDB
                </button>
              </div>
              <MoleculeViewer pdbData={outputs.structural_data.pdb_file} />
              
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: 12, height: 12, background: 'blue', borderRadius: '50%' }}></div> Alta Confianza (pLDDT {'>'} 90)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: 12, height: 12, background: 'orange', borderRadius: '50%' }}></div> Baja Confianza
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Metadata & PAE Heatmap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Identificación</h4>
              {outputs.protein_metadata ? (
                <>
                  <p><strong>Organismo:</strong> <span style={{color:'var(--accent-cyan)'}}>{outputs.protein_metadata.organism}</span></p>
                  <p><strong>Gen/Proteína:</strong> {outputs.protein_metadata.protein_name}</p>
                </>
              ) : (
                <p style={{ color: 'orange', display:'flex', alignItems:'center', gap:'4px' }}><AlertTriangle size={16} /> Secuencia Custom Simulada</p>
              )}
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Métricas Biológicas</h4>
              <p><strong>pLDDT Medio:</strong> {outputs.structural_data.confidence.plddt_mean?.toFixed(2)}</p>
              <p><strong>Solubilidad:</strong> {outputs.biological_data?.solubility_score?.toFixed(1)}/100</p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Error PAE</h4>
              {outputs.structural_data.pae_matrix ? (
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <canvas 
                    ref={canvasRef} 
                    style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
                    Azul = Dominios Fijos | Amarillo = Alta Incertidumbre
                  </p>
                </div>
              ) : (
                <p>PAE no disponible</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
