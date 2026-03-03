'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BuiltUpElement,
  BuiltUpAssembly,
  BuiltUpDesignInputs,
  BuiltUpDesignResults,
  CFSSectionType,
  CFSGeometry,
  BendingAxis,
  EndCondition,
} from '@/types/cfs';
import { performBuiltUpDesign } from '@/lib/calculations/cfs-builtup';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================
// SHARED INPUT COMPONENTS
// ============================================================

function NumberInput({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600 dark:text-slate-400 w-32 shrink-0">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {unit && (
        <span className="text-xs text-slate-500 dark:text-slate-400 w-10 shrink-0">
          {unit}
        </span>
      )}
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600 dark:text-slate-400 w-32 shrink-0">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ResultRow({
  label,
  value,
  unit,
  highlight,
  status,
}: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  status?: 'ok' | 'ng' | null;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 px-2 rounded ${
        highlight ? 'bg-blue-50 dark:bg-blue-900/30' : ''
      } ${status === 'ok' ? 'bg-green-50 dark:bg-green-900/20' : ''} ${
        status === 'ng' ? 'bg-red-50 dark:bg-red-900/20' : ''
      }`}
    >
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span
        className={`text-sm font-mono font-medium ${
          status === 'ok'
            ? 'text-green-700 dark:text-green-400'
            : status === 'ng'
            ? 'text-red-700 dark:text-red-400'
            : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

// ============================================================
// DEFAULT ELEMENT FACTORY
// ============================================================

let nextId = 1;

function createDefaultElement(offsetX = 0, rotation = 0, mirrored = false): BuiltUpElement {
  return {
    id: `el-${nextId++}`,
    sectionType: 'C-channel',
    geometry: {
      t: 1.2,
      d: 200,
      bf: 75,
      lipLength: 20,
      radius: 3,
      sectionType: 'C-channel',
    },
    offsetX,
    offsetY: 0,
    rotation,
    mirrored,
  };
}

// Preset configurations
function createPreset(type: string): BuiltUpElement[] {
  nextId = 1;
  switch (type) {
    case 'back-to-back':
      return [
        createDefaultElement(0, 0, false),
        createDefaultElement(0, 0, true),
      ];
    case 'face-to-face':
      return [
        createDefaultElement(-75, 0, false),
        createDefaultElement(75, 180, false),
      ];
    case 'box':
      return [
        createDefaultElement(0, 0, false),
        createDefaultElement(0, 0, true),
      ];
    case 'I-section': {
      const topFlange: BuiltUpElement = {
        id: `el-${nextId++}`,
        sectionType: 'C-channel',
        geometry: { t: 1.2, d: 200, bf: 75, lipLength: 20, radius: 3, sectionType: 'C-channel' },
        offsetX: 0,
        offsetY: -100,
        rotation: 0,
        mirrored: false,
      };
      const botFlange: BuiltUpElement = {
        id: `el-${nextId++}`,
        sectionType: 'C-channel',
        geometry: { t: 1.2, d: 200, bf: 75, lipLength: 20, radius: 3, sectionType: 'C-channel' },
        offsetX: 0,
        offsetY: 100,
        rotation: 180,
        mirrored: false,
      };
      return [topFlange, botFlange];
    }
    default:
      return [createDefaultElement()];
  }
}

// ============================================================
// ELEMENT EDITOR CARD
// ============================================================

function ElementEditor({
  element,
  index,
  onUpdate,
  onRemove,
}: {
  element: BuiltUpElement;
  index: number;
  onUpdate: (updated: BuiltUpElement) => void;
  onRemove: () => void;
}) {
  const updateGeom = (key: keyof CFSGeometry, val: number | CFSSectionType) => {
    onUpdate({
      ...element,
      geometry: { ...element.geometry, [key]: val },
    });
  };

  const colors = [
    'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20',
    'border-green-400 bg-green-50/50 dark:bg-green-900/20',
    'border-orange-400 bg-orange-50/50 dark:bg-orange-900/20',
    'border-purple-400 bg-purple-50/50 dark:bg-purple-900/20',
    'border-pink-400 bg-pink-50/50 dark:bg-pink-900/20',
    'border-cyan-400 bg-cyan-50/50 dark:bg-cyan-900/20',
  ];
  const color = colors[index % colors.length];

  return (
    <div className={`border-l-4 rounded-lg p-3 ${color} space-y-2`}>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Element {index + 1}
          <span className="font-normal text-xs text-slate-500 ml-2">{element.id}</span>
        </h4>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <NumberInput label="t" value={element.geometry.t} onChange={(v) => updateGeom('t', v)} unit="mm" step={0.1} />
        <NumberInput label="d" value={element.geometry.d} onChange={(v) => updateGeom('d', v)} unit="mm" step={5} />
        <NumberInput label="bf" value={element.geometry.bf} onChange={(v) => updateGeom('bf', v)} unit="mm" step={5} />
        <NumberInput label="lip" value={element.geometry.lipLength} onChange={(v) => updateGeom('lipLength', v)} unit="mm" step={1} />
        <NumberInput label="radius" value={element.geometry.radius} onChange={(v) => updateGeom('radius', v)} unit="mm" step={0.5} />
        <SelectInput
          label="Type"
          value={element.geometry.sectionType}
          onChange={(v) => {
            onUpdate({
              ...element,
              sectionType: v as CFSSectionType,
              geometry: { ...element.geometry, sectionType: v as CFSSectionType },
            });
          }}
          options={[
            { value: 'C-channel', label: 'C-Channel' },
            { value: 'Z-section', label: 'Z-Section' },
          ]}
        />
      </div>

      <div className="border-t dark:border-slate-600 pt-2 mt-2">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium uppercase tracking-wider">
          Position & Orientation
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <NumberInput label="Offset X" value={element.offsetX} onChange={(v) => onUpdate({ ...element, offsetX: v })} unit="mm" step={5} min={-1000} />
          <NumberInput label="Offset Y" value={element.offsetY} onChange={(v) => onUpdate({ ...element, offsetY: v })} unit="mm" step={5} min={-1000} />
          <SelectInput
            label="Rotation"
            value={String(element.rotation)}
            onChange={(v) => onUpdate({ ...element, rotation: parseInt(v) })}
            options={[
              { value: '0', label: '0°' },
              { value: '90', label: '90°' },
              { value: '180', label: '180°' },
              { value: '270', label: '270°' },
            ]}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-400 w-32 shrink-0">Mirror</label>
            <button
              onClick={() => onUpdate({ ...element, mirrored: !element.mirrored })}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                element.mirrored
                  ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-500 dark:text-blue-300'
                  : 'bg-white border-slate-300 text-slate-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'
              }`}
            >
              {element.mirrored ? 'Yes' : 'No'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ASSEMBLY DIAGRAM SVG
// ============================================================

function AssemblyDiagram({ elements }: { elements: BuiltUpElement[] }) {
  if (elements.length === 0) return null;

  const svgW = 320;
  const svgH = 400;
  const margin = 60;

  // Compute bounding box of all elements
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  elements.forEach((el) => {
    const { d, bf } = el.geometry;
    const r = ((el.rotation % 360) + 360) % 360;
    const halfW = (r === 90 || r === 270) ? d / 2 : bf;
    const halfH = (r === 90 || r === 270) ? bf : d / 2;

    const cx = el.offsetX;
    const cy = el.offsetY;

    minX = Math.min(minX, cx - halfW);
    maxX = Math.max(maxX, cx + halfW);
    minY = Math.min(minY, cy - halfH);
    maxY = Math.max(maxY, cy + halfH);
  });

  const rangeX = maxX - minX || 100;
  const rangeY = maxY - minY || 100;
  const scale = Math.min((svgW - 2 * margin) / rangeX, (svgH - 2 * margin) / rangeY);
  const centerX = svgW / 2 - ((minX + maxX) / 2) * scale;
  const centerY = svgH / 2 - ((minY + maxY) / 2) * scale;

  const colors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#06b6d4'];

  return (
    <svg width={svgW} height={svgH} className="border rounded-lg dark:border-slate-700">
      <rect width={svgW} height={svgH} className="fill-white dark:fill-slate-800" rx={8} />

      {/* Grid */}
      <defs>
        <pattern id="builtup-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width={svgW} height={svgH} fill="url(#builtup-grid)" rx={8} />

      {/* Origin crosshair */}
      <line x1={centerX - 10} y1={centerY} x2={centerX + 10} y2={centerY} className="stroke-red-400" strokeWidth={1} />
      <line x1={centerX} y1={centerY - 10} x2={centerX} y2={centerY + 10} className="stroke-red-400" strokeWidth={1} />

      {/* Elements */}
      {elements.map((el, idx) => {
        const { d, bf, lipLength, t } = el.geometry;
        const color = colors[idx % colors.length];
        const x = centerX + el.offsetX * scale;
        const y = centerY + el.offsetY * scale;

        // Build C-channel outline points
        const dS = d * scale;
        const bfS = bf * scale;
        const lipS = lipLength * scale;
        const tS = Math.max(t * scale, 1.5);

        // Draw C-channel as path relative to center
        // The C-channel: web on left, flanges go right, lips return down/up
        const halfD = dS / 2;

        let pathD: string;
        if (el.mirrored) {
          // Mirrored: web on right, flanges go left
          pathD = `
            M 0 ${-halfD + lipS}
            L 0 ${-halfD}
            L ${-bfS} ${-halfD}
            L ${-bfS} ${halfD}
            L 0 ${halfD}
            L 0 ${halfD - lipS}
          `;
        } else {
          pathD = `
            M 0 ${-halfD + lipS}
            L 0 ${-halfD}
            L ${bfS} ${-halfD}
            L ${bfS} ${halfD}
            L 0 ${halfD}
            L 0 ${halfD - lipS}
          `;
        }

        return (
          <g key={el.id} transform={`translate(${x},${y}) rotate(${el.rotation})`}>
            <path
              d={pathD}
              fill={`${color}22`}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Element label */}
            <text
              x={0}
              y={4}
              textAnchor="middle"
              style={{ fontSize: '10px', fontWeight: 'bold', fill: color }}
            >
              {idx + 1}
            </text>
          </g>
        );
      })}

      {/* Assembly label */}
      <text x={svgW / 2} y={svgH - 10} textAnchor="middle" className="fill-slate-500 text-[10px]">
        {elements.length} element{elements.length !== 1 ? 's' : ''} · Scale: {scale.toFixed(1)}x
      </text>
    </svg>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function BuiltUpCalculator() {
  const { t } = useLanguage();

  // Material
  const [fy, setFy] = useState(450);
  const [fu, setFu] = useState(500);
  const [E, setE] = useState(200000);
  const [nu, setNu] = useState(0.3);

  // Member
  const [Lb, setLb] = useState(3000);
  const [Cb, setCb] = useState(1.0);
  const [bendingAxis, setBendingAxis] = useState<BendingAxis>('major');
  const [endCondition, setEndCondition] = useState<EndCondition>('pinned-pinned');

  // Assembly
  const [assemblyName, setAssemblyName] = useState('My Built-up Section');
  const [elements, setElements] = useState<BuiltUpElement[]>(() => createPreset('back-to-back'));
  const [fastenerSpacing, setFastenerSpacing] = useState(300);
  const [fastenerCapacity, setFastenerCapacity] = useState(5);

  // Design actions
  const [Mstar, setMstar] = useState(10.0);
  const [Vstar, setVstar] = useState(25.0);

  // Element CRUD
  const addElement = useCallback(() => {
    setElements((prev) => [...prev, createDefaultElement(prev.length * 10)]);
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateElement = useCallback((updated: BuiltUpElement) => {
    setElements((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const applyPreset = useCallback((type: string) => {
    setElements(createPreset(type));
  }, []);

  // Compute
  const inputs: BuiltUpDesignInputs = useMemo(() => ({
    material: { fy, fu, E, nu, G: E / (2 * (1 + nu)) },
    assembly: {
      name: assemblyName,
      elements,
      fastenerSpacing,
      fastenerCapacity,
    },
    member: { Lb, Lc: Lb, Cb, bendingAxis, endCondition },
    Mstar,
    Vstar,
    Nstar: 0,
  }), [fy, fu, E, nu, assemblyName, elements, fastenerSpacing, fastenerCapacity, Lb, Cb, bendingAxis, endCondition, Mstar, Vstar]);

  const results: BuiltUpDesignResults | null = useMemo(() => {
    if (elements.length === 0) return null;
    try {
      return performBuiltUpDesign(inputs);
    } catch {
      return null;
    }
  }, [inputs, elements.length]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 px-2 sm:px-3">
              <span className="hidden sm:inline">← Back to Home</span>
              <span className="sm:hidden">←</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              CFS Built-up Section Designer
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AS/NZS 4600:2018 Cl. 4.3 – Freely compose built-up members
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT – Element editor */}
        <div className="lg:w-[440px] xl:w-[480px] overflow-y-auto border-r dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="p-4 space-y-4">
            {/* Material */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-center font-bold">1</span>
                  Material Properties
                </h3>
                <div className="space-y-2">
                  <NumberInput label="fy" value={fy} onChange={setFy} unit="MPa" step={10} />
                  <NumberInput label="fu" value={fu} onChange={setFu} unit="MPa" step={10} />
                  <NumberInput label="E" value={E} onChange={setE} unit="MPa" step={1000} />
                  <NumberInput label="ν" value={nu} onChange={setNu} step={0.01} />
                </div>
              </CardContent>
            </Card>

            {/* Member parameters */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-center font-bold">2</span>
                  Member Parameters
                </h3>
                <div className="space-y-2">
                  <NumberInput label="Lb" value={Lb} onChange={setLb} unit="mm" step={100} />
                  <NumberInput label="Cb" value={Cb} onChange={setCb} step={0.05} min={1} />
                  <SelectInput label="Bending axis" value={bendingAxis} onChange={(v) => setBendingAxis(v as BendingAxis)} options={[
                    { value: 'major', label: 'Major axis (x-x)' },
                    { value: 'minor', label: 'Minor axis (y-y)' },
                  ]} />
                  <SelectInput label="End condition" value={endCondition} onChange={(v) => setEndCondition(v as EndCondition)} options={[
                    { value: 'pinned-pinned', label: 'Pinned–Pinned' },
                    { value: 'fixed-free', label: 'Fixed–Free' },
                    { value: 'fixed-pinned', label: 'Fixed–Pinned' },
                    { value: 'fixed-fixed', label: 'Fixed–Fixed' },
                  ]} />
                </div>
              </CardContent>
            </Card>

            {/* Assembly */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs flex items-center justify-center font-bold">3</span>
                  Assembly Configuration
                </h3>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-400 w-32 shrink-0">Name</label>
                    <input
                      type="text"
                      value={assemblyName}
                      onChange={(e) => setAssemblyName(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    />
                  </div>
                  <NumberInput label="Fastener spc." value={fastenerSpacing} onChange={setFastenerSpacing} unit="mm" step={25} />
                  <NumberInput label="Fastener cap." value={fastenerCapacity} onChange={setFastenerCapacity} unit="kN" step={0.5} />
                </div>

                {/* Presets */}
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider">Quick Presets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'back-to-back', label: 'Back-to-back C' },
                      { key: 'face-to-face', label: 'Face-to-face C' },
                      { key: 'box', label: 'Box' },
                      { key: 'I-section', label: 'I-shaped' },
                    ].map((p) => (
                      <button
                        key={p.key}
                        onClick={() => applyPreset(p.key)}
                        className="px-2.5 py-1 text-xs rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Elements */}
                <div className="space-y-3">
                  {elements.map((el, idx) => (
                    <ElementEditor
                      key={el.id}
                      element={el}
                      index={idx}
                      onUpdate={updateElement}
                      onRemove={() => removeElement(el.id)}
                    />
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={addElement}
                >
                  + Add Element
                </Button>
              </CardContent>
            </Card>

            {/* Design Actions */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs flex items-center justify-center font-bold">4</span>
                  Design Actions
                </h3>
                <div className="space-y-2">
                  <NumberInput label="M*" value={Mstar} onChange={setMstar} unit="kN·m" step={0.5} />
                  <NumberInput label="V*" value={Vstar} onChange={setVstar} unit="kN" step={0.5} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CENTER – Assembly visualization */}
        <div className="hidden lg:flex lg:w-[340px] xl:w-[360px] flex-col items-center pt-6 bg-slate-50 dark:bg-slate-850 border-r dark:border-slate-700 overflow-y-auto">
          <AssemblyDiagram elements={elements} />

          {/* Assembly note */}
          {results && (
            <div className="mt-4 mx-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1">Cl. 4.3 Note</p>
              {results.assemblyProps.note}
            </div>
          )}
        </div>

        {/* RIGHT – Results */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="p-4 space-y-4">
            {results ? (
              <>
                {/* Combined Gross Properties */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                      Combined Gross Properties
                      <span className="text-xs font-normal text-slate-500 ml-2">Cl. 2.1 + Parallel Axis</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <ResultRow label="Ag" value={results.assemblyProps.combinedGross.Ag.toFixed(1)} unit="mm²" />
                      <ResultRow label="Ix" value={(results.assemblyProps.combinedGross.Ix / 1e4).toFixed(1)} unit="×10⁴ mm⁴" />
                      <ResultRow label="Iy" value={(results.assemblyProps.combinedGross.Iy / 1e4).toFixed(1)} unit="×10⁴ mm⁴" />
                      <ResultRow label="Sx" value={(results.assemblyProps.combinedGross.Sx / 1e3).toFixed(2)} unit="×10³ mm³" />
                      <ResultRow label="rx" value={results.assemblyProps.combinedGross.rx.toFixed(1)} unit="mm" />
                      <ResultRow label="ry" value={results.assemblyProps.combinedGross.ry.toFixed(1)} unit="mm" />
                      <ResultRow label="J" value={results.assemblyProps.combinedGross.J.toFixed(1)} unit="mm⁴" />
                      <ResultRow label="Cw" value={(results.assemblyProps.combinedGross.Cw / 1e6).toFixed(2)} unit="×10⁶ mm⁶" />
                    </div>
                  </CardContent>
                </Card>

                {/* Combined Effective Properties */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                      Combined Effective Properties (EWM)
                      <span className="text-xs font-normal text-slate-500 ml-2">Cl. 2.2</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <ResultRow label="Ae" value={results.assemblyProps.combinedEffective.Ae.toFixed(1)} unit="mm²" />
                      <ResultRow
                        label="Ae / Ag"
                        value={((results.assemblyProps.combinedEffective.Ae / results.assemblyProps.combinedGross.Ag) * 100).toFixed(1)}
                        unit="%"
                      />
                      <ResultRow label="Ze" value={(results.assemblyProps.combinedEffective.Ze / 1e3).toFixed(2)} unit="×10³ mm³" />
                    </div>
                  </CardContent>
                </Card>

                {/* Per-element properties */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                      Individual Element Properties
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">
                            <th className="py-1 pr-2">#</th>
                            <th className="py-1 pr-2">Ag (mm²)</th>
                            <th className="py-1 pr-2">Ix (×10⁴)</th>
                            <th className="py-1 pr-2">Ae (mm²)</th>
                            <th className="py-1 pr-2">Ae/Ag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.assemblyProps.elements.map((ep, idx) => (
                            <tr key={ep.id} className="border-b dark:border-slate-700/50">
                              <td className="py-1 pr-2 font-medium">{idx + 1}</td>
                              <td className="py-1 pr-2 font-mono">{ep.gross.Ag.toFixed(1)}</td>
                              <td className="py-1 pr-2 font-mono">{(ep.gross.Ix / 1e4).toFixed(1)}</td>
                              <td className="py-1 pr-2 font-mono">{ep.effective.Ae.toFixed(1)}</td>
                              <td className="py-1 pr-2 font-mono">{((ep.effective.Ae / ep.gross.Ag) * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Bending */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                      Design Bending Capacity
                      <span className="text-xs font-normal text-slate-500 ml-2">Cl. 3.3</span>
                    </h3>
                    <div className="space-y-1">
                      <ResultRow label="Mn (local)" value={results.bending.Mne_local} unit="kN·m" />
                      <ResultRow label="Mn (distortional)" value={results.bending.Mne_distortional} unit="kN·m" />
                      <ResultRow label="Mn (lateral-torsional)" value={results.bending.Mne_ltb} unit="kN·m" />
                      <div className="border-t dark:border-slate-700 my-2" />
                      <ResultRow label="Governing mode" value={results.bending.governingMode} highlight />
                      <ResultRow label="Mn" value={results.bending.Mn} unit="kN·m" highlight />
                      <ResultRow label={`ϕMn (ϕ=${results.bending.phi_b})`} value={results.bending.phiMn} unit="kN·m" highlight />
                    </div>
                  </CardContent>
                </Card>

                {/* Shear */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                      Design Shear Capacity
                      <span className="text-xs font-normal text-slate-500 ml-2">Cl. 3.3.4</span>
                    </h3>
                    <div className="space-y-1">
                      <ResultRow label="ΣVy (yield)" value={results.shear.Vy} unit="kN" />
                      <ResultRow label="ΣVcr (elastic)" value={results.shear.Vcr} unit="kN" />
                      <ResultRow label="λv (avg)" value={results.shear.lambda_v} />
                      <div className="border-t dark:border-slate-700 my-2" />
                      <ResultRow label="ΣVn" value={results.shear.Vn} unit="kN" highlight />
                      <ResultRow label={`ΣϕVn (ϕ=${results.shear.phi_v})`} value={results.shear.phiVn} unit="kN" highlight />
                    </div>
                  </CardContent>
                </Card>

                {/* Interaction */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                      Bending–Shear Interaction
                      <span className="text-xs font-normal text-slate-500 ml-2">Cl. 3.3.5</span>
                    </h3>
                    <div className="space-y-1">
                      <ResultRow label="M* / ϕMn" value={results.interaction.bendingRatio} />
                      <ResultRow label="V* / ϕVn" value={results.interaction.shearRatio} />
                      <div className="border-t dark:border-slate-700 my-2" />
                      <ResultRow
                        label="(M*/ϕMn)² + (V*/ϕVn)²"
                        value={results.interaction.interactionCircular}
                        status={results.interaction.interactionCircular <= 1 ? 'ok' : 'ng'}
                      />
                      <ResultRow
                        label="M*/ϕMn + V*/ϕVn (linear)"
                        value={results.interaction.interactionLinear}
                        status={results.interaction.interactionLinear <= 1 ? 'ok' : 'ng'}
                      />
                      <ResultRow
                        label="Status"
                        value={results.interaction.isAdequate ? 'ADEQUATE ≤ 1.0' : 'INADEQUATE > 1.0'}
                        status={results.interaction.isAdequate ? 'ok' : 'ng'}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <p>Add at least one element to the assembly to see results.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
