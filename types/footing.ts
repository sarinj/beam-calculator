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
