'use client';

import { CriticalFooting, ReinforcementInputs } from '@/types/footing';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface FootingCalculationStepsProps {
  footing: CriticalFooting;
  inputs: ReinforcementInputs;
  bearingCapacity: number;
}

export function FootingCalculationSteps({ 
  footing, 
  inputs,
  bearingCapacity 
}: FootingCalculationStepsProps) {
  const { t } = useLanguage();
  
  const B = footing.dimension;
  const h = footing.footingThickness || 0;
  const d = footing.effectiveDepth || 0;
  // Factored load: Pu = 1.4(DL+SDL) + 1.7(LL)
  const Pu = 1.4 * footing.dl_sdl + 1.7 * footing.ll;
  const qu = Pu / (B * B);
  const { fc, fy, columnWidth, columnDepth, barSize, cover } = inputs;
  
  // Use custom values if available
  const actualColumnWidth = footing.customColumnWidth || columnWidth;
  const actualColumnDepth = footing.customColumnDepth || columnDepth;
  const actualBarSize = footing.customBarSize || barSize;
  const actualThickness = footing.customThickness || h;
  const actualEffectiveDepth = footing.customThickness 
    ? (footing.customThickness - cover/1000 - actualBarSize/1000 - actualBarSize/2000)
    : d;
  const rho_min = fy >= 4000 ? 0.0020 : 0.0018;
  
  return (
    <Card className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        📋 Calculation Steps - {footing.footingName || footing.uniqueName}
      </h3>
      
      <div className="space-y-6 text-sm">
        {/* Step 1: Design Data */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Step 1: Design Data
          </h4>
          <div className="space-y-1 ml-4 text-slate-600 dark:text-slate-400 font-mono">
            <p>f'c = {fc} ksc (kg/cm²)</p>
            <p>fy = {fy} ksc (kg/cm²)</p>
            <p>Column size = {(actualColumnWidth * 100).toFixed(0)} × {(actualColumnDepth * 100).toFixed(0)} cm</p>
            <p>Footing size (B) = {B.toFixed(2)} × {B.toFixed(2)} m</p>
            <p>DL + SDL = {footing.dl_sdl.toFixed(2)} Tonf</p>
            <p>LL = {footing.ll.toFixed(2)} Tonf</p>
            <p>Total service load = {footing.totalLoad.toFixed(2)} Tonf</p>
            <p>Allowable bearing capacity = {bearingCapacity} Tonf/m²</p>
            <p>Cover = {cover} mm, Bar size = DB{actualBarSize}</p>
          </div>
        </div>
        
        {/* Step 2: Factored Load */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Step 2: Factored Load (SDM)
          </h4>
          <div className="space-y-1 ml-4 text-slate-600 dark:text-slate-400">
            <p className="font-mono">Pu = 1.4(DL+SDL) + 1.7(LL)</p>
            <p className="font-mono ml-4">= 1.4 × {footing.dl_sdl.toFixed(2)} + 1.7 × {footing.ll.toFixed(2)}</p>
            <p className="font-mono ml-4">= {Pu.toFixed(2)} Tonf</p>
            <p className="font-mono">qu = Pu / B² = {Pu.toFixed(2)} / ({B.toFixed(2)}²)</p>
            <p className="font-mono ml-4">= {qu.toFixed(3)} Tonf/m²</p>
          </div>
        </div>
        
        {/* Step 3: Footing Thickness */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Step 3: Footing Thickness (from Punching Shear)
          </h4>
          <div className="space-y-1 ml-4 text-slate-600 dark:text-slate-400">
            <p className="font-mono">β = c₁/c₂ = {(Math.max(actualColumnDepth, actualColumnWidth) / Math.min(actualColumnDepth, actualColumnWidth)).toFixed(2)}</p>
            <p className="font-mono">Assume h = {(actualThickness * 100).toFixed(0)} cm = {(actualThickness * 1000).toFixed(0)} mm</p>
            <p className="font-mono">Cover = {cover} mm, Bar size = DB{actualBarSize} mm</p>
            <p className="font-mono">d = h - cover - db - db/2</p>
            <p className="font-mono ml-4">= {(actualThickness * 1000).toFixed(0)} - {cover} - {actualBarSize} - {(actualBarSize/2).toFixed(0)}</p>
            <p className="font-mono ml-4">= {(actualEffectiveDepth * 1000).toFixed(1)} mm = {(actualEffectiveDepth * 100).toFixed(1)} cm</p>
            <p className="font-mono">bo = 2(c₁ + d) + 2(c₂ + d)</p>
            <p className="font-mono ml-4">= 2({(actualColumnWidth * 100).toFixed(0)} + {(actualEffectiveDepth * 100).toFixed(1)}) + 2({(actualColumnDepth * 100).toFixed(0)} + {(actualEffectiveDepth * 100).toFixed(1)})</p>
            <p className="font-mono ml-4">= {((2 * (actualColumnWidth + actualEffectiveDepth) + 2 * (actualColumnDepth + actualEffectiveDepth)) * 100).toFixed(1)} cm</p>
            <p className="font-mono">φVc = 0.85 × 0.53 × √f'c × bo × d</p>
            <p className="font-mono ml-4">= 0.85 × 0.53 × √{fc} × {((2 * (actualColumnWidth + actualEffectiveDepth) + 2 * (actualColumnDepth + actualEffectiveDepth)) * 100).toFixed(1)} × {(actualEffectiveDepth * 100).toFixed(1)}</p>
            <p className="font-mono ml-4">= {((footing.punchingShearCapacity || 0) * 1000).toFixed(0)} kg = {(footing.punchingShearCapacity || 0).toFixed(2)} Tonf</p>
            <p className={`font-semibold ml-4 ${footing.punchingShearOk ? 'text-green-600' : 'text-red-600'}`}>
              Pu = {Pu.toFixed(2)} Tonf {footing.punchingShearOk ? '< φVc ✓ OK' : '> φVc ✗ NG'}
            </p>
            <p className="text-xs ml-4 mt-1 text-slate-500 dark:text-slate-400">
              Note: ใช้ 0.53 สำหรับฐานรากจัตุรัส (β ≈ 1)
            </p>
          </div>
        </div>
        
        {/* Step 4: Design Moments */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Step 4: Design Moments (at face of column)
          </h4>
          <div className="space-y-1 ml-4 text-slate-600 dark:text-slate-400">
            <p className="font-mono">lx = (B - c₁) / 2 = ({B.toFixed(2)} - {actualColumnWidth.toFixed(2)}) / 2 = {((B - actualColumnWidth) / 2).toFixed(3)} m</p>
            <p className="font-mono">Mu-x = qu × B × lx² / 2</p>
            <p className="font-mono ml-4">= {qu.toFixed(3)} × {B.toFixed(2)} × {((B - actualColumnWidth) / 2).toFixed(3)}² / 2</p>
            <p className="font-mono ml-4">= {(footing.momentX || 0).toFixed(2)} Tonf-m</p>
            <br />
            <p className="font-mono">ly = (B - c₂) / 2 = ({B.toFixed(2)} - {actualColumnDepth.toFixed(2)}) / 2 = {((B - actualColumnDepth) / 2).toFixed(3)} m</p>
            <p className="font-mono">Mu-y = qu × B × ly² / 2</p>
            <p className="font-mono ml-4">= {qu.toFixed(3)} × {B.toFixed(2)} × {((B - actualColumnDepth) / 2).toFixed(3)}² / 2</p>
            <p className="font-mono ml-4">= {(footing.momentY || 0).toFixed(2)} Tonf-m</p>
          </div>
        </div>
        
        {/* Step 5: Required Steel (X Direction) */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Step 5: Required Steel (X Direction)
          </h4>
          <div className="space-y-1 ml-4 text-slate-600 dark:text-slate-400">
            <p className="font-mono">Rn = Mu / (φ × b × d²)</p>
            <p className="font-mono ml-4">= {((footing.momentX || 0) * 100000).toFixed(0)} / (0.9 × {(B * 100).toFixed(0)} × {(actualEffectiveDepth * 100).toFixed(1)}²)</p>
            <p className="font-mono ml-4">= {(((footing.momentX || 0) * 100000) / (0.9 * B * 100 * (actualEffectiveDepth * 100) * (actualEffectiveDepth * 100))).toFixed(2)} kgf/cm²</p>
            <p className="font-mono">ρ = (0.85 × f'c / fy) × [1 - √(1 - 2Rn / (0.85 × f'c))]</p>
            <p className="font-mono">As,req = ρ × b × d = {(footing.asReqX || 0).toFixed(2)} cm²</p>
            <p className="font-mono">As,min = {rho_min} × b × h = {(footing.asMinX || 0).toFixed(2)} cm²</p>
            <p className="font-semibold ml-4">Use As = max(As,req, As,min) = {Math.max(footing.asReqX || 0, footing.asMinX || 0).toFixed(2)} cm²</p>
            <p className="font-mono">Ab = π × db² / 4 = π × {actualBarSize}² / 4 = {(Math.PI * actualBarSize * actualBarSize / 4 / 100).toFixed(2)} cm²</p>
            <p className="font-mono">Number of bars = {footing.numBarsX} - DB{actualBarSize}</p>
            <p className="font-mono">Spacing = {(footing.spacingX || 0).toFixed(0)} mm</p>
          </div>
        </div>
        
        {/* Step 6: Required Steel (Y Direction) */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Step 6: Required Steel (Y Direction)
          </h4>
          <div className="space-y-1 ml-4 text-slate-600 dark:text-slate-400">
            <p className="font-mono">As,req = {(footing.asReqY || 0).toFixed(2)} cm²</p>
            <p className="font-mono">As,min = {(footing.asMinY || 0).toFixed(2)} cm²</p>
            <p className="font-semibold ml-4">Use As = {Math.max(footing.asReqY || 0, footing.asMinY || 0).toFixed(2)} cm²</p>
            <p className="font-mono">Number of bars = {footing.numBarsY} - DB{actualBarSize}</p>
            <p className="font-mono">Spacing = {(footing.spacingY || 0).toFixed(0)} mm</p>
          </div>
        </div>
        
        {/* Step 7: Beam Shear Check */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Step 7: Beam Shear Check (at d from face of column)
          </h4>
          <div className="space-y-1 ml-4 text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-300">X-direction:</p>
            <p className="font-mono ml-2">x = (B - c₁) / 2 - d = {((B - actualColumnWidth) / 2 - actualEffectiveDepth).toFixed(3)} m</p>
            <p className="font-mono ml-2">Vu = qu × B × x = {(footing.beamShearX || 0).toFixed(2)} Tonf</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mt-1">Y-direction:</p>
            <p className="font-mono ml-2">x = (B - c₂) / 2 - d = {((B - actualColumnDepth) / 2 - actualEffectiveDepth).toFixed(3)} m</p>
            <p className="font-mono ml-2">Vu = qu × B × x = {(footing.beamShearY || 0).toFixed(2)} Tonf</p>
            <p className="font-mono mt-1">φVc = 0.85 × 0.17 × √f'c × B × d</p>
            <p className="font-mono ml-4">= {(footing.beamShearCapacityX || 0).toFixed(2)} Tonf</p>
            <p className={`font-semibold ml-4 ${footing.beamShearOkX && footing.beamShearOkY ? 'text-green-600' : 'text-red-600'}`}>
              {footing.beamShearOkX && footing.beamShearOkY ? '✓ Beam shear OK' : '✗ Beam shear NG - Increase thickness'}
            </p>
          </div>
        </div>
        
        {/* Summary */}
        <div className="border-t border-slate-300 dark:border-slate-600 pt-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Design Summary
          </h4>
          <div className="space-y-1 ml-4">
            <p className="font-semibold text-blue-600 dark:text-blue-400">
              Footing: {B.toFixed(2)} × {B.toFixed(2)} × {(actualThickness * 100).toFixed(0)} cm
            </p>
            <p className="font-semibold text-blue-600 dark:text-blue-400">
              Reinforcement X: {footing.numBarsX}-DB{actualBarSize} @ {(footing.spacingX || 0).toFixed(0)} mm
            </p>
            <p className="font-semibold text-blue-600 dark:text-blue-400">
              Reinforcement Y: {footing.numBarsY}-DB{actualBarSize} @ {(footing.spacingY || 0).toFixed(0)} mm
            </p>
            <p className={`font-semibold ${
              footing.punchingShearOk && footing.beamShearOkX && footing.beamShearOkY 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {footing.punchingShearOk && footing.beamShearOkX && footing.beamShearOkY 
                ? '✓ All checks passed' 
                : '✗ Some checks failed - Review design'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
