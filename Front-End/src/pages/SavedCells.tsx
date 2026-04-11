import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Clock, FileText, Activity, ShieldCheck, AlertTriangle, Bookmark, Trash2, Database, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface JobEntity {
  id: string;
  status: string;
  fastaFilename: string;
  createdAt: string;
}

interface SavedProtein {
  id: number;
  proteinName: string;
  jobId: string | null;
  savedAt: string;
}

const getStatusLabel = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'PENDIENTE';
    case 'RUNNING': return 'EN EJECUCIÓN';
    case 'COMPLETED': return 'COMPLETADO';
    case 'FAILED': return 'FALLIDO';
    default: return status;
  }
};

export default function SavedCells() {
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  
  const [jobs, setJobs] = useState<JobEntity[]>([]);
  const [savedProteins, setSavedProteins] = useState<SavedProtein[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      
      // Fetch independently so one failure doesn't block the other
      const [jobsResult, proteinsResult] = await Promise.allSettled([
        api.getJobHistory(user.id),
        api.getSavedProteins(user.id)
      ]);
      
      if (jobsResult.status === 'fulfilled') {
        setJobs((jobsResult.value || []).slice(0, 10));
      } else {
        console.warn("No se pudo cargar el historial de jobs:", jobsResult.reason);
      }
      
      if (proteinsResult.status === 'fulfilled') {
        setSavedProteins(proteinsResult.value || []);
      } else {
        console.warn("No se pudieron cargar las proteínas guardadas:", proteinsResult.reason);
        setError("No se pudieron cargar las proteínas guardadas.");
      }
      
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const handleDeleteSaved = async (id: number) => {
    if (!user?.id) return;
    setDeletingId(id);
    try {
      await api.deleteSavedProtein(id, user.id);
      setSavedProteins(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Error al eliminar", err);
      // Podría mostrarse un toast/error temporal aquí si quisieras
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED': return <ShieldCheck size={18} color="#10b981" />;
      case 'FAILED': return <AlertTriangle size={18} color="#ef4444" />;
      case 'RUNNING':
      case 'PENDING': return <Activity size={18} color="#65cbf3" style={{ animation: 'spin 2s linear infinite' }} />;
      default: return <Clock size={18} color="#94a3b8" />;
    }
  };

  const getStatusBadgeClass = (status: string) => `badge status-${status.toLowerCase()}`;

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .tab-btn {
          padding: 12px 24px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab-btn:hover { color: var(--text-primary); }
        .tab-btn.active {
          color: var(--accent-cyan);
          border-bottom: 3px solid var(--accent-cyan);
        }
        .item-card {
          display: grid;
          align-items: center;
          gap: 1.5rem;
          background: var(--bg-card);
          padding: 1.25rem 1.5rem;
          borderRadius: 12px;
          border: 1px solid var(--border-color);
          text-decoration: none;
          transition: all 0.2s;
        }
        .item-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-cyan);
          box-shadow: 0 6px 12px rgba(0,0,0,0.3);
        }
      `}</style>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={24} />
          </Link>
          <h1 className="gradient-text" style={{ fontSize: '2.2rem', margin: 0 }}>Mis Moléculas</h1>
        </div>
      </div>
      
      {/* ── TABS ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', gap: '1rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Activity size={18} /> Historial de Tareas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          <Bookmark size={18} /> Proteínas Guardadas
          {savedProteins.length > 0 && (
            <span style={{ background: 'var(--accent-cyan)', color: '#000', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '4px' }}>
              {savedProteins.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Activity size={48} className="gradient-text" style={{ animation: 'spin 2s linear infinite' }} />
          <h3 style={{ marginTop: '1.5rem', color: 'var(--accent-cyan)' }}>Cargando datos...</h3>
        </div>
      ) : error ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '1.5rem', color: '#fca5a5', textAlign: 'center' }}>
          {error}
        </div>
      ) : activeTab === 'history' ? (
        // ── PESTAÑA: HISTORIAL ──
        jobs.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed #334155' }}>
            <FileText size={48} opacity={0.3} style={{ marginBottom: '1rem' }} />
            <h3>Aún no tienes moléculas procesadas</h3>
            <p>Tus análisis aparecerán aquí una vez que envíes tu primer trabajo.</p>
            <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none' }}>Nueva Consulta</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Mostrando las últimas 10 secuencias procesadas en el supercomputador CESGA.</p>
            {jobs.map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="item-card" style={{ gridTemplateColumns: 'minmax(150px, 1fr) 2fr auto auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID de Tarea</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontFamily: 'monospace' }}>{job.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} color="var(--accent-cyan)" />
                  <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.fastaFilename || 'sequence.fasta'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(job.createdAt).toLocaleDateString()}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={getStatusBadgeClass(job.status)} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '130px', justifyContent: 'center' }}>
                  {getStatusIcon(job.status)} {getStatusLabel(job.status)}
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        // ── PESTAÑA: PROTEÍNAS GUARDADAS ──
        savedProteins.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed #334155' }}>
            <Database size={48} opacity={0.3} style={{ marginBottom: '1rem' }} />
            <h3>No tienes proteínas guardadas</h3>
            <p>Guarda resultados exitosos desde la vista de resultados para tenerlos siempre accesibles.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Estas proteínas ocupan espacio en tu límite de almacenamiento.</p>
              <div style={{ fontSize: '0.85rem', color: 'rgba(251,191,36,0.9)', background: 'rgba(251,191,36,0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.2)' }}>
                {savedProteins.length} guardadas
              </div>
            </div>
            
            {savedProteins.map((protein) => (
              <div key={protein.id} className="item-card" style={{ gridTemplateColumns: '1fr auto auto auto', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0,242,254,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,242,254,0.3)' }}>
                    <Bookmark size={18} color="#00f2fe" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{protein.proteinName}</span>
                    {protein.jobId && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>Origen: {protein.jobId}</span>}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', paddingRight: '20px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Guardado el</span>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{new Date(protein.savedAt).toLocaleDateString()}</span>
                </div>
                
                {protein.jobId && (
                   <button onClick={() => navigate(`/jobs/${protein.jobId}`)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     Ver Tarea
                   </button>
                )}
                
                <button 
                  onClick={() => handleDeleteSaved(protein.id)} 
                  disabled={deletingId === protein.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', 
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px', color: '#fca5a5', cursor: (deletingId === protein.id) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { if (deletingId !== protein.id) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)' }}
                  onMouseLeave={e => { if (deletingId !== protein.id) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)' }}
                  title="Eliminar y liberar espacio"
                >
                  {deletingId === protein.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} 
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
