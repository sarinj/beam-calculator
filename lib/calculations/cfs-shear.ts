// ============================================================
// CFS Shear Capacity – AS/NZS 4600:2018
// ============================================================
// Computes shear capacity of CFS web elements.
//
// References:
//   Cl. 3.3.4 – Shear capacity of webs

import {
  CFSMaterial,
  CFSGeometry,
  ShearResult,
} from '@/types/cfs';

// ============================================================
// SHEAR CAPACITY – Cl. 3.3.4
// ============================================================

/**
 * Compute nominal shear capacity Vn per AS/NZS 4600:2018 Cl. 3.3.4.
 *
 * Steps:
 * 1. Determine web slenderness h/t
 * 2. Compute elastic shear buckling stress
 * 3. Determine shear capacity
 */
export function computeShearCapacity(
  mat: CFSMaterial,
  geo: CFSGeometry
): ShearResult {
  const { E, fy, nu } = mat;
  const { t, d, radius } = geo;
  const phi_v = 0.90; // Capacity reduction factor – shear

  // Web depth (flat portion)
  const hw = d - 2 * (radius + t);

  // Web slenderness
  const lambda_hw = hw / t;

  // Shear buckling coefficient (simple support both edges)
  const kv = 5.34;

  // Elastic shear buckling stress
  const fv = (kv * Math.PI * Math.PI * E) / (12 * (1 - nu * nu) * (lambda_hw * lambda_hw));

  // Shear yield stress
  const fvy = fy / Math.sqrt(3); // 0.577 fy

  // Yield shear force
  const Vy = (hw * t * fvy) / 1e3; // kN

  // Elastic shear buckling force
  const Vcr = (hw * t * fv) / 1e3; // kN

  // Non-dimensional shear slenderness
  const lambda_v = Math.sqrt(fvy / (fv || 1));

  // Nominal shear capacity per Cl. 3.3.4
  let Vn: number;

  if (lambda_v <= 0.815) {
    // Yielding
    Vn = Vy;
  } else if (lambda_v <= 1.227) {
    // Inelastic buckling
    Vn = 0.815 * Math.sqrt(Vy * Vcr);
  } else {
    // Elastic buckling
    Vn = Vcr;
  }

  const phiVn = phi_v * Vn;

  return {
    Vn,
    phiVn,
    phi_v,
    Vcr,
    Vy,
    lambda_v,
  };
}
