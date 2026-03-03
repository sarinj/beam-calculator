import { jsPDF } from 'jspdf';
import type {
  CFSProAssembly,
  CFSProAnalysisParams,
  CFSProResults,
} from '@/types/cfs-pro';

// ============================================================
//  CFS PRO+ PDF EXPORT — AS/NZS 4600:2018
// ============================================================

const MARGIN = 15;
const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const CONTENT_W = PAGE_W - 2 * MARGIN;

// ── Helpers ──

function checkPage(doc: jsPDF, y: number, need = 20): number {
  if (y > PAGE_H - need) {
    doc.addPage();
    return 20;
  }
  return y;
}

function sectionHeader(doc: jsPDF, title: string, y: number, clause?: string): number {
  y = checkPage(doc, y, 16);
  doc.setFillColor(235, 240, 250);
  doc.rect(MARGIN, y - 4, CONTENT_W, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 60, 120);
  doc.text(title, MARGIN + 2, y + 2);
  if (clause) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(`[${clause}]`, MARGIN + 2 + doc.getTextWidth(title) + 6, y + 2);
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return y + 12;
}

function resultRow(
  doc: jsPDF,
  label: string,
  value: string | number,
  unit: string,
  y: number,
  highlight = false,
  status?: 'ok' | 'ng'
): number {
  y = checkPage(doc, y);
  if (highlight) {
    doc.setFillColor(230, 240, 255);
    doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  }
  if (status === 'ok') {
    doc.setFillColor(230, 255, 230);
    doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  } else if (status === 'ng') {
    doc.setFillColor(255, 230, 230);
    doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(label, MARGIN + 2, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const valStr = typeof value === 'number'
    ? (Math.abs(value) > 1e6 ? value.toExponential(3) : value.toFixed(3))
    : value;
  doc.text(`${valStr} ${unit}`, MARGIN + 100, y);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

function equationBlock(
  doc: jsPDF,
  label: string,
  formula: string,
  substitution: string,
  result: string,
  unit: string,
  y: number
): number {
  y = checkPage(doc, y, 24);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(label, MARGIN, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(formula, MARGIN + 4, y);
  y += 4;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(substitution, MARGIN + 4, y);
  y += 4;
  doc.setTextColor(0, 80, 180);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`= ${result} ${unit}`, MARGIN + 4, y);
  y += 7;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return y;
}

function fmtN(v: number, dp = 2): string {
  if (!isFinite(v)) return '∞';
  return Math.abs(v) > 1e6 ? v.toExponential(2) : v.toFixed(dp);
}

// ── Main export ──

export function exportCFSProPDF(
  assembly: CFSProAssembly,
  params: CFSProAnalysisParams,
  results: CFSProResults
): void {
  const doc = new jsPDF();
  let y = 20;

  // ========================= TITLE PAGE =========================
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 60, 120);
  doc.text('CFS PRO+ Design Report', MARGIN, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Cold-Formed Steel Structural Analysis — AS/NZS 4600:2018', MARGIN, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(`Assembly: ${assembly.name} (${assembly.preset}) | Generated: ${new Date().toLocaleString()}`, MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += 4;

  // Thin blue line
  doc.setDrawColor(60, 120, 220);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // ── Governing result hero ──
  const govLabel = results.governingMode === 'lateral-torsional' ? 'LTB' : results.governingMode;
  doc.setFillColor(results.interaction.isAdequate ? 230 : 255, results.interaction.isAdequate ? 255 : 230, results.interaction.isAdequate ? 230 : 230);
  doc.roundedRect(MARGIN, y - 4, CONTENT_W, 24, 2, 2, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(results.interaction.isAdequate ? 0 : 180, results.interaction.isAdequate ? 130 : 30, results.interaction.isAdequate ? 0 : 30);
  doc.text(results.interaction.isAdequate ? '✓ SECTION ADEQUATE' : '✗ SECTION INADEQUATE', MARGIN + 4, y + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Governing mode: ${govLabel}  |  φMn = ${fmtN(results.bending.phiMn)} kN·m  |  φVn = ${fmtN(results.shear.phiVn)} kN  |  φNc = ${fmtN(results.compression.phiNc)} kN`,
    MARGIN + 4,
    y + 15
  );
  y += 32;

  // ========================= 1. INPUT PARAMETERS =========================
  y = sectionHeader(doc, '1. Input Parameters', y);

  // Assembly info
  doc.setFontSize(9);
  doc.text(`Preset: ${assembly.preset}`, MARGIN, y); y += 5;
  doc.text(`Members: ${assembly.members.length}`, MARGIN, y);
  if (assembly.members.length > 1) {
    doc.text(`Connection: ${assembly.connectionType} @ ${assembly.fastenerSpacing} mm, capacity ${assembly.fastenerCapacity} kN`, MARGIN + 60, y);
  }
  y += 7;

  // Members table
  assembly.members.forEach((m, i) => {
    y = checkPage(doc, y, 20);
    const g = m.geometry;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${m.label} — ${m.sectionType}`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
    doc.setFontSize(8);
    doc.text(`d = ${g.d} mm  |  bf = ${g.bf} mm  |  t = ${g.t} mm  |  lip = ${g.lipLength} mm  |  r = ${g.radius} mm`, MARGIN + 4, y);
    y += 4;
    doc.text(`Offset: (${m.offsetX}, ${m.offsetY}) mm  |  Rotation: ${m.rotation}°  |  Mirror: ${m.mirrored ? 'Yes' : 'No'}`, MARGIN + 4, y);
    y += 7;
  });

  // Material
  y = sectionHeader(doc, '1.1 Material Properties', y, 'Cl. 1.5');
  const mat = params.material;
  const G = mat.E / (2 * (1 + mat.nu));
  y = resultRow(doc, 'Yield stress fy', mat.fy, 'MPa', y);
  y = resultRow(doc, 'Ultimate stress fu', mat.fu, 'MPa', y);
  y = resultRow(doc, "Young's modulus E", mat.E, 'MPa', y);
  y = resultRow(doc, "Poisson's ratio ν", mat.nu, '', y);
  y = resultRow(doc, 'Shear modulus G = E/[2(1+ν)]', fmtN(G, 0), 'MPa', y);
  y += 3;

  // Member parameters
  y = sectionHeader(doc, '1.2 Member & Loading', y, 'Cl. 3.3');
  y = resultRow(doc, 'Unbraced length Lb', params.Lb, 'mm', y);
  y = resultRow(doc, 'Compression length Lc', params.Lc, 'mm', y);
  y = resultRow(doc, 'Moment gradient factor Cb', params.Cb, '', y);
  y = resultRow(doc, 'Bending axis', params.bendingAxis, '', y);
  y = resultRow(doc, 'End condition', params.endCondition, '', y);
  y = resultRow(doc, 'Warping condition', params.warpingCondition, '', y);
  y += 3;
  y = resultRow(doc, 'M* (applied moment)', params.Mstar, 'kN·m', y);
  y = resultRow(doc, 'V* (applied shear)', params.Vstar, 'kN', y);
  y = resultRow(doc, 'N* (applied compression)', params.Nstar, 'kN', y);

  // ========================= 2. SECTION PROPERTIES =========================
  y = sectionHeader(doc, '2. Gross Section Properties', y, 'Cl. 2.1');
  const gp = results.sectionProps.gross;
  y = resultRow(doc, 'Ag (gross area)', fmtN(gp.Ag, 1), 'mm²', y);
  y = resultRow(doc, 'Ix (major MOI)', fmtN(gp.Ix, 0), 'mm⁴', y);
  y = resultRow(doc, 'Iy (minor MOI)', fmtN(gp.Iy, 0), 'mm⁴', y);
  y = resultRow(doc, 'Sx (section modulus)', fmtN(gp.Sx, 0), 'mm³', y);
  y = resultRow(doc, 'Sy (section modulus)', fmtN(gp.Sy, 0), 'mm³', y);
  y = resultRow(doc, 'rx (radius gyration)', fmtN(gp.rx, 2), 'mm', y);
  y = resultRow(doc, 'ry (radius gyration)', fmtN(gp.ry, 2), 'mm', y);
  y = resultRow(doc, 'J (torsion constant)', fmtN(gp.J, 1), 'mm⁴', y);
  y = resultRow(doc, 'Cw (warping constant)', fmtN(gp.Cw, 0), 'mm⁶', y);
  y = resultRow(doc, 'Centroid xc', fmtN(gp.xc, 2), 'mm', y);

  // Effective section
  y = sectionHeader(doc, '2.1 Effective Section Properties', y, 'Cl. 2.2');
  const ep = results.sectionProps.effective;
  y = resultRow(doc, 'Ae (effective area)', fmtN(ep.Ae, 1), 'mm²', y);
  y = resultRow(doc, 'Ixe (effective MOI)', fmtN(ep.Ixe, 0), 'mm⁴', y);
  y = resultRow(doc, 'Ze (effective modulus)', fmtN(ep.Ze, 0), 'mm³', y);

  // Principal axes
  y = sectionHeader(doc, '2.2 Principal Axes & Shear Center', y);
  const pa = results.sectionProps.principalAxes;
  y = resultRow(doc, 'I₁ (major principal)', fmtN(pa.I1, 0), 'mm⁴', y);
  y = resultRow(doc, 'I₂ (minor principal)', fmtN(pa.I2, 0), 'mm⁴', y);
  y = resultRow(doc, 'θ (principal angle)', fmtN(pa.theta, 2), '°', y);
  const sc = results.sectionProps.shearCenter;
  y = resultRow(doc, 'Shear center xs', fmtN(sc.xs, 2), 'mm', y);
  y = resultRow(doc, 'Shear center ys', fmtN(sc.ys, 2), 'mm', y);

  // ========================= 3. EWM =========================
  y = sectionHeader(doc, '3. Effective Width Method — Plate Elements', y, 'Cl. 2.2.1.2');
  results.sectionProps.plateElements.forEach((pe) => {
    y = checkPage(doc, y, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(pe.elementName, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
    y = resultRow(doc, '  w (flat width)', fmtN(pe.flatWidth, 1), 'mm', y);
    y = resultRow(doc, '  t (thickness)', fmtN(pe.thickness, 2), 'mm', y);
    y = resultRow(doc, '  k (plate buckling coeff.)', fmtN(pe.kPlate, 2), '', y);
    y = resultRow(doc, '  λ (slenderness)', fmtN(pe.slenderness, 3), '', y);
    y = resultRow(doc, '  ρ (reduction factor)', fmtN(pe.rho, 3), '', y, false, pe.isFullyEffective ? 'ok' : 'ng');
    y = resultRow(doc, '  b_eff (effective width)', fmtN(pe.effectiveWidth, 1), 'mm', y, !pe.isFullyEffective);
    y += 2;
  });

  // ========================= 4. BENDING =========================
  y = sectionHeader(doc, '4. Bending Capacity', y, 'Cl. 3.3');
  const b = results.bending;

  y = equationBlock(doc,
    'Yield Moment (My)',
    'My = Sx × fy',
    `My = ${fmtN(gp.Sx, 0)} × ${mat.fy} / 1e6`,
    fmtN(b.My),
    'kN·m', y
  );

  // Local
  y = sectionHeader(doc, '4.1 Local Buckling (EWM)', y, 'Cl. 3.3.2');
  y = equationBlock(doc,
    'Nominal moment (local)',
    'Mne = Ze × fy',
    `Mne = ${fmtN(ep.Ze, 0)} × ${mat.fy} / 1e6`,
    fmtN(b.Mne_local),
    'kN·m', y
  );

  // Distortional
  y = sectionHeader(doc, '4.2 Distortional Buckling (DSM)', y, 'Cl. 3.3.3');
  y = resultRow(doc, 'Mcr,d (critical)', fmtN(b.Mcr_dist), 'kN·m', y);
  y = resultRow(doc, 'λd = √(My/Mcr,d)', fmtN(b.lambdaD, 3), '', y);
  y = resultRow(doc, 'Lcrd (half-wavelength)', fmtN(b.Lcrd, 0), 'mm', y);
  y = resultRow(doc, 'Mne (distortional)', fmtN(b.Mne_distortional), 'kN·m', y, b.governingMode === 'distortional');

  // LTB
  y = sectionHeader(doc, '4.3 Lateral-Torsional Buckling', y, 'Cl. 3.3.3.2');
  y = resultRow(doc, 'Mo (elastic buckling)', isFinite(b.Mo) ? fmtN(b.Mo) : '∞', 'kN·m', y);
  y = resultRow(doc, 'Mne (LTB)', fmtN(b.Mne_ltb), 'kN·m', y, b.governingMode === 'lateral-torsional');

  // Governing
  y = sectionHeader(doc, '4.4 Governing Bending', y);
  y = resultRow(doc, `Mn = min(local, dist., LTB) [${b.governingMode}]`, fmtN(b.Mn), 'kN·m', y, true);
  y = resultRow(doc, 'φb', fmtN(b.phi_b, 2), '', y);
  y = resultRow(doc, 'φMn', fmtN(b.phiMn), 'kN·m', y, true);
  y = resultRow(doc, 'M*/φMn', fmtN(params.Mstar / (b.phiMn || 1), 3), '', y, false, params.Mstar <= b.phiMn ? 'ok' : 'ng');

  // ========================= 5. SHEAR =========================
  y = sectionHeader(doc, '5. Shear Capacity', y, 'Cl. 3.3.4');
  const sh = results.shear;
  y = resultRow(doc, 'Vy (yield shear)', fmtN(sh.Vy), 'kN', y);
  y = resultRow(doc, 'Vcr (critical shear)', fmtN(sh.Vcr), 'kN', y);
  y = resultRow(doc, 'λv', fmtN(sh.lambda_v, 3), '', y);
  y = resultRow(doc, 'Vn', fmtN(sh.Vn), 'kN', y, true);
  y = resultRow(doc, 'φv', fmtN(sh.phi_v, 2), '', y);
  y = resultRow(doc, 'φVn', fmtN(sh.phiVn), 'kN', y, true);
  y = resultRow(doc, 'V*/φVn', fmtN(params.Vstar / (sh.phiVn || 1), 3), '', y, false, params.Vstar <= sh.phiVn ? 'ok' : 'ng');

  // Shear regime note
  y = checkPage(doc, y, 10);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const regime = sh.lambda_v <= 0.815 ? 'Shear yielding (λv ≤ 0.815)'
    : sh.lambda_v <= 1.227 ? 'Inelastic shear buckling (0.815 < λv ≤ 1.227)'
    : 'Elastic shear buckling (λv > 1.227)';
  doc.text(`Regime: ${regime}`, MARGIN + 2, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // ========================= 6. COMPRESSION =========================
  y = sectionHeader(doc, '6. Compression Capacity', y, 'Cl. 3.4');
  const comp = results.compression;
  y = resultRow(doc, 'fox (flexural X)', fmtN(comp.fox), 'MPa', y);
  y = resultRow(doc, 'foy (flexural Y)', fmtN(comp.foy), 'MPa', y);
  y = resultRow(doc, 'foc (governing)', fmtN(comp.foc), 'MPa', y, true);
  y = resultRow(doc, 'λc', fmtN(comp.lambda_c, 3), '', y);
  y = resultRow(doc, 'fn', fmtN(comp.fn), 'MPa', y);
  y = resultRow(doc, 'Ny (squash)', fmtN(comp.Ny), 'kN', y);
  y = resultRow(doc, 'Noc (elastic buckling)', fmtN(comp.Noc), 'kN', y);
  y = resultRow(doc, 'Nc', fmtN(comp.Nc), 'kN', y, true);
  y = resultRow(doc, 'φc', fmtN(comp.phi_c, 2), '', y);
  y = resultRow(doc, 'φNc', fmtN(comp.phiNc), 'kN', y, true);
  y = resultRow(doc, 'N*/φNc', fmtN(params.Nstar / (comp.phiNc || 1), 3), '', y, false, params.Nstar <= comp.phiNc ? 'ok' : 'ng');

  // ========================= 7. INTERACTION =========================
  y = sectionHeader(doc, '7. Interaction Check', y, 'Cl. 3.3.5, 3.5');
  const ix = results.interaction;
  y = resultRow(doc, 'M*/φMn (bending ratio)', fmtN(ix.bendingRatio, 3), '', y, false, ix.bendingRatio <= 1 ? 'ok' : 'ng');
  y = resultRow(doc, 'V*/φVn (shear ratio)', fmtN(ix.shearRatio, 3), '', y, false, ix.shearRatio <= 1 ? 'ok' : 'ng');
  y = resultRow(doc, '(M*/φMn)² + (V*/φVn)² (circular)', fmtN(ix.interactionCircular, 3), '', y, true, ix.interactionCircular <= 1 ? 'ok' : 'ng');
  y = resultRow(doc, 'M*/φMn + V*/φVn (linear)', fmtN(ix.interactionLinear, 3), '', y, false, ix.interactionLinear <= 1 ? 'ok' : 'ng');

  if (params.Nstar > 0) {
    y = resultRow(doc, 'N*/φNc (compression ratio)', fmtN(ix.compressionRatio, 3), '', y, false, ix.compressionRatio <= 1 ? 'ok' : 'ng');
    y = resultRow(doc, 'N*/φNc + M*/φMn (combined)', fmtN(ix.interactionCombined, 3), '', y, true, ix.interactionCombined <= 1 ? 'ok' : 'ng');
  }

  // Big adequacy box
  y = checkPage(doc, y, 18);
  y += 3;
  doc.setFillColor(ix.isAdequate ? 220 : 255, ix.isAdequate ? 255 : 220, ix.isAdequate ? 220 : 220);
  doc.roundedRect(MARGIN, y - 4, CONTENT_W, 14, 2, 2, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(ix.isAdequate ? 0 : 180, ix.isAdequate ? 120 : 30, ix.isAdequate ? 0 : 30);
  doc.text(ix.isAdequate ? '✓  SECTION ADEQUATE' : '✗  SECTION NOT ADEQUATE', MARGIN + 4, y + 6);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 20;

  // ========================= 8. FEM (if enabled) =========================
  if (results.fem) {
    y = sectionHeader(doc, '8. FEM Eigenvalue Buckling Analysis', y);
    const fem = results.fem;
    y = resultRow(doc, 'Converged', fem.converged ? 'Yes' : 'No', '', y, false, fem.converged ? 'ok' : 'ng');
    y = resultRow(doc, 'Mesh nodes', String(fem.meshNodes), '', y);
    y = resultRow(doc, 'Mesh elements', String(fem.meshElements), '', y);
    y += 3;

    y = sectionHeader(doc, '8.1 Buckling Modes', y);
    fem.eigenvalues.forEach((ev, i) => {
      y = resultRow(doc, `Mode ${i + 1}: ${fem.bucklingModes[i] || 'Unknown'}`, fmtN(ev), 'kN·m', y, i === 0);
    });
    y += 3;

    y = sectionHeader(doc, '8.2 Nonlinear Capacity', y);
    y = resultRow(doc, 'Ultimate capacity (FEM)', fmtN(fem.ultimateCapacity), 'kN·m', y, true);
    y = resultRow(doc, 'FEM / EWM ratio', fmtN(fem.ewmComparison, 3), '', y);
    y = resultRow(doc, 'FEM / DSM ratio', fmtN(fem.dsmComparison, 3), '', y);

    y = checkPage(doc, y, 12);
    doc.setFontSize(8);
    doc.setTextColor(60, 100, 180);
    doc.text(`Note: FEM includes imperfection L/${params.fem.imperfection}. ${params.fem.nonlinear ? 'Geometric nonlinear analysis with incremental loading.' : 'Linear eigenvalue analysis only.'}`, MARGIN, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // ========================= FOOTER =========================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `CFS PRO+ — AS/NZS 4600:2018 Design Report  |  Page ${i} of ${pageCount}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: 'center' }
    );
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      PAGE_W - MARGIN,
      PAGE_H - 8,
      { align: 'right' }
    );
  }

  // ── Download ──
  const filename = `CFS-PRO-${assembly.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
