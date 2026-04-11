import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Send, FileText, Clock, Search, Loader2, AlertTriangle, X } from 'lucide-react';
import BiologistGuide from '../components/BiologistGuide';

interface PredefinedProtein {
  protein_id: string;
  protein_name: string;
  category: string;
}

const aminoAcidMap: Record<string, string> = {
  'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
  'GLU': 'E', 'GLN': 'Q', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
  'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
  'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V'
};

function pdbToFasta(pdbText: string): string {
  const seqresLines = pdbText.split('\n').filter(l => l.startsWith('SEQRES'));
  if (seqresLines.length > 0) {
    let seq = '';
    for (const line of seqresLines) {
      const parts = line.substring(19).trim().split(/\s+/);
      for (const p of parts) {
        if (aminoAcidMap[p]) seq += aminoAcidMap[p];
        else if (p.length === 3) seq += 'X';
      }
    }
    return '>Extracted_from_PDB_SEQRES\n' + seq;
  }
  
  const atomLines = pdbText.split('\n').filter(l => l.startsWith('ATOM') && l.substring(12, 16).trim() === 'CA');
  if (atomLines.length > 0) {
    let seq = '';
    let lastResNum = '';
    for (const line of atomLines) {
      const resName = line.substring(17, 20).trim();
      const resNum = line.substring(22, 26).trim();
      if (resNum !== lastResNum) {
        if (aminoAcidMap[resName]) seq += aminoAcidMap[resName];
        else seq += 'X';
        lastResNum = resNum;
      }
    }
    return '>Extracted_from_PDB_ATOM\n' + seq;
  }
  
  return pdbText;
}

export default function JobSubmit() {
  const [fasta, setFasta] = useState('');
  const [loading, setLoading] = useState(false);
  const [proteins, setProteins] = useState<PredefinedProtein[]>([]);
  const [selectedProtein, setSelectedProtein] = useState('');
  const [loadingProteins, setLoadingProteins] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
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
      setErrorModal("No se pudo cargar la secuencia de la proteína catalogada. Verifica tu conexión con la base de datos.");
    } finally {
      setLoadingProteins(false);
    }
  };

  const [originalPdb, setOriginalPdb] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fasta) return;
    setLoading(true);
    try {
      const res = await api.submitJob(fasta, 'sequence.fasta');
      if (res && res.job_id) {
        if (originalPdb) {
          sessionStorage.setItem(`pdb_cache_${res.job_id}`, originalPdb);
        }
        navigate(`/jobs/${res.job_id}`);
      }
    } catch (err) {
      console.error(err);
      setErrorModal("Hubo un error al enviar la petición al CESGA. La petición podría ser erronea o el servicio backend podría no estar disponible.");
    } finally {
      setLoading(false);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          let text = event.target.result;
          if (file.name.toLowerCase().endsWith('.pdb') || text.startsWith('HEADER') || text.startsWith('ATOM  ')) {
            setOriginalPdb(text); // Guarda el PDB real
            text = pdbToFasta(text);
          } else {
            setOriginalPdb('');
          }
          setFasta(text);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Inicia tu Predicción 3D
      </h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6', maxWidth: '600px' }}>
          Introduce tu secuencia proteica en formato FASTA. Nuestro pipeline procesará
          tu solicitud utilizando la potencia del supercomputador CESGA simulado.
        </p>
        <BiologistGuide />
      </div>

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
        <button type="button" className="btn-secondary" onClick={() => { setFasta(''); setSelectedProtein(''); setOriginalPdb(''); }}>
          Limpiar
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div 
          style={{ 
            position: 'relative',
            border: isDragging ? '2px dashed var(--accent-cyan)' : '2px dashed transparent',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            backgroundColor: isDragging ? 'rgba(0, 242, 254, 0.05)' : 'transparent'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileText size={20} style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--text-secondary)' }} />
          <textarea
            className="input-styled"
            style={{ 
              minHeight: '250px', 
              paddingLeft: '48px',
              backgroundColor: isDragging ? 'transparent' : 'var(--bg-card)'
            }}
            placeholder="Pegar secuencia FASTA aquí o arrastrar un archivo (.fasta, .pdb)... Ej: >sp|P0CG47|..."
            value={fasta}
            onChange={(e) => setFasta(e.target.value)}
          />
          {isDragging && (
             <div style={{
               position: 'absolute',
               top: 0, left: 0, right: 0, bottom: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               pointerEvents: 'none',
               color: 'var(--accent-cyan)',
               fontWeight: 'bold',
               fontSize: '1.2rem',
               background: 'rgba(10, 10, 15, 0.7)',
               borderRadius: '12px',
               zIndex: 10
             }}>
               Suelta el archivo aquí
             </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} />
            <span>Tiempo extimado en cola: ~5s</span>
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !fasta.trim()}>
            {loading ? 'Submitting...' : <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Send size={18} /> Enviar Tarea</span>}
          </button>
        </div>
      </form>

      {/* --- MODAL DE ERROR ESTILO BIOLOGIST GUIDE --- */}
      {errorModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          zIndex: 9999
        }}>
          <div className="animate-fade-in" style={{
            backgroundColor: '#0f172a',
            maxWidth: '500px',
            width: '100%',
            borderRadius: '12px',
            border: '1px solid #ef4444',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              backgroundColor: '#0f172a',
              borderBottom: '1px solid #334155',
              zIndex: 10
            }}>
              <h2 style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0,
                color: '#ef4444',
                fontSize: '1.2rem'
              }}>
                <AlertTriangle size={24} /> Acción Interrumpida
              </h2>
              <button
                type="button"
                onClick={() => setErrorModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                onMouseOver={e => e.currentTarget.style.color = '#fff'}
                onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{
              padding: '1.5rem',
              color: '#e2e8f0',
              lineHeight: '1.6',
              fontSize: '1rem',
              background: 'linear-gradient(145deg, rgba(30,30,50,0.4), rgba(15,15,25,0.4))'
            }}>
              {errorModal}
            </div>

            <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1e293b', background: '#0f172a' }}>
              <button
                type="button"
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
                onClick={() => setErrorModal(null)}
                onMouseOver={e => e.currentTarget.style.background = '#dc2626'}
                onMouseOut={e => e.currentTarget.style.background = '#ef4444'}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
