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
