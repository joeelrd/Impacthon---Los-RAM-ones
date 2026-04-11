import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Activity, LogOut } from 'lucide-react';
import JobSubmit from './pages/JobSubmit';
import JobResults from './pages/JobResults';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  return (
    <>
      <header className="app-header glass-panel">
        <Link to="/" className="app-logo">
          <Activity color="#00f2fe" size={28} />
          <span className="gradient-text">LocalFold</span>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center' }}>
          {isAuthenticated && (
            <>
              <span style={{ color: 'var(--text-secondary)', marginRight: '1rem', fontSize: '0.9rem' }}>
                Hola, {user?.name.split(' ')[0]}
              </span>
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
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="layout-container">
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><MainLayout><JobSubmit /></MainLayout></ProtectedRoute>} />
            <Route path="/jobs/:jobId" element={<ProtectedRoute><MainLayout><JobResults /></MainLayout></ProtectedRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
