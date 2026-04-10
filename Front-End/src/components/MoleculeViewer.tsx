import React, { useEffect, useRef } from 'react';

interface Props {
  pdbData: string;
}

export default function MoleculeViewer({ pdbData }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);

  const viewerInstance = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current || !pdbData || !(window as any).$3Dmol) return;
    
    if (!viewerInstance.current) {
        viewerRef.current.innerHTML = '';
        viewerInstance.current = (window as any).$3Dmol.createViewer(viewerRef.current, {
          backgroundColor: '#0a0a0f'
        });
    }
    
    const viewer = viewerInstance.current;
    viewer.clear();

    // Add model
    viewer.addModel(pdbData, 'pdb');

    // AlphaFold pLDDT color scheme stored in B-factor
    const colorfunc = (atom: any) => {
      if (atom.b > 90) return '#0053d6'; // Very High (Blue)
      if (atom.b > 70) return '#65cbf3'; // High (Light Blue)
      if (atom.b > 50) return '#ffe082'; // Low (Yellow)
      return '#ff7d45'; // Very Low (Orange/Red)
    };

    // Apply cartoon style, but also a stick fallback so it NEVER disappears if cartoon fails
    viewer.setStyle({}, { 
      cartoon: { colorfunc: colorfunc },
      stick: { radius: 0.15, colorfunc: colorfunc }
    });

    // Zoom and render
    viewer.zoomTo();
    viewer.render();
    
    // Add smooth continuous rotation (Requirement)
    viewer.spin("y", 0.3);
    
    // Cleanup is handled by clear() on next render, no need to destroy WebGL contexts
  }, [pdbData]);

  return (
    <div
      ref={viewerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
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
