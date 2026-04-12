import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Activity, LogOut, Sun, Moon } from 'lucide-react';
import JobSubmit from './pages/JobSubmit';
import JobResults from './pages/JobResults';
import SavedCells from './pages/SavedCells';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const [theme, setTheme] = React.useState(() => localStorage.getItem('biomolecule_inc_theme') || 'dark');

  React.useEffect(() => {
    localStorage.setItem('biomolecule_inc_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  return (
    <div className="layout-container">
      <header className="app-header glass-panel">
        <Link to="/" className="app-logo">
          <Activity color="#00f2fe" size={28} />
          <span className="gradient-text">BioMolecule Inc</span>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="btn-secondary" style={{ marginRight: '1rem', padding: '8px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {isAuthenticated && (
            <>
              <span style={{ color: 'var(--text-secondary)', marginRight: '1rem', fontSize: '0.9rem' }}>
                Hola, {user?.name.split(' ')[0]}
              </span>
              <Link to="/saved" className="btn-secondary" style={{ marginRight: '1rem', border: 'none' }}>
                Mis Moléculas
              </Link>
              <Link to="/" className="btn-secondary" style={{ marginRight: '1rem', border: 'none' }}>
                Nueva Consulta
              </Link>
              <button onClick={logout} className="btn-secondary" style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={16} /> Salir
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="animate-fade-in">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><MainLayout><JobSubmit /></MainLayout></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute><MainLayout><SavedCells /></MainLayout></ProtectedRoute>} />
          <Route path="/jobs/:jobId" element={<ProtectedRoute><MainLayout><JobResults /></MainLayout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
