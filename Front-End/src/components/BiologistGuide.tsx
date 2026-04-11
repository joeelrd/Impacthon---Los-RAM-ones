import { useState } from 'react';
import { BookOpen, X, HelpCircle } from 'lucide-react';

export default function BiologistGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(101, 203, 243, 0.1)',
          color: 'var(--accent-cyan)',
          border: '1px solid var(--accent-cyan)',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          fontSize: '0.9rem'
        }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(101, 203, 243, 0.2)'}
        onMouseOut={e => e.currentTarget.style.background = 'rgba(101, 203, 243, 0.1)'}
      >
        <BookOpen size={18} /> Guía rápida
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)', // Fondo oscuro para tapar lo de atrás
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center', // ESTO LO CENTRA PERFECTAMENTE EN LA PANTALLA
          padding: '1rem',
          zIndex: 9999
        }}>
          {/* CONTENEDOR PRINCIPAL DEL MODAL */}
          <div className="animate-fade-in" style={{
            backgroundColor: '#0f172a', // COLOR SÓLIDO OBLIGATORIO (Gris muy oscuro)
            maxWidth: '650px',
            width: '100%',
            borderRadius: '12px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column', // Divide en Header arriba, contenido abajo
            maxHeight: '85vh', // Altura máxima
            overflow: 'hidden' // Oculta el scroll principal, lo movemos al contenido
          }}>

            {/* ENCABEZADO FIJO (No hace scroll) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              backgroundColor: '#0f172a', // Mismo color sólido
              borderBottom: '1px solid #334155',
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)', // Sombra para separar
              zIndex: 10
            }}>
              <h2 style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0,
                color: 'var(--accent-cyan)',
                fontSize: '1.25rem'
              }}>
                <HelpCircle size={24} /> Guía rápida
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                onMouseOver={e => e.currentTarget.style.color = '#fff'}
                onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENIDO CON SCROLL INTERNO */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto', // EL SCROLL OCURRE SOLO AQUÍ ADENTRO
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              color: '#e2e8f0',
              lineHeight: '1.6'
            }}>
              <div>
                <h3 style={{ color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <span style={{ color: 'var(--accent-cyan)' }}>1.</span> ¿Qué es el FASTA?
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  Es el formato de texto estándar para representar secuencias de nucleótidos o péptidos (aminoácidos) usando letras. Un archivo FASTA siempre empieza con una línea iniciada por "<code>&gt;</code>" seguida de la descripción, y en la siguiente línea va la secuencia de letras (ej: <code>MVLTI...</code>).
                </p>
              </div>

              <div>
                <h3 style={{ color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <span style={{ color: 'var(--accent-cyan)' }}>2.</span> Entendiendo el pLDDT
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                  El <strong>pLDDT</strong> (<i>predicted Local Distance Difference Test</i>) es una métrica de "confianza" de la Inteligencia Artificial al predecir cada aminoácido de tu proteína (de 0 a 100):
                </p>
                <ul style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.95rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', listStyleType: 'none' }}>
                  <li><strong style={{ color: '#60a5fa' }}>&gt; 90 (Azul):</strong> Precisión altísima, calidad cristalográfica.</li>
                  <li><strong style={{ color: '#38bdf8' }}>70 - 90 (Celeste):</strong> Buena predicción del esqueleto.</li>
                  <li><strong style={{ color: '#fde047' }}>50 - 70 (Amarillo):</strong> Baja confianza, posible zona desordenada.</li>
                  <li><strong style={{ color: '#fb923c' }}>&lt; 50 (Naranja):</strong> Región intrínsecamente desordenada o sin una estructura 3D fija.</li>
                </ul>
              </div>


              <div style={{ padding: '1rem', background: 'rgba(101, 203, 243, 0.05)', borderRadius: '8px', borderLeft: '4px solid var(--accent-cyan)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
                  <strong style={{ color: '#e2e8f0' }}>Consejo Biológico:</strong> No te alarmes si los extremos iniciales o finales (N/C terminal) son naranjas o amarillos. Es natural que "bailen" en el espacio real (son colgajos desordenados). Céntrate en que tu dominio de interés sea azul o celeste.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}