// ============================================================
// CFS Compression Capacity – AS/NZS 4600:2018
// ============================================================
// Computes nominal compression (axial) capacity.
//
// References:
//   Cl. 3.4   – Members in compression
//   Cl. 3.4.1 – Nominal member capacity in compression

import {
  CFSMaterial,
  CFSGeometry,
  CFSMember,
  GrossSectionProperties,
  EffectiveSectionProperties,
  CompressionResult,
} from '@/types/cfs';

// ============================================================
// COMPRESSION CAPACITY – Cl. 3.4
// ============================================================

/**
 * Compute nominal member compression capacity per AS/NZS 4600:2018 Cl. 3.4.
 *
 * Steps:
 * 1. Elastic flexural buckling stress about each axis
 * 2. Governing elastic buckling stress (min of fox, foy, foz)
 * 3. Non-dimensional slenderness λc
 * 4. Nominal buckling stress fn
 * 5. Nominal compression capacity Nc = Ae · fn
 */
export function computeCompressionCapacity(
  mat: CFSMaterial,
  _geo: CFSGeometry,
  member: CFSMember,
  gross: GrossSectionProperties,
  effective: EffectiveSectionProperties
): CompressionResult {
  const { E, fy } = mat;
  const phi_c = 0.85; // Capacity reduction factor – compression

  // Effective length
  const Ke = effectiveLengthFactor(member.endCondition);
  const Le = Ke * member.Lc;

  // Elastic flexural buckling stresses
  const fox = (Math.PI * Math.PI * E) / Math.pow(Le / (gross.rx || 1), 2);
  const foy = (Math.PI * Math.PI * E) / Math.pow(Le / (gross.ry || 1), 2);

  // Torsional-flexural buckling (for mono-symmetric C sections)
  const Ag = gross.Ag;
  const ro2 = gross.rx * gross.rx + gross.ry * gross.ry + gross.xc * gross.xc;

  // Elastic torsional buckling stress
  const G = E / (2 * (1 + mat.nu));
  const foz =
    Ag > 0 && ro2 > 0
      ? (1 / (Ag * ro2)) *
        (G * gross.J +
        (Math.PI * Math.PI * E * gross.Cw) / (Le * Le))
      : fox;

  // Flexural-torsional interaction for mono-symmetric C-section
  // β = 1 − (xo/ro)², where xo is the shear center offset
  const beta = 1 - (gross.xc * gross.xc) / (ro2 || 1);
  let foc_ft: number;
  if (beta > 0 && beta < 1) {
    const sum = foy + foz;
    const disc = sum * sum - 4 * beta * foy * foz;
    foc_ft = disc > 0
      ? (0.5 / (1 - beta)) * (sum - Math.sqrt(disc))
      : Math.min(foy, foz);
  } else {
    foc_ft = Math.min(foy, foz);
  }

  // Governing elastic buckling stress (includes torsional-flexural)
  const foc = Math.min(fox, foc_ft);

  // Squash load (uses gross area per AS/NZS 4600)
  const Ny = (Ag * fy) / 1e3; // kN

  // Elastic buckling load (uses gross area)
  const Noc = (Ag * foc) / 1e3; // kN

  // Non-dimensional slenderness
  const lambda_c = Math.sqrt(fy / (foc || 1));

  // Nominal buckling stress per Cl. 3.4.1
  let fn: number;
  if (lambda_c <= 1.5) {
    fn = fy * Math.pow(0.658, lambda_c * lambda_c);
  } else {
    fn = fy * (0.877 / (lambda_c * lambda_c));
  }

  // Nominal compression capacity
  const Nc = (effective.Ae * fn) / 1e3; // kN
  const phiNc = phi_c * Nc;

  return {
    Nc,
    phiNc,
    phi_c,
    Ny,
    Noc,
    fox,
    foy,
    foc,
    lambda_c,
    fn,
  };
}

function effectiveLengthFactor(endCondition: string): number {
  switch (endCondition) {
    case 'pinned-pinned': return 1.0;
    case 'fixed-free': return 2.0;
    case 'fixed-pinned': return 0.7;
    case 'fixed-fixed': return 0.5;
    default: return 1.0;
  }
}
