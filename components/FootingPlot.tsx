'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { CalculatedFooting } from '@/types/footing';
import { useEffect, useRef } from 'react';

interface FootingPlotProps {
  footings: CalculatedFooting[];
}

export function FootingPlot({ footings }: FootingPlotProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (footings.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate bounds
    const minX = Math.min(...footings.map((f) => f.x));
    const maxX = Math.max(...footings.map((f) => f.x));
    const minY = Math.min(...footings.map((f) => f.y));
    const maxY = Math.max(...footings.map((f) => f.y));
    const maxDim = Math.max(...footings.map((f) => f.dimension));

    const rangeX = maxX - minX + maxDim * 2;
    const rangeY = maxY - minY + maxDim * 2;

    // Canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Padding
    const padding = 40;
    const plotWidth = canvasWidth - 2 * padding;
    const plotHeight = canvasHeight - 2 * padding;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(padding, padding, plotWidth, plotHeight);

    // Draw border
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, plotWidth, plotHeight);

    // Scale factors
    const scaleX = plotWidth / rangeX;
    const scaleY = plotHeight / rangeY;

    // Helper function to convert coordinates
    const toCanvasX = (x: number) => padding + (x - minX + maxDim) * scaleX;
    const toCanvasY = (y: number) => padding + plotHeight - (y - minY + maxDim) * scaleY;

    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const x = padding + (plotWidth / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (plotHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + plotWidth, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw axes labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // X-axis labels
    for (let i = 0; i <= 5; i++) {
      const xValue = minX + (rangeX / 5) * i - maxDim;
      const xPos = padding + (plotWidth / 5) * i;
      ctx.fillText(xValue.toFixed(1), xPos, canvasHeight - 20);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const yValue = minY + (rangeY / 5) * i - maxDim;
      const yPos = padding + plotHeight - (plotHeight / 5) * i;
      ctx.fillText(yValue.toFixed(1), padding - 10, yPos);
    }

    // Draw footings
    for (let i = 0; i < footings.length; i++) {
      const footing = footings[i];
      const utilRatio = footing.utilizationRatio;

      // Determine color based on utilization ratio
      let fillColor: string;
      let strokeColor: string;

      if (utilRatio > 100) {
        fillColor = '#fee2e2'; // red
        strokeColor = '#dc2626'; // red
      } else if (utilRatio > 85) {
        fillColor = '#fef3c7'; // amber
        strokeColor = '#d97706'; // amber
      } else {
        fillColor = '#dcfce7'; // green
        strokeColor = '#16a34a'; // green
      }

      const centerX = toCanvasX(footing.x);
      const centerY = toCanvasY(footing.y);
      const size = (footing.dimension / 2) * Math.min(scaleX, scaleY);

      // Draw footing square
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.fillRect(centerX - size, centerY - size, size * 2, size * 2);
      ctx.strokeRect(centerX - size, centerY - size, size * 2, size * 2);

      // Draw center point
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(footing.uniqueName, centerX, centerY - size - 15);

      // Draw utilization ratio
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${utilRatio.toFixed(0)}%`, centerX, centerY + size + 12);
    }

    // Draw legend
    const legendX = canvasWidth - 180;
    const legendY = 20;
    const legendItemHeight = 25;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fillRect(legendX - 10, legendY - 10, 170, 100);
    ctx.strokeRect(legendX - 10, legendY - 10, 170, 100);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.fillText('Utilization', legendX + 5, legendY + 5);

    const legendItems = [
      { color: '#16a34a', label: '≤ 85%' },
      { color: '#d97706', label: '85-100%' },
      { color: '#dc2626', label: '> 100%' },
    ];

    ctx.font = '11px sans-serif';
    legendItems.forEach((item, index) => {
      const itemY = legendY + 25 + index * legendItemHeight;
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 5, itemY, 12, 12);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(legendX + 5, itemY, 12, 12);

      ctx.fillStyle = '#1e293b';
      ctx.fillText(item.label, legendX + 25, itemY + 6);
    });
  }, [footings]);

  if (footings.length === 0) {
    return (
      <Card className="p-4 h-96 flex items-center justify-center">
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          {t('noDataFound')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 overflow-hidden">
      <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
        {t('footingPlot')}
      </h3>
      <div className="overflow-x-auto bg-slate-50 dark:bg-slate-800 rounded">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full"
        />
      </div>
    </Card>
  );
}
