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
  // Top 2 corners at y ≈ ±(halfD - rMid/2), bottom 2 similarly
  const yCorner = halfD - rMid / 2;
  Ix += nCorners * cornerLen * t * yCorner * yCorner;

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
 * Properly builds the effective section from individual elements,
 * computes the shifted neutral axis, and determines Ixe about that
 * shifted axis. This is critical for accurate Ze and moment capacity.
 *
 * For bending about the major axis (x–x):
 *  - Top flange, top lip: compression → may lose effectiveness
 *  - Bottom flange, bottom lip: tension → fully effective
 *  - Web: stress gradient, effective width distributed as two strips
 *  - Corners: always fully effective
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
  const halfD = d / 2;
  const rMid = radius + t / 2;
  const cornerLen = (Math.PI / 2) * rMid;

  // Stress at extreme compression fibre = fy
  const f = fy;

  // ── Effective widths ──
  // Top flange (compression, stiffened if lipped)
  const kFlange = flatLip > 0 ? 4.0 : 0.43;
  const flangeEW = effectiveWidth(flatFlange, t, f, E, kFlange);

  // Top lip (compression, unstiffened)
  const kLip = 0.43;
  const lipEW = effectiveWidth(flatLip, t, f, E, kLip);

  // Web (stress gradient, ψ = −1 for pure bending, k ≈ 23.9)
  const kWeb = 23.9;
  const webEW = effectiveWidth(flatWeb, t, f, E, kWeb);

  // ── Web effective strip distribution (Cl. 2.2.1.2) ──
  // For ψ = −1 (pure bending):
  //   b_e1 = b_eff / (3 − ψ) = b_eff / 4  (near max compression edge)
  //   b_e2 = b_eff − b_e1 = 3·b_eff/4     (near tension edge)
  // If web is fully effective, use full flat web.
  const webFullyEffective = webEW.lambda <= 0.673;
  const be1 = webFullyEffective ? flatWeb / 2 : webEW.bEff / 4;
  const be2 = webFullyEffective ? flatWeb / 2 : 3 * webEW.bEff / 4;

  // ── Build effective element table ──
  // y measured from mid-depth, positive = compression side (top)
  const elements: { area: number; y: number; Iself: number }[] = [];

  // Web strip 1 (near compression edge at top of flat web)
  const yWebTop = flatWeb / 2; // top of flat web from mid-depth
  elements.push({
    area: be1 * t,
    y: yWebTop - be1 / 2, // centroid of strip
    Iself: t * be1 * be1 * be1 / 12,
  });

  // Web strip 2 (near tension edge at bottom of flat web)
  const yWebBot = -flatWeb / 2;
  elements.push({
    area: be2 * t,
    y: yWebBot + be2 / 2, // centroid of strip
    Iself: t * be2 * be2 * be2 / 12,
  });

  // Top flange (compression, reduced)
  const yTopFlange = halfD - t / 2;
  elements.push({
    area: flangeEW.bEff * t,
    y: yTopFlange,
    Iself: flangeEW.bEff * t * t * t / 12,
  });

  // Bottom flange (tension, fully effective)
  elements.push({
    area: flatFlange * t,
    y: -(halfD - t / 2),
    Iself: flatFlange * t * t * t / 12,
  });

  // Top lip (compression, reduced)
  if (flatLip > 0) {
    elements.push({
      area: lipEW.bEff * t,
      y: halfD - t / 2 - lipEW.bEff / 2, // centroid of effective lip
      Iself: t * lipEW.bEff * lipEW.bEff * lipEW.bEff / 12,
    });
  }

  // Bottom lip (tension, fully effective)
  if (flatLip > 0) {
    elements.push({
      area: flatLip * t,
      y: -(halfD - t / 2 - flatLip / 2),
      Iself: t * flatLip * flatLip * flatLip / 12,
    });
  }

  // Top 2 corners
  const yCornerTop = halfD - rMid / 2;
  elements.push({ area: 2 * cornerLen * t, y: yCornerTop, Iself: 0 });

  // Bottom 2 corners
  elements.push({ area: 2 * cornerLen * t, y: -yCornerTop, Iself: 0 });

  // ── Effective area ──
  const Ae = elements.reduce((s, e) => s + e.area, 0);

  // ── Shifted neutral axis ──
  const yNA = Ae > 0 ? elements.reduce((s, e) => s + e.area * e.y, 0) / Ae : 0;

  // ── Effective Ix about shifted NA (parallel axis theorem) ──
  let Ixe = 0;
  elements.forEach((e) => {
    Ixe += e.Iself + e.area * (e.y - yNA) * (e.y - yNA);
  });

  // ── Effective section modulus ──
  // Distance from shifted NA to extreme compression fiber (top)
  const ycf = halfD - yNA;
  // Distance from shifted NA to extreme tension fiber (bottom)
  const ytf = halfD + yNA;
  // Ze uses the compression side (governs for strength)
  const Sxe = ycf > 0 ? Ixe / ycf : 0;
  const Ze = Math.min(Sxe, ytf > 0 ? Ixe / ytf : Sxe);

  // ── Effective Iy (minor axis — use ratio approach, minor axis NA shift is small) ──
  const ratioY = gross.Ag > 0 ? Ae / gross.Ag : 1;
  const Iye = gross.Iy * ratioY;
  const Sye = Iye / (Math.max(gross.xc, bf - gross.xc) || 1);

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
