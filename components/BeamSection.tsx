'use client';

import React from 'react';
import { ReinforcementLayer, RoundBar } from '@/types/beam';
import { deformedBarData, roundBarData } from '@/lib/calculations/common';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

interface BeamSectionProps {
  width: number;
  height: number;
  cover: number;
  layers: ReinforcementLayer[];
  stirrupSize: RoundBar;
  effectiveDepth?: number;
}

export function BeamSection({
  width,
  height,
  cover,
  layers,
  stirrupSize,
  effectiveDepth,
}: BeamSectionProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // SVG dimensions and scaling
  const padding = 45;
  const maxSvgWidth = 180;
  const maxSvgHeight = 220;

  // Calculate scale to fit the beam
  const scaleX = (maxSvgWidth - padding * 2) / width;
  const scaleY = (maxSvgHeight - padding * 2) / height;
  const scale = Math.min(scaleX, scaleY, 4);

  const svgWidth = width * scale + padding * 2;
  const svgHeight = height * scale + padding * 2;

  // Beam position
  const beamX = padding;
  const beamY = padding;
  const beamWidth = width * scale;
  const beamHeight = height * scale;

  // Stirrup dimensions
  const stirrupDia = roundBarData[stirrupSize].diameter / 10;
  const stirrupThickness = stirrupDia * scale;
  const coverPx = cover * scale;

  // Colors based on theme
  const colors = {
    concrete: isDark ? '#475569' : '#f1f5f9',
    concreteStroke: isDark ? '#94a3b8' : '#64748b',
    dimension: isDark ? '#94a3b8' : '#374151',
  };

  // Function to render reinforcement bars
  const renderBars = () => {
    if (layers.length === 0) return null;

    const bars: React.ReactElement[] = [];
    let currentY = beamY + beamHeight - coverPx - stirrupThickness;

    layers.forEach((layer, layerIndex) => {
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
            key={`bar-${layerIndex}-${i}`}
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
      if (layerIndex < layers.length - 1) {
        currentY -= 2.5 * scale;
      }
    });

    return bars;
  };

  // Render effective depth line
  const renderEffectiveDepthLine = () => {
    if (!effectiveDepth) return null;

    const dY = beamY + (height - effectiveDepth) * scale;

    return (
      <g>
        <line
          x1={beamX - 8}
          y1={dY}
          x2={beamX + beamWidth + 8}
          y2={dY}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
        <text
          x={beamX + beamWidth + 12}
          y={dY + 4}
          fontSize={10}
          fill="#ef4444"
          fontWeight="600"
        >
          d
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="bg-white dark:bg-slate-800 rounded"
      >
        {/* Concrete section */}
        <rect
          x={beamX}
          y={beamY}
          width={beamWidth}
          height={beamHeight}
          fill={colors.concrete}
          stroke={colors.concreteStroke}
          strokeWidth={2}
        />

        {/* Stirrup outline */}
        <rect
          x={beamX + coverPx}
          y={beamY + coverPx}
          width={beamWidth - 2 * coverPx}
          height={beamHeight - 2 * coverPx}
          fill="none"
          stroke="#22c55e"
          strokeWidth={stirrupThickness}
          rx={stirrupThickness}
        />

        {/* Reinforcement bars */}
        {renderBars()}

        {/* Effective depth line */}
        {renderEffectiveDepthLine()}

        {/* Dimension lines - Width */}
        <g>
          <line
            x1={beamX}
            y1={beamY + beamHeight + 18}
            x2={beamX + beamWidth}
            y2={beamY + beamHeight + 18}
            stroke={colors.dimension}
            strokeWidth={1}
          />
          <line
            x1={beamX}
            y1={beamY + beamHeight + 12}
            x2={beamX}
            y2={beamY + beamHeight + 24}
            stroke={colors.dimension}
            strokeWidth={1}
          />
          <line
            x1={beamX + beamWidth}
            y1={beamY + beamHeight + 12}
            x2={beamX + beamWidth}
            y2={beamY + beamHeight + 24}
            stroke={colors.dimension}
            strokeWidth={1}
          />
          <text
            x={beamX + beamWidth / 2}
            y={beamY + beamHeight + 35}
            textAnchor="middle"
            fontSize={11}
            fill={colors.dimension}
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
            stroke={colors.dimension}
            strokeWidth={1}
          />
          <line
            x1={beamX - 24}
            y1={beamY}
            x2={beamX - 12}
            y2={beamY}
            stroke={colors.dimension}
            strokeWidth={1}
          />
          <line
            x1={beamX - 24}
            y1={beamY + beamHeight}
            x2={beamX - 12}
            y2={beamY + beamHeight}
            stroke={colors.dimension}
            strokeWidth={1}
          />
          <text
            x={beamX - 28}
            y={beamY + beamHeight / 2}
            textAnchor="middle"
            fontSize={11}
            fill={colors.dimension}
            fontWeight="500"
            transform={`rotate(-90, ${beamX - 28}, ${beamY + beamHeight / 2})`}
          >
            {height} {t('cm')}
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
          <span>{t('mainBars')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm border-2 border-green-500"></div>
          <span>{t('stirrups')}</span>
        </div>
      </div>
    </div>
  );
}
