// ============================================================
// Simple CFS – Direct Strength Method (DSM) Flexural Capacity
// AS/NZS 4600:2018
// ============================================================
//
// This module computes the nominal and design bending moment capacity
// (ϕMb) of a single cold-formed steel C-section (lipped or unlipped
// channel) under major-axis bending using ONLY the Direct Strength
// Method (DSM).
//
// NO Effective Width Method (EWM) is used.
// NO AISI specification is referenced.
//
// Clause references:
//   Cl. 1.5    – Material properties
//   Cl. 2.1    – Gross section properties (centre-line model)
//   Cl. 7.2.2  – Members subject to bending – DSM
//   Cl. 7.2.2.2 – Lateral-torsional buckling (Mbe)
//   Cl. 7.2.2.3 – Local buckling (Mbl)
//   Cl. 7.2.2.4 – Distortional buckling (Mbd)
//   Cl. D2.1.1  – Elastic lateral-torsional buckling moment (Mo)
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
 * Elastic distortional buckling stress fod – simplified closed-form.
 *
 * Uses Schafer's approximation for lipped C/Z sections:
 *   fod ≈ β₁ × [Et³/(12(1−ν²)bf²)] × [1 + β₂(bf/d)² + β₃(lip/bf)²]
 *
 * For unlipped sections, distortional buckling does not occur as a
 * distinct mode (the flange is unstiffened → local buckling governs).
 * Returns fod = 0.
 *
 * Also computes the critical distortional half-wavelength:
 *   Lcrd = 4.8 × (d × bf² / t)^0.25
 */
function computeDistortionalBucklingStress(
  geo: DSMGeometry,
  mat: DSMMaterial
): { fod: number; Lcrd: number } {
  const { d, bf, t, lipLength, r } = geo;
  const { E, nu } = mat;

  const flatFlange = Math.max(bf - 2 * (r + t), 1);
  const flatLip = lipLength > 0 ? Math.max(lipLength - (r + t / 2), 0) : 0;

  // No lip → no distortional buckling mode
  if (flatLip <= 0) {
    return { fod: 0, Lcrd: 0 };
  }

  // Plate flexural rigidity
  const Dp = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));

  // Simplified distortional buckling coefficients
  const beta1 = 1.0;
  const beta2 = 0.4;
  const beta3 = 5.0;

  const bfTerm = flatFlange > 0 ? flatFlange : bf;
  const fod =
    beta1 *
    (Dp / (bfTerm * bfTerm * t)) *
    (1 + beta2 * Math.pow(bfTerm / d, 2) + beta3 * Math.pow(flatLip / (bfTerm || 1), 2));

  // Critical half-wavelength
  const Lcrd = 4.8 * Math.pow((d * bfTerm * bfTerm) / t, 0.25);

  return { fod: Math.max(fod, 0), Lcrd };
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

  const { fod: fcrDist_min, Lcrd: Lcr_dist } = computeDistortionalBucklingStress(geo, mat);

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
// MAIN DSM DESIGN – Cl. 7.2.2
// ============================================================

/**
 * Perform full DSM flexural capacity calculation for a single C-section.
 *
 * Returns complete results including step-by-step calculation details,
 * elastic buckling values, DSM capacities, and the governing mode.
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

  // ── Step 2: Elastic Buckling Stresses & Moments ──
  const fol = computeLocalBucklingStress(geo, mat);
  const { fod, Lcrd } = computeDistortionalBucklingStress(geo, mat);
  const MoNmm = computeMo(mat, gross, memberInput);

  // Elastic buckling moments (N·mm → kN·m)
  const My = (gross.Sx * fy) / 1e6;                                    // kN·m
  const Mol = (gross.Sx * fol) / 1e6;                                  // kN·m
  const Mod = fod > 0 ? (gross.Sx * fod) / 1e6 : 0;                   // kN·m
  const Mo = isFinite(MoNmm) ? MoNmm / 1e6 : Infinity;               // kN·m

  const Ke = effectiveLengthFactor(memberInput.endCondition);
  const Le = Ke * memberInput.Lb;

  steps.push({
    clause: 'Cl. 7.2.2 / Cl. D2.1.1',
    title: 'Elastic Buckling Analysis',
    equations: [
      'fol = min(fcr_flange, fcr_web)',
      'fcr = k × π²D / (b² × t),  D = Et³/[12(1−ν²)]',
      'fod ≈ β₁(D/bf²t)[1 + β₂(bf/d)² + β₃(lip/bf)²]  [Schafer approx.]',
      'Lcrd = 4.8 × (d×bf²/t)^0.25',
      'Mo = Cb × √[(π²EIy/Le²)(GJ + π²ECw/Le²)]  — Eq. D2.1.1(1)',
      'Le = Ke × Lb',
      'Mol = Sx × fol',
      'Mod = Sx × fod',
      'My = Sx × fy',
    ],
    values: [
      { label: 'Ke (effective length factor)', value: Ke.toFixed(2), unit: '' },
      { label: 'Le (effective length)', value: Le.toFixed(0), unit: 'mm' },
      { label: 'fol (local buckling stress)', value: fol.toFixed(2), unit: 'MPa' },
      { label: 'fod (distortional buckling stress)', value: fod > 0 ? fod.toFixed(2) : 'N/A (unlipped)', unit: 'MPa' },
      { label: 'Lcrd (distortional half-wavelength)', value: Lcrd > 0 ? Lcrd.toFixed(1) : 'N/A', unit: 'mm' },
      { label: 'Mol (elastic local moment)', value: Mol.toFixed(3), unit: 'kN·m' },
      { label: 'Mod (elastic distortional moment)', value: Mod > 0 ? Mod.toFixed(3) : 'N/A', unit: 'kN·m' },
      { label: 'Mo (elastic LTB moment)', value: isFinite(Mo) ? Mo.toFixed(3) : '∞ (fully braced)', unit: 'kN·m' },
      { label: 'My (yield moment)', value: My.toFixed(3), unit: 'kN·m' },
    ],
  });

  // ── Step 3: Yield Moment ──
  steps.push({
    clause: 'Cl. 7.2.2',
    title: 'Yield Moment',
    equations: [
      'My = Sx × fy / 10⁶  (kN·m)',
    ],
    values: [
      { label: 'Sx', value: gross.Sx.toFixed(1), unit: 'mm³' },
      { label: 'fy', value: fy.toFixed(1), unit: 'MPa' },
      { label: 'My', value: My.toFixed(3), unit: 'kN·m' },
    ],
  });

  // ── Step 4A: Mbe – Lateral-Torsional Buckling (Cl. 7.2.2.2) ──
  const phi_b = 0.90; // AS/NZS 4600:2018 capacity reduction factor for bending

  let Mbe: number;
  let MbeNote: string;
  if (Mo >= 2.78 * My) {
    Mbe = My;
    MbeNote = 'Mo ≥ 2.78My → Full yield (laterally braced): Mbe = My';
  } else if (Mo > 0.56 * My) {
    Mbe = (10 / 9) * My * (1 - (10 * My) / (36 * Mo));
    MbeNote = '0.56My < Mo < 2.78My → Inelastic LTB: Mbe = (10/9)My[1 − 10My/(36Mo)]';
  } else {
    Mbe = Mo;
    MbeNote = 'Mo ≤ 0.56My → Elastic LTB: Mbe = Mo';
  }
  Mbe = Math.max(Mbe, 0);

  steps.push({
    clause: 'Cl. 7.2.2.2',
    title: 'Lateral-Torsional Buckling Capacity (Mbe)',
    equations: [
      'If Mo ≥ 2.78My:  Mbe = My',
      'If 0.56My < Mo < 2.78My:  Mbe = (10/9)My[1 − 10My/(36Mo)]',
      'If Mo ≤ 0.56My:  Mbe = Mo',
      `→ ${MbeNote}`,
    ],
    values: [
      { label: 'Mo', value: isFinite(Mo) ? Mo.toFixed(3) : '∞', unit: 'kN·m' },
      { label: 'My', value: My.toFixed(3), unit: 'kN·m' },
      { label: '0.56 × My', value: (0.56 * My).toFixed(3), unit: 'kN·m' },
      { label: '2.78 × My', value: (2.78 * My).toFixed(3), unit: 'kN·m' },
      { label: 'Mbe', value: Mbe.toFixed(3), unit: 'kN·m' },
    ],
  });

  // ── Step 4B: Mbl – Local Buckling (Cl. 7.2.2.3) ──
  let Mbl: number;
  let lambdaL: number;
  let MblNote: string;

  if (Mol <= 0 || !isFinite(Mol)) {
    Mbl = Mbe;
    lambdaL = 0;
    MblNote = 'Mol not defined → Mbl = Mbe (no local reduction)';
  } else {
    lambdaL = Math.sqrt(Mbe / Mol);
    if (lambdaL <= 0.776) {
      Mbl = Mbe;
      MblNote = `λl = ${lambdaL.toFixed(4)} ≤ 0.776 → Mbl = Mbe (no local reduction)`;
    } else {
      const ratio = Mol / Mbe;
      Mbl = (1 - 0.15 * Math.pow(ratio, 0.4)) * Math.pow(ratio, 0.4) * Mbe;
      MblNote = `λl = ${lambdaL.toFixed(4)} > 0.776 → Mbl = [1 − 0.15(Mol/Mbe)^0.4](Mol/Mbe)^0.4 × Mbe`;
    }
  }
  Mbl = Math.max(Mbl, 0);

  steps.push({
    clause: 'Cl. 7.2.2.3',
    title: 'Local Buckling Capacity (Mbl)',
    equations: [
      'λl = √(Mbe / Mol)',
      'If λl ≤ 0.776:  Mbl = Mbe',
      'If λl > 0.776:  Mbl = [1 − 0.15(Mol/Mbe)^0.4] × (Mol/Mbe)^0.4 × Mbe',
      `→ ${MblNote}`,
    ],
    values: [
      { label: 'Mol', value: Mol.toFixed(3), unit: 'kN·m' },
      { label: 'Mbe', value: Mbe.toFixed(3), unit: 'kN·m' },
      { label: 'λl (local slenderness)', value: lambdaL.toFixed(4), unit: '' },
      { label: 'Mbl', value: Mbl.toFixed(3), unit: 'kN·m' },
    ],
  });

  // ── Step 4C: Mbd – Distortional Buckling (Cl. 7.2.2.4) ──
  let Mbd: number;
  let lambdaD: number;
  let MbdNote: string;

  if (fod <= 0 || Mod <= 0) {
    Mbd = 0;
    lambdaD = 0;
    MbdNote = 'No distortional mode (unlipped section) → Mbd excluded';
  } else {
    lambdaD = Math.sqrt(My / Mod);
    if (lambdaD <= 0.673) {
      Mbd = My;
      MbdNote = `λd = ${lambdaD.toFixed(4)} ≤ 0.673 → Mbd = My (no distortional reduction)`;
    } else {
      const ratio = Mod / My;
      Mbd = (1 - 0.22 * Math.pow(ratio, 0.5)) * Math.pow(ratio, 0.5) * My;
      MbdNote = `λd = ${lambdaD.toFixed(4)} > 0.673 → Mbd = [1 − 0.22(Mod/My)^0.5](Mod/My)^0.5 × My`;
    }
    Mbd = Math.max(Mbd, 0);
  }

  steps.push({
    clause: 'Cl. 7.2.2.4',
    title: 'Distortional Buckling Capacity (Mbd)',
    equations: [
      'λd = √(My / Mod)',
      'If λd ≤ 0.673:  Mbd = My',
      'If λd > 0.673:  Mbd = [1 − 0.22(Mod/My)^0.5] × (Mod/My)^0.5 × My',
      `→ ${MbdNote}`,
    ],
    values: [
      { label: 'Mod', value: Mod > 0 ? Mod.toFixed(3) : 'N/A', unit: 'kN·m' },
      { label: 'My', value: My.toFixed(3), unit: 'kN·m' },
      { label: 'λd (distortional slenderness)', value: lambdaD > 0 ? lambdaD.toFixed(4) : 'N/A', unit: '' },
      { label: 'Mbd', value: Mbd > 0 ? Mbd.toFixed(3) : 'N/A (unlipped)', unit: 'kN·m' },
    ],
  });

  // ── Step 5: Governing Nominal Moment ──
  let Mn: number;
  let governingMode: DSMBucklingMode;

  if (Mbd > 0) {
    Mn = Math.min(Mbl, Mbd);
    governingMode = Mn === Mbd ? 'distortional' : 'local';
  } else {
    Mn = Mbl;
    governingMode = 'local';
  }

  // Check if LTB alone governs
  if (Mbl >= Mbe - 1e-10 && (Mbd <= 0 || Mbe <= Mbd)) {
    governingMode = 'lateral-torsional';
  }

  const phiMn = phi_b * Mn;

  steps.push({
    clause: 'Cl. 7.2.2',
    title: 'Nominal Moment Capacity (Mb)',
    equations: [
      'Mb = min(Mbl, Mbd)  [Mbd excluded if unlipped]',
      'ϕMb = ϕ × Mb',
      'ϕ = 0.90  (AS/NZS 4600:2018)',
    ],
    values: [
      { label: 'Mbe (LTB)', value: Mbe.toFixed(3), unit: 'kN·m' },
      { label: 'Mbl (local)', value: Mbl.toFixed(3), unit: 'kN·m' },
      { label: 'Mbd (distortional)', value: Mbd > 0 ? Mbd.toFixed(3) : 'N/A', unit: 'kN·m' },
      { label: 'Governing mode', value: governingMode, unit: '' },
      { label: 'Mn (= Mb)', value: Mn.toFixed(3), unit: 'kN·m' },
      { label: 'ϕ', value: phi_b.toFixed(2), unit: '' },
      { label: 'ϕMn (= ϕMb)', value: phiMn.toFixed(3), unit: 'kN·m' },
    ],
  });

  // ── Step 6: Design Capacity Summary ──
  steps.push({
    clause: 'Cl. 7.2.2',
    title: 'Design Capacity Summary',
    equations: [
      `Governing failure mode: ${governingMode}`,
    ],
    values: [
      { label: 'Nominal moment (Mn)', value: Mn.toFixed(3), unit: 'kN·m' },
      { label: 'Design moment (ϕMn)', value: phiMn.toFixed(3), unit: 'kN·m' },
      { label: 'Governing mode', value: governingMode, unit: '' },
      { label: 'λl (local slenderness)', value: lambdaL.toFixed(4), unit: '' },
      { label: 'λd (distortional slenderness)', value: lambdaD > 0 ? lambdaD.toFixed(4) : 'N/A', unit: '' },
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
      Mbe, Mbl, Mbd, Mn, phiMn, phi_b,
      governingMode, lambdaL, lambdaD,
    },
    shear,
    steps,
    signatureCurve,
  };
}
