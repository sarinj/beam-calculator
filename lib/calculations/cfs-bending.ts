// ============================================================
// CFS Bending Capacity – AS/NZS 4600:2018
// ============================================================
// Computes nominal bending capacity considering:
//   - Local buckling (EWM) – Cl. 3.3.2
//   - Distortional buckling (DSM) – Cl. 3.3.3
//   - Lateral-torsional buckling – Cl. 3.3.3.2
//
// References:
//   Cl. 3.3.2   – Nominal section moment capacity
//   Cl. 3.3.3   – Distortional buckling
//   Cl. 3.3.3.2 – Lateral-torsional buckling

import {
  CFSMaterial,
  CFSGeometry,
  CFSMember,
  GrossSectionProperties,
  EffectiveSectionProperties,
  BendingResult,
  BucklingMode,
  SignatureCurvePoint,
} from '@/types/cfs';

// ============================================================
// ELASTIC LATERAL-TORSIONAL BUCKLING – Cl. 3.3.3.2
// ============================================================

/**
 * Elastic lateral-torsional buckling moment Mo.
 *
 * Mo = Cb · √(π²EIyGJ / L²  +  π⁴EIyCw / L⁴ · (π²/L²))
 *
 * Simplified for doubly-symmetric or mono-symmetric C sections:
 * Mo = (Cb · π² · E · Iy / L²) · √(G·J·L²/(π²·E·Iy) + Cw)
 */
function computeMo(
  mat: CFSMaterial,
  gross: GrossSectionProperties,
  member: CFSMember
): number {
  const { E, G } = mat;
  const { Iy, J, Cw } = gross;
  const { Lb, Cb } = member;

  if (Lb <= 0 || Iy <= 0) return Infinity;

  const Ke = effectiveLengthFactor(member.endCondition);
  const Le = Ke * Lb;

  const pi2 = Math.PI * Math.PI;
  const term1 = (pi2 * E * Iy) / (Le * Le);
  const term2 = (G * J * Le * Le) / (pi2 * E * Iy);
  const term3 = Cw;

  const Mo = Cb * term1 * Math.sqrt(term2 + term3 / (Iy || 1));

  return Math.max(Mo, 0);
}

function effectiveLengthFactor(
  endCondition: string
): number {
  switch (endCondition) {
    case 'pinned-pinned': return 1.0;
    case 'fixed-free': return 2.0;
    case 'fixed-pinned': return 0.7;
    case 'fixed-fixed': return 0.5;
    default: return 1.0;
  }
}

// ============================================================
// DISTORTIONAL BUCKLING – Cl. 3.3.3
// ============================================================

/**
 * Elastic distortional buckling stress (simplified).
 *
 * Uses Schafer's approximation for C/Z sections:
 * fcrd ≈ β₁ · [(E·t³)/(12(1−ν²)·bf²)] · [1 + β₂·(bf/d)² + β₃·(lip/bf)²]
 *
 * For design, the user can also supply fcrd directly.
 */
function computeDistortionalBucklingStress(
  geo: CFSGeometry,
  mat: CFSMaterial
): { fcrd: number; Lcrd: number } {
  const { t, d, bf, lipLength, radius } = geo;
  const { E, nu } = mat;

  const flatFlange = bf - 2 * (radius + t);
  const flatLip = lipLength > 0 ? lipLength - (radius + t / 2) : 0;

  // Plate flexural rigidity
  const D = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));

  // Simplified distortional buckling for lipped C
  const beta1 = 1.0;
  const beta2 = 0.4;
  const beta3 = 5.0;

  const bfTerm = flatFlange > 0 ? flatFlange : bf;
  const fcrd =
    beta1 *
    (D / (bfTerm * bfTerm * t)) *
    (1 + beta2 * Math.pow(bfTerm / d, 2) + beta3 * Math.pow(flatLip / (bfTerm || 1), 2));

  // Critical half-wavelength
  const Lcrd = 4.8 * Math.pow((d * bfTerm * bfTerm) / t, 0.25);

  return { fcrd: Math.max(fcrd, 1), Lcrd };
}

// ============================================================
// LOCAL BUCKLING – Cl. 3.3.2
// ============================================================

/**
 * Local buckling moment capacity using EWM results.
 *
 * Mne_local = Ze · fy   (Cl. 3.3.2)
 * where Ze is the effective section modulus from EWM.
 */
function computeLocalBucklingMoment(
  fy: number,
  effectiveProps: EffectiveSectionProperties
): number {
  return (effectiveProps.Ze * fy) / 1e6; // kN·m
}

// ============================================================
// SIGNATURE CURVE (simplified)
// ============================================================

function generateSignatureCurve(
  geo: CFSGeometry,
  mat: CFSMaterial,
  gross: GrossSectionProperties
): SignatureCurvePoint[] {
  const { t, d, bf, lipLength, radius } = geo;
  const { E, nu, fy } = mat;

  const pi2 = Math.PI * Math.PI;
  const D = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));
  const flatWeb = Math.max(d - 2 * (radius + t), 1);
  const flatFlange = Math.max(bf - 2 * (radius + t), 1);
  const flatLip = lipLength > 0 ? Math.max(lipLength - (radius + t / 2), 0) : 0;

  // ── Local buckling half-wavelength & minimum stress ──
  // For elements in uniform compression (flanges), critical half-wavelength ≈ flange width
  // Plate buckling: fcr = k·π²D / (b²·t), k depends on boundary conditions
  const kFlange = flatLip > 0 ? 4.0 : 0.43;   // stiffened vs unstiffened
  const kWeb = 23.9;  // bending gradient on web
  const fcrFlange = kFlange * pi2 * D / (flatFlange * flatFlange * t);
  const fcrWeb = kWeb * pi2 * D / (flatWeb * flatWeb * t);
  const fcrLocal_min = Math.min(fcrFlange, fcrWeb);
  const Lcr_local = flatFlange;  // characteristic local half-wavelength

  // ── Distortional buckling ──
  const { fcrd: fcrDist_min, Lcrd: Lcr_dist } = computeDistortionalBucklingStress(geo, mat);

  // ── Global (flexural/flexural-torsional) ──
  // Use minor axis radius of gyration for weak-axis Euler
  const ry = gross.ry > 0 ? gross.ry : Math.sqrt(gross.Iy / (gross.Ag || 1));
  // For torsional: foz = (GJ + π²ECw/L²) / (Ag·r0²)
  const G = E / (2 * (1 + nu));
  const r0sq = (gross.Ix + gross.Iy) / (gross.Ag || 1) + (gross.xc || 0) ** 2;

  // ── Generate points with log spacing ──
  const points: SignatureCurvePoint[] = [];
  const nPts = 80;
  const logMin = Math.log10(Math.max(t * 2, 5));
  const logMax = Math.log10(50000);

  for (let i = 0; i < nPts; i++) {
    const L = Math.pow(10, logMin + (i / (nPts - 1)) * (logMax - logMin));

    // ──── Local buckling curve ────
    // Multi-wave plate buckling: for a plate of width b, the critical stress
    // at half-wavelength L is fcr(L) = k·π²D/(b²t) · (m·b/L + L/(m·b))²
    // where m = number of half-waves that minimizes the expression.
    // We find the optimal m and use the combined web+flange interaction.
    let fcr_local_flange = Infinity;
    for (let m = 1; m <= Math.max(1, Math.ceil(L / flatFlange) + 2); m++) {
      const r = m * flatFlange / L;
      const stress = kFlange * pi2 * D / (flatFlange * flatFlange * t) * Math.pow(r + 1 / r, 2) / 4;
      if (stress < fcr_local_flange) fcr_local_flange = stress;
    }
    let fcr_local_web = Infinity;
    for (let m = 1; m <= Math.max(1, Math.ceil(L / flatWeb) + 2); m++) {
      const r = m * flatWeb / L;
      const stress = kWeb * pi2 * D / (flatWeb * flatWeb * t) * Math.pow(r + 1 / r, 2) / 4;
      if (stress < fcr_local_web) fcr_local_web = stress;
    }
    const fcr_local = Math.min(fcr_local_flange, fcr_local_web);

    // ──── Distortional buckling curve ────
    // Model as a restrained flange-lip assembly.
    // The distortional curve has a characteristic minimum at Lcrd.
    // Use an energy-based parabolic approximation in log space around the minimum.
    const logRatio = Math.log(L / Lcr_dist);
    // Spring–column model: fcr_d = fcrDist_min · cosh(α · logRatio)
    // α controls the curvature; calibrate so the curve rises steeply away from minimum
    const alpha_d = 0.9;
    const fcr_dist = fcrDist_min * Math.cosh(alpha_d * logRatio);

    // ──── Global buckling curve ────
    // Flexural-torsional for mono-symmetric C:
    // foy = π²E·Iy/(Ag·L²), foz = [GJ + π²ECw/L²]/(Ag·r0²)
    // For simplicity, use the minimum of flexural and torsional
    const Ag = gross.Ag || 1;
    const foy = pi2 * E * gross.Iy / (Ag * L * L);
    const foz = r0sq > 0
      ? (G * gross.J + pi2 * E * gross.Cw / (L * L)) / (Ag * r0sq)
      : Infinity;
    // Flexural-torsional interaction (mono-symmetric):
    // for C-section with x offset: fe = 0.5/(1-β) * [(foy+foz) - √((foy+foz)²-4βfoyfoz)]
    const beta = 1 - (gross.xc * gross.xc) / (r0sq || 1);
    let fcr_global: number;
    if (beta > 0 && beta < 1) {
      const sum = foy + foz;
      const disc = sum * sum - 4 * beta * foy * foz;
      fcr_global = disc > 0
        ? (0.5 / (1 - beta)) * (sum - Math.sqrt(disc))
        : Math.min(foy, foz);
    } else {
      fcr_global = Math.min(foy, foz);
    }

    const fcr_envelope = Math.min(fcr_local, fcr_dist, fcr_global);

    points.push({
      halfWavelength: L,
      fcr_local: Math.max(fcr_local, 0),
      fcr_dist: Math.max(fcr_dist, 0),
      fcr_global: Math.max(fcr_global, 0),
      fcr_envelope: Math.max(fcr_envelope, 0),
    });
  }

  return points;
}

// ============================================================
// MAIN BENDING CAPACITY – Cl. 3.3
// ============================================================

/**
 * Compute nominal bending capacity per AS/NZS 4600:2018.
 *
 * Returns the governing capacity from:
 *   1. Local buckling (EWM)   – Cl. 3.3.2
 *   2. Distortional buckling  – Cl. 3.3.3
 *   3. Lateral-torsional      – Cl. 3.3.3.2
 */
export function computeBendingCapacity(
  mat: CFSMaterial,
  geo: CFSGeometry,
  member: CFSMember,
  gross: GrossSectionProperties,
  effective: EffectiveSectionProperties,
  distortionalFactor: number = 1.0
): BendingResult {
  const { fy } = mat;
  const phi_b = 0.90; // AS/NZS 4600 capacity reduction factor for bending

  // Yield moment
  const My = (gross.Sx * fy) / 1e6; // kN·m

  // 1. Local buckling (EWM)
  const Mne_local = computeLocalBucklingMoment(fy, effective);

  // 2. Distortional buckling
  // For multi-member assemblies, the connected webs provide additional
  // rotational restraint at the flange-web junction, increasing fcrd.
  // The distortionalFactor (typically √n for n members) accounts for this.
  const { fcrd: fcrd_raw, Lcrd } = computeDistortionalBucklingStress(geo, mat);
  const fcrd = fcrd_raw * distortionalFactor;
  const Mcr_dist = (gross.Sx * fcrd) / 1e6; // kN·m
  const lambdaD = Math.sqrt(My / (Mcr_dist || 1));

  let Mne_distortional: number;
  if (lambdaD <= 0.673) {
    Mne_distortional = My;
  } else {
    Mne_distortional =
      (1 - 0.22 * Math.pow(Mcr_dist / My, 0.5)) *
      Math.pow(Mcr_dist / My, 0.5) *
      My;
  }
  Mne_distortional = Math.max(Mne_distortional, 0);

  // 3. Lateral-torsional buckling
  // computeMo returns N·mm; convert to kN·m to match My, Mne_local, Mcr_dist
  const Mo = computeMo(mat, gross, member) / 1e6;
  const Mcr_local = (gross.Sx * fy) / 1e6; // Simplification

  let Mne_ltb: number;
  if (Mo >= 2.78 * My) {
    // Full yield
    Mne_ltb = My;
  } else if (Mo > 0.56 * My) {
    // Inelastic
    Mne_ltb = (10 / 9) * My * (1 - (10 * My) / (36 * Mo));
  } else {
    // Elastic
    Mne_ltb = Mo;
  }
  Mne_ltb = Math.max(Mne_ltb, 0);

  // Governing moment
  const Mn = Math.min(Mne_local, Mne_distortional, Mne_ltb);
  const phiMn = phi_b * Mn;

  // Determine governing mode
  let governingMode: BucklingMode = 'local';
  if (Mn === Mne_distortional) governingMode = 'distortional';
  if (Mn === Mne_ltb) governingMode = 'lateral-torsional';

  // Signature curve
  const signatureCurve = generateSignatureCurve(geo, mat, gross);

  return {
    Mne_local,
    Mne_distortional,
    Mne_ltb,
    Mn,
    phiMn,
    phi_b,
    governingMode,
    Mcr_local,
    Mcr_dist,
    Mo,
    My,
    Lcrd,
    lambdaD,
    signatureCurve,
  };
}
