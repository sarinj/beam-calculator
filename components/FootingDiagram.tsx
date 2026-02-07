'use client';

import { useEffect, useRef } from 'react';
import { CriticalFooting, ReinforcementInputs } from '@/types/footing';

interface FootingDiagramProps {
  footing: CriticalFooting;
  inputs: ReinforcementInputs;
  index?: number;
}

export function FootingDiagram({ footing, inputs, index = 0 }: FootingDiagramProps) {
  const planCanvasRef = useRef<HTMLCanvasElement>(null);
  const sectionCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawPlanView();
    drawSectionView();
  }, [footing, inputs]);

  const drawPlanView = () => {
    const canvas = planCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 30;
    const drawWidth = width - 2 * padding;
    const drawHeight = height - 2 * padding;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const B = footing.dimension;
    const columnWidth = footing.customColumnWidth || inputs.columnWidth;
    const columnDepth = footing.customColumnDepth || inputs.columnDepth;
    const scale = Math.min(drawWidth, drawHeight) / (B * 1.2);

    const footingSize = B * scale;
    const colWidth = columnWidth * scale;
    const colDepth = columnDepth * scale;

    const offsetX = padding + (drawWidth - footingSize) / 2;
    const offsetY = padding + (drawHeight - footingSize) / 2;

    // Draw footing outline
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(offsetX, offsetY, footingSize, footingSize);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, footingSize, footingSize);

    // Draw column
    ctx.fillStyle = '#94a3b8';
    const colX = offsetX + (footingSize - colWidth) / 2;
    const colY = offsetY + (footingSize - colDepth) / 2;
    ctx.fillRect(colX, colY, colWidth, colDepth);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(colX, colY, colWidth, colDepth);

    // Draw reinforcement bars (X direction - horizontal lines)
    const numBarsX = footing.numBarsX || 0;
    const spacingX = footing.spacingX || 0;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    const coverPx = (inputs.cover / 1000) * scale; // Cover in pixels
    
    for (let i = 0; i < numBarsX; i++) {
      const y = offsetY + coverPx + (i * (footingSize - 2 * coverPx) / (numBarsX - 1));
      ctx.beginPath();
      ctx.moveTo(offsetX + coverPx, y);
      ctx.lineTo(offsetX + footingSize - coverPx, y);
      ctx.stroke();
      
      // Draw bar dots at ends
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(offsetX + coverPx, y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(offsetX + footingSize - coverPx, y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw reinforcement bars (Y direction - vertical lines)
    const numBarsY = footing.numBarsY || 0;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    
    for (let i = 0; i < numBarsY; i++) {
      const x = offsetX + coverPx + (i * (footingSize - 2 * coverPx) / (numBarsY - 1));
      ctx.beginPath();
      ctx.moveTo(x, offsetY + coverPx);
      ctx.lineTo(x, offsetY + footingSize - coverPx);
      ctx.stroke();
      
      // Draw bar dots at ends
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, offsetY + coverPx, 2.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, offsetY + footingSize - coverPx, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Dimensions
    ctx.fillStyle = '#0f172a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    // Footing dimension - horizontal
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY - 15);
    ctx.lineTo(offsetX + footingSize, offsetY - 15);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(`${B.toFixed(2)}m`, offsetX + footingSize / 2, offsetY - 20);

    // Footing dimension - vertical
    ctx.save();
    ctx.translate(offsetX - 15, offsetY + footingSize / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${B.toFixed(2)}m`, 0, 0);
    ctx.restore();

    // Column dimension
    ctx.font = '9px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(
      `${(columnWidth * 100).toFixed(0)}×${(columnDepth * 100).toFixed(0)}cm`,
      offsetX + footingSize / 2,
      colY - 5
    );

    // Legend
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - 15);
    ctx.lineTo(padding + 15, height - 15);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${numBarsX}-DB${footing.customBarSize || inputs.barSize} @ ${spacingX.toFixed(0)}mm (X)`, padding + 20, height - 12);
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding + 180, height - 15);
    ctx.lineTo(padding + 195, height - 15);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${numBarsY}-DB${footing.customBarSize || inputs.barSize} @ ${footing.spacingY?.toFixed(0)}mm (Y)`, padding + 200, height - 12);

    // Title
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PLAN VIEW', width / 2, 15);
  };

  const drawSectionView = () => {
    const canvas = sectionCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const drawWidth = width - 2 * padding;
    const drawHeight = height - 2 * padding;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const B = footing.dimension;
    const h = footing.customThickness || footing.footingThickness || 0;
    const actualEffectiveDepth = footing.customThickness 
      ? (footing.customThickness - inputs.cover/1000 - (footing.customBarSize || inputs.barSize)/1000 - (footing.customBarSize || inputs.barSize)/2000)
      : (footing.effectiveDepth || 0);
    const d = actualEffectiveDepth;
    const columnWidth = footing.customColumnWidth || inputs.columnWidth;
    const columnDepth = footing.customColumnDepth || inputs.columnDepth;
    const cover = inputs.cover / 1000; // mm to m
    
    // Scale to fit
    const scaleX = drawWidth / (B * 1.3);
    const scaleY = drawHeight / (h * 3.5); // More vertical space
    const scale = Math.min(scaleX, scaleY);

    const footingWidth = B * scale;
    const footingHeight = h * scale;
    const colWidth = columnWidth * scale;
    const colHeight = columnDepth * 1.5 * scale; // Column height for display
    const coverPx = cover * scale;

    const offsetX = padding + (drawWidth - footingWidth) / 2;
    const offsetY = padding + drawHeight * 0.55;

    // Draw ground line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(offsetX - 20, offsetY);
    ctx.lineTo(offsetX + footingWidth + 20, offsetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw footing
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(offsetX, offsetY, footingWidth, footingHeight);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, footingWidth, footingHeight);

    // Draw column
    ctx.fillStyle = '#94a3b8';
    const colX = offsetX + (footingWidth - colWidth) / 2;
    const colY = offsetY - colHeight;
    ctx.fillRect(colX, colY, colWidth, colHeight);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(colX, colY, colWidth, colHeight);

    // Draw effective depth line (dashed red)
    const dPx = d * scale;
    const effectiveDepthY = offsetY + footingHeight - dPx;
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(offsetX, effectiveDepthY);
    ctx.lineTo(offsetX + footingWidth, effectiveDepthY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw cover line (light dashed) - from bottom of footing
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 0.5;
    const bottomCoverY = offsetY + footingHeight - coverPx;
    ctx.beginPath();
    ctx.moveTo(offsetX, bottomCoverY);
    ctx.lineTo(offsetX + footingWidth, bottomCoverY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw reinforcement bars (bottom layer)
    const numBarsX = footing.numBarsX || 0;
    const numBarsY = footing.numBarsY || 0;
    const barSize = footing.customBarSize || inputs.barSize;
    const barRadius = Math.max(3, Math.min(5, (barSize / 16) * 4));
    // Bar position: cover + db/2 from bottom
    const barY = offsetY + footingHeight - coverPx - ((barSize / 2 / 1000) * scale);
    
    // X-direction bars (shown as horizontal line - section view cuts through them)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = barRadius;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(offsetX + coverPx, barY);
    ctx.lineTo(offsetX + footingWidth - coverPx, barY);
    ctx.stroke();
    
    // Y-direction bars (shown as circles - section view shows their cross-section)
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    // Y bars position: cover + db + db/2 from bottom (one bar diameter above X bars)
    const barYUpper = barY - ((barSize / 1000) * scale);
    
    if (numBarsY > 0) {
      for (let i = 0; i < numBarsY; i++) {
        const x = offsetX + coverPx + (i * (footingWidth - 2 * coverPx) / Math.max(1, numBarsY - 1));
        ctx.beginPath();
        ctx.arc(x, barYUpper, barRadius * 0.8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Dimensions and annotations
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';

    // Footing width dimension (bottom)
    const dimY = offsetY + footingHeight + 18;
    ctx.beginPath();
    ctx.moveTo(offsetX, dimY);
    ctx.lineTo(offsetX + footingWidth, dimY);
    ctx.stroke();
    drawArrow(ctx, offsetX, dimY, 'left');
    drawArrow(ctx, offsetX + footingWidth, dimY, 'right');
    ctx.fillText(`${B.toFixed(2)}m`, offsetX + footingWidth / 2, dimY + 10);

    // Column width dimension
    ctx.strokeStyle = '#475569';
    const colDimY = colY - 8;
    ctx.beginPath();
    ctx.moveTo(colX, colDimY);
    ctx.lineTo(colX + colWidth, colDimY);
    ctx.stroke();
    drawArrow(ctx, colX, colDimY, 'left', 3);
    drawArrow(ctx, colX + colWidth, colDimY, 'right', 3);
    ctx.fillStyle = '#475569';
    ctx.font = '8px monospace';
    ctx.fillText(`${(columnWidth * 100).toFixed(0)}cm`, colX + colWidth / 2, colDimY - 3);

    // Right side dimensions
    const dimX = offsetX + footingWidth + 20;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.textAlign = 'left';
    ctx.font = '8px monospace';
    
    // Total height h
    ctx.beginPath();
    ctx.moveTo(dimX, offsetY);
    ctx.lineTo(dimX, offsetY + footingHeight);
    ctx.stroke();
    drawArrow(ctx, dimX, offsetY, 'up', 3);
    drawArrow(ctx, dimX, offsetY + footingHeight, 'down', 3);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`h=${(h * 100).toFixed(0)}cm`, dimX + 5, offsetY + footingHeight / 2);
    
    // Effective depth d
    const dimX2 = dimX + 45;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(dimX2, offsetY);
    ctx.lineTo(dimX2, effectiveDepthY);
    ctx.stroke();
    drawArrow(ctx, dimX2, offsetY, 'up', 3);
    drawArrow(ctx, dimX2, effectiveDepthY, 'down', 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`d=${(d * 100).toFixed(1)}cm`, dimX2 + 5, offsetY + (effectiveDepthY - offsetY) / 2);
    
    // Cover annotation (from bottom)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.5;
    const coverDimX = offsetX - 15;
    ctx.beginPath();
    ctx.moveTo(coverDimX, offsetY + footingHeight);
    ctx.lineTo(coverDimX, bottomCoverY);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${inputs.cover}mm`, coverDimX - 3, (offsetY + footingHeight + bottomCoverY) / 2);

    // Legend
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    
    // X-direction bar (red line)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(padding - 15, height - 20);
    ctx.lineTo(padding - 5, height - 20);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${numBarsX}-DB${barSize} @ ${(footing.spacingX || 0).toFixed(0)}mm (X)`, padding, height - 17);
    
    // Y-direction bar (blue circle)
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(padding - 10, height - 5, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${numBarsY}-DB${barSize} @ ${(footing.spacingY || 0).toFixed(0)}mm (Y)`, padding - 5, height - 2);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '7px sans-serif';
    ctx.fillText(`Cover: ${inputs.cover}mm`, padding + 170, height - 9);

    // Title
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('SECTION VIEW (A-A)', width / 2, 15);
  };

  // Helper function to draw arrows
  const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', size: number = 4) => {
    ctx.beginPath();
    if (direction === 'left') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + size, y - size/2);
      ctx.lineTo(x + size, y + size/2);
    } else if (direction === 'right') {
      ctx.moveTo(x, y);
      ctx.lineTo(x - size, y - size/2);
      ctx.lineTo(x - size, y + size/2);
    } else if (direction === 'up') {
      ctx.moveTo(x, y);
      ctx.lineTo(x - size/2, y + size);
      ctx.lineTo(x + size/2, y + size);
    } else if (direction === 'down') {
      ctx.moveTo(x, y);
      ctx.lineTo(x - size/2, y - size);
      ctx.lineTo(x + size/2, y - size);
    }
    ctx.closePath();
    ctx.fill();
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border-2 border-slate-300 dark:border-slate-600 p-2">
        <canvas
          ref={planCanvasRef}
          width={500}
          height={350}
          className="w-full h-auto"
          data-footing-plan={index}
        />
      </div>
      <div className="bg-white rounded-lg border-2 border-slate-300 dark:border-slate-600 p-2">
        <canvas
          ref={sectionCanvasRef}
          width={500}
          height={250}
          className="w-full h-auto"
          data-footing-section={index}
        />
      </div>
    </div>
  );
}
