// ============================================================
// CFS Bending Capacity – AS/NZS 4600:2018  (DSM approach)
// ============================================================
// Direct Strength Method (DSM) bending design per Cl. 7.2.2:
//   1. Mbe – Lateral-torsional buckling capacity
//   2. Mbl – Local buckling capacity (interaction with Mbe)
//   3. Mbd – Distortional buckling capacity
//   4. Mb  = min(Mbl, Mbd)  [Mbd excluded when Mod = 0]
//
// References:
//   Cl. 7.2.2.2 – Lateral-torsional buckling (Mbe)
//   Cl. 7.2.2.3 – Local buckling (Mbl)
//   Cl. 7.2.2.4 – Distortional buckling (Mbd)
//   Cl. D2.1.1  – Elastic lateral-torsional buckling moment Mo

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
// ELASTIC LATERAL-TORSIONAL BUCKLING – Cl. D2.1.1
// ============================================================

/**
 * Elastic lateral-torsional buckling moment Mo.
 *
 * For doubly-symmetric and singly-symmetric C/Z sections
 * bent about the axis of symmetry (AS/NZS 4600 Eq. D2.1.1(1)):
 *
 *   Mo = Cb × √[ (π²EIy / Le²) × (GJ + π²ECw / Le²) ]
 *
 * Returns Mo in N·mm.
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

  // π²EIy / Le²
  const feyIy = (pi2 * E * Iy) / (Le * Le);

  // GJ + π²ECw / Le²
  const torsionalTerm = G * J + (pi2 * E * Cw) / (Le * Le);

  // Mo = Cb × √(feyIy × torsionalTerm)
  const Mo = Cb * Math.sqrt(feyIy * torsionalTerm);

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
// DISTORTIONAL BUCKLING – Cl. 7.2.2.4
// ============================================================

/**
 * Elastic distortional buckling stress (simplified).
 *
 * Uses Schafer's approximation for lipped C/Z sections:
 * fcrd ≈ β₁ · [(E·t³)/(12(1−ν²)·bf²)] · [1 + β₂·(bf/d)² + β₃·(lip/bf)²]
 *
 * For unlipped sections, distortional buckling does not occur as a
 * distinct mode – returns fcrd = 0 (matching THIN-WALL-2 / CUFSM).
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

  // No lip → no distortional buckling (the flange is unstiffened;
  // local plate buckling governs instead).
  if (flatLip <= 0) {
    return { fcrd: 0, Lcrd: 0 };
  }

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

  return { fcrd: Math.max(fcrd, 0), Lcrd };
}

// ============================================================
// ELASTIC LOCAL BUCKLING STRESS – for DSM
// ============================================================

/**
 * Compute the elastic local buckling stress fol.
 *
 * This uses simplified plate buckling: the minimum critical stress
 * from the constituent elements (flanges & web) under their
 * respective stress distributions.
 *
 * For flanges in uniform compression:
 *   fcr = k × π²D / (b² × t),  k = 4.0 (stiffened) or 0.43 (unstiffened)
 *
 * For web in bending gradient (ψ = −1):
 *   fcr = k × π²D / (hw² × t),  k ≈ 23.9
 *
 * fol = min(fcr_flange, fcr_web)  (the local mode is governed by the
 *       weakest plate element reaching its critical stress first)
 */
function computeLocalBucklingStress(
  geo: CFSGeometry,
  mat: CFSMaterial
): number {
  const { t, d, bf, lipLength, radius } = geo;
  const { E, nu } = mat;

  const pi2 = Math.PI * Math.PI;
  const D = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));

  const flatWeb = Math.max(d - 2 * (radius + t), 1);
  const flatFlange = Math.max(bf - 2 * (radius + t), 1);
  const flatLip = lipLength > 0 ? Math.max(lipLength - (radius + t / 2), 0) : 0;

  // Flange buckling coefficient: stiffened (lipped) vs unstiffened
  const kFlange = flatLip > 0 ? 4.0 : 0.43;
  const fcrFlange = kFlange * pi2 * D / (flatFlange * flatFlange * t);

  // Web under bending gradient (ψ = −1): k ≈ 23.9
  const kWeb = 23.9;
  const fcrWeb = kWeb * pi2 * D / (flatWeb * flatWeb * t);

  // fol is the minimum of all element critical stresses
  return Math.min(fcrFlange, fcrWeb);
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
// MAIN BENDING CAPACITY – DSM per Cl. 7.2.2
// ============================================================

/**
 * Compute nominal bending capacity per AS/NZS 4600:2018 DSM.
 *
 * DSM Design Flow:
 *   Step 1: Mbe – lateral-torsional buckling capacity (Cl. 7.2.2.2)
 *   Step 2: Mbl – local buckling capacity with LTB interaction (Cl. 7.2.2.3)
 *   Step 3: Mbd – distortional buckling capacity (Cl. 7.2.2.4)
 *   Step 4: Mb  = min(Mbl, Mbd)  [Mbd excluded when fod = 0]
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

  // ── Yield moment ──
  const My = (gross.Sx * fy) / 1e6; // kN·m

  // ── Elastic buckling stresses ──

  // Local buckling stress fol
  const fol = computeLocalBucklingStress(geo, mat);

  // Distortional buckling stress fod
  // For multi-member assemblies, the connected webs provide additional
  // rotational restraint at the flange-web junction, increasing fcrd.
  // The distortionalFactor (typically √n for n members) accounts for this.
  const { fcrd: fcrd_raw, Lcrd } = computeDistortionalBucklingStress(geo, mat);
  const fod = fcrd_raw * distortionalFactor;

  // ── Elastic buckling moments ──
  // Mol = Sf × fol  (elastic local buckling moment)
  const Mol = (gross.Sx * fol) / 1e6; // kN·m

  // Mod = Sf × fod  (elastic distortional buckling moment)
  const Mod = fod > 0 ? (gross.Sx * fod) / 1e6 : 0; // kN·m

  // Mo  = elastic lateral-torsional buckling moment
  // computeMo returns N·mm
  const Mo = computeMo(mat, gross, member) / 1e6; // kN·m

  // ================================================================
  // Step 1: Mbe – Lateral-torsional buckling (Cl. 7.2.2.2)
  // ================================================================
  let Mbe: number;
  if (Mo >= 2.78 * My) {
    // Full yield – laterally braced
    Mbe = My;
  } else if (Mo > 0.56 * My) {
    // Inelastic LTB
    Mbe = (10 / 9) * My * (1 - (10 * My) / (36 * Mo));
  } else {
    // Elastic LTB
    Mbe = Mo;
  }
  Mbe = Math.max(Mbe, 0);

  // ================================================================
  // Step 2: Mbl – Local buckling with LTB interaction (Cl. 7.2.2.3)
  // ================================================================
  //   λl = √(Mbe / Mol)
  //   λl ≤ 0.776 :  Mbl = Mbe
  //   λl > 0.776 :  Mbl = [1 − 0.15(Mol/Mbe)^0.4] × (Mol/Mbe)^0.4 × Mbe
  let Mbl: number;
  let lambdaL: number;

  if (Mol <= 0 || !isFinite(Mol)) {
    // No local buckling (e.g. very stocky section) → Mbl = Mbe
    Mbl = Mbe;
    lambdaL = 0;
  } else {
    lambdaL = Math.sqrt(Mbe / Mol);

    if (lambdaL <= 0.776) {
      Mbl = Mbe;
    } else {
      const ratio = Mol / Mbe; // Mol/Mbe (< 1 since λl > 0.776)
      Mbl = (1 - 0.15 * Math.pow(ratio, 0.4)) * Math.pow(ratio, 0.4) * Mbe;
    }
  }
  Mbl = Math.max(Mbl, 0);

  // ================================================================
  // Step 3: Mbd – Distortional buckling (Cl. 7.2.2.4)
  // ================================================================
  //   λd = √(My / Mod)
  //   λd ≤ 0.673 :  Mbd = My
  //   λd > 0.673 :  Mbd = [1 − 0.22(Mod/My)^0.5] × (Mod/My)^0.5 × My
  //
  // If fod = 0 (no distortional mode), Mbd is excluded from governing check.
  let Mbd: number;
  let lambdaD: number;

  if (fod <= 0 || Mod <= 0) {
    // No distortional buckling mode
    Mbd = 0;
    lambdaD = 0;
  } else {
    lambdaD = Math.sqrt(My / Mod);

    if (lambdaD <= 0.673) {
      Mbd = My;
    } else {
      const ratio = Mod / My;
      Mbd = (1 - 0.22 * Math.pow(ratio, 0.5)) * Math.pow(ratio, 0.5) * My;
    }
    Mbd = Math.max(Mbd, 0);
  }

  // ================================================================
  // Step 4: Mb = min(Mbl, Mbd), excluding Mbd if fod = 0
  // ================================================================
  let Mn: number;
  let governingMode: BucklingMode;

  if (Mbd > 0) {
    // Both local and distortional modes exist
    Mn = Math.min(Mbl, Mbd);
    governingMode = Mn === Mbd ? 'distortional' : 'local';
  } else {
    // Only local (+LTB) mode
    Mn = Mbl;
    governingMode = 'local';
  }

  // Check if LTB alone governs (Mbe < Mbl, and Mbe can be the limit)
  // In DSM, Mbl is already ≤ Mbe, so if Mbl = Mbe it means local
  // buckling didn't reduce capacity and LTB is the actual governing mode.
  if (Mbl >= Mbe - 1e-10 && (Mbd <= 0 || Mbe <= Mbd)) {
    governingMode = 'lateral-torsional';
  }

  const phiMn = phi_b * Mn;

  // Signature curve
  const signatureCurve = generateSignatureCurve(geo, mat, gross);

  return {
    Mne_local: Mbl,            // Mbl – DSM local buckling capacity
    Mne_distortional: Mbd,     // Mbd – DSM distortional capacity
    Mne_ltb: Mbe,              // Mbe – DSM LTB capacity
    Mn,                        // Mb  – governing nominal capacity
    phiMn,                     // φMb – design capacity
    phi_b,
    governingMode,
    fol,                       // Elastic local buckling stress (MPa)
    fod,                       // Elastic distortional buckling stress (MPa)
    Mcr_local: Mol,            // Mol – elastic local buckling moment
    Mcr_dist: Mod,             // Mod – elastic distortional buckling moment
    Mo,                        // Mo  – elastic LTB moment
    My,                        // My  – yield moment
    lambdaL,                   // Local slenderness √(Mbe/Mol)
    lambdaD,                   // Distortional slenderness √(My/Mod)
    Lcrd,                      // Critical distortional half-wavelength
    signatureCurve,
  };
}
