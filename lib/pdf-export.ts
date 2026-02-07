import { jsPDF } from 'jspdf';
import { CalculationResults, BeamInputs, DoubleCalculationResults, DoubleBeamInputs, CalculationMethod } from '@/types/beam';
import { formatNumber, steelGradeData, getModularRatio, getBeta1, roundBarData, deformedBarData, STEEL_MODULUS } from '@/lib/calculations/common';

interface EquationData {
  label: string;
  formula: string;
  substitution: string;
  result: string;
  unit?: string;
}

function addEquation(doc: jsPDF, eq: EquationData, y: number, margin: number): number {
  // Check if we need a new page
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(eq.label, margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(eq.formula, margin + 5, y);
  y += 4;

  doc.setTextColor(100, 100, 100);
  doc.text(eq.substitution, margin + 5, y);
  y += 4;

  doc.setTextColor(0, 100, 180);
  doc.setFont('helvetica', 'bold');
  doc.text(`= ${eq.result} ${eq.unit || ''}`, margin + 5, y);
  y += 6;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  return y;
}

function addSectionHeader(doc: jsPDF, title: string, y: number, margin: number): number {
  // Check if we need a new page
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, doc.internal.pageSize.getWidth() - 2 * margin, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 2, y + 2);
  y += 10;

  doc.setFont('helvetica', 'normal');
  return y;
}

function addResultRow(doc: jsPDF, label: string, value: string, unit: string, y: number, margin: number, highlight: boolean = false): number {
  if (y > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    y = 20;
  }

  if (highlight) {
    doc.setFillColor(230, 240, 255);
    doc.rect(margin, y - 4, doc.internal.pageSize.getWidth() - 2 * margin, 7, 'F');
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(label, margin, y);

  doc.setFont('helvetica', 'bold');
  doc.text(`${value} ${unit}`, margin + 100, y);

  doc.setFont('helvetica', 'normal');
  return y + 7;
}

export function exportSingleBeamPDF(
  results: CalculationResults,
  inputs: BeamInputs,
  method: CalculationMethod,
  language: 'en' | 'th' = 'en'
): void {
  const doc = new jsPDF();
  const margin = 15;
  let y = 20;

  const { section, wsd, sdm } = results;
  const { concreteGrade, steelGrade, width, height, cover, layers, stirrupSize, stirrupSpacing } = inputs;

  const fy = steelGradeData[steelGrade].fy;
  const fc = concreteGrade;
  const n = getModularRatio(fc);
  const As = section.totalSteelArea;
  const d = section.effectiveDepth;
  const b = width;
  const Av = 2 * roundBarData[stirrupSize].area;
  const beta1 = getBeta1(fc);

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RC Beam Analysis Report', margin, y);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  y += 8;
  doc.text('Singly Reinforced Beam', margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Method: ${method} | Generated: ${new Date().toLocaleDateString()}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Input Summary
  y = addSectionHeader(doc, 'Input Parameters', y, margin);

  doc.setFontSize(10);
  const col1 = margin;
  const col2 = margin + 60;
  const col3 = margin + 120;

  doc.text(`Concrete: f'c = ${fc} kg/cm^2`, col1, y);
  doc.text(`Steel: ${steelGrade} (fy = ${fy} kg/cm^2)`, col2, y);
  y += 6;
  doc.text(`Width (b) = ${b} cm`, col1, y);
  doc.text(`Height (h) = ${height} cm`, col2, y);
  doc.text(`Cover = ${cover} cm`, col3, y);
  y += 6;
  doc.text(`Stirrup: ${stirrupSize} @ ${stirrupSpacing} cm`, col1, y);
  y += 6;

  // Reinforcement layers
  doc.text('Reinforcement:', col1, y);
  y += 5;
  layers.forEach((layer, idx) => {
    const barData = deformedBarData[layer.barSize as keyof typeof deformedBarData];
    doc.text(`  Layer ${idx + 1}: ${layer.count} - ${layer.barSize} (As = ${formatNumber(layer.count * barData.area, 2)} cm^2)`, col1 + 5, y);
    y += 5;
  });
  y += 5;

  // Key Results
  y = addSectionHeader(doc, 'Key Results', y, margin);
  y = addResultRow(doc, 'Effective Depth (d)', formatNumber(d, 2), 'cm', y, margin);
  y = addResultRow(doc, 'Total Steel Area (As)', formatNumber(As, 2), 'cm^2', y, margin);
  y = addResultRow(doc, 'Steel Ratio (p)', formatNumber(section.steelRatio * 100, 3), '%', y, margin);

  if (method === 'SDM') {
    y = addResultRow(doc, 'Status', sdm.isUnderReinforced ? 'Under-reinforced (OK)' : 'Over-reinforced (NG)', '', y, margin, true);
  }
  y += 5;

  // Detailed Calculations
  if (method === 'WSD') {
    y = addSectionHeader(doc, '1. Allowable Stresses', y, margin);

    y = addEquation(doc, {
      label: 'Allowable Concrete Stress (fc)',
      formula: "fc = 0.45 x f'c",
      substitution: `fc = 0.45 x ${fc}`,
      result: formatNumber(wsd.allowableConcreteStress, 0),
      unit: 'kg/cm^2'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Allowable Steel Stress (fs)',
      formula: 'fs = 0.5 x fy',
      substitution: `fs = 0.5 x ${fy}`,
      result: formatNumber(wsd.allowableSteelStress, 0),
      unit: 'kg/cm^2'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Modular Ratio (n)',
      formula: "n = Es / Ec = Es / (15100 x sqrt(f'c))",
      substitution: `n = 2,040,000 / (15100 x sqrt(${fc}))`,
      result: formatNumber(wsd.modularRatio, 2)
    }, y, margin);

    y = addSectionHeader(doc, '2. Section Analysis', y, margin);

    const rhoN = (As / (b * d)) * n;
    const k = wsd.neutralAxisDepth / d;
    const j = wsd.leverArm / d;

    y = addEquation(doc, {
      label: 'Steel Ratio x n (pn)',
      formula: 'pn = (As / (b x d)) x n',
      substitution: `pn = (${formatNumber(As, 2)} / (${b} x ${formatNumber(d, 2)})) x ${formatNumber(n, 2)}`,
      result: formatNumber(rhoN, 4)
    }, y, margin);

    y = addEquation(doc, {
      label: 'Neutral Axis Ratio (k)',
      formula: 'k = sqrt(2pn + (pn)^2) - pn',
      substitution: `k = sqrt(2 x ${formatNumber(rhoN, 4)} + ${formatNumber(rhoN, 4)}^2) - ${formatNumber(rhoN, 4)}`,
      result: formatNumber(k, 4)
    }, y, margin);

    y = addEquation(doc, {
      label: 'Neutral Axis Depth (kd)',
      formula: 'kd = k x d',
      substitution: `kd = ${formatNumber(k, 4)} x ${formatNumber(d, 2)}`,
      result: formatNumber(wsd.neutralAxisDepth, 2),
      unit: 'cm'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Lever Arm Factor (j)',
      formula: 'j = 1 - k/3',
      substitution: `j = 1 - ${formatNumber(k, 4)}/3`,
      result: formatNumber(j, 4)
    }, y, margin);

    y = addEquation(doc, {
      label: 'Lever Arm (jd)',
      formula: 'jd = j x d',
      substitution: `jd = ${formatNumber(j, 4)} x ${formatNumber(d, 2)}`,
      result: formatNumber(wsd.leverArm, 2),
      unit: 'cm'
    }, y, margin);

    y = addSectionHeader(doc, '3. Moment Capacity', y, margin);

    const Mc = wsd.allowableConcreteStress * b * k * j * d * d / 2 / 100;
    const Ms = As * wsd.allowableSteelStress * j * d / 100;

    y = addEquation(doc, {
      label: 'Moment by Concrete (Mc)',
      formula: 'Mc = (fc x b x k x j x d^2) / 2',
      substitution: `Mc = (${formatNumber(wsd.allowableConcreteStress, 0)} x ${b} x ${formatNumber(k, 4)} x ${formatNumber(j, 4)} x ${formatNumber(d, 2)}^2) / 2`,
      result: formatNumber(Mc, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Moment by Steel (Ms)',
      formula: 'Ms = As x fs x j x d',
      substitution: `Ms = ${formatNumber(As, 2)} x ${formatNumber(wsd.allowableSteelStress, 0)} x ${formatNumber(j, 4)} x ${formatNumber(d, 2)}`,
      result: formatNumber(Ms, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Moment Capacity (M)',
      formula: 'M = min(Mc, Ms)',
      substitution: `M = min(${formatNumber(Mc, 0)}, ${formatNumber(Ms, 0)})`,
      result: formatNumber(wsd.momentCapacity, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addSectionHeader(doc, '4. Shear Capacity', y, margin);

    const Vc = 0.29 * Math.sqrt(fc) * b * d;
    const Vs = (Av * 0.5 * fy * d) / stirrupSpacing;

    y = addEquation(doc, {
      label: 'Concrete Shear (Vc)',
      formula: "Vc = 0.29 x sqrt(f'c) x b x d",
      substitution: `Vc = 0.29 x sqrt(${fc}) x ${b} x ${formatNumber(d, 2)}`,
      result: formatNumber(Vc, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Stirrup Shear (Vs)',
      formula: 'Vs = (Av x 0.5 x fy x d) / s',
      substitution: `Vs = (${formatNumber(Av, 3)} x 0.5 x ${fy} x ${formatNumber(d, 2)}) / ${stirrupSpacing}`,
      result: formatNumber(Vs, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Total Shear Capacity (V)',
      formula: 'V = Vc + Vs',
      substitution: `V = ${formatNumber(Vc, 0)} + ${formatNumber(Vs, 0)}`,
      result: formatNumber(wsd.shearCapacity, 0),
      unit: 'kg'
    }, y, margin);

  } else {
    // SDM Method
    y = addSectionHeader(doc, '1. Material Properties', y, margin);

    y = addEquation(doc, {
      label: 'Beta Factor (B1)',
      formula: fc <= 280 ? "B1 = 0.85 (for f'c <= 280)" : "B1 = 0.85 - 0.05 x ((f'c - 280) / 70)",
      substitution: fc <= 280 ? 'B1 = 0.85' : `B1 = 0.85 - 0.05 x ((${fc} - 280) / 70)`,
      result: formatNumber(sdm.beta1, 3)
    }, y, margin);

    y = addSectionHeader(doc, '2. Reinforcement Ratios', y, margin);

    y = addEquation(doc, {
      label: 'Balanced Ratio (pb)',
      formula: "pb = 0.85 x B1 x (f'c/fy) x (6000/(6000+fy))",
      substitution: `pb = 0.85 x ${formatNumber(beta1, 3)} x (${fc}/${fy}) x (6000/(6000+${fy}))`,
      result: formatNumber(sdm.balancedRatio * 100, 3),
      unit: '%'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Maximum Ratio (pmax)',
      formula: 'pmax = 0.75 x pb',
      substitution: `pmax = 0.75 x ${formatNumber(sdm.balancedRatio * 100, 3)}%`,
      result: formatNumber(sdm.maxRatio * 100, 3),
      unit: '%'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Actual Ratio (p)',
      formula: 'p = As / (b x d)',
      substitution: `p = ${formatNumber(As, 2)} / (${b} x ${formatNumber(d, 2)})`,
      result: formatNumber(section.steelRatio * 100, 3),
      unit: '%'
    }, y, margin);

    // Check
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const checkColor = sdm.isUnderReinforced ? [0, 128, 0] : [200, 0, 0];
    doc.setTextColor(checkColor[0], checkColor[1], checkColor[2]);
    doc.text(`Check: ${formatNumber(section.steelRatio * 100, 3)}% ${sdm.isUnderReinforced ? '<=' : '>'} ${formatNumber(sdm.maxRatio * 100, 3)}% -> ${sdm.isUnderReinforced ? 'OK (Under-reinforced)' : 'NG (Over-reinforced)'}`, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 8;

    y = addSectionHeader(doc, '3. Section Analysis', y, margin);

    y = addEquation(doc, {
      label: 'Compression Block Depth (a)',
      formula: "a = (As x fy) / (0.85 x f'c x b)",
      substitution: `a = (${formatNumber(As, 2)} x ${fy}) / (0.85 x ${fc} x ${b})`,
      result: formatNumber(sdm.compressionBlockDepth, 2),
      unit: 'cm'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Neutral Axis Depth (c)',
      formula: 'c = a / B1',
      substitution: `c = ${formatNumber(sdm.compressionBlockDepth, 2)} / ${formatNumber(beta1, 3)}`,
      result: formatNumber(sdm.compressionBlockDepth / beta1, 2),
      unit: 'cm'
    }, y, margin);

    y = addSectionHeader(doc, '4. Moment Capacity', y, margin);

    y = addEquation(doc, {
      label: 'Nominal Moment (Mn)',
      formula: 'Mn = As x fy x (d - a/2)',
      substitution: `Mn = ${formatNumber(As, 2)} x ${fy} x (${formatNumber(d, 2)} - ${formatNumber(sdm.compressionBlockDepth, 2)}/2)`,
      result: formatNumber(sdm.nominalMoment, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Design Moment (phi.Mn)',
      formula: 'phi.Mn = phi x Mn (phi = 0.9)',
      substitution: `phi.Mn = 0.9 x ${formatNumber(sdm.nominalMoment, 0)}`,
      result: formatNumber(sdm.designMoment, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addSectionHeader(doc, '5. Shear Capacity', y, margin);

    const VcSDM = 0.53 * Math.sqrt(fc) * b * d;
    const VsSDM = (Av * fy * d) / stirrupSpacing;

    y = addEquation(doc, {
      label: 'Concrete Shear (Vc)',
      formula: "Vc = 0.53 x sqrt(f'c) x b x d",
      substitution: `Vc = 0.53 x sqrt(${fc}) x ${b} x ${formatNumber(d, 2)}`,
      result: formatNumber(VcSDM, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Stirrup Shear (Vs)',
      formula: 'Vs = (Av x fy x d) / s',
      substitution: `Vs = (${formatNumber(Av, 3)} x ${fy} x ${formatNumber(d, 2)}) / ${stirrupSpacing}`,
      result: formatNumber(VsSDM, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Nominal Shear (Vn)',
      formula: 'Vn = Vc + Vs',
      substitution: `Vn = ${formatNumber(VcSDM, 0)} + ${formatNumber(VsSDM, 0)}`,
      result: formatNumber(sdm.nominalShear, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Design Shear (phi.Vn)',
      formula: 'phi.Vn = phi x Vn (phi = 0.85)',
      substitution: `phi.Vn = 0.85 x ${formatNumber(sdm.nominalShear, 0)}`,
      result: formatNumber(sdm.designShear, 0),
      unit: 'kg'
    }, y, margin);
  }

  // Final Results Summary
  y = addSectionHeader(doc, 'Final Results', y, margin);

  if (method === 'WSD') {
    y = addResultRow(doc, 'Moment Capacity (M)', formatNumber(wsd.momentCapacity, 0), 'kg-m', y, margin, true);
    y = addResultRow(doc, 'Shear Capacity (V)', formatNumber(wsd.shearCapacity, 0), 'kg', y, margin, true);
  } else {
    y = addResultRow(doc, 'Design Moment (phi.Mn)', formatNumber(sdm.designMoment, 0), 'kg-m', y, margin, true);
    y = addResultRow(doc, 'Design Shear (phi.Vn)', formatNumber(sdm.designShear, 0), 'kg', y, margin, true);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
    doc.text('RC Beam Calculator', margin, doc.internal.pageSize.getHeight() - 10);
  }

  // Save PDF
  const fileName = `RC_Beam_Single_${method}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export function exportDoubleBeamPDF(
  results: DoubleCalculationResults,
  inputs: DoubleBeamInputs,
  method: CalculationMethod,
  language: 'en' | 'th' = 'en'
): void {
  const doc = new jsPDF();
  const margin = 15;
  let y = 20;

  const { section, wsd, sdm } = results;
  const { concreteGrade, steelGrade, width, height, cover, coverTop, tensionLayers, compressionLayers, stirrupSize, stirrupSpacing } = inputs;

  const fy = steelGradeData[steelGrade].fy;
  const fc = concreteGrade;
  const n = getModularRatio(fc);
  const As = section.tensionSteelArea;
  const AsPrime = section.compressionSteelArea;
  const d = section.effectiveDepth;
  const dPrime = section.effectiveDepthPrime;
  const b = width;
  const Av = 2 * roundBarData[stirrupSize].area;
  const beta1 = getBeta1(fc);

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RC Beam Analysis Report', margin, y);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  y += 8;
  doc.text('Doubly Reinforced Beam', margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Method: ${method} | Generated: ${new Date().toLocaleDateString()}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Input Summary
  y = addSectionHeader(doc, 'Input Parameters', y, margin);

  doc.setFontSize(10);
  const col1 = margin;
  const col2 = margin + 60;
  const col3 = margin + 120;

  doc.text(`Concrete: f'c = ${fc} kg/cm^2`, col1, y);
  doc.text(`Steel: ${steelGrade} (fy = ${fy} kg/cm^2)`, col2, y);
  y += 6;
  doc.text(`Width (b) = ${b} cm`, col1, y);
  doc.text(`Height (h) = ${height} cm`, col2, y);
  y += 6;
  doc.text(`Cover (bot) = ${cover} cm`, col1, y);
  doc.text(`Cover (top) = ${coverTop} cm`, col2, y);
  doc.text(`Stirrup: ${stirrupSize} @ ${stirrupSpacing} cm`, col3, y);
  y += 6;

  // Tension reinforcement
  doc.text('Tension Reinforcement (Bottom):', col1, y);
  y += 5;
  tensionLayers.forEach((layer, idx) => {
    const barData = deformedBarData[layer.barSize as keyof typeof deformedBarData];
    doc.text(`  Layer ${idx + 1}: ${layer.count} - ${layer.barSize} (As = ${formatNumber(layer.count * barData.area, 2)} cm^2)`, col1 + 5, y);
    y += 5;
  });
  y += 3;

  // Compression reinforcement
  doc.text('Compression Reinforcement (Top):', col1, y);
  y += 5;
  compressionLayers.forEach((layer, idx) => {
    const barData = deformedBarData[layer.barSize as keyof typeof deformedBarData];
    doc.text(`  Layer ${idx + 1}: ${layer.count} - ${layer.barSize} (As' = ${formatNumber(layer.count * barData.area, 2)} cm^2)`, col1 + 5, y);
    y += 5;
  });
  y += 5;

  // Key Results
  y = addSectionHeader(doc, 'Key Results', y, margin);
  y = addResultRow(doc, 'Effective Depth (d)', formatNumber(d, 2), 'cm', y, margin);
  y = addResultRow(doc, "Comp. Steel Depth (d')", formatNumber(dPrime, 2), 'cm', y, margin);
  y = addResultRow(doc, 'Tension Steel Area (As)', formatNumber(As, 2), 'cm^2', y, margin);
  y = addResultRow(doc, "Compression Steel Area (As')", formatNumber(AsPrime, 2), 'cm^2', y, margin);
  y = addResultRow(doc, 'Status', sdm.isUnderReinforced ? 'Under-reinforced (OK)' : 'Over-reinforced (NG)', '', y, margin, true);
  y += 5;

  if (method === 'WSD') {
    const nPrime = 2 * n - 1;

    y = addSectionHeader(doc, '1. Allowable Stresses', y, margin);

    y = addEquation(doc, {
      label: 'Allowable Concrete Stress (fc)',
      formula: "fc = 0.45 x f'c",
      substitution: `fc = 0.45 x ${fc}`,
      result: formatNumber(wsd.allowableConcreteStress, 0),
      unit: 'kg/cm^2'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Allowable Steel Stress (fs)',
      formula: 'fs = 0.5 x fy',
      substitution: `fs = 0.5 x ${fy}`,
      result: formatNumber(wsd.allowableSteelStress, 0),
      unit: 'kg/cm^2'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Modular Ratio (n)',
      formula: 'n = Es / Ec',
      substitution: `n = 2,040,000 / (15100 x sqrt(${fc}))`,
      result: formatNumber(wsd.modularRatio, 2)
    }, y, margin);

    y = addSectionHeader(doc, '2. Neutral Axis Analysis', y, margin);

    y = addEquation(doc, {
      label: 'Transformed Comp. Steel Factor (2n-1)',
      formula: '2n - 1',
      substitution: `2 x ${formatNumber(n, 2)} - 1`,
      result: formatNumber(nPrime, 2)
    }, y, margin);

    y = addEquation(doc, {
      label: 'Neutral Axis Depth (kd)',
      formula: "From: b x kd^2/2 + (2n-1) x As' x (kd-d') = n x As x (d-kd)",
      substitution: 'Solving quadratic equation',
      result: formatNumber(wsd.neutralAxisDepth, 2),
      unit: 'cm'
    }, y, margin);

    y = addSectionHeader(doc, '3. Compression Steel Stress', y, margin);

    y = addEquation(doc, {
      label: "Compression Steel Stress (fs')",
      formula: "fs' = min(fs, 2 x fc x (kd-d')/kd)",
      substitution: `fs' = min(${formatNumber(wsd.allowableSteelStress, 0)}, 2 x ${formatNumber(wsd.allowableConcreteStress, 0)} x (${formatNumber(wsd.neutralAxisDepth, 2)}-${formatNumber(dPrime, 2)})/${formatNumber(wsd.neutralAxisDepth, 2)})`,
      result: formatNumber(wsd.compressionSteelStress, 0),
      unit: 'kg/cm^2'
    }, y, margin);

    y = addSectionHeader(doc, '4. Moment Capacity', y, margin);

    const Mc = wsd.allowableConcreteStress * b * wsd.neutralAxisDepth * (d - wsd.neutralAxisDepth / 3) / 2 / 100;
    const MsPrime = AsPrime * wsd.compressionSteelStress * (d - dPrime) / 100;

    y = addEquation(doc, {
      label: 'Concrete Moment (Mc)',
      formula: 'Mc = fc x b x kd x (d - kd/3) / 2',
      substitution: `Mc = ${formatNumber(wsd.allowableConcreteStress, 0)} x ${b} x ${formatNumber(wsd.neutralAxisDepth, 2)} x (${formatNumber(d, 2)} - ${formatNumber(wsd.neutralAxisDepth, 2)}/3) / 2`,
      result: formatNumber(Mc, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addEquation(doc, {
      label: "Compression Steel Moment (Ms')",
      formula: "Ms' = As' x fs' x (d - d')",
      substitution: `Ms' = ${formatNumber(AsPrime, 2)} x ${formatNumber(wsd.compressionSteelStress, 0)} x (${formatNumber(d, 2)} - ${formatNumber(dPrime, 2)})`,
      result: formatNumber(MsPrime, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Total Moment Capacity (M)',
      formula: "M = Mc + Ms'",
      substitution: `M = ${formatNumber(Mc, 0)} + ${formatNumber(MsPrime, 0)}`,
      result: formatNumber(wsd.momentCapacity, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addSectionHeader(doc, '5. Shear Capacity', y, margin);

    const Vc = 0.29 * Math.sqrt(fc) * b * d;
    const Vs = (Av * 0.5 * fy * d) / stirrupSpacing;

    y = addEquation(doc, {
      label: 'Concrete Shear (Vc)',
      formula: "Vc = 0.29 x sqrt(f'c) x b x d",
      substitution: `Vc = 0.29 x sqrt(${fc}) x ${b} x ${formatNumber(d, 2)}`,
      result: formatNumber(Vc, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Stirrup Shear (Vs)',
      formula: 'Vs = (Av x 0.5 x fy x d) / s',
      substitution: `Vs = (${formatNumber(Av, 3)} x 0.5 x ${fy} x ${formatNumber(d, 2)}) / ${stirrupSpacing}`,
      result: formatNumber(Vs, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Total Shear Capacity (V)',
      formula: 'V = Vc + Vs',
      substitution: `V = ${formatNumber(Vc, 0)} + ${formatNumber(Vs, 0)}`,
      result: formatNumber(wsd.shearCapacity, 0),
      unit: 'kg'
    }, y, margin);

  } else {
    // SDM Method
    y = addSectionHeader(doc, '1. Material Properties', y, margin);

    y = addEquation(doc, {
      label: 'Beta Factor (B1)',
      formula: fc <= 280 ? "B1 = 0.85 (for f'c <= 280)" : "B1 = 0.85 - 0.05 x ((f'c - 280) / 70)",
      substitution: fc <= 280 ? 'B1 = 0.85' : `B1 = 0.85 - 0.05 x ((${fc} - 280) / 70)`,
      result: formatNumber(sdm.beta1, 3)
    }, y, margin);

    y = addSectionHeader(doc, '2. Reinforcement Ratios', y, margin);

    y = addEquation(doc, {
      label: 'Balanced Ratio (pb)',
      formula: "pb = 0.85 x B1 x (f'c/fy) x (6000/(6000+fy))",
      substitution: `pb = 0.85 x ${formatNumber(beta1, 3)} x (${fc}/${fy}) x (6000/(6000+${fy}))`,
      result: formatNumber(sdm.balancedRatio * 100, 3),
      unit: '%'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Maximum Ratio (pmax)',
      formula: 'pmax = 0.75 x pb',
      substitution: `pmax = 0.75 x ${formatNumber(sdm.balancedRatio * 100, 3)}%`,
      result: formatNumber(sdm.maxRatio * 100, 3),
      unit: '%'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Net Tension Ratio',
      formula: "pnet = (As - As') / (b x d)",
      substitution: `pnet = (${formatNumber(As, 2)} - ${formatNumber(AsPrime, 2)}) / (${b} x ${formatNumber(d, 2)})`,
      result: formatNumber((As - AsPrime) / (b * d) * 100, 3),
      unit: '%'
    }, y, margin);

    // Check
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const checkColor = sdm.isUnderReinforced ? [0, 128, 0] : [200, 0, 0];
    doc.setTextColor(checkColor[0], checkColor[1], checkColor[2]);
    doc.text(`Check: ${formatNumber((As - AsPrime) / (b * d) * 100, 3)}% ${sdm.isUnderReinforced ? '<=' : '>'} ${formatNumber(sdm.maxRatio * 100, 3)}% -> ${sdm.isUnderReinforced ? 'OK' : 'NG'}`, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 8;

    y = addSectionHeader(doc, '3. Compression Block Analysis', y, margin);

    const c = sdm.compressionBlockDepth / beta1;

    y = addEquation(doc, {
      label: 'Compression Block Depth (a)',
      formula: "a = (As - As') x fy / (0.85 x f'c x b)",
      substitution: `a = (${formatNumber(As, 2)} - ${formatNumber(AsPrime, 2)}) x ${fy} / (0.85 x ${fc} x ${b})`,
      result: formatNumber(sdm.compressionBlockDepth, 2),
      unit: 'cm'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Neutral Axis (c)',
      formula: 'c = a / B1',
      substitution: `c = ${formatNumber(sdm.compressionBlockDepth, 2)} / ${formatNumber(beta1, 3)}`,
      result: formatNumber(c, 2),
      unit: 'cm'
    }, y, margin);

    y = addSectionHeader(doc, '4. Compression Steel Check', y, margin);

    const epsilonS = 0.003 * (c - dPrime) / c;
    const epsilonY = fy / STEEL_MODULUS;

    y = addEquation(doc, {
      label: "Strain in Comp. Steel (es')",
      formula: "es' = 0.003 x (c - d') / c",
      substitution: `es' = 0.003 x (${formatNumber(c, 2)} - ${formatNumber(dPrime, 2)}) / ${formatNumber(c, 2)}`,
      result: formatNumber(epsilonS, 6)
    }, y, margin);

    y = addEquation(doc, {
      label: 'Yield Strain (ey)',
      formula: 'ey = fy / Es',
      substitution: `ey = ${fy} / 2,040,000`,
      result: formatNumber(epsilonY, 6)
    }, y, margin);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const yieldColor = sdm.compressionSteelYields ? [0, 128, 0] : [200, 100, 0];
    doc.setTextColor(yieldColor[0], yieldColor[1], yieldColor[2]);
    doc.text(`Compression Steel: es' ${sdm.compressionSteelYields ? '>=' : '<'} ey -> ${sdm.compressionSteelYields ? "Yields (fs' = fy)" : 'Does not yield'}`, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 8;

    y = addEquation(doc, {
      label: "Compression Steel Stress (fs')",
      formula: sdm.compressionSteelYields ? "fs' = fy (yields)" : "fs' = Es x es'",
      substitution: sdm.compressionSteelYields ? `fs' = ${fy}` : `fs' = 2,040,000 x ${formatNumber(epsilonS, 6)}`,
      result: formatNumber(sdm.compressionSteelStress, 0),
      unit: 'kg/cm^2'
    }, y, margin);

    y = addSectionHeader(doc, '5. Moment Capacity', y, margin);

    const Mn1 = (As - AsPrime) * fy * (d - sdm.compressionBlockDepth / 2) / 100;
    const Mn2 = AsPrime * sdm.compressionSteelStress * (d - dPrime) / 100;

    y = addEquation(doc, {
      label: 'Moment from Net Tension (Mn1)',
      formula: "Mn1 = (As - As') x fy x (d - a/2)",
      substitution: `Mn1 = (${formatNumber(As, 2)} - ${formatNumber(AsPrime, 2)}) x ${fy} x (${formatNumber(d, 2)} - ${formatNumber(sdm.compressionBlockDepth, 2)}/2)`,
      result: formatNumber(Mn1, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Moment from Comp. Steel (Mn2)',
      formula: "Mn2 = As' x fs' x (d - d')",
      substitution: `Mn2 = ${formatNumber(AsPrime, 2)} x ${formatNumber(sdm.compressionSteelStress, 0)} x (${formatNumber(d, 2)} - ${formatNumber(dPrime, 2)})`,
      result: formatNumber(Mn2, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Nominal Moment (Mn)',
      formula: 'Mn = Mn1 + Mn2',
      substitution: `Mn = ${formatNumber(Mn1, 0)} + ${formatNumber(Mn2, 0)}`,
      result: formatNumber(sdm.nominalMoment, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Design Moment (phi.Mn)',
      formula: 'phi.Mn = phi x Mn (phi = 0.9)',
      substitution: `phi.Mn = 0.9 x ${formatNumber(sdm.nominalMoment, 0)}`,
      result: formatNumber(sdm.designMoment, 0),
      unit: 'kg-m'
    }, y, margin);

    y = addSectionHeader(doc, '6. Shear Capacity', y, margin);

    const VcSDM = 0.53 * Math.sqrt(fc) * b * d;
    const VsSDM = (Av * fy * d) / stirrupSpacing;

    y = addEquation(doc, {
      label: 'Concrete Shear (Vc)',
      formula: "Vc = 0.53 x sqrt(f'c) x b x d",
      substitution: `Vc = 0.53 x sqrt(${fc}) x ${b} x ${formatNumber(d, 2)}`,
      result: formatNumber(VcSDM, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Stirrup Shear (Vs)',
      formula: 'Vs = (Av x fy x d) / s',
      substitution: `Vs = (${formatNumber(Av, 3)} x ${fy} x ${formatNumber(d, 2)}) / ${stirrupSpacing}`,
      result: formatNumber(VsSDM, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Nominal Shear (Vn)',
      formula: 'Vn = Vc + Vs',
      substitution: `Vn = ${formatNumber(VcSDM, 0)} + ${formatNumber(VsSDM, 0)}`,
      result: formatNumber(sdm.nominalShear, 0),
      unit: 'kg'
    }, y, margin);

    y = addEquation(doc, {
      label: 'Design Shear (phi.Vn)',
      formula: 'phi.Vn = phi x Vn (phi = 0.85)',
      substitution: `phi.Vn = 0.85 x ${formatNumber(sdm.nominalShear, 0)}`,
      result: formatNumber(sdm.designShear, 0),
      unit: 'kg'
    }, y, margin);
  }

  // Final Results Summary
  y = addSectionHeader(doc, 'Final Results', y, margin);

  if (method === 'WSD') {
    y = addResultRow(doc, 'Moment Capacity (M)', formatNumber(wsd.momentCapacity, 0), 'kg-m', y, margin, true);
    y = addResultRow(doc, 'Shear Capacity (V)', formatNumber(wsd.shearCapacity, 0), 'kg', y, margin, true);
  } else {
    y = addResultRow(doc, 'Design Moment (phi.Mn)', formatNumber(sdm.designMoment, 0), 'kg-m', y, margin, true);
    y = addResultRow(doc, 'Design Shear (phi.Vn)', formatNumber(sdm.designShear, 0), 'kg', y, margin, true);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
    doc.text('RC Beam Calculator', margin, doc.internal.pageSize.getHeight() - 10);
  }

  // Save PDF
  const fileName = `RC_Beam_Double_${method}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// Helper function to add footing content to PDF document with detailed calculation steps
function addFootingContentDetailed(
  doc: jsPDF,
  footing: any,
  inputs: any,
  bearingCapacity: number = 10,
  startY: number = 10,
  margin: number = 10
): number {
  let y = startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Combined Header Box (Full Width)
  const headerHeight = 19;
  const headerY = 10;
  
  // Draw single combined box
  doc.setFillColor(52, 73, 94); // Dark blue-gray matching STRUCTURAL DRAWINGS
  doc.roundedRect(margin, headerY - 5, pageWidth - 2 * margin, headerHeight, 2, 2, 'F');
  doc.setDrawColor(52, 73, 94);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, headerY - 5, pageWidth - 2 * margin, headerHeight, 2, 2, 'S');
  
  // LEFT SIDE: Title and Subtitle
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Footing Reinforcement Design: ${footing.footingName || 'Footing'}`, margin + 3, headerY + 1);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Design Method: Strength Design Method (SDM)', margin + 3, headerY + 7);
  
  // RIGHT SIDE: Summary
  const summaryX = pageWidth / 2 + 5;
  let sumY = headerY - 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('>> DESIGN SUMMARY', summaryX, sumY);
  sumY += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const B = footing.dimension || footing.width || 0;
  const h = footing.customThickness || footing.footingThickness || 0;
  const actualBarSize = footing.customBarSize || inputs.barSize || 0;
  doc.text(`Footing: ${B.toFixed(2)} x ${B.toFixed(2)} x ${(h * 100).toFixed(0)} cm`, summaryX, sumY);
  sumY += 4;
  doc.text(`Reinf. X: ${footing.numBarsX}-DB${actualBarSize} @ ${(footing.spacingX || 0).toFixed(0)} mm`, summaryX, sumY);
  sumY += 4;
  doc.text(`Reinf. Y: ${footing.numBarsY}-DB${actualBarSize} @ ${(footing.spacingY || 0).toFixed(0)} mm`, summaryX, sumY);
  
  // Status badge in summary (top right)
  const allOk = footing.punchingShearOk && footing.beamShearOkX && footing.beamShearOkY;
  const badgeX = pageWidth - margin - 32;
  const badgeY = headerY + 6;
  doc.setFillColor(allOk ? 46 : 231, allOk ? 204 : 76, allOk ? 113 : 60);
  doc.roundedRect(badgeX, badgeY, 28, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(allOk ? 'PASSED' : 'REVIEW', badgeX + 14, badgeY + 4, { align: 'center' });
  
  y = headerY + headerHeight - 3;
  
  doc.setTextColor(0, 0, 0); // Reset to black
  y += 15; // Space after header/summary section

  // Get values (reuse B, h from summary if not defined)
  const actualColumnWidth = footing.customColumnWidth || inputs.columnWidth || 0;
  const actualColumnDepth = footing.customColumnDepth || inputs.columnDepth || 0;
  const cover = inputs.cover || 75;
  const actualEffectiveDepth = h - (cover/1000) - (actualBarSize/1000) - (actualBarSize/2000);
  const d = actualEffectiveDepth;
  const fc = inputs.fc || 240;
  const fy = inputs.fy || 4000;
  const dl_sdl = footing.dl_sdl || 0;
  const ll = footing.ll || 0;
  const Pu = 1.4 * dl_sdl + 1.7 * ll;
  const qu = Pu / (B * B);
  const beta = Math.max(actualColumnDepth, actualColumnWidth) / Math.min(actualColumnDepth, actualColumnWidth);
  const lx = (B - actualColumnWidth) / 2;
  const ly = (B - actualColumnDepth) / 2;
  const bo = 2 * (actualColumnWidth + d) + 2 * (actualColumnDepth + d);
  const phiVc = 0.85 * 0.53 * Math.sqrt(fc) * (bo * 100) * (d * 100) / 1000;
  
  // Setup 2-column layout
  const col1X = margin;
  const col2X = pageWidth / 2 + 5;
  let leftY = y;
  let rightY = y;

  // LEFT COLUMN: Steps 1-4
  // Step 1: Design Data with modern card design
  doc.setFillColor(236, 240, 241); // Light gray background
  doc.roundedRect(col1X, leftY - 3.5, (pageWidth / 2 - margin - 10), 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(44, 62, 80); // Dark blue-gray
  doc.text('Step 1: Design Data', col1X + 4, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`f'c = ${fc} ksc (kg/cm²)`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`fy = ${fy} ksc (kg/cm²)`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`Column size = ${(actualColumnWidth * 100).toFixed(0)} x ${(actualColumnDepth * 100).toFixed(0)} cm`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`Footing size (B) = ${B.toFixed(2)} x ${B.toFixed(2)} m`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`DL + SDL = ${dl_sdl.toFixed(2)} Tonf`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`LL = ${ll.toFixed(2)} Tonf`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`Total service load = ${(dl_sdl + ll).toFixed(2)} Tonf`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`Allowable bearing capacity = ${bearingCapacity} Tonf/m²`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`Cover = ${cover} mm, Bar size = DB${actualBarSize}`, col1X + 4, leftY);
  leftY += 6;

  // Step 2: Factored Load with card design
  doc.setFillColor(236, 240, 241);
  doc.roundedRect(col1X, leftY - 3.5, (pageWidth / 2 - margin - 10), 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(44, 62, 80);
  doc.text('Step 2: Factored Load (SDM)', col1X + 4, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Pu = 1.4(DL+SDL) + 1.7(LL)', col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`    = 1.4 x ${dl_sdl.toFixed(2)} + 1.7 x ${ll.toFixed(2)}`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text(`    = ${Pu.toFixed(2)} Tonf`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text(`qu = Pu / B² = ${Pu.toFixed(2)} / (${B.toFixed(2)}²)`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`    = ${qu.toFixed(3)} Tonf/m²`, col1X + 7, leftY);
  leftY += 6;

  // Step 3: Footing Thickness with card design
  doc.setFillColor(236, 240, 241);
  doc.roundedRect(col1X, leftY - 3.5, (pageWidth / 2 - margin - 10), 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(44, 62, 80);
  doc.text('Step 3: Footing Thickness (from Punching Shear)', col1X + 4, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Beta = c1/c2 = ${beta.toFixed(2)}`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`Assume h = ${(h * 100).toFixed(0)} cm = ${(h * 1000).toFixed(0)} mm`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`Cover = ${cover} mm, Bar size = DB${actualBarSize} mm`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text('d = h - cover - db - db/2', col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`    = ${(h * 1000).toFixed(0)} - ${cover} - ${actualBarSize} - ${(actualBarSize/2).toFixed(0)}`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text(`    = ${(d * 1000).toFixed(1)} mm = ${(d * 100).toFixed(1)} cm`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text('bo = 2(c1 + d) + 2(c2 + d)', col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`    = 2(${(actualColumnWidth * 100).toFixed(0)} + ${(d * 100).toFixed(1)}) + 2(${(actualColumnDepth * 100).toFixed(0)} + ${(d * 100).toFixed(1)})`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text(`    = ${(bo * 100).toFixed(1)} cm`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text('phiVc = 0.85 x 0.53 x sqrt(f\'c) x bo x d', col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`       = 0.85 x 0.53 x sqrt(${fc}) x ${(bo * 100).toFixed(1)} x ${(d * 100).toFixed(1)}`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text(`       = ${(phiVc * 1000).toFixed(0)} kg = ${phiVc.toFixed(2)} Tonf`, col1X + 7, leftY);
  leftY += 4;
  // Status badge for punching shear
  const punchBadgeWidth = 22;
  doc.setFillColor(footing.punchingShearOk ? 46 : 231, footing.punchingShearOk ? 204 : 76, footing.punchingShearOk ? 113 : 60);
  doc.roundedRect(col1X + 7, leftY - 2.5, punchBadgeWidth, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(`Pu ${footing.punchingShearOk ? '< phiVc OK' : '> phiVc NG'}`, col1X + 7 + punchBadgeWidth/2, leftY, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  leftY += 3.5;
  doc.setFontSize(7);
  doc.text('Note: Use 0.53 for square footing (beta ~ 1)', col1X + 7, leftY);
  doc.setFontSize(7.5);
  leftY += 6;

  // Step 4: Design Moments with card design
  doc.setFillColor(236, 240, 241);
  doc.roundedRect(col1X, leftY - 3.5, (pageWidth / 2 - margin - 10), 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(44, 62, 80);
  doc.text('Step 4: Design Moments (at face of column)', col1X + 4, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`lx = (B - c1) / 2 = (${B.toFixed(2)} - ${actualColumnWidth.toFixed(2)}) / 2 = ${lx.toFixed(3)} m`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text('Mu-x = qu x B x lx² / 2', col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`      = ${qu.toFixed(3)} x ${B.toFixed(2)} x ${lx.toFixed(3)}² / 2`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text(`      = ${(footing.momentX || 0).toFixed(2)} Tonf-m`, col1X + 7, leftY);
  leftY += 4;
  doc.text(`ly = (B - c2) / 2 = (${B.toFixed(2)} - ${actualColumnDepth.toFixed(2)}) / 2 = ${ly.toFixed(3)} m`, col1X + 4, leftY);
  leftY += 3.5;
  doc.text('Mu-y = qu x B x ly² / 2', col1X + 4, leftY);
  leftY += 3.5;
  doc.text(`      = ${qu.toFixed(3)} x ${B.toFixed(2)} x ${ly.toFixed(3)}² / 2`, col1X + 7, leftY);
  leftY += 3.5;
  doc.text(`      = ${(footing.momentY || 0).toFixed(2)} Tonf-m`, col1X + 7, leftY);
  leftY += 6;

  // RIGHT COLUMN: Steps 5-7
  // Step 5: Required Steel X with card design
  doc.setFillColor(236, 240, 241);
  doc.roundedRect(col2X, rightY - 3.5, (pageWidth / 2 - margin - 10), 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(44, 62, 80);
  doc.text('Step 5: Required Steel (X Direction)', col2X + 4, rightY);
  doc.setTextColor(0, 0, 0);
  rightY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const MuX_kgcm = (footing.momentX || 0) * 100000;
  const bx = B * 100;
  const dx = d * 100;
  const Rn_x = MuX_kgcm / (0.9 * bx * dx * dx);
  doc.text('Rn = Mu / (phi x b x d²)', col2X + 4, rightY);
  rightY += 3.5;
  doc.text(`    = ${MuX_kgcm.toFixed(0)} / (0.9 x ${bx.toFixed(0)} x ${dx.toFixed(1)}²)`, col2X + 7, rightY);
  rightY += 3.5;
  doc.text(`    = ${Rn_x.toFixed(2)} kgf/cm²`, col2X + 7, rightY);
  rightY += 3.5;
  doc.text('rho = (0.85 x f\'c / fy) x [1 - sqrt(1 - 2Rn / (0.85 x f\'c))]', col2X + 4, rightY);
  rightY += 3.5;
  const sqrtTerm_x = 1 - 2 * Rn_x / (0.85 * fc);
  const rho_x = sqrtTerm_x > 0 ? (0.85 * fc / fy) * (1 - Math.sqrt(sqrtTerm_x)) : 0;
  const As_req_x = rho_x * bx * dx;
  const As_min_x = 0.0018 * bx * h * 100;
  doc.text(`As,req = rho x b x d = ${As_req_x.toFixed(2)} cm²`, col2X + 4, rightY);
  rightY += 3.5;
  doc.text(`As,min = 0.0018 x b x h = ${As_min_x.toFixed(2)} cm²`, col2X + 4, rightY);
  rightY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Use As = max(As,req, As,min) = ${Math.max(As_req_x, As_min_x).toFixed(2)} cm²`, col2X + 7, rightY);
  doc.setFont('helvetica', 'normal');
  rightY += 3.5;
  const Ab = Math.PI * actualBarSize * actualBarSize / 4 / 100;
  doc.text(`Ab = pi x db² / 4 = pi x ${actualBarSize}² / 4 = ${Ab.toFixed(2)} cm²`, col2X + 4, rightY);
  rightY += 3.5;
  doc.text(`Number of bars = ${footing.numBarsX} - DB${actualBarSize}`, col2X + 4, rightY);
  rightY += 3.5;
  doc.text(`Spacing = ${(footing.spacingX || 0).toFixed(0)} mm`, col2X + 4, rightY);
  rightY += 6;

  // Step 6: Required Steel Y with card design
  doc.setFillColor(236, 240, 241);
  doc.roundedRect(col2X, rightY - 3.5, (pageWidth / 2 - margin - 10), 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(44, 62, 80);
  doc.text('Step 6: Required Steel (Y Direction)', col2X + 4, rightY);
  doc.setTextColor(0, 0, 0);
  rightY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const MuY_kgcm = (footing.momentY || 0) * 100000;
  const by = B * 100;
  const dy = d * 100;
  const Rn_y = MuY_kgcm / (0.9 * by * dy * dy);
  const sqrtTerm_y = 1 - 2 * Rn_y / (0.85 * fc);
  const rho_y = sqrtTerm_y > 0 ? (0.85 * fc / fy) * (1 - Math.sqrt(sqrtTerm_y)) : 0;
  const As_req_y = rho_y * by * dy;
  const As_min_y = 0.0018 * by * h * 100;
  doc.text(`As,req = ${As_req_y.toFixed(2)} cm²`, col2X + 4, rightY);
  rightY += 3.5;
  doc.text(`As,min = ${As_min_y.toFixed(2)} cm²`, col2X + 4, rightY);
  rightY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Use As = ${Math.max(As_req_y, As_min_y).toFixed(2)} cm²`, col2X + 7, rightY);
  doc.setFont('helvetica', 'normal');
  rightY += 3.5;
  doc.text(`Number of bars = ${footing.numBarsY} - DB${actualBarSize}`, col2X + 4, rightY);
  rightY += 3.5;
  doc.text(`Spacing = ${(footing.spacingY || 0).toFixed(0)} mm`, col2X + 4, rightY);
  rightY += 6;

  // Step 7: Beam Shear Check with card design
  doc.setFillColor(236, 240, 241);
  doc.roundedRect(col2X, rightY - 3.5, (pageWidth / 2 - margin - 10), 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(44, 62, 80);
  doc.text('Step 7: Beam Shear Check (at d from face of column)', col2X + 4, rightY);
  doc.setTextColor(0, 0, 0);
  rightY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const x_shear = lx - d;
  const Vu_x = qu * B * x_shear;
  const Vc_beam = 0.85 * 0.17 * Math.sqrt(fc) * B * 100 * d * 100 / 1000;
  doc.text(`x = (B - c1) / 2 - d = ${x_shear.toFixed(3)} m`, col2X + 4, rightY);
  rightY += 3.5;
  doc.text(`Vu = qu x B x x = ${Vu_x.toFixed(2)} Tonf`, col2X + 4, rightY);
  rightY += 3.5;
  doc.text('phiVc = 0.85 x 0.17 x sqrt(f\'c) x B x d', col2X + 4, rightY);
  rightY += 3.5;
  doc.text(`       = ${Vc_beam.toFixed(2)} Tonf`, col2X + 7, rightY);
  rightY += 4;
  // Status badge for beam shear
  const beamOk = footing.beamShearOkX && footing.beamShearOkY;
  const beamBadgeWidth = 30;
  doc.setFillColor(beamOk ? 46 : 231, beamOk ? 204 : 76, beamOk ? 113 : 60);
  doc.roundedRect(col2X + 7, rightY - 2.5, beamBadgeWidth, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(beamOk ? 'Beam Shear OK' : 'Beam Shear NG', col2X + 7 + beamBadgeWidth/2, rightY, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  rightY += 7;

  // Use max Y position (no summary box at bottom since it's at top right)
  y = Math.max(leftY, rightY) + 5;
  
  return y;
}

// Export single footing to PDF with detailed steps and diagrams
export function exportFootingReinforcementToPDF(
  footing: any,
  inputs: any,
  bearingCapacity: number = 10,
  planImageData?: string,
  sectionImageData?: string,
  language: 'en' | 'th' = 'en'
) {
  const doc = new jsPDF();
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add detailed calculation steps
  const contentEndY = addFootingContentDetailed(doc, footing, inputs, bearingCapacity, 10, margin);
  
  // Add diagrams at the bottom - always on same page with better spacing
  if (planImageData || sectionImageData) {
    const imgWidth = (pageWidth - 2 * margin - 5) / 2;
    const imgHeight = imgWidth * 0.7;
    let diagramY = contentEndY + 8;
    
    // Check if need new page (leave at least 15mm margin at bottom)
    if (diagramY + imgHeight > pageHeight - 15) {
      doc.addPage();
      diagramY = 15;
    }
    
    // Modern section header with gradient
    doc.setFillColor(52, 73, 94); // Dark blue-gray
    doc.roundedRect(margin, diagramY - 6, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('>> STRUCTURAL DRAWINGS', pageWidth / 2, diagramY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    diagramY += 8;
    
    // Add images with frames
    if (planImageData) {
      try {
        // White background for image
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin - 1, diagramY - 1, imgWidth + 2, imgHeight + 2, 2, 2, 'F');
        doc.addImage(planImageData, 'PNG', margin, diagramY, imgWidth, imgHeight);
        // Frame around image
        doc.setDrawColor(52, 73, 94); // Dark blue-gray matching header
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, diagramY, imgWidth, imgHeight, 2, 2, 'S');
      } catch (e) {
        console.error('Error adding plan view image:', e);
      }
    }
    
    if (sectionImageData) {
      try {
        // White background for image
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + imgWidth + 4, diagramY - 1, imgWidth + 2, imgHeight + 2, 2, 2, 'F');
        doc.addImage(sectionImageData, 'PNG', margin + imgWidth + 5, diagramY, imgWidth, imgHeight);
        // Frame around image
        doc.setDrawColor(52, 73, 94); // Dark blue-gray matching header
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + imgWidth + 5, diagramY, imgWidth, imgHeight, 2, 2, 'S');
      } catch (e) {
        console.error('Error adding section view image:', e);
      }
    }
  }

  // Modern footer with gradient bar (on all pages)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer gradient bar
    doc.setFillColor(52, 73, 94);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    
    // Left: Date and project info
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} | Footing Reinforcement Design - SDM`, margin, pageHeight - 3);
    
    // Right: Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 3);
    
    doc.setTextColor(0, 0, 0);
  }

  // Save PDF
  const fileName = `Footing_${footing.footingName || 'Design'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// Export all footings to single PDF with detailed steps and diagrams
export function exportAllFootingsToPDF(
  footings: any[],
  globalInputs: any,
  bearingCapacity: number = 10,
  diagramsData?: Array<{ plan?: string; section?: string }>,
  language: 'en' | 'th' = 'en'
) {
  const doc = new jsPDF();
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  footings.forEach((footing, index) => {
    if (index > 0) {
      doc.addPage();
    }
    
    // Use footing-specific inputs if available, otherwise use global
    const inputs = footing.inputs || globalInputs;
    const contentEndY = addFootingContentDetailed(doc, footing, inputs, bearingCapacity, 10, margin);
    
    // Add diagrams at the bottom of the page if provided for this footing
    if (diagramsData && diagramsData[index]) {
      const { plan, section } = diagramsData[index];
      
      if (plan || section) {
        const imgWidth = (pageWidth - 2 * margin - 5) / 2;
        const imgHeight = imgWidth * 0.7;
        let diagramY = contentEndY + 8;
        
        // Check if need new page (leave at least 15mm margin at bottom)
        if (diagramY + imgHeight > pageHeight - 15) {
          doc.addPage();
          diagramY = 15;
        }
        
        // Modern section header with gradient
        doc.setFillColor(52, 73, 94); // Dark blue-gray
        doc.roundedRect(margin, diagramY - 6, pageWidth - 2 * margin, 10, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text('>> STRUCTURAL DRAWINGS', pageWidth / 2, diagramY, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        diagramY += 8;
        
        // Add images with frames
        if (plan) {
          try {
            // White background for image
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin - 1, diagramY - 1, imgWidth + 2, imgHeight + 2, 2, 2, 'F');
            doc.addImage(plan, 'PNG', margin, diagramY, imgWidth, imgHeight);
            // Frame around image
            doc.setDrawColor(52, 73, 94); // Dark blue-gray matching header
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, diagramY, imgWidth, imgHeight, 2, 2, 'S');
          } catch (e) {
            console.error('Error adding plan view image:', e);
          }
        }
        
        if (section) {
          try {
            // White background for image
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin + imgWidth + 4, diagramY - 1, imgWidth + 2, imgHeight + 2, 2, 2, 'F');
            doc.addImage(section, 'PNG', margin + imgWidth + 5, diagramY, imgWidth, imgHeight);
            // Frame around image
            doc.setDrawColor(52, 73, 94); // Dark blue-gray matching header
            doc.setLineWidth(0.5);
            doc.roundedRect(margin + imgWidth + 5, diagramY, imgWidth, imgHeight, 2, 2, 'S');
          } catch (e) {
            console.error('Error adding section view image:', e);
          }
        }
      }
    }
  });

  // Modern footer with gradient bar (on all pages)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer gradient bar
    doc.setFillColor(52, 73, 94);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    
    // Left: Date and project info
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} | Footing Reinforcement Design - SDM`, margin, pageHeight - 3);
    
    // Right: Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 3);
    
    doc.setTextColor(0, 0, 0);
  }

  // Save PDF
  const fileName = `All_Footings_Design_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
