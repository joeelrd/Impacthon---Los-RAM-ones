import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Send, FileText, Clock } from 'lucide-react';

const SAMPLES = {
  ubiquitin: ">sp|P0CG47|UBQ_HUMAN Ubiquitin\nMQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG",
  calmodulin: ">sp|P0DP23|CALM1_HUMAN Calmodulin\nMADQLTEEQIAEFKEAFSLFDKDGDGTITTKELGTVMRSLGQNPTEAELQDMINEVDADGNGTIDFPEFLTMMARKMKDTDSEEEIREAFRVFDKDGNGYISAAELRHVMTNLGEKLTDEEVDEMIREADIDGDGQVNYEEFVQMMTAK",
};

export default function JobSubmit() {
  const [fasta, setFasta] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fasta) return;
    setLoading(true);
    try {
      const res = await api.submitJob(fasta, 'sequence.fasta');
      if (res && res.job_id) {
        navigate(`/jobs/${res.job_id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error enviando la tarea al supercomputador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Inicia tu Predicción 3D
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
        Introduce tu secuencia proteica en formato FASTA. Nuestro pipeline procesará 
        tu solicitud utilizando la potencia del supercomputador CESGA simulado.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" onClick={() => setFasta(SAMPLES.ubiquitin)}>
          Cargar Ubiquitina
        </button>
        <button className="btn-secondary" onClick={() => setFasta(SAMPLES.calmodulin)}>
          Cargar Calmodulina
        </button>
        <button className="btn-secondary" onClick={() => setFasta('')}>
          Limpiar
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <FileText size={20} style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--text-secondary)' }} />
          <textarea
            className="input-styled"
            style={{ minHeight: '250px', paddingLeft: '48px' }}
            placeholder="Pegar secuencia FASTA aquí... Ej: >sp|P0CG47|..."
            value={fasta}
            onChange={(e) => setFasta(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} /> 
            <span>Tiempo extimado en cola: ~5s</span>
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !fasta.trim()}>
            {loading ? 'Submitting...' : <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Send size={18}/> Enviar Tarea</span>}
          </button>
        </div>
      </form>
    </div>
  );
}
