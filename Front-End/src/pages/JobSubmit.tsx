import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Send, FileText, Clock, Search, Loader2 } from 'lucide-react';

interface PredefinedProtein {
  protein_id: string;
  protein_name: string;
  category: string;
}

export default function JobSubmit() {
  const [fasta, setFasta] = useState('');
  const [loading, setLoading] = useState(false);
  const [proteins, setProteins] = useState<PredefinedProtein[]>([]);
  const [selectedProtein, setSelectedProtein] = useState('');
  const [loadingProteins, setLoadingProteins] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProteins() {
      try {
        const data = await api.getProteins();
        setProteins(data);
      } catch (err) {
        console.error("Error loading predefined proteins", err);
      }
    }
    fetchProteins();
  }, []);

  const handleProteinSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedProtein(id);
    if (!id) {
      setFasta('');
      return;
    }
    
    setLoadingProteins(true);
    try {
      const details = await api.getProteinDetails(id);
      if (details.fasta_ready) {
        setFasta(details.fasta_ready);
      }
    } catch (err) {
      console.error("Error fetching protein details", err);
      alert("No se pudo cargar la secuencia de la proteína.");
    } finally {
      setLoadingProteins(false);
    }
  };

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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-secondary)' }} />
          <select 
            className="input-styled" 
            style={{ paddingLeft: '48px', cursor: 'pointer', appearance: 'none', background: 'var(--bg-card)' }}
            value={selectedProtein}
            onChange={handleProteinSelect}
            disabled={loadingProteins}
          >
            <option value="">Selecciona una proteína predefinida del catálogo...</option>
            {proteins.map(p => (
              <option key={p.protein_id} value={p.protein_id}>
                {p.protein_name} ({p.category})
              </option>
            ))}
          </select>
          {loadingProteins && <Loader2 size={18} className="animate-spin" style={{ position: 'absolute', top: '12px', right: '16px', color: 'var(--primary)' }} />}
        </div>
        <button type="button" className="btn-secondary" onClick={() => { setFasta(''); setSelectedProtein(''); }}>
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
