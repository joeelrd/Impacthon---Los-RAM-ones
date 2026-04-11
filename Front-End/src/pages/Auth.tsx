import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';
import { api } from '../services/api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isLinkHover, setIsLinkHover] = useState(false);
  
  // Efecto visual suave de entrada
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return; // Evitar peticiones spammadas que causan el parpadeo

    setErrorMsg('');
    setSuccessMsg('');

    // Validación manual de campos vacíos informando activamente
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Debe rellenar su correo y clave obligatoriamente.');
      return;
    }
    if (!isLogin && !name.trim()) {
      setErrorMsg('El nombre de la persona o instituto es obligatorio para el registro.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        login(res);
        setSuccessMsg('¡Sesión iniciada con éxito! Preparando el entorno para ti...');
        setTimeout(() => { navigate('/'); }, 2800); // Dar holgura a la lectura
      } else {
        const res = await api.register({ name, email, password });
        login(res);
        setSuccessMsg('¡Cuenta registrada correctamente! Bienvenid@ a LocalFold.');
        setTimeout(() => { navigate('/'); }, 2800);
      }
    } catch (err: any) {
        setErrorMsg(err.message || 'Error de conexión. Revisa los datos correspondientes.');
        setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div 
        className="glass-panel" 
        style={{ 
          width: '100%', maxWidth: '460px', padding: '3rem 2.8rem', 
          opacity: mounted ? 1 : 0, 
          transform: mounted ? 'translateY(0)' : 'translateY(20px)', 
          transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <Activity color="#00f2fe" size={56} style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'white', marginBottom: '0.6rem' }}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', textAlign: 'center' }}>
            {isLogin ? 'Accede para procesar nuevas estructuras 3D.' : 'Únete a LocalFold y acelera tus descubrimientos in-silico.'}
          </p>
        </div>

        {errorMsg && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', 
            color: '#fca5a5', padding: '16px', borderRadius: '8px', marginBottom: '1.8rem', fontSize: '1rem', textAlign: 'center', fontWeight: 500 
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ 
            backgroundColor: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.5)', 
            color: '#6ee7b7', padding: '16px', borderRadius: '8px', marginBottom: '1.8rem', fontSize: '1rem', textAlign: 'center', fontWeight: 600,
            boxShadow: '0 0 15px rgba(52,211,153, 0.2)'
          }}>
            {successMsg}
          </div>
        )}

        <div onKeyDown={(e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                if (!loading) handleSubmit(); 
            } 
        }} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

          <div style={{ 
            overflow: 'hidden', height: !isLogin ? '85px' : '0', opacity: !isLogin ? 1 : 0, transition: 'all 0.4s ease'
          }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Nombre Completo o Instituto</label>
            <input 
              autoComplete="off"
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              style={{ width: '100%', padding: '14px 16px', fontSize: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} 
              placeholder="Ej. Instituto Biomédico Rosalind"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Correo Electrónico</label>
            <input 
              autoComplete="off"
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={{ width: '100%', padding: '14px 16px', fontSize: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} 
              placeholder="bioclient@instituto.org"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Contraseña de Seguridad</label>
            <input 
              autoComplete="off"
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ width: '100%', padding: '14px 16px', fontSize: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} 
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="button" 
            onClick={() => handleSubmit()}
            disabled={loading} 
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', border: 'none', borderRadius: '8px', padding: '16px', fontSize: '1.2rem', fontWeight: 700, 
              cursor: loading ? 'not-allowed' : 'pointer', 
              marginTop: '1.2rem', 
              opacity: loading ? 0.7 : 1, 
              transform: isHover && !loading ? 'scale(1.03)' : 'scale(1)',
              boxShadow: isHover && !loading ? '0 0 20px rgba(0, 242, 254, 0.5)' : 'none',
              transition: 'all 0.3s ease'
          }}>
            {loading ? 'Procesando...' : (isLogin ? 'Acceder al Portal' : 'Completar Registro')}
          </button>
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.8rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
              {isLogin ? "¿Aún no te has registrado? " : "¿Ya tienes una cuenta vigente? "}
              <button 
                type="button"
                onMouseEnter={() => setIsLinkHover(true)}
                onMouseLeave={() => setIsLinkHover(false)}
                onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ 
                    background: 'none', border: 'none', 
                    color: isLogin ? '#00f2fe' : '#4ade80',
                    cursor: 'pointer', fontWeight: 700, 
                    fontSize: isLinkHover ? '1.1rem' : '1.05rem', 
                    padding: 0,
                    marginLeft: '4px',
                    textDecoration: isLinkHover ? 'underline' : 'none',
                    textUnderlineOffset: '4px',
                    transition: 'all 0.2s ease',
                    textShadow: isLinkHover ? `0 0 8px ${isLogin ? 'rgba(0, 242, 254, 0.6)' : 'rgba(74, 222, 128, 0.6)'}` : 'none'
                }}
              >
                {isLogin ? "Regístrate aquí" : "Inicia Sesión"}
              </button>
            </p>
        </div>
      </div>
    </div>
  );
}
