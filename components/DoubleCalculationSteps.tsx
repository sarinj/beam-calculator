'use client';

import { DoubleCalculationResults, DoubleBeamInputs, CalculationMethod } from '@/types/beam';
import { formatNumber, steelGradeData, getModularRatio, getBeta1, roundBarData, STEEL_MODULUS } from '@/lib/calculations/common';
import { useLanguage } from '@/contexts/LanguageContext';

interface DoubleCalculationStepsProps {
  results: DoubleCalculationResults;
  inputs: DoubleBeamInputs;
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

export function DoubleCalculationSteps({ results, inputs, method }: DoubleCalculationStepsProps) {
  const { t } = useLanguage();
  const { section, wsd, sdm } = results;
  const { concreteGrade, steelGrade, width, stirrupSize, stirrupSpacing } = inputs;

  const fy = steelGradeData[steelGrade].fy;
  const fc = concreteGrade;
  const n = getModularRatio(fc);
  const As = section.tensionSteelArea;
  const AsPrime = section.compressionSteelArea;
  const d = section.effectiveDepth;
  const dPrime = section.effectiveDepthPrime;
  const b = width;
  const Av = 2 * roundBarData[stirrupSize].area;

  if (method === 'WSD') {
    const nPrime = 2 * n - 1;

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
          formula="n = Es / Ec"
          substitution={`n = 2,040,000 / (15100 × √${fc})`}
          result={formatNumber(wsd.modularRatio, 2)}
        />

        <SectionHeader title="2. Section Properties" />

        <Equation
          label="Tension Steel Area (As)"
          formula="As = Σ(bar area × count)"
          substitution={`As = total from tension layers`}
          result={formatNumber(As, 2)}
          unit="cm²"
        />

        <Equation
          label="Compression Steel Area (As')"
          formula="As' = Σ(bar area × count)"
          substitution={`As' = total from compression layers`}
          result={formatNumber(AsPrime, 2)}
          unit="cm²"
        />

        <Equation
          label="Effective Depth (d)"
          formula="d = h - cover - stirrup - bar/2"
          substitution={`d = from geometry`}
          result={formatNumber(d, 2)}
          unit="cm"
        />

        <Equation
          label="Compression Steel Depth (d')"
          formula="d' = cover + stirrup + bar/2"
          substitution={`d' = from geometry`}
          result={formatNumber(dPrime, 2)}
          unit="cm"
        />

        <SectionHeader title="3. Neutral Axis Analysis" />

        <Equation
          label="Transformed Comp. Steel Factor (2n-1)"
          formula="2n - 1"
          substitution={`2 × ${formatNumber(n, 2)} - 1`}
          result={formatNumber(nPrime, 2)}
        />

        <div className="py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quadratic Equation for kd</div>
          <div className="pl-4 font-mono text-sm space-y-1">
            <div className="text-slate-600 dark:text-slate-400">b×kd²/2 + (2n-1)×As'×(kd-d') = n×As×(d-kd)</div>
            <div className="text-slate-500 dark:text-slate-500">Solving: a×kd² + b×kd + c = 0</div>
          </div>
        </div>

        <Equation
          label="Neutral Axis Depth (kd)"
          formula="kd = (-b + √(b² - 4ac)) / 2a"
          substitution={`kd = solution of quadratic`}
          result={formatNumber(wsd.neutralAxisDepth, 2)}
          unit="cm"
        />

        <SectionHeader title="4. Stress in Compression Steel" />

        <Equation
          label="Compression Steel Stress (fs')"
          formula="fs' = min(fs, 2×fc×(kd-d')/kd)"
          substitution={`fs' = min(${formatNumber(wsd.allowableSteelStress, 0)}, 2×${formatNumber(wsd.allowableConcreteStress, 0)}×(${formatNumber(wsd.neutralAxisDepth, 2)}-${formatNumber(dPrime, 2)})/${formatNumber(wsd.neutralAxisDepth, 2)})`}
          result={formatNumber(wsd.compressionSteelStress, 0)}
          unit="kg/cm²"
        />

        <SectionHeader title="5. Moment Capacity" />

        <Equation
          label="Concrete Moment"
          formula="Mc = fc × b × kd × (d - kd/3) / 2"
          substitution={`Mc = ${formatNumber(wsd.allowableConcreteStress, 0)} × ${b} × ${formatNumber(wsd.neutralAxisDepth, 2)} × (${formatNumber(d, 2)} - ${formatNumber(wsd.neutralAxisDepth, 2)}/3) / 2`}
          result={formatNumber(wsd.allowableConcreteStress * b * wsd.neutralAxisDepth * (d - wsd.neutralAxisDepth / 3) / 2 / 100, 0)}
          unit="kg-m"
        />

        <Equation
          label="Compression Steel Moment"
          formula="Ms' = As' × fs' × (d - d')"
          substitution={`Ms' = ${formatNumber(AsPrime, 2)} × ${formatNumber(wsd.compressionSteelStress, 0)} × (${formatNumber(d, 2)} - ${formatNumber(dPrime, 2)})`}
          result={formatNumber(AsPrime * wsd.compressionSteelStress * (d - dPrime) / 100, 0)}
          unit="kg-m"
        />

        <Equation
          label="Total Moment Capacity"
          formula="M = Mc + Ms'"
          substitution={`M = ${formatNumber(wsd.allowableConcreteStress * b * wsd.neutralAxisDepth * (d - wsd.neutralAxisDepth / 3) / 2 / 100, 0)} + ${formatNumber(AsPrime * wsd.compressionSteelStress * (d - dPrime) / 100, 0)}`}
          result={formatNumber(wsd.momentCapacity, 0)}
          unit="kg-m"
        />

        <SectionHeader title="6. Shear Capacity" />

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
          label="Total Shear Capacity"
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

      <SectionHeader title="2. Section Properties" />

      <Equation
        label="Tension Steel Area (As)"
        formula="As = Σ(bar area × count)"
        substitution={`As = total from tension layers`}
        result={formatNumber(As, 2)}
        unit="cm²"
      />

      <Equation
        label="Compression Steel Area (As')"
        formula="As' = Σ(bar area × count)"
        substitution={`As' = total from compression layers`}
        result={formatNumber(AsPrime, 2)}
        unit="cm²"
      />

      <SectionHeader title="3. Reinforcement Ratios" />

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
        label="Net Tension Ratio"
        formula="ρnet = (As - As') / (b × d)"
        substitution={`ρnet = (${formatNumber(As, 2)} - ${formatNumber(AsPrime, 2)}) / (${b} × ${formatNumber(d, 2)})`}
        result={formatNumber((As - AsPrime) / (b * d) * 100, 3)}
        unit="%"
      />

      <div className="py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Check: ρnet ≤ ρmax</div>
        <div className="pl-4">
          <span className={`font-semibold ${sdm.isUnderReinforced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatNumber((As - AsPrime) / (b * d) * 100, 3)}% {sdm.isUnderReinforced ? '≤' : '>'} {formatNumber(sdm.maxRatio * 100, 3)}%
            → {sdm.isUnderReinforced ? 'OK (Under-reinforced)' : 'NG (Over-reinforced)'}
          </span>
        </div>
      </div>

      <SectionHeader title="4. Compression Block Analysis" />

      <Equation
        label="Compression Block Depth (a)"
        formula="a = (As - As') × fy / (0.85 × f'c × b)"
        substitution={`a = (${formatNumber(As, 2)} - ${formatNumber(AsPrime, 2)}) × ${fy} / (0.85 × ${fc} × ${b})`}
        result={formatNumber(sdm.compressionBlockDepth, 2)}
        unit="cm"
      />

      <Equation
        label="Neutral Axis (c)"
        formula="c = a / β₁"
        substitution={`c = ${formatNumber(sdm.compressionBlockDepth, 2)} / ${formatNumber(beta1, 3)}`}
        result={formatNumber(sdm.compressionBlockDepth / beta1, 2)}
        unit="cm"
      />

      <SectionHeader title="5. Compression Steel Check" />

      <Equation
        label="Strain in Comp. Steel (εs')"
        formula="εs' = 0.003 × (c - d') / c"
        substitution={`εs' = 0.003 × (${formatNumber(sdm.compressionBlockDepth / beta1, 2)} - ${formatNumber(dPrime, 2)}) / ${formatNumber(sdm.compressionBlockDepth / beta1, 2)}`}
        result={formatNumber(0.003 * (sdm.compressionBlockDepth / beta1 - dPrime) / (sdm.compressionBlockDepth / beta1), 6)}
      />

      <Equation
        label="Yield Strain"
        formula="εy = fy / Es"
        substitution={`εy = ${fy} / 2,040,000`}
        result={formatNumber(fy / STEEL_MODULUS, 6)}
      />

      <div className="py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Compression Steel Status</div>
        <div className="pl-4">
          <span className={`font-semibold ${sdm.compressionSteelYields ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
            εs' {sdm.compressionSteelYields ? '≥' : '<'} εy
            → {sdm.compressionSteelYields ? 'Yields (fs\' = fy)' : 'Does not yield'}
          </span>
        </div>
      </div>

      <Equation
        label="Compression Steel Stress (fs')"
        formula={sdm.compressionSteelYields ? "fs' = fy (yields)" : "fs' = Es × εs'"}
        substitution={sdm.compressionSteelYields ? `fs' = ${fy}` : `fs' = 2,040,000 × ${formatNumber(0.003 * (sdm.compressionBlockDepth / beta1 - dPrime) / (sdm.compressionBlockDepth / beta1), 6)}`}
        result={formatNumber(sdm.compressionSteelStress, 0)}
        unit="kg/cm²"
      />

      <SectionHeader title="6. Moment Capacity" />

      <Equation
        label="Moment from Net Tension"
        formula="Mn1 = (As - As') × fy × (d - a/2)"
        substitution={`Mn1 = (${formatNumber(As, 2)} - ${formatNumber(AsPrime, 2)}) × ${fy} × (${formatNumber(d, 2)} - ${formatNumber(sdm.compressionBlockDepth, 2)}/2)`}
        result={formatNumber((As - AsPrime) * fy * (d - sdm.compressionBlockDepth / 2) / 100, 0)}
        unit="kg-m"
      />

      <Equation
        label="Moment from Comp. Steel"
        formula="Mn2 = As' × fs' × (d - d')"
        substitution={`Mn2 = ${formatNumber(AsPrime, 2)} × ${formatNumber(sdm.compressionSteelStress, 0)} × (${formatNumber(d, 2)} - ${formatNumber(dPrime, 2)})`}
        result={formatNumber(AsPrime * sdm.compressionSteelStress * (d - dPrime) / 100, 0)}
        unit="kg-m"
      />

      <Equation
        label="Nominal Moment (Mn)"
        formula="Mn = Mn1 + Mn2"
        substitution={`Mn = ${formatNumber((As - AsPrime) * fy * (d - sdm.compressionBlockDepth / 2) / 100, 0)} + ${formatNumber(AsPrime * sdm.compressionSteelStress * (d - dPrime) / 100, 0)}`}
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

      <SectionHeader title="7. Shear Capacity" />

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
