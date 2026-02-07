'use client';

import { useEffect, useRef } from 'react';
import { CriticalFooting, ReinforcementInputs } from '@/types/footing';

interface FootingDiagramProps {
  footing: CriticalFooting;
  inputs: ReinforcementInputs;
  index?: number;
  exportMode?: boolean;
}

// 2x pixel ratio for sharp rendering on high-DPI displays
const DPR = 2;
// Logical canvas sizes (rendered at DPR × resolution)
const PLAN_W = 700;
const PLAN_H = 500;
const SECT_W = 700;
const SECT_H = 500;

export function FootingDiagram({ footing, inputs, index = 0, exportMode = false }: FootingDiagramProps) {
  const planCanvasRef = useRef<HTMLCanvasElement>(null);
  const sectionCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawPlanView();
    drawSectionView();
  }, [footing, inputs]);

  // ─── Helper: draw arrowhead ───
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    dir: 'up' | 'down' | 'left' | 'right',
    sz: number = 5
  ) => {
    ctx.beginPath();
    switch (dir) {
      case 'left':
        ctx.moveTo(x, y); ctx.lineTo(x + sz, y - sz * 0.5); ctx.lineTo(x + sz, y + sz * 0.5); break;
      case 'right':
        ctx.moveTo(x, y); ctx.lineTo(x - sz, y - sz * 0.5); ctx.lineTo(x - sz, y + sz * 0.5); break;
      case 'up':
        ctx.moveTo(x, y); ctx.lineTo(x - sz * 0.5, y + sz); ctx.lineTo(x + sz * 0.5, y + sz); break;
      case 'down':
        ctx.moveTo(x, y); ctx.lineTo(x - sz * 0.5, y - sz); ctx.lineTo(x + sz * 0.5, y - sz); break;
    }
    ctx.closePath();
    ctx.fill();
  };

  // ══════════════════════════════════════════════════════
  //  PLAN VIEW
  // ══════════════════════════════════════════════════════
  const drawPlanView = () => {
    const canvas = planCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up high-DPI rendering
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const W = PLAN_W;
    const H = PLAN_H;
    const pad = 55;
    const legendH = 35;
    const titleH = 28;
    const drawW = W - 2 * pad;
    const drawH = H - titleH - legendH - pad;

    // Clear
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Data
    const B = footing.dimension;
    const colWm = footing.customColumnWidth || inputs.columnWidth;
    const colDm = footing.customColumnDepth || inputs.columnDepth;
    const barSz = footing.customBarSize || inputs.barSize;
    const numBarsX = footing.numBarsX || 0;
    const numBarsY = footing.numBarsY || 0;

    // Scale: fit footing square into draw area with 15% margin
    const scale = Math.min(drawW, drawH) / (B * 1.15);
    const fSz = B * scale;           // footing size px
    const cW = colWm * scale;        // column width px
    const cD = colDm * scale;        // column depth px
    const coverPx = (inputs.cover / 1000) * scale;

    // Center footing in draw area
    const oX = pad + (drawW - fSz) / 2;
    const oY = titleH + (drawH - fSz) / 2;

    // ── Footing outline ──
    ctx.fillStyle = '#e8ecf1';
    ctx.fillRect(oX, oY, fSz, fSz);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(oX, oY, fSz, fSz);

    // ── Column ──
    const cX = oX + (fSz - cW) / 2;
    const cY = oY + (fSz - cD) / 2;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cX, cY, cW, cD);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(cX, cY, cW, cD);

    // ── X Bars (red, horizontal) ──
    ctx.lineCap = 'round';
    for (let i = 0; i < numBarsX; i++) {
      const y = numBarsX === 1
        ? oY + fSz / 2
        : oY + coverPx + i * (fSz - 2 * coverPx) / (numBarsX - 1);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(oX + coverPx, y);
      ctx.lineTo(oX + fSz - coverPx, y);
      ctx.stroke();
      // End dots
      ctx.fillStyle = '#dc2626';
      for (const bx of [oX + coverPx, oX + fSz - coverPx]) {
        ctx.beginPath();
        ctx.arc(bx, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Y Bars (blue, vertical) ──
    for (let i = 0; i < numBarsY; i++) {
      const x = numBarsY === 1
        ? oX + fSz / 2
        : oX + coverPx + i * (fSz - 2 * coverPx) / (numBarsY - 1);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, oY + coverPx);
      ctx.lineTo(x, oY + fSz - coverPx);
      ctx.stroke();
      ctx.fillStyle = '#2563eb';
      for (const by of [oY + coverPx, oY + fSz - coverPx]) {
        ctx.beginPath();
        ctx.arc(x, by, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.lineCap = 'butt';

    // ── Dimension: horizontal top ──
    ctx.strokeStyle = '#475569';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 1;
    const dimTopY = oY - 14;
    ctx.beginPath(); ctx.moveTo(oX, dimTopY); ctx.lineTo(oX + fSz, dimTopY); ctx.stroke();
    drawArrow(ctx, oX, dimTopY, 'left', 6);
    drawArrow(ctx, oX + fSz, dimTopY, 'right', 6);
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${B.toFixed(2)}m`, oX + fSz / 2, dimTopY - 6);

    // ── Dimension: vertical left ──
    const dimLeftX = oX - 14;
    ctx.beginPath(); ctx.moveTo(dimLeftX, oY); ctx.lineTo(dimLeftX, oY + fSz); ctx.stroke();
    drawArrow(ctx, dimLeftX, oY, 'up', 6);
    drawArrow(ctx, dimLeftX, oY + fSz, 'down', 6);
    ctx.save();
    ctx.translate(dimLeftX - 6, oY + fSz / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${B.toFixed(2)}m`, 0, 0);
    ctx.restore();

    // ── Column dimension label ──
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${(colWm * 100).toFixed(0)}×${(colDm * 100).toFixed(0)}cm`,
      oX + fSz / 2, cY - 7
    );

    // ── Legend (bottom) ──
    const legY = H - legendH / 2;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    // X legend
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pad, legY); ctx.lineTo(pad + 22, legY); ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      `${numBarsX}-DB${barSz} @ ${(footing.spacingX || 0).toFixed(0)}mm (X)`,
      pad + 28, legY + 5
    );
    // Y legend
    const yLegX = W / 2 + 15;
    ctx.strokeStyle = '#2563eb';
    ctx.beginPath(); ctx.moveTo(yLegX, legY); ctx.lineTo(yLegX + 22, legY); ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      `${numBarsY}-DB${barSz} @ ${(footing.spacingY || 0).toFixed(0)}mm (Y)`,
      yLegX + 28, legY + 5
    );
    ctx.lineCap = 'butt';

    // ── Title ──
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('PLAN VIEW', W / 2, 20);
  };

  // ══════════════════════════════════════════════════════
  //  SECTION VIEW (A-A)
  // ══════════════════════════════════════════════════════
  const drawSectionView = () => {
    const canvas = sectionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const W = SECT_W;
    const H = SECT_H;
    const padL = 55;       // left padding (cover annotation)
    const padR = 95;       // right padding (h, d annotations)
    const titleH = 28;
    const legendH = 50;
    const bottomDimH = 40;
    const drawW = W - padL - padR;
    const drawH = H - titleH - legendH - bottomDimH;

    // Clear
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Data
    const B = footing.dimension;
    const h = footing.customThickness || footing.footingThickness || 0;
    const barSz = footing.customBarSize || inputs.barSize;
    const d_eff = footing.customThickness
      ? (footing.customThickness - inputs.cover / 1000 - barSz / 1000 - barSz / 2000)
      : (footing.effectiveDepth || 0);
    const colWm = footing.customColumnWidth || inputs.columnWidth;
    const cover_m = inputs.cover / 1000;
    const numBarsX = footing.numBarsX || 0;
    const numBarsY = footing.numBarsY || 0;

    // ── Scale: same for B (horizontal) and h (vertical) → true proportions ──
    // Column visual height: schematic, not to scale
    const colVisH_target = Math.max(55, Math.min(110, h * 400));

    // Horizontal scale
    const scaleH = drawW / (B * 1.15);
    // Vertical scale (ensure footing fits; column is separate visual)
    const scaleV = (drawH - colVisH_target - 10) / h;
    // Use same scale for width and height → proportional
    const scale = Math.min(scaleH, scaleV);

    const fW = B * scale;            // footing width px
    const fH = h * scale;            // footing height px
    const cW = colWm * scale;        // column width px
    const coverPx = cover_m * scale;
    const dPx = d_eff * scale;       // effective depth (from top) in px

    // Column visual height (schematic, capped)
    const colVisH = Math.max(55, Math.min(120, fH * 1.5));

    // Position: center horizontally
    const fX = padL + (drawW - fW) / 2;
    const fY = titleH + colVisH + 8;   // top of footing

    // ── Ground line (dashed, at top of footing) ──
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(fX - 30, fY);
    ctx.lineTo(fX + fW + 30, fY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Footing rectangle ──
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(fX, fY, fW, fH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(fX, fY, fW, fH);

    // ── Column (above footing, schematic) ──
    const colX = fX + (fW - cW) / 2;
    const colY = fY - colVisH;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(colX, colY, cW, colVisH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(colX, colY, cW, colVisH);

    // ── Effective depth line (dashed red, at d from TOP of footing) ──
    const edLineY = fY + dPx;
    ctx.strokeStyle = '#dc2626';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fX + 3, edLineY);
    ctx.lineTo(fX + fW - 3, edLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Cover line (dashed gray, from bottom of footing) ──
    const coverLineY = fY + fH - coverPx;
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(fX + 3, coverLineY);
    ctx.lineTo(fX + fW - 3, coverLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Reinforcement bars ──
    const barRad = Math.max(4, Math.min(8, (barSz / 16) * 5.5));

    // X-bars (bottom layer): centroid at h - cover - db/2 from top
    const xBarCenterY = fY + fH - coverPx - ((barSz / 2 / 1000) * scale);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = barRad;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fX + coverPx, xBarCenterY);
    ctx.lineTo(fX + fW - coverPx, xBarCenterY);
    ctx.stroke();

    // Y-bars (upper layer): centroid one db above X bars
    const yBarCenterY = xBarCenterY - ((barSz / 1000) * scale);
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'butt';
    if (numBarsY > 0) {
      for (let i = 0; i < numBarsY; i++) {
        const bx = numBarsY === 1
          ? fX + fW / 2
          : fX + coverPx + i * (fW - 2 * coverPx) / Math.max(1, numBarsY - 1);
        ctx.beginPath();
        ctx.arc(bx, yBarCenterY, barRad * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // ════════════════════════════════
    //  DIMENSION ANNOTATIONS
    // ════════════════════════════════

    // ── Footing width B (bottom) ──
    const bDimY = fY + fH + 22;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fX, bDimY); ctx.lineTo(fX + fW, bDimY); ctx.stroke();
    drawArrow(ctx, fX, bDimY, 'left', 6);
    drawArrow(ctx, fX + fW, bDimY, 'right', 6);
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${B.toFixed(2)}m`, fX + fW / 2, bDimY + 15);

    // ── Column width (above column) ──
    const cDimY = colY - 10;
    ctx.strokeStyle = '#475569';
    ctx.fillStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(colX, cDimY); ctx.lineTo(colX + cW, cDimY); ctx.stroke();
    drawArrow(ctx, colX, cDimY, 'left', 5);
    drawArrow(ctx, colX + cW, cDimY, 'right', 5);
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${(colWm * 100).toFixed(0)}cm`, colX + cW / 2, cDimY - 5);

    // ── h dimension (right of footing) ──
    const hDimX = fX + fW + 18;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hDimX, fY); ctx.lineTo(hDimX, fY + fH); ctx.stroke();
    drawArrow(ctx, hDimX, fY, 'up', 5);
    drawArrow(ctx, hDimX, fY + fH, 'down', 5);
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`h=${(h * 100).toFixed(0)}cm`, hDimX + 6, fY + fH / 2 + 4);

    // ── d dimension (further right, from TOP to effective depth line) ──
    const dDimX = hDimX + 58;
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(dDimX, fY); ctx.lineTo(dDimX, edLineY); ctx.stroke();
    drawArrow(ctx, dDimX, fY, 'up', 5);
    drawArrow(ctx, dDimX, edLineY, 'down', 5);
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`d=${(d_eff * 100).toFixed(1)}cm`, dDimX + 6, fY + dPx / 2 + 4);

    // ── Cover annotation (left, from bottom of footing) ──
    const covDimX = fX - 14;
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(covDimX, fY + fH); ctx.lineTo(covDimX, coverLineY); ctx.stroke();
    drawArrow(ctx, covDimX, fY + fH, 'down', 4);
    drawArrow(ctx, covDimX, coverLineY, 'up', 4);
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${inputs.cover}mm`, covDimX - 4, fY + fH - coverPx / 2 + 4);

    // ════════════════════════════════
    //  LEGEND (bottom)
    // ════════════════════════════════
    const leg1Y = H - legendH + 8;
    const leg2Y = H - legendH + 28;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';

    // X bar legend (red line)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(padL - 18, leg1Y);
    ctx.lineTo(padL, leg1Y);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      `${numBarsX}-DB${barSz} @ ${(footing.spacingX || 0).toFixed(0)}mm (X)`,
      padL + 6, leg1Y + 4
    );

    // Y bar legend (blue circle)
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(padL - 9, leg2Y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      `${numBarsY}-DB${barSz} @ ${(footing.spacingY || 0).toFixed(0)}mm (Y)`,
      padL + 6, leg2Y + 4
    );

    // Cover info
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Cover: ${inputs.cover}mm`, W / 2 + 50, leg2Y + 4);

    // ── Title ──
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('SECTION VIEW (A-A)', W / 2, 20);
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border-2 border-slate-300 dark:border-slate-600 p-2">
        <canvas
          ref={planCanvasRef}
          width={PLAN_W * DPR}
          height={PLAN_H * DPR}
          style={{ width: '100%', height: 'auto' }}
          {...(exportMode
            ? { 'data-export-plan': index }
            : { 'data-footing-plan': index }
          )}
        />
      </div>
      <div className="bg-white rounded-lg border-2 border-slate-300 dark:border-slate-600 p-2">
        <canvas
          ref={sectionCanvasRef}
          width={SECT_W * DPR}
          height={SECT_H * DPR}
          style={{ width: '100%', height: 'auto' }}
          {...(exportMode
            ? { 'data-export-section': index }
            : { 'data-footing-section': index }
          )}
        />
      </div>
    </div>
  );
}
