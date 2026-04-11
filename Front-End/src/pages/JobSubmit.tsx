import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { Send, FileText, Clock, Loader2, AlertTriangle, X, Dna, ChevronRight, Sparkles, Crown, Trash2 } from 'lucide-react';
import BiologistGuide from '../components/BiologistGuide';
import { useAuth } from '../context/AuthContext';

interface PredefinedProtein {
  protein_id: string;
  protein_name: string;
  category: string;
}

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  'signaling':   { bg: 'rgba(79,172,254,0.12)',  text: '#4facfe', border: 'rgba(79,172,254,0.3)',  glow: 'rgba(79,172,254,0.2)' },
  'immunity':    { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', border: 'rgba(16,185,129,0.3)',  glow: 'rgba(16,185,129,0.2)' },
  'structural':  { bg: 'rgba(168,85,247,0.12)',  text: '#a855f7', border: 'rgba(168,85,247,0.3)',  glow: 'rgba(168,85,247,0.2)' },
  'transport':   { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.3)',  glow: 'rgba(251,191,36,0.2)' },
  'catalysis':   { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', border: 'rgba(239,68,68,0.3)',   glow: 'rgba(239,68,68,0.2)' },
  'metabolism':  { bg: 'rgba(249,115,22,0.12)',  text: '#f97316', border: 'rgba(249,115,22,0.3)',  glow: 'rgba(249,115,22,0.2)' },
  'default':     { bg: 'rgba(0,242,254,0.10)',   text: '#00f2fe', border: 'rgba(0,242,254,0.25)',  glow: 'rgba(0,242,254,0.15)' },
};

function getCategoryStyle(category: string) {
  const key = category?.toLowerCase() ?? 'default';
  return CATEGORY_COLORS[key] ?? CATEGORY_COLORS['default'];
}

function cifToFasta(cifText: string): string {
  // mmCIF sequence extraction: seeks _entity_poly.pdbx_seq_one_letter_code
  // Standard format uses ; to enclose multi-line sequences
  const match = cifText.match(/_entity_poly\.pdbx_seq_one_letter_code\s+[\s\S]*?\n;\s*([\s\S]*?)\n;/i);
  if (match && match[1]) {
    const seq = match[1].replace(/\s+/g, '');
    return '>Extracted_from_CIF\n' + seq;
  }
  // Try simpler one-line format if semicolon block not found
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
  const [loadingProtein, setLoadingProtein] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [limitModal, setLimitModal] = useState<LimitInfo | null>(null);
  const [originalPdb, setOriginalPdb] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (location.state && location.state.fastaToLoad) {
      setFasta(location.state.fastaToLoad);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const handleProteinSelect = async (proteinId: string) => {
    setSelectedProtein(proteinId);
    if (!proteinId) { setFasta(''); return; }
    setLoadingProtein(proteinId);
    try {
      const details = await api.getProteinDetails(proteinId);
      if (details.fasta_ready) setFasta(details.fasta_ready);
    } catch (err) {
      console.error("Error fetching protein details", err);
      setErrorModal("No se pudo cargar la secuencia de la proteína catalogada. Verifica tu conexión con la base de datos.");
    } finally {
      setLoadingProtein(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fasta) return;
    setLoading(true);

    try {
      if (user?.id) {
        const countRes = await api.getSavedProteinCount(user.id);
        if (countRes.count >= countRes.limit) {
          setLimitModal({ count: countRes.count, limit: countRes.limit, isPremium: countRes.isPremium });
          setLoading(false);
          return;
        }
      }

      const res = await api.submitJob(fasta, 'sequence.fasta', user?.id);
      if (res && res.job_id) {
        if (originalPdb) sessionStorage.setItem(`pdb_cache_${res.job_id}`, originalPdb);
        navigate(`/jobs/${res.job_id}`);
      }
    } catch (err) {
      setErrorModal("Hubo un error al enviar la petición al CESGA. La petición podría ser errónea o el servicio backend podría no estar disponible.");
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          let text = event.target.result;
          const fileNameInput = file.name.toLowerCase();
          
          if (fileNameInput.endsWith('.pdb') || text.startsWith('HEADER') || text.startsWith('ATOM  ')) {
            setOriginalPdb(text);
            text = pdbToFasta(text);
          } else if (fileNameInput.endsWith('.cif') || text.startsWith('data_')) {
            setOriginalPdb(text);
            text = cifToFasta(text);
          } else { 
            setOriginalPdb(''); 
          }
          setFasta(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Agrupamos proteínas por categoría
  const groupedProteins = proteins.reduce<Record<string, PredefinedProtein[]>>((acc, p) => {
    const cat = p.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const filteredGroups = Object.entries(groupedProteins).reduce<Record<string, PredefinedProtein[]>>((acc, [cat, ps]) => {
    // 1. Filtrar por categoría (tipo de proteína) si hay una seleccionada
    if (selectedCategoryFilter !== 'all' && cat !== selectedCategoryFilter) {
      return acc;
    }

    // 2. Filtrar por texto de búsqueda
    const filtered = ps.filter(p =>
      !sidebarSearch ||
      p.protein_name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      cat.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {});

  return (
    <>
      <style>{`
        @keyframes protein-card-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .protein-card {
          animation: protein-card-in 0.3s ease forwards;
          cursor: pointer;
          border-radius: 10px;
          padding: 10px 12px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .protein-card:hover {
          transform: translateX(3px);
        }
        .protein-card.selected {
          transform: translateX(3px);
        }
        .sidebar-search {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #f8f8f2;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
          font-family: var(--font-family);
        }
        .sidebar-search:focus {
          border-color: var(--accent-cyan);
        }
        .sidebar-section-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 4px 4px 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* ─── SIDEBAR IZQUIERDO ─────────────────────────────────── */}
        <div style={{
          width: '280px',
          flexShrink: 0,
          position: 'sticky',
          top: '1rem',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
          backdropFilter: 'var(--glass-backdrop)',
          WebkitBackdropFilter: 'var(--glass-backdrop)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 120px)',
        }}>
          {/* Cabecera del sidebar */}
          <div style={{
            padding: '18px 18px 14px',
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(0,242,254,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '32px', height: '32px',
                background: 'linear-gradient(135deg, rgba(0,242,254,0.2), rgba(79,172,254,0.2))',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(0,242,254,0.3)',
              }}>
                <Dna size={16} color="#00f2fe" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Catálogo</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Proteínas predefinidas</div>
              </div>
            </div>
            <input
              className="sidebar-search"
              placeholder="Buscar proteína..."
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              style={{ marginBottom: '8px' }}
            />
            <div style={{ position: 'relative' }}>
              <select
                className="sidebar-search"
                style={{ cursor: 'pointer', appearance: 'none', paddingRight: '28px', color: selectedCategoryFilter === 'all' ? 'var(--text-secondary)' : '#f8f8f2' }}
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
              >
                <option value="all">Todas las categorías</option>
                {Object.keys(groupedProteins).sort().map(cat => (
                  <option key={cat} value={cat} style={{ color: '#0f172a' }}>{cat}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
                <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
              </div>
            </div>
          </div>

          {/* Lista de proteínas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {proteins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.82rem' }}>Cargando catálogo...</span>
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Sin resultados para "{sidebarSearch}"
              </div>
            ) : (
              Object.entries(filteredGroups).map(([category, catProteins], gi) => {
                const style = getCategoryStyle(category);
                return (
                  <div key={category}>
                    <div className="sidebar-section-label" style={{ color: style.text }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: style.text, flexShrink: 0 }} />
                      {category}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {catProteins.map((p, i) => {
                        const isSelected = selectedProtein === p.protein_id;
                        const isLoading = loadingProtein === p.protein_id;
                        return (
                          <div
                            key={p.protein_id}
                            className={`protein-card${isSelected ? ' selected' : ''}`}
                            style={{
                              animationDelay: `${(gi * 5 + i) * 40}ms`,
                              background: isSelected ? style.bg : 'transparent',
                              borderColor: isSelected ? style.border : 'transparent',
                              boxShadow: isSelected ? `0 0 12px ${style.glow}` : 'none',
                            }}
                            onClick={() => handleProteinSelect(isSelected ? '' : p.protein_id)}
                            onMouseEnter={e => {
                              if (!isSelected) {
                                (e.currentTarget as HTMLElement).style.background = style.bg;
                                (e.currentTarget as HTMLElement).style.borderColor = style.border;
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                              }
                            }}
                          >
                            <span style={{ fontSize: '0.83rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400, lineHeight: '1.3', flex: 1 }}>
                              {p.protein_name}
                            </span>
                            {isLoading
                              ? <Loader2 size={14} className="animate-spin" style={{ color: style.text, flexShrink: 0 }} />
                              : isSelected
                                ? <Sparkles size={14} style={{ color: style.text, flexShrink: 0 }} />
                                : <ChevronRight size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0, opacity: 0.5 }} />
                            }
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pie del sidebar */}
          {selectedProtein && (
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--glass-border)',
              background: 'rgba(0,242,254,0.04)',
            }}>
              <button
                type="button"
                onClick={() => { setFasta(''); setSelectedProtein(''); setOriginalPdb(''); }}
                style={{
                  width: '100%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5', borderRadius: '8px', padding: '7px', fontSize: '0.8rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
              >
                <X size={14} /> Limpiar selección
              </button>
            </div>
          )}
        </div>

        {/* ─── PANEL PRINCIPAL DERECHO ───────────────────────────── */}
        <div className="glass-panel animate-fade-in" style={{ flex: 1, minWidth: 0 }}>
          <h1 className="gradient-text" style={{ fontSize: '2.3rem', marginBottom: '0.75rem' }}>
            Inicia tu Predicción 3D
          </h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.7', maxWidth: '520px', fontSize: '0.95rem' }}>
              Introduce tu secuencia proteica en formato FASTA o selecciona una del catálogo lateral.
              Nuestro pipeline procesará tu solicitud usando la potencia del supercomputador CESGA simulado.
            </p>
            <BiologistGuide />
          </div>

          {/* Indicador de proteína seleccionada desde el sidebar */}
          {selectedProtein && proteins.length > 0 && (() => {
            const p = proteins.find(x => x.protein_id === selectedProtein);
            if (!p) return null;
            const style = getCategoryStyle(p.category);
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', borderRadius: '10px', marginBottom: '1.25rem',
                background: style.bg, border: `1px solid ${style.border}`,
              }}>
                <Dna size={16} style={{ color: style.text, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>{p.protein_name}</span>
                <span style={{ fontSize: '0.75rem', color: style.text, background: `${style.bg}`, border: `1px solid ${style.border}`, borderRadius: '20px', padding: '2px 8px', marginLeft: 'auto' }}>{p.category}</span>
              </div>
            );
          })()}

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
              <FileText size={20} style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--text-secondary)', zIndex: 1 }} />
              <textarea
                className="input-styled"
                style={{
                  minHeight: '260px',
                  paddingLeft: '48px',
                  backgroundColor: isDragging ? 'transparent' : 'var(--bg-card)',
                  lineHeight: '1.6',
                }}
                placeholder="Pegar secuencia FASTA aquí o arrastrar un archivo (.fasta, .pdb, .cif)...
Ej: >sp|P0CG47|UBB_HUMAN Ubiquitin
MQIFVKTLTGKTITLEVEPSDTIENVKAKIQ..."
                value={fasta}
                onChange={(e) => setFasta(e.target.value)}
              />
              {isDragging && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none', color: 'var(--accent-cyan)', fontWeight: 'bold',
                  fontSize: '1.2rem', background: 'rgba(10,10,15,0.7)', borderRadius: '12px', zIndex: 10
                }}>
                  Suelta el archivo aquí
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} />
                <span>Tiempo estimado en cola: ~5s</span>
              </div>
              <button type="submit" className="btn-primary" disabled={loading || !fasta.trim()}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Loader2 size={18} className="animate-spin" /> Enviando...</span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Send size={18} /> Enviar Tarea</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>

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
                  <h2 style={{ margin: 0, color: '#fbbf24', fontSize: '1.1rem' }}>Límite de Espacio Alcanzado</h2>
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
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Proteínas en tu espacio</span>
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
                Para poder enviar una nueva simulación al supercomputador, necesitas tener espacio libre en tu área de trabajo. Tienes el límite de <strong style={{ color: '#fbbf24' }}>{limitModal.limit} proteínas</strong> según tu plan{' '}
                <strong>{limitModal.isPremium ? 'Premium' : 'Free'}</strong>.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setLimitModal(null); navigate('/saved'); }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(249,115,22,0.2))',
                    border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24',
                    transition: 'all 0.2s',
                  }}
                >
                  <Trash2 size={16} /> Liberar Espacio
                </button>
                <button onClick={() => setLimitModal(null)}
                  style={{
                    padding: '10px 18px', borderRadius: '10px', fontWeight: 500, fontSize: '0.9rem',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error */}
      {errorModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '1rem', zIndex: 9999
        }}>
          <div className="animate-fade-in" style={{
            backgroundColor: '#0f172a', maxWidth: '500px', width: '100%',
            borderRadius: '12px', border: '1px solid #ef4444',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(239,68,68,0.2)'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', backgroundColor: '#0f172a',
              borderBottom: '1px solid #334155', zIndex: 10
            }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#ef4444', fontSize: '1.2rem' }}>
                <AlertTriangle size={24} /> Acción Interrumpida
              </h2>
              <button type="button" onClick={() => setErrorModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', color: '#e2e8f0', lineHeight: '1.6', fontSize: '1rem', background: 'linear-gradient(145deg, rgba(30,30,50,0.4), rgba(15,15,25,0.4))' }}>
              {errorModal}
            </div>
            <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1e293b', background: '#0f172a' }}>
              <button type="button"
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => setErrorModal(null)}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#dc2626'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = '#ef4444'}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
