'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  CFSProAssembly,
  CFSProAnalysisParams,
  CFSProResults,
  CFSProMember,
  CFSProSectionType,
  BuiltUpPreset,
  ConnectionType,
  BendingAxis,
  EndCondition,
  WarpingCondition,
  FEMSettings,
  BucklingMode,
} from '@/types/cfs-pro';
import {
  performCFSProAnalysis,
  createPresetAssembly,
  createDefaultMember,
  defaultAnalysisParams,
  exportModelJSON,
  resetIdCounter,
} from '@/lib/calculations/cfs-pro-engine';
import { CFSProSectionView, SignatureCurveChart } from '@/components/CFSProSectionView';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { exportCFSProPDF } from '@/lib/cfs-pro-pdf-export';
import type { ViewMode, DeformationMode } from '@/lib/3d/cfs-3d-geometry';
import type { CFS3DViewerHandle } from '@/components/CFS3DViewer';

// Dynamic import of 3D viewer (requires browser APIs)
const CFS3DViewer = dynamic(
  () => import('@/components/CFS3DViewer').then((mod) => ({ default: mod.CFS3DViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-800 rounded-lg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-500">Loading 3D Engine…</span>
        </div>
      </div>
    ),
  }
);

// ============================================================
// SHARED UI PRIMITIVES
// ============================================================

function NumInput({
  label, value, onChange, unit, step = 1, min, max, tooltip,
}: {
  label: string; value: number; onChange: (v: number) => void;
  unit?: string; step?: number; min?: number; max?: number; tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5" title={tooltip}>
      <label className="text-sm text-slate-600 dark:text-slate-400 w-28 shrink-0 truncate">
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
      <label className="text-sm text-slate-600 dark:text-slate-400 w-28 shrink-0 truncate">
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

function ToggleInput({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-pointer select-none"
    >
      <div className={`relative w-10 h-[22px] rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <div className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full transition-transform shadow ${checked ? 'translate-x-[18px]' : ''}`} />
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{label}</span>
    </button>
  );
}

function SectionHeader({ children, clause }: { children: React.ReactNode; clause?: string }) {
  return (
    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 mt-3 pb-1 border-b dark:border-slate-700 flex items-center gap-2">
      {children}
      {clause && <span className="text-[10px] font-normal text-slate-400">[{clause}]</span>}
    </h3>
  );
}

function ResultRow({
  label, value, unit, highlight, status, clause,
}: {
  label: string; value: string | number; unit?: string;
  highlight?: boolean; status?: 'ok' | 'ng' | 'warn' | null; clause?: string;
}) {
  const bg = status === 'ok' ? 'bg-green-50 dark:bg-green-900/20'
    : status === 'ng' ? 'bg-red-50 dark:bg-red-900/20'
    : status === 'warn' ? 'bg-amber-50 dark:bg-amber-900/20'
    : highlight ? 'bg-blue-50 dark:bg-blue-900/20' : '';
  const color = status === 'ok' ? 'text-green-700 dark:text-green-400'
    : status === 'ng' ? 'text-red-700 dark:text-red-400'
    : status === 'warn' ? 'text-amber-700 dark:text-amber-400'
    : 'text-slate-800 dark:text-slate-200';

  return (
    <div className={`flex items-center justify-between py-1 px-2 rounded text-xs ${bg}`}>
      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
        {label}
        {clause && <span className="text-[9px] text-slate-400">[{clause}]</span>}
      </span>
      <span className={`font-mono font-medium ${color}`}>
        {typeof value === 'number' ? (Math.abs(value) > 1e6 ? value.toExponential(2) : value.toFixed(2)) : value}
        {unit && <span className="text-[10px] text-slate-500 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function ModeTag({ mode, governing }: { mode: string; governing?: boolean }) {
  const colorMap: Record<string, string> = {
    local: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    distortional: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    'lateral-torsional': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${colorMap[mode] || 'bg-slate-100 text-slate-600'} ${governing ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
      {mode}
      {governing && ' ★'}
    </span>
  );
}

// ============================================================
// TAB SYSTEM
// ============================================================

type Tab = 'geometry' | 'material' | 'design' | 'fem';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'geometry', label: 'Geometry', icon: '⬡' },
    { key: 'material', label: 'Material', icon: '◆' },
    { key: 'design', label: 'Design', icon: '⚙' },
    { key: 'fem', label: 'FEM', icon: '▦' },
  ];
  return (
    <div className="flex border-b dark:border-slate-700 mb-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 ${
            active === t.key
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="text-[10px]">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
//  RESULT TAB SYSTEM
// ============================================================

type ResultTab = 'summary' | 'ewm' | 'bending' | 'shear' | 'compression' | 'interaction' | 'fem' | 'steps';

function ResultTabBar({ active, onChange, femEnabled }: { active: ResultTab; onChange: (t: ResultTab) => void; femEnabled: boolean }) {
  const tabs: { key: ResultTab; label: string }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'ewm', label: 'EWM' },
    { key: 'bending', label: 'Bending' },
    { key: 'shear', label: 'Shear' },
    { key: 'compression', label: 'Compress.' },
    { key: 'interaction', label: 'Interact.' },
    ...(femEnabled ? [{ key: 'fem' as ResultTab, label: 'FEM' }] : []),
    { key: 'steps', label: 'Steps' },
  ];
  return (
    <div className="flex flex-wrap border-b dark:border-slate-700 mb-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-2 py-1 text-[10px] font-medium border-b-2 transition-colors ${
            active === t.key
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// MEMBER EDITOR CARD
// ============================================================

function MemberEditorCard({
  member,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  canRemove,
  defaultCollapsed = false,
}: {
  member: CFSProMember;
  index: number;
  onUpdate: (m: CFSProMember) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canRemove: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const updateGeo = (key: string, value: number) => {
    onUpdate({
      ...member,
      geometry: { ...member.geometry, [key]: value },
    });
  };

  const g = member.geometry;
  const summaryText = `${member.sectionType} ${g.d}×${g.bf}×${g.t}`;

  return (
    <div className="border dark:border-slate-700 rounded-lg mb-2 overflow-hidden" style={{ borderLeftColor: member.color, borderLeftWidth: 3 }}>
      {/* Collapsible header - always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${collapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{member.label}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{summaryText}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="Duplicate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              title="Remove"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          )}
        </div>
      </button>

      {/* Expandable body */}
      {!collapsed && (
        <div className="p-3 pt-2 border-t dark:border-slate-700/50">
          <input
            value={member.label}
            onChange={(e) => onUpdate({ ...member, label: e.target.value })}
            className="text-xs font-semibold bg-transparent border-b border-dashed dark:border-slate-600 text-slate-700 dark:text-slate-200 w-32 mb-2"
            placeholder="Member label"
          />

          <SelInput
            label="Section Type"
            value={member.sectionType}
            onChange={(v) => {
              const geoType = (['C-channel', 'Z-section', 'hat', 'custom'].includes(v) ? v : 'custom') as 'C-channel' | 'Z-section' | 'hat' | 'custom';
              onUpdate({ ...member, sectionType: v as CFSProSectionType, geometry: { ...member.geometry, sectionType: geoType } });
            }}
            options={[
              { value: 'C-channel', label: 'C-Channel (Lipped)' },
              { value: 'Z-section', label: 'Z-Section' },
              { value: 'hat', label: 'Hat Section' },
              { value: 'track', label: 'Track (Unlipped)' },
              { value: 'custom', label: 'Custom Profile' },
            ]}
          />

          <div className="space-y-1 mt-2">
            <NumInput label="Depth d" value={member.geometry.d} onChange={(v) => updateGeo('d', v)} unit="mm" step={5} min={50} />
            <NumInput label="Flange bf" value={member.geometry.bf} onChange={(v) => updateGeo('bf', v)} unit="mm" step={5} min={20} />
            <NumInput label="Thickness t" value={member.geometry.t} onChange={(v) => updateGeo('t', v)} unit="mm" step={0.1} min={0.4} />
            <NumInput label="Lip" value={member.geometry.lipLength} onChange={(v) => updateGeo('lipLength', v)} unit="mm" step={1} min={0} />
            <NumInput label="Radius r" value={member.geometry.radius} onChange={(v) => updateGeo('radius', v)} unit="mm" step={0.5} min={0} />
          </div>

          <SectionHeader>Position & Orientation</SectionHeader>
          <div className="space-y-1">
            <NumInput label="Offset X" value={member.offsetX} onChange={(v) => onUpdate({ ...member, offsetX: v })} unit="mm" step={5} />
            <NumInput label="Offset Y" value={member.offsetY} onChange={(v) => onUpdate({ ...member, offsetY: v })} unit="mm" step={5} />
            <SelInput
              label="Rotation"
              value={String(member.rotation)}
              onChange={(v) => onUpdate({ ...member, rotation: parseInt(v) })}
              options={[
                { value: '0', label: '0°' },
                { value: '90', label: '90°' },
                { value: '180', label: '180°' },
                { value: '270', label: '270°' },
              ]}
            />
            <ToggleInput label="Mirror" checked={member.mirrored} onChange={(v) => onUpdate({ ...member, mirrored: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CFSProCalculator() {
  const { t } = useLanguage();
  const viewer3DRef = useRef<CFS3DViewerHandle>(null);

  // State
  const [assembly, setAssembly] = useState<CFSProAssembly>(() => createPresetAssembly('single'));
  const [params, setParams] = useState<CFSProAnalysisParams>(defaultAnalysisParams);
  const [activeTab, setActiveTab] = useState<Tab>('geometry');
  const [resultTab, setResultTab] = useState<ResultTab>('summary');
  const [showCentroid, setShowCentroid] = useState(true);
  const [showPrincipalAxes, setShowPrincipalAxes] = useState(false);
  const [showEffective, setShowEffective] = useState(false);
  const [showShearCenter, setShowShearCenter] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // 3D viewport state
  const [viewMode, setViewMode] = useState<ViewMode>('solid');
  const [deformationMode, setDeformationMode] = useState<DeformationMode>('none');
  const [deformationScale, setDeformationScale] = useState(3);
  const [animating, setAnimating] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCutPlane, setShowCutPlane] = useState(false);
  const [cutPlanePosition, setCutPlanePosition] = useState(0.5);
  const [centerView, setCenterView] = useState<'3d' | '2d'>('3d');

  // Derived results (live recalculation)
  const results = useMemo<CFSProResults | null>(() => {
    try {
      if (assembly.members.length === 0) return null;
      return performCFSProAnalysis(assembly, params);
    } catch {
      return null;
    }
  }, [assembly, params]);

  // Callbacks
  const setPreset = useCallback((preset: string) => {
    setAssembly(createPresetAssembly(preset));
  }, []);

  const addMember = useCallback(() => {
    const m = createDefaultMember(0, 0, 0, false, `Member ${assembly.members.length + 1}`);
    setAssembly((prev) => ({ ...prev, members: [...prev.members, m] }));
  }, [assembly.members.length]);

  const duplicateMember = useCallback((id: string) => {
    setAssembly((prev) => {
      const source = prev.members.find((m) => m.id === id);
      if (!source) return prev;
      const newId = `m-dup-${Date.now()}`;
      const dup: CFSProMember = {
        ...source,
        id: newId,
        label: `${source.label} (copy)`,
        offsetX: source.offsetX + 10,
        offsetY: source.offsetY + 10,
      };
      return { ...prev, members: [...prev.members, dup] };
    });
  }, []);

  const removeMember = useCallback((id: string) => {
    setAssembly((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
    }));
  }, []);

  const updateMember = useCallback((id: string, updated: CFSProMember) => {
    setAssembly((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? updated : m)),
    }));
  }, []);

  const updateParam = useCallback(<K extends keyof CFSProAnalysisParams>(key: K, value: CFSProAnalysisParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMaterial = useCallback((key: string, value: number) => {
    setParams((prev) => ({
      ...prev,
      material: { ...prev.material, [key]: value, G: key === 'E' || key === 'nu' ? value : prev.material.G },
    }));
    if (key === 'E' || key === 'nu') {
      setParams((prev) => ({
        ...prev,
        material: { ...prev.material, G: prev.material.E / (2 * (1 + prev.material.nu)) },
      }));
    }
  }, []);

  const updateFEM = useCallback((key: string, value: boolean | number | string) => {
    setParams((prev) => ({
      ...prev,
      fem: { ...prev.fem, [key]: value } as FEMSettings,
    }));
  }, []);

  const handleExportJSON = useCallback(() => {
    const json = exportModelJSON(assembly, params, results || undefined);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cfs-pro-${assembly.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [assembly, params, results]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const model = JSON.parse(reader.result as string);
          if (model.assembly) setAssembly(model.assembly);
          if (model.params) setParams(model.params);
        } catch {
          alert('Invalid JSON model file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleExportPDF = useCallback(() => {
    if (!results) return;
    exportCFSProPDF(assembly, params, results);
  }, [assembly, params, results]);

  // ── Governing mode color
  const modeColor = (mode: BucklingMode) =>
    mode === 'local' ? 'text-blue-600' : mode === 'distortional' ? 'text-orange-600' : 'text-purple-600';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* ── HEADER ── */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b dark:border-slate-700 sticky top-0 z-20">
        <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-blue-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                CFS PRO+
                <span className="text-[10px] font-normal bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                  AS/NZS 4600:2018
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Cold-Formed Steel Structural Analysis Platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleImportJSON} className="px-2.5 py-1 text-[10px] font-medium border rounded text-slate-600 dark:text-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Import
            </button>
            <button onClick={handleExportJSON} className="px-2.5 py-1 text-[10px] font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              Export JSON
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!results}
              className="px-2.5 py-1 text-[10px] font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Export PDF
            </button>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* ── MAIN 3-PANEL LAYOUT ── */}
      <div className="flex-1 flex min-h-0 max-w-[1920px] mx-auto w-full">

        {/* ── LEFT PANEL: Inputs ── */}
        <aside className="w-[420px] shrink-0 border-r dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
          <div className="p-3">
            {/* Preset selector */}
            <SectionHeader>Assembly Preset</SectionHeader>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {(['single', 'back-to-back', 'face-to-face', 'box', 'I-section', 'custom'] as BuiltUpPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-2 py-1.5 text-[10px] font-medium rounded border transition-colors ${
                    assembly.preset === p
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300'
                  }`}
                >
                  {p === 'back-to-back' ? 'B2B' : p === 'face-to-face' ? 'F2F' : p === 'I-section' ? 'I-Shape' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab navigation */}
            <TabBar active={activeTab} onChange={setActiveTab} />

            {/* ── GEOMETRY TAB ── */}
            {activeTab === 'geometry' && (
              <div>
                {assembly.members.map((m, i) => (
                  <MemberEditorCard
                    key={m.id}
                    member={m}
                    index={i}
                    onUpdate={(updated) => updateMember(m.id, updated)}
                    onRemove={() => removeMember(m.id)}
                    onDuplicate={() => duplicateMember(m.id)}
                    canRemove={assembly.members.length > 1}
                    defaultCollapsed={i > 0}
                  />
                ))}
                <button
                  onClick={addMember}
                  className="w-full py-2 text-xs font-medium text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  + Add Member
                </button>

                {/* Connection settings */}
                {assembly.members.length > 1 && (
                  <>
                    <SectionHeader clause="Cl. 4.3">Connection</SectionHeader>
                    <SelInput
                      label="Type"
                      value={assembly.connectionType}
                      onChange={(v) => setAssembly((prev) => ({ ...prev, connectionType: v as ConnectionType }))}
                      options={[
                        { value: 'screw', label: 'Screw' },
                        { value: 'weld', label: 'Weld' },
                        { value: 'rivet', label: 'Rivet' },
                        { value: 'bolt', label: 'Bolt' },
                      ]}
                    />
                    <NumInput
                      label="Spacing" value={assembly.fastenerSpacing}
                      onChange={(v) => setAssembly((prev) => ({ ...prev, fastenerSpacing: v }))}
                      unit="mm" step={25} min={25}
                    />
                    <NumInput
                      label="Capacity" value={assembly.fastenerCapacity}
                      onChange={(v) => setAssembly((prev) => ({ ...prev, fastenerCapacity: v }))}
                      unit="kN" step={0.5} min={0}
                    />
                  </>
                )}
              </div>
            )}

            {/* ── MATERIAL TAB ── */}
            {activeTab === 'material' && (
              <div className="space-y-1">
                <SectionHeader clause="Cl. 1.5">Material Properties</SectionHeader>
                <NumInput label="fy" value={params.material.fy} onChange={(v) => updateMaterial('fy', v)} unit="MPa" step={10} />
                <NumInput label="fu" value={params.material.fu} onChange={(v) => updateMaterial('fu', v)} unit="MPa" step={10} />
                <NumInput label="E" value={params.material.E} onChange={(v) => updateMaterial('E', v)} unit="MPa" step={1000} />
                <NumInput label="ν" value={params.material.nu} onChange={(v) => updateMaterial('nu', v)} step={0.01} min={0} max={0.5} />
                <ResultRow label="G (derived)" value={(params.material.E / (2 * (1 + params.material.nu))).toFixed(0)} unit="MPa" />

                {/* Presets */}
                <SectionHeader>Material Presets</SectionHeader>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: 'G450', fy: 450, fu: 480 },
                    { label: 'G550', fy: 550, fu: 550 },
                    { label: 'G350', fy: 350, fu: 430 },
                    { label: 'G300', fy: 300, fu: 340 },
                    { label: 'G250', fy: 250, fu: 320 },
                    { label: 'G500', fy: 500, fu: 520 },
                  ].map((m) => (
                    <button
                      key={m.label}
                      onClick={() => {
                        updateMaterial('fy', m.fy);
                        updateMaterial('fu', m.fu);
                      }}
                      className="px-2 py-1.5 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-600 hover:border-blue-300 transition-colors bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    >
                      {m.label} (fy={m.fy})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── DESIGN TAB (Member + Loads combined) ── */}
            {activeTab === 'design' && (
              <div className="space-y-1">
                <SectionHeader clause="Cl. 3.3.3.2">Member Parameters</SectionHeader>
                <NumInput label="Lb (unbraced)" value={params.Lb} onChange={(v) => updateParam('Lb', v)} unit="mm" step={100} min={100} />
                <NumInput label="Lc (compression)" value={params.Lc} onChange={(v) => updateParam('Lc', v)} unit="mm" step={100} min={100} />
                <NumInput label="Cb (gradient)" value={params.Cb} onChange={(v) => updateParam('Cb', v)} step={0.05} min={1} tooltip="Moment gradient factor (1.0 = uniform)" />
                <SelInput
                  label="Bending Axis"
                  value={params.bendingAxis}
                  onChange={(v) => updateParam('bendingAxis', v as BendingAxis)}
                  options={[
                    { value: 'major', label: 'Major Axis (x-x)' },
                    { value: 'minor', label: 'Minor Axis (y-y)' },
                  ]}
                />
                <SelInput
                  label="End Condition"
                  value={params.endCondition}
                  onChange={(v) => updateParam('endCondition', v as EndCondition)}
                  options={[
                    { value: 'pinned-pinned', label: 'Pinned-Pinned (Ke=1.0)' },
                    { value: 'fixed-pinned', label: 'Fixed-Pinned (Ke=0.7)' },
                    { value: 'fixed-fixed', label: 'Fixed-Fixed (Ke=0.5)' },
                    { value: 'fixed-free', label: 'Fixed-Free (Ke=2.0)' },
                  ]}
                />
                <SelInput
                  label="Warping"
                  value={params.warpingCondition}
                  onChange={(v) => updateParam('warpingCondition', v as WarpingCondition)}
                  options={[
                    { value: 'free', label: 'Warping Free' },
                    { value: 'restrained', label: 'Warping Restrained' },
                  ]}
                />

                <SectionHeader>Design Actions (ULS)</SectionHeader>
                <NumInput label="M* (moment)" value={params.Mstar} onChange={(v) => updateParam('Mstar', v)} unit="kN·m" step={0.5} min={0} />
                <NumInput label="V* (shear)" value={params.Vstar} onChange={(v) => updateParam('Vstar', v)} unit="kN" step={1} min={0} />
                <NumInput label="N* (compression)" value={params.Nstar} onChange={(v) => updateParam('Nstar', v)} unit="kN" step={1} min={0} />
              </div>
            )}

            {/* ── FEM TAB ── */}
            {activeTab === 'fem' && (
              <div className="space-y-2">
                <SectionHeader>FEM Eigenvalue Buckling Analysis</SectionHeader>

                {/* Enable toggle - prominent */}
                <div className={`p-3 rounded-lg border-2 transition-colors ${
                  params.fem.enabled
                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                }`}>
                  <ToggleInput label="Enable FEM Analysis" checked={params.fem.enabled} onChange={(v) => {
                    updateFEM('enabled', v);
                    if (v) setResultTab('fem');
                  }} />
                  {params.fem.enabled && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">FEM Active — results updating live</span>
                    </div>
                  )}
                </div>

                {params.fem.enabled && (
                  <div className="space-y-2 mt-3">
                    <SectionHeader>Mesh Configuration</SectionHeader>
                    <SelInput
                      label="Mesh Density"
                      value={params.fem.meshDensity}
                      onChange={(v) => updateFEM('meshDensity', v)}
                      options={[
                        { value: 'coarse', label: 'Coarse (~1,000 elements)' },
                        { value: 'medium', label: 'Medium (~4,000 elements)' },
                        { value: 'fine', label: 'Fine (~10,000 elements)' },
                      ]}
                    />
                    <NumInput
                      label="Num. Modes"
                      value={params.fem.numModes}
                      onChange={(v) => updateFEM('numModes', v)}
                      step={1} min={1} max={10}
                    />

                    <SectionHeader>Imperfection & Nonlinear</SectionHeader>
                    <NumInput
                      label="Imperfection"
                      value={params.fem.imperfection}
                      onChange={(v) => updateFEM('imperfection', v)}
                      unit={`L/${params.fem.imperfection}`}
                      step={100} min={100}
                    />
                    <ToggleInput label="Geometric Nonlinear Analysis" checked={params.fem.nonlinear} onChange={(v) => updateFEM('nonlinear', v)} />

                    {/* FEM Quick Results Summary */}
                    {results?.fem && (
                      <div className="mt-3">
                        <SectionHeader>Quick Results</SectionHeader>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                            <div className="text-[9px] text-slate-500">Converged</div>
                            <div className="text-sm font-bold text-green-600">{results.fem.converged ? '✓ Yes' : '✗ No'}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                            <div className="text-[9px] text-slate-500">Mesh</div>
                            <div className="text-sm font-bold text-blue-600">{results.fem.meshNodes} nodes</div>
                          </div>
                          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-center">
                            <div className="text-[9px] text-slate-500">Mode 1</div>
                            <div className="text-sm font-bold text-purple-600">
                              {results.fem.eigenvalues[0]?.toFixed(2) || '—'}
                              <span className="text-[9px] font-normal"> kN·m</span>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-center">
                            <div className="text-[9px] text-slate-500">Ultimate</div>
                            <div className="text-sm font-bold text-orange-600">
                              {results.fem.ultimateCapacity.toFixed(2)}
                              <span className="text-[9px] font-normal"> kN·m</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <button
                            onClick={() => setResultTab('fem')}
                            className="px-4 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            View Full FEM Results →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>About FEM:</strong> Eigenvalue buckling analysis with optional geometric nonlinear verification.
                  Results serve as comparison to analytical EWM/DSM methods per AS/NZS 4600:2018.
                  {params.fem.enabled && params.fem.nonlinear && (
                    <span className="block mt-1 text-blue-600 dark:text-blue-400">
                      Nonlinear mode: incremental loading with imperfection L/{params.fem.imperfection}.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER PANEL: 3D Viewport + 2D Section ── */}
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 min-w-0">
          {/* View mode tabs + controls */}
          <div className="bg-white/60 dark:bg-slate-800/60 border-b dark:border-slate-700">
            {/* Row 1: View toggle + Render modes */}
            <div className="flex items-center gap-3 px-4 py-2">
              {/* 3D / 2D toggle */}
              <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5">
                <button
                  onClick={() => setCenterView('3d')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    centerView === '3d'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-800'
                  }`}
                >
                  3D View
                </button>
                <button
                  onClick={() => setCenterView('2d')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    centerView === '2d'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-800'
                  }`}
                >
                  2D View
                </button>
              </div>

              {centerView === '3d' ? (
                <>
                  <div className="w-px h-5 bg-slate-300 dark:bg-slate-600" />
                  {/* Render mode buttons */}
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Render:</span>
                  <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 gap-0.5">
                    {(['solid', 'wireframe', 'transparent', 'stress'] as ViewMode[]).map((vm) => (
                      <button
                        key={vm}
                        onClick={() => setViewMode(vm)}
                        className={`px-3 py-1.5 text-[11px] rounded-md transition-colors ${
                          viewMode === vm
                            ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 font-semibold shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {vm.charAt(0).toUpperCase() + vm.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  {/* Display toggles */}
                  <ToggleInput label="Axes" checked={showAxes} onChange={setShowAxes} />
                  <ToggleInput label="Grid" checked={showGrid} onChange={setShowGrid} />
                  <div className="w-px h-5 bg-slate-300 dark:bg-slate-600" />
                  <button
                    onClick={() => viewer3DRef.current?.resetView()}
                    className="px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                    title="Reset camera to default position"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                    Reset
                  </button>
                </>
              ) : (
                <>
                  <div className="w-px h-5 bg-slate-300 dark:bg-slate-600" />
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Display:</span>
                  <ToggleInput label="Centroid" checked={showCentroid} onChange={setShowCentroid} />
                  <ToggleInput label="Principal Axes" checked={showPrincipalAxes} onChange={setShowPrincipalAxes} />
                  <ToggleInput label="Effective" checked={showEffective} onChange={setShowEffective} />
                  <ToggleInput label="Shear Center" checked={showShearCenter} onChange={setShowShearCenter} />
                </>
              )}
            </div>

            {/* Row 2: Deformation mode + sliders (3D only) */}
            {centerView === '3d' && (
              <div className="flex items-center gap-3 px-4 py-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Buckling:</span>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 gap-0.5">
                  {(['none', 'local', 'distortional', 'lateral-torsional'] as DeformationMode[]).map((dm) => (
                    <button
                      key={dm}
                      onClick={() => {
                        setDeformationMode(dm);
                        if (dm !== 'none') viewer3DRef.current?.resetView(dm);
                      }}
                      className={`px-3 py-1.5 text-[11px] rounded-md transition-colors ${
                        deformationMode === dm
                          ? 'bg-white dark:bg-slate-600 text-orange-600 dark:text-orange-300 font-semibold shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {dm === 'none' ? 'Off' : dm === 'lateral-torsional' ? 'LTB' : dm.charAt(0).toUpperCase() + dm.slice(1)}
                    </button>
                  ))}
                </div>
                {deformationMode !== 'none' && (
                  <button
                    onClick={() => viewer3DRef.current?.resetView(deformationMode)}
                    className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-300 transition-colors"
                    title={`Reset view for ${deformationMode === 'lateral-torsional' ? 'LTB' : deformationMode} mode`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                  </button>
                )}

                {deformationMode !== 'none' && (
                  <>
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-600" />
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">Scale:</span>
                    <input
                      type="number" min={0.1} max={100} step={0.1}
                      value={deformationScale}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 0.1 && v <= 100) setDeformationScale(v);
                      }}
                      className="w-14 h-6 text-[10px] text-center font-medium border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <input
                      type="range" min={0.1} max={50} step={0.1}
                      value={Math.min(deformationScale, 50)}
                      onChange={(e) => setDeformationScale(parseFloat(e.target.value))}
                      className="w-28 h-1.5 accent-blue-500"
                    />
                    <ToggleInput label="Animate" checked={animating} onChange={setAnimating} />
                  </>
                )}

                <div className="flex-1" />
                <ToggleInput label="Cut Plane" checked={showCutPlane} onChange={setShowCutPlane} />
                {showCutPlane && (
                  <>
                    <span className="text-[10px] text-slate-500">{(cutPlanePosition * 100).toFixed(0)}%</span>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={cutPlanePosition}
                      onChange={(e) => setCutPlanePosition(parseFloat(e.target.value))}
                      className="w-24 h-1.5 accent-blue-500"
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-h-0">
            {centerView === '3d' ? (
              <>
                {/* 3D Viewport – top ~65% */}
                <div className="flex-[65] min-h-0">
                  <CFS3DViewer
                    ref={viewer3DRef}
                    members={assembly.members}
                    results={results}
                    memberLength={params.Lb || 1000}
                    viewMode={viewMode}
                    deformationMode={deformationMode}
                    deformationScale={deformationScale}
                    animating={animating}
                    showAxes={showAxes}
                    showGrid={showGrid}
                    showCutPlane={showCutPlane}
                    cutPlanePosition={cutPlanePosition}
                    className="w-full h-full"
                  />
                </div>

                {/* 2D Effective Section Overlay – bottom ~35% */}
                <div className="flex-[35] min-h-0 border-t dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 flex gap-2 p-2 overflow-hidden">
                  <div className="flex-1 flex items-center justify-center">
                    <CFSProSectionView
                      members={assembly.members}
                      sectionProps={results?.sectionProps}
                      showCentroid={showCentroid}
                      showPrincipalAxes={showPrincipalAxes}
                      showEffective={true}
                      showShearCenter={showShearCenter}
                      width={280}
                      height={200}
                    />
                  </div>
                  {/* Signature curve mini */}
                  {results?.bending.signatureCurve && results.bending.signatureCurve.length > 0 && (
                    <div className="flex-1 flex flex-col justify-center">
                      <h4 className="text-[9px] font-bold text-slate-600 dark:text-slate-300 mb-1">Signature Curve</h4>
                      <SignatureCurveChart data={results.bending.signatureCurve} width={280} height={160} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Full 2D Section View */}
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 w-full max-w-[600px]">
                    <CFSProSectionView
                      members={assembly.members}
                      sectionProps={results?.sectionProps}
                      showCentroid={showCentroid}
                      showPrincipalAxes={showPrincipalAxes}
                      showEffective={showEffective}
                      showShearCenter={showShearCenter}
                      width={560}
                      height={400}
                    />
                  </div>
                </div>

                {/* Signature curve */}
                {results?.bending.signatureCurve && results.bending.signatureCurve.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Signature Curve</h4>
                      <SignatureCurveChart data={results.bending.signatureCurve} width={560} height={180} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Capacity Summary Bar – always visible */}
          {results && (
            <div className="shrink-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t dark:border-slate-700 px-4 py-2">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                  results.interaction.isAdequate
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  {results.interaction.isAdequate ? '✓' : '✗'}
                  {results.interaction.isAdequate ? 'ADEQUATE' : 'INADEQUATE'}
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    φMn = <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{results.bending.phiMn.toFixed(2)}</span> kN·m
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    φVn = <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{results.shear.phiVn.toFixed(2)}</span> kN
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    φNc = <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{results.compression.phiNc.toFixed(2)}</span> kN
                  </span>
                </div>
                <div className="flex-1" />
                {/* Mini utilization bars */}
                <div className="flex items-center gap-2">
                  {[
                    { label: 'M', ratio: results.interaction.bendingRatio },
                    { label: 'V', ratio: results.interaction.shearRatio },
                    ...(params.Nstar > 0 ? [{ label: 'N', ratio: results.interaction.compressionRatio }] : []),
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 w-3">{item.label}</span>
                      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.ratio <= 0.8 ? 'bg-green-500' : item.ratio <= 1 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(item.ratio * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 w-8">{(item.ratio * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {results && results.warnings.length > 0 && (
            <div className="px-4 pb-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">Warnings</h4>
                {results.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-amber-600 dark:text-amber-400">• {w}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Results ── */}
        <aside className="w-[380px] shrink-0 border-l dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
          <div className="p-3">
            {results ? (
              <>
                {/* Governing mode hero */}
                <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Governing Mode</span>
                    <ModeTag mode={results.governingMode} governing />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <div className="text-[10px] text-slate-500">φMn</div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {results.bending.phiMn.toFixed(2)}
                        <span className="text-xs font-normal text-slate-400 ml-1">kN·m</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">φVn</div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {results.shear.phiVn.toFixed(2)}
                        <span className="text-xs font-normal text-slate-400 ml-1">kN</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-[10px] text-slate-500">Interaction Check</div>
                    <div className={`text-sm font-bold ${results.interaction.isAdequate ? 'text-green-600' : 'text-red-600'}`}>
                      {results.interaction.isAdequate ? '✓ ADEQUATE' : '✗ NOT ADEQUATE'}
                      <span className="text-xs font-normal text-slate-400 ml-2">
                        ({(results.interaction.interactionCircular * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Result tabs */}
                <ResultTabBar active={resultTab} onChange={setResultTab} femEnabled={params.fem.enabled} />

                {/* ── SUMMARY ── */}
                {resultTab === 'summary' && (
                  <div className="space-y-1">
                    <SectionHeader clause="Cl. 2.1">Gross Section Properties</SectionHeader>
                    <ResultRow label="Ag" value={results.sectionProps.gross.Ag} unit="mm²" />
                    <ResultRow label="Ix" value={results.sectionProps.gross.Ix} unit="mm⁴" />
                    <ResultRow label="Iy" value={results.sectionProps.gross.Iy} unit="mm⁴" />
                    <ResultRow label="Sx" value={results.sectionProps.gross.Sx} unit="mm³" />
                    <ResultRow label="Sy" value={results.sectionProps.gross.Sy} unit="mm³" />
                    <ResultRow label="rx" value={results.sectionProps.gross.rx} unit="mm" />
                    <ResultRow label="ry" value={results.sectionProps.gross.ry} unit="mm" />
                    <ResultRow label="J" value={results.sectionProps.gross.J} unit="mm⁴" />
                    <ResultRow label="Cw" value={results.sectionProps.gross.Cw} unit="mm⁶" />
                    <ResultRow label="Centroid xc" value={results.sectionProps.gross.xc} unit="mm" />

                    <SectionHeader clause="Cl. 2.2">Effective Section Properties</SectionHeader>
                    <ResultRow label="Ae" value={results.sectionProps.effective.Ae} unit="mm²" />
                    <ResultRow label="Ixe" value={results.sectionProps.effective.Ixe} unit="mm⁴" />
                    <ResultRow label="Ze" value={results.sectionProps.effective.Ze} unit="mm³" />

                    <SectionHeader>Principal Axes</SectionHeader>
                    <ResultRow label="I₁ (major)" value={results.sectionProps.principalAxes.I1} unit="mm⁴" />
                    <ResultRow label="I₂ (minor)" value={results.sectionProps.principalAxes.I2} unit="mm⁴" />
                    <ResultRow label="θ" value={results.sectionProps.principalAxes.theta} unit="°" />

                    <SectionHeader>Shear Center</SectionHeader>
                    <ResultRow label="xs" value={results.sectionProps.shearCenter.xs} unit="mm" />
                    <ResultRow label="ys" value={results.sectionProps.shearCenter.ys} unit="mm" />

                    <SectionHeader clause="Cl. 7.2.2">Capacity Summary</SectionHeader>
                    <ResultRow label="My (yield)" value={results.bending.My} unit="kN·m" />
                    <ResultRow label="Mbl (local)" value={results.bending.Mne_local} unit="kN·m" />
                    <ResultRow label="Mbd (distortional)" value={results.bending.Mne_distortional} unit="kN·m" />
                    <ResultRow label="Mbe (LTB)" value={results.bending.Mne_ltb} unit="kN·m" />
                    <ResultRow label="Mb (governing)" value={results.bending.Mn} unit="kN·m" highlight />
                    <ResultRow label="φMb" value={results.bending.phiMn} unit="kN·m" highlight />
                    <ResultRow label="Vn" value={results.shear.Vn} unit="kN" />
                    <ResultRow label="φVn" value={results.shear.phiVn} unit="kN" highlight />
                    <ResultRow label="Nc" value={results.compression.Nc} unit="kN" />
                    <ResultRow label="φNc" value={results.compression.phiNc} unit="kN" highlight />
                  </div>
                )}

                {/* ── EWM TAB ── */}
                {resultTab === 'ewm' && (
                  <div className="space-y-1">
                    <SectionHeader clause="Cl. 2.2.1.2">Effective Width Method</SectionHeader>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                      Plate slenderness and effective width reduction for each element.
                    </div>
                    {results.sectionProps.plateElements.map((pe, i) => (
                      <div key={i} className="border dark:border-slate-700 rounded p-2 mb-1">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">{pe.elementName}</div>
                        <div className="grid grid-cols-2 gap-x-2">
                          <ResultRow label="w" value={pe.flatWidth} unit="mm" />
                          <ResultRow label="t" value={pe.thickness} unit="mm" />
                          <ResultRow label="k" value={pe.kPlate} />
                          <ResultRow label="λ" value={pe.slenderness} />
                          <ResultRow label="ρ" value={pe.rho}
                            status={pe.isFullyEffective ? 'ok' : 'warn'}
                          />
                          <ResultRow label="b_eff" value={pe.effectiveWidth} unit="mm"
                            status={pe.isFullyEffective ? 'ok' : 'warn'}
                          />
                        </div>
                        <div className="mt-1 text-[9px] text-slate-400">
                          {pe.isFullyEffective ? '✓ Fully effective (λ ≤ 0.673)' : `Reduced: ρ = (1 − 0.22/λ)/λ = ${pe.rho.toFixed(3)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── BENDING TAB ── */}
                {resultTab === 'bending' && (
                  <div className="space-y-1">
                    <SectionHeader clause="Cl. 7.2.2">DSM Bending Capacity</SectionHeader>

                    <div className="flex gap-1 mb-2">
                      <ModeTag mode="local" governing={results.bending.governingMode === 'local'} />
                      <ModeTag mode="distortional" governing={results.bending.governingMode === 'distortional'} />
                      <ModeTag mode="lateral-torsional" governing={results.bending.governingMode === 'lateral-torsional'} />
                    </div>

                    <ResultRow label="My" value={results.bending.My} unit="kN·m" clause="Yield moment" />

                    <SectionHeader>Buckling Stresses</SectionHeader>
                    <ResultRow label="fol (local)" value={results.bending.fol} unit="MPa" />
                    <ResultRow label="fod (distortional)" value={results.bending.fod} unit="MPa" />

                    <SectionHeader>Elastic Buckling Moments</SectionHeader>
                    <ResultRow label="Mol" value={results.bending.Mcr_local} unit="kN·m" />
                    <ResultRow label="Mod" value={results.bending.Mcr_dist} unit="kN·m" />
                    <ResultRow label="Mo" value={isFinite(results.bending.Mo) ? results.bending.Mo : '∞'} unit="kN·m" />

                    <SectionHeader clause="Cl. 7.2.2.2">Lateral-Torsional Buckling</SectionHeader>
                    <ResultRow label="Mbe" value={results.bending.Mne_ltb} unit="kN·m"
                      highlight={results.bending.governingMode === 'lateral-torsional'} />
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded text-[9px] text-slate-500 dark:text-slate-400">
                      {results.bending.Mo >= 2.78 * results.bending.My
                        ? 'Mo ≥ 2.78My → Mbe = My (full yield)'
                        : results.bending.Mo > 0.56 * results.bending.My
                        ? '0.56My < Mo < 2.78My → inelastic LTB'
                        : 'Mo ≤ 0.56My → Mbe = Mo (elastic LTB)'}
                    </div>

                    <SectionHeader clause="Cl. 7.2.2.3">Local Buckling (DSM)</SectionHeader>
                    <ResultRow label="λl = √(Mbe/Mol)" value={results.bending.lambdaL} />
                    <ResultRow label="Mbl" value={results.bending.Mne_local} unit="kN·m"
                      highlight={results.bending.governingMode === 'local'} />
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded text-[9px] text-slate-500 dark:text-slate-400">
                      {results.bending.lambdaL <= 0.776
                        ? 'λl ≤ 0.776 → Mbl = Mbe (no local reduction)'
                        : 'λl > 0.776 → Mbl = [1−0.15(Mol/Mbe)⁰·⁴]×(Mol/Mbe)⁰·⁴×Mbe'}
                    </div>

                    <SectionHeader clause="Cl. 7.2.2.4">Distortional Buckling (DSM)</SectionHeader>
                    {results.bending.fod > 0 ? (
                      <>
                        <ResultRow label="λd = √(My/Mod)" value={results.bending.lambdaD} />
                        <ResultRow label="Lcrd" value={results.bending.Lcrd} unit="mm" />
                        <ResultRow label="Mbd" value={results.bending.Mne_distortional} unit="kN·m"
                          highlight={results.bending.governingMode === 'distortional'} />
                      </>
                    ) : (
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded text-[9px] text-slate-500 dark:text-slate-400">
                        fod = 0 → No distinct distortional mode (Mbd excluded)
                      </div>
                    )}

                    <SectionHeader>Governing Capacity</SectionHeader>
                    <ResultRow label="Mb" value={results.bending.Mn} unit="kN·m" highlight />
                    <ResultRow label="φ" value={results.bending.phi_b} />
                    <ResultRow label="φMb" value={results.bending.phiMn} unit="kN·m" highlight
                      status={params.Mstar <= results.bending.phiMn ? 'ok' : 'ng'} />
                    <ResultRow label="M*/φMb" value={(params.Mstar / (results.bending.phiMn || 1))}
                      status={params.Mstar <= results.bending.phiMn ? 'ok' : 'ng'} />
                  </div>
                )}

                {/* ── SHEAR TAB ── */}
                {resultTab === 'shear' && (
                  <div className="space-y-1">
                    <SectionHeader clause="Cl. 3.3.4">Shear Capacity</SectionHeader>
                    <ResultRow label="Vy" value={results.shear.Vy} unit="kN" />
                    <ResultRow label="Vcr" value={results.shear.Vcr} unit="kN" />
                    <ResultRow label="λv" value={results.shear.lambda_v} />
                    <ResultRow label="Vn" value={results.shear.Vn} unit="kN" highlight />
                    <ResultRow label="φv" value={results.shear.phi_v} />
                    <ResultRow label="φVn" value={results.shear.phiVn} unit="kN" highlight
                      status={params.Vstar <= results.shear.phiVn ? 'ok' : 'ng'} />
                    <ResultRow label="V*/φVn" value={(params.Vstar / (results.shear.phiVn || 1))}
                      status={params.Vstar <= results.shear.phiVn ? 'ok' : 'ng'} />

                    <SectionHeader>Shear Regime</SectionHeader>
                    <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded text-[10px] text-slate-600 dark:text-slate-300">
                      {results.shear.lambda_v <= 0.815
                        ? 'Shear yielding governs (λv ≤ 0.815)'
                        : results.shear.lambda_v <= 1.227
                        ? 'Inelastic shear buckling (0.815 < λv ≤ 1.227)'
                        : 'Elastic shear buckling (λv > 1.227)'}
                    </div>
                  </div>
                )}

                {/* ── COMPRESSION TAB ── */}
                {resultTab === 'compression' && (
                  <div className="space-y-1">
                    <SectionHeader clause="Cl. 3.4">Compression Capacity</SectionHeader>
                    <ResultRow label="fox" value={results.compression.fox} unit="MPa" />
                    <ResultRow label="foy" value={results.compression.foy} unit="MPa" />
                    <ResultRow label="foc (governing)" value={results.compression.foc} unit="MPa" highlight />
                    <ResultRow label="λc" value={results.compression.lambda_c} />
                    <ResultRow label="fn" value={results.compression.fn} unit="MPa" />
                    <ResultRow label="Ny" value={results.compression.Ny} unit="kN" />
                    <ResultRow label="Noc" value={results.compression.Noc} unit="kN" />
                    <ResultRow label="Nc" value={results.compression.Nc} unit="kN" highlight />
                    <ResultRow label="φc" value={results.compression.phi_c} />
                    <ResultRow label="φNc" value={results.compression.phiNc} unit="kN" highlight
                      status={params.Nstar <= results.compression.phiNc ? 'ok' : 'ng'} />
                  </div>
                )}

                {/* ── INTERACTION TAB ── */}
                {resultTab === 'interaction' && (
                  <div className="space-y-1">
                    <SectionHeader clause="Cl. 3.3.5">Bending–Shear Interaction</SectionHeader>
                    <ResultRow label="M*/φMn" value={results.interaction.bendingRatio}
                      status={results.interaction.bendingRatio <= 1 ? 'ok' : 'ng'} />
                    <ResultRow label="V*/φVn" value={results.interaction.shearRatio}
                      status={results.interaction.shearRatio <= 1 ? 'ok' : 'ng'} />
                    <ResultRow label="Circular" value={results.interaction.interactionCircular}
                      clause="(M*/φMn)² + (V*/φVn)²"
                      status={results.interaction.interactionCircular <= 1 ? 'ok' : 'ng'} />
                    <ResultRow label="Linear" value={results.interaction.interactionLinear}
                      clause="M*/φMn + V*/φVn"
                      status={results.interaction.interactionLinear <= 1 ? 'ok' : 'ng'} />

                    {params.Nstar > 0 && (
                      <>
                        <SectionHeader clause="Cl. 3.5.1">Combined Bending + Compression</SectionHeader>
                        <ResultRow label="N*/φNc" value={results.interaction.compressionRatio}
                          status={results.interaction.compressionRatio <= 1 ? 'ok' : 'ng'} />
                        <ResultRow label="Combined" value={results.interaction.interactionCombined}
                          clause="N*/φNc + M*/φMn"
                          status={results.interaction.interactionCombined <= 1 ? 'ok' : 'ng'} />
                      </>
                    )}

                    <SectionHeader>Overall Adequacy</SectionHeader>
                    <div className={`p-3 rounded-lg text-center text-sm font-bold ${
                      results.interaction.isAdequate
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}>
                      {results.interaction.isAdequate ? '✓ SECTION ADEQUATE' : '✗ SECTION INADEQUATE'}
                    </div>

                    {/* Interaction diagram (simplified bar) */}
                    <SectionHeader>Utilization</SectionHeader>
                    {[
                      { label: 'Bending', ratio: results.interaction.bendingRatio },
                      { label: 'Shear', ratio: results.interaction.shearRatio },
                      ...(params.Nstar > 0 ? [{ label: 'Compression', ratio: results.interaction.compressionRatio }] : []),
                    ].map((item) => (
                      <div key={item.label} className="mb-1">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>{item.label}</span>
                          <span>{(item.ratio * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.ratio <= 0.8 ? 'bg-green-500' : item.ratio <= 1 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(item.ratio * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── FEM TAB ── */}
                {resultTab === 'fem' && results.fem && (
                  <div className="space-y-1">
                    <SectionHeader>FEM Eigenvalue Buckling</SectionHeader>
                    <ResultRow label="Converged" value={results.fem.converged ? 'Yes' : 'No'}
                      status={results.fem.converged ? 'ok' : 'ng'} />
                    <ResultRow label="Mesh Nodes" value={results.fem.meshNodes} />
                    <ResultRow label="Mesh Elements" value={results.fem.meshElements} />

                    <SectionHeader>Buckling Modes</SectionHeader>
                    {results.fem.eigenvalues.map((ev, i) => (
                      <ResultRow
                        key={i}
                        label={`Mode ${i + 1}: ${results.fem!.bucklingModes[i] || 'Unknown'}`}
                        value={ev}
                        unit="kN·m"
                        highlight={i === 0}
                      />
                    ))}

                    <SectionHeader>Nonlinear Capacity</SectionHeader>
                    <ResultRow label="Ultimate (FEM)" value={results.fem.ultimateCapacity} unit="kN·m" highlight />
                    <ResultRow label="FEM / EWM" value={results.fem.ewmComparison} />
                    <ResultRow label="FEM / DSM" value={results.fem.dsmComparison} />

                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-[10px] text-blue-700 dark:text-blue-300">
                      FEM results include imperfection of L/{params.fem.imperfection}.
                      {params.fem.nonlinear
                        ? ' Geometric nonlinear analysis with incremental loading.'
                        : ' Linear eigenvalue analysis only.'}
                    </div>
                  </div>
                )}

                {/* ── STEPS TAB ── */}
                {resultTab === 'steps' && (
                  <div className="space-y-1">
                    <SectionHeader>Detailed Calculation Steps</SectionHeader>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                      Expandable calculation trace with clause references per AS/NZS 4600:2018.
                    </div>

                    {/* Step 1: Material */}
                    <CollapsibleStep
                      title="Step 1: Material Properties"
                      clause="Cl. 1.5"
                      expanded={expandedStep === 'material'}
                      onToggle={() => setExpandedStep(expandedStep === 'material' ? null : 'material')}
                    >
                      {`fy  = ${params.material.fy} MPa
fu  = ${params.material.fu} MPa
E   = ${params.material.E} MPa
ν   = ${params.material.nu}
G   = E / [2(1+ν)] = ${(params.material.E / (2 * (1 + params.material.nu))).toFixed(0)} MPa`}
                    </CollapsibleStep>

                    {/* Step 2: Geometry */}
                    <CollapsibleStep
                      title="Step 2: Section Geometry"
                      clause="Cl. 2.1"
                      expanded={expandedStep === 'geometry'}
                      onToggle={() => setExpandedStep(expandedStep === 'geometry' ? null : 'geometry')}
                    >
                      {assembly.members.map((m) => {
                        const g = m.geometry;
                        const flatWeb = g.d - 2 * (g.radius + g.t);
                        const flatFlange = g.bf - 2 * (g.radius + g.t);
                        const flatLip = g.lipLength > 0 ? g.lipLength - (g.radius + g.t / 2) : 0;
                        return `[${m.label}] ${m.sectionType}
  d=${g.d} bf=${g.bf} t=${g.t} lip=${g.lipLength} r=${g.radius}
  Flat: web=${flatWeb.toFixed(1)} flange=${flatFlange.toFixed(1)} lip=${flatLip.toFixed(1)}`;
                      }).join('\n\n')}
                    </CollapsibleStep>

                    {/* Step 3: Gross Properties */}
                    <CollapsibleStep
                      title="Step 3: Gross Section Properties"
                      clause="Cl. 2.1"
                      expanded={expandedStep === 'gross'}
                      onToggle={() => setExpandedStep(expandedStep === 'gross' ? null : 'gross')}
                    >
                      {`Ag  = ${results.sectionProps.gross.Ag.toFixed(1)} mm²
Ix  = ${results.sectionProps.gross.Ix.toFixed(0)} mm⁴
Iy  = ${results.sectionProps.gross.Iy.toFixed(0)} mm⁴
Sx  = ${results.sectionProps.gross.Sx.toFixed(0)} mm³
J   = ${results.sectionProps.gross.J.toFixed(1)} mm⁴
Cw  = ${results.sectionProps.gross.Cw.toFixed(0)} mm⁶`}
                    </CollapsibleStep>

                    {/* Step 4: EWM */}
                    <CollapsibleStep
                      title="Step 4: Effective Width Method"
                      clause="Cl. 2.2.1.2"
                      expanded={expandedStep === 'ewm'}
                      onToggle={() => setExpandedStep(expandedStep === 'ewm' ? null : 'ewm')}
                    >
                      {results.sectionProps.plateElements.map((pe) =>
                        `${pe.elementName}:
  w/t = ${(pe.flatWidth / pe.thickness).toFixed(1)}
  k   = ${pe.kPlate}
  λ   = ${pe.slenderness.toFixed(3)}
  ρ   = ${pe.rho.toFixed(3)}
  b_eff = ${pe.effectiveWidth.toFixed(1)} mm ${pe.isFullyEffective ? '(fully effective)' : '(reduced)'}`
                      ).join('\n\n')}
                    </CollapsibleStep>

                    {/* Step 5: Bending */}
                    <CollapsibleStep
                      title="Step 5: Bending Capacity (DSM)"
                      clause="Cl. 7.2.2"
                      expanded={expandedStep === 'bending'}
                      onToggle={() => setExpandedStep(expandedStep === 'bending' ? null : 'bending')}
                    >
                      {`My = Sx·fy = ${results.bending.My.toFixed(2)} kN·m

Buckling stresses:
  fol = ${results.bending.fol.toFixed(3)} MPa (local)
  fod = ${results.bending.fod.toFixed(3)} MPa (distortional)

Elastic buckling moments:
  Mol = Sx·fol = ${results.bending.Mcr_local.toFixed(3)} kN·m
  Mod = Sx·fod = ${results.bending.Mcr_dist.toFixed(3)} kN·m
  Mo = ${isFinite(results.bending.Mo) ? results.bending.Mo.toFixed(3) : '∞'} kN·m

Step 1 – LTB (Cl. 7.2.2.2):
  Mo = ${isFinite(results.bending.Mo) ? results.bending.Mo.toFixed(3) : '∞'} kN·m
  ${results.bending.Mo >= 2.78 * results.bending.My ? 'Mo ≥ 2.78My → Mbe = My' : results.bending.Mo > 0.56 * results.bending.My ? '0.56My < Mo < 2.78My → inelastic' : 'Mo ≤ 0.56My → Mbe = Mo (elastic)'}
  Mbe = ${results.bending.Mne_ltb.toFixed(3)} kN·m

Step 2 – Local buckling (Cl. 7.2.2.3):
  λl = √(Mbe/Mol) = ${results.bending.lambdaL.toFixed(3)}
  ${results.bending.lambdaL <= 0.776 ? 'λl ≤ 0.776 → Mbl = Mbe' : 'λl > 0.776 → Mbl = [1−0.15(Mol/Mbe)⁰·⁴]×(Mol/Mbe)⁰·⁴×Mbe'}
  Mbl = ${results.bending.Mne_local.toFixed(3)} kN·m

Step 3 – Distortional buckling (Cl. 7.2.2.4):
  ${results.bending.fod > 0 ? `λd = √(My/Mod) = ${results.bending.lambdaD.toFixed(3)}
  Lcrd = ${results.bending.Lcrd.toFixed(0)} mm
  Mbd = ${results.bending.Mne_distortional.toFixed(3)} kN·m` : 'fod = 0 → no distortional mode (Mbd excluded)'}

Governing: Mb = ${results.bending.fod > 0 ? `min(Mbl, Mbd) = min(${results.bending.Mne_local.toFixed(3)}, ${results.bending.Mne_distortional.toFixed(3)})` : `Mbl = ${results.bending.Mne_local.toFixed(3)}`}
         = ${results.bending.Mn.toFixed(3)} kN·m  [${results.bending.governingMode}]
φMb = ${results.bending.phi_b} × ${results.bending.Mn.toFixed(3)} = ${results.bending.phiMn.toFixed(3)} kN·m`}
                    </CollapsibleStep>

                    {/* Step 6: Shear */}
                    <CollapsibleStep
                      title="Step 6: Shear Capacity"
                      clause="Cl. 3.3.4"
                      expanded={expandedStep === 'shear'}
                      onToggle={() => setExpandedStep(expandedStep === 'shear' ? null : 'shear')}
                    >
                      {`Vy  = ${results.shear.Vy.toFixed(2)} kN
Vcr = ${results.shear.Vcr.toFixed(2)} kN
λv  = ${results.shear.lambda_v.toFixed(3)}
Vn  = ${results.shear.Vn.toFixed(2)} kN
φVn = ${results.shear.phi_v} × ${results.shear.Vn.toFixed(2)} = ${results.shear.phiVn.toFixed(2)} kN`}
                    </CollapsibleStep>

                    {/* Step 7: Interaction */}
                    <CollapsibleStep
                      title="Step 7: Interaction Check"
                      clause="Cl. 3.3.5, 3.5"
                      expanded={expandedStep === 'interaction'}
                      onToggle={() => setExpandedStep(expandedStep === 'interaction' ? null : 'interaction')}
                    >
                      {`M* = ${params.Mstar} kN·m, V* = ${params.Vstar} kN, N* = ${params.Nstar} kN
φMn = ${results.bending.phiMn.toFixed(2)}, φVn = ${results.shear.phiVn.toFixed(2)}, φNc = ${results.compression.phiNc.toFixed(2)}

Bending-shear (circular): (M*/φMn)² + (V*/φVn)² = ${results.interaction.interactionCircular.toFixed(3)} ≤ 1.0 → ${results.interaction.interactionCircular <= 1 ? 'OK' : 'NG'}
${params.Nstar > 0 ? `Combined (Cl. 3.5.1): N*/φNc + M*/φMn = ${results.interaction.interactionCombined.toFixed(3)} ≤ 1.0 → ${results.interaction.interactionCombined <= 1 ? 'OK' : 'NG'}` : ''}
Overall: ${results.interaction.isAdequate ? 'ADEQUATE' : 'NOT ADEQUATE'}`}
                    </CollapsibleStep>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-sm">
                No results – add at least one member
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ============================================================
// COLLAPSIBLE STEP
// ============================================================

function CollapsibleStep({
  title, clause, expanded, onToggle, children,
}: {
  title: string; clause: string; expanded: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="mb-2 border dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
      >
        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
          {title}
          <span className="text-[10px] font-normal text-slate-400 ml-2">[{clause}]</span>
        </span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="p-3 bg-white dark:bg-slate-800 text-[10px] font-mono leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
}
