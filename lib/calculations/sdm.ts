import { BeamInputs, SDMResults, SectionProperties } from '@/types/beam';
import { getBeta1, steelGradeData, roundBarData } from './common';

// Strength reduction factors
const PHI_MOMENT = 0.9; // φ for flexure
const PHI_SHEAR = 0.85; // φ for shear

// Calculate SDM results
export function calculateSDM(
  inputs: BeamInputs,
  sectionProps: SectionProperties
): SDMResults {
  const { concreteGrade, steelGrade, width, stirrupSize, stirrupSpacing } = inputs;
  const { effectiveDepth, totalSteelArea, steelRatio } = sectionProps;

  const fy = steelGradeData[steelGrade].fy;
  const fc = concreteGrade;

  // Beta1 factor
  const beta1 = getBeta1(fc);

  // Balanced reinforcement ratio
  // ρb = 0.85 * β1 * (f'c/fy) * (6000/(6000+fy))
  // Using 6000 kg/cm² as the strain compatibility constant (εcu = 0.003, Es = 2,000,000 kg/cm²)
  const balancedRatio = 0.85 * beta1 * (fc / fy) * (6000 / (6000 + fy));

  // Maximum reinforcement ratio (0.75 * ρb for tension-controlled)
  const maxRatio = 0.75 * balancedRatio;

  // Check if under-reinforced
  const isUnderReinforced = steelRatio <= maxRatio;

  // Compression block depth
  // a = As * fy / (0.85 * f'c * b)
  const compressionBlockDepth = (totalSteelArea * fy) / (0.85 * fc * width);

  // Nominal moment capacity
  // Mn = As * fy * (d - a/2)
  const nominalMoment = (totalSteelArea * fy * (effectiveDepth - compressionBlockDepth / 2)) / 100; // kg-cm to kg-m

  // Design moment capacity
  const designMoment = PHI_MOMENT * nominalMoment;

  // Shear capacity calculation
  // Concrete contribution: Vc = 0.53 * sqrt(f'c) * b * d
  const concreteShearCapacity = 0.53 * Math.sqrt(fc) * width * effectiveDepth;

  // Steel contribution (stirrups): Vs = Av * fy * d / s
  const stirrupArea = 2 * roundBarData[stirrupSize].area; // 2 legs
  const steelShearCapacity = (stirrupArea * fy * effectiveDepth) / stirrupSpacing;

  // Nominal shear capacity
  const nominalShear = concreteShearCapacity + steelShearCapacity;

  // Design shear capacity
  const designShear = PHI_SHEAR * nominalShear;

  return {
    beta1,
    balancedRatio,
    maxRatio,
    compressionBlockDepth,
    nominalMoment,
    designMoment,
    nominalShear,
    designShear,
    isUnderReinforced,
  };
}
