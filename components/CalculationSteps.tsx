'use client';

import { CalculationResults, BeamInputs, CalculationMethod } from '@/types/beam';
import { formatNumber, steelGradeData, getModularRatio, getBeta1, roundBarData } from '@/lib/calculations/common';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalculationStepsProps {
  results: CalculationResults;
  inputs: BeamInputs;
  method: CalculationMethod;
}

interface EquationProps {
  label: string;
  formula: string;
  substitution: string;
  result: string;
  unit?: string;
}

function Equation({ label, formula, substitution, result, unit = '' }: EquationProps) {
  return (
    <div className="py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{label}</div>
      <div className="space-y-1 pl-4 font-mono text-sm">
        <div className="text-slate-600 dark:text-slate-400">{formula}</div>
        <div className="text-slate-500 dark:text-slate-500">{substitution}</div>
        <div className="text-blue-600 dark:text-blue-400 font-semibold">= {result} {unit}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-700 px-3 py-2 -mx-3 mb-3 mt-4 first:mt-0">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
    </div>
  );
}

export function CalculationSteps({ results, inputs, method }: CalculationStepsProps) {
  const { t } = useLanguage();
  const { section, wsd, sdm } = results;
  const { concreteGrade, steelGrade, width, height, cover, stirrupSize, stirrupSpacing } = inputs;

  const fy = steelGradeData[steelGrade].fy;
  const fc = concreteGrade;
  const n = getModularRatio(fc);
  const As = section.totalSteelArea;
  const d = section.effectiveDepth;
  const b = width;
  const Av = 2 * roundBarData[stirrupSize].area;

  if (method === 'WSD') {
    return (
      <div className="p-3 space-y-1 text-sm">
        <SectionHeader title="1. Allowable Stresses" />

        <Equation
          label="Allowable Concrete Stress (fc)"
          formula="fc = 0.45 × f'c"
          substitution={`fc = 0.45 × ${fc}`}
          result={formatNumber(wsd.allowableConcreteStress, 0)}
          unit="kg/cm²"
        />

        <Equation
          label="Allowable Steel Stress (fs)"
          formula="fs = 0.5 × fy"
          substitution={`fs = 0.5 × ${fy}`}
          result={formatNumber(wsd.allowableSteelStress, 0)}
          unit="kg/cm²"
        />

        <Equation
          label="Modular Ratio (n)"
          formula="n = Es / Ec = Es / (15100 × √f'c)"
          substitution={`n = 2,040,000 / (15100 × √${fc})`}
          result={formatNumber(wsd.modularRatio, 2)}
        />

        <SectionHeader title="2. Section Analysis" />

        <Equation
          label="Steel Ratio × n (ρn)"
          formula="ρn = (As / (b × d)) × n"
          substitution={`ρn = (${formatNumber(As, 2)} / (${b} × ${formatNumber(d, 2)})) × ${formatNumber(n, 2)}`}
          result={formatNumber((As / (b * d)) * n, 4)}
        />

        <Equation
          label="Neutral Axis Ratio (k)"
          formula="k = √(2ρn + (ρn)²) - ρn"
          substitution={`k = √(2×${formatNumber((As / (b * d)) * n, 4)} + ${formatNumber((As / (b * d)) * n, 4)}²) - ${formatNumber((As / (b * d)) * n, 4)}`}
          result={formatNumber(wsd.neutralAxisDepth / d, 4)}
        />

        <Equation
          label="Neutral Axis Depth (kd)"
          formula="kd = k × d"
          substitution={`kd = ${formatNumber(wsd.neutralAxisDepth / d, 4)} × ${formatNumber(d, 2)}`}
          result={formatNumber(wsd.neutralAxisDepth, 2)}
          unit="cm"
        />

        <Equation
          label="Lever Arm Factor (j)"
          formula="j = 1 - k/3"
          substitution={`j = 1 - ${formatNumber(wsd.neutralAxisDepth / d, 4)}/3`}
          result={formatNumber(wsd.leverArm / d, 4)}
        />

        <Equation
          label="Lever Arm (jd)"
          formula="jd = j × d"
          substitution={`jd = ${formatNumber(wsd.leverArm / d, 4)} × ${formatNumber(d, 2)}`}
          result={formatNumber(wsd.leverArm, 2)}
          unit="cm"
        />

        <SectionHeader title="3. Moment Capacity" />

        <Equation
          label="Moment by Concrete"
          formula="Mc = (fc × b × k × j × d²) / 2"
          substitution={`Mc = (${formatNumber(wsd.allowableConcreteStress, 0)} × ${b} × ${formatNumber(wsd.neutralAxisDepth / d, 4)} × ${formatNumber(wsd.leverArm / d, 4)} × ${formatNumber(d, 2)}²) / 2`}
          result={formatNumber(wsd.allowableConcreteStress * b * (wsd.neutralAxisDepth / d) * (wsd.leverArm / d) * d * d / 2 / 100, 0)}
          unit="kg-m"
        />

        <Equation
          label="Moment by Steel"
          formula="Ms = As × fs × j × d"
          substitution={`Ms = ${formatNumber(As, 2)} × ${formatNumber(wsd.allowableSteelStress, 0)} × ${formatNumber(wsd.leverArm / d, 4)} × ${formatNumber(d, 2)}`}
          result={formatNumber(As * wsd.allowableSteelStress * (wsd.leverArm / d) * d / 100, 0)}
          unit="kg-m"
        />

        <Equation
          label="Moment Capacity (M)"
          formula="M = min(Mc, Ms)"
          substitution={`M = min(${formatNumber(wsd.allowableConcreteStress * b * (wsd.neutralAxisDepth / d) * (wsd.leverArm / d) * d * d / 2 / 100, 0)}, ${formatNumber(As * wsd.allowableSteelStress * (wsd.leverArm / d) * d / 100, 0)})`}
          result={formatNumber(wsd.momentCapacity, 0)}
          unit="kg-m"
        />

        <SectionHeader title="4. Shear Capacity" />

        <Equation
          label="Concrete Shear (Vc)"
          formula="Vc = 0.29 × √f'c × b × d"
          substitution={`Vc = 0.29 × √${fc} × ${b} × ${formatNumber(d, 2)}`}
          result={formatNumber(0.29 * Math.sqrt(fc) * b * d, 0)}
          unit="kg"
        />

        <Equation
          label="Stirrup Shear (Vs)"
          formula="Vs = (Av × 0.5 × fy × d) / s"
          substitution={`Vs = (${formatNumber(Av, 3)} × 0.5 × ${fy} × ${formatNumber(d, 2)}) / ${stirrupSpacing}`}
          result={formatNumber((Av * 0.5 * fy * d) / stirrupSpacing, 0)}
          unit="kg"
        />

        <Equation
          label="Total Shear Capacity (V)"
          formula="V = Vc + Vs"
          substitution={`V = ${formatNumber(0.29 * Math.sqrt(fc) * b * d, 0)} + ${formatNumber((Av * 0.5 * fy * d) / stirrupSpacing, 0)}`}
          result={formatNumber(wsd.shearCapacity, 0)}
          unit="kg"
        />
      </div>
    );
  }

  // SDM Method
  const beta1 = getBeta1(fc);

  return (
    <div className="p-3 space-y-1 text-sm">
      <SectionHeader title="1. Material Properties" />

      <Equation
        label="Beta Factor (β₁)"
        formula={fc <= 280 ? "β₁ = 0.85 (for f'c ≤ 280)" : "β₁ = 0.85 - 0.05×((f'c - 280) / 70)"}
        substitution={fc <= 280 ? `β₁ = 0.85` : `β₁ = 0.85 - 0.05×((${fc} - 280) / 70)`}
        result={formatNumber(sdm.beta1, 3)}
      />

      <SectionHeader title="2. Reinforcement Ratios" />

      <Equation
        label="Balanced Ratio (ρb)"
        formula="ρb = 0.85 × β₁ × (f'c/fy) × (6000/(6000+fy))"
        substitution={`ρb = 0.85 × ${formatNumber(beta1, 3)} × (${fc}/${fy}) × (6000/(6000+${fy}))`}
        result={formatNumber(sdm.balancedRatio * 100, 3)}
        unit="%"
      />

      <Equation
        label="Maximum Ratio (ρmax)"
        formula="ρmax = 0.75 × ρb"
        substitution={`ρmax = 0.75 × ${formatNumber(sdm.balancedRatio * 100, 3)}%`}
        result={formatNumber(sdm.maxRatio * 100, 3)}
        unit="%"
      />

      <Equation
        label="Actual Ratio (ρ)"
        formula="ρ = As / (b × d)"
        substitution={`ρ = ${formatNumber(As, 2)} / (${b} × ${formatNumber(d, 2)})`}
        result={formatNumber(section.steelRatio * 100, 3)}
        unit="%"
      />

      <div className="py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Check: ρ ≤ ρmax</div>
        <div className="pl-4">
          <span className={`font-semibold ${sdm.isUnderReinforced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatNumber(section.steelRatio * 100, 3)}% {sdm.isUnderReinforced ? '≤' : '>'} {formatNumber(sdm.maxRatio * 100, 3)}%
            → {sdm.isUnderReinforced ? 'OK (Under-reinforced)' : 'NG (Over-reinforced)'}
          </span>
        </div>
      </div>

      <SectionHeader title="3. Section Analysis" />

      <Equation
        label="Compression Block Depth (a)"
        formula="a = (As × fy) / (0.85 × f'c × b)"
        substitution={`a = (${formatNumber(As, 2)} × ${fy}) / (0.85 × ${fc} × ${b})`}
        result={formatNumber(sdm.compressionBlockDepth, 2)}
        unit="cm"
      />

      <Equation
        label="Neutral Axis Depth (c)"
        formula="c = a / β₁"
        substitution={`c = ${formatNumber(sdm.compressionBlockDepth, 2)} / ${formatNumber(beta1, 3)}`}
        result={formatNumber(sdm.compressionBlockDepth / beta1, 2)}
        unit="cm"
      />

      <SectionHeader title="4. Moment Capacity" />

      <Equation
        label="Nominal Moment (Mn)"
        formula="Mn = As × fy × (d - a/2)"
        substitution={`Mn = ${formatNumber(As, 2)} × ${fy} × (${formatNumber(d, 2)} - ${formatNumber(sdm.compressionBlockDepth, 2)}/2)`}
        result={formatNumber(sdm.nominalMoment, 0)}
        unit="kg-m"
      />

      <Equation
        label="Design Moment (φMn)"
        formula="φMn = φ × Mn (φ = 0.9)"
        substitution={`φMn = 0.9 × ${formatNumber(sdm.nominalMoment, 0)}`}
        result={formatNumber(sdm.designMoment, 0)}
        unit="kg-m"
      />

      <SectionHeader title="5. Shear Capacity" />

      <Equation
        label="Concrete Shear (Vc)"
        formula="Vc = 0.53 × √f'c × b × d"
        substitution={`Vc = 0.53 × √${fc} × ${b} × ${formatNumber(d, 2)}`}
        result={formatNumber(0.53 * Math.sqrt(fc) * b * d, 0)}
        unit="kg"
      />

      <Equation
        label="Stirrup Shear (Vs)"
        formula="Vs = (Av × fy × d) / s"
        substitution={`Vs = (${formatNumber(Av, 3)} × ${fy} × ${formatNumber(d, 2)}) / ${stirrupSpacing}`}
        result={formatNumber((Av * fy * d) / stirrupSpacing, 0)}
        unit="kg"
      />

      <Equation
        label="Nominal Shear (Vn)"
        formula="Vn = Vc + Vs"
        substitution={`Vn = ${formatNumber(0.53 * Math.sqrt(fc) * b * d, 0)} + ${formatNumber((Av * fy * d) / stirrupSpacing, 0)}`}
        result={formatNumber(sdm.nominalShear, 0)}
        unit="kg"
      />

      <Equation
        label="Design Shear (φVn)"
        formula="φVn = φ × Vn (φ = 0.85)"
        substitution={`φVn = 0.85 × ${formatNumber(sdm.nominalShear, 0)}`}
        result={formatNumber(sdm.designShear, 0)}
        unit="kg"
      />
    </div>
  );
}
