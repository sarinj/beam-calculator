// ============================================================
// Cold-Formed Steel (CFS) Types - AS/NZS 4600:2018
// ============================================================

// Section types per AS/NZS 4600
export type CFSSectionType = 'C-channel' | 'Z-section' | 'hat' | 'custom';

// Bending axis
export type BendingAxis = 'major' | 'minor';

// End conditions for lateral-torsional buckling
export type EndCondition = 'pinned-pinned' | 'fixed-free' | 'fixed-pinned' | 'fixed-fixed';

// Built-up configuration
export type BuiltUpConfig = 'none' | 'back-to-back' | 'face-to-face' | 'box' | 'I-section';

// Buckling mode
export type BucklingMode = 'local' | 'distortional' | 'lateral-torsional';

// --- Material ---
export interface CFSMaterial {
  fy: number;   // Yield stress (MPa)
  fu: number;   // Ultimate tensile strength (MPa)
  E: number;    // Elastic modulus (MPa)
  nu: number;   // Poisson's ratio
  G: number;    // Shear modulus (MPa) – derived from E, ν
}

// --- Section Geometry ---
export interface CFSGeometry {
  t: number;           // Thickness (mm)
  d: number;           // Web depth (mm)
  bf: number;          // Flange width (mm)
  lipLength: number;   // Lip (stiffener) length (mm)
  radius: number;      // Inside bend radius (mm)
  sectionType: CFSSectionType;
}

// --- Member Parameters ---
export interface CFSMember {
  Lb: number;          // Unbraced length (mm)
  Lc: number;          // Effective length for compression (mm)
  Cb: number;          // Moment gradient factor (1.0 = uniform moment)
  bendingAxis: BendingAxis;
  endCondition: EndCondition;
}

// --- Built-up Section ---
export interface CFSBuiltUp {
  config: BuiltUpConfig;
  fastenerSpacing: number;  // Spacing of connectors (mm)
  fastenerCapacity: number; // Individual fastener capacity (kN)
}

// --- Gross Section Properties ---
export interface GrossSectionProperties {
  Ag: number;    // Gross area (mm²)
  Ix: number;    // Second moment of area about x-axis (mm⁴)
  Iy: number;    // Second moment of area about y-axis (mm⁴)
  Sx: number;    // Elastic section modulus about x-axis (mm³)
  Sy: number;    // Elastic section modulus about y-axis (mm³)
  rx: number;    // Radius of gyration about x-axis (mm)
  ry: number;    // Radius of gyration about y-axis (mm)
  J: number;     // St. Venant torsion constant (mm⁴)
  Cw: number;    // Warping constant (mm⁶)
  xc: number;    // Centroid x-distance from web (mm)
  yc: number;    // Centroid y-distance (mm)
}

// --- Effective Section Properties ---
export interface EffectiveSectionProperties {
  Ae: number;    // Effective area (mm²)
  Ixe: number;   // Effective second moment about x-axis (mm⁴)
  Iye: number;   // Effective second moment about y-axis (mm⁴)
  Sxe: number;   // Effective section modulus about x-axis (mm³)
  Sye: number;   // Effective section modulus about y-axis (mm³)
  Ze: number;    // Effective section modulus for design (mm³)
  webEffWidth: number;    // Effective web width (mm)
  flangeEffWidth: number; // Effective flange width (mm)
  lipEffWidth: number;    // Effective lip width (mm)
  webLambda: number;      // Web slenderness
  flangeLambda: number;   // Flange slenderness
  lipLambda: number;      // Lip slenderness
}

// --- Signature Curve Point ---
export interface SignatureCurvePoint {
  halfWavelength: number;  // mm
  fcr_local: number;       // Local buckling stress (MPa)
  fcr_dist: number;        // Distortional buckling stress (MPa)
  fcr_global: number;      // Global buckling stress (MPa)
  fcr_envelope: number;    // Minimum (governing) stress (MPa)
}

// --- Bending Result ---
export interface BendingResult {
  Mne_local: number;         // Nominal moment (local buckling) (kN·m)
  Mne_distortional: number;  // Nominal moment (distortional buckling) (kN·m)
  Mne_ltb: number;           // Nominal moment (lateral-torsional) (kN·m)
  Mn: number;                // Governing nominal moment (kN·m)
  phiMn: number;             // Design moment capacity (kN·m)
  phi_b: number;             // Capacity reduction factor for bending
  governingMode: BucklingMode;
  Mcr_local: number;         // Elastic local buckling moment (kN·m)
  Mcr_dist: number;          // Elastic distortional buckling moment (kN·m)
  Mo: number;                // Elastic lateral-torsional buckling moment (kN·m)
  My: number;                // Yield moment (kN·m)
  Lcrd: number;              // Critical distortional half-wavelength (mm)
  lambdaD: number;           // Distortional slenderness
  signatureCurve: SignatureCurvePoint[];  // For visualization
}

// --- Compression Result ---
export interface CompressionResult {
  Nc: number;       // Nominal compression capacity (kN)
  phiNc: number;    // Design compression capacity (kN)
  phi_c: number;    // Capacity reduction factor (0.85)
  Ny: number;       // Squash load (kN)
  Noc: number;      // Elastic buckling load (kN)
  fox: number;      // Elastic flexural buckling stress about x (MPa)
  foy: number;      // Elastic flexural buckling stress about y (MPa)
  foc: number;      // Governing elastic buckling stress (MPa)
  lambda_c: number; // Non-dimensional slenderness
  fn: number;       // Nominal buckling stress (MPa)
}

// --- Shear Result ---
export interface ShearResult {
  Vn: number;     // Nominal shear capacity (kN)
  phiVn: number;  // Design shear capacity (kN)
  phi_v: number;  // Capacity reduction factor for shear
  Vcr: number;    // Elastic shear buckling force (kN)
  Vy: number;     // Shear yield force (kN)
  lambda_v: number; // Shear slenderness
}

// --- Interaction Check ---
export interface InteractionResult {
  Mstar: number;         // Design bending action M* (kN·m)
  Vstar: number;         // Design shear action V* (kN)
  Nstar: number;         // Design axial action N* (kN)
  bendingRatio: number;  // M* / ϕMn
  shearRatio: number;    // V* / ϕVn
  compressionRatio: number; // N* / ϕNc
  // Bending-shear circular: (M*/ϕMn)² + (V*/ϕVn)² ≤ 1.0
  interactionCircular: number;
  // Bending-shear linear: M*/ϕMn + V*/ϕVn ≤ 1.0
  interactionLinear: number;
  // Combined: N*/ϕNc + M*/ϕMn ≤ 1.0  (Cl. 3.5.1)
  interactionCombined: number;
  isAdequate: boolean;
}

// --- Combined Input ---
export interface CFSDesignInputs {
  material: CFSMaterial;
  geometry: CFSGeometry;
  member: CFSMember;
  Mstar: number;  // Applied design moment (kN·m)
  Vstar: number;  // Applied design shear (kN)
  Nstar: number;  // Applied design compression (kN) – 0 if none
}

// --- Full Design Results ---
export interface CFSDesignResults {
  grossProps: GrossSectionProperties;
  effectiveProps: EffectiveSectionProperties;
  bending: BendingResult;
  compression: CompressionResult;
  shear: ShearResult;
  interaction: InteractionResult;
}

// ============================================================
// Built-up Section Types (separate page)
// ============================================================

// Element in a built-up section
export interface BuiltUpElement {
  id: string;
  sectionType: CFSSectionType;
  geometry: CFSGeometry;
  offsetX: number;      // Horizontal offset from origin (mm)
  offsetY: number;      // Vertical offset from origin (mm)
  rotation: number;     // Rotation angle (degrees): 0, 90, 180, 270
  mirrored: boolean;    // Mirror about Y-axis
}

// Built-up assembly
export interface BuiltUpAssembly {
  name: string;
  elements: BuiltUpElement[];
  fastenerSpacing: number;  // Spacing of connectors (mm)
  fastenerCapacity: number; // Individual fastener capacity (kN)
}

// Built-up combined properties
export interface BuiltUpProperties {
  combinedGross: GrossSectionProperties;
  combinedEffective: EffectiveSectionProperties;
  elements: {
    id: string;
    gross: GrossSectionProperties;
    effective: EffectiveSectionProperties;
  }[];
  compositeAction: boolean;
  note: string;
}

// Built-up design inputs
export interface BuiltUpDesignInputs {
  material: CFSMaterial;
  assembly: BuiltUpAssembly;
  member: CFSMember;
  Mstar: number;
  Vstar: number;
  Nstar: number;
}

// Built-up design results
export interface BuiltUpDesignResults {
  assemblyProps: BuiltUpProperties;
  bending: BendingResult;
  shear: ShearResult;
  interaction: InteractionResult;
}
