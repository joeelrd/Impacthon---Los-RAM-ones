/**
 * GAIVE Report Service — v2
 * Academic white-theme PDF with real 3D view captures and RCSB similarity search.
 *
 * Sections:
 *  1. Cover page (white)
 *  2. RCSB PDB reference metadata (similar molecule found)
 *  3. CESGA job execution parameters & sustainability
 *  4. Structural quality metrics
 *  5. Ramachandran diagram
 *  6. 3D visualisation captures (Molstar canvas)
 *  7. Active sites & binding residues
 *  8. Footer with QR link
 */

import jsPDF from 'jspdf';
import type { RCSBMetadata } from './rcsbService';
import QRCode from 'qrcode';

// ─── Academic white colour palette ────────────────────────────────────────────
const C = {
  white:       [255, 255, 255] as [number,number,number],
  pageBg:      [250, 251, 253] as [number,number,number],  // off-white page
  cardBg:      [243, 246, 252] as [number,number,number],  // light blue-gray card
  headerBg:    [15,  40,  85 ] as [number,number,number],  // deep navy header
  accent:      [14, 116, 189 ] as [number,number,number],  // scientific blue
  accentLight: [219, 234, 254] as [number,number,number],  // pale blue
  green:       [5,  150,  90 ] as [number,number,number],
  greenLight:  [209, 250, 229] as [number,number,number],
  orange:      [180,  80,   0 ] as [number,number,number],
  orangeLight: [255, 237, 213] as [number,number,number],
  red:         [185,  28,  28 ] as [number,number,number],
  redLight:    [254, 226, 226] as [number,number,number],
  text:        [15,  23,  42 ] as [number,number,number],  // near-black
  textSub:     [71,  85, 105 ] as [number,number,number],  // slate-600
  textMuted:   [148,163,184 ] as [number,number,number],   // slate-400
  border:      [203,213,225 ] as [number,number,number],   // slate-300
  divider:     [226,232,240 ] as [number,number,number],   // slate-200
};

const W = 210;
const H = 297;
const M = 15;          // margin
const CW = W - M * 2;  // content width

// ─── Utility helpers ──────────────────────────────────────────────────────────
const sf = (doc: jsPDF, rgb: [number,number,number]) => doc.setFillColor(rgb[0],rgb[1],rgb[2]);
const sd = (doc: jsPDF, rgb: [number,number,number]) => doc.setDrawColor(rgb[0],rgb[1],rgb[2]);
const st = (doc: jsPDF, rgb: [number,number,number]) => doc.setTextColor(rgb[0],rgb[1],rgb[2]);

function fillPage(doc: jsPDF, rgb: [number,number,number]) {
  sf(doc, rgb);
  doc.rect(0, 0, W, H, 'F');
}

/** Rounded card with subtle border */
function card(doc: jsPDF, x: number, y: number, w: number, h: number,
              fill = C.cardBg, border = C.border) {
  sf(doc, fill);
  sd(doc, border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
}

/** Blue accent bar + bold section title */
function sectionTitle(doc: jsPDF, label: string, y: number): number {
  sf(doc, C.accent);
  doc.rect(M, y, 3.5, 7, 'F');
  st(doc, C.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(label, M + 5.5, y + 5.5);
  y += 11;
  sd(doc, C.divider);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  return y + 4;
}

/** Key-value row */
function kv(doc: jsPDF, label: string, value: string, x: number, y: number,
            valColor: [number,number,number] = C.text): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  st(doc, C.textSub);
  doc.text(label + ':', x, y);
  st(doc, valColor);
  const lines = doc.splitTextToSize(value || 'N/A', CW - 42);
  doc.text(lines, x + 40, y);
  return y + lines.length * 5 + 1.5;
}

/** Mini header bar for pages 2+ */
function miniHeader(doc: jsPDF, jobId: string) {
  sf(doc, C.headerBg);
  doc.rect(0, 0, W, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  st(doc, [180, 210, 255]);
  doc.text('GAIVE · BioMolecules Inc', M, 6);
  st(doc, [148, 180, 220]);
  doc.setFont('helvetica', 'normal');
  doc.text('Job: ' + jobId, W - M, 6, { align: 'right' });
}

function formatDate(d: Date): string {
  return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

// ─── PDB parser & Ramachandran ────────────────────────────────────────────────

interface Atom { chain: string; resSeq: number; resName: string; name: string; x:number; y:number; z:number; }

function parsePDB(pdb: string): Atom[] {
  const atoms: Atom[] = [];
  for (const line of pdb.split('\n')) {
    if (!line.startsWith('ATOM') && !line.startsWith('HETATM')) continue;
    const name    = line.substring(12, 16).trim();
    const resName = line.substring(17, 20).trim();
    const chain   = line.substring(21, 22).trim();
    const resSeq  = parseInt(line.substring(22, 26), 10);
    const x = parseFloat(line.substring(30, 38));
    const y = parseFloat(line.substring(38, 46));
    const z = parseFloat(line.substring(46, 54));
    if (!isNaN(x)) atoms.push({ chain, resSeq, resName, name, x, y, z });
  }
  return atoms;
}

type V3 = [number,number,number];
const dot   = (a:V3,b:V3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub   = (a:V3,b:V3): V3 => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross = (a:V3,b:V3): V3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit  = (a:V3): V3 => { const n=Math.sqrt(dot(a,a))||1; return [a[0]/n,a[1]/n,a[2]/n]; };
const dihedral = (p1:V3,p2:V3,p3:V3,p4:V3) => {
  const b1=sub(p2,p1),b2=sub(p3,p2),b3=sub(p4,p3);
  const n1=cross(b1,b2),n2=cross(b2,b3),m1=cross(n1,unit(b2));
  return Math.atan2(dot(m1,n2),dot(n1,n2))*(180/Math.PI);
};

export interface RamachandranPoint { phi:number; psi:number; resName:string; chain:string; }

export function computeRamachandran(pdbText: string): RamachandranPoint[] {
  const atoms = parsePDB(pdbText);
  const rm = new Map<string, any>();
  for (const a of atoms) {
    if (!['N','CA','C'].includes(a.name)) continue;
    const key = `${a.chain}:${String(a.resSeq).padStart(6,'0')}`;
    if (!rm.has(key)) rm.set(key, { _resName: a.resName, _chain: a.chain });
    rm.get(key)[a.name] = [a.x,a.y,a.z];
    rm.get(key)._resName = a.resName;
    rm.get(key)._chain = a.chain;
  }
  const keys = Array.from(rm.keys()).sort();
  const pts: RamachandranPoint[] = [];
  for (let i=1;i<keys.length-1;i++) {
    const prev=rm.get(keys[i-1]),curr=rm.get(keys[i]),next=rm.get(keys[i+1]);
    if (!prev||!curr||!next||!curr.N||!curr.CA||!curr.C) continue;
    if (keys[i-1].split(':')[0]!==keys[i].split(':')[0]||
        keys[i].split(':')[0]!==keys[i+1].split(':')[0]) continue;
    try {
      const phi=prev.C?dihedral(prev.C,curr.N,curr.CA,curr.C):NaN;
      const psi=next.N?dihedral(curr.N,curr.CA,curr.C,next.N):NaN;
      if(!isNaN(phi)&&!isNaN(psi)) pts.push({phi,psi,resName:curr._resName,chain:curr._chain});
    } catch { /* */ }
  }
  return pts;
}

export function renderRamachandranCanvas(points: RamachandranPoint[], size=480): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,size,size);

  const pad=48, pw=size-pad*2, ph=size-pad*2;

  // Favoured regions (light fill)
  const toX = (phi:number) => pad + ((phi+180)/360)*pw;
  const toY = (psi:number) => pad + ((psi+180)/360)*ph;

  // Beta region
  ctx.fillStyle = 'rgba(59,130,246,0.08)';
  ctx.fillRect(toX(-170),toY(90), toX(-50)-toX(-170), toY(180)-toY(90));
  // Alpha helix region
  ctx.fillStyle = 'rgba(16,185,129,0.10)';
  ctx.fillRect(toX(-170),toY(-80), toX(-40)-toX(-170), toY(-10)-toY(-80));
  // Left-handed helix
  ctx.fillStyle = 'rgba(251,191,36,0.08)';
  ctx.fillRect(toX(50),toY(20), toX(90)-toX(50), toY(80)-toY(20));

  // Grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.5;
  for (let v=-180;v<=180;v+=60) {
    ctx.beginPath(); ctx.moveTo(toX(v),pad); ctx.lineTo(toX(v),pad+ph); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad,toY(v)); ctx.lineTo(pad+pw,toY(v)); ctx.stroke();
    ctx.fillStyle='#94a3b8'; ctx.font='8px Arial';
    ctx.fillText(String(v), toX(v)-6, pad+ph+14);
    ctx.fillText(String(v), 2, toY(v)+3);
  }

  // Zero axes
  ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(toX(0),pad); ctx.lineTo(toX(0),pad+ph); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad,toY(0)); ctx.lineTo(pad+pw,toY(0)); ctx.stroke();

  // Points
  for (const p of points) {
    const px=toX(p.phi), py=toY(p.psi);
    let col='rgba(59,130,246,0.65)';
    if (p.resName==='GLY') col='rgba(139,92,246,0.75)';
    else if (p.resName==='PRO') col='rgba(234,88,12,0.75)';
    else if (['ALA','VAL','ILE','LEU','MET'].includes(p.resName)) col='rgba(16,185,129,0.65)';
    ctx.beginPath();
    ctx.arc(px,py,points.length>200?2:3,0,Math.PI*2);
    ctx.fillStyle=col; ctx.fill();
  }

  // Border
  ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=1;
  ctx.strokeRect(pad,pad,pw,ph);

  // Axis labels
  ctx.fillStyle='#475569'; ctx.font='bold 10px Arial';
  ctx.fillText('φ (°)', size/2-12, size-4);
  ctx.save(); ctx.translate(13,size/2+18); ctx.rotate(-Math.PI/2);
  ctx.fillText('ψ (°)', 0,0); ctx.restore();

  // Legend
  const lg=[
    {c:'rgba(59,130,246,0.65)',l:'General'},
    {c:'rgba(139,92,246,0.75)',l:'Gly'},
    {c:'rgba(234,88,12,0.75)',l:'Pro'},
    {c:'rgba(16,185,129,0.65)',l:'Hydrophobic'},
  ];
  let lx=pad;
  ctx.font='8px Arial';
  for (const g of lg) {
    ctx.fillStyle=g.c; ctx.beginPath(); ctx.arc(lx+4,pad-13,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#475569'; ctx.fillText(g.l,lx+10,pad-9);
    lx+=g.l.length*5.5+18;
  }

  ctx.fillStyle='#64748b'; ctx.font='8px Arial';
  ctx.fillText('n = '+points.length+' residues',pad+2,pad+ph-6);

  return canvas;
}

// ─── 3D view capture ──────────────────────────────────────────────────────────

/**
 * Tries several strategies to capture the Molstar 3D viewer canvas.
 * Returns a data-URL string or null.
 */
export async function capture3DView(containerSelector = '#molstar-viewer-container'): Promise<string | null> {
  // Wait one animation frame so Molstar has rendered
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => setTimeout(r, 300));

  // Strategy 1: query all canvases and find the largest readable one
  const allCanvases = document.querySelectorAll<HTMLCanvasElement>('canvas');
  let best: HTMLCanvasElement | null = null;
  let bestArea = 0;

  for (const cv of allCanvases) {
    const area = cv.width * cv.height;
    if (area <= 10000) continue;  // too small
    try {
      const dataUrl = cv.toDataURL('image/png');
      // Check if it actually has content (not all-transparent / all-black)
      if (dataUrl.length > 5000) {  // very small data URLs = blank canvas
        if (area > bestArea) { bestArea = area; best = cv; }
      }
    } catch { /* tainted cross-origin canvas, skip */ }
  }

  if (best) {
    try { return best.toDataURL('image/png'); } catch { /* */ }
  }

  // Strategy 2: use html2canvas on the viewer container div
  try {
    const container = document.querySelector<HTMLElement>(containerSelector);
    if (container) {
      const { default: html2canvas } = await import('html2canvas');
      const captured = await html2canvas(container, {
        useCORS: true, allowTaint: true,
        backgroundColor: '#0a0a0f',
        scale: 1.5,
        logging: false,
      });
      return captured.toDataURL('image/png');
    }
  } catch { /* html2canvas failed */ }

  return null;
}

// ─── Main PDF generator ───────────────────────────────────────────────────────

export interface GAIVEReportInput {
  jobId:         string;
  outputs:       any;
  accounting:    any;
  fastaSequence: string;
  rcsbMeta:      RCSBMetadata | null;
  ramaPoints:    RamachandranPoint[];
  ramaCanvas:    HTMLCanvasElement;
  view3DDataUrl: string | null;  // captured Molstar screenshot
  pageUrl:       string;
}

export async function generateGAIVEReport(input: GAIVEReportInput): Promise<void> {
  const { jobId, outputs, accounting, rcsbMeta, ramaPoints, ramaCanvas, view3DDataUrl, pageUrl } = input;
  const bio    = outputs?.biological_data  ?? {};
  const struct = outputs?.structural_data  ?? {};
  const now    = new Date();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── PAGE 1 ─────────────────────────────────────────────────────────────────
  fillPage(doc, C.white);

  // Navy header band
  sf(doc, C.headerBg);
  doc.rect(0, 0, W, 32, 'F');
  // Accent stripe
  sf(doc, C.accent);
  doc.rect(0, 32, W, 1.5, 'F');

  // Logotype
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  st(doc, C.white);
  doc.text('GAIVE', M, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  st(doc, [180,210,240]);
  doc.text('Generación Autonómica de Informes de Validación Estructural', M, 22);
  st(doc, [120,160,210]);
  doc.text('BioMolecules Inc · CESGA Finisterrae III', W-M, 22, { align: 'right' });

  let y = 42;

  // Title card
  card(doc, M, y, CW, 38, C.accentLight, C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  st(doc, C.headerBg);
  doc.text('Informe Técnico de Validación Estructural', M+6, y+9);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  st(doc, C.textSub);
  doc.text('Proteína procesada mediante plegado computacional en clúster HPC', M+6, y+17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  st(doc, C.accent);
  doc.text('Job ID: '+jobId, M+6, y+26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  st(doc, C.textMuted);
  doc.text('Generado: '+formatDate(now), M+6, y+34);

  y += 44;

  // ── SECTION 1: RCSB Reference ──────────────────────────────────────────────
  y = sectionTitle(doc, '1. Estructura de Referencia — RCSB Protein Data Bank', y);

  const cardH1 = rcsbMeta ? 58 : 18;
  card(doc, M, y, CW, cardH1, C.cardBg, C.border);

  if (rcsbMeta) {
    const lig = rcsbMeta.ligands.length>0 ? rcsbMeta.ligands.join(', ') : 'Ninguno detectado';
    const doi = rcsbMeta.doi ? 'https://doi.org/'+rcsbMeta.doi : 'N/A';
    let ky = y+6;

    // Highlight badge for PDB ID
    sf(doc, C.accent);
    doc.roundedRect(M+4, ky-4, 22, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    st(doc, C.white);
    doc.text(rcsbMeta.pdbId, M+7, ky+0.5);
    doc.setFont('helvetica', 'normal');
    st(doc, C.textSub);
    doc.text(rcsbMeta.title, M+28, ky+0.5);
    ky += 7;

    ky = kv(doc,'Organismo',      rcsbMeta.organism, M+4, ky, C.green);
    ky = kv(doc,'Resolución',     rcsbMeta.resolution ? rcsbMeta.resolution+' Å' : 'N/A', M+4, ky, C.orange);
    ky = kv(doc,'Método Exp.',    rcsbMeta.method, M+4, ky);
    ky = kv(doc,'Ligandos',       lig, M+4, ky);
    ky = kv(doc,'DOI',            doi, M+4, ky, C.accent);
    kv(doc,'Depósito',            rcsbMeta.depositionDate, M+4, ky);

    // Similarity note
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5);
    st(doc, C.textMuted);
    doc.text('* Template identificado por búsqueda BLAST de similitud de secuencia vía API RCSB PDB.', M+4, y+cardH1-3);
  } else {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5);
    st(doc, C.textMuted);
    doc.text('No se encontró template en RCSB para la secuencia aportada.', M+4, y+10);
  }
  y += cardH1+5;

  // ── SECTION 2: CESGA Parameters ────────────────────────────────────────────
  y = sectionTitle(doc, '2. Parámetros del Cálculo — CESGA Finisterrae III', y);
  card(doc, M, y, CW, 56, C.cardBg, C.border);

  const totalWall = accounting?.total_wall_time_seconds ?? 0;
  const cpu_h    = accounting?.cpu_hours ?? (totalWall/3600);
  const gpu_h    = accounting?.gpu_hours ?? (totalWall/3600)*1.5;
  const mem_h    = accounting?.memory_gb_hours ?? 16*(totalWall/3600);
  const eKwh     = ((cpu_h*6.4)+(gpu_h*350)+(mem_h*0.3))/1000*1.2;
  const co2g     = eKwh*180;
  const costEur  = cpu_h*0.04+gpu_h*2.50;

  let cy = y+6;
  cy = kv(doc,'Software',        accounting?.software ?? 'AlphaFold2 / GROMACS 2024', M+4, cy);
  cy = kv(doc,'Clúster',         'CESGA Finisterrae III — NVIDIA A100 80 GB', M+4, cy);
  cy = kv(doc,'Tiempo wall',     totalWall.toFixed(1)+' s', M+4, cy, C.orange);
  cy = kv(doc,'CPU-horas',       cpu_h.toFixed(4)+' h', M+4, cy);
  cy = kv(doc,'GPU-horas (A100)',gpu_h.toFixed(4)+' h', M+4, cy);
  cy = kv(doc,'Energía',         (eKwh*1000).toFixed(3)+' Wh (PUE 1.2)', M+4, cy, C.accent);
  cy = kv(doc,'Huella CO₂',      co2g.toFixed(4)+' g CO₂-eq', M+4, cy, C.green);
  kv(doc,'Coste estimado',       '€'+costEur.toFixed(5)+' (tarifas HPC simuladas)', M+4, cy);
  y += 61;

  // ── SECTION 3: Structural metrics ──────────────────────────────────────────
  y = sectionTitle(doc, '3. Métricas de Calidad Estructural', y);
  card(doc, M, y, CW, 46, C.cardBg, C.border);
  let my = y+6;
  my = kv(doc,'Proteína ID',         struct.protein_id ?? jobId, M+4, my, C.accent);
  my = kv(doc,'Solubilidad',
    (bio.solubility_score?.toFixed(1) ?? 'N/A')+'% ('+( bio.solubility_prediction ?? 'N/A')+')',
    M+4, my, C.green);
  my = kv(doc,'Índice Inestabilidad',
    (bio.instability_index?.toFixed(2) ?? 'N/A')+' ('+( bio.stability_status ?? 'N/A')+')',
    M+4, my, bio.stability_status==='stable' ? C.green : C.red);
  const ss = bio.secondary_structure_prediction;
  if (ss) {
    kv(doc,'Estr. Secundaria',
      'α-Hélice '+ss.helix_percent+'%  ·  β-Hoja '+ss.strand_percent+'%  ·  Coil '+ss.coil_percent+'%',
      M+4, my);
  }
  y += 51;

  // Toxicity alerts (compact)
  const tox = [...(bio.toxicity_alerts??[]),...(bio.allergenicity_alerts??[])];
  if (tox.length>0) {
    card(doc, M, y, CW, 16, C.redLight, C.red);
    doc.setFont('helvetica','bold'); doc.setFontSize(8); st(doc, C.red);
    doc.text('⚠ Alertas: '+tox.slice(0,3).join(' · '), M+4, y+9);
    y += 20;
  }

  // ── PAGE 2: Ramachandran ────────────────────────────────────────────────────
  doc.addPage();
  fillPage(doc, C.white);
  miniHeader(doc, jobId);

  y = 16;
  y = sectionTitle(doc, '4. Diagrama de Ramachandran', y);

  const ramaImg = ramaCanvas.toDataURL('image/png');
  const plotMM  = 108;
  const plotX   = (W-plotMM)/2;
  card(doc, M, y, CW, plotMM+28, C.cardBg, C.border);
  doc.addImage(ramaImg, 'PNG', plotX, y+4, plotMM, plotMM);

  const fav = ramaPoints.filter(p =>
    (p.phi>-170&&p.phi<-40&&p.psi>-80&&p.psi<-10)||
    (p.phi>-170&&p.phi<-50&&p.psi>90&&p.psi<180)
  ).length;
  const favPct = ramaPoints.length>0 ? ((fav/ramaPoints.length)*100).toFixed(1) : 'N/A';

  const sy = y+plotMM+8;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);

  // Two stat pills
  const pillW=42, pillH=10;
  // Residues pill
  sf(doc, C.cardBg); sd(doc,C.border);
  doc.roundedRect(M+4, sy, pillW, pillH, 2, 2, 'FD');
  st(doc,C.textSub); doc.setFontSize(7); doc.text('Residuos', M+7, sy+4);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); st(doc,C.text);
  doc.text(String(ramaPoints.length), M+7, sy+9);

  // Favourable pill
  const favColor = Number(favPct)>=90 ? C.green : C.orange;
  sf(doc, Number(favPct)>=90 ? C.greenLight : C.orangeLight); sd(doc,favColor);
  doc.roundedRect(M+50, sy, pillW+8, pillH, 2, 2, 'FD');
  st(doc,favColor); doc.setFontSize(7); doc.setFont('helvetica','normal');
  doc.text('Región favorecida', M+53, sy+4);
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(favPct+'%', M+53, sy+9);

  doc.setFont('helvetica','italic'); doc.setFontSize(7); st(doc,C.textMuted);
  doc.text('* Estimación φ/ψ. Para validación clínica, use MolProbity.', M+4, sy+18);

  y = sy+24;

  // ── SECTION 5: 3D Visualisation ────────────────────────────────────────────
  y = sectionTitle(doc, '5. Visualización 3D — Molstar Viewer', y);

  if (view3DDataUrl) {
    const imgH = 92;
    card(doc, M, y, CW, imgH+10, C.cardBg, C.border);
    doc.addImage(view3DDataUrl, 'PNG', M+2, y+4, CW-4, imgH);
    doc.setFont('helvetica','italic'); doc.setFontSize(7.5); st(doc,C.textMuted);
    doc.text('Modo Cartoon — coloreado por índice de confianza pLDDT / B-factor', M+4, y+imgH+9);
    y += imgH+14;
  } else {
    // Decorative placeholder
    card(doc, M, y, CW, 36, [240,245,255], C.border);
    sf(doc, [219,234,254]); doc.circle(W/2, y+18, 12, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(26); st(doc,[148,180,220]);
    doc.text('⬡', W/2, y+22, { align: 'center' });
    doc.setFont('helvetica','italic'); doc.setFontSize(8.5); st(doc,C.textMuted);
    doc.text('Render 3D no disponible — el visor no estaba activo al generar este informe.',
      W/2, y+32, { align: 'center' });
    y += 40;
  }

  // ── SECTION 6: Active sites ─────────────────────────────────────────────────
  if ((bio.active_sites?.length??0)>0||(bio.binding_residues?.length??0)>0) {
    y = sectionTitle(doc, '6. Sitios Activos y Residuos de Unión', y);
    card(doc, M, y, CW, 22, C.cardBg, C.border);
    let ay=y+7;
    if (bio.active_sites?.length) {
      ay = kv(doc,'Sitios activos', bio.active_sites.join(', '), M+4, ay, C.orange);
    }
    if (bio.binding_residues?.length) {
      kv(doc,'Residuos unión', bio.binding_residues.join(', '), M+4, ay, C.accent);
    }
    y += 26;
  }

  // ── Footer/QR ───────────────────────────────────────────────────────────────
  if (y > H-52) { doc.addPage(); fillPage(doc,C.white); miniHeader(doc,jobId); y=16; }

  y = Math.max(y, H-52);
  sf(doc, [241,245,249]);
  doc.rect(0, y, W, H-y, 'F');
  sd(doc, C.divider); doc.setLineWidth(0.4);
  doc.line(M, y+2, W-M, y+2);

  try {
    const qrUrl = await QRCode.toDataURL(pageUrl, {
      width: 72, margin:1,
      color: { dark: '#0f2855', light: '#f1f5f9' },
    });
    doc.addImage(qrUrl, 'PNG', W-M-22, y+6, 22, 22);
  } catch { /* */ }

  doc.setFont('helvetica','bold'); doc.setFontSize(9); st(doc, C.accent);
  doc.text('Acceso al visor 3D interactivo', M, y+10);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); st(doc, C.textSub);
  doc.text(pageUrl, M, y+17);
  doc.setFontSize(7.5); st(doc,C.textMuted);
  doc.text('Escanea el QR para revisar el modelo de forma interactiva en BioMolecules Inc.', M, y+24);
  doc.text('© BioMolecules Inc · GAIVE Platform · Datos: RCSB PDB (https://www.rcsb.org)', M, y+31);
  doc.text('Generado: '+formatDate(now), M, y+38);

  doc.save('GAIVE_'+jobId+'_'+now.toISOString().substring(0,10)+'.pdf');
}
