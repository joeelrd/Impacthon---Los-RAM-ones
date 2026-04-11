import React, { useEffect, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';

interface Props {
  pdbData: string;
}

export default function MoleculeViewer({ pdbData }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (!viewerRef.current || !pdbData || !(window as any).PDBeMolstarPlugin) return;

    let isMounted = true;
    let currentObjectUrl: string | null = null;

    const renderMolstar = async () => {
      // Clean up simulated PDB syntax issues from the mock API
      let cleanedPdbData = pdbData;
      const isSimulated = cleanedPdbData.includes("SIMULATED ALPHAFOLD STRUCTURE") || cleanedPdbData.includes("SIMULATED ALPHAFOLD2 STRUCTURE");
      
      if (isSimulated) {
          cleanedPdbData = cleanedPdbData.split('\n')
              .filter(line => !line.includes('X       Y       Z     CONF') && line.trim().length > 0)
              .join('\n');
      }

      // Detect format: PDB vs mmCIF (data_ is the standard start of a CIF file)
      const isCIF = cleanedPdbData.trim().startsWith('data_');
      const format = isCIF ? 'mmcif' : 'pdb';

      // Create object URL from string content
      const blob = new Blob([cleanedPdbData], { type: 'text/plain' });
      currentObjectUrl = URL.createObjectURL(blob);

      const options = {
        customData: {
          url: currentObjectUrl,
          format: format
        },
        alphafoldView: !isSimulated, // Disable alphafoldView for fake structures so spacefill works properly
        bgColor: { r: 10, g: 10, b: 15 }, // #0a0a0f backgroundColor match
        hideControls: true,
        // Ocultamos el 'expand' nativo de Molstar para usar el nuestro de HTML5
        hideCanvasControls: ['expand', 'selection', 'animation', 'controlToggle', 'controlInfo'],
        lighting: 'plastic',
        visualStyle: isSimulated ? 'spacefill' : 'cartoon'
      };

      if (!viewerInstance.current) {
        viewerInstance.current = new (window as any).PDBeMolstarPlugin();
      }
      
      try {
        if (isMounted && viewerRef.current) {
          await viewerInstance.current.render(viewerRef.current, options);
        }
      } catch (e) {
        console.warn("Molstar render cancelled or failed:", e);
      }
    };

    renderMolstar();

    // Observador de redimensionamiento
    let resizeObserver: ResizeObserver | null = null;
    if (viewerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (viewerInstance.current && viewerInstance.current.plugin) {
           window.dispatchEvent(new Event('resize'));
        }
      });
      resizeObserver.observe(viewerRef.current);
    }

    // Clean up
    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (viewerInstance.current) {
        try {
          if (viewerInstance.current.plugin) viewerInstance.current.plugin.clear();
        } catch (e) {}
        viewerInstance.current = null;
      }
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
      }
      setTimeout(() => {
        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      }, 1000);
    };
  }, [pdbData]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#0a0a0f'
      }}
    >
      {/* Container for PDBe Molstar */}
      <div 
        ref={viewerRef} 
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} 
      />

      {/* Botón Fullscreen customizado (API HTML5) */}
      <button 
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 20,
          background: 'rgba(20,20,30,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: '#fff',
          padding: '8px',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        title="Pantalla Completa Real"
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,172,254,0.3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(20,20,30,0.8)'}
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
      
      {/* Legend overlay */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        backgroundColor: 'rgba(20, 20, 30, 0.8)',
        backdropFilter: 'blur(4px)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 10,
        pointerEvents: 'none',
        fontSize: '0.85rem'
      }}>
        <strong style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>pLDDT Confianza:</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#0053d6', borderRadius: '2px' }}></span>
          <span>&gt; 90 (Muy Alta)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#65cbf3', borderRadius: '2px' }}></span>
          <span>70 - 90 (Alta)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#ffe082', borderRadius: '2px' }}></span>
          <span>50 - 70 (Baja)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#ff7d45', borderRadius: '2px' }}></span>
          <span>&lt; 50 (Muy Baja)</span>
        </div>
      </div>
    </div>
  );
}
