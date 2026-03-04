'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  DSMGeometry,
  DSMMember,
  DSMShearParams,
  DSMDesignResult,
  DSMCalcStep,
  DSMSignatureCurvePoint,
  performDSMDesign,
} from '@/lib/calculations/dsm-simple';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { exportSimpleCFSPdf } from '@/lib/dsm-simple-pdf-export';

// ============================================================
// SHARED PRIMITIVES
// ============================================================

function NumInput({
  label, value, onChange, unit, step = 1, min, max, tooltip,
}: {
  label: string; value: number; onChange: (v: number) => void;
  unit?: string; step?: number; min?: number; max?: number; tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5" title={tooltip}>
      <label className="text-sm text-slate-600 dark:text-slate-400 w-32 shrink-0 truncate">
        {label}
      </label>
      <input
        type="number" value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step} min={min} max={max}
        className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {unit && <span className="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">{unit}</span>}
    </div>
  );
}

function SelInput({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <label className="text-sm text-slate-600 dark:text-slate-400 w-32 shrink-0 truncate">
        {label}
      </label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ============================================================
// SECTION DIAGRAM (SVG)
// ============================================================

function SectionDiagram({ geo }: { geo: DSMGeometry }) {
  const { d, bf, t, lipLength, r } = geo;

  // Scale to fit 280×280 viewport
  const maxDim = Math.max(d, bf, 1);
  const scale = 240 / maxDim;
  const sw = bf * scale;
  const sh = d * scale;
  const st = Math.max(t * scale, 2);
  const sl = lipLength * scale;
  const ox = (280 - sw) / 2;
  const oy = (280 - sh) / 2;

  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-[280px] mx-auto">
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-slate-200 dark:text-slate-700" />
        </pattern>
      </defs>
      <rect width="280" height="280" fill="url(#grid)" />

      {/* C-section outline */}
      <g stroke="currentColor" strokeWidth="1.5" fill="none" className="text-blue-600 dark:text-blue-400">
        {/* Outer profile */}
        {lipLength > 0 ? (
          <polyline points={`
            ${ox + sw},${oy + sl}
            ${ox + sw},${oy}
            ${ox},${oy}
            ${ox},${oy + sh}
            ${ox + sw},${oy + sh}
            ${ox + sw},${oy + sh - sl}
          `} />
        ) : (
          <polyline points={`
            ${ox + sw},${oy}
            ${ox},${oy}
            ${ox},${oy + sh}
            ${ox + sw},${oy + sh}
          `} />
        )}

        {/* Inner profile */}
        {lipLength > 0 ? (
          <polyline points={`
            ${ox + sw - st},${oy + sl}
            ${ox + sw - st},${oy + st}
            ${ox + st},${oy + st}
            ${ox + st},${oy + sh - st}
            ${ox + sw - st},${oy + sh - st}
            ${ox + sw - st},${oy + sh - sl}
          `} strokeDasharray="3 2" strokeWidth="0.8" />
        ) : (
          <polyline points={`
            ${ox + sw - st},${oy + st}
            ${ox + st},${oy + st}
            ${ox + st},${oy + sh - st}
            ${ox + sw - st},${oy + sh - st}
          `} strokeDasharray="3 2" strokeWidth="0.8" />
        )}
      </g>

      {/* Dimension labels */}
      <g className="text-slate-600 dark:text-slate-400" fill="currentColor" fontSize="9" fontFamily="monospace">
        {/* d (web height) */}
        <text x={ox - 8} y={oy + sh / 2} textAnchor="end" dominantBaseline="middle">d={d}</text>
        <line x1={ox - 3} y1={oy} x2={ox - 3} y2={oy + sh} stroke="currentColor" strokeWidth="0.5" markerStart="url(#arrowS)" markerEnd="url(#arrowE)" />

        {/* bf (flange width) */}
        <text x={ox + sw / 2} y={oy + sh + 16} textAnchor="middle">bf={bf}</text>

        {/* t (thickness) */}
        <text x={ox + sw / 2} y={oy - 6} textAnchor="middle" fontSize="8">t={t}</text>

        {/* lip */}
        {lipLength > 0 && (
          <text x={ox + sw + 6} y={oy + sl / 2} textAnchor="start" dominantBaseline="middle" fontSize="8">lip={lipLength}</text>
        )}
      </g>
    </svg>
  );
}

// ============================================================
// SIGNATURE CURVE CHART
// ============================================================

function SignatureCurveChart({ data, fy }: { data: DSMSignatureCurvePoint[]; fy: number }) {
  if (!data.length) return null;

  const W = 600, H = 300;
  const pad = { t: 20, r: 30, b: 40, l: 60 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // Logarithmic scales
  const xMin = Math.log10(data[0].halfWavelength);
  const xMax = Math.log10(data[data.length - 1].halfWavelength);
  const maxStress = Math.min(
    Math.max(...data.map(p => Math.min(p.fcr_local, p.fcr_dist, p.fcr_global))) * 3,
    fy * 5
  );
  const yMin = 0;
  const yMax = maxStress;

  const toX = (v: number) => pad.l + ((Math.log10(v) - xMin) / (xMax - xMin)) * pw;
  const toY = (v: number) => pad.t + ph - ((Math.min(v, yMax) - yMin) / (yMax - yMin)) * ph;

  const makePath = (accessor: (p: DSMSignatureCurvePoint) => number) =>
    data.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.halfWavelength).toFixed(1)},${toY(accessor(p)).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <rect width={W} height={H} className="fill-white dark:fill-slate-800" rx="4" />

      {/* Grid lines */}
      {[10, 100, 1000, 10000].map(v => (
        <g key={v}>
          <line x1={toX(v)} y1={pad.t} x2={toX(v)} y2={pad.t + ph} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="0.5" />
          <text x={toX(v)} y={H - 8} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="9">{v}</text>
        </g>
      ))}
      {[0.25, 0.5, 0.75, 1.0].map(f => {
        const v = f * yMax;
        return (
          <g key={f}>
            <line x1={pad.l} y1={toY(v)} x2={pad.l + pw} y2={toY(v)} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="0.5" />
            <text x={pad.l - 5} y={toY(v) + 3} textAnchor="end" className="fill-slate-500 dark:fill-slate-400" fontSize="9">{v.toFixed(0)}</text>
          </g>
        );
      })}

      {/* Fy reference line */}
      <line x1={pad.l} y1={toY(fy)} x2={pad.l + pw} y2={toY(fy)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" />
      <text x={pad.l + pw + 2} y={toY(fy) + 3} fontSize="8" className="fill-red-500">fy</text>

      {/* Curves */}
      <path d={makePath(p => p.fcr_local)} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      <path d={makePath(p => p.fcr_dist)} fill="none" stroke="#10b981" strokeWidth="1.5" />
      <path d={makePath(p => p.fcr_global)} fill="none" stroke="#f59e0b" strokeWidth="1.5" />

      {/* Axis labels */}
      <text x={pad.l + pw / 2} y={H - 2} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" fontSize="10">Half-wavelength (mm)</text>
      <text x={12} y={pad.t + ph / 2} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" fontSize="10" transform={`rotate(-90, 12, ${pad.t + ph / 2})`}>Buckling stress (MPa)</text>

      {/* Legend */}
      <g transform={`translate(${pad.l + 10}, ${pad.t + 10})`}>
        <rect width="110" height="52" rx="3" className="fill-white/80 dark:fill-slate-800/80" stroke="none" />
        <line x1="5" y1="10" x2="20" y2="10" stroke="#3b82f6" strokeWidth="2" />
        <text x="25" y="13" fontSize="9" className="fill-slate-600 dark:fill-slate-300">Local</text>
        <line x1="5" y1="25" x2="20" y2="25" stroke="#10b981" strokeWidth="2" />
        <text x="25" y="28" fontSize="9" className="fill-slate-600 dark:fill-slate-300">Distortional</text>
        <line x1="5" y1="40" x2="20" y2="40" stroke="#f59e0b" strokeWidth="2" />
        <text x="25" y="43" fontSize="9" className="fill-slate-600 dark:fill-slate-300">Global (LTB)</text>
      </g>
    </svg>
  );
}

// ============================================================
// CALCULATION STEPS PANEL
// ============================================================

function CalcStepPanel({ step, index }: { step: DSMCalcStep; index: number }) {
  const [open, setOpen] = useState(index < 3);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            {step.clause}
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Step {index + 1}: {step.title}
          </span>
        </div>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3">
          {/* Equations */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Equations</p>
            <div className="space-y-0.5">
              {step.equations.map((eq, i) => (
                <p key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                  {eq}
                </p>
              ))}
            </div>
          </div>

          {/* Values */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Results</p>
            <table className="w-full text-xs">
              <tbody>
                {step.values.map((v, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                    <td className="py-1 pr-3 text-slate-600 dark:text-slate-400">{v.label}</td>
                    <td className="py-1 font-mono font-semibold text-right text-slate-800 dark:text-slate-100">{v.value}</td>
                    <td className="py-1 pl-1 text-slate-500 dark:text-slate-400 w-12">{v.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUMMARY BOX
// ============================================================

function SummaryBox({ result }: { result: DSMDesignResult }) {
  const { capacity, buckling, shear } = result;
  const modeColors: Record<string, string> = {
    'local': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    'distortional': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
    'lateral-torsional': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  };

  return (
    <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 p-5 space-y-4">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
        Design Capacity Summary
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-white/70 dark:bg-slate-800/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Nominal Moment</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{capacity.Mn.toFixed(3)}</p>
          <p className="text-xs text-slate-500">kN·m</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 ring-2 ring-blue-400 dark:ring-blue-600">
          <p className="text-xs text-slate-500 dark:text-slate-400">Design Moment (ϕMn)</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{capacity.phiMn.toFixed(3)}</p>
          <p className="text-xs text-slate-500">kN·m</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/70 dark:bg-slate-800/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Yield Moment</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{buckling.My.toFixed(3)}</p>
          <p className="text-xs text-slate-500">kN·m</p>
        </div>
      </div>

      {/* Governing mode */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${modeColors[capacity.governingMode] ?? ''}`}>
        Governing mode: {capacity.governingMode.replace('-', '-​')}
      </div>

      {/* DSM capacities bar */}
      <div className="space-y-1.5">
        {[
          { label: 'Mbe (LTB)', value: capacity.Mbe, color: 'bg-amber-400' },
          { label: 'Mbl (Local)', value: capacity.Mbl, color: 'bg-blue-400' },
          ...(capacity.Mbd > 0 ? [{ label: 'Mbd (Distortional)', value: capacity.Mbd, color: 'bg-green-400' }] : []),
        ].map((item) => {
          const maxVal = Math.max(capacity.Mbe, capacity.Mbl, capacity.Mbd, buckling.My) || 1;
          const pct = (item.value / maxVal) * 100;
          return (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span className="w-28 text-slate-600 dark:text-slate-400">{item.label}</span>
              <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <span className="w-16 text-right font-mono text-slate-700 dark:text-slate-300">{item.value.toFixed(3)}</span>
            </div>
          );
        })}
      </div>

      {/* Slenderness */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded bg-white/60 dark:bg-slate-800/60">
          <span className="text-slate-500">λl (local):</span>
          <span className="ml-1 font-mono font-semibold text-slate-700 dark:text-slate-200">{capacity.lambdaL.toFixed(4)}</span>
          <span className="ml-1 text-slate-400">{capacity.lambdaL <= 0.776 ? '≤ 0.776 ✓' : '> 0.776'}</span>
        </div>
        <div className="p-2 rounded bg-white/60 dark:bg-slate-800/60">
          <span className="text-slate-500">λd (dist.):</span>
          <span className="ml-1 font-mono font-semibold text-slate-700 dark:text-slate-200">
            {capacity.lambdaD > 0 ? capacity.lambdaD.toFixed(4) : 'N/A'}
          </span>
          {capacity.lambdaD > 0 && (
            <span className="ml-1 text-slate-400">{capacity.lambdaD <= 0.673 ? '≤ 0.673 ✓' : '> 0.673'}</span>
          )}
        </div>
      </div>

      {/* ── Shear Summary ── */}
      {shear && (
        <div className="border-t border-blue-200 dark:border-blue-800 pt-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Shear Capacity – Cl. 3.3.4</h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <p className="text-xs text-slate-500 dark:text-slate-400">Nominal Shear</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{shear.Vn.toFixed(3)}</p>
              <p className="text-xs text-slate-500">kN</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 ring-2 ring-orange-400 dark:ring-orange-600">
              <p className="text-xs text-slate-500 dark:text-slate-400">Design Shear (ϕVn)</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{shear.phiVn.toFixed(3)}</p>
              <p className="text-xs text-slate-500">kN</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <p className="text-xs text-slate-500 dark:text-slate-400">Yield Shear</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{shear.Vy.toFixed(3)}</p>
              <p className="text-xs text-slate-500">kN</p>
            </div>
          </div>

          {/* Shear governing mode */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${
            shear.shearMode === 'yielding'
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
              : shear.shearMode === 'inelastic-buckling'
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
          }`}>
            Shear mode: {shear.shearMode}
          </div>

          {/* Shear bar chart */}
          <div className="space-y-1.5">
            {[
              { label: 'Vy (yield)', value: shear.Vy, color: 'bg-green-400' },
              { label: 'Vcr (buckling)', value: shear.Vcr, color: 'bg-red-400' },
              { label: 'Vn (nominal)', value: shear.Vn, color: 'bg-orange-400' },
            ].map((item) => {
              const maxVal = Math.max(shear.Vy, shear.Vcr, shear.Vn) || 1;
              const pct = (item.value / maxVal) * 100;
              return (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-slate-600 dark:text-slate-400">{item.label}</span>
                  <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="w-16 text-right font-mono text-slate-700 dark:text-slate-300">{item.value.toFixed(3)}</span>
                </div>
              );
            })}
          </div>

          {/* Shear slenderness */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded bg-white/60 dark:bg-slate-800/60">
              <span className="text-slate-500">λv (shear):</span>
              <span className="ml-1 font-mono font-semibold text-slate-700 dark:text-slate-200">{shear.lambda_v.toFixed(4)}</span>
              <span className="ml-1 text-slate-400">
                {shear.lambda_v <= 0.815 ? '≤ 0.815 (yield) ✓' : shear.lambda_v <= 1.227 ? '≤ 1.227 (inelastic)' : '> 1.227 (elastic)'}
              </span>
            </div>
            <div className="p-2 rounded bg-white/60 dark:bg-slate-800/60">
              <span className="text-slate-500">kv:</span>
              <span className="ml-1 font-mono font-semibold text-slate-700 dark:text-slate-200">{shear.kv.toFixed(3)}</span>
              <span className="ml-1 text-slate-400">τcr = {shear.tau_cr.toFixed(1)} MPa</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION PRESET DATA
// ============================================================

interface SectionPreset {
  label: string;
  d: number;
  bf: number;
  t: number;
  lip: number;
  r: number;
}

interface PresetGroup {
  name: string;
  fy?: number;
  presets: SectionPreset[];
}

const PRESET_GROUPS: PresetGroup[] = [
  {
    name: 'General',
    presets: [
      { label: '75C10 (unlipped)', d: 75, bf: 40, t: 1.0, lip: 0, r: 3 },
      { label: '100C12', d: 100, bf: 50, t: 1.2, lip: 15, r: 3 },
      { label: '150C15', d: 150, bf: 65, t: 1.5, lip: 18, r: 4 },
      { label: '200C19', d: 200, bf: 75, t: 1.9, lip: 20, r: 4 },
      { label: '250C24', d: 250, bf: 75, t: 2.4, lip: 20, r: 5 },
      { label: '300C30', d: 300, bf: 90, t: 3.0, lip: 25, r: 5 },
      { label: '200C19 (unlipped)', d: 200, bf: 75, t: 1.9, lip: 0, r: 4 },
    ],
  },
  // ── C2.3.1 Wall Studs (G2, Fy=270 MPa, Z275) ──
  {
    name: 'Wall Studs – Light (G2)',
    fy: 270,
    presets: [
      { label: '401 D50.8',  d: 50.8, bf: 35.4, t: 0.50, lip: 5.0, r: 0.90 },
      { label: '112 D63.5',  d: 63.5, bf: 35.4, t: 0.50, lip: 5.0, r: 0.90 },
      { label: '403 D76.2',  d: 76.2, bf: 35.4, t: 0.55, lip: 5.0, r: 0.90 },
      { label: '251 D92.1',  d: 92.1, bf: 35.4, t: 0.55, lip: 5.0, r: 0.90 },
    ],
  },
  {
    name: 'Wall Studs – Medium (G2)',
    fy: 270,
    presets: [
      { label: '489 D50.8',  d: 50.8, bf: 35.4, t: 0.75, lip: 5.0, r: 0.90 },
      { label: '491 D63.5',  d: 63.5, bf: 35.4, t: 0.75, lip: 5.0, r: 0.90 },
      { label: '493 D76.2',  d: 76.2, bf: 35.4, t: 0.75, lip: 5.0, r: 0.90 },
      { label: '495 D92.1',  d: 92.1, bf: 35.4, t: 0.75, lip: 5.0, r: 0.90 },
      { label: '511 D150',   d: 150,  bf: 36.0, t: 0.75, lip: 6.4, r: 0.90 },
    ],
  },
  {
    name: 'Wall Studs – Heavy (G2)',
    fy: 270,
    presets: [
      { label: '661 D63.5',  d: 63.5, bf: 36.0, t: 1.15, lip: 6.4, r: 2.00 },
      { label: '671 D76.2',  d: 76.2, bf: 36.0, t: 1.15, lip: 6.4, r: 2.00 },
      { label: '681 D92.1',  d: 92.1, bf: 36.0, t: 1.15, lip: 6.4, r: 2.00 },
      { label: '691 D150',   d: 150,  bf: 36.0, t: 1.15, lip: 6.4, r: 2.00 },
    ],
  },
  // ── C2.3.2 Wall Tracks (G2, Fy=270 MPa, unlipped U-channel) ──
  {
    name: 'Wall Tracks – Light (G2)',
    fy: 270,
    presets: [
      { label: '400 D52.5',  d: 52.5, bf: 29.0, t: 0.50, lip: 0, r: 0.90 },
      { label: '111 D65.2',  d: 65.2, bf: 29.0, t: 0.50, lip: 0, r: 0.90 },
      { label: '402 D77.9',  d: 77.9, bf: 29.0, t: 0.50, lip: 0, r: 0.90 },
      { label: '250 D93.8',  d: 93.8, bf: 29.0, t: 0.50, lip: 0, r: 0.90 },
    ],
  },
  {
    name: 'Wall Tracks – Medium (G2)',
    fy: 270,
    presets: [
      { label: '490 D53.1',  d: 53.1, bf: 29.0, t: 0.70, lip: 0, r: 0.90 },
      { label: '492 D65.8',  d: 65.8, bf: 29.0, t: 0.70, lip: 0, r: 0.90 },
      { label: '494 D78.5',  d: 78.5, bf: 29.0, t: 0.70, lip: 0, r: 0.90 },
      { label: '496 D94.4',  d: 94.4, bf: 29.0, t: 0.70, lip: 0, r: 0.90 },
    ],
  },
  {
    name: 'Wall Tracks – Heavy (G2)',
    fy: 270,
    presets: [
      { label: '660 D65.9',  d: 65.9, bf: 32.0, t: 1.15, lip: 0, r: 2.00 },
      { label: '670 D78.6',  d: 78.6, bf: 32.0, t: 1.15, lip: 0, r: 2.00 },
      { label: '680 D94.5',  d: 94.5, bf: 32.0, t: 1.15, lip: 0, r: 2.00 },
    ],
  },
  // ── C2.3.3 Deflection Head Tracks (G2, Fy=270 MPa, unlipped U-channel) ──
  {
    name: 'Defl. Head Tracks – Light (G2)',
    fy: 270,
    presets: [
      { label: '479 D52.5',  d: 52.50, bf: 45.6, t: 0.50, lip: 0, r: 0.90 },
      { label: '480 D65.2',  d: 65.20, bf: 45.6, t: 0.50, lip: 0, r: 0.90 },
      { label: '482 D77.9',  d: 77.90, bf: 45.6, t: 0.50, lip: 0, r: 0.90 },
      { label: '483 D93.8',  d: 93.80, bf: 45.6, t: 0.50, lip: 0, r: 0.90 },
    ],
  },
  {
    name: 'Defl. Head Tracks – Medium (G2)',
    fy: 270,
    presets: [
      { label: '488 D53.1',   d: 53.10,  bf: 45.6, t: 0.70, lip: 0, r: 0.90 },
      { label: '497 D65.8',   d: 65.80,  bf: 45.6, t: 0.70, lip: 0, r: 0.90 },
      { label: '498 D78.5',   d: 78.50,  bf: 45.6, t: 0.70, lip: 0, r: 0.90 },
      { label: '499 D94.4',   d: 94.40,  bf: 45.6, t: 0.70, lip: 0, r: 0.90 },
      { label: '510 D152.4',  d: 152.40, bf: 50.0, t: 0.75, lip: 0, r: 0.90 },
    ],
  },
  {
    name: 'Defl. Head Tracks – Heavy (G2)',
    fy: 270,
    presets: [
      { label: '663 D65.9',   d: 65.90,  bf: 50.0, t: 1.15, lip: 0, r: 2.00 },
      { label: '673 D78.6',   d: 78.60,  bf: 50.0, t: 1.15, lip: 0, r: 2.00 },
      { label: '683 D94.5',   d: 94.50,  bf: 50.0, t: 1.15, lip: 0, r: 2.00 },
      { label: '690 D152.4',  d: 152.40, bf: 50.0, t: 1.15, lip: 0, r: 2.00 },
    ],
  },
];

// ============================================================
// MAIN CALCULATOR COMPONENT
// ============================================================

export function SimpleCFSCalculator() {
  const { t } = useLanguage();

  // ── Material defaults (G450 steel) ──
  const [fy, setFy] = useState(450);
  const [E, setE] = useState(200000);
  const [nu, setNu] = useState(0.3);

  // ── Section geometry defaults (200C19) ──
  const [d, setD] = useState(200);
  const [bf, setBf] = useState(75);
  const [tVal, setT] = useState(1.9);
  const [lipLength, setLipLength] = useState(20);
  const [rVal, setR] = useState(4);

  // ── Member defaults ──
  const [Lb, setLb] = useState(3000);
  const [Cb, setCb] = useState(1.0);
  const [endCondition, setEndCondition] = useState<'pinned-pinned' | 'fixed-free' | 'fixed-pinned' | 'fixed-fixed'>('pinned-pinned');

  // ── Shear defaults ──
  const [shearPanelLength, setShearPanelLength] = useState(0);
  const [hasStiffeners, setHasStiffeners] = useState(false);
  const [stiffenerSpacing, setStiffenerSpacing] = useState(300);

  // ── Active tab ──
  const [activeTab, setActiveTab] = useState<'summary' | 'steps' | 'curve' | 'shear'>('summary');

  // Build inputs
  const geo: DSMGeometry = useMemo(() => ({
    d, bf, t: tVal, lipLength, r: rVal,
  }), [d, bf, tVal, lipLength, rVal]);

  const member: DSMMember = useMemo(() => ({
    Lb, Cb, endCondition,
  }), [Lb, Cb, endCondition]);

  const shearParams: DSMShearParams = useMemo(() => ({
    a: shearPanelLength,
    hasStiffeners,
    stiffenerSpacing: hasStiffeners ? stiffenerSpacing : 0,
  }), [shearPanelLength, hasStiffeners, stiffenerSpacing]);

  // ── Compute results ──
  const result = useMemo(() => {
    try {
      return performDSMDesign(geo, member, fy, E, nu, shearParams);
    } catch {
      return null;
    }
  }, [geo, member, fy, E, nu, shearParams]);

  // ── Preset sections ──
  const [presetCategory, setPresetCategory] = useState(0);

  const applyPreset = useCallback((groupIdx: number, presetIdx: number) => {
    const group = PRESET_GROUPS[groupIdx];
    const p = group.presets[presetIdx];
    setD(p.d); setBf(p.bf); setT(p.t); setLipLength(p.lip); setR(p.r);
    if (group.fy) setFy(group.fy);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Simple CFS – DSM Flexural & Shear Capacity
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AS/NZS 4600:2018 · Direct Strength Method + Cl. 3.3.4 Shear · Single C-Section
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (result) {
                  exportSimpleCFSPdf(result, geo, member, shearParams, fy, E, nu);
                }
              }}
              disabled={!result}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Export A4 Calculation Report (PDF)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF Report
            </button>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── LEFT: INPUTS ─── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Preset */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Section Presets</h2>
              <select
                value={presetCategory}
                onChange={(e) => setPresetCategory(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
              >
                {PRESET_GROUPS.map((g, i) => (
                  <option key={i} value={i}>{g.name}</option>
                ))}
              </select>
              {PRESET_GROUPS[presetCategory].fy && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1.5">
                  G2 Steel · Fy = {PRESET_GROUPS[presetCategory].fy} MPa (auto-set)
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_GROUPS[presetCategory].presets.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(presetCategory, i)}
                    title={`D=${p.d} bf=${p.bf} t=${p.t}${p.lip > 0 ? ` lip=${p.lip}` : ''} r=${p.r}`}
                    className="text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-slate-600 dark:text-slate-300"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Material */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4 space-y-1">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Material Properties</h2>
              <NumInput label="Yield stress (fy)" value={fy} onChange={setFy} unit="MPa" step={10} min={200} max={700} />
              <NumInput label="Elastic modulus (E)" value={E} onChange={setE} unit="MPa" step={1000} min={150000} max={250000} />
              <NumInput label="Poisson's ratio (ν)" value={nu} onChange={setNu} unit="" step={0.01} min={0.2} max={0.4} />
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                G = E/[2(1+ν)] = {(E / (2 * (1 + nu))).toFixed(0)} MPa
              </div>
            </div>

            {/* Geometry */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4 space-y-1">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Section Geometry</h2>
              <NumInput label="Web depth (d)" value={d} onChange={setD} unit="mm" step={5} min={30} max={600} />
              <NumInput label="Flange width (bf)" value={bf} onChange={setBf} unit="mm" step={5} min={20} max={300} />
              <NumInput label="Thickness (t)" value={tVal} onChange={setT} unit="mm" step={0.1} min={0.4} max={10} />
              <NumInput label="Lip length" value={lipLength} onChange={setLipLength} unit="mm" step={1} min={0} max={100} tooltip="0 for unlipped channel" />
              <NumInput label="Inside radius (r)" value={rVal} onChange={setR} unit="mm" step={0.5} min={0} max={20} />
              <div className="mt-2">
                <SectionDiagram geo={geo} />
              </div>
            </div>

            {/* Member */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4 space-y-1">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Member Properties</h2>
              <NumInput label="Unbraced length (Lb)" value={Lb} onChange={setLb} unit="mm" step={100} min={100} max={20000} />
              <NumInput label="Cb (moment gradient)" value={Cb} onChange={setCb} unit="" step={0.05} min={1.0} max={3.0} tooltip="1.0 = uniform moment" />
              <SelInput
                label="End condition"
                value={endCondition}
                onChange={(v) => setEndCondition(v as typeof endCondition)}
                options={[
                  { value: 'pinned-pinned', label: 'Pinned–Pinned (Ke=1.0)' },
                  { value: 'fixed-pinned', label: 'Fixed–Pinned (Ke=0.7)' },
                  { value: 'fixed-fixed', label: 'Fixed–Fixed (Ke=0.5)' },
                  { value: 'fixed-free', label: 'Fixed–Free (Ke=2.0)' },
                ]}
              />
            </div>

            {/* Shear Properties */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4 space-y-1">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Shear Properties – Cl. 3.3.4</h2>
              <NumInput label="Panel length (a)" value={shearPanelLength} onChange={setShearPanelLength} unit="mm" step={50} min={0} max={20000} tooltip="0 = infinite panel (kv=5.34)" />
              <div className="flex items-center gap-2 py-0.5">
                <label className="text-sm text-slate-600 dark:text-slate-400 w-32 shrink-0">Stiffeners</label>
                <button
                  onClick={() => setHasStiffeners(!hasStiffeners)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    hasStiffeners
                      ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {hasStiffeners ? 'Yes – Transverse stiffeners' : 'No stiffeners'}
                </button>
              </div>
              {hasStiffeners && (
                <NumInput label="Stiffener spacing" value={stiffenerSpacing} onChange={setStiffenerSpacing} unit="mm" step={25} min={50} max={5000} />
              )}
            </div>
          </div>

          {/* ─── RIGHT: RESULTS ─── */}
          <div className="lg:col-span-8 space-y-4">
            {result ? (
              <>
                {/* Summary */}
                <SummaryBox result={result} />

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  {(['summary', 'steps', 'shear', 'curve'] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`flex-1 text-sm py-2 rounded-md transition-colors font-medium ${
                        activeTab === tab
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'summary' ? 'Gross Properties' : tab === 'steps' ? 'Bending Steps' : tab === 'shear' ? 'Shear Steps' : 'Signature Curve'}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {activeTab === 'summary' && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Gross Section Properties – Cl. 2.1
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      {[
                        { label: 'Ag', value: result.grossProps.Ag.toFixed(1), unit: 'mm²' },
                        { label: 'Ix', value: result.grossProps.Ix.toFixed(0), unit: 'mm⁴' },
                        { label: 'Iy', value: result.grossProps.Iy.toFixed(0), unit: 'mm⁴' },
                        { label: 'Sx', value: result.grossProps.Sx.toFixed(1), unit: 'mm³' },
                        { label: 'rx', value: result.grossProps.rx.toFixed(2), unit: 'mm' },
                        { label: 'ry', value: result.grossProps.ry.toFixed(2), unit: 'mm' },
                        { label: 'J', value: result.grossProps.J.toFixed(1), unit: 'mm⁴' },
                        { label: 'Cw', value: result.grossProps.Cw.toExponential(3), unit: 'mm⁶' },
                        { label: 'xc', value: result.grossProps.xc.toFixed(2), unit: 'mm' },
                      ].map((prop) => (
                        <div key={prop.label} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{prop.label}</p>
                          <p className="font-mono font-semibold text-slate-800 dark:text-slate-100">{prop.value}</p>
                          <p className="text-xs text-slate-400">{prop.unit}</p>
                        </div>
                      ))}
                    </div>

                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 pt-3">
                      Elastic Buckling Values
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      {[
                        { label: 'fol', value: result.buckling.fol.toFixed(2), unit: 'MPa' },
                        { label: 'fod', value: result.buckling.fod > 0 ? result.buckling.fod.toFixed(2) : 'N/A', unit: 'MPa' },
                        { label: 'Mol', value: result.buckling.Mol.toFixed(3), unit: 'kN·m' },
                        { label: 'Mod', value: result.buckling.Mod > 0 ? result.buckling.Mod.toFixed(3) : 'N/A', unit: 'kN·m' },
                        { label: 'Mo', value: result.buckling.Mo > 0 ? result.buckling.Mo.toFixed(3) : '∞', unit: 'kN·m' },
                        { label: 'My', value: result.buckling.My.toFixed(3), unit: 'kN·m' },
                        { label: 'Lcrd', value: result.buckling.Lcrd > 0 ? result.buckling.Lcrd.toFixed(1) : 'N/A', unit: 'mm' },
                      ].map((prop) => (
                        <div key={prop.label} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{prop.label}</p>
                          <p className="font-mono font-semibold text-slate-800 dark:text-slate-100">{prop.value}</p>
                          <p className="text-xs text-slate-400">{prop.unit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'steps' && (
                  <div className="space-y-2">
                    {result.steps.map((step, i) => (
                      <CalcStepPanel key={i} step={step} index={i} />
                    ))}
                  </div>
                )}

                {activeTab === 'shear' && result.shear && (
                  <div className="space-y-2">
                    {result.shear.steps.map((step, i) => (
                      <CalcStepPanel key={i} step={step} index={i} />
                    ))}
                  </div>
                )}

                {activeTab === 'curve' && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Buckling Signature Curve (Simplified FSM Approximation)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Shows the variation of elastic buckling stress with half-wavelength.
                      The minima identify local, distortional, and global buckling modes.
                      Based on plate buckling theory and energy-based approximations consistent
                      with CUFSM / THIN-WALL-2 methodology.
                    </p>
                    <SignatureCurveChart data={result.signatureCurve} fy={fy} />

                    <div className="grid grid-cols-3 gap-3 text-xs mt-3">
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-center">
                        <p className="text-blue-600 dark:text-blue-400 font-semibold">Local minimum</p>
                        <p className="font-mono text-slate-700 dark:text-slate-300">{result.buckling.fol.toFixed(1)} MPa</p>
                      </div>
                      <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 text-center">
                        <p className="text-green-600 dark:text-green-400 font-semibold">Distortional minimum</p>
                        <p className="font-mono text-slate-700 dark:text-slate-300">
                          {result.buckling.fod > 0 ? `${result.buckling.fod.toFixed(1)} MPa` : 'N/A'}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/20 text-center">
                        <p className="text-amber-600 dark:text-amber-400 font-semibold">Global (at Lb)</p>
                        <p className="font-mono text-slate-700 dark:text-slate-300">
                          {result.buckling.Mo > 0 ? `Mo = ${result.buckling.Mo.toFixed(2)} kN·m` : '∞'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Method note */}
                <div className="text-xs text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <p className="font-semibold mb-1">Design Method: AS/NZS 4600:2018</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><strong>Bending – Direct Strength Method (DSM) only:</strong></li>
                    <li>Cl. 7.2.2.2 – Lateral-torsional buckling (Mbe)</li>
                    <li>Cl. 7.2.2.3 – Local buckling with LTB interaction (Mbl)</li>
                    <li>Cl. 7.2.2.4 – Distortional buckling (Mbd)</li>
                    <li>Cl. D2.1.1 – Elastic LTB moment (Mo)</li>
                    <li><strong>Shear – Cl. 3.3.4:</strong></li>
                    <li>Cl. 3.3.4 – Shear capacity of webs (τcr, kv, λv)</li>
                    <li>kv per aspect ratio for stiffened/unstiffened webs</li>
                    <li>Capacity reduction factor ϕ = 0.90</li>
                    <li>No Effective Width Method (EWM) used for bending</li>
                    <li>No AISI specification referenced</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700">
                <p className="text-slate-400">Enter section properties to see results</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
