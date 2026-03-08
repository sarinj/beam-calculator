// ============================================================
// Simple CFS – Effective Width Method (EWM) Bending Capacity
// AS/NZS 4600:2018  Section 3.3 "Members Subject to Bending"
// ============================================================
//
// This module computes the nominal and design bending moment capacity
// (phi_b * Mb) of a single cold-formed steel C-section (lipped or
// unlipped channel) under major-axis bending using the Effective
// Width Method (EWM) per Section 3.3.
//
// NO AISI specification is referenced.
// Equations sourced ONLY from AS/NZS 4600:2018 pages 59-65.
//
// Clause references:
//   Cl. 1.5      – Material properties
//   Cl. 2.1      – Gross section properties (centre-line model)
//   Cl. 2.2.1.2  – Effective widths of uniformly compressed elements
//   Cl. 3.3.1    – Bending moment design check
//   Cl. 3.3.2.2  – Nominal section moment capacity Ms = Ze * fy
//   Cl. 3.3.3.1  – Nominal member moment capacity Mb (general)
//   Cl. 3.3.3.2.1 – Lateral-torsional buckling (open sections)
//   Cl. 3.3.3.3  – Distortional buckling
//   Cl. D2.1.1   – Elastic lateral-torsional buckling moment (Mo)
//
// Units: N, mm, MPa throughout internal calculations.
// Final results converted to kN·m.
// ============================================================

// ============================================================
// TYPES
// ============================================================

/** Material properties */
export interface DSMMaterial {
  fy: number;   // Yield stress (MPa)
  E: number;    // Elastic modulus (MPa)
  nu: number;   // Poisson's ratio
  G: number;    // Shear modulus (MPa) – derived
}

/** Section geometry for a C-channel */
export interface DSMGeometry {
  d: number;          // Web depth, out-to-out (mm)
  bf: number;         // Flange width, out-to-out (mm)
  t: number;          // Thickness (mm)
  lipLength: number;  // Lip (stiffener) length (mm), 0 for unlipped
  r: number;          // Inside bend radius (mm)
}

/** Member parameters */
export interface DSMMember {
  Lb: number;                                               // Unbraced length (mm)
  Cb: number;                                               // Moment gradient factor (1.0 = uniform)
  endCondition: 'pinned-pinned' | 'fixed-free' | 'fixed-pinned' | 'fixed-fixed';
}

/** Shear member parameters */
export interface DSMShearParams {
  a: number;                 // Shear panel length (mm)
  hasStiffeners: boolean;    // Transverse stiffeners present
  stiffenerSpacing: number;  // Stiffener spacing (mm), used if hasStiffeners = true
}

/** Gross section properties */
export interface DSMGrossProps {
  Ag: number;   // Gross area (mm²)
  Ix: number;   // Major-axis second moment of area (mm⁴)
  Iy: number;   // Minor-axis second moment of area (mm⁴)
  Sx: number;   // Elastic section modulus about x (mm³)
  rx: number;   // Radius of gyration about x (mm)
  ry: number;   // Radius of gyration about y (mm)
  J: number;    // St. Venant torsion constant (mm⁴)
  Cw: number;   // Warping constant (mm⁶)
  xc: number;   // Centroid distance from web face (mm)
  yc: number;   // Centroid y-distance (mm)
}

/** Buckling mode */
export type DSMBucklingMode = 'local' | 'distortional' | 'lateral-torsional';

/** Elastic buckling values */
export interface DSMElasticBuckling {
  fol: number;     // Elastic local buckling stress (MPa)
  fod: number;     // Elastic distortional buckling stress (MPa)
  Mol: number;     // Elastic local buckling moment (kN·m)
  Mod: number;     // Elastic distortional buckling moment (kN·m)
  Mo: number;      // Elastic LTB moment (kN·m)
  My: number;      // Yield moment (kN·m)
  Lcrd: number;    // Critical distortional half-wavelength (mm)
}

/** DSM capacity results */
export interface DSMCapacityResults {
  Mbe: number;     // LTB capacity (kN·m) – Cl. 7.2.2.2
  Mbl: number;     // Local buckling capacity (kN·m) – Cl. 7.2.2.3
  Mbd: number;     // Distortional buckling capacity (kN·m) – Cl. 7.2.2.4
  Mn: number;      // Nominal moment Mb = min(Mbl, Mbd) (kN·m)
  phiMn: number;   // Design moment ϕMb (kN·m)
  phi_b: number;   // Capacity reduction factor
  governingMode: DSMBucklingMode;
  lambdaL: number; // Local slenderness √(Mbe/Mol)
  lambdaD: number; // Distortional slenderness √(My/Mod)
}

/** Shear governing equation — per AS/NZS 4600:2018 Cl. 3.3.4.1 */
export type DSMShearMode = 'Eq.3.3.4(1)' | 'Eq.3.3.4(2)' | 'Eq.3.3.4(3)';

/** Shear capacity results */
export interface DSMShearResult {
  hw: number;         // Clear web depth (mm)
  Av: number;         // Web shear area (mm²)
  fvy: number;        // Shear yield stress = fy/√3 (MPa)
  kv: number;         // Shear buckling coefficient
  tau_cr: number;     // Elastic shear buckling stress (MPa)
  Vy: number;         // Shear yield force (kN)
  Vcr: number;        // Elastic shear buckling force (kN)
  lambda_v: number;   // Shear slenderness √(Vy/Vcr)
  Vn: number;         // Nominal shear capacity (kN)
  phiVn: number;      // Design shear capacity (kN)
  phi_v: number;      // Capacity reduction factor
  shearMode: DSMShearMode;
  steps: DSMCalcStep[];
}

/** Signature curve data point */
export interface DSMSignatureCurvePoint {
  halfWavelength: number;
  fcr_local: number;
  fcr_dist: number;
  fcr_global: number;
  fcr_envelope: number;
}

/** Complete calculation step */
export interface DSMCalcStep {
  clause: string;
  title: string;
  equations: string[];
  values: { label: string; value: string; unit: string }[];
}

/** Full DSM design result */
export interface DSMDesignResult {
  material: DSMMaterial;
  geometry: DSMGeometry;
  member: DSMMember;
  grossProps: DSMGrossProps;
  buckling: DSMElasticBuckling;
  capacity: DSMCapacityResults;
  shear: DSMShearResult | null;
  steps: DSMCalcStep[];
  signatureCurve: DSMSignatureCurvePoint[];
}

// ============================================================
// MATERIAL – Cl. 1.5
// ============================================================

/** Create material with derived shear modulus G = E / [2(1+ν)] */
export function createDSMMaterial(fy: number, E: number, nu: number): DSMMaterial {
  const G = E / (2 * (1 + nu));
  return { fy, E, nu, G };
}

// ============================================================
// GROSS SECTION PROPERTIES – Cl. 2.1 (Centre-Line Model)
// ============================================================

/**
 * Compute gross section properties for a C-channel (lipped or unlipped)
 * using the centre-line model per Cl. 2.1.
 *
 * The section is decomposed into flat plate elements (web, 2 flanges,
 * 2 lips if present) and 4 corner arcs. Properties are computed by
 * summing element contributions using the parallel-axis theorem.
 */
export function computeDSMGrossProps(geo: DSMGeometry, mat: DSMMaterial): DSMGrossProps {
  const { d, bf, t, lipLength, r } = geo;

  // Mid-line corner radius
  const rMid = r + t / 2;
  const cornerArcLen = (Math.PI / 2) * rMid;

  // Flat element widths (centre-line dimensions excluding corners)
  const flatWeb = Math.max(d - 2 * (r + t), 0);
  const flatFlange = Math.max(bf - 2 * (r + t), 0);
  const flatLip = lipLength > 0 ? Math.max(lipLength - (r + t / 2), 0) : 0;

  const halfD = d / 2;
  const nCorners = 4;

  // ── Total gross area ──
  const Ag = (flatWeb + 2 * flatFlange + 2 * flatLip + nCorners * cornerArcLen) * t;

  // ── Centroid x-position (from web face) ──
  // For a C-channel: symmetric about x-axis → yc = 0
  let sumAx = 0;
  const addAx = (len: number, xCen: number) => { sumAx += len * t * xCen; };

  addAx(flatWeb, 0);                                              // web at x = 0
  addAx(flatFlange, (r + t) + flatFlange / 2);                   // top flange
  addAx(flatFlange, (r + t) + flatFlange / 2);                   // bottom flange
  if (flatLip > 0) {
    addAx(flatLip, bf - t / 2);                                   // top lip
    addAx(flatLip, bf - t / 2);                                   // bottom lip
  }
  // Corner contribution (approximate centroid at 0.6× corner offset)
  const cornerXavg = (r + t) * 0.6;
  sumAx += nCorners * cornerArcLen * t * cornerXavg;

  const xc = Ag > 0 ? sumAx / Ag : 0;
  const yc = 0; // symmetric about x-axis

  // ── Second moment of area Ix (about centroidal x-axis) ──
  let Ix = 0;

  // Web (vertical, centred at mid-depth)
  Ix += (t * Math.pow(flatWeb, 3)) / 12;

  // Top + bottom flanges (parallel-axis)
  const yFlange = halfD - t / 2;
  Ix += 2 * (flatFlange * t * yFlange * yFlange);

  // Top + bottom lips
  if (flatLip > 0) {
    const lipIself = (t * Math.pow(flatLip, 3)) / 12;
    Ix += 2 * (lipIself + flatLip * t * Math.pow(yFlange - flatLip / 2, 2));
  }

  // Corner contributions (approximate)
  const yCorner = halfD - rMid / 2;
  Ix += nCorners * cornerArcLen * t * yCorner * yCorner;

  // ── Second moment of area Iy (about centroidal y-axis) ──
  let Iy = 0;

  // Web (at x = 0, shifted by xc)
  Iy += flatWeb * t * xc * xc;

  // Flanges
  const flangeX = (r + t) + flatFlange / 2;
  const flangeIself = (t * Math.pow(flatFlange, 3)) / 12;
  Iy += 2 * (flangeIself + flatFlange * t * Math.pow(flangeX - xc, 2));

  // Lips
  if (flatLip > 0) {
    const lipX = bf - t / 2;
    Iy += 2 * (flatLip * t * Math.pow(lipX - xc, 2));
  }

  // ── Section modulus ──
  const Sx = Ix / (halfD || 1);

  // ── Radii of gyration ──
  const rx = Math.sqrt(Ix / (Ag || 1));
  const ry = Math.sqrt(Iy / (Ag || 1));

  // ── St. Venant torsion constant (thin-wall approximation) ──
  // J = (1/3) × Σ(bᵢ × t³)  –  Cl. 2.1
  const totalFlatLength = flatWeb + 2 * flatFlange + 2 * flatLip + nCorners * cornerArcLen;
  const J = (totalFlatLength * Math.pow(t, 3)) / 3;

  // ── Warping constant ──
  // For lipped C: Cw ≈ (h²·b²·t/12) × (3b + 2·lip)/(6b + lip)
  // For unlipped C: Cw ≈ h²·b²·t/24 × (3bf - 2t)/(6bf - t) ≈ h²·b³·t/12
  const h = d - t;
  const b = bf - t / 2;
  let Cw: number;
  if (flatLip > 0) {
    // Lipped C-channel
    Cw = ((h * h * b * b * t) / 12) *
      ((3 * b + 2 * flatLip) / (6 * b + flatLip + 1e-10));
  } else {
    // Unlipped C-channel
    Cw = (h * h * b * b * t) / 24;
  }

  return { Ag, Ix, Iy, Sx, rx, ry, J, Cw, xc, yc };
}

// ============================================================
// ELASTIC LATERAL-TORSIONAL BUCKLING – Cl. D2.1.1
// ============================================================

/**
 * Effective length factor for lateral-torsional buckling.
 */
function effectiveLengthFactor(endCondition: string): number {
  switch (endCondition) {
    case 'pinned-pinned': return 1.0;
    case 'fixed-free':    return 2.0;
    case 'fixed-pinned':  return 0.7;
    case 'fixed-fixed':   return 0.5;
    default:              return 1.0;
  }
}

/**
 * Elastic lateral-torsional buckling moment Mo per Cl. D2.1.1.
 *
 * For singly-symmetric C-sections bent about the axis of symmetry:
 *
 *   Mo = Cb × √[ (π²EIy / Le²) × (GJ + π²ECw / Le²) ]
 *
 * Eq. D2.1.1(1)
 *
 * Returns Mo in N·mm.
 */
function computeMo(
  mat: DSMMaterial,
  gross: DSMGrossProps,
  member: DSMMember
): number {
  const { E, G } = mat;
  const { Iy, J, Cw } = gross;
  const { Lb, Cb, endCondition } = member;

  if (Lb <= 0 || Iy <= 0) return Infinity;

  const Ke = effectiveLengthFactor(endCondition);
  const Le = Ke * Lb; // effective length

  const pi2 = Math.PI * Math.PI;

  // π²EIy / Le²
  const term1 = (pi2 * E * Iy) / (Le * Le);

  // GJ + π²ECw / Le²
  const term2 = G * J + (pi2 * E * Cw) / (Le * Le);

  const Mo = Cb * Math.sqrt(term1 * term2);

  return Math.max(Mo, 0);
}

// ============================================================
// ELASTIC LOCAL BUCKLING STRESS
// ============================================================

/**
 * Compute the elastic local buckling stress fol.
 *
 * Uses plate buckling theory for constituent elements:
 *
 * For flanges in uniform compression:
 *   fcr = k × π²D / (b² × t)
 *   k = 4.0 (stiffened by lip) or k = 0.43 (unstiffened)
 *
 * For web in bending gradient (ψ = −1, pure bending):
 *   fcr = k × π²D / (hw² × t)
 *   k ≈ 23.9
 *
 * where D = Et³ / [12(1−ν²)] is the plate flexural rigidity.
 *
 * fol = min(fcr_flange, fcr_web)
 */
function computeLocalBucklingStress(geo: DSMGeometry, mat: DSMMaterial): number {
  const { d, bf, t, lipLength, r } = geo;
  const { E, nu } = mat;

  const pi2 = Math.PI * Math.PI;
  const D = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));

  const flatWeb = Math.max(d - 2 * (r + t), 1);
  const flatFlange = Math.max(bf - 2 * (r + t), 1);
  const flatLip = lipLength > 0 ? Math.max(lipLength - (r + t / 2), 0) : 0;

  // Flange: k = 4.0 if lip-stiffened, k = 0.43 if unstiffened
  const kFlange = flatLip > 0 ? 4.0 : 0.43;
  const fcrFlange = kFlange * pi2 * D / (flatFlange * flatFlange * t);

  // Web under bending gradient: k ≈ 23.9
  const kWeb = 23.9;
  const fcrWeb = kWeb * pi2 * D / (flatWeb * flatWeb * t);

  return Math.min(fcrFlange, fcrWeb);
}

// ============================================================
// ELASTIC DISTORTIONAL BUCKLING STRESS
// ============================================================

/**
 * Elastic distortional buckling stress fod for a simple lipped
 * C-section in BENDING per AS/NZS 4600:2018 Appendix D, Cl. D2.2.1.
 *
 * D2.2.1 states: fod shall be determined in accordance with
 * Paragraph D1.2.1 (simple lipped channels in compression), except:
 *
 *   lambda  from Eq. D2.2.1(1)  (modified half-wavelength for bending)
 *   k_phi   from Eq. D2.2.1(2)  (rotational spring stiffness from web)
 *   alpha_1 from Eq. D2.2.1(3)  (initial alpha_1 without k_phi)
 *
 * Flange-lip assembly properties per Eqs. D1.2.1(22)-(28).
 * Main fod formula per Eq. D1.2.1(13).
 *
 * For unlipped sections, distortional buckling does not occur.
 * Returns fod = 0.
 *
 * k_phi (= k0 in Cl. 3.3.3.3) determines Zc:
 *   k_phi >= 0  →  Zc = Zf (standard C-section, web restrains flange)
 *   k_phi < 0   →  web destabilises flange (recalculate with f'od = 0)
 */
function computeDistortionalBucklingBending(
  geo: DSMGeometry,
  mat: DSMMaterial
): { fod: number; Lcrd: number; k_phi: number; k_phi_original_negative: boolean } {
  const { d, bf, t, lipLength, r } = geo;
  const { E } = mat;

  const b_f = Math.max(bf - 2 * (r + t), 1);       // flat flange width
  const d_l = lipLength > 0 ? Math.max(lipLength - (r + t / 2), 0) : 0;  // flat lip length
  const b_w = Math.max(d - 2 * (r + t), 1);         // flat web depth

  // No lip → no distortional buckling mode
  if (d_l <= 0) {
    return { fod: 0, Lcrd: 0, k_phi: 0, k_phi_original_negative: false };
  }

  // ── Flange-Lip Assembly Properties — Eqs. D1.2.1(22)-(28) ──
  // These are for the compression flange and lip ALONE (see Figure D2(b)/(c))
  const A_fl   = (b_f + d_l) * t;                                              // Eq. D1.2.1(22)
  const x_bar  = (b_f * b_f + 2 * b_f * d_l) / (2 * (b_f + d_l));            // Eq. D1.2.1(23)
  const y_bar  = (d_l * d_l) / (2 * (b_f + d_l));                             // Eq. D1.2.1(24)
  const J_fl   = (t * t * t * (b_f + d_l)) / 3;                               // Eq. D1.2.1(25)

  // Eq. D1.2.1(26) — second moment about x-axis of flange-lip
  const Ix_fl  = (b_f * t * t * t) / 12
               + (t * d_l * d_l * d_l) / 12
               + b_f * t * y_bar * y_bar
               + d_l * t * Math.pow(d_l / 2 - y_bar, 2);

  // Eq. D1.2.1(27) — second moment about y-axis of flange-lip
  const Iy_fl  = (t * b_f * b_f * b_f) / 12
               + (d_l * t * t * t) / 12
               + d_l * t * Math.pow(b_f - x_bar, 2)
               + b_f * t * Math.pow(x_bar - b_f / 2, 2);

  // Eq. D1.2.1(28) — product of inertia of flange-lip
  const Ixy_fl = b_f * t * (b_f / 2 - x_bar) * (-y_bar)
               + d_l * t * (d_l / 2 - y_bar) * (b_f - x_bar);

  // ── lambda per Eq. D2.2.1(1) — bending modification ──
  // lambda = 4.80 × (Ix × b_f² × b_w / (2 × t³))^0.25
  const lambda = 4.80 * Math.pow((Ix_fl * b_f * b_f * b_w) / (2 * t * t * t), 0.25);

  // ── eta per Eq. D1.2.1(19) ──
  const eta = (Math.PI / lambda) * (Math.PI / lambda);

  // ── beta_1 per Eq. D1.2.1(17) ──
  const beta_1 = x_bar * x_bar + (Ix_fl + Iy_fl) / A_fl;

  // ── alpha_1 (initial, WITHOUT k_phi) per Eq. D2.2.1(3) ──
  const alpha_1_init = (eta / beta_1) * (Ix_fl * b_f * b_f + 0.039 * J_fl * lambda * lambda);

  // ── alpha_2 per Eq. D1.2.1(15) ──
  const alpha_2 = eta * (Iy_fl + (2 / beta_1) * y_bar * b_f * Ixy_fl);

  // ── alpha_3 (initial) per Eq. D1.2.1(16) ──
  const alpha_3_init = eta * (alpha_1_init * Iy_fl - (eta / beta_1) * Ixy_fl * Ixy_fl * b_f * b_f);

  // ── f'_od from Eq. D1.2.1(13) using initial alpha_1 ──
  const sum_init = alpha_1_init + alpha_2;
  const disc_init = sum_init * sum_init - 4 * alpha_3_init;
  let f_od_prime = 0;
  if (disc_init >= 0 && A_fl > 0) {
    f_od_prime = (E / (2 * A_fl)) * (sum_init - Math.sqrt(disc_init));
  }
  f_od_prime = Math.max(f_od_prime, 0);

  // ── k_phi per Eq. D2.2.1(2) ──
  // k_phi = 2Et³ / [5.46(b_w + 0.06λ)]
  //       × [1 − (1.11 f'od / (Et²)) × (b_w² λ / (b_w² + λ²))²]
  const kPhiCoeff = (2 * E * t * t * t) / (5.46 * (b_w + 0.06 * lambda));
  const bwLamTerm = (b_w * b_w * lambda) / (b_w * b_w + lambda * lambda);
  let k_phi = kPhiCoeff * (1 - (1.11 * f_od_prime / (E * t * t)) * bwLamTerm * bwLamTerm);

  // Track whether original k_phi was negative
  const k_phi_original_negative = k_phi < 0;

  // "If k_phi is negative, k_phi shall be calculated with f'od = 0"
  if (k_phi < 0) {
    k_phi = kPhiCoeff;  // bracket becomes [1 − 0] = 1
  }

  // ── Final alpha_1 including k_phi per Eq. D1.2.1(14) ──
  // alpha_1_final = alpha_1_init + k_phi / (beta_1 × eta × E)
  const alpha_1_final = alpha_1_init + k_phi / (beta_1 * eta * E);

  // ── Recompute alpha_3 with final alpha_1 ──
  const alpha_3_final = eta * (alpha_1_final * Iy_fl - (eta / beta_1) * Ixy_fl * Ixy_fl * b_f * b_f);

  // ── Final fod from Eq. D1.2.1(13) ──
  const sum_final = alpha_1_final + alpha_2;
  const disc_final = sum_final * sum_final - 4 * alpha_3_final;
  let fod = 0;
  if (disc_final >= 0 && A_fl > 0) {
    fod = (E / (2 * A_fl)) * (sum_final - Math.sqrt(disc_final));
  }
  fod = Math.max(fod, 0);

  // ── Critical half-wavelength per Eq. D2.2.1(1) ──
  const Lcrd = lambda;

  return { fod, Lcrd, k_phi, k_phi_original_negative };
}

// ============================================================
// EFFECTIVE WIDTH METHOD – Cl. 2.2.1.2
// ============================================================

/**
 * Compute effective width of a flat element per AS/NZS 4600:2018 Cl. 2.2.1.2.
 *
 *   lambda = (1.052 / sqrt(k)) * (w / t) * sqrt(f / E)
 *
 *   if lambda <= 0.673:  bEff = w  (fully effective)
 *   if lambda > 0.673:   rho = (1 - 0.22/lambda) / lambda,  bEff = rho * w
 *
 * where:
 *   w = flat width of element (mm)
 *   t = thickness (mm)
 *   f = compressive stress at the element (MPa)
 *   E = elastic modulus (MPa)
 *   k = plate buckling coefficient
 */
function effectiveWidthEWM(
  w: number,
  t: number,
  f: number,
  E: number,
  k: number
): { bEff: number; lambda: number; rho: number } {
  if (w <= 0 || t <= 0 || f <= 0) return { bEff: 0, lambda: 0, rho: 1 };

  const lambda = (1.052 / Math.sqrt(k)) * (w / t) * Math.sqrt(f / E);

  if (lambda <= 0.673) {
    return { bEff: w, lambda, rho: 1.0 };
  }

  const rho = Math.max((1 - 0.22 / lambda) / lambda, 0);
  const bEff = rho * w;
  return { bEff, lambda, rho };
}

/**
 * Compute effective section modulus Ze for a C-channel at an arbitrary
 * compressive stress level f.
 *
 * Uses effective widths per Cl. 2.2.1.2 to build the effective section,
 * then computes the shifted neutral axis and effective Ixe.
 *
 * For bending about the major axis (x-x):
 *  - Top flange + top lip: compression -> may lose effectiveness
 *  - Bottom flange + bottom lip: tension -> fully effective
 *  - Web: stress gradient, effective width distributed per Cl. 2.2.1.2
 *
 * Returns Ze = Ixe / ycf, where ycf is the distance from the shifted
 * neutral axis to the extreme compression fibre.
 */
function computeEffectiveModulusAtStress(
  geo: DSMGeometry,
  mat: DSMMaterial,
  gross: DSMGrossProps,
  f: number
): { Ze: number; Ae: number; Ixe: number } {
  const { d, bf, t, lipLength, r } = geo;
  const { E } = mat;

  const rMid = r + t / 2;
  const cornerLen = (Math.PI / 2) * rMid;

  const flatWeb = Math.max(d - 2 * (r + t), 0);
  const flatFlange = Math.max(bf - 2 * (r + t), 0);
  const flatLip = lipLength > 0 ? Math.max(lipLength - (r + t / 2), 0) : 0;

  const halfD = d / 2;

  // ── Effective widths at stress f ──
  // Top flange (compression, stiffened if lipped)
  const kFlange = flatLip > 0 ? 4.0 : 0.43;
  const flangeEW = effectiveWidthEWM(flatFlange, t, f, E, kFlange);

  // Top lip (compression, unstiffened)
  const kLip = 0.43;
  const lipEW = effectiveWidthEWM(flatLip, t, f, E, kLip);

  // Web (stress gradient, psi = -1 for pure bending, k ~ 23.9)
  const kWeb = 23.9;
  const webEW = effectiveWidthEWM(flatWeb, t, f, E, kWeb);

  // Web effective strip distribution (Cl. 2.2.1.2)
  // For psi = -1 (pure bending):
  //   be1 = bEff / (3 - psi) = bEff / 4  (near max compression)
  //   be2 = bEff - be1 = 3*bEff/4        (near tension)
  const webFullyEffective = webEW.lambda <= 0.673;
  const be1 = webFullyEffective ? flatWeb / 2 : webEW.bEff / 4;
  const be2 = webFullyEffective ? flatWeb / 2 : 3 * webEW.bEff / 4;

  // ── Build effective element table ──
  // y measured from mid-depth, positive = compression side (top)
  const elements: { area: number; y: number; Iself: number }[] = [];

  // Web strip 1 (near compression edge)
  const yWebTop = flatWeb / 2;
  elements.push({
    area: be1 * t,
    y: yWebTop - be1 / 2,
    Iself: t * be1 * be1 * be1 / 12,
  });

  // Web strip 2 (near tension edge)
  elements.push({
    area: be2 * t,
    y: -flatWeb / 2 + be2 / 2,
    Iself: t * be2 * be2 * be2 / 12,
  });

  // Top flange (compression, reduced)
  elements.push({
    area: flangeEW.bEff * t,
    y: halfD - t / 2,
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
      y: halfD - t / 2 - lipEW.bEff / 2,
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

  // Corners (always fully effective)
  const yCornerTop = halfD - rMid / 2;
  elements.push({ area: 2 * cornerLen * t, y: yCornerTop, Iself: 0 });
  elements.push({ area: 2 * cornerLen * t, y: -yCornerTop, Iself: 0 });

  // ── Effective area ──
  const Ae = elements.reduce((s, e) => s + e.area, 0);

  // ── Shifted neutral axis ──
  const yNA = Ae > 0 ? elements.reduce((s, e) => s + e.area * e.y, 0) / Ae : 0;

  // ── Effective Ix about shifted NA ──
  let Ixe = 0;
  elements.forEach((e) => {
    Ixe += e.Iself + e.area * (e.y - yNA) * (e.y - yNA);
  });

  // ── Effective section modulus ──
  const ycf = halfD - yNA;     // NA to extreme compression fibre (top)
  const ytf = halfD + yNA;     // NA to extreme tension fibre (bottom)
  const Sxe_comp = ycf > 0 ? Ixe / ycf : 0;
  const Sxe_tens = ytf > 0 ? Ixe / ytf : Sxe_comp;
  const Ze = Math.min(Sxe_comp, Sxe_tens);

  return { Ze, Ae, Ixe };
}

// ============================================================
// SIGNATURE CURVE GENERATION
// ============================================================

/**
 * Generate a simplified buckling signature curve showing local,
 * distortional, and global buckling stresses vs. half-wavelength.
 */
function generateSignatureCurve(
  geo: DSMGeometry,
  mat: DSMMaterial,
  gross: DSMGrossProps
): DSMSignatureCurvePoint[] {
  const { d, bf, t, lipLength, r } = geo;
  const { E, nu, G } = mat;

  const pi2 = Math.PI * Math.PI;
  const D = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));
  const flatWeb = Math.max(d - 2 * (r + t), 1);
  const flatFlange = Math.max(bf - 2 * (r + t), 1);
  const flatLip = lipLength > 0 ? Math.max(lipLength - (r + t / 2), 0) : 0;

  const kFlange = flatLip > 0 ? 4.0 : 0.43;
  const kWeb = 23.9;

  const { fod: fcrDist_min, Lcrd: Lcr_dist } = computeDistortionalBucklingBending(geo, mat);

  // Polar radius of gyration squared
  const r0sq = (gross.Ix + gross.Iy) / (gross.Ag || 1) + (gross.xc || 0) ** 2;
  const Ag = gross.Ag || 1;

  const points: DSMSignatureCurvePoint[] = [];
  const nPts = 80;
  const logMin = Math.log10(Math.max(t * 2, 5));
  const logMax = Math.log10(50000);

  for (let i = 0; i < nPts; i++) {
    const L = Math.pow(10, logMin + (i / (nPts - 1)) * (logMax - logMin));

    // ── Local buckling (multi-wave plate buckling) ──
    let fcr_local_flange = Infinity;
    for (let m = 1; m <= Math.max(1, Math.ceil(L / flatFlange) + 2); m++) {
      const ratio = m * flatFlange / L;
      const stress = kFlange * pi2 * D / (flatFlange * flatFlange * t) *
        Math.pow(ratio + 1 / ratio, 2) / 4;
      if (stress < fcr_local_flange) fcr_local_flange = stress;
    }
    let fcr_local_web = Infinity;
    for (let m = 1; m <= Math.max(1, Math.ceil(L / flatWeb) + 2); m++) {
      const ratio = m * flatWeb / L;
      const stress = kWeb * pi2 * D / (flatWeb * flatWeb * t) *
        Math.pow(ratio + 1 / ratio, 2) / 4;
      if (stress < fcr_local_web) fcr_local_web = stress;
    }
    const fcr_local = Math.min(fcr_local_flange, fcr_local_web);

    // ── Distortional buckling (spring-column model) ──
    let fcr_dist = Infinity;
    if (Lcr_dist > 0 && fcrDist_min > 0) {
      const logRatio = Math.log(L / Lcr_dist);
      const alpha_d = 0.9;
      fcr_dist = fcrDist_min * Math.cosh(alpha_d * logRatio);
    }

    // ── Global buckling (flexural-torsional) ──
    const foy = pi2 * E * gross.Iy / (Ag * L * L);
    const foz = r0sq > 0
      ? (G * gross.J + pi2 * E * gross.Cw / (L * L)) / (Ag * r0sq)
      : Infinity;
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
// SHEAR CAPACITY – Cl. 3.3.4 (AS/NZS 4600:2018)
// ============================================================
// Equations implemented EXACTLY from Cl. 3.3.4.1 – Shear capacity
// of webs without holes.
//
// Notation mapping (image → code):
//   d1 = depth of flat portion of web = d - 2(r + t)
//   tw = thickness of web = t
//   kv = shear buckling coefficient
//   Vv = nominal shear capacity of the web
//   phi_v = capacity reduction factor for shear (Table 1.6.3)
//
// Eq. 3.3.4(1): For d1/tw <= sqrt(E*kv/fy):
//               Vv = 0.64 * fy * d1 * tw
//
// Eq. 3.3.4(2): For sqrt(E*kv/fy) < d1/tw <= 1.415*sqrt(E*kv/fy):
//               Vv = 0.64 * tw^2 * sqrt(E*kv*fy)
//
// Eq. 3.3.4(3): For d1/tw > 1.415*sqrt(E*kv/fy):
//               Vv = 0.905 * E * kv * tw^3 / d1
//
// kv:
//   (i)  Unstiffened webs: kv = 5.34
//   (ii) Stiffened webs (Cl. 2.7):
//        Eq. 3.3.4(4): a/d1 <= 1.0  →  kv = 4.00 + 5.34/(a/d1)^2
//        Eq. 3.3.4(5): a/d1 > 1.0   →  kv = 5.34 + 4.00/(a/d1)^2
//
// ============================================================

/**
 * Compute nominal shear capacity Vv per AS/NZS 4600:2018 Cl. 3.3.4.1.
 *
 * Steps:
 *   1. d1 = flat web depth = d - 2(r + t)
 *   2. tw = t (web thickness)
 *   3. Determine kv (shear buckling coefficient)
 *   4. Compute slenderness threshold sqrt(E*kv/fy)
 *   5. Compare d1/tw to thresholds and apply Eq. 3.3.4(1)/(2)/(3)
 *   6. phi_v * Vv for design capacity
 *
 * All internal calculations are in N, mm, MPa.
 * Final results converted to kN for output.
 */
export function performShearDesign(
  geo: DSMGeometry,
  fy: number,
  E: number = 200000,
  nu: number = 0.3,
  shearParams?: DSMShearParams
): DSMShearResult {
  const steps: DSMCalcStep[] = [];
  const phi_v = 0.90; // AS/NZS 4600:2018 Table 1.6.3

  const { d, t, r } = geo;

  // ── Notation per Cl. 3.3.4 ──
  const d1 = Math.max(d - 2 * (r + t), 0);   // flat web depth (mm)
  const tw = t;                                 // web thickness (mm)
  const hw = d1;                                // alias for interface compatibility
  const Av = d1 * tw;                           // web shear area (mm²)

  steps.push({
    clause: 'Cl. 3.3.4',
    title: 'Web Dimensions',
    equations: [
      'd1 = d - 2(r + t)  -- depth of flat portion of web',
      'tw = t  -- thickness of web',
      'Av = d1 x tw  -- web shear area',
    ],
    values: [
      { label: 'd (overall depth)', value: d.toFixed(1), unit: 'mm' },
      { label: 'r (inside bend radius)', value: r.toFixed(1), unit: 'mm' },
      { label: 't (thickness)', value: t.toFixed(2), unit: 'mm' },
      { label: 'd1 (flat web depth)', value: d1.toFixed(2), unit: 'mm' },
      { label: 'tw (web thickness)', value: tw.toFixed(2), unit: 'mm' },
      { label: 'd1/tw (web slenderness)', value: (d1 / tw).toFixed(2), unit: '' },
      { label: 'Av (web shear area)', value: Av.toFixed(1), unit: 'mm²' },
    ],
  });

  // ── Step 2: Shear buckling coefficient kv ──
  // (i)  Unstiffened webs: kv = 5.34
  // (ii) Stiffened webs per Cl. 2.7:
  //      Eq. 3.3.4(4): a/d1 <= 1.0  →  kv = 4.00 + 5.34/(a/d1)^2
  //      Eq. 3.3.4(5): a/d1 > 1.0   →  kv = 5.34 + 4.00/(a/d1)^2
  let kv: number;
  let kvNote: string;

  if (shearParams?.hasStiffeners && shearParams.stiffenerSpacing > 0) {
    // Stiffened web – stiffener spacing = a
    const a = shearParams.stiffenerSpacing;
    const aspectRatio = a / d1;
    if (aspectRatio <= 1.0) {
      // Eq. 3.3.4(4)
      kv = 4.00 + 5.34 / (aspectRatio * aspectRatio);
      kvNote = `Stiffened web: a/d1 = ${aspectRatio.toFixed(3)} <= 1.0 --> Eq. 3.3.4(4): kv = 4.00 + 5.34/(a/d1)^2`;
    } else {
      // Eq. 3.3.4(5)
      kv = 5.34 + 4.00 / (aspectRatio * aspectRatio);
      kvNote = `Stiffened web: a/d1 = ${aspectRatio.toFixed(3)} > 1.0 --> Eq. 3.3.4(5): kv = 5.34 + 4.00/(a/d1)^2`;
    }

    steps.push({
      clause: 'Cl. 3.3.4',
      title: 'Shear Buckling Coefficient (kv) - Stiffened Web',
      equations: [
        'For beam webs with transverse stiffeners (Cl. 2.7):',
        'Eq. 3.3.4(4): a/d1 <= 1.0:  kv = 4.00 + 5.34/(a/d1)^2',
        'Eq. 3.3.4(5): a/d1 > 1.0:   kv = 5.34 + 4.00/(a/d1)^2',
        `--> ${kvNote}`,
      ],
      values: [
        { label: 'a (stiffener spacing)', value: a.toFixed(0), unit: 'mm' },
        { label: 'd1 (flat web depth)', value: d1.toFixed(2), unit: 'mm' },
        { label: 'a/d1 (aspect ratio)', value: (a / d1).toFixed(3), unit: '' },
        { label: 'kv', value: kv.toFixed(3), unit: '' },
      ],
    });
  } else {
    // Unstiffened web
    kv = 5.34;
    kvNote = 'Unstiffened web: kv = 5.34';

    // If a finite shear panel length is specified for an unstiffened web
    if (shearParams?.a && shearParams.a > 0) {
      const a = shearParams.a;
      const aspectRatio = a / d1;
      if (aspectRatio <= 1.0) {
        kv = 4.00 + 5.34 / (aspectRatio * aspectRatio);
      } else {
        kv = 5.34 + 4.00 / (aspectRatio * aspectRatio);
      }
      kvNote = `Unstiffened web, panel length a = ${a.toFixed(0)} mm, a/d1 = ${aspectRatio.toFixed(3)} --> kv = ${kv.toFixed(3)}`;
    }

    steps.push({
      clause: 'Cl. 3.3.4',
      title: 'Shear Buckling Coefficient (kv)',
      equations: [
        '(i)  Unstiffened webs: kv = 5.34',
        '(ii) With panel length a:',
        '     Eq. 3.3.4(4): a/d1 <= 1.0: kv = 4.00 + 5.34/(a/d1)^2',
        '     Eq. 3.3.4(5): a/d1 > 1.0:  kv = 5.34 + 4.00/(a/d1)^2',
        `--> ${kvNote}`,
      ],
      values: [
        { label: 'kv', value: kv.toFixed(3), unit: '' },
        ...(shearParams?.a ? [{ label: 'a (panel length)', value: shearParams.a.toFixed(0), unit: 'mm' }] : []),
      ],
    });
  }

  // ── Step 3: Slenderness thresholds per Cl. 3.3.4.1 ──
  const slenderness = d1 / tw;                           // d1/tw
  const threshold1 = Math.sqrt((E * kv) / fy);           // sqrt(E*kv/fy)
  const threshold2 = 1.415 * threshold1;                  // 1.415*sqrt(E*kv/fy)

  steps.push({
    clause: 'Cl. 3.3.4(1)-(3)',
    title: 'Slenderness Thresholds',
    equations: [
      'Threshold 1:  sqrt(E*kv/fy)',
      'Threshold 2:  1.415 * sqrt(E*kv/fy)',
      'd1/tw compared to thresholds to determine shear regime',
    ],
    values: [
      { label: 'E', value: E.toFixed(0), unit: 'MPa' },
      { label: 'kv', value: kv.toFixed(3), unit: '' },
      { label: 'fy', value: fy.toFixed(1), unit: 'MPa' },
      { label: 'E*kv/fy', value: ((E * kv) / fy).toFixed(2), unit: '' },
      { label: 'sqrt(E*kv/fy)', value: threshold1.toFixed(2), unit: '' },
      { label: '1.415*sqrt(E*kv/fy)', value: threshold2.toFixed(2), unit: '' },
      { label: 'd1/tw', value: slenderness.toFixed(2), unit: '' },
    ],
  });

  // ── Step 4: Nominal shear capacity Vv per Cl. 3.3.4.1 ──
  // Results computed in N, then converted to kN
  let Vv_N: number;          // Nominal shear capacity in N
  let shearMode: DSMShearMode;
  let VvNote: string;
  let govEqn: string;

  if (slenderness <= threshold1) {
    // Eq. 3.3.4(1): Vv = 0.64 * fy * d1 * tw
    Vv_N = 0.64 * fy * d1 * tw;
    shearMode = 'Eq.3.3.4(1)';
    govEqn = 'Eq. 3.3.4(1)';
    VvNote = `d1/tw = ${slenderness.toFixed(2)} <= sqrt(E*kv/fy) = ${threshold1.toFixed(2)} --> Eq. 3.3.4(1)`;
  } else if (slenderness <= threshold2) {
    // Eq. 3.3.4(2): Vv = 0.64 * tw^2 * sqrt(E*kv*fy)
    Vv_N = 0.64 * tw * tw * Math.sqrt(E * kv * fy);
    shearMode = 'Eq.3.3.4(2)';
    govEqn = 'Eq. 3.3.4(2)';
    VvNote = `sqrt(E*kv/fy) = ${threshold1.toFixed(2)} < d1/tw = ${slenderness.toFixed(2)} <= 1.415*sqrt(E*kv/fy) = ${threshold2.toFixed(2)} --> Eq. 3.3.4(2)`;
  } else {
    // Eq. 3.3.4(3): Vv = 0.905 * E * kv * tw^3 / d1
    Vv_N = 0.905 * E * kv * tw * tw * tw / d1;
    shearMode = 'Eq.3.3.4(3)';
    govEqn = 'Eq. 3.3.4(3)';
    VvNote = `d1/tw = ${slenderness.toFixed(2)} > 1.415*sqrt(E*kv/fy) = ${threshold2.toFixed(2)} --> Eq. 3.3.4(3)`;
  }

  const Vn = Vv_N / 1e3;     // kN – nominal shear capacity

  steps.push({
    clause: 'Cl. 3.3.4(1)-(3)',
    title: `Nominal Shear Capacity (Vv) - ${govEqn}`,
    equations: [
      'Eq. 3.3.4(1): d1/tw <= sqrt(E*kv/fy):            Vv = 0.64*fy*d1*tw          (yielding)',
      'Eq. 3.3.4(2): sqrt(E*kv/fy) < d1/tw <= 1.415*:   Vv = 0.64*tw^2*sqrt(E*kv*fy) (inelastic)',
      'Eq. 3.3.4(3): d1/tw > 1.415*sqrt(E*kv/fy):       Vv = 0.905*E*kv*tw^3/d1     (elastic)',
      `--> ${VvNote}`,
    ],
    values: [
      { label: 'd1/tw', value: slenderness.toFixed(2), unit: '' },
      { label: 'sqrt(E*kv/fy)', value: threshold1.toFixed(2), unit: '' },
      { label: '1.415*sqrt(E*kv/fy)', value: threshold2.toFixed(2), unit: '' },
      { label: `Vv (${govEqn})`, value: Vv_N.toFixed(1), unit: 'N' },
      { label: 'Vv', value: Vn.toFixed(3), unit: 'kN' },
      { label: 'Failure mode', value: shearMode, unit: '' },
    ],
  });

  // ── Step 5: Numerical substitution detail ──
  let substitution: string;
  if (shearMode === 'Eq.3.3.4(1)') {
    substitution =
      `Vv = 0.64 x ${fy.toFixed(1)} x ${d1.toFixed(2)} x ${tw.toFixed(2)} = ${Vv_N.toFixed(1)} N = ${Vn.toFixed(3)} kN`;
  } else if (shearMode === 'Eq.3.3.4(2)') {
    substitution =
      `Vv = 0.64 x ${tw.toFixed(2)}^2 x sqrt(${E.toFixed(0)} x ${kv.toFixed(3)} x ${fy.toFixed(1)}) = ${Vv_N.toFixed(1)} N = ${Vn.toFixed(3)} kN`;
  } else {
    substitution =
      `Vv = 0.905 x ${E.toFixed(0)} x ${kv.toFixed(3)} x ${tw.toFixed(2)}^3 / ${d1.toFixed(2)} = ${Vv_N.toFixed(1)} N = ${Vn.toFixed(3)} kN`;
  }

  steps.push({
    clause: govEqn,
    title: 'Numerical Substitution',
    equations: [
      substitution,
    ],
    values: [
      { label: 'Vv', value: Vv_N.toFixed(1), unit: 'N' },
      { label: 'Vv', value: Vn.toFixed(3), unit: 'kN' },
    ],
  });

  // ── Step 6: Design shear capacity ──
  const phiVn = phi_v * Vn;

  steps.push({
    clause: 'Cl. 3.3.4',
    title: 'Design Shear Capacity (phi_v * Vv)',
    equations: [
      'V* <= phi_v * Vv',
      'phi_v = 0.90  (AS/NZS 4600:2018, Table 1.6.3)',
      `phi_v * Vv = ${phi_v.toFixed(2)} x ${Vn.toFixed(3)} = ${phiVn.toFixed(3)} kN`,
    ],
    values: [
      { label: 'Vv (nominal)', value: Vn.toFixed(3), unit: 'kN' },
      { label: 'phi_v', value: phi_v.toFixed(2), unit: '' },
      { label: 'phi_v*Vv (design)', value: phiVn.toFixed(3), unit: 'kN' },
    ],
  });

  // ── Step 7: Summary ──
  steps.push({
    clause: 'Cl. 3.3.4',
    title: 'Shear Design Summary',
    equations: [
      `Controlling equation: ${govEqn}`,
      `Controlling failure mode: ${shearMode}`,
    ],
    values: [
      { label: 'd1/tw (web slenderness)', value: slenderness.toFixed(2), unit: '' },
      { label: 'Nominal shear Vv', value: Vn.toFixed(3), unit: 'kN' },
      { label: 'Design shear phi_v*Vv', value: phiVn.toFixed(3), unit: 'kN' },
      { label: 'Controlling mode', value: shearMode, unit: '' },
      { label: 'Governing equation', value: govEqn, unit: '' },
    ],
  });

  // ── Derived reference values for UI compatibility ──
  // These are computed for display purposes only; the governing
  // capacity Vv is determined solely from Eqs. 3.3.4(1)-(3).
  const fvy = fy / Math.sqrt(3);                                       // reference shear yield stress
  const Vy = (0.64 * fy * d1 * tw) / 1e3;                              // Eq. 3.3.4(1) value in kN
  const tau_cr = 0.905 * E * kv * tw * tw / (d1 * d1);                 // reverse-derived from Eq. 3.3.4(3)
  const Vcr = (0.905 * E * kv * tw * tw * tw / d1) / 1e3;              // Eq. 3.3.4(3) value in kN
  const lambda_v = d1 > 0 ? slenderness / threshold1 : 0;              // normalised slenderness d1/tw / sqrt(Ekv/fy)

  return {
    hw, Av, fvy, kv, tau_cr,
    Vy, Vcr, lambda_v: isFinite(lambda_v) ? lambda_v : 999,
    Vn, phiVn, phi_v, shearMode, steps,
  };
}

// ============================================================
// MAIN BENDING DESIGN – Cl. 3.3 (EWM) + Cl. D2.1.1
// ============================================================

/**
 * Perform full bending capacity calculation for a single C-section
 * using the Effective Width Method (EWM) per AS/NZS 4600:2018 Section 3.3.
 *
 * EWM Design Flow:
 *   Step 1: Gross section properties (Cl. 2.1)
 *   Step 2: Effective section properties at fy (Cl. 2.2.1.2)
 *   Step 3: Section moment capacity Ms = Ze × fy (Cl. 3.3.2.2)
 *   Step 4: Elastic buckling analysis — Mo, Mod (Cl. D2.1.1)
 *   Step 5: Lateral-torsional buckling Mb (Cl. 3.3.3.2.1)
 *   Step 6: Distortional buckling Mb (Cl. 3.3.3.3(a))
 *   Step 7: Governing Mn = min(Ms, Mb_ltb, Mb_dist) (Cl. 3.3.3.1)
 *
 * Returns complete results including step-by-step calculation details,
 * elastic buckling values, capacities, and the governing mode.
 */
export function performDSMDesign(
  geo: DSMGeometry,
  memberInput: DSMMember,
  fy: number,
  E: number = 200000,
  nu: number = 0.3,
  shearParams?: DSMShearParams
): DSMDesignResult {
  const steps: DSMCalcStep[] = [];

  // ── Step 0: Material ──
  const mat = createDSMMaterial(fy, E, nu);

  steps.push({
    clause: 'Cl. 1.5',
    title: 'Material Properties',
    equations: [
      'G = E / [2(1 + ν)]',
    ],
    values: [
      { label: 'Yield stress (fy)', value: fy.toFixed(1), unit: 'MPa' },
      { label: 'Elastic modulus (E)', value: E.toFixed(0), unit: 'MPa' },
      { label: "Poisson's ratio (ν)", value: nu.toFixed(2), unit: '' },
      { label: 'Shear modulus (G)', value: mat.G.toFixed(1), unit: 'MPa' },
    ],
  });

  // ── Step 1: Gross Section Properties ──
  const gross = computeDSMGrossProps(geo, mat);

  steps.push({
    clause: 'Cl. 2.1',
    title: 'Gross Section Properties (Centre-Line Model)',
    equations: [
      'Ag = Σ(bᵢ × t)  — total gross area',
      'Ix = Σ(Iself + A×dy²)  — parallel-axis theorem',
      'Sx = Ix / (d/2)',
      'J = (1/3) × Σ(bᵢ × t³)',
      'Cw ≈ (h²b²t/12) × (3b + 2lip)/(6b + lip)  [lipped C]',
    ],
    values: [
      { label: 'Gross area (Ag)', value: gross.Ag.toFixed(1), unit: 'mm²' },
      { label: 'Ix (major axis)', value: gross.Ix.toFixed(0), unit: 'mm⁴' },
      { label: 'Iy (minor axis)', value: gross.Iy.toFixed(0), unit: 'mm⁴' },
      { label: 'Section modulus (Sx)', value: gross.Sx.toFixed(1), unit: 'mm³' },
      { label: 'rx', value: gross.rx.toFixed(2), unit: 'mm' },
      { label: 'ry', value: gross.ry.toFixed(2), unit: 'mm' },
      { label: 'J (torsion constant)', value: gross.J.toFixed(1), unit: 'mm⁴' },
      { label: 'Cw (warping constant)', value: gross.Cw.toExponential(3), unit: 'mm⁶' },
      { label: 'xc (centroid from web)', value: gross.xc.toFixed(2), unit: 'mm' },
    ],
  });

  // ── Step 2: Effective Section Properties at fy (Cl. 2.2.1.2) ──
  const effAtFy = computeEffectiveModulusAtStress(geo, mat, gross, fy);
  const Ze_fy = effAtFy.Ze;
  const Zf = gross.Sx; // full unreduced section modulus (Zf)

  steps.push({
    clause: 'Cl. 2.2.1.2',
    title: 'Effective Section Properties at f = fy',
    equations: [
      'lambda = (1.052 / sqrt(k)) × (w/t) × sqrt(f/E)',
      'lambda <= 0.673: b_eff = w  (fully effective)',
      'lambda > 0.673:  rho = (1 − 0.22/lambda) / lambda,  b_eff = rho × w',
      'Ze = Ixe / y_cf  (effective section modulus)',
    ],
    values: [
      { label: 'Stress level (f)', value: fy.toFixed(1), unit: 'MPa' },
      { label: 'Effective area (Ae)', value: effAtFy.Ae.toFixed(1), unit: 'mm²' },
      { label: 'Effective Ix (Ixe)', value: effAtFy.Ixe.toFixed(0), unit: 'mm⁴' },
      { label: 'Ze (effective modulus at fy)', value: Ze_fy.toFixed(1), unit: 'mm³' },
      { label: 'Zf (full section modulus)', value: Zf.toFixed(1), unit: 'mm³' },
      { label: 'Ze/Zf ratio', value: (Zf > 0 ? Ze_fy / Zf : 0).toFixed(4), unit: '' },
    ],
  });

  // ── Step 3: Section Moment Capacity Ms (Cl. 3.3.2.2) ──
  // Ms = Ze × fy   ... Eq. 3.3.2.2
  // where Ze = effective section modulus at extreme fibre at fy
  const Ms = (Ze_fy * fy) / 1e6; // kN·m

  steps.push({
    clause: 'Cl. 3.3.2.2',
    title: 'Nominal Section Moment Capacity (Ms)',
    equations: [
      'Ms = Ze × fy   ... Eq. 3.3.2.2',
      'where Ze = effective section modulus at extreme fibre at fy',
    ],
    values: [
      { label: 'Ze', value: Ze_fy.toFixed(1), unit: 'mm³' },
      { label: 'fy', value: fy.toFixed(1), unit: 'MPa' },
      { label: 'Ms', value: Ms.toFixed(3), unit: 'kN·m' },
    ],
  });

  // ── Step 4: Elastic Buckling Analysis ──
  const fol = computeLocalBucklingStress(geo, mat);
  const { fod, Lcrd, k_phi, k_phi_original_negative } = computeDistortionalBucklingBending(geo, mat);
  const MoNmm = computeMo(mat, gross, memberInput);

  const My = (Zf * fy) / 1e6;                                          // kN·m — Eq. 3.3.3.2.1(7)
  const Mol = (Zf * fol) / 1e6;                                        // kN·m (signature curve reference)
  const Mod = fod > 0 ? (Zf * fod) / 1e6 : 0;                         // kN·m — Eq. 3.3.3.3(9)
  const Mo = isFinite(MoNmm) ? MoNmm / 1e6 : Infinity;               // kN·m

  const Ke = effectiveLengthFactor(memberInput.endCondition);
  const Le = Ke * memberInput.Lb;

  steps.push({
    clause: 'Cl. D2.1.1 / D2.2.1 / Cl. 3.3.3',
    title: 'Elastic Buckling Analysis',
    equations: [
      'My = Zf × fy   ... Eq. 3.3.3.2.1(7)',
      'Mo = Cb × sqrt[(pi²EIy/Le²)(GJ + pi²ECw/Le²)]   ... Eq. D2.1.1(1)',
      'fod per D1.2.1(13) with D2.2.1(1)-(3) modifications for bending',
      'Mod = Zf × fod   ... Eq. 3.3.3.3(9)',
      'lambda = 4.80 × (Ix_fl × bf² × bw / (2t³))^0.25   ... Eq. D2.2.1(1)',
      'k_phi = 2Et³/[5.46(bw+0.06λ)] × [1 − 1.11f\'od/(Et²) × (bw²λ/(bw²+λ²))²]   ... Eq. D2.2.1(2)',
      'Le = Ke × Lb',
    ],
    values: [
      { label: 'Zf (full section modulus)', value: Zf.toFixed(1), unit: 'mm³' },
      { label: 'Ke (effective length factor)', value: Ke.toFixed(2), unit: '' },
      { label: 'Le (effective length)', value: Le.toFixed(0), unit: 'mm' },
      { label: 'My (yield moment)', value: My.toFixed(3), unit: 'kN·m' },
      { label: 'Mo (elastic LTB moment)', value: isFinite(Mo) ? Mo.toFixed(3) : '∞ (fully braced)', unit: 'kN·m' },
      { label: 'fol (local buckling stress)', value: fol.toFixed(2), unit: 'MPa' },
      { label: 'fod (distortional, D2.2.1)', value: fod > 0 ? fod.toFixed(2) : 'N/A (unlipped)', unit: 'MPa' },
      { label: 'Mod (distortional moment)', value: Mod > 0 ? Mod.toFixed(3) : 'N/A', unit: 'kN·m' },
      { label: 'Lcrd (D2.2.1(1))', value: Lcrd > 0 ? Lcrd.toFixed(1) : 'N/A', unit: 'mm' },
      { label: 'k_phi (D2.2.1(2))', value: fod > 0 ? k_phi.toFixed(2) : 'N/A', unit: 'N/mm' },
      { label: 'k_phi < 0 (original)?', value: k_phi_original_negative ? 'Yes — recalc with f\'od=0' : 'No — web restrains flange', unit: '' },
    ],
  });

  // ── Step 5: Lateral-Torsional Buckling — Cl. 3.3.3.2.1 (Open Section Members) ──
  const phi_b = 0.90; // AS/NZS 4600:2018 capacity reduction factor (Table 1.6.3)

  // lambda_b = sqrt(My / Mo)   ... Eq. 3.3.3.2.1(6)
  const lambda_b = isFinite(Mo) && Mo > 0 ? Math.sqrt(My / Mo) : 0;

  // Critical moment Mc per Eqs. 3.3.3.2.1(3)-(5)
  let Mc_ltb: number;
  let ltbNote: string;

  if (lambda_b <= 0.60) {
    // Eq. 3.3.3.2.1(3): Mc = My
    Mc_ltb = My;
    ltbNote = `lambda_b = ${lambda_b.toFixed(4)} <= 0.60 → Mc = My  [Eq. 3.3.3.2.1(3)]`;
  } else if (lambda_b < 1.336) {
    // Eq. 3.3.3.2.1(4): Mc = 1.11 × My × [1 − (10 × lambda_b² / 36)]
    Mc_ltb = 1.11 * My * (1 - (10 * lambda_b * lambda_b) / 36);
    ltbNote = `0.60 < lambda_b = ${lambda_b.toFixed(4)} < 1.336 → Mc = 1.11My[1 − 10λb²/36]  [Eq. 3.3.3.2.1(4)]`;
  } else {
    // Eq. 3.3.3.2.1(5): Mc = My × (1 / lambda_b²)
    Mc_ltb = My * (1 / (lambda_b * lambda_b));
    ltbNote = `lambda_b = ${lambda_b.toFixed(4)} >= 1.336 → Mc = My/λb²  [Eq. 3.3.3.2.1(5)]`;
  }
  Mc_ltb = Math.max(Mc_ltb, 0);

  // fc = Mc / Zf   ... Eq. 3.3.3.2.1(2)
  const fc_ltb = Zf > 0 ? (Mc_ltb * 1e6) / Zf : 0; // MPa

  // Zc = effective section modulus at stress fc
  // Mb = Zc × fc   ... Eq. 3.3.3.2.1(1)
  let Zc_ltb: number;
  let Mb_ltb: number;

  if (fc_ltb >= fy) {
    // fc >= fy: no LTB reduction, Zc = Ze(fy)
    Zc_ltb = Ze_fy;
    Mb_ltb = Ms; // = Ze(fy) × fy
  } else if (fc_ltb > 0) {
    // fc < fy: section more effective at reduced stress
    const effAtFc = computeEffectiveModulusAtStress(geo, mat, gross, fc_ltb);
    Zc_ltb = effAtFc.Ze;
    Mb_ltb = (Zc_ltb * fc_ltb) / 1e6; // kN·m
  } else {
    Zc_ltb = Ze_fy;
    Mb_ltb = 0;
  }

  steps.push({
    clause: 'Cl. 3.3.3.2.1',
    title: 'Lateral-Torsional Buckling (Open Section) — Mb',
    equations: [
      'lambda_b = sqrt(My / Mo)   ... Eq. 3.3.3.2.1(6)',
      'For lambda_b <= 0.60:        Mc = My                            ... Eq. 3.3.3.2.1(3)',
      'For 0.60 < lambda_b < 1.336: Mc = 1.11My[1 − 10λb²/36]        ... Eq. 3.3.3.2.1(4)',
      'For lambda_b >= 1.336:       Mc = My/λb²                       ... Eq. 3.3.3.2.1(5)',
      'fc = Mc / Zf   ... Eq. 3.3.3.2.1(2)',
      'Mb = Zc × fc   ... Eq. 3.3.3.2.1(1)',
      `→ ${ltbNote}`,
    ],
    values: [
      { label: 'My', value: My.toFixed(3), unit: 'kN·m' },
      { label: 'Mo', value: isFinite(Mo) ? Mo.toFixed(3) : '∞', unit: 'kN·m' },
      { label: 'lambda_b', value: lambda_b.toFixed(4), unit: '' },
      { label: 'Mc (critical moment)', value: Mc_ltb.toFixed(3), unit: 'kN·m' },
      { label: 'Zf (full section modulus)', value: Zf.toFixed(1), unit: 'mm³' },
      { label: 'fc (critical stress)', value: fc_ltb.toFixed(2), unit: 'MPa' },
      { label: 'Zc (effective modulus at fc)', value: Zc_ltb.toFixed(1), unit: 'mm³' },
      { label: 'Mb,ltb', value: Mb_ltb.toFixed(3), unit: 'kN·m' },
    ],
  });

  // ── Step 6: Distortional Buckling — Cl. 3.3.3.3(a) ──
  // Applies to C-sections: rotation of flange and lip about flange/web junction.
  let Mb_dist: number;
  let lambda_d: number;
  let distNote: string;

  if (fod <= 0 || Mod <= 0) {
    Mb_dist = 0;
    lambda_d = 0;
    distNote = 'No distortional mode (unlipped section) → Mb,dist excluded';
  } else {
    // lambda_d = sqrt(My / Mod)   ... Eq. 3.3.3.3(8)
    lambda_d = Math.sqrt(My / Mod);

    let Mc_dist: number;
    if (lambda_d <= 0.674) {
      // Eq. 3.3.3.3(3): Mc = My
      Mc_dist = My;
      distNote = `lambda_d = ${lambda_d.toFixed(4)} <= 0.674 → Mc = My  [Eq. 3.3.3.3(3)]`;
    } else {
      // Eq. 3.3.3.3(4): Mc = (My / lambda_d) × (1 − 0.22 / lambda_d)
      Mc_dist = (My / lambda_d) * (1 - 0.22 / lambda_d);
      distNote = `lambda_d = ${lambda_d.toFixed(4)} > 0.674 → Mc = (My/λd)(1 − 0.22/λd)  [Eq. 3.3.3.3(4)]`;
    }
    Mc_dist = Math.max(Mc_dist, 0);

    // Cl. 3.3.3.3(a): Zc = Zf when k_phi >= 0 (web provides positive
    // rotational restraint to the compression flange-lip assembly).
    // k_phi is computed per Eq. D2.2.1(2) inside computeDistortionalBucklingBending.
    //
    // If k_phi was originally negative, the function already reset it with
    // f'od = 0 per Appendix D instruction. The sign of the ORIGINAL k_phi
    // determines whether Zc = Zf (positive) or a reduced value (negative).
    //
    // For standard C-sections, k_phi >= 0 → Zc = Zf → Mb = Mc.
    // If k_phi_original_negative, a reduced Zc should apply per Cl. 3.3.3.3(b),
    // but that clause is not visible in the provided images. Result is conservative
    // (using Zc = Zf overpredicts Mb,dist only when k_phi < 0, which is uncommon).

    const Zc_dist = Zf; // Zc = Zf for k_phi >= 0 (Cl. 3.3.3.3(a))
    Mb_dist = Mc_dist;  // Mb = Zc × fc = Zf × (Mc/Zf) = Mc
  }

  steps.push({
    clause: 'Cl. 3.3.3.3(a)',
    title: 'Distortional Buckling (C-Section) — Mb',
    equations: [
      'Mb = Zc × fc   ... Eq. 3.3.3.3(1)',
      'fc = Mc / Zf   ... Eq. 3.3.3.3(2)',
      'lambda_d = sqrt(My / Mod)   ... Eq. 3.3.3.3(8)',
      'Mod = Zf × fod   ... Eq. 3.3.3.3(9)',
      'fod per Eq. D1.2.1(13) with D2.2.1(1)-(3) modifications for bending',
      'For lambda_d <= 0.674:  Mc = My                       ... Eq. 3.3.3.3(3)',
      'For lambda_d > 0.674:   Mc = (My/λd)(1 − 0.22/λd)    ... Eq. 3.3.3.3(4)',
      `Zc = Zf  (k_phi = ${fod > 0 ? k_phi.toFixed(2) : 'N/A'} >= 0 per D2.2.1(2))`,
      `→ ${distNote}`,
    ],
    values: [
      { label: 'fod (D2.2.1 analytical)', value: fod > 0 ? fod.toFixed(2) : 'N/A', unit: 'MPa' },
      { label: 'Mod', value: Mod > 0 ? Mod.toFixed(3) : 'N/A', unit: 'kN·m' },
      { label: 'My', value: My.toFixed(3), unit: 'kN·m' },
      { label: 'lambda_d', value: lambda_d > 0 ? lambda_d.toFixed(4) : 'N/A', unit: '' },
      { label: 'k_phi (D2.2.1(2))', value: fod > 0 ? k_phi.toFixed(2) : 'N/A', unit: 'N/mm' },
      { label: 'k_phi originally negative?', value: k_phi_original_negative ? 'Yes' : 'No', unit: '' },
      { label: 'Zc', value: Zf.toFixed(1), unit: 'mm³' },
      { label: 'Mb,dist', value: Mb_dist > 0 ? Mb_dist.toFixed(3) : 'N/A (unlipped)', unit: 'kN·m' },
    ],
  });

  // ── Step 7: Governing Nominal Moment — Cl. 3.3.1 + Cl. 3.3.3.1 ──
  // Per Cl. 3.3.1:   M* <= phi_b × Ms  AND  M* <= phi_b × Mb
  // Per Cl. 3.3.3.1: Mb = lesser of Ms AND values from Cl. 3.3.3.2 and 3.3.3.3
  // Therefore governing Mn = min(Ms, Mb_ltb, Mb_dist)

  let Mn: number;
  let governingMode: DSMBucklingMode;

  const candidates: { value: number; mode: DSMBucklingMode }[] = [
    { value: Ms, mode: 'local' },                // Ms captures local buckling via EWM
    { value: Mb_ltb, mode: 'lateral-torsional' },
  ];
  if (Mb_dist > 0) {
    candidates.push({ value: Mb_dist, mode: 'distortional' });
  }

  const validCandidates = candidates.filter(c => c.value > 0);
  if (validCandidates.length > 0) {
    const governing = validCandidates.reduce((min, c) => c.value < min.value ? c : min);
    Mn = governing.value;
    governingMode = governing.mode;
  } else {
    Mn = Ms;
    governingMode = 'local';
  }

  const phiMn = phi_b * Mn;

  steps.push({
    clause: 'Cl. 3.3.1 / 3.3.3.1',
    title: 'Governing Nominal Moment Capacity',
    equations: [
      'M* <= phi_b × Ms   ... Eq. 3.3.1(1)',
      'M* <= phi_b × Mb   ... Eq. 3.3.1(2)',
      'Mb = min(Ms, Mb_ltb, Mb_dist)   ... Cl. 3.3.3.1',
      'phi_b = 0.90  (AS/NZS 4600:2018, Table 1.6.3)',
    ],
    values: [
      { label: 'Ms (section capacity, Cl.3.3.2.2)', value: Ms.toFixed(3), unit: 'kN·m' },
      { label: 'Mb,ltb (lateral buckling, Cl.3.3.3.2)', value: Mb_ltb.toFixed(3), unit: 'kN·m' },
      { label: 'Mb,dist (distortional, Cl.3.3.3.3)', value: Mb_dist > 0 ? Mb_dist.toFixed(3) : 'N/A', unit: 'kN·m' },
      { label: 'Governing mode', value: governingMode, unit: '' },
      { label: 'Mn (nominal)', value: Mn.toFixed(3), unit: 'kN·m' },
      { label: 'phi_b', value: phi_b.toFixed(2), unit: '' },
      { label: 'phi_b × Mn (design)', value: phiMn.toFixed(3), unit: 'kN·m' },
    ],
  });

  // ── Step 8: Design Capacity Summary ──
  steps.push({
    clause: 'Cl. 3.3',
    title: 'Design Capacity Summary',
    equations: [
      `Governing failure mode: ${governingMode}`,
    ],
    values: [
      { label: 'Nominal moment (Mn)', value: Mn.toFixed(3), unit: 'kN·m' },
      { label: 'Design moment (phi_b × Mn)', value: phiMn.toFixed(3), unit: 'kN·m' },
      { label: 'Governing mode', value: governingMode, unit: '' },
      { label: 'lambda_b (LTB slenderness)', value: lambda_b.toFixed(4), unit: '' },
      { label: 'lambda_d (dist. slenderness)', value: lambda_d > 0 ? lambda_d.toFixed(4) : 'N/A', unit: '' },
    ],
  });

  // Signature curve
  const signatureCurve = generateSignatureCurve(geo, mat, gross);

  // Shear design (optional)
  const shear = shearParams
    ? performShearDesign(geo, fy, E, nu, shearParams)
    : performShearDesign(geo, fy, E, nu); // always compute with default (unstiffened)

  return {
    material: mat,
    geometry: geo,
    member: memberInput,
    grossProps: gross,
    buckling: { fol, fod, Mol, Mod, Mo: isFinite(Mo) ? Mo : 0, My, Lcrd },
    capacity: {
      Mbe: Mb_ltb,       // Member capacity from lateral-torsional buckling (Cl. 3.3.3.2.1)
      Mbl: Ms,           // Section capacity — local buckling via EWM (Cl. 3.3.2.2)
      Mbd: Mb_dist,      // Member capacity from distortional buckling (Cl. 3.3.3.3)
      Mn, phiMn, phi_b,
      governingMode,
      lambdaL: lambda_b, // LTB slenderness sqrt(My/Mo) — Eq. 3.3.3.2.1(6)
      lambdaD: lambda_d, // Distortional slenderness sqrt(My/Mod) — Eq. 3.3.3.3(8)
    },
    shear,
    steps,
    signatureCurve,
  };
}
