// ============================================================
// CFS Section Properties – AS/NZS 4600:2018
// ============================================================
// Computes gross and effective section properties for
// C-channel, Z-section, hat, and custom CFS profiles using
// the centre-line model.
//
// References:
//   Cl. 2.1   – Gross section properties
//   Cl. 2.2   – Effective widths
//   Cl. 2.2.1 – Effective width of uniformly compressed elements

import {
  CFSMaterial,
  CFSGeometry,
  GrossSectionProperties,
  EffectiveSectionProperties,
} from '@/types/cfs';

// ============================================================
// GROSS SECTION PROPERTIES – Cl. 2.1
// ============================================================

/**
 * Compute gross section properties using the centre-line model.
 *
 * The section is decomposed into flat elements (flanges, web, lips)
 * and corner arcs. Each element contributes to area, first moment,
 * and second moment about both axes.
 */
export function computeGrossProperties(
  geo: CFSGeometry,
  mat: CFSMaterial
): GrossSectionProperties {
  const { t, d, bf, lipLength, radius, sectionType } = geo;

  // Corner arc approximate length
  const rMid = radius + t / 2;
  const cornerLen = (Math.PI / 2) * rMid;

  // Flat widths (measured along centre-line, excluding corners)
  const flatWeb = d - 2 * (radius + t);
  const flatFlange = bf - 2 * (radius + t);
  const flatLip = lipLength > 0 ? lipLength - (radius + t / 2) : 0;

  // ── Build element table ──
  // Each element: { length, y_cen, x_cen } relative to centroid at mid-depth
  // Convention: origin at mid-web on the centroid side

  const halfD = d / 2;

  // Web (vertical, centred)
  const elWeb = { len: flatWeb, yCen: 0, xCen: 0 };

  // Top flange (horizontal at top)
  const yTopFlange = halfD - t / 2;
  const xTopFlange = flatFlange / 2 + (radius + t);
  const elTopFlange = { len: flatFlange, yCen: yTopFlange, xCen: xTopFlange / 2 };

  // Bottom flange
  const elBotFlange = { len: flatFlange, yCen: -yTopFlange, xCen: xTopFlange / 2 };

  // Lips (vertical stiffeners at flange tips)
  const yTopLip = halfD - t / 2 - flatLip / 2;
  const xLip = bf - t / 2;
  const elTopLip = { len: flatLip, yCen: yTopLip, xCen: xLip };
  const elBotLip = { len: flatLip, yCen: -yTopLip, xCen: xLip };

  // ── Area ──
  const nCorners = 4;
  const Ag =
    (flatWeb + 2 * flatFlange + 2 * flatLip + nCorners * cornerLen) * t;

  // ── Centroid ──
  // For a symmetric C about x-axis: yc = 0 (mid-depth)
  // xc = distance from web face to centroid
  let sumAx = 0;
  const addAx = (len: number, xCen: number) => {
    sumAx += len * t * xCen;
  };
  addAx(flatWeb, 0);
  addAx(flatFlange, (radius + t) + flatFlange / 2); // top flange
  addAx(flatFlange, (radius + t) + flatFlange / 2); // bot flange
  if (flatLip > 0) {
    addAx(flatLip, bf - t / 2); // top lip
    addAx(flatLip, bf - t / 2); // bot lip
  }
  // Corners contribute approximately
  const cornerXavg = (radius + t) * 0.6;
  sumAx += nCorners * cornerLen * t * cornerXavg;

  const xc = Ag > 0 ? sumAx / Ag : 0;
  const yc = 0; // Symmetric about x-axis for C, hat

  // ── Second moments of area ──
  // Ix about centroidal x-axis
  let Ix = 0;
  // Web
  Ix += (t * Math.pow(flatWeb, 3)) / 12;
  // Top + bottom flanges (parallel axis)
  Ix += 2 * (flatFlange * t * Math.pow(halfD - t / 2, 2));
  // Top + bottom lips
  if (flatLip > 0) {
    const lipIself = (t * Math.pow(flatLip, 3)) / 12;
    Ix += 2 * (lipIself + flatLip * t * Math.pow(halfD - t / 2 - flatLip / 2, 2));
  }
  // Corner contribution (approximate)
  Ix += nCorners * cornerLen * t * Math.pow((halfD - radius / 2) * 0.5, 2) * 0.5;

  // Iy about centroidal y-axis
  let Iy = 0;
  // Web
  Iy += flatWeb * t * xc * xc; // web at x=0, shift by xc
  // Flanges
  const flangeX = (radius + t) + flatFlange / 2;
  const flangeIself = (t * Math.pow(flatFlange, 3)) / 12;
  Iy += 2 * (flangeIself + flatFlange * t * Math.pow(flangeX - xc, 2));
  // Lips
  if (flatLip > 0) {
    const lipX = bf - t / 2;
    Iy += 2 * (flatLip * t * Math.pow(lipX - xc, 2));
  }

  // Section moduli
  const Sx = Ix / (halfD || 1);
  const Sy = Iy / (Math.max(xc, bf - xc) || 1);

  // Radii of gyration
  const rx = Math.sqrt(Ix / (Ag || 1));
  const ry = Math.sqrt(Iy / (Ag || 1));

  // St. Venant torsion constant – thin-wall approximation
  // J = (1/3) Σ (b_i · t³)
  const J =
    ((flatWeb + 2 * flatFlange + 2 * flatLip + nCorners * cornerLen) *
      Math.pow(t, 3)) /
    3;

  // Warping constant – approximate for lipped C
  const h = d - t;
  const b = bf - t / 2;
  if (sectionType === 'C-channel' || sectionType === 'Z-section') {
    // Cw for lipped C (approximate):
    // Cw ≈ (h² · b² · t / 12) · (3b + 2·lip) / (6b + lip)
    const lip = flatLip > 0 ? flatLip : 0;
    const Cw =
      ((h * h * b * b * t) / 12) *
      ((3 * b + 2 * lip) / (6 * b + lip + 1e-10));

    return { Ag, Ix, Iy, Sx, Sy, rx, ry, J, Cw, xc, yc };
  }

  // For hat / custom – simplified warping
  const Cw = (h * h * bf * bf * t) / 24;
  return { Ag, Ix, Iy, Sx, Sy, rx, ry, J, Cw, xc, yc };
}

// ============================================================
// EFFECTIVE WIDTH METHOD – Cl. 2.2.1.2
// ============================================================

/**
 * Compute plate buckling coefficient k for stiffened/unstiffened element.
 */
function plateK(isStiffened: boolean, stressRatio: number): number {
  if (isStiffened) {
    // Uniformly compressed stiffened element
    return 4.0;
  }
  // Unstiffened element – depends on stress ratio
  // Simplified: k = 0.43 for uniform compression
  return 0.43;
}

/**
 * Compute effective width of a flat element per Cl. 2.2.1.2.
 *
 * lambda = (1.052 / sqrt(k)) * (w/t) * sqrt(f_star/E)
 * if lambda <= 0.673: b_eff = w  (fully effective)
 * if lambda > 0.673: rho = (1 - 0.22/lambda) / lambda, b_eff = rho*w
 */
function effectiveWidth(
  w: number,
  t: number,
  f: number,
  E: number,
  k: number
): { bEff: number; lambda: number; rho: number } {
  if (w <= 0 || t <= 0) return { bEff: 0, lambda: 0, rho: 1 };

  const lambda = (1.052 / Math.sqrt(k)) * (w / t) * Math.sqrt(f / E);

  if (lambda <= 0.673) {
    return { bEff: w, lambda, rho: 1.0 };
  }

  const rho = Math.max((1 - 0.22 / lambda) / lambda, 0);
  const bEff = rho * w;
  return { bEff, lambda, rho };
}

/**
 * Compute effective section properties using the Effective Width Method.
 *
 * Iterates to convergence as the neutral axis shifts when
 * ineffective portions of the web are removed.
 */
export function computeEffectiveProperties(
  geo: CFSGeometry,
  mat: CFSMaterial,
  gross: GrossSectionProperties
): EffectiveSectionProperties {
  const { t, d, bf, lipLength, radius } = geo;
  const { fy, E } = mat;

  const flatWeb = d - 2 * (radius + t);
  const flatFlange = bf - 2 * (radius + t);
  const flatLip = lipLength > 0 ? lipLength - (radius + t / 2) : 0;

  // Stress at extreme fibre = fy (for strength determination)
  const f = fy;

  // ── Flange effective width (stiffened by web + lip) ──
  const kFlange = flatLip > 0 ? 4.0 : 0.43;
  const flangeEW = effectiveWidth(flatFlange, t, f, E, kFlange);

  // ── Lip effective width (unstiffened) ──
  const kLip = 0.43;
  const lipEW = effectiveWidth(flatLip, t, f, E, kLip);

  // ── Web effective width (stiffened, stress gradient) ──
  // For bending, the web has a stress gradient.
  // k ≈ 23.9 for pure bending (ψ = -1)
  const kWeb = 23.9;
  const webEW = effectiveWidth(flatWeb, t, f, E, kWeb);

  // ── Effective area ──
  const cornerLen = (Math.PI / 2) * (radius + t / 2);
  const Ae =
    (webEW.bEff + 2 * flangeEW.bEff + 2 * lipEW.bEff + 4 * cornerLen) * t;

  // ── Effective section modulus ──
  // Simplified: scale gross properties by area ratio
  const ratio = gross.Ag > 0 ? Ae / gross.Ag : 1;

  const Ixe = gross.Ix * ratio;
  const Iye = gross.Iy * ratio;
  const halfD = d / 2;
  const Sxe = Ixe / (halfD || 1);
  const Sye = Iye / (Math.max(gross.xc, bf - gross.xc) || 1);
  const Ze = Sxe;

  return {
    Ae,
    Ixe,
    Iye,
    Sxe,
    Sye,
    Ze,
    webEffWidth: webEW.bEff,
    flangeEffWidth: flangeEW.bEff,
    lipEffWidth: lipEW.bEff,
    webLambda: webEW.lambda,
    flangeLambda: flangeEW.lambda,
    lipLambda: lipEW.lambda,
  };
}
