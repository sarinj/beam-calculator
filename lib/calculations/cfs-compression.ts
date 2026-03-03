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
  geo: CFSGeometry,
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

  // Torsional-flexural buckling (simplified – for mono-symmetric C)
  const { d, bf, radius, t } = geo;
  const Ag = gross.Ag;
  const ro = Math.sqrt(gross.rx * gross.rx + gross.ry * gross.ry + gross.xc * gross.xc);

  // Elastic torsional buckling stress
  const G = E / (2 * (1 + mat.nu));
  const foz =
    Ag > 0
      ? (1 / (Ag * ro * ro)) *
        (G * gross.J +
        (Math.PI * Math.PI * E * gross.Cw) / (Le * Le))
      : fox;

  // Governing elastic buckling stress
  const foc = Math.min(fox, foy);

  // Squash load
  const Ny = (effective.Ae * fy) / 1e3; // kN

  // Elastic buckling load
  const Noc = (effective.Ae * foc) / 1e3; // kN

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
