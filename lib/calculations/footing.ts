import { ProcessedFooting, CalculatedFooting, FootingInputs } from '@/types/footing';

/**
 * Round up to nearest 0.2 m
 */
export function roundUpTo02m(value: number): number {
  return Math.ceil(value / 0.2) * 0.2;
}

/**
 * Calculate footing dimensions and utilization ratio
 */
export function calculateFootingDimensions(
  footing: ProcessedFooting,
  allowableBearingCapacity: number
): CalculatedFooting {
  const totalLoad = footing.totalLoad;
  
  // Required area = Total Load / Allowable Soil Bearing Capacity
  const requiredArea = totalLoad / allowableBearingCapacity;
  
  // Assume square footing: B = D = sqrt(Required Area)
  let dimension = Math.sqrt(requiredArea);
  
  // Round up to nearest 0.2 m
  dimension = roundUpTo02m(dimension);
  
  // Calculate actual area based on rounded dimension
  const actualArea = dimension * dimension;
  
  // Utilization Ratio (%) = Total Load / (B * D * Allowable Bearing Capacity) * 100
  const utilizationRatio = (totalLoad / actualArea / allowableBearingCapacity) * 100;
  
  return {
    ...footing,
    requiredArea,
    dimension,
    utilizationRatio,
  };
}

/**
 * Calculate all footings
 */
export function calculateAllFootings(
  footings: ProcessedFooting[],
  allowableBearingCapacity: number
): CalculatedFooting[] {
  return footings.map(footing =>
    calculateFootingDimensions(footing, allowableBearingCapacity)
  );
}
