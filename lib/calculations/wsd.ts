import { BeamInputs, WSDResults, SectionProperties } from '@/types/beam';
import {
  getModularRatio,
  getStirrubBarArea,
} from './common';

// Calculate WSD results
export function calculateWSD(
  inputs: BeamInputs,
  sectionProps: SectionProperties
): WSDResults {
  const { concreteGrade, steelGradeFy, steelGradeFv, width, stirrupSize, stirrupSpacing } = inputs;
  const { effectiveDepth, totalSteelArea } = sectionProps;

  // Allowable stresses
  const allowableConcreteStress = 0.45 * concreteGrade; // fc = 0.45 * f'c
  const allowableSteelStress = 0.5 * steelGradeFy; // fs = 0.5 * fy (flexural)

  // Modular ratio
  const modularRatio = getModularRatio(concreteGrade);

  // Calculate k (neutral axis depth ratio)
  // For singly reinforced beam: k = sqrt(2ρn + (ρn)²) - ρn
  const rhoN = (totalSteelArea / (width * effectiveDepth)) * modularRatio;
  const k = Math.sqrt(2 * rhoN + rhoN * rhoN) - rhoN;

  // Neutral axis depth
  const neutralAxisDepth = k * effectiveDepth;

  // Lever arm factor j = 1 - k/3
  const j = 1 - k / 3;
  const leverArm = j * effectiveDepth;

  // Moment capacity (smaller of concrete and steel controlled)
  // Mc = fc * b * k * d * j * d / 2 = fc * b * k * j * d² / 2
  const momentConcrete = (allowableConcreteStress * width * k * j * effectiveDepth * effectiveDepth) / 2;
  // Ms = As * fs * j * d
  const momentSteel = totalSteelArea * allowableSteelStress * j * effectiveDepth;

  // Moment capacity is the smaller value (converted to kg-m)
  const momentCapacity = Math.min(momentConcrete, momentSteel) / 100; // kg-cm to kg-m

  // Shear capacity
  // Vc = 0.29 * sqrt(f'c) * b * d (allowable shear stress method)
  const allowableShearStress = 0.29 * Math.sqrt(concreteGrade);
  const concreteShearCapacity = allowableShearStress * width * effectiveDepth;

  // Stirrup contribution - use fv for shear
  const stirrupArea = 2 * getStirrubBarArea(stirrupSize); // 2 legs
  const fv = steelGradeFv;
  const stirrupShearCapacity = (stirrupArea * 0.5 * fv * effectiveDepth) / stirrupSpacing;

  // Total shear capacity
  const shearCapacity = concreteShearCapacity + stirrupShearCapacity;

  return {
    allowableConcreteStress,
    allowableSteelStress,
    modularRatio,
    neutralAxisDepth,
    leverArm,
    momentCapacity,
    shearCapacity,
  };
}
