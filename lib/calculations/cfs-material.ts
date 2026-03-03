// ============================================================
// CFS Material – AS/NZS 4600:2018
// ============================================================
// Derives shear modulus G from E and ν.
//
// Reference: Cl. 1.5 – Material properties

import { CFSMaterial } from '@/types/cfs';

/**
 * Create a CFSMaterial with the shear modulus derived automatically.
 *
 * G = E / [2(1 + ν)]   – standard isotropic relation.
 */
export function createMaterial(
  fy: number,
  fu: number,
  E: number,
  nu: number
): CFSMaterial {
  const G = E / (2 * (1 + nu));
  return { fy, fu, E, nu, G };
}

/**
 * Default CFS material – G450 steel (AS 1397).
 */
export function defaultCFSMaterial(): CFSMaterial {
  return createMaterial(450, 480, 200000, 0.3);
}
