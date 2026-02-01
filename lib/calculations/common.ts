import {
  DeformedBar,
  RoundBar,
  SteelGrade,
  ConcreteGrade,
  BarData,
  SteelData,
  ReinforcementLayer,
  BeamInputs,
  SectionProperties,
} from '@/types/beam';

// Deformed bar data (Thai standards)
export const deformedBarData: Record<DeformedBar, BarData> = {
  DB10: { diameter: 10, area: 0.785 },
  DB12: { diameter: 12, area: 1.131 },
  DB16: { diameter: 16, area: 2.011 },
  DB20: { diameter: 20, area: 3.142 },
  DB25: { diameter: 25, area: 4.909 },
  DB28: { diameter: 28, area: 6.158 },
  DB32: { diameter: 32, area: 8.042 },
};

// Round bar data (for stirrups)
export const roundBarData: Record<RoundBar, BarData> = {
  RB6: { diameter: 6, area: 0.283 },
  RB9: { diameter: 9, area: 0.636 },
  RB12: { diameter: 12, area: 1.131 },
};

// Steel grade data (fy in kg/cm²)
export const steelGradeData: Record<SteelGrade, SteelData> = {
  SD30: { fy: 3000 },
  SD40: { fy: 4000 },
  SD50: { fy: 5000 },
};

// Concrete modulus of elasticity (kg/cm²)
export function getConcreteModulus(fc: ConcreteGrade): number {
  // Ec = 15100 * sqrt(f'c) for normal weight concrete (ACI)
  return 15100 * Math.sqrt(fc);
}

// Steel modulus of elasticity (kg/cm²)
export const STEEL_MODULUS = 2040000; // Es = 2.04 × 10^6 kg/cm²

// Calculate modular ratio n = Es/Ec
export function getModularRatio(fc: ConcreteGrade): number {
  const Ec = getConcreteModulus(fc);
  return STEEL_MODULUS / Ec;
}

// Calculate total steel area for all layers
export function calculateTotalSteelArea(layers: ReinforcementLayer[]): number {
  return layers.reduce((total, layer) => {
    const barArea = deformedBarData[layer.barSize].area;
    return total + barArea * layer.count;
  }, 0);
}

// Calculate centroid depth of reinforcement (from top)
export function calculateCentroidDepth(
  layers: ReinforcementLayer[],
  height: number,
  cover: number,
  stirrupDiameter: number
): number {
  if (layers.length === 0) return height - cover;

  let totalArea = 0;
  let areaTimesDepth = 0;

  // Start from bottom, first layer
  let currentDepth = height - cover - stirrupDiameter / 10;

  layers.forEach((layer, index) => {
    const barDiameter = deformedBarData[layer.barSize].diameter / 10; // mm to cm
    const barArea = deformedBarData[layer.barSize].area;
    const layerArea = barArea * layer.count;

    // Depth to center of this layer
    const depthToCenter = currentDepth - barDiameter / 2;

    totalArea += layerArea;
    areaTimesDepth += layerArea * depthToCenter;

    // Move up for next layer (assuming 25mm spacing between layers)
    if (index < layers.length - 1) {
      const nextBarDiameter = deformedBarData[layers[index + 1].barSize].diameter / 10;
      currentDepth -= barDiameter / 2 + 2.5 + nextBarDiameter / 2; // 25mm clear spacing
    }
  });

  return totalArea > 0 ? areaTimesDepth / totalArea : height - cover;
}

// Calculate effective depth
export function calculateEffectiveDepth(
  height: number,
  cover: number,
  stirrupSize: RoundBar,
  layers: ReinforcementLayer[]
): number {
  if (layers.length === 0) return height - cover;

  const stirrupDiameter = roundBarData[stirrupSize].diameter / 10; // mm to cm
  const firstLayerBarDiameter = deformedBarData[layers[0].barSize].diameter / 10;

  // d = h - cover - stirrup_diameter - main_bar_diameter/2
  // For multiple layers, use centroid
  if (layers.length === 1) {
    return height - cover - stirrupDiameter - firstLayerBarDiameter / 2;
  }

  // For multiple layers, calculate centroid
  const centroidFromTop = calculateCentroidDepth(layers, height, cover, roundBarData[stirrupSize].diameter);
  return height - (height - centroidFromTop);
}

// Calculate section properties
export function calculateSectionProperties(inputs: BeamInputs): SectionProperties {
  const { width, height, cover, layers, stirrupSize } = inputs;

  const effectiveDepth = calculateEffectiveDepth(height, cover, stirrupSize, layers);
  const totalSteelArea = calculateTotalSteelArea(layers);
  const steelRatio = totalSteelArea / (width * effectiveDepth);
  const centroidDepth = effectiveDepth; // depth to centroid from compression face

  return {
    effectiveDepth,
    totalSteelArea,
    steelRatio,
    centroidDepth,
  };
}

// Get beta1 factor for SDM
export function getBeta1(fc: ConcreteGrade): number {
  if (fc <= 280) {
    return 0.85;
  } else if (fc <= 560) {
    return 0.85 - 0.05 * ((fc - 280) / 70);
  } else {
    return 0.65;
  }
}

// Format number with specified decimal places
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
