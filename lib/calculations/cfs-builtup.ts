// ============================================================
// CFS Built-up Section Design – AS/NZS 4600:2018
// ============================================================
// Computes composite properties for user-defined built-up
// assemblies of CFS sections.
//
// References:
//   Cl. 4.3 – Built-up members
//   Cl. 2.1 – Section properties
//   Cl. 3.3 – Members subject to bending

import {
  CFSMaterial,
  CFSMember,
  CFSGeometry,
  BuiltUpElement,
  BuiltUpAssembly,
  BuiltUpProperties,
  BuiltUpDesignInputs,
  BuiltUpDesignResults,
  GrossSectionProperties,
  EffectiveSectionProperties,
  InteractionResult,
} from '@/types/cfs';

import { createMaterial } from './cfs-material';
import { computeGrossProperties, computeEffectiveProperties } from './cfs-section';
import { computeBendingCapacity } from './cfs-bending';
import { computeShearCapacity } from './cfs-shear';
import { checkInteraction } from './cfs-design';

// ============================================================
// TRANSFORM ELEMENT PROPERTIES TO ASSEMBLY COORDINATES
// ============================================================

/**
 * Rotate Ix, Iy for a given rotation angle.
 * For 0° or 180°: Ix stays, Iy stays.
 * For 90° or 270°: Ix swaps with Iy.
 */
function rotateInertia(
  Ix: number,
  Iy: number,
  rotationDeg: number
): { Ix: number; Iy: number } {
  const r = ((rotationDeg % 360) + 360) % 360;
  if (r === 90 || r === 270) {
    return { Ix: Iy, Iy: Ix };
  }
  return { Ix, Iy };
}

/**
 * Rotate centroid position for a given rotation and mirroring,
 * relative to the element's own origin.
 */
function transformCentroid(
  xc: number,
  yc: number,
  halfDepth: number,
  rotationDeg: number,
  mirrored: boolean
): { cx: number; cy: number } {
  let cx = mirrored ? -xc : xc;
  let cy = yc;

  const r = ((rotationDeg % 360) + 360) % 360;
  if (r === 90) {
    [cx, cy] = [-cy, cx];
  } else if (r === 180) {
    [cx, cy] = [-cx, -cy];
  } else if (r === 270) {
    [cx, cy] = [cy, -cx];
  }

  return { cx, cy };
}

// ============================================================
// COMBINE ELEMENT PROPERTIES
// ============================================================

/**
 * Compute combined gross section properties for an assembly
 * using the parallel-axis theorem.
 *
 * Cl. 4.3 / Cl. 2.1 – Properties computed by conventional methods.
 */
export function computeBuiltUpGrossProperties(
  elements: BuiltUpElement[],
  material: CFSMaterial
): {
  combined: GrossSectionProperties;
  elementProps: { id: string; gross: GrossSectionProperties }[];
} {
  // Compute individual gross properties
  const elementProps = elements.map((el) => ({
    id: el.id,
    gross: computeGrossProperties(el.geometry, material),
  }));

  // Total area
  const Ag = elementProps.reduce((sum, ep) => sum + ep.gross.Ag, 0);

  // Find combined centroid using parallel axis
  let sumAx = 0;
  let sumAy = 0;

  const elementCentroids = elements.map((el, i) => {
    const ep = elementProps[i];
    const halfDepth = el.geometry.d / 2;
    const { cx, cy } = transformCentroid(
      ep.gross.xc, ep.gross.yc, halfDepth,
      el.rotation, el.mirrored
    );
    const globalX = el.offsetX + cx;
    const globalY = el.offsetY + cy;
    sumAx += ep.gross.Ag * globalX;
    sumAy += ep.gross.Ag * globalY;
    return { globalX, globalY };
  });

  const xc = Ag > 0 ? sumAx / Ag : 0;
  const yc = Ag > 0 ? sumAy / Ag : 0;

  // Combined moments of inertia using parallel-axis theorem
  let Ix = 0;
  let Iy = 0;
  let J = 0;
  let Cw = 0;

  elements.forEach((el, i) => {
    const ep = elementProps[i];
    const ec = elementCentroids[i];

    // Rotated inertias
    const rotated = rotateInertia(ep.gross.Ix, ep.gross.Iy, el.rotation);

    // Parallel-axis contributions
    const dy = ec.globalY - yc;
    const dx = ec.globalX - xc;

    Ix += rotated.Ix + ep.gross.Ag * dy * dy;
    Iy += rotated.Iy + ep.gross.Ag * dx * dx;

    // Torsion and warping are summed (conservative for open sections)
    J += ep.gross.J;
    Cw += ep.gross.Cw;
  });

  // Find extreme distances for section moduli
  // Approximate using element bounding box
  let yMin = Infinity, yMax = -Infinity;
  let xMin = Infinity, xMax = -Infinity;

  elements.forEach((el, i) => {
    const halfD = el.geometry.d / 2;
    const halfBf = el.geometry.bf / 2;
    const r = ((el.rotation % 360) + 360) % 360;

    let extentY: number, extentX: number;
    if (r === 90 || r === 270) {
      extentY = halfBf;
      extentX = halfD;
    } else {
      extentY = halfD;
      extentX = halfBf;
    }

    const cy = elementCentroids[i].globalY;
    const cx = elementCentroids[i].globalX;

    yMin = Math.min(yMin, cy - extentY);
    yMax = Math.max(yMax, cy + extentY);
    xMin = Math.min(xMin, cx - extentX);
    xMax = Math.max(xMax, cx + extentX);
  });

  const distTopY = Math.max(Math.abs(yMax - yc), Math.abs(yc - yMin)) || 1;
  const distTopX = Math.max(Math.abs(xMax - xc), Math.abs(xc - xMin)) || 1;

  const Sx = Ix / distTopY;
  const Sy = Iy / distTopX;
  const rx = Math.sqrt(Ix / Ag);
  const ry = Math.sqrt(Iy / Ag);

  return {
    combined: { Ag, Ix, Iy, Sx, Sy, rx, ry, J, Cw, xc, yc },
    elementProps,
  };
}

/**
 * Compute combined effective section properties.
 */
export function computeBuiltUpEffectiveProperties(
  elements: BuiltUpElement[],
  material: CFSMaterial,
  combinedGross: GrossSectionProperties
): {
  combined: EffectiveSectionProperties;
  elementEffective: { id: string; effective: EffectiveSectionProperties }[];
} {
  const elementEffective = elements.map((el) => {
    const gross = computeGrossProperties(el.geometry, material);
    const eff = computeEffectiveProperties(el.geometry, material, gross);
    return { id: el.id, effective: eff };
  });

  // Sum effective areas
  const Ae = elementEffective.reduce((s, e) => s + e.effective.Ae, 0);

  // Reduction ratio
  const ratio = combinedGross.Ag > 0 ? Ae / combinedGross.Ag : 1;

  const Ixe = combinedGross.Ix * ratio;
  const Iye = combinedGross.Iy * ratio;

  // Approximate moduli
  const Sxe = Ixe / (combinedGross.Ix / combinedGross.Sx);
  const Sye = Iye / (combinedGross.Iy / (combinedGross.Sy || 1));
  const Ze = Sxe;

  return {
    combined: {
      Ae, Ixe, Iye, Sxe, Sye, Ze,
      webEffWidth: 0, flangeEffWidth: 0, lipEffWidth: 0,
      webLambda: 0, flangeLambda: 0, lipLambda: 0,
    },
    elementEffective,
  };
}

// ============================================================
// BUILT-UP NOTE – Cl. 4.3
// ============================================================

function getBuiltUpNote(assembly: BuiltUpAssembly): string {
  if (assembly.elements.length <= 1) {
    return 'Single element assembly – no composite action considerations.';
  }

  return (
    `Built-up assembly "${assembly.name}" with ${assembly.elements.length} elements. ` +
    `Per Cl. 4.3, composite action assumed provided shear flow ` +
    `requirements are satisfied (fastener spacing = ${assembly.fastenerSpacing} mm, ` +
    `fastener capacity = ${assembly.fastenerCapacity} kN). ` +
    `For complex partial interaction, FSM or nonlinear FEM is recommended.`
  );
}

// ============================================================
// FULL BUILT-UP DESIGN
// ============================================================

/**
 * Perform design check for a user-defined built-up CFS assembly.
 *
 * Cl. 4.3 – Built-up members shall be designed considering
 * composite action where shear flow requirements are met.
 */
export function performBuiltUpDesign(inputs: BuiltUpDesignInputs): BuiltUpDesignResults {
  const material = createMaterial(
    inputs.material.fy,
    inputs.material.fu,
    inputs.material.E,
    inputs.material.nu
  );

  const { assembly, member } = inputs;

  // Compute combined gross properties
  const { combined: combinedGross, elementProps } =
    computeBuiltUpGrossProperties(assembly.elements, material);

  // Compute combined effective properties
  const { combined: combinedEffective, elementEffective } =
    computeBuiltUpEffectiveProperties(assembly.elements, material, combinedGross);

  // Build element results
  const elementResults = assembly.elements.map((el) => {
    const gp = elementProps.find((e) => e.id === el.id);
    const ep = elementEffective.find((e) => e.id === el.id);
    return {
      id: el.id,
      gross: gp!.gross,
      effective: ep!.effective,
    };
  });

  const note = getBuiltUpNote(assembly);
  const compositeAction = assembly.elements.length > 1;

  const assemblyProps: BuiltUpProperties = {
    combinedGross,
    combinedEffective,
    elements: elementResults,
    compositeAction,
    note,
  };

  // Bending capacity using combined properties
  // Use geometry of the largest element for buckling checks
  const largestElement = assembly.elements.reduce((a, b) =>
    a.geometry.d * a.geometry.bf > b.geometry.d * b.geometry.bf ? a : b
  );

  const bending = computeBendingCapacity(
    material, largestElement.geometry, member, combinedGross, combinedEffective
  );

  // Shear capacity – sum of individual web shear capacities
  let totalVn = 0;
  let totalPhiVn = 0;
  let totalVcr = 0;
  let totalVy = 0;
  let avgLambda = 0;

  assembly.elements.forEach((el) => {
    const s = computeShearCapacity(material, el.geometry);
    totalVn += s.Vn;
    totalPhiVn += s.phiVn;
    totalVcr += s.Vcr;
    totalVy += s.Vy;
    avgLambda += s.lambda_v;
  });

  avgLambda /= assembly.elements.length || 1;

  const shear = {
    Vn: totalVn,
    phiVn: totalPhiVn,
    phi_v: 0.90,
    Vcr: totalVcr,
    Vy: totalVy,
    lambda_v: avgLambda,
  };

  // Interaction check (N*=0 for built-up bending-shear only)
  const Nstar = inputs.Nstar || 0;
  const interaction = checkInteraction(
    inputs.Mstar,
    inputs.Vstar,
    bending.phiMn,
    shear.phiVn,
    Nstar,
    0 // phiNc – compression not checked for built-up assembly here
  );

  return {
    assemblyProps,
    bending,
    shear,
    interaction,
  };
}
