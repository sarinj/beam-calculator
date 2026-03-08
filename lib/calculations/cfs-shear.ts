// ============================================================
// CFS Shear Capacity – AS/NZS 4600:2018
// ============================================================
// Computes shear capacity of CFS web elements.
//
// Equations per Cl. 3.3.4.1 – Shear capacity of webs without holes:
//   Eq. 3.3.4(1): Vv = 0.64 * fy * d1 * tw
//   Eq. 3.3.4(2): Vv = 0.64 * tw^2 * sqrt(E * kv * fy)
//   Eq. 3.3.4(3): Vv = 0.905 * E * kv * tw^3 / d1
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
 * Compute nominal shear capacity Vv per AS/NZS 4600:2018 Cl. 3.3.4.1.
 *
 * Steps:
 * 1. d1 = flat web depth = d - 2(radius + t)
 * 2. tw = t
 * 3. kv = 5.34 (unstiffened web)
 * 4. Compare d1/tw to sqrt(E*kv/fy) and 1.415*sqrt(E*kv/fy)
 * 5. Apply Eq. 3.3.4(1), (2), or (3)
 */
export function computeShearCapacity(
  mat: CFSMaterial,
  geo: CFSGeometry
): ShearResult {
  const { E, fy } = mat;
  const { t, d, radius } = geo;
  const phi_v = 0.90; // Capacity reduction factor – Table 1.6.3

  // d1 = depth of flat portion of web (mm)
  const d1 = d - 2 * (radius + t);
  const tw = t;

  // Shear buckling coefficient – unstiffened web
  // Cl. 3.3.4: kv = 5.34
  const kv = 5.34;

  // Web slenderness
  const slenderness = d1 / tw;

  // Thresholds per Cl. 3.3.4
  const threshold1 = Math.sqrt((E * kv) / fy);           // sqrt(E*kv/fy)
  const threshold2 = 1.415 * threshold1;                  // 1.415*sqrt(E*kv/fy)

  // Nominal shear capacity Vv (in N)
  let Vv_N: number;

  if (slenderness <= threshold1) {
    // Eq. 3.3.4(1): Vv = 0.64 * fy * d1 * tw
    Vv_N = 0.64 * fy * d1 * tw;
  } else if (slenderness <= threshold2) {
    // Eq. 3.3.4(2): Vv = 0.64 * tw^2 * sqrt(E * kv * fy)
    Vv_N = 0.64 * tw * tw * Math.sqrt(E * kv * fy);
  } else {
    // Eq. 3.3.4(3): Vv = 0.905 * E * kv * tw^3 / d1
    Vv_N = 0.905 * E * kv * tw * tw * tw / d1;
  }

  const Vn = Vv_N / 1e3;             // kN
  const phiVn = phi_v * Vn;          // kN

  // Reference values for compatibility
  const Vy = (0.64 * fy * d1 * tw) / 1e3;                     // Eq. 3.3.4(1) in kN
  const Vcr = (0.905 * E * kv * tw * tw * tw / d1) / 1e3;     // Eq. 3.3.4(3) in kN
  const lambda_v = d1 > 0 ? slenderness / threshold1 : 0;     // normalised slenderness

  return {
    Vn,
    phiVn,
    phi_v,
    Vcr,
    Vy,
    lambda_v,
  };
}
