import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PAEMatrixProps {
  matrix: any; // Can be number[][] or number[] flat
  size?: number;
}

export default function PAEMatrix({ matrix, size = 400 }: PAEMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; val: number; i: number; j: number } | null>(null);

  // Robust dimensions detection
  const getMatrixConfig = useCallback(() => {
    if (!matrix || !Array.isArray(matrix) || matrix.length === 0) return null;
    
    const is2D = Array.isArray(matrix[0]);
    let N = 0;
    
    if (is2D) {
      N = matrix.length;
    } else {
      // Assume square matrix if flat
      N = Math.floor(Math.sqrt(matrix.length));
    }
    
    return { is2D, N };
  }, [matrix]);

  const config = getMatrixConfig();

  const getVal = (i: number, j: number) => {
    if (!config) return 0;
    if (config.is2D) {
      return matrix[i]?.[j] ?? 0;
    } else {
      return matrix[i * config.N + j] ?? 0;
    }
  };

  useEffect(() => {
    if (!canvasRef.current || !config || config.N === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { N } = config;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Cache color function results for performance (quantize error values)
    const colorCache = new Map<string, number[]>();
    const getCachedColor = (val: number) => {
        const rounded = Math.round(val * 10) / 10; // 0.1A precision for cache
        const key = rounded.toString();
        if (colorCache.has(key)) return colorCache.get(key)!;
        
        const color = parseRGB(getPAEColor(val));
        colorCache.set(key, color);
        return color;
    };

    const parseRGB = (rgbStr: string) => {
        const match = rgbStr.match(/\d+/g);
        return match ? match.map(Number) : [255, 255, 255];
    };

    // Constant time rendering O(size^2) instead of O(N^2)
    // This prevents freezing for large proteins
    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            const i = Math.floor((py / size) * N);
            const j = Math.floor((px / size) * N);
            const val = getVal(i, j);
            const [r, g, b] = getCachedColor(val);
            
            const idx = (py * size + px) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255; // Alpha
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

  }, [matrix, size, config]);

  const getPAEColor = (val: number) => {
    // Standard PAE color scheme: 0 is dark blue, 30 is light gray/white or red.
    // Let's use a Scientific Blue-White-Red/Yellow scale
    if (val <= 0) return '#0053d6'; // Very confident
    if (val >= 31) return '#ffffff'; // Very uncertain
    
    // Interpolation (simple version)
    // 0 to 15: Blue to White
    // 15 to 31: White to Orange/Red
    if (val < 15) {
        const t = val / 15;
        const r = Math.floor(0 + t * (255 - 0));
        const g = Math.floor(83 + t * (255 - 83));
        const b = Math.floor(214 + t * (255 - 214));
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        const t = (val - 15) / 16;
        const r = 255;
        const g = Math.floor(255 - t * (255 - 125)); // White to Orange
        const b = Math.floor(255 - t * 255); // White to Red-ish
        return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!config || config.N === 0) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const { N } = config;
    const j = Math.floor((x / size) * N);
    const i = Math.floor((y / size) * N);
    
    if (i >= 0 && i < N && j >= 0 && j < N) {
        setHoverPos({ x, y, val: getVal(i, j), i: i + 1, j: j + 1 });
    } else {
        setHoverPos(null);
    }
  };

  if (!config) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Cargando matriz...</div>;

  return (
    <div style={{ position: 'relative', display: 'inline-block', cursor: 'crosshair' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPos(null)}
        style={{ borderRadius: '4px', background: '#0a0a0f' }}
      />
      
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', background: '#0053d6', borderRadius: '2px' }} /> 0 Å (Alta)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', background: '#ffffff', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.2)' }} /> 15 Å
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', background: 'rgb(255, 125, 0)', borderRadius: '2px' }} /> 30+ Å (Baja)
        </div>
      </div>

      {/* Tooltip */}
      {hoverPos && (
        <div style={{
          position: 'absolute',
          top: hoverPos.y + 10,
          left: hoverPos.x + 10,
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid var(--accent-cyan)',
          fontSize: '0.8rem',
          color: 'white',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap'
        }}>
          <strong>PAE: {hoverPos.val.toFixed(2)} Å</strong>
          <div style={{ opacity: 0.7, fontSize: '0.75rem', marginTop: '4px' }}>
            Residuo alineado: {hoverPos.i} <br/>
            Residuo error: {hoverPos.j}
          </div>
        </div>
      )}

      {/* Axis Labels */}
      <div style={{ position: 'absolute', left: '-25px', top: '50%', transform: 'rotate(-90deg) translateY(-50%)', fontSize: '0.7rem', color: '#64748b' }}>Alineado</div>
      <div style={{ position: 'absolute', bottom: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: '#64748b' }}>Puntuable</div>
    </div>
  );
}
