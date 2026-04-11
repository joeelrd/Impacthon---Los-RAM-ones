import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Clock, FileText, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface JobEntity {
  id: string;
  status: string;
  fastaFilename: string;
  createdAt: string; // ISO format from backend
}

export default function SavedCells() {
  const [jobs, setJobs] = useState<JobEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchJobs() {
      if (!user?.id) return;
      try {
        const data = await api.getJobHistory(user.id);
        // Solo mostrar las últimas 10 según requerimiento
        setJobs((data || []).slice(0, 10));
      } catch (err) {
        console.error("Error al obtener el historial", err);
        setError("No se pudo cargar el historial de células.");
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED': return <ShieldCheck size={18} color="#10b981" />;
      case 'FAILED': return <AlertTriangle size={18} color="#ef4444" />;
      case 'RUNNING':
      case 'PENDING': return <Activity size={18} color="#65cbf3" style={{ animation: 'spin 2s linear infinite' }} />;
      default: return <Clock size={18} color="#94a3b8" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    return `badge status-${status.toLowerCase()}`;
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h1 className="gradient-text" style={{ fontSize: '2.2rem', margin: 0 }}>
          Mis Células
        </h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Historial de las últimas 10 secuencias y simulaciones procesadas en el supercomputador CESGA.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Activity size={48} className="gradient-text" style={{ animation: 'spin 2s linear infinite' }} />
          <h3 style={{ marginTop: '1.5rem', color: 'var(--accent-cyan)' }}>Cargando historial...</h3>
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '1.5rem',
          color: '#fca5a5',
          textAlign: 'center'
        }}>
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '12px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          border: '1px dashed #334155'
        }}>
          <FileText size={48} opacity={0.3} style={{ marginBottom: '1rem' }} />
          <h3>Aún no tienes células procesadas</h3>
          <p>Tus simulaciones aparecerán aquí una vez que envíes tu primer trabajo.</p>
          <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none' }}>
            Nueva Consulta
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {jobs.map((job) => (
            <Link 
              key={job.id} 
              to={`/jobs/${job.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(150px, 1fr) 2fr auto auto',
                alignItems: 'center',
                gap: '1.5rem',
                background: 'var(--bg-card)',
                padding: '1.25rem 1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job ID</span>
                <span style={{ color: '#fff', fontWeight: '500', fontFamily: 'monospace' }}>{job.id}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={16} color="var(--accent-cyan)" />
                <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.fastaFilename || 'sequence.fasta'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {new Date(job.createdAt).toLocaleDateString()}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className={getStatusBadgeClass(job.status)} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '130px', justifyContent: 'center' }}>
                {getStatusIcon(job.status)}
                {job.status}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
