'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { CalculatedFooting } from '@/types/footing';
import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';

interface FootingPlotProps {
  footings: CalculatedFooting[];
}

interface DisplayOptions {
  showFooting: boolean;
  showDimension: boolean;
  showUtilization: boolean;
  showUniqueName: boolean;
}

export function FootingPlot({ footings }: FootingPlotProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showFooting: true,
    showDimension: true,
    showUtilization: true,
    showUniqueName: false,
  });
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('png');

  const toggleOption = (key: keyof DisplayOptions) => {
    setDisplayOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

    // Canvas dimensions - High resolution (4800x3000 for print quality)
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Optimized padding for better fit
    const padding = 30;
    const plotWidth = canvasWidth - 2 * padding;
    const plotHeight = canvasHeight - 2 * padding;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Save context state for transformations
    ctx.save();
    
    // Apply pan and zoom transformations
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvasWidth / 2 + panX, -canvasHeight / 2 + panY);

    // Draw border with thin line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.strokeRect(padding, padding, plotWidth, plotHeight);

    // Scale factors
    const scaleX = plotWidth / rangeX;
    const scaleY = plotHeight / rangeY;

    // Helper function to convert coordinates
    const toCanvasX = (x: number) => padding + (x - minX + maxDim) * scaleX;
    const toCanvasY = (y: number) => padding + plotHeight - (y - minY + maxDim) * scaleY;

    // Draw grid with thinner lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);

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

    // Draw axes labels - Much larger font
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // X-axis labels
    for (let i = 0; i <= 5; i++) {
      const xValue = minX + (rangeX / 5) * i - maxDim;
      const xPos = padding + (plotWidth / 5) * i;
      ctx.fillText(xValue.toFixed(1), xPos, canvasHeight - 50);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const yValue = minY + (rangeY / 5) * i - maxDim;
      const yPos = padding + plotHeight - (plotHeight / 5) * i;
      ctx.fillText(yValue.toFixed(1), padding - 40, yPos);
    }

    // Draw axis titles
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('X (m)', canvasWidth / 2, canvasHeight - 10);
    
    ctx.save();
    ctx.translate(30, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y (m)', 0, 0);
    ctx.restore();

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

      // Draw footing square only if enabled
      if (displayOptions.showFooting) {
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.fillRect(centerX - size, centerY - size, size * 2, size * 2);
        ctx.strokeRect(centerX - size, centerY - size, size * 2, size * 2);

        // Draw center point
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Build label based on display options
      let labelParts = [];
      if (displayOptions.showDimension) {
        labelParts.push(`${footing.dimension.toFixed(2)}x${footing.dimension.toFixed(2)}`);
      }
      if (displayOptions.showUtilization) {
        labelParts.push(`(${utilRatio.toFixed(2)}%)`);
      }
      if (displayOptions.showUniqueName) {
        labelParts.push(footing.uniqueName);
      }

      // Draw label if any options are selected
      if (labelParts.length > 0) {
        const label = labelParts.join(' ');
        ctx.fillStyle = '#1e293b';
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, centerX, centerY + size + 40);
      }
    }
    
    // Restore context state
    ctx.restore();
  }, [footings, displayOptions, panX, panY, zoom]);

  // Handle mouse wheel for zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = e.deltaY > 0 ? zoom - zoomSpeed : zoom + zoomSpeed;
    setZoom(Math.max(0.5, Math.min(newZoom, 3))); // Limit zoom between 0.5x and 3x
  };

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  // Handle mouse move to pan
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle mouse leave to stop dragging
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Reset pan and zoom
  const handleResetView = () => {
    setPanX(0);
    setPanY(0);
    setZoom(1);
  };

  // Download canvas in selected format (PNG or JPEG - high resolution)
  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const timestamp = new Date().getTime();
    const link = document.createElement('a');
    
    switch (downloadFormat) {
      case 'png':
        link.href = canvas.toDataURL('image/png');
        link.download = `footing-layout-${timestamp}.png`;
        break;
      case 'jpeg':
        // Higher quality JPEG (0.98 quality for high resolution output)
        link.href = canvas.toDataURL('image/jpeg', 0.98);
        link.download = `footing-layout-${timestamp}.jpg`;
        break;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    <Card className="p-4 overflow-hidden flex flex-col h-full">
      <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
        {t('footingPlot')}
      </h3>

      {/* Canvas - High Resolution with Pan and Zoom */}
      <div 
        ref={containerRef}
        className={`flex-1 bg-slate-50 dark:bg-slate-800 rounded mb-3 min-h-0 overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="w-full h-full overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={4800}
            height={3000}
            className="border border-slate-200 dark:border-slate-700"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Bottom Controls and Legend */}
      <div className="flex flex-col gap-2">
        {/* Display Options Checkboxes */}
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs items-center">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-footing"
              checked={displayOptions.showFooting}
              onChange={() => toggleOption('showFooting')}
              className="w-3 h-3 cursor-pointer"
            />
            <Label htmlFor="show-footing" className="cursor-pointer">
              Footing
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-dimension"
              checked={displayOptions.showDimension}
              onChange={() => toggleOption('showDimension')}
              className="w-3 h-3 cursor-pointer"
            />
            <Label htmlFor="show-dimension" className="cursor-pointer">
              Sizing of footing
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-utilization"
              checked={displayOptions.showUtilization}
              onChange={() => toggleOption('showUtilization')}
              className="w-3 h-3 cursor-pointer"
            />
            <Label htmlFor="show-utilization" className="cursor-pointer">
              % Utilization
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-unique-name"
              checked={displayOptions.showUniqueName}
              onChange={() => toggleOption('showUniqueName')}
              className="w-3 h-3 cursor-pointer"
            />
            <Label htmlFor="show-unique-name" className="cursor-pointer">
              Footing Unique Name
            </Label>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2">
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'jpeg')}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="png">PNG (Lossless)</option>
              <option value="jpeg">JPEG (High Quality)</option>
            </select>
            <button
              onClick={handleDownloadImage}
              className="px-3 py-1 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 rounded text-xs font-medium text-white transition-colors"
              title="Download footing layout"
            >
              ⬇ Download
            </button>
          </div>
          <button
            onClick={handleResetView}
            className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            title="Reset zoom and pan (Ctrl+0)"
          >
            Reset View
          </button>
        </div>

        {/* Separated Legend with Color */}
        <div className="flex items-center gap-3 p-2 border-t dark:border-slate-700 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#dcfce7', border: '2px solid #16a34a' }}></div>
            <span className="text-slate-600 dark:text-slate-400">≤ 85%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fef3c7', border: '2px solid #d97706' }}></div>
            <span className="text-slate-600 dark:text-slate-400">85-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fee2e2', border: '2px solid #dc2626' }}></div>
            <span className="text-slate-600 dark:text-slate-400">&gt; 100%</span>
          </div>
          <div className="flex-1"></div>
        </div>
      </div>
    </Card>
  );
}
