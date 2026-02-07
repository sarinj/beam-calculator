import { CalculatedFooting, CriticalFooting, ReinforcementInputs } from '@/types/footing';

/**
 * Select critical footings (highest utilization for each unique dimension)
 */
export function selectCriticalFootings(footings: CalculatedFooting[]): CalculatedFooting[] {
  // Group footings by dimension
  const groupedByDimension = footings.reduce((acc, footing) => {
    const key = footing.dimension.toFixed(2);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(footing);
    return acc;
  }, {} as Record<string, CalculatedFooting[]>);

  // Select footing with highest utilization from each group
  const criticalFootings: CalculatedFooting[] = [];
  
  for (const dimension in groupedByDimension) {
    const group = groupedByDimension[dimension];
    const maxUtilizationFooting = group.reduce((max, current) => 
      current.utilizationRatio > max.utilizationRatio ? current : max
    );
    criticalFootings.push(maxUtilizationFooting);
  }

  // Sort by dimension
  return criticalFootings.sort((a, b) => a.dimension - b.dimension);
}

/**
 * Calculate minimum footing thickness based on load and punching shear
 */
export function calculateMinimumThickness(
  footing: CalculatedFooting,
  inputs: ReinforcementInputs
): number {
  const { columnWidth, columnDepth, fc } = inputs;
  const B = footing.dimension;
  // Factored load: Pu = 1.4(DL+SDL) + 1.7(LL)
  const Pu = 1.4 * footing.dl_sdl + 1.7 * footing.ll; // Tonf
  
  // Punching shear perimeter
  // Assume d = h - cover - barSize/2 - 20mm (for second layer)
  // Initial estimate: d = B/10 (typical rule of thumb)
  let d = B / 10; // m
  
  // Calculate aspect ratio for punching shear
  const beta = Math.max(columnDepth, columnWidth) / Math.min(columnDepth, columnWidth);
  
  // Iterative calculation for required depth
  for (let i = 0; i < 10; i++) {
    // Critical perimeter at d/2 from face of column (m)
    const c1 = columnWidth; // m
    const c2 = columnDepth; // m  
    const bo = 2 * (c1 + d) + 2 * (c2 + d); // m
    
    // Punching shear capacity (Tonf)
    // φVc = 0.85 × 0.53 × √f'c × bo × d (for square footings)
    // f'c in kg/cm², bo and d in cm, result in kg → convert to Tonf
    const phi = 0.85;
    const bo_cm = bo * 100; // m to cm
    const d_cm = d * 100; // m to cm
    const Vc_kg = phi * 0.53 * Math.sqrt(fc) * bo_cm * d_cm; // kg
    const Vc = Vc_kg / 1000; // Tonf
    
    if (Vc >= Pu) break;
    
    d = d * 1.15; // Increase depth by 15%
  }
  
  // Add cover and bar clearances
  // h = d + cover + barSize + barSize/2 (for two layers)
  const h = d + inputs.cover / 1000 + inputs.barSize / 1000 + inputs.barSize / 2000; // m
  
  // Round up to nearest 50mm
  return Math.ceil(h * 20) / 20; // rounds to nearest 0.05m (5cm)
}

/**
 * Calculate effective depth
 */
export function calculateEffectiveDepth(
  thickness: number,
  inputs: ReinforcementInputs
): number {
  const { cover, barSize } = inputs;
  // d = h - cover - barSize (bottom layer) - barSize/2 (center of bar)
  // cover in mm → /1000 to m, barSize in mm → /1000 to m
  return thickness - cover / 1000 - barSize / 1000 - barSize / 2000; // m
}

/**
 * Calculate factored moment
 */
export function calculateMoment(
  footing: CalculatedFooting,
  inputs: ReinforcementInputs,
  allowableBearingCapacity: number
): { Mux: number; Muy: number } {
  const B = footing.dimension; // m
  // Factored load: Pu = 1.4(DL+SDL) + 1.7(LL)
  const Pu = 1.4 * footing.dl_sdl + 1.7 * footing.ll; // Tonf
  const { columnWidth, columnDepth } = inputs;
  
  // Ultimate soil pressure (Tonf/m²)
  const qu = Pu / (B * B);
  
  // Critical section at face of column
  const lx = (B - columnWidth) / 2; // m
  const ly = (B - columnDepth) / 2; // m
  
  // Moment per unit width
  // Mu = qu × B × lx² / 2 (Tonf-m)
  const Mux = qu * B * lx * lx / 2; // Tonf-m
  const Muy = qu * B * ly * ly / 2; // Tonf-m
  
  return { Mux, Muy };
}

/**
 * Calculate required steel area (SDM)
 */
export function calculateRequiredSteel(
  Mu: number,
  b: number, // width (m)
  d: number, // effective depth (m)
  inputs: ReinforcementInputs
): number {
  const { fc, fy } = inputs;
  
  // Convert to consistent units
  const Mu_kgfcm = Mu * 100000; // Tonf-m to kgf-cm
  const b_cm = b * 100; // m to cm
  const d_cm = d * 100; // m to cm
  
  // Design strength reduction factor
  const phi = 0.9;
  
  // Calculate required steel ratio
  const Rn = Mu_kgfcm / (phi * b_cm * d_cm * d_cm);
  const rho = (0.85 * fc / fy) * (1 - Math.sqrt(1 - 2 * Rn / (0.85 * fc)));
  
  // Required steel area
  const As_req = rho * b_cm * d_cm; // cm²
  
  return As_req;
}

/**
 * Calculate minimum steel area
 */
export function calculateMinimumSteel(
  b: number, // width (m)
  h: number, // thickness (m)
  inputs: ReinforcementInputs
): number {
  const { fy } = inputs;
  const b_cm = b * 100; // m to cm
  const h_cm = h * 100; // m to cm
  
  // As,min = 0.0018 * b * h (for grade 40 steel, SD40)
  // As,min = 0.0020 * b * h (for grade 60 steel, SD50)
  const rho_min = fy >= 4000 ? 0.0020 : 0.0018;
  
  const As_min = rho_min * b_cm * h_cm; // cm²
  
  return As_min;
}

/**
 * Calculate number of bars and spacing
 */
export function calculateBarSpacing(
  As_required: number,
  barSize: number,
  width: number // footing width in m
): { numBars: number; spacing: number } {
  // Area of one bar
  const Ab = Math.PI * barSize * barSize / 4 / 100; // cm²
  
  // Number of bars required
  const numBars = Math.ceil(As_required / Ab);
  
  // Spacing (mm)
  const width_mm = width * 1000;
  const spacing = width_mm / (numBars + 1);
  
  return { numBars, spacing };
}

/**
 * Check beam shear
 */
export function checkBeamShear(
  footing: CalculatedFooting,
  thickness: number,
  d: number,
  inputs: ReinforcementInputs,
  allowableBearingCapacity: number
): { Vu: number; Vc: number; isOk: boolean } {
  const B = footing.dimension; // m
  // Factored load: Pu = 1.4(DL+SDL) + 1.7(LL)
  const Pu = 1.4 * footing.dl_sdl + 1.7 * footing.ll; // Tonf
  const qu = Pu / (B * B); // Tonf/m²
  const { columnWidth, fc } = inputs;
  
  // Critical section at d from face of column
  const x = (B - columnWidth) / 2 - d; // m
  
  if (x <= 0) {
    return { Vu: 0, Vc: 0, isOk: true }; // No shear at this location
  }
  
  // Shear force (Tonf)
  const Vu = qu * B * x; // Tonf
  
  // Beam shear capacity (without stirrups)
  // φVc = 0.85 × 0.17 × √f'c × b × d
  // f'c in kg/cm², b and d in cm, result in kg
  const phi = 0.85;
  const b_cm = B * 100; // m to cm
  const d_cm = d * 100; // m to cm
  const Vc_kg = phi * 0.17 * Math.sqrt(fc) * b_cm * d_cm; // kg
  const Vc = Vc_kg / 1000; // Tonf
  
  return { Vu, Vc, isOk: Vu <= Vc };
}

/**
 * Check punching shear
 */
export function checkPunchingShear(
  footing: CalculatedFooting,
  thickness: number,
  d: number,
  inputs: ReinforcementInputs
): { Vu: number; Vc: number; isOk: boolean } {
  // Factored load: Pu = 1.4(DL+SDL) + 1.7(LL)
  const Pu = 1.4 * footing.dl_sdl + 1.7 * footing.ll; // Tonf
  const { columnWidth, columnDepth, fc } = inputs;
  
  // Critical perimeter at d/2 from face of column (m)
  const c1 = columnWidth; // m
  const c2 = columnDepth; // m
  const bo = 2 * (c1 + d) + 2 * (c2 + d); // m
  
  // Punching shear force (Tonf)
  const Vu = Pu; // Tonf
  
  // Punching shear capacity
  // φVc = 0.85 × 0.53 × √f'c × bo × d (for square footings, β ≈ 1)
  // f'c in kg/cm², bo and d in cm, result in kg → convert to Tonf
  const phi = 0.85;
  const bo_cm = bo * 100; // m to cm
  const d_cm = d * 100; // m to cm
  const Vc_kg = phi * 0.53 * Math.sqrt(fc) * bo_cm * d_cm; // kg
  const Vc = Vc_kg / 1000; // Tonf
  
  return { Vu, Vc, isOk: Vu <= Vc };
}

/**
 * Design footing reinforcement (main function)
 */
export function designFootingReinforcement(
  footing: CalculatedFooting,
  inputs: ReinforcementInputs,
  allowableBearingCapacity: number,
  customThickness?: number // Optional custom thickness (m)
): CriticalFooting {
  // Calculate minimum thickness or use custom
  const h = customThickness || calculateMinimumThickness(footing, inputs);
  
  // Calculate effective depth
  const d = calculateEffectiveDepth(h, inputs);
  
  // Calculate moments
  const { Mux, Muy } = calculateMoment(footing, inputs, allowableBearingCapacity);
  
  // Calculate required steel
  const As_req_x = calculateRequiredSteel(Mux, footing.dimension, d, inputs);
  const As_req_y = calculateRequiredSteel(Muy, footing.dimension, d, inputs);
  
  // Calculate minimum steel
  const As_min_x = calculateMinimumSteel(footing.dimension, h, inputs);
  const As_min_y = calculateMinimumSteel(footing.dimension, h, inputs);
  
  // Use maximum of required and minimum
  const As_x = Math.max(As_req_x, As_min_x);
  const As_y = Math.max(As_req_y, As_min_y);
  
  // Calculate bar spacing
  const { numBars: numBarsX, spacing: spacingX } = calculateBarSpacing(
    As_x,
    inputs.barSize,
    footing.dimension
  );
  const { numBars: numBarsY, spacing: spacingY } = calculateBarSpacing(
    As_y,
    inputs.barSize,
    footing.dimension
  );
  
  // Check beam shear
  const beamShearX = checkBeamShear(footing, h, d, inputs, allowableBearingCapacity);
  const beamShearY = checkBeamShear(footing, h, d, inputs, allowableBearingCapacity);
  
  // Check punching shear
  const punchingShear = checkPunchingShear(footing, h, d, inputs);
  
  return {
    ...footing,
    footingThickness: h,
    effectiveDepth: d,
    momentX: Mux,
    momentY: Muy,
    asReqX: As_req_x,
    asReqY: As_req_y,
    asMinX: As_min_x,
    asMinY: As_min_y,
    numBarsX,
    numBarsY,
    spacingX,
    spacingY,
    beamShearX: beamShearX.Vu,
    beamShearY: beamShearY.Vu,
    beamShearCapacityX: beamShearX.Vc,
    beamShearCapacityY: beamShearY.Vc,
    punchingShear: punchingShear.Vu,
    punchingShearCapacity: punchingShear.Vc,
    beamShearOkX: beamShearX.isOk,
    beamShearOkY: beamShearY.isOk,
    punchingShearOk: punchingShear.isOk,
  };
}
