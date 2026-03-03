'use client';

import { useMemo } from 'react';
import {
  CFSProMember,
  CFSProSectionProperties,
  GrossSectionProperties,
} from '@/types/cfs-pro';

// ============================================================
// SVG SECTION RENDERER
// ============================================================

interface CFSProSectionViewProps {
  members: CFSProMember[];
  sectionProps?: CFSProSectionProperties;
  showCentroid?: boolean;
  showPrincipalAxes?: boolean;
  showEffective?: boolean;
  showShearCenter?: boolean;
  showDimensions?: boolean;
  width?: number;
  height?: number;
}

/**
 * Draw a single CFS member profile as SVG path.
 * Supports C-channel, Z-section, hat, track, and custom profiles.
 * Returns path data in local coordinates, with origin at section mid-depth, web face.
 */
function memberPath(
  geo: { d: number; bf: number; t: number; lipLength: number; radius: number; sectionType?: string },
  detailed: boolean = true
): string {
  const { d, bf, t, lipLength } = geo;
  const halfD = d / 2;
  const type = geo.sectionType || 'C-channel';

  if (type === 'Z-section') {
    // Z-section: bottom flange goes right, top flange goes left
    const pts: [number, number][] = [];
    // Start bottom-right (bottom flange tip)
    if (lipLength > 0) {
      pts.push([bf, -halfD]);
      pts.push([bf, -halfD + lipLength]);
      pts.push([bf - t, -halfD + lipLength]);
    } else {
      pts.push([bf, -halfD]);
      pts.push([bf, -halfD + t]);
    }
    pts.push([bf - t, -halfD + t]);
    pts.push([t, -halfD + t]);
    // Web inner (left side)
    pts.push([t, halfD - t]);
    // Top flange goes LEFT (negative X)
    pts.push([-(bf - t) + t, halfD - t]);
    if (lipLength > 0) {
      pts.push([-(bf - t) + t, halfD - lipLength]);
      pts.push([-(bf - t), halfD - lipLength]);
      pts.push([-(bf - t), halfD]);
    } else {
      pts.push([-(bf - t), halfD - t]);
      pts.push([-(bf - t), halfD]);
    }
    pts.push([0, halfD]);
    // Web outer (left side)
    pts.push([0, -halfD]);
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z';
  }

  if (type === 'hat') {
    // Hat section: web goes down, flanges go outward at top
    const pts: [number, number][] = [];
    // Bottom lip left outer
    pts.push([-bf, -halfD]);
    if (lipLength > 0) {
      pts.push([-bf, -halfD + lipLength]);
      pts.push([-bf + t, -halfD + lipLength]);
    }
    pts.push([-bf + t, -halfD + t]);
    pts.push([-t, -halfD + t]);
    // Left web inner goes up
    pts.push([-t, halfD - t]);
    // Top
    pts.push([t, halfD - t]);
    // Right web inner goes down
    pts.push([t, -halfD + t]);
    pts.push([bf - t, -halfD + t]);
    if (lipLength > 0) {
      pts.push([bf - t, -halfD + lipLength]);
      pts.push([bf, -halfD + lipLength]);
    }
    pts.push([bf, -halfD]);
    // Bottom outer right
    pts.push([bf, -halfD]);
    pts.push([t, -halfD]);
    // Right web outer
    // Actually hat is symmetric: two flanges at bottom, web at sides, top plate
    // Simplified: outer path
    // Use standard envelope
    pts.length = 0;
    pts.push([-bf, -halfD]);             // left flange tip
    pts.push([-bf, -halfD + t]);         // left flange inner
    pts.push([-t, -halfD + t]);          // left web bottom inner
    pts.push([-t, halfD - t]);           // left web top inner
    pts.push([t, halfD - t]);            // right web top inner
    pts.push([t, -halfD + t]);           // right web bottom inner
    pts.push([bf, -halfD + t]);          // right flange inner
    pts.push([bf, -halfD]);              // right flange tip
    pts.push([bf, -halfD]);              // re-start outer
    pts.push([t, -halfD]);              // right web outer bottom
    pts.push([t, halfD]);               // right web outer top
    pts.push([-t, halfD]);              // left web outer top
    pts.push([-t, -halfD]);             // left web outer bottom
    pts.push([-bf, -halfD]);            // close
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z';
  }

  if (type === 'track') {
    // Track: C-channel with no lips
    const pts: [number, number][] = [];
    pts.push([0, -halfD]);
    pts.push([bf, -halfD]);
    pts.push([bf, -halfD + t]);
    pts.push([t, -halfD + t]);
    pts.push([t, halfD - t]);
    pts.push([bf, halfD - t]);
    pts.push([bf, halfD]);
    pts.push([0, halfD]);
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z';
  }

  // Default: C-channel (lipped)
  const lines: string[] = [];
  lines.push(`M 0,${-halfD}`);
  lines.push(`L ${bf},${-halfD}`);
  if (lipLength > 0) {
    lines.push(`L ${bf},${-halfD}`);
    lines.push(`L ${bf},${-halfD + lipLength}`);
    lines.push(`L ${bf - t},${-halfD + lipLength}`);
    lines.push(`L ${bf - t},${-halfD + t}`);
  } else {
    lines.push(`L ${bf},${-halfD}`);
    lines.push(`L ${bf},${-halfD + t}`);
  }
  lines.push(`L ${t},${-halfD + t}`);
  lines.push(`L ${t},${halfD - t}`);
  if (lipLength > 0) {
    lines.push(`L ${bf - t},${halfD - t}`);
    lines.push(`L ${bf - t},${halfD - lipLength}`);
    lines.push(`L ${bf},${halfD - lipLength}`);
    lines.push(`L ${bf},${halfD}`);
  } else {
    lines.push(`L ${bf},${halfD - t}`);
    lines.push(`L ${bf},${halfD}`);
  }
  lines.push(`L 0,${halfD}`);
  lines.push('Z');

  return lines.join(' ');
}

/**
 * Compute bounding box of all members.
 */
function computeBounds(members: CFSProMember[]): {
  minX: number; maxX: number; minY: number; maxY: number;
} {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  members.forEach((m) => {
    const { d, bf } = m.geometry;
    const halfD = d / 2;
    const type = m.geometry.sectionType || 'C-channel';
    const r = ((m.rotation % 360) + 360) % 360;
    const mx = m.mirrored ? -1 : 1;

    // Determine section extents based on type
    let xExtents: number[];
    let yExtents: number[];
    if (type === 'Z-section') {
      xExtents = [-(bf - m.geometry.t), 0, m.geometry.t, bf];
      yExtents = [-halfD, halfD];
    } else if (type === 'hat') {
      xExtents = [-bf, bf];
      yExtents = [-halfD, halfD];
    } else {
      xExtents = [0, bf];
      yExtents = [-halfD, halfD];
    }

    // Generate corners from extents
    const corners: [number, number][] = [];
    for (const x of xExtents) {
      for (const y of yExtents) {
        corners.push([x * mx, y]);
      }
    }

    // Apply rotation
    const rad = (r * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    corners.forEach(([cx, cy]) => {
      const rx = cx * cos - cy * sin;
      const ry = cx * sin + cy * cos;
      const gx = m.offsetX + rx;
      const gy = m.offsetY + ry;
      minX = Math.min(minX, gx);
      maxX = Math.max(maxX, gx);
      minY = Math.min(minY, gy);
      maxY = Math.max(maxY, gy);
    });
  });

  return { minX, maxX, minY, maxY };
}

export function CFSProSectionView({
  members,
  sectionProps,
  showCentroid = true,
  showPrincipalAxes = false,
  showEffective = false,
  showShearCenter = false,
  showDimensions = true,
  width = 400,
  height = 350,
}: CFSProSectionViewProps) {
  const { paths, viewBox, centroid, shearCtr, axisLines, dims } = useMemo(() => {
    if (members.length === 0) {
      return {
        paths: [],
        viewBox: '-100 -100 200 200',
        centroid: null,
        shearCtr: null,
        axisLines: null,
        dims: null,
      };
    }

    const bounds = computeBounds(members);
    const padding = 30;
    const w = bounds.maxX - bounds.minX + padding * 2;
    const h = bounds.maxY - bounds.minY + padding * 2;
    const vb = `${bounds.minX - padding} ${bounds.minY - padding} ${w} ${h}`;

    // Member paths with transforms
    const memberPaths = members.map((m) => {
      const pathD = memberPath(m.geometry);
      const r = m.rotation;
      const mx = m.mirrored ? -1 : 1;
      const transform = `translate(${m.offsetX},${m.offsetY}) rotate(${r}) scale(${mx},1)`;
      return { id: m.id, d: pathD, transform, color: m.color, label: m.label };
    });

    // Centroid
    const cen = sectionProps
      ? { x: sectionProps.gross.xc, y: sectionProps.gross.yc }
      : null;

    // Shear center
    const sc = sectionProps?.shearCenter
      ? { x: sectionProps.shearCenter.xs, y: sectionProps.shearCenter.ys }
      : null;

    // Principal axes
    const axes = sectionProps?.principalAxes && cen
      ? {
          theta: sectionProps.principalAxes.theta,
          cx: cen.x,
          cy: cen.y,
          len: Math.max(w, h) * 0.4,
        }
      : null;

    // Dimensions
    const dimInfo = members.length > 0
      ? {
          totalHeight: bounds.maxY - bounds.minY,
          totalWidth: bounds.maxX - bounds.minX,
          bounds,
        }
      : null;

    return {
      paths: memberPaths,
      viewBox: vb,
      centroid: cen,
      shearCtr: sc,
      axisLines: axes,
      dims: dimInfo,
    };
  }, [members, sectionProps]);

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className="w-full h-full"
      style={{ maxHeight: height }}
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.1" opacity="0.15" />
        </pattern>
      </defs>
      <rect x="-9999" y="-9999" width="19998" height="19998" fill="url(#grid)" />

      {/* Member profiles */}
      {paths.map((p) => (
        <g key={p.id} transform={p.transform}>
          {/* Fill */}
          <path
            d={p.d}
            fill={p.color}
            fillOpacity={showEffective ? 0.2 : 0.35}
            stroke={p.color}
            strokeWidth={1.5}
          />
          {/* Effective outline (slightly thicker) */}
          {showEffective && (
            <path
              d={p.d}
              fill={p.color}
              fillOpacity={0.5}
              stroke={p.color}
              strokeWidth={2}
              strokeDasharray="4,2"
            />
          )}
        </g>
      ))}

      {/* Centroid marker */}
      {showCentroid && centroid && (
        <g>
          <circle cx={centroid.x} cy={centroid.y} r={3} fill="#ef4444" stroke="white" strokeWidth={1} />
          <text x={centroid.x + 6} y={centroid.y - 4} fontSize={8} fill="#ef4444" fontWeight="bold">
            C
          </text>
          {/* Centroidal axes */}
          <line
            x1={centroid.x - 40} y1={centroid.y}
            x2={centroid.x + 40} y2={centroid.y}
            stroke="#ef4444" strokeWidth={0.5} strokeDasharray="3,2"
          />
          <line
            x1={centroid.x} y1={centroid.y - 40}
            x2={centroid.x} y2={centroid.y + 40}
            stroke="#ef4444" strokeWidth={0.5} strokeDasharray="3,2"
          />
        </g>
      )}

      {/* Shear center marker */}
      {showShearCenter && shearCtr && (
        <g>
          <circle cx={shearCtr.x} cy={shearCtr.y} r={3} fill="#8b5cf6" stroke="white" strokeWidth={1} />
          <text x={shearCtr.x + 6} y={shearCtr.y - 4} fontSize={8} fill="#8b5cf6" fontWeight="bold">
            S
          </text>
        </g>
      )}

      {/* Principal axes */}
      {showPrincipalAxes && axisLines && (
        <g>
          {/* Major axis */}
          <line
            x1={axisLines.cx - axisLines.len * Math.cos((axisLines.theta * Math.PI) / 180)}
            y1={axisLines.cy - axisLines.len * Math.sin((axisLines.theta * Math.PI) / 180)}
            x2={axisLines.cx + axisLines.len * Math.cos((axisLines.theta * Math.PI) / 180)}
            y2={axisLines.cy + axisLines.len * Math.sin((axisLines.theta * Math.PI) / 180)}
            stroke="#10b981" strokeWidth={1} strokeDasharray="6,3"
          />
          {/* Minor axis */}
          <line
            x1={axisLines.cx - axisLines.len * Math.cos(((axisLines.theta + 90) * Math.PI) / 180)}
            y1={axisLines.cy - axisLines.len * Math.sin(((axisLines.theta + 90) * Math.PI) / 180)}
            x2={axisLines.cx + axisLines.len * Math.cos(((axisLines.theta + 90) * Math.PI) / 180)}
            y2={axisLines.cy + axisLines.len * Math.sin(((axisLines.theta + 90) * Math.PI) / 180)}
            stroke="#f59e0b" strokeWidth={1} strokeDasharray="6,3"
          />
        </g>
      )}

      {/* Dimensions */}
      {showDimensions && dims && members.length > 0 && (
        <g>
          {/* Overall height */}
          <line
            x1={dims.bounds.maxX + 15} y1={dims.bounds.minY}
            x2={dims.bounds.maxX + 15} y2={dims.bounds.maxY}
            stroke="#64748b" strokeWidth={0.5}
          />
          <text
            x={dims.bounds.maxX + 20}
            y={(dims.bounds.minY + dims.bounds.maxY) / 2}
            fontSize={7} fill="#64748b"
            textAnchor="start"
            dominantBaseline="middle"
          >
            {dims.totalHeight.toFixed(0)} mm
          </text>

          {/* Overall width */}
          <line
            x1={dims.bounds.minX} y1={dims.bounds.maxY + 15}
            x2={dims.bounds.maxX} y2={dims.bounds.maxY + 15}
            stroke="#64748b" strokeWidth={0.5}
          />
          <text
            x={(dims.bounds.minX + dims.bounds.maxX) / 2}
            y={dims.bounds.maxY + 22}
            fontSize={7} fill="#64748b"
            textAnchor="middle"
          >
            {dims.totalWidth.toFixed(0)} mm
          </text>
        </g>
      )}
    </svg>
  );
}

// ============================================================
// SIGNATURE CURVE CHART (SVG)
// ============================================================

interface SignatureCurveChartProps {
  data: { halfWavelength: number; fcr_local: number; fcr_dist: number; fcr_global: number; fcr_envelope: number }[];
  width?: number;
  height?: number;
}

export function SignatureCurveChart({ data, width = 400, height = 200 }: SignatureCurveChartProps) {
  if (!data || data.length === 0) return null;

  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Log-log scale
  const xVals = data.map(d => d.halfWavelength).filter(v => v > 0);
  const yVals = data.flatMap(d => [d.fcr_local, d.fcr_dist, d.fcr_global].filter(v => v > 0 && isFinite(v)));
  
  const xMin = Math.log10(Math.max(xVals[0], 1));
  const xMax = Math.log10(xVals[xVals.length - 1]);
  const yMinRaw = Math.min(...yVals) * 0.5;
  const yMaxRaw = Math.max(...yVals) * 1.3;
  const yMin = Math.log10(Math.max(yMinRaw, 1));
  const yMax = Math.log10(yMaxRaw);

  const scaleX = (v: number) => {
    const logV = Math.log10(Math.max(v, 1));
    return padding.left + ((logV - xMin) / (xMax - xMin)) * plotW;
  };
  const scaleY = (v: number) => {
    const logV = Math.log10(Math.max(v, 1));
    return padding.top + plotH - ((logV - yMin) / (yMax - yMin)) * plotH;
  };

  const pathLine = (key: 'fcr_local' | 'fcr_dist' | 'fcr_global' | 'fcr_envelope') =>
    data
      .filter(d => d[key] > 0 && isFinite(d[key]))
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(d.halfWavelength).toFixed(1)},${scaleY(d[key]).toFixed(1)}`)
      .join(' ');

  // Find minima for markers
  const findMinimum = (key: 'fcr_local' | 'fcr_dist' | 'fcr_global') => {
    let minVal = Infinity;
    let minPt = data[0];
    for (const d of data) {
      if (d[key] > 0 && d[key] < minVal && isFinite(d[key])) {
        minVal = d[key];
        minPt = d;
      }
    }
    return minPt;
  };
  const localMin = findMinimum('fcr_local');
  const distMin = findMinimum('fcr_dist');

  // Generate log-spaced ticks for X axis
  const xTicks: number[] = [];
  for (let exp = Math.ceil(xMin); exp <= Math.floor(xMax); exp++) {
    xTicks.push(Math.pow(10, exp));
    if (exp < Math.floor(xMax)) {
      xTicks.push(2 * Math.pow(10, exp));
      xTicks.push(5 * Math.pow(10, exp));
    }
  }

  // Generate log-spaced ticks for Y axis
  const yTicks: number[] = [];
  for (let exp = Math.ceil(yMin); exp <= Math.floor(yMax); exp++) {
    yTicks.push(Math.pow(10, exp));
    if (exp < Math.floor(yMax)) {
      yTicks.push(2 * Math.pow(10, exp));
      yTicks.push(5 * Math.pow(10, exp));
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="w-full">
      {/* Grid lines */}
      {yTicks.map(v => (
        <line
          key={`yg-${v}`}
          x1={padding.left} y1={scaleY(v)}
          x2={padding.left + plotW} y2={scaleY(v)}
          stroke="#e2e8f0" strokeWidth={0.3}
        />
      ))}
      {xTicks.map(v => (
        <line
          key={`xg-${v}`}
          x1={scaleX(v)} y1={padding.top}
          x2={scaleX(v)} y2={padding.top + plotH}
          stroke="#e2e8f0" strokeWidth={0.3}
        />
      ))}

      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotH} stroke="#94a3b8" strokeWidth={0.5} />
      <line x1={padding.left} y1={padding.top + plotH} x2={padding.left + plotW} y2={padding.top + plotH} stroke="#94a3b8" strokeWidth={0.5} />

      {/* Axis labels */}
      <text x={width / 2} y={height - 4} fontSize={9} fill="#64748b" textAnchor="middle">
        Half-wavelength (mm)
      </text>
      <text x={10} y={height / 2} fontSize={9} fill="#64748b" textAnchor="middle" transform={`rotate(-90,10,${height / 2})`}>
        Buckling Stress (MPa)
      </text>

      {/* Curves */}
      <path d={pathLine('fcr_local')} fill="none" stroke="#3b82f6" strokeWidth={1.5} opacity={0.8} />
      <path d={pathLine('fcr_dist')} fill="none" stroke="#ef4444" strokeWidth={1.5} opacity={0.8} />
      <path d={pathLine('fcr_global')} fill="none" stroke="#10b981" strokeWidth={1.5} opacity={0.8} />
      <path d={pathLine('fcr_envelope')} fill="none" stroke="#0f172a" strokeWidth={2.5} strokeDasharray="6,3" opacity={0.6} />

      {/* Minima markers */}
      {localMin && localMin.fcr_local > 0 && isFinite(localMin.fcr_local) && (
        <g>
          <circle cx={scaleX(localMin.halfWavelength)} cy={scaleY(localMin.fcr_local)} r={3.5} fill="#3b82f6" stroke="white" strokeWidth={1} />
          <text
            x={scaleX(localMin.halfWavelength)} y={scaleY(localMin.fcr_local) - 7}
            fontSize={7} fill="#3b82f6" textAnchor="middle" fontWeight="bold"
          >
            Local: {localMin.fcr_local.toFixed(0)} MPa
          </text>
        </g>
      )}
      {distMin && distMin.fcr_dist > 0 && isFinite(distMin.fcr_dist) && (
        <g>
          <circle cx={scaleX(distMin.halfWavelength)} cy={scaleY(distMin.fcr_dist)} r={3.5} fill="#ef4444" stroke="white" strokeWidth={1} />
          <text
            x={scaleX(distMin.halfWavelength)} y={scaleY(distMin.fcr_dist) - 7}
            fontSize={7} fill="#ef4444" textAnchor="middle" fontWeight="bold"
          >
            Dist: {distMin.fcr_dist.toFixed(0)} MPa @ {distMin.halfWavelength.toFixed(0)}mm
          </text>
        </g>
      )}

      {/* Legend */}
      <g transform={`translate(${padding.left + plotW - 90}, ${padding.top + 5})`}>
        <rect x={-5} y={-3} width={95} height={38} rx={3} fill="white" fillOpacity={0.85} stroke="#e2e8f0" strokeWidth={0.5} />
        <line x1={0} y1={2} x2={12} y2={2} stroke="#3b82f6" strokeWidth={1.5} />
        <text x={16} y={5} fontSize={7} fill="#64748b">Local</text>
        <line x1={0} y1={11} x2={12} y2={11} stroke="#ef4444" strokeWidth={1.5} />
        <text x={16} y={14} fontSize={7} fill="#64748b">Distortional</text>
        <line x1={0} y1={20} x2={12} y2={20} stroke="#10b981" strokeWidth={1.5} />
        <text x={16} y={23} fontSize={7} fill="#64748b">Global</text>
        <line x1={0} y1={29} x2={12} y2={29} stroke="#0f172a" strokeWidth={2} strokeDasharray="3,2" />
        <text x={16} y={32} fontSize={7} fill="#64748b">Envelope</text>
      </g>

      {/* X-axis ticks */}
      {xTicks.filter(v => scaleX(v) >= padding.left && scaleX(v) <= padding.left + plotW).map(v => (
        <g key={`xt-${v}`}>
          <line x1={scaleX(v)} y1={padding.top + plotH} x2={scaleX(v)} y2={padding.top + plotH + 4} stroke="#94a3b8" strokeWidth={0.5} />
          <text
            x={scaleX(v)} y={padding.top + plotH + 14}
            fontSize={7} fill="#94a3b8" textAnchor="middle"
          >
            {v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Y-axis ticks */}
      {yTicks.filter(v => scaleY(v) >= padding.top && scaleY(v) <= padding.top + plotH).map(v => (
        <g key={`yt-${v}`}>
          <line x1={padding.left - 4} y1={scaleY(v)} x2={padding.left} y2={scaleY(v)} stroke="#94a3b8" strokeWidth={0.5} />
          <text
            x={padding.left - 7} y={scaleY(v) + 3}
            fontSize={7} fill="#94a3b8" textAnchor="end"
          >
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
          </text>
        </g>
      ))}
    </svg>
  );
}
