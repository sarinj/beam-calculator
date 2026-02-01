'use client';

import React from 'react';
import { ReinforcementLayer, RoundBar } from '@/types/beam';
import { deformedBarData, roundBarData } from '@/lib/calculations/common';
import { useLanguage } from '@/contexts/LanguageContext';

interface DoubleBeamSectionProps {
  width: number;
  height: number;
  cover: number;
  coverTop: number;
  tensionLayers: ReinforcementLayer[];
  compressionLayers: ReinforcementLayer[];
  stirrupSize: RoundBar;
  effectiveDepth?: number;
  effectiveDepthPrime?: number;
}

export function DoubleBeamSection({
  width,
  height,
  cover,
  coverTop,
  tensionLayers,
  compressionLayers,
  stirrupSize,
  effectiveDepth,
  effectiveDepthPrime,
}: DoubleBeamSectionProps) {
  const { t } = useLanguage();

  // SVG dimensions and scaling
  const padding = 45;
  const maxSvgWidth = 180;
  const maxSvgHeight = 220;

  const scaleX = (maxSvgWidth - padding * 2) / width;
  const scaleY = (maxSvgHeight - padding * 2) / height;
  const scale = Math.min(scaleX, scaleY, 4);

  const svgWidth = width * scale + padding * 2;
  const svgHeight = height * scale + padding * 2;

  const beamX = padding;
  const beamY = padding;
  const beamWidth = width * scale;
  const beamHeight = height * scale;

  const stirrupDia = roundBarData[stirrupSize].diameter / 10;
  const stirrupThickness = stirrupDia * scale;
  const coverPx = cover * scale;
  const coverTopPx = coverTop * scale;

  // Render tension bars (bottom)
  const renderTensionBars = () => {
    if (tensionLayers.length === 0) return null;

    const bars: React.ReactElement[] = [];
    let currentY = beamY + beamHeight - coverPx - stirrupThickness;

    tensionLayers.forEach((layer, layerIndex) => {
      const barDia = deformedBarData[layer.barSize].diameter / 10;
      const barRadius = (barDia * scale) / 2;

      currentY -= barRadius;

      const availableWidth = beamWidth - 2 * coverPx - 2 * stirrupThickness;
      const spacing = layer.count > 1 ? availableWidth / (layer.count - 1) : 0;
      const startX = beamX + coverPx + stirrupThickness + (layer.count === 1 ? availableWidth / 2 : 0);

      for (let i = 0; i < layer.count; i++) {
        const cx = startX + (layer.count > 1 ? i * spacing : 0);
        bars.push(
          <circle
            key={`tension-${layerIndex}-${i}`}
            cx={cx}
            cy={currentY}
            r={barRadius}
            fill="#3b82f6"
            stroke="#1e40af"
            strokeWidth={1}
          />
        );
      }

      currentY -= barRadius;
      if (layerIndex < tensionLayers.length - 1) {
        currentY -= 2.5 * scale;
      }
    });

    return bars;
  };

  // Render compression bars (top)
  const renderCompressionBars = () => {
    if (compressionLayers.length === 0) return null;

    const bars: React.ReactElement[] = [];
    let currentY = beamY + coverTopPx + stirrupThickness;

    compressionLayers.forEach((layer, layerIndex) => {
      const barDia = deformedBarData[layer.barSize].diameter / 10;
      const barRadius = (barDia * scale) / 2;

      currentY += barRadius;

      const availableWidth = beamWidth - 2 * coverTopPx - 2 * stirrupThickness;
      const spacing = layer.count > 1 ? availableWidth / (layer.count - 1) : 0;
      const startX = beamX + coverTopPx + stirrupThickness + (layer.count === 1 ? availableWidth / 2 : 0);

      for (let i = 0; i < layer.count; i++) {
        const cx = startX + (layer.count > 1 ? i * spacing : 0);
        bars.push(
          <circle
            key={`comp-${layerIndex}-${i}`}
            cx={cx}
            cy={currentY}
            r={barRadius}
            fill="#f97316"
            stroke="#c2410c"
            strokeWidth={1}
          />
        );
      }

      currentY += barRadius;
      if (layerIndex < compressionLayers.length - 1) {
        currentY += 2.5 * scale;
      }
    });

    return bars;
  };

  // Render effective depth lines
  const renderDepthLines = () => {
    const lines: React.ReactElement[] = [];

    if (effectiveDepth) {
      const dY = beamY + (height - effectiveDepth) * scale;
      lines.push(
        <g key="d-line">
          <line
            x1={beamX - 8}
            y1={dY}
            x2={beamX + beamWidth + 8}
            y2={dY}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <text
            x={beamX + beamWidth + 12}
            y={dY + 4}
            fontSize={10}
            fill="#3b82f6"
            fontWeight="600"
          >
            d
          </text>
        </g>
      );
    }

    if (effectiveDepthPrime) {
      const dPrimeY = beamY + effectiveDepthPrime * scale;
      lines.push(
        <g key="d-prime-line">
          <line
            x1={beamX - 8}
            y1={dPrimeY}
            x2={beamX + beamWidth + 8}
            y2={dPrimeY}
            stroke="#f97316"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <text
            x={beamX + beamWidth + 12}
            y={dPrimeY + 4}
            fontSize={10}
            fill="#f97316"
            fontWeight="600"
          >
            d&apos;
          </text>
        </g>
      );
    }

    return lines;
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="bg-white"
      >
        {/* Concrete section */}
        <rect
          x={beamX}
          y={beamY}
          width={beamWidth}
          height={beamHeight}
          fill="#f1f5f9"
          stroke="#64748b"
          strokeWidth={2}
        />

        {/* Stirrup outline */}
        <rect
          x={beamX + Math.min(coverPx, coverTopPx)}
          y={beamY + coverTopPx}
          width={beamWidth - 2 * Math.min(coverPx, coverTopPx)}
          height={beamHeight - coverPx - coverTopPx}
          fill="none"
          stroke="#22c55e"
          strokeWidth={stirrupThickness}
          rx={stirrupThickness}
        />

        {/* Compression bars (top) */}
        {renderCompressionBars()}

        {/* Tension bars (bottom) */}
        {renderTensionBars()}

        {/* Depth lines */}
        {renderDepthLines()}

        {/* Dimension lines - Width */}
        <g>
          <line
            x1={beamX}
            y1={beamY + beamHeight + 18}
            x2={beamX + beamWidth}
            y2={beamY + beamHeight + 18}
            stroke="#374151"
            strokeWidth={1}
          />
          <line
            x1={beamX}
            y1={beamY + beamHeight + 12}
            x2={beamX}
            y2={beamY + beamHeight + 24}
            stroke="#374151"
            strokeWidth={1}
          />
          <line
            x1={beamX + beamWidth}
            y1={beamY + beamHeight + 12}
            x2={beamX + beamWidth}
            y2={beamY + beamHeight + 24}
            stroke="#374151"
            strokeWidth={1}
          />
          <text
            x={beamX + beamWidth / 2}
            y={beamY + beamHeight + 35}
            textAnchor="middle"
            fontSize={11}
            fill="#374151"
            fontWeight="500"
          >
            {width} {t('cm')}
          </text>
        </g>

        {/* Dimension lines - Height */}
        <g>
          <line
            x1={beamX - 18}
            y1={beamY}
            x2={beamX - 18}
            y2={beamY + beamHeight}
            stroke="#374151"
            strokeWidth={1}
          />
          <line
            x1={beamX - 24}
            y1={beamY}
            x2={beamX - 12}
            y2={beamY}
            stroke="#374151"
            strokeWidth={1}
          />
          <line
            x1={beamX - 24}
            y1={beamY + beamHeight}
            x2={beamX - 12}
            y2={beamY + beamHeight}
            stroke="#374151"
            strokeWidth={1}
          />
          <text
            x={beamX - 28}
            y={beamY + beamHeight / 2}
            textAnchor="middle"
            fontSize={11}
            fill="#374151"
            fontWeight="500"
            transform={`rotate(-90, ${beamX - 28}, ${beamY + beamHeight / 2})`}
          >
            {height} {t('cm')}
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
          <span>{t('bottomBars')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
          <span>{t('topBars')}</span>
        </div>
      </div>
    </div>
  );
}
