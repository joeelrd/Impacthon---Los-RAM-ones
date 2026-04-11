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
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', display: 'flex', overflow: 'hidden', margin: '0 calc(-50vw + 50%)' }}>
      <style>
        {`
          @keyframes spinADN {
            from { transform: translate(-50%, -50%) rotate(0deg) scale(1.1); }
            to { transform: translate(-50%, -50%) rotate(360deg) scale(1.1); }
          }
        `}
      </style>
      
      {/* Contenedor de fondo */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#050a11' }}>
        <img 
          src="/adn_bg.png" 
          alt="Fondo ADN" 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '150vmax',
            height: '150vmax',
            opacity: 0.35,
            objectFit: 'cover',
            animation: 'spinADN 180s linear infinite'
          }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to right, rgba(5, 10, 17, 0.95) 0%, rgba(5, 10, 17, 0.4) 100%)' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '5rem', maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem', flexWrap: 'wrap', position: 'relative' }}>
        
        {/* Columna Izquierda: Información y Bienvenida */}
        <div style={{ 
          flex: '1 1 400px', 
          maxWidth: '550px', 
          color: 'white',
          opacity: mounted ? 1 : 0, 
          transform: mounted ? 'translateX(0)' : 'translateX(-30px)', 
          transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}>
          <h1 style={{ fontSize: '3.6rem', fontWeight: 800, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1.15' }}>
            Bienvenido a LocalFold
          </h1>
          <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            La plataforma definitiva para la predicción de estructuras de proteínas y el análisis biomédico in-silico.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.7' }}>
            Nuestra misión es empoderar a científicos e investigadores con herramientas avanzadas de inteligencia artificial. Acelera tus descubrimientos, prevé comportamientos moleculares con alta precisión y lleva tu laboratorio al siguiente nivel.
          </p>
        </div>

      {/* Columna Derecha: Formulario de Autenticación Exactamente Igual */}
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
          <Link to="/" className="app-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '1rem' }}>
            <Activity color="#00f2fe" size={28} />
            <span className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>LocalFold</span>
          </Link>
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
            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Nombre de usuario / Correo electrónico</label>
            <input 
              autoComplete="off"
              type="text" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={{ width: '100%', padding: '14px 16px', fontSize: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} 
              placeholder="usuario o correo electrónico"
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
    </div>
  );
}
