import {
  DoubleBeamInputs,
  DoubleSectionProperties,
  DoubleWSDResults,
  DoubleSDMResults,
} from '@/types/beam';
import {
  deformedBarData,
  roundBarData,
  steelGradeData,
  getModularRatio,
  getBeta1,
  calculateTotalSteelArea,
  STEEL_MODULUS,
} from './common';

// Calculate effective depth for compression steel (d')
export function calculateEffectiveDepthPrime(
  coverTop: number,
  stirrupSize: string,
  compressionBarSize: string
): number {
  const stirrupDia = roundBarData[stirrupSize as keyof typeof roundBarData].diameter / 10;
  const barDia = deformedBarData[compressionBarSize as keyof typeof deformedBarData].diameter / 10;
  return coverTop + stirrupDia + barDia / 2;
}

// Calculate double beam section properties
export function calculateDoubleSectionProperties(inputs: DoubleBeamInputs): DoubleSectionProperties {
  const { height, cover, coverTop, tensionLayers, compressionLayers, stirrupSize } = inputs;

  // Tension steel (bottom)
  const tensionSteelArea = calculateTotalSteelArea(tensionLayers);
  const stirrupDia = roundBarData[stirrupSize].diameter / 10;

  // Calculate effective depth for tension steel
  let effectiveDepth = height - cover;
  if (tensionLayers.length > 0) {
    const firstBarDia = deformedBarData[tensionLayers[0].barSize].diameter / 10;
    effectiveDepth = height - cover - stirrupDia - firstBarDia / 2;
  }

  // Compression steel (top)
  const compressionSteelArea = calculateTotalSteelArea(compressionLayers);

  // Calculate d' for compression steel
  let effectiveDepthPrime = coverTop + stirrupDia;
  if (compressionLayers.length > 0) {
    const firstCompBarDia = deformedBarData[compressionLayers[0].barSize].diameter / 10;
    effectiveDepthPrime = coverTop + stirrupDia + firstCompBarDia / 2;
  }

  const tensionSteelRatio = tensionSteelArea / (inputs.width * effectiveDepth);
  const compressionSteelRatio = compressionSteelArea / (inputs.width * effectiveDepth);

  return {
    effectiveDepth,
    effectiveDepthPrime,
    tensionSteelArea,
    compressionSteelArea,
    tensionSteelRatio,
    compressionSteelRatio,
  };
}

// Calculate Double Beam WSD
export function calculateDoubleWSD(
  inputs: DoubleBeamInputs,
  sectionProps: DoubleSectionProperties
): DoubleWSDResults {
  const { concreteGrade, steelGrade, width, stirrupSize, stirrupSpacing } = inputs;
  const { effectiveDepth, effectiveDepthPrime, tensionSteelArea, compressionSteelArea } = sectionProps;

  const fc = concreteGrade;
  const fy = steelGradeData[steelGrade].fy;

  // Allowable stresses
  const allowableConcreteStress = 0.45 * fc;
  const allowableSteelStress = 0.5 * fy;
  const modularRatio = getModularRatio(fc);

  // For doubly reinforced beam with WSD
  // Transform compression steel: (2n-1) for steel in compression zone
  const nPrime = 2 * modularRatio - 1;

  // Neutral axis calculation using transformed section
  // Taking moments about neutral axis:
  // b*kd*kd/2 + (2n-1)*As'*(kd-d') = n*As*(d-kd)
  const As = tensionSteelArea;
  const AsPrime = compressionSteelArea;
  const d = effectiveDepth;
  const dPrime = effectiveDepthPrime;

  // Quadratic equation: a*kd^2 + b*kd + c = 0
  const a = width / 2;
  const b = nPrime * AsPrime + modularRatio * As;
  const c = -(nPrime * AsPrime * dPrime + modularRatio * As * d);

  const discriminant = b * b - 4 * a * c;
  const kd = (-b + Math.sqrt(discriminant)) / (2 * a);
  const neutralAxisDepth = kd;

  // Compression steel stress
  const compressionSteelStress = Math.min(
    allowableSteelStress,
    2 * allowableConcreteStress * (kd - dPrime) / kd
  );

  // Lever arm approximation
  const leverArm = d - kd / 3;

  // Moment capacity
  // M = fc * b * kd * (d - kd/3) / 2 + As' * fs' * (d - d')
  const momentConcrete = (allowableConcreteStress * width * kd * leverArm) / 2;
  const momentCompSteel = AsPrime * compressionSteelStress * (d - dPrime);
  const momentCapacity = (momentConcrete + momentCompSteel) / 100; // kg-cm to kg-m

  // Shear capacity
  const allowableShearStress = 0.29 * Math.sqrt(fc);
  const concreteShearCapacity = allowableShearStress * width * effectiveDepth;
  const stirrupArea = 2 * roundBarData[stirrupSize].area;
  const stirrupShearCapacity = (stirrupArea * 0.5 * fy * effectiveDepth) / stirrupSpacing;
  const shearCapacity = concreteShearCapacity + stirrupShearCapacity;

  return {
    allowableConcreteStress,
    allowableSteelStress,
    modularRatio,
    neutralAxisDepth,
    leverArm,
    momentCapacity,
    shearCapacity,
    compressionSteelStress,
  };
}

// Calculate Double Beam SDM
export function calculateDoubleSDM(
  inputs: DoubleBeamInputs,
  sectionProps: DoubleSectionProperties
): DoubleSDMResults {
  const { concreteGrade, steelGrade, width, stirrupSize, stirrupSpacing } = inputs;
  const { effectiveDepth, effectiveDepthPrime, tensionSteelArea, compressionSteelArea } = sectionProps;

  const fc = concreteGrade;
  const fy = steelGradeData[steelGrade].fy;
  const d = effectiveDepth;
  const dPrime = effectiveDepthPrime;
  const As = tensionSteelArea;
  const AsPrime = compressionSteelArea;

  const beta1 = getBeta1(fc);

  // Balanced ratio for singly reinforced
  const balancedRatio = 0.85 * beta1 * (fc / fy) * (6000 / (6000 + fy));
  const maxRatio = 0.75 * balancedRatio;

  // Check if compression steel yields
  // Compression steel yields if: d'/d <= (1 - fy/(0.003*Es)) * (a/d) / beta1
  // First, calculate 'a' assuming compression steel yields

  // Force equilibrium: As*fy = 0.85*fc*b*a + As'*fy (if compression steel yields)
  // As*fy - As'*fy = 0.85*fc*b*a
  // a = (As - As')*fy / (0.85*fc*b)

  const aAssumeYield = ((As - AsPrime) * fy) / (0.85 * fc * width);
  const c = aAssumeYield / beta1;

  // Check strain in compression steel
  // εs' = 0.003 * (c - d') / c
  const strainCompSteel = 0.003 * (c - dPrime) / c;
  const yieldStrain = fy / STEEL_MODULUS;

  const compressionSteelYields = strainCompSteel >= yieldStrain;

  let compressionBlockDepth: number;
  let compressionSteelStress: number;
  let nominalMoment: number;

  if (compressionSteelYields) {
    // Compression steel yields
    compressionBlockDepth = aAssumeYield;
    compressionSteelStress = fy;

    // Mn = As*fy*(d - a/2) - As'*fy*(a/2 - d')
    // Or equivalently: Mn = (As - As')*fy*(d - a/2) + As'*fy*(d - d')
    const Mn1 = (As - AsPrime) * fy * (d - compressionBlockDepth / 2);
    const Mn2 = AsPrime * fy * (d - dPrime);
    nominalMoment = (Mn1 + Mn2) / 100; // kg-cm to kg-m
  } else {
    // Compression steel does not yield - need iteration
    // fs' = Es * εs' = Es * 0.003 * (c - d') / c
    // Use iteration to find c

    let cIterate = c;
    for (let i = 0; i < 20; i++) {
      const strainCs = 0.003 * (cIterate - dPrime) / cIterate;
      const fsCs = Math.min(fy, STEEL_MODULUS * strainCs);

      // Force equilibrium: As*fy = 0.85*fc*b*beta1*c + As'*fs'
      const cNew = (As * fy - AsPrime * fsCs) / (0.85 * fc * width * beta1);

      if (Math.abs(cNew - cIterate) < 0.001) {
        cIterate = cNew;
        break;
      }
      cIterate = cNew;
    }

    compressionBlockDepth = beta1 * cIterate;
    const strainCsFinal = 0.003 * (cIterate - dPrime) / cIterate;
    compressionSteelStress = Math.min(fy, STEEL_MODULUS * strainCsFinal);

    const Mn1 = As * fy * (d - compressionBlockDepth / 2);
    const Mn2 = -AsPrime * compressionSteelStress * (compressionBlockDepth / 2 - dPrime);
    nominalMoment = (Mn1 + Mn2) / 100;
  }

  // Check if section is under-reinforced
  const netTensionRatio = (As - AsPrime) / (width * d);
  const isUnderReinforced = netTensionRatio <= maxRatio;

  // Design moment
  const PHI_MOMENT = 0.9;
  const designMoment = PHI_MOMENT * nominalMoment;

  // Moment contribution from compression steel
  const momentFromCompSteel = (AsPrime * compressionSteelStress * (d - dPrime)) / 100;

  // Shear capacity
  const concreteShearCapacity = 0.53 * Math.sqrt(fc) * width * effectiveDepth;
  const stirrupArea = 2 * roundBarData[stirrupSize].area;
  const steelShearCapacity = (stirrupArea * fy * effectiveDepth) / stirrupSpacing;
  const nominalShear = concreteShearCapacity + steelShearCapacity;
  const PHI_SHEAR = 0.85;
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
    compressionSteelYields,
    compressionSteelStress,
    momentFromCompSteel,
  };
}
