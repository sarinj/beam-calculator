// ============================================================
// CFS PRO+ Types – AS/NZS 4600:2018
// ============================================================
// Extended types for the CFS PRO+ advanced analysis platform.

import {
  CFSSectionType,
  BendingAxis,
  EndCondition,
  BuiltUpConfig,
  BucklingMode,
  CFSMaterial,
  CFSGeometry,
  CFSMember,
  GrossSectionProperties,
  EffectiveSectionProperties,
  BendingResult,
  CompressionResult,
  ShearResult,
  InteractionResult,
  SignatureCurvePoint,
} from './cfs';

// ── Extended section types ──
export type CFSProSectionType = CFSSectionType | 'track' | 'angle' | 'sigma';

// ── Connection type ──
export type ConnectionType = 'screw' | 'weld' | 'rivet' | 'bolt';

// ── Built-up preset ──
export type BuiltUpPreset =
  | 'single'
  | 'back-to-back'
  | 'face-to-face'
  | 'box'
  | 'I-section'
  | 'custom';

// ── Boundary condition for warping ──
export type WarpingCondition = 'free' | 'restrained';

// ── FEM settings ──
export interface FEMSettings {
  enabled: boolean;
  meshDensity: 'coarse' | 'medium' | 'fine';
  imperfection: number; // L/x  (e.g., 1000 for L/1000)
  nonlinear: boolean;
  numModes: number;
}

// ── Member in the PRO+ assembly editor ──
export interface CFSProMember {
  id: string;
  label: string;
  sectionType: CFSProSectionType;
  geometry: CFSGeometry;
  offsetX: number;
  offsetY: number;
  rotation: number;
  mirrored: boolean;
  color: string;
}

// ── Assembly ──
export interface CFSProAssembly {
  name: string;
  members: CFSProMember[];
  connectionType: ConnectionType;
  fastenerSpacing: number;
  fastenerCapacity: number;
  preset: BuiltUpPreset;
}

// ── Analysis parameters ──
export interface CFSProAnalysisParams {
  material: CFSMaterial;
  Lb: number;          // Unbraced length (mm)
  Lc: number;          // Effective compression length (mm)
  Cb: number;          // Moment gradient factor
  bendingAxis: BendingAxis;
  endCondition: EndCondition;
  warpingCondition: WarpingCondition;
  Mstar: number;       // Applied moment (kN·m)
  Vstar: number;       // Applied shear (kN)
  Nstar: number;       // Applied compression (kN)
  fem: FEMSettings;
}

// ── Plate element result ──
export interface PlateElementResult {
  elementName: string;
  flatWidth: number;
  thickness: number;
  slenderness: number;  // λ
  rho: number;          // ρ reduction factor
  effectiveWidth: number;
  kPlate: number;       // Buckling coefficient
  isFullyEffective: boolean;
}

// ── Principal axes result ──
export interface PrincipalAxesResult {
  theta: number;  // Angle (degrees) from x-axis to principal axis
  I1: number;     // Major principal moment of area (mm⁴)
  I2: number;     // Minor principal moment of area (mm⁴)
  Ixy: number;    // Product of area (mm⁴)
}

// ── Shear center result ──
export interface ShearCenterResult {
  xs: number;  // x-coordinate of shear center (mm)
  ys: number;  // y-coordinate of shear center (mm)
}

// ── Combined section properties ──
export interface CFSProSectionProperties {
  gross: GrossSectionProperties;
  effective: EffectiveSectionProperties;
  principalAxes: PrincipalAxesResult;
  shearCenter: ShearCenterResult;
  plateElements: PlateElementResult[];
}

// ── FEM result ──
export interface FEMResult {
  enabled: boolean;
  eigenvalues: number[];
  bucklingModes: string[];
  firstModeShape: { x: number; y: number }[];
  ultimateCapacity: number; // kN·m
  ewmComparison: number;   // ratio FEM/EWM
  dsmComparison: number;   // ratio FEM/DSM
  converged: boolean;
  meshNodes: number;
  meshElements: number;
}

// ── Full analysis result ──
export interface CFSProResults {
  sectionProps: CFSProSectionProperties;
  bending: BendingResult;
  compression: CompressionResult;
  shear: ShearResult;
  interaction: InteractionResult;
  fem?: FEMResult;
  warnings: string[];
  governingMode: BucklingMode;
  timestamp: string;
}

// ── JSON Export model ──
export interface CFSProModel {
  version: string;
  assembly: CFSProAssembly;
  params: CFSProAnalysisParams;
  results?: CFSProResults;
}

// Re-export common types for convenience
export type {
  CFSSectionType,
  BendingAxis,
  EndCondition,
  BuiltUpConfig,
  BucklingMode,
  CFSMaterial,
  CFSGeometry,
  CFSMember,
  GrossSectionProperties,
  EffectiveSectionProperties,
  BendingResult,
  CompressionResult,
  ShearResult,
  InteractionResult,
  SignatureCurvePoint,
};
