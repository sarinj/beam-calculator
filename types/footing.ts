// Footing input properties
export interface FootingInputs {
  concreteStrength: number; // f'c in ksc
  allowableBearingCapacity: number; // Tonf/m²
}

// Footing data from Joint Reactions
export interface JointReaction {
  uniqueName: string;
  outputCase: string;
  fz: number; // Tonf
}

// Footing location from Point Object Connectivity
export interface PointLocation {
  uniqueName: string;
  x: number; // m
  y: number; // m
}

// Processed footing data
export interface ProcessedFooting {
  uniqueName: string;
  x: number; // m
  y: number; // m
  dl_sdl: number; // DL + SDL (Tonf)
  ll: number; // Live Load (Tonf)
  totalLoad: number; // DL + SDL + LL (Tonf)
}

// Calculated footing properties
export interface CalculatedFooting extends ProcessedFooting {
  requiredArea: number; // m²
  dimension: number; // B = D rounded up to nearest 0.2 m
  utilizationRatio: number; // %
}

// Footing calculation results
export interface FootingCalculationResults {
  footings: CalculatedFooting[];
  inputs: FootingInputs;
  importedFrom?: string;
}

// Reinforcement design inputs
export interface ReinforcementInputs {
  fc: number; // f'c concrete strength (ksc)
  fy: number; // steel yield strength (ksc)
  barSize: number; // reinforcement bar diameter (mm)
  cover: number; // concrete cover (mm)
  columnWidth: number; // column width (m)
  columnDepth: number; // column depth (m)
}

// Critical footing for reinforcement design
export interface CriticalFooting extends CalculatedFooting {
  footingName?: string; // Custom name (F1, F2, etc.)
  footingThickness?: number; // h (m)
  effectiveDepth?: number; // d (m)
  momentX?: number; // Mu-x (Tonf-m)
  momentY?: number; // Mu-y (Tonf-m)
  asReqX?: number; // Required steel area in X direction (cm²)
  asReqY?: number; // Required steel area in Y direction (cm²)
  asMinX?: number; // Minimum steel area in X direction (cm²)
  asMinY?: number; // Minimum steel area in Y direction (cm²)
  numBarsX?: number; // Number of bars in X direction
  numBarsY?: number; // Number of bars in Y direction
  spacingX?: number; // Bar spacing in X direction (mm)
  spacingY?: number; // Bar spacing in Y direction (mm)
  beamShearX?: number; // Vu for beam shear X (Tonf)
  beamShearY?: number; // Vu for beam shear Y (Tonf)
  beamShearCapacityX?: number; // Vc for beam shear X (Tonf)
  beamShearCapacityY?: number; // Vc for beam shear Y (Tonf)
  punchingShear?: number; // Vu for punching shear (Tonf)
  punchingShearCapacity?: number; // Vc for punching shear (Tonf)
  beamShearOkX?: boolean;
  beamShearOkY?: boolean;
  punchingShearOk?: boolean;
  // Individual footing parameters
  customColumnWidth?: number;
  customColumnDepth?: number;
  customBarSize?: number;
  customThickness?: number;
}

// Reinforcement design results
export interface ReinforcementResults {
  criticalFootings: CriticalFooting[];
  inputs: ReinforcementInputs;
}
