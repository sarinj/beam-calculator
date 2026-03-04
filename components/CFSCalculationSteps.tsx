'use client';

import { CFSDesignInputs, CFSDesignResults } from '@/types/cfs';
import { Card, CardContent } from '@/components/ui/card';

interface CFSCalculationStepsProps {
  inputs: CFSDesignInputs;
  results: CFSDesignResults;
}

function StepSection({
  title,
  clause,
  children,
}: {
  title: string;
  clause: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">
        {title}
        <span className="text-xs font-normal text-slate-500 ml-2">[{clause}]</span>
      </h4>
      <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 text-xs font-mono leading-relaxed text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

/**
 * Detailed calculation steps with AS/NZS 4600:2018 clause references.
 */
export function CFSCalculationSteps({ inputs, results }: CFSCalculationStepsProps) {
  const { material, geometry, member } = inputs;
  const { grossProps, effectiveProps, bending, shear, compression, interaction } = results;

  const { t, d, bf, lipLength, radius } = geometry;
  const { fy, fu, E, nu } = material;
  const G = E / (2 * (1 + nu));

  // Flat widths
  const flatWeb = d - 2 * (radius + t);
  const flatFlange = bf - 2 * (radius + t);
  const flatLip = lipLength - (radius + t / 2);

  const Ke = member.endCondition === 'pinned-pinned' ? 1.0
    : member.endCondition === 'fixed-free' ? 2.0
    : member.endCondition === 'fixed-pinned' ? 0.7 : 0.5;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b dark:border-slate-700">
          Calculation Steps – AS/NZS 4600:2018
        </h3>

        {/* Step 1: Material */}
        <StepSection title="Step 1: Material Properties" clause="Cl. 1.5">
          {`fy  = ${fy} MPa
fu  = ${fu} MPa
E   = ${E} MPa
ν   = ${nu}
G   = E / [2(1+ν)] = ${E} / [2(1+${nu})] = ${G.toFixed(0)} MPa`}
        </StepSection>

        {/* Step 2: Geometry */}
        <StepSection title="Step 2: Section Geometry" clause="Cl. 2.1">
          {`Section type: ${geometry.sectionType}
Total depth d    = ${d} mm
Flange width bf  = ${bf} mm
Thickness t      = ${t} mm
Lip length       = ${lipLength} mm
Inside radius r  = ${radius} mm

Flat widths (excl. corners):
  Web:    w_web    = d - 2(r+t) = ${d} - 2(${radius}+${t}) = ${flatWeb.toFixed(1)} mm
  Flange: w_flange = bf - 2(r+t) = ${bf} - 2(${radius}+${t}) = ${flatFlange.toFixed(1)} mm
  Lip:    w_lip    = lip - (r+t/2) = ${lipLength} - (${radius}+${t}/2) = ${flatLip.toFixed(1)} mm`}
        </StepSection>

        {/* Step 3: Gross properties */}
        <StepSection title="Step 3: Gross Section Properties" clause="Cl. 2.1">
          {`Using mid-line (centre-line) model:

Ag  = ${grossProps.Ag.toFixed(1)} mm²
Ix  = ${grossProps.Ix.toFixed(0)} mm⁴  = ${(grossProps.Ix / 1e4).toFixed(1)} × 10⁴ mm⁴
Iy  = ${grossProps.Iy.toFixed(0)} mm⁴  = ${(grossProps.Iy / 1e4).toFixed(1)} × 10⁴ mm⁴
Sx  = ${grossProps.Sx.toFixed(0)} mm³  = ${(grossProps.Sx / 1e3).toFixed(2)} × 10³ mm³
rx  = √(Ix/Ag) = ${grossProps.rx.toFixed(1)} mm
ry  = √(Iy/Ag) = ${grossProps.ry.toFixed(1)} mm
J   = (1/3)·Σ(b·t³) = ${grossProps.J.toFixed(1)} mm⁴
Cw  = ${(grossProps.Cw / 1e6).toFixed(2)} × 10⁶ mm⁶`}
        </StepSection>

        {/* Step 4: EWM */}
        <StepSection title="Step 4: Effective Width Method (EWM)" clause="Cl. 2.2.1.2">
          {`For each compressed element:
  λ = (1.052/√k) · (w/t) · √(f/E)
  If λ ≤ 0.673: fully effective (ρ = 1.0)
  If λ > 0.673: ρ = (1 - 0.22/λ) / λ
  Effective width: be = ρ · w

Web (k ≈ 23.9, stress gradient in bending):
  λ_web = ${effectiveProps.webLambda.toFixed(3)}
  Eff. width = ${effectiveProps.webEffWidth.toFixed(1)} mm

Flange (k = 4.0, edge-stiffened):
  λ_flg = ${effectiveProps.flangeLambda.toFixed(3)}
  Eff. width = ${effectiveProps.flangeEffWidth.toFixed(1)} mm

Lip (k = 0.43, unstiffened):
  λ_lip = ${effectiveProps.lipLambda.toFixed(3)}
  Eff. width = ${effectiveProps.lipEffWidth.toFixed(1)} mm

Effective properties:
  Ae  = ${effectiveProps.Ae.toFixed(1)} mm²   (Ae/Ag = ${((effectiveProps.Ae / grossProps.Ag) * 100).toFixed(1)}%)
  Ixe = ${(effectiveProps.Ixe / 1e4).toFixed(1)} × 10⁴ mm⁴
  Ze  = ${(effectiveProps.Ze / 1e3).toFixed(2)} × 10³ mm³`}
        </StepSection>

        {/* Step 5: Bending capacity – DSM */}
        <StepSection title="Step 5: Bending Capacity (DSM)" clause="Cl. 7.2.2">
          {`My = Sx × fy = ${(grossProps.Sx / 1e3).toFixed(2)}×10³ × ${fy} = ${bending.My.toFixed(2)} kN·m

BUCKLING STRESSES:
  fol = ${bending.fol.toFixed(3)} MPa (elastic local buckling)
  fod = ${bending.fod.toFixed(3)} MPa (elastic distortional buckling)

ELASTIC BUCKLING MOMENTS:
  Mol = Sx × fol = ${bending.Mcr_local.toFixed(3)} kN·m
  Mod = Sx × fod = ${bending.Mcr_dist.toFixed(3)} kN·m

(a) LATERAL-TORSIONAL BUCKLING [Cl. 7.2.2.2]:
  Cb = ${member.Cb.toFixed(2)} (moment gradient factor)
  Le = Ke × Lb = ${Ke} × ${member.Lb} = ${(Ke * member.Lb).toFixed(0)} mm
  Mo = Cb × √[(π²EIy/Le²)(GJ + π²ECw/Le²)]
     = ${isFinite(bending.Mo) ? bending.Mo.toFixed(3) : '∞'} kN·m
  ${bending.Mo >= 2.78 * bending.My
    ? `Mo ≥ 2.78·My → Mbe = My (yielding)`
    : bending.Mo > 0.56 * bending.My
    ? `0.56·My < Mo < 2.78·My → Mbe = (10/9)·My·(1 − 10My/(36Mo)) (inelastic)`
    : `Mo ≤ 0.56·My → Mbe = Mo (elastic LTB)`
  }
  Mbe = ${bending.Mne_ltb.toFixed(3)} kN·m

(b) LOCAL BUCKLING [Cl. 7.2.2.3]:
  λl = √(Mbe/Mol) = ${bending.lambdaL.toFixed(3)}
  ${bending.lambdaL <= 0.776
    ? `λl ≤ 0.776 → Mbl = Mbe = ${bending.Mne_local.toFixed(3)} kN·m`
    : `λl > 0.776 → Mbl = [1−0.15(Mol/Mbe)^0.4]·(Mol/Mbe)^0.4·Mbe = ${bending.Mne_local.toFixed(3)} kN·m`
  }

(c) DISTORTIONAL BUCKLING [Cl. 7.2.2.4]:
  ${bending.fod > 0
    ? `Lcrd = ${bending.Lcrd.toFixed(0)} mm
  λd = √(My/Mod) = ${bending.lambdaD.toFixed(3)}
  ${bending.lambdaD <= 0.673
    ? `λd ≤ 0.673 → Mbd = My = ${bending.Mne_distortional.toFixed(3)} kN·m`
    : `λd > 0.673 → Mbd = [1−0.22(Mod/My)^0.5]·(Mod/My)^0.5·My = ${bending.Mne_distortional.toFixed(3)} kN·m`
  }`
    : `fod = 0 → No distinct distortional mode (Mbd excluded from governing check)`
  }

GOVERNING MODE: ${bending.governingMode.toUpperCase()}
  Mb  = ${bending.fod > 0 ? `min(Mbl, Mbd) = min(${bending.Mne_local.toFixed(3)}, ${bending.Mne_distortional.toFixed(3)})` : `Mbl`} = ${bending.Mn.toFixed(3)} kN·m
  φ   = ${bending.phi_b}
  φMb = ${bending.phiMn.toFixed(3)} kN·m`}
        </StepSection>

        {/* Step 6: Shear */}
        <StepSection title="Step 6: Shear Capacity" clause="Cl. 3.3.4">
          {`Web flat height: h = ${flatWeb.toFixed(1)} mm
Aw = h × t = ${(flatWeb * t).toFixed(1)} mm²

Vy = 0.6 × fy × Aw = 0.6 × ${fy} × ${(flatWeb * t).toFixed(1)} = ${shear.Vy.toFixed(2)} kN
Vcr = kv·π²E/[12(1-ν²)]·(t/h)²·Aw = ${shear.Vcr.toFixed(2)} kN
λv = √(Vy/Vcr) = ${shear.lambda_v.toFixed(3)}
${shear.lambda_v <= 0.815
    ? `λv ≤ 0.815 → Yielding: Vn = Vy = ${shear.Vn.toFixed(2)} kN`
    : shear.lambda_v <= 1.227
    ? `0.815 < λv ≤ 1.227 → Inelastic: Vn = ${shear.Vn.toFixed(2)} kN`
    : `λv > 1.227 → Elastic: Vn = Vcr = ${shear.Vn.toFixed(2)} kN`
  }
ϕVn = ${shear.phi_v} × ${shear.Vn.toFixed(2)} = ${shear.phiVn.toFixed(2)} kN`}
        </StepSection>

        {/* Step 7: Compression */}
        <StepSection title="Step 7: Compression Capacity" clause="Cl. 3.4">
          {`fox = π²E/(Lc/rx)² = ${compression.fox.toFixed(0)} MPa
foy = π²E/(Lc/ry)² = ${compression.foy.toFixed(0)} MPa
foc (governing elastic) = ${compression.foc.toFixed(0)} MPa

Ny  = Ag × fy = ${compression.Ny.toFixed(1)} kN
λc  = √(fy/foc) = ${compression.lambda_c.toFixed(3)}
${compression.lambda_c <= 1.5
    ? `λc ≤ 1.5 → fn = fy·(0.658^λc²) = ${compression.fn.toFixed(0)} MPa`
    : `λc > 1.5 → fn = fy·(0.877/λc²) = ${compression.fn.toFixed(0)} MPa`
  }
Nc  = Ae × fn = ${compression.Nc.toFixed(1)} kN
ϕNc = ${compression.phi_c} × ${compression.Nc.toFixed(1)} = ${compression.phiNc.toFixed(1)} kN`}
        </StepSection>

        {/* Step 8: Interaction */}
        <StepSection title="Step 8: Interaction Checks" clause="Cl. 3.3.5 / 3.5">
          {`Design actions:
  M* = ${interaction.Mstar.toFixed(2)} kN·m
  V* = ${interaction.Vstar.toFixed(2)} kN
  N* = ${interaction.Nstar.toFixed(2)} kN

Ratios:
  M*/ϕMn = ${interaction.bendingRatio.toFixed(3)}
  V*/ϕVn = ${interaction.shearRatio.toFixed(3)}
  N*/ϕNc = ${interaction.compressionRatio.toFixed(3)}

(a) Circular interaction [Cl. 3.3.5]:
  (M*/ϕMn)² + (V*/ϕVn)² = ${interaction.interactionCircular.toFixed(3)} ${interaction.interactionCircular <= 1 ? '≤' : '>'} 1.0

(b) Linear interaction (conservative):
  M*/ϕMn + V*/ϕVn = ${interaction.interactionLinear.toFixed(3)} ${interaction.interactionLinear <= 1 ? '≤' : '>'} 1.0

(c) Combined bending + compression [Cl. 3.5.1]:
  N*/ϕNc + M*/ϕMn = ${interaction.interactionCombined.toFixed(3)} ${interaction.interactionCombined <= 1 ? '≤' : '>'} 1.0

∴ ${interaction.isAdequate ? 'ADEQUATE ✓' : 'INADEQUATE ✗ — Section is overstressed'}`}
        </StepSection>

      </CardContent>
    </Card>
  );
}
