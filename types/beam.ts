// Steel bar types
export type DeformedBar = 'DB10' | 'DB12' | 'DB16' | 'DB20' | 'DB25' | 'DB28' | 'DB32';
export type RoundBar = 'RB6' | 'RB9' | 'RB12';

// Steel grades
export type SteelGrade = 'SD30' | 'SD40' | 'SD50';

// Concrete grades (f'c in kg/cm²)
export type ConcreteGrade = 180 | 210 | 240 | 280 | 320 | 350;

// Calculation method
export type CalculationMethod = 'WSD' | 'SDM';

// Reinforcement layer
export interface ReinforcementLayer {
  id: string;
  barSize: DeformedBar;
  count: number;
}

// Single beam input properties
export interface BeamInputs {
  // Material properties
  concreteGrade: ConcreteGrade;
  steelGrade: SteelGrade;

  // Section dimensions (cm)
  width: number;
  height: number;
  cover: number;

  // Reinforcement
  layers: ReinforcementLayer[];
  stirrupSize: RoundBar;
  stirrupSpacing: number;
}

// Double beam input properties
export interface DoubleBeamInputs {
  // Material properties
  concreteGrade: ConcreteGrade;
  steelGrade: SteelGrade;

  // Section dimensions (cm)
  width: number;
  height: number;
  cover: number;
  coverTop: number; // Cover for compression steel

  // Tension reinforcement (bottom)
  tensionLayers: ReinforcementLayer[];

  // Compression reinforcement (top)
  compressionLayers: ReinforcementLayer[];

  // Stirrups
  stirrupSize: RoundBar;
  stirrupSpacing: number;
}

// Calculated section properties
export interface SectionProperties {
  effectiveDepth: number;      // d (cm)
  totalSteelArea: number;      // As (cm²)
  steelRatio: number;          // ρ (rho)
  centroidDepth: number;       // depth to centroid of steel (cm)
}

// Double beam section properties
export interface DoubleSectionProperties {
  effectiveDepth: number;           // d (cm)
  effectiveDepthPrime: number;      // d' (cm) - depth to compression steel
  tensionSteelArea: number;         // As (cm²)
  compressionSteelArea: number;     // As' (cm²)
  tensionSteelRatio: number;        // ρ
  compressionSteelRatio: number;    // ρ'
}

// WSD calculation results
export interface WSDResults {
  allowableConcreteStress: number;  // fc (kg/cm²)
  allowableSteelStress: number;     // fs (kg/cm²)
  modularRatio: number;             // n = Es/Ec
  neutralAxisDepth: number;         // kd (cm)
  leverArm: number;                 // jd (cm)
  momentCapacity: number;           // M (kg-m)
  shearCapacity: number;            // V (kg)
}

// Double beam WSD results
export interface DoubleWSDResults extends WSDResults {
  compressionSteelStress: number;   // f's (kg/cm²)
}

// SDM calculation results
export interface SDMResults {
  beta1: number;                    // β1
  balancedRatio: number;            // ρb
  maxRatio: number;                 // ρmax
  compressionBlockDepth: number;    // a (cm)
  nominalMoment: number;            // Mn (kg-m)
  designMoment: number;             // φMn (kg-m)
  nominalShear: number;             // Vn (kg)
  designShear: number;              // φVn (kg)
  isUnderReinforced: boolean;
}

// Double beam SDM results
export interface DoubleSDMResults extends SDMResults {
  compressionSteelYields: boolean;  // Does compression steel yield?
  compressionSteelStress: number;   // f's actual stress
  momentFromCompSteel: number;      // Mn2 from compression steel contribution
}

// Combined results
export interface CalculationResults {
  section: SectionProperties;
  wsd: WSDResults;
  sdm: SDMResults;
}

// Double beam combined results
export interface DoubleCalculationResults {
  section: DoubleSectionProperties;
  wsd: DoubleWSDResults;
  sdm: DoubleSDMResults;
}

// Bar data lookup
export interface BarData {
  diameter: number;  // mm
  area: number;      // cm²
}

// Steel grade data
export interface SteelData {
  fy: number;  // kg/cm²
}
