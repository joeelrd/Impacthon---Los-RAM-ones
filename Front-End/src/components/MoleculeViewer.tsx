import React, { useEffect, useRef } from 'react';

interface Props {
  pdbData: string;
}

export default function MoleculeViewer({ pdbData }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewerRef.current || !pdbData || !(window as any).$3Dmol) return;
    
    viewerRef.current.innerHTML = '';
    
    // Create viewer
    const viewer = (window as any).$3Dmol.createViewer(viewerRef.current, {
      backgroundColor: '#0a0a0f' // Match background
    });

    // Add model
    viewer.addModel(pdbData, 'pdb');

    // Default style: cartoon colored by spectrum (pLDDT is usually stored in b-factor column by AlphaFold)
    viewer.setStyle({}, { cartoon: { color: 'spectrum' } });

    // Zoom and render
    viewer.zoomTo();
    viewer.render();
    
    // Clean up
    return () => {
      viewerRef.current?.replaceChildren();
    };
  }, [pdbData]);

  return (
    <div
      ref={viewerRef}
      style={{
        width: '100%',
        height: '400px',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  );
}
