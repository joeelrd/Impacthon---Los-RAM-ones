import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import JobSubmit from './pages/JobSubmit';
import JobResults from './pages/JobResults';

function App() {
  return (
    <BrowserRouter>
      <div className="layout-container">
        <header className="app-header glass-panel">
          <Link to="/" className="app-logo">
            <Activity color="#00f2fe" size={28} />
            <span className="gradient-text">LocalFold</span>
          </Link>
          <nav>
            <Link to="/" className="btn-secondary" style={{ marginRight: '1rem', border: 'none' }}>
              Nueva Consulta
            </Link>
          </nav>
        </header>

        <main className="animate-fade-in">
          <Routes>
            <Route path="/" element={<JobSubmit />} />
            <Route path="/jobs/:jobId" element={<JobResults />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
