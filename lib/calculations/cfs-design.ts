// ============================================================
// CFS Design Check (Interaction) – AS/NZS 4600:2018
// ============================================================
// Performs bending–shear interaction check per Cl. 3.3.5,
// compression check per Cl. 3.4, and combined bending +
// compression per Cl. 3.5.
//
// References:
//   Cl. 3.3.5 – Combined bending and shear
//   Cl. 3.4   – Members in compression
//   Cl. 3.5   – Combined bending and compression

import {
  CFSDesignInputs,
  CFSDesignResults,
  InteractionResult,
} from '@/types/cfs';

import { createMaterial } from './cfs-material';
import { computeGrossProperties, computeEffectiveProperties } from './cfs-section';
import { computeBendingCapacity } from './cfs-bending';
import { computeShearCapacity } from './cfs-shear';
import { computeCompressionCapacity } from './cfs-compression';

// ============================================================
// INTERACTION CHECK
// ============================================================

/**
 * Comprehensive interaction check including:
 *
 * 1. Bending-shear interaction (Cl. 3.3.5):
 *    Circular: (Mstar/phiMn)^2 + (Vstar/phiVn)^2 <= 1.0
 *    Linear:   Mstar/phiMn + Vstar/phiVn <= 1.0  (conservative)
 *
 * 2. Combined bending and compression (Cl. 3.5.1):
 *    Nstar/phiNc + Mstar/phiMn <= 1.0
 */
export function checkInteraction(
  Mstar: number,    // kN.m
  Vstar: number,    // kN
  Nstar: number,    // kN (0 if no compression)
  phiMn: number,    // kN.m
  phiVn: number,    // kN
  phiNc: number     // kN (0 if no compression check)
): InteractionResult {
  const bendingRatio = phiMn > 0 ? Mstar / phiMn : 0;
  const shearRatio = phiVn > 0 ? Vstar / phiVn : 0;
  const compressionRatio = phiNc > 0 ? Nstar / phiNc : 0;

  // Bending-shear circular interaction – Cl. 3.3.5
  const interactionCircular = bendingRatio * bendingRatio + shearRatio * shearRatio;

  // Bending-shear linear interaction (conservative)
  const interactionLinear = bendingRatio + shearRatio;

  // Combined bending + compression – Cl. 3.5.1
  const interactionCombined = compressionRatio + bendingRatio;

  // Overall adequacy: all checks must pass
  const isAdequate =
    interactionCircular <= 1.0 &&
    (Nstar <= 0 || interactionCombined <= 1.0);

  return {
    Mstar,
    Vstar,
    Nstar,
    bendingRatio,
    shearRatio,
    compressionRatio,
    interactionCircular,
    interactionLinear,
    interactionCombined,
    isAdequate,
  };
}

// ============================================================
// FULL DESIGN CHECK
// ============================================================

/**
 * Perform complete CFS design check per AS/NZS 4600:2018.
 *
 * Sequence:
 * 1. Compute gross section properties (Cl. 2.1)
 * 2. Compute effective properties via EWM (Cl. 2.2)
 * 3. Determine bending capacity (Cl. 3.3.2–3.3.4)
 * 4. Determine compression capacity (Cl. 3.4)
 * 5. Determine shear capacity (Cl. 3.3.4)
 * 6. Perform interaction check (Cl. 3.3.5, 3.5)
 */
export function performCFSDesign(inputs: CFSDesignInputs): CFSDesignResults {
  // Ensure material has G derived
  const material = createMaterial(
    inputs.material.fy,
    inputs.material.fu,
    inputs.material.E,
    inputs.material.nu
  );

  // 1. Gross section properties
  const grossProps = computeGrossProperties(inputs.geometry, material);

  // 2. Effective section properties (EWM)
  const effectiveProps = computeEffectiveProperties(
    inputs.geometry, material, grossProps
  );

  // 3. Bending capacity
  const bending = computeBendingCapacity(
    material, inputs.geometry, inputs.member, grossProps, effectiveProps
  );

  // 4. Compression capacity
  const compression = computeCompressionCapacity(
    material, inputs.geometry, inputs.member, grossProps, effectiveProps
  );

  // 5. Shear capacity
  const shear = computeShearCapacity(material, inputs.geometry);

  // 6. Interaction check
  const interaction = checkInteraction(
    inputs.Mstar,
    inputs.Vstar,
    inputs.Nstar,
    bending.phiMn,
    shear.phiVn,
    compression.phiNc
  );

  return {
    grossProps,
    effectiveProps,
    bending,
    compression,
    shear,
    interaction,
  };
}
