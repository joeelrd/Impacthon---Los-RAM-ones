import React, { useEffect, useRef } from 'react';

interface Props {
  pdbData: string;
}

export default function MoleculeViewer({ pdbData }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current || !pdbData || !(window as any).PDBeMolstarPlugin) return;

    let isMounted = true;

    const renderMolstar = async () => {
      // Clean up simulated PDB syntax issues from the mock API
      let cleanedPdbData = pdbData;
      const isSimulated = cleanedPdbData.includes("SIMULATED ALPHAFOLD STRUCTURE");
      
      if (isSimulated) {
          cleanedPdbData = cleanedPdbData.split('\n')
              .filter(line => !line.includes('X       Y       Z     CONF') && line.trim().length > 0)
              .join('\n');
      }

      // Create object URL from string
      const blob = new Blob([cleanedPdbData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const options = {
        customData: {
          url: url,
          format: 'pdb'
        },
        alphafoldView: true,
        bgColor: { r: 10, g: 10, b: 15 }, // #0a0a0f backgroundColor match
        hideControls: true,
        hideCanvasControls: ['selection', 'animation', 'controlToggle', 'controlInfo'],
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

    // Clean up
    return () => {
      isMounted = false;
      if (viewerInstance.current) {
        try {
          if (viewerInstance.current.plugin) viewerInstance.current.plugin.clear();
        } catch (e) {}
        viewerInstance.current = null;
      }
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
      }
    };
  }, [pdbData]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* Container for PDBe Molstar */}
      <div 
        ref={viewerRef} 
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} 
      />
      
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
