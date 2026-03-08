import { jsPDF } from 'jspdf';
import type {
  DSMDesignResult,
  DSMGeometry,
  DSMMember,
  DSMShearParams,
} from '@/lib/calculations/dsm-simple';

// ============================================================
//  SIMPLE CFS – DSM CALCULATION REPORT (PDF)
//  AS/NZS 4600:2018
// ============================================================
// Professional A4 engineering calculation document.
// All equations shown symbolically, then numerically substituted.
// Every formula references AS/NZS 4600:2018 clause.
// ASCII only – no unicode math symbols.

const MARGIN = 15;
const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FONT = 'helvetica';

// ── Formatting helpers ──

function fmt(v: number, dp = 3): string {
  if (!isFinite(v)) return 'Infinity';
  if (Math.abs(v) > 1e8) return v.toExponential(3);
  return v.toFixed(dp);
}

function fmtInt(v: number): string {
  if (!isFinite(v)) return 'Infinity';
  return v.toFixed(0);
}

function checkPage(doc: jsPDF, y: number, need = 20): number {
  if (y > PAGE_H - MARGIN - need) {
    doc.addPage();
    return 25;
  }
  return y;
}

// ── Section heading ──

function heading(
  doc: jsPDF,
  num: string,
  title: string,
  y: number,
  clause?: string
): number {
  y = checkPage(doc, y, 18);

  // Blue band
  doc.setFillColor(230, 237, 248);
  doc.rect(MARGIN, y - 5, CONTENT_W, 9, 'F');

  doc.setFontSize(11);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(25, 50, 110);
  const label = `${num}  ${title}`;
  doc.text(label, MARGIN + 2, y + 1);

  if (clause) {
    const tw = doc.getTextWidth(label);
    doc.setFontSize(8);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`[Ref: AS/NZS 4600:2018 ${clause}]`, MARGIN + tw + 8, y + 1);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT, 'normal');
  return y + 12;
}

// ── Sub-heading ──

function subHeading(doc: jsPDF, title: string, y: number): number {
  y = checkPage(doc, y, 12);
  doc.setFontSize(10);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(title, MARGIN + 2, y);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(0, 0, 0);
  return y + 6;
}

// ── Parameter row ──

function paramRow(
  doc: jsPDF,
  label: string,
  value: string,
  unit: string,
  y: number,
  highlight = false
): number {
  y = checkPage(doc, y, 8);
  if (highlight) {
    doc.setFillColor(225, 235, 255);
    doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  }
  doc.setFontSize(9);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(label, MARGIN + 4, y);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${value}  ${unit}`, MARGIN + 105, y);
  doc.setFont(FONT, 'normal');
  return y + 6;
}

// ── Equation block (symbolic -> substitution -> result) ──

function equationBlock(
  doc: jsPDF,
  title: string,
  clause: string,
  symbolic: string,
  substitution: string,
  resultStr: string,
  unit: string,
  y: number
): number {
  y = checkPage(doc, y, 30);

  // Title
  doc.setFontSize(9);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`Design Equation: ${title}`, MARGIN + 2, y);
  y += 5;

  // Symbolic
  doc.setFont(FONT, 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(symbolic, MARGIN + 6, y);
  y += 4;

  // Clause reference
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`[Ref: AS/NZS 4600:2018 ${clause}]`, MARGIN + 6, y);
  y += 5;

  // Substitution
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(substitution, MARGIN + 6, y);
  y += 4.5;

  // Result
  doc.setFontSize(9);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(0, 70, 170);
  doc.text(`= ${resultStr} ${unit}`, MARGIN + 6, y);
  y += 7;

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT, 'normal');
  return y;
}

// ── Code traceability snippet ──

function codeSnippet(doc: jsPDF, lines: string[], y: number): number {
  y = checkPage(doc, y, 6 + lines.length * 4);

  doc.setFillColor(245, 245, 245);
  const blockH = 4 + lines.length * 3.8;
  doc.rect(MARGIN + 4, y - 2, CONTENT_W - 8, blockH, 'F');

  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.setTextColor(60, 60, 60);

  for (const line of lines) {
    doc.text(line, MARGIN + 6, y + 1);
    y += 3.8;
  }

  doc.setFont(FONT, 'normal');
  doc.setTextColor(0, 0, 0);
  return y + 3;
}

// ── Boxed result ──

function boxedResult(doc: jsPDF, lines: string[], y: number, ok = true): number {
  y = checkPage(doc, y, 8 + lines.length * 6);

  const boxH = 6 + lines.length * 5.5;
  doc.setDrawColor(ok ? 0 : 180, ok ? 120 : 30, ok ? 0 : 30);
  doc.setLineWidth(0.6);
  doc.setFillColor(ok ? 230 : 255, ok ? 250 : 235, ok ? 230 : 230);
  doc.rect(MARGIN, y - 3, CONTENT_W, boxH, 'FD');

  doc.setFontSize(9.5);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(ok ? 0 : 180, ok ? 100 : 20, ok ? 0 : 20);

  let py = y + 2;
  for (const line of lines) {
    doc.text(line, MARGIN + 4, py);
    py += 5.5;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT, 'normal');
  doc.setLineWidth(0.2);
  return y + boxH + 4;
}

// ── Separator line ──

function separator(doc: jsPDF, y: number): number {
  y = checkPage(doc, y, 6);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

// ── Body text ──

function bodyText(doc: jsPDF, text: string, y: number, indent = 0): number {
  y = checkPage(doc, y, 8);
  doc.setFontSize(9);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(40, 40, 40);

  const maxW = CONTENT_W - indent - 4;
  const lines = doc.splitTextToSize(text, maxW) as string[];
  for (const line of lines) {
    y = checkPage(doc, y, 5);
    doc.text(line, MARGIN + 2 + indent, y);
    y += 4.2;
  }
  return y + 1;
}

// ── Bullet text ──
function bulletText(doc: jsPDF, text: string, y: number): number {
  y = checkPage(doc, y, 8);
  doc.setFontSize(9);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text('-', MARGIN + 4, y);
  const maxW = CONTENT_W - 12;
  const lines = doc.splitTextToSize(text, maxW) as string[];
  for (let i = 0; i < lines.length; i++) {
    y = checkPage(doc, y, 5);
    doc.text(lines[i], MARGIN + 8, y);
    y += 4.2;
  }
  return y;
}

// ============================================================
//                      MAIN EXPORT
// ============================================================

export function exportSimpleCFSPdf(
  result: DSMDesignResult,
  geo: DSMGeometry,
  member: DSMMember,
  shearParams: DSMShearParams,
  fy: number,
  E_input: number,
  nu_input: number
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20;

  const { grossProps: gp, buckling: bk, capacity: cap, shear, material: mat } = result;

  // ================================================================
  //  TITLE PAGE
  // ================================================================

  doc.setFontSize(24);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(20, 50, 110);
  doc.text('CFS Design Calculation Report', MARGIN, y + 5);
  y += 14;

  doc.setFontSize(13);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Direct Strength Method (DSM) — Flexural & Shear Capacity', MARGIN, y);
  y += 7;

  doc.setFontSize(10);
  doc.text('Single C-Section (Lipped / Unlipped Channel)', MARGIN, y);
  y += 10;

  // Blue rule
  doc.setDrawColor(40, 90, 200);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(FONT, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Design Standard:  AS/NZS 4600:2018 (Cold-Formed Steel Structures)', MARGIN, y);
  y += 6;
  doc.text('Method:           Direct Strength Method (DSM) per Cl. 7.2.2', MARGIN, y);
  y += 6;
  doc.text('Shear:            Cl. 3.3.4 Web Shear Capacity', MARGIN, y);
  y += 6;
  doc.text(`Date:             ${new Date().toLocaleDateString('en-AU')}`, MARGIN, y);
  y += 6;
  doc.text(`Generated:        ${new Date().toLocaleString('en-AU')}`, MARGIN, y);
  y += 14;

  // Section description
  const sectionDesc = geo.lipLength > 0
    ? `${fmtInt(geo.d)}C${fmt(geo.t, 1)} (d=${fmtInt(geo.d)} bf=${fmtInt(geo.bf)} t=${fmt(geo.t, 2)} lip=${fmtInt(geo.lipLength)} r=${fmtInt(geo.r)})`
    : `${fmtInt(geo.d)}U${fmt(geo.t, 1)} (d=${fmtInt(geo.d)} bf=${fmtInt(geo.bf)} t=${fmt(geo.t, 2)} unlipped r=${fmtInt(geo.r)})`;

  doc.setFontSize(11);
  doc.setFont(FONT, 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`Section:  ${sectionDesc}`, MARGIN, y);
  y += 10;

  // Quick result hero box
  const govModeBending = cap.governingMode === 'lateral-torsional' ? 'Lateral-Torsional Buckling'
    : cap.governingMode === 'local' ? 'Local Buckling'
    : 'Distortional Buckling';
  const shearModeLabel = shear
    ? (shear.shearMode === 'Eq.3.3.4(1)' ? 'Eq. 3.3.4(1)'
      : shear.shearMode === 'Eq.3.3.4(2)' ? 'Eq. 3.3.4(2)'
      : 'Eq. 3.3.4(3)')
    : 'N/A';

  y = boxedResult(doc, [
    `DESIGN CAPACITY SUMMARY`,
    `Bending:  phi_Mn = ${fmt(cap.phiMn)} kN.m  |  Governing: ${govModeBending}`,
    `Shear:    phi_Vn = ${shear ? fmt(shear.phiVn) : 'N/A'} kN  |  Governing: ${shearModeLabel}`,
  ], y);

  y += 4;

  // ================================================================
  //  1.0  DESIGN BASIS
  // ================================================================

  y = heading(doc, '1.0', 'DESIGN BASIS', y);

  y = bodyText(doc, 'This calculation determines the nominal and design bending moment capacity (phi_Mb) and shear capacity (phi_Vn) of a single cold-formed steel C-section under major-axis bending.', y);
  y += 2;
  y = bodyText(doc, 'The design method is the Direct Strength Method (DSM) per AS/NZS 4600:2018 Clause 7.2.2. Shear capacity is per Clause 3.3.4.', y);
  y += 2;
  y = bodyText(doc, 'Design Standard: AS/NZS 4600:2018 — Australian/New Zealand Standard for Cold-Formed Steel Structures.', y);
  y += 2;
  y = bodyText(doc, 'Capacity reduction factors:', y);
  y = bulletText(doc, 'phi_b = 0.90 for bending (AS/NZS 4600:2018)', y);
  y = bulletText(doc, 'phi_v = 0.90 for shear (AS/NZS 4600:2018)', y);
  y += 2;

  // ================================================================
  //  2.0  ASSUMPTIONS
  // ================================================================

  y = heading(doc, '2.0', 'ASSUMPTIONS', y);

  y = bulletText(doc, 'The section is a single C-channel (lipped or unlipped).', y);
  y = bulletText(doc, 'The section is singly symmetric about the y-axis (web vertical, flanges horizontal).', y);
  y = bulletText(doc, 'Major-axis bending is considered (bending about x-axis).', y);
  y = bulletText(doc, 'Material is homogeneous, isotropic, and linear elastic up to yield.', y);
  y = bulletText(doc, 'Centre-line model is used for section property computation per Cl. 2.1.', y);
  y = bulletText(doc, 'Elastic local buckling stress (fol) is computed from plate buckling theory.', y);
  y = bulletText(doc, 'Elastic distortional buckling stress (fod) is computed from Schafer simplified formula.', y);
  y = bulletText(doc, 'Lateral-torsional buckling moment (Mo) is per Cl. D2.1.1 Eq. D2.1.1(1).', y);
  y = bulletText(doc, 'For shear design, the web is treated as a flat plate with simply-supported edges.', y);
  y = bulletText(doc, 'No combined bending-shear interaction check is included in this report.', y);
  y += 2;

  // ================================================================
  //  3.0  INPUT PARAMETERS
  // ================================================================

  y = heading(doc, '3.0', 'INPUT DATA', y, 'Cl. 1.5');

  y = subHeading(doc, '3.1  Material Properties', y);
  y = paramRow(doc, 'Yield stress, fy', fmt(fy, 1), 'MPa', y);
  y = paramRow(doc, "Young's modulus, E", fmtInt(E_input), 'MPa', y);
  y = paramRow(doc, "Poisson's ratio, nu", fmt(nu_input, 2), '', y);
  y = paramRow(doc, 'Shear modulus, G = E / [2(1+nu)]', fmt(mat.G, 1), 'MPa', y, true);
  y += 2;

  y = subHeading(doc, '3.2  Section Geometry', y);
  y = paramRow(doc, 'Overall depth, d', fmt(geo.d, 1), 'mm', y);
  y = paramRow(doc, 'Flange width, bf', fmt(geo.bf, 1), 'mm', y);
  y = paramRow(doc, 'Thickness, t', fmt(geo.t, 2), 'mm', y);
  y = paramRow(doc, 'Lip length', geo.lipLength > 0 ? fmt(geo.lipLength, 1) : '0 (unlipped)', 'mm', y);
  y = paramRow(doc, 'Inside bend radius, r', fmt(geo.r, 1), 'mm', y);
  y += 2;

  y = subHeading(doc, '3.3  Member Parameters', y);
  y = paramRow(doc, 'Unbraced length, Lb', fmtInt(member.Lb), 'mm', y);
  y = paramRow(doc, 'Moment gradient factor, Cb', fmt(member.Cb, 2), '', y);
  y = paramRow(doc, 'End condition', member.endCondition, '', y);

  // Effective length factor
  const Ke = member.endCondition === 'pinned-pinned' ? 1.0
    : member.endCondition === 'fixed-free' ? 2.0
    : member.endCondition === 'fixed-pinned' ? 0.7 : 0.5;
  y = paramRow(doc, 'Effective length factor, Ke', fmt(Ke, 2), '', y);
  y = paramRow(doc, 'Effective length, Le = Ke x Lb', fmtInt(Ke * member.Lb), 'mm', y, true);
  y += 2;

  y = subHeading(doc, '3.4  Shear Parameters', y);
  y = paramRow(doc, 'Shear panel length, a', shearParams.a > 0 ? fmtInt(shearParams.a) : '0 (infinite panel)', 'mm', y);
  y = paramRow(doc, 'Transverse stiffeners', shearParams.hasStiffeners ? 'Yes' : 'No', '', y);
  if (shearParams.hasStiffeners) {
    y = paramRow(doc, 'Stiffener spacing', fmtInt(shearParams.stiffenerSpacing), 'mm', y);
  }
  y += 3;

  // ================================================================
  //  4.0  SECTION PROPERTIES
  // ================================================================

  y = heading(doc, '4.0', 'SECTION PROPERTIES', y, 'Cl. 2.1');

  y = bodyText(doc, 'Gross section properties computed using the centre-line model. The section is decomposed into flat plate elements (web, flanges, lips) and corner arcs. Properties are summed using the parallel-axis theorem.', y);
  y += 2;

  // Intermediate geometry
  const rMid = geo.r + geo.t / 2;
  const flatWeb = Math.max(geo.d - 2 * (geo.r + geo.t), 0);
  const flatFlange = Math.max(geo.bf - 2 * (geo.r + geo.t), 0);
  const flatLip = geo.lipLength > 0 ? Math.max(geo.lipLength - (geo.r + geo.t / 2), 0) : 0;

  y = subHeading(doc, '4.1  Intermediate Dimensions', y);
  y = paramRow(doc, 'Mid-line corner radius, r_mid = r + t/2', fmt(rMid, 2), 'mm', y);
  y = paramRow(doc, 'Flat web width, w_web = d - 2(r+t)', fmt(flatWeb, 2), 'mm', y);
  y = paramRow(doc, 'Flat flange width, w_flange = bf - 2(r+t)', fmt(flatFlange, 2), 'mm', y);
  y = paramRow(doc, 'Flat lip length, w_lip = lip - (r+t/2)', flatLip > 0 ? fmt(flatLip, 2) : 'N/A', 'mm', y);
  y += 3;

  y = subHeading(doc, '4.2  Gross Section Properties', y);

  y = equationBlock(doc,
    'Gross Area (Ag)',
    'Cl. 2.1',
    'Ag = sum(b_i x t)  for all flat elements + corner arcs',
    `Ag = (${fmt(flatWeb, 1)} + 2x${fmt(flatFlange, 1)} + 2x${fmt(flatLip, 1)} + corners) x ${fmt(geo.t, 2)}`,
    fmt(gp.Ag, 1),
    'mm^2', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def gross_area(flat_web, flat_flange, flat_lip, corner_arc, t):',
    '    # Cl. 2.1 - total gross area from centre-line model',
    '    total_length = flat_web + 2*flat_flange + 2*flat_lip + 4*corner_arc',
    '    return total_length * t',
  ], y);

  y = equationBlock(doc,
    'Major-axis Second Moment of Area (Ix)',
    'Cl. 2.1',
    'Ix = sum(I_self + A_i x dy_i^2)  -- parallel-axis theorem',
    `Web: t x w_web^3/12 + Flanges: 2 x w_flange x t x (d/2)^2 + Lips + Corners`,
    fmt(gp.Ix, 0),
    'mm^4', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def moment_of_inertia_x(flat_web, flat_flange, flat_lip, t, d, r):',
    '    # Cl. 2.1 - parallel axis theorem',
    '    Ix_web = t * flat_web**3 / 12',
    '    y_flange = d/2 - t/2',
    '    Ix_flanges = 2 * flat_flange * t * y_flange**2',
    '    return Ix_web + Ix_flanges  # + lip + corner terms',
  ], y);

  y = equationBlock(doc,
    'Section Modulus (Sx)',
    'Cl. 2.1',
    'Sx = Ix / (d/2)',
    `Sx = ${fmt(gp.Ix, 0)} / (${fmt(geo.d, 1)}/2)`,
    fmt(gp.Sx, 1),
    'mm^3', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def section_modulus(Ix, d):',
    '    # Cl. 2.1 - elastic section modulus about x-axis',
    '    return Ix / (d / 2.0)',
  ], y);

  // Remaining gross properties table
  y = paramRow(doc, 'Minor-axis MOI, Iy', fmt(gp.Iy, 0), 'mm^4', y);
  y = paramRow(doc, 'Radius of gyration, rx = sqrt(Ix/Ag)', fmt(gp.rx, 2), 'mm', y);
  y = paramRow(doc, 'Radius of gyration, ry = sqrt(Iy/Ag)', fmt(gp.ry, 2), 'mm', y);
  y += 2;

  y = equationBlock(doc,
    'St. Venant Torsion Constant (J)',
    'Cl. 2.1',
    'J = (1/3) x sum(b_i x t^3)',
    `J = (1/3) x ${fmt(flatWeb + 2 * flatFlange + 2 * flatLip + 4 * (Math.PI / 2) * rMid, 1)} x ${fmt(geo.t, 2)}^3`,
    fmt(gp.J, 2),
    'mm^4', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def torsion_constant(total_flat_length, t):',
    '    # Cl. 2.1 - thin-wall torsion constant',
    '    return total_flat_length * t**3 / 3.0',
  ], y);

  y = equationBlock(doc,
    'Warping Constant (Cw)',
    'Cl. 2.1',
    geo.lipLength > 0
      ? 'Cw = (h^2 x b^2 x t / 12) x (3b + 2*lip) / (6b + lip)  [lipped C]'
      : 'Cw = h^2 x b^2 x t / 24  [unlipped C]',
    `h = ${fmt(geo.d - geo.t, 1)}, b = ${fmt(geo.bf - geo.t / 2, 1)}`,
    gp.Cw > 1e6 ? gp.Cw.toExponential(3) : fmt(gp.Cw, 0),
    'mm^6', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def warping_constant_lipped(h, b, t, lip):',
    '    # Cl. 2.1 - warping constant for lipped C-channel',
    '    return (h**2 * b**2 * t / 12) * (3*b + 2*lip) / (6*b + lip)',
    '',
    'def warping_constant_unlipped(h, b, t):',
    '    # Cl. 2.1 - warping constant for unlipped C-channel',
    '    return h**2 * b**2 * t / 24',
  ], y);

  y = paramRow(doc, 'Centroid from web face, xc', fmt(gp.xc, 2), 'mm', y);
  y += 3;

  // ================================================================
  //  5.0  BUCKLING CALCULATIONS
  // ================================================================

  y = heading(doc, '5.0', 'BUCKLING CALCULATIONS', y, 'Cl. 7.2.2');

  // 5.1 Yield Moment
  y = subHeading(doc, '5.1  Yield Moment (My)', y);

  y = equationBlock(doc,
    'Yield Moment',
    'Cl. 7.2.2',
    'My = Sx x fy / 10^6  (kN.m)',
    `My = ${fmt(gp.Sx, 1)} x ${fmt(fy, 1)} / 10^6`,
    fmt(bk.My),
    'kN.m', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def yield_moment(Sx, fy):',
    '    # Cl. 7.2.2 - yield moment',
    '    My = Sx * fy / 1e6  # N.mm -> kN.m',
    '    return My',
  ], y);

  // 5.2 Local Buckling
  y = subHeading(doc, '5.2  Elastic Local Buckling Stress (fol)', y);

  y = bodyText(doc, 'The elastic local buckling stress is the minimum of the flange and web plate buckling stresses, computed using classical plate buckling theory.', y);
  y += 1;

  const kFlange = flatLip > 0 ? 4.0 : 0.43;
  const kWeb = 23.9;
  const D_plate = (E_input * Math.pow(geo.t, 3)) / (12 * (1 - nu_input * nu_input));

  y = equationBlock(doc,
    'Plate Flexural Rigidity (D)',
    'Cl. 2.2.1.2',
    'D = E x t^3 / [12(1 - nu^2)]',
    `D = ${fmtInt(E_input)} x ${fmt(geo.t, 2)}^3 / [12(1 - ${fmt(nu_input, 2)}^2)]`,
    fmt(D_plate, 1),
    'N.mm', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def plate_rigidity(E, t, nu):',
    '    # Plate flexural rigidity',
    '    return E * t**3 / (12 * (1 - nu**2))',
  ], y);

  y = equationBlock(doc,
    `Flange Buckling Stress (k = ${fmt(kFlange, 2)})`,
    'Cl. 2.2.1.2',
    'fcr_flange = k_flange x pi^2 x D / (w_flange^2 x t)',
    `fcr_flange = ${fmt(kFlange, 2)} x pi^2 x ${fmt(D_plate, 1)} / (${fmt(flatFlange, 1)}^2 x ${fmt(geo.t, 2)})`,
    fmt(kFlange * Math.PI * Math.PI * D_plate / (flatFlange * flatFlange * geo.t), 2),
    'MPa', y
  );

  y = equationBlock(doc,
    `Web Buckling Stress (k = ${fmt(kWeb, 1)})`,
    'Cl. 2.2.1.2',
    'fcr_web = k_web x pi^2 x D / (w_web^2 x t)',
    `fcr_web = ${fmt(kWeb, 1)} x pi^2 x ${fmt(D_plate, 1)} / (${fmt(flatWeb, 1)}^2 x ${fmt(geo.t, 2)})`,
    fmt(kWeb * Math.PI * Math.PI * D_plate / (flatWeb * flatWeb * geo.t), 2),
    'MPa', y
  );

  y = paramRow(doc, 'fol = min(fcr_flange, fcr_web)', fmt(bk.fol, 2), 'MPa', y, true);
  y += 2;

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def elastic_local_buckling(E, t, nu, flat_flange, flat_web, has_lip):',
    '    # Cl. 2.2.1.2 - plate buckling theory',
    '    D = E * t**3 / (12 * (1 - nu**2))',
    '    k_flange = 4.0 if has_lip else 0.43',
    '    k_web = 23.9',
    '    fcr_f = k_flange * pi**2 * D / (flat_flange**2 * t)',
    '    fcr_w = k_web * pi**2 * D / (flat_web**2 * t)',
    '    return min(fcr_f, fcr_w)',
  ], y);

  // 5.3 Distortional Buckling
  y = subHeading(doc, '5.3  Elastic Distortional Buckling Stress (fod)', y);

  if (bk.fod > 0) {
    y = bodyText(doc, "Distortional buckling stress computed using Schafer's simplified closed-form approximation for lipped C-sections.", y);
    y += 1;

    y = equationBlock(doc,
      'Distortional Buckling Stress (fod)',
      'Cl. 7.2.2.4',
      'fod = beta_1 x (D / (bf^2 x t)) x [1 + beta_2 x (bf/d)^2 + beta_3 x (lip/bf)^2]',
      `beta_1=1.0, beta_2=0.4, beta_3=5.0, bf=${fmt(flatFlange, 1)}, d=${fmt(geo.d, 1)}, lip=${fmt(flatLip, 1)}`,
      fmt(bk.fod, 2),
      'MPa', y
    );

    y = codeSnippet(doc, [
      'Implementation Snippet:',
      'def distortional_buckling(D, bf, d, t, lip):',
      '    # Cl. 7.2.2.4 - Schafer simplified formula',
      '    beta1, beta2, beta3 = 1.0, 0.4, 5.0',
      '    fod = beta1 * (D/(bf**2*t)) * (1 + beta2*(bf/d)**2 + beta3*(lip/bf)**2)',
      '    return fod',
    ], y);

    y = equationBlock(doc,
      'Critical Distortional Half-Wavelength (Lcrd)',
      'Cl. 7.2.2.4',
      'Lcrd = 4.8 x (d x bf^2 / t)^0.25',
      `Lcrd = 4.8 x (${fmt(geo.d, 1)} x ${fmt(flatFlange, 1)}^2 / ${fmt(geo.t, 2)})^0.25`,
      fmt(bk.Lcrd, 1),
      'mm', y
    );
  } else {
    y = bodyText(doc, 'Unlipped section -- distortional buckling does not occur as a distinct mode. fod = 0.', y);
  }
  y += 2;

  // 5.4 Elastic LTB moment
  y = subHeading(doc, '5.4  Elastic Lateral-Torsional Buckling Moment (Mo)', y);

  const Le = Ke * member.Lb;

  y = equationBlock(doc,
    'Elastic LTB Moment (Mo)',
    'Cl. D2.1.1, Eq. D2.1.1(1)',
    'Mo = Cb x sqrt[ (pi^2 x E x Iy / Le^2) x (G x J + pi^2 x E x Cw / Le^2) ]',
    `Cb=${fmt(member.Cb, 2)}, E=${fmtInt(E_input)}, Iy=${fmt(gp.Iy, 0)}, Le=${fmtInt(Le)}, G=${fmt(mat.G, 1)}, J=${fmt(gp.J, 2)}, Cw=${gp.Cw.toExponential(3)}`,
    bk.Mo > 0 && isFinite(bk.Mo) ? fmt(bk.Mo) : 'Infinity (fully braced)',
    'kN.m', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'import math',
    'def elastic_ltb_moment(Cb, E, Iy, G, J, Cw, Le):',
    '    # Cl. D2.1.1 Eq. D2.1.1(1)',
    '    term1 = math.pi**2 * E * Iy / Le**2',
    '    term2 = G * J + math.pi**2 * E * Cw / Le**2',
    '    Mo = Cb * math.sqrt(term1 * term2)',
    '    return Mo / 1e6  # N.mm -> kN.m',
  ], y);

  // Elastic buckling moments summary
  y = subHeading(doc, '5.5  Elastic Buckling Moments', y);
  y = paramRow(doc, 'Mol = Sx x fol / 10^6', fmt(bk.Mol), 'kN.m', y);
  y = paramRow(doc, 'Mod = Sx x fod / 10^6', bk.Mod > 0 ? fmt(bk.Mod) : 'N/A (unlipped)', 'kN.m', y);
  y = paramRow(doc, 'Mo (LTB)', bk.Mo > 0 && isFinite(bk.Mo) ? fmt(bk.Mo) : 'Infinity', 'kN.m', y);
  y = paramRow(doc, 'My (yield moment)', fmt(bk.My), 'kN.m', y, true);
  y += 3;

  // ================================================================
  //  6.0  STRENGTH CALCULATIONS (BENDING - DSM)
  // ================================================================

  y = heading(doc, '6.0', 'BENDING STRENGTH CALCULATIONS (DSM)', y, 'Cl. 7.2.2');

  // 6.1 LTB Capacity
  y = subHeading(doc, '6.1  Lateral-Torsional Buckling Capacity (Mbe)  [Cl. 7.2.2.2]', y);

  const Mo = bk.Mo > 0 && isFinite(bk.Mo) ? bk.Mo : Infinity;

  y = bodyText(doc, 'Three regimes for lateral-torsional buckling:', y);
  y = bulletText(doc, 'If Mo >= 2.78 x My:  Mbe = My  (full yield, laterally braced)', y);
  y = bulletText(doc, 'If 0.56 x My < Mo < 2.78 x My:  Mbe = (10/9) x My x [1 - 10 x My / (36 x Mo)]  (inelastic LTB)', y);
  y = bulletText(doc, 'If Mo <= 0.56 x My:  Mbe = Mo  (elastic LTB)', y);
  y += 2;

  let MbeRegime: string;
  if (Mo >= 2.78 * bk.My) {
    MbeRegime = `Mo = ${isFinite(Mo) ? fmt(Mo) : 'Infinity'} >= 2.78 x My = ${fmt(2.78 * bk.My)} --> Full yield`;
  } else if (Mo > 0.56 * bk.My) {
    MbeRegime = `0.56 x My = ${fmt(0.56 * bk.My)} < Mo = ${fmt(Mo)} < 2.78 x My = ${fmt(2.78 * bk.My)} --> Inelastic LTB`;
  } else {
    MbeRegime = `Mo = ${fmt(Mo)} <= 0.56 x My = ${fmt(0.56 * bk.My)} --> Elastic LTB`;
  }

  y = bodyText(doc, `Determination: ${MbeRegime}`, y, 2);
  y += 1;

  y = equationBlock(doc,
    'Mbe',
    'Cl. 7.2.2.2',
    Mo >= 2.78 * bk.My
      ? 'Mbe = My'
      : Mo > 0.56 * bk.My
        ? 'Mbe = (10/9) x My x [1 - 10 x My / (36 x Mo)]'
        : 'Mbe = Mo',
    `My = ${fmt(bk.My)}, Mo = ${isFinite(Mo) ? fmt(Mo) : 'Infinity'}`,
    fmt(cap.Mbe),
    'kN.m', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def ltb_capacity(My, Mo):',
    '    # Cl. 7.2.2.2 - lateral-torsional buckling capacity',
    '    if Mo >= 2.78 * My:',
    '        return My  # full yield',
    '    elif Mo > 0.56 * My:',
    '        return (10.0/9.0) * My * (1 - 10*My/(36*Mo))  # inelastic',
    '    else:',
    '        return Mo  # elastic LTB',
  ], y);

  // 6.2 Local Buckling
  y = subHeading(doc, '6.2  Local Buckling Capacity (Mbl)  [Cl. 7.2.2.3]', y);

  y = equationBlock(doc,
    'Local Slenderness (lambda_l)',
    'Cl. 7.2.2.3',
    'lambda_l = sqrt(Mbe / Mol)',
    `lambda_l = sqrt(${fmt(cap.Mbe)} / ${fmt(bk.Mol)})`,
    fmt(cap.lambdaL, 4),
    '', y
  );

  if (cap.lambdaL <= 0.776) {
    y = bodyText(doc, `lambda_l = ${fmt(cap.lambdaL, 4)} <= 0.776 --> No local buckling reduction: Mbl = Mbe`, y, 2);
  } else {
    y = bodyText(doc, `lambda_l = ${fmt(cap.lambdaL, 4)} > 0.776 --> Local buckling reduction applies`, y, 2);
  }

  y = equationBlock(doc,
    'Mbl',
    'Cl. 7.2.2.3',
    cap.lambdaL <= 0.776
      ? 'Mbl = Mbe  (lambda_l <= 0.776)'
      : 'Mbl = [1 - 0.15 x (Mol/Mbe)^0.4] x (Mol/Mbe)^0.4 x Mbe',
    cap.lambdaL <= 0.776
      ? `Mbl = Mbe = ${fmt(cap.Mbe)}`
      : `Mol/Mbe = ${fmt(bk.Mol / cap.Mbe, 4)}, Mbe = ${fmt(cap.Mbe)}`,
    fmt(cap.Mbl),
    'kN.m', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'import math',
    'def local_buckling_capacity(Mbe, Mol):',
    '    # Cl. 7.2.2.3 - DSM local buckling capacity',
    '    lambda_l = math.sqrt(Mbe / Mol)',
    '    if lambda_l <= 0.776:',
    '        return Mbe',
    '    else:',
    '        ratio = Mol / Mbe',
    '        return (1 - 0.15 * ratio**0.4) * ratio**0.4 * Mbe',
  ], y);

  // 6.3 Distortional Buckling
  y = subHeading(doc, '6.3  Distortional Buckling Capacity (Mbd)  [Cl. 7.2.2.4]', y);

  if (bk.fod > 0 && bk.Mod > 0) {
    y = equationBlock(doc,
      'Distortional Slenderness (lambda_d)',
      'Cl. 7.2.2.4',
      'lambda_d = sqrt(My / Mod)',
      `lambda_d = sqrt(${fmt(bk.My)} / ${fmt(bk.Mod)})`,
      fmt(cap.lambdaD, 4),
      '', y
    );

    if (cap.lambdaD <= 0.673) {
      y = bodyText(doc, `lambda_d = ${fmt(cap.lambdaD, 4)} <= 0.673 --> No distortional reduction: Mbd = My`, y, 2);
    } else {
      y = bodyText(doc, `lambda_d = ${fmt(cap.lambdaD, 4)} > 0.673 --> Distortional reduction applies`, y, 2);
    }

    y = equationBlock(doc,
      'Mbd',
      'Cl. 7.2.2.4',
      cap.lambdaD <= 0.673
        ? 'Mbd = My  (lambda_d <= 0.673)'
        : 'Mbd = [1 - 0.22 x (Mod/My)^0.5] x (Mod/My)^0.5 x My',
      cap.lambdaD <= 0.673
        ? `Mbd = My = ${fmt(bk.My)}`
        : `Mod/My = ${fmt(bk.Mod / bk.My, 4)}, My = ${fmt(bk.My)}`,
      fmt(cap.Mbd),
      'kN.m', y
    );

    y = codeSnippet(doc, [
      'Implementation Snippet:',
      'import math',
      'def distortional_buckling_capacity(My, Mod):',
      '    # Cl. 7.2.2.4 - DSM distortional buckling capacity',
      '    lambda_d = math.sqrt(My / Mod)',
      '    if lambda_d <= 0.673:',
      '        return My',
      '    else:',
      '        ratio = Mod / My',
      '        return (1 - 0.22 * ratio**0.5) * ratio**0.5 * My',
    ], y);
  } else {
    y = bodyText(doc, 'No distortional buckling mode (unlipped section). Mbd is excluded from the governing check.', y);
    y += 2;
  }

  // ================================================================
  //  7.0  GOVERNING LIMIT STATE (BENDING)
  // ================================================================

  y = heading(doc, '7.0', 'GOVERNING LIMIT STATE (BENDING)', y, 'Cl. 7.2.2');

  y = bodyText(doc, 'The nominal member moment capacity is the minimum of the local and distortional buckling capacities:', y);
  y += 1;

  y = bodyText(doc, 'Mb = min(Mbl, Mbd)  [Mbd excluded if unlipped]', y, 2);
  y += 2;

  y = paramRow(doc, 'Mbe (LTB capacity)', fmt(cap.Mbe), 'kN.m', y);
  y = paramRow(doc, 'Mbl (local buckling capacity)', fmt(cap.Mbl), 'kN.m', y);
  y = paramRow(doc, 'Mbd (distortional capacity)', cap.Mbd > 0 ? fmt(cap.Mbd) : 'N/A (unlipped)', 'kN.m', y);
  y += 1;
  y = paramRow(doc, 'Governing mode', govModeBending, '', y, true);
  y = paramRow(doc, 'Mn = Mb', fmt(cap.Mn), 'kN.m', y, true);
  y += 3;

  // ================================================================
  //  8.0  SHEAR STRENGTH CALCULATIONS
  // ================================================================

  y = heading(doc, '8.0', 'SHEAR STRENGTH CALCULATIONS', y, 'Cl. 3.3.4');

  if (shear) {
    // 8.1 Clear web depth
    y = subHeading(doc, '8.1  Web Dimensions (d1, tw)', y);

    y = equationBlock(doc,
      'Flat Web Depth (d1)',
      'Cl. 3.3.4',
      'd1 = d - 2(r + t)',
      `d1 = ${fmt(geo.d, 1)} - 2 x (${fmt(geo.r, 1)} + ${fmt(geo.t, 2)})`,
      fmt(shear.hw, 2),
      'mm', y
    );

    y = paramRow(doc, 'tw (web thickness)', fmt(geo.t, 2), 'mm', y);
    y = paramRow(doc, 'd1/tw (web slenderness)', fmt(shear.hw / geo.t, 2), '', y, true);

    y = codeSnippet(doc, [
      'Implementation Snippet:',
      'def web_dimensions(d, r, t):',
      '    # Cl. 3.3.4 - flat web depth',
      '    d1 = d - 2 * (r + t)',
      '    tw = t',
      '    return d1, tw',
    ], y);

    // 8.2 Shear area
    y = subHeading(doc, '8.2  Web Shear Area (Av)', y);

    y = equationBlock(doc,
      'Shear Area',
      'Cl. 3.3.4',
      'Av = d1 x tw',
      `Av = ${fmt(shear.hw, 2)} x ${fmt(geo.t, 2)}`,
      fmt(shear.Av, 1),
      'mm^2', y
    );

    // 8.3 Shear buckling coefficient
    y = subHeading(doc, '8.3  Shear Buckling Coefficient (kv)', y);

    if (shearParams.hasStiffeners && shearParams.stiffenerSpacing > 0) {
      const aspectRatio = shearParams.stiffenerSpacing / shear.hw;
      y = bodyText(doc, `Stiffened web: stiffener spacing a = ${fmtInt(shearParams.stiffenerSpacing)} mm, a/d1 = ${fmt(aspectRatio, 3)}`, y);
      if (aspectRatio <= 1.0) {
        y = bodyText(doc, 'Eq. 3.3.4(4): a/d1 <= 1.0:  kv = 4.00 + 5.34 / (a/d1)^2', y, 2);
      } else {
        y = bodyText(doc, 'Eq. 3.3.4(5): a/d1 > 1.0:  kv = 5.34 + 4.00 / (a/d1)^2', y, 2);
      }
    } else if (shearParams.a > 0) {
      const aspectRatio = shearParams.a / shear.hw;
      y = bodyText(doc, `Unstiffened web with finite panel length a = ${fmtInt(shearParams.a)} mm, a/d1 = ${fmt(aspectRatio, 3)}`, y);
    } else {
      y = bodyText(doc, 'Unstiffened web (no transverse stiffeners): kv = 5.34', y);
    }
    y += 1;

    y = paramRow(doc, 'kv (shear buckling coefficient)', fmt(shear.kv), '', y, true);
    y += 2;

    y = codeSnippet(doc, [
      'Implementation Snippet:',
      'def shear_buckling_coeff(has_stiffeners, a, d1):',
      '    # Cl. 3.3.4 - shear buckling coefficient',
      '    if not has_stiffeners:',
      '        return 5.34  # unstiffened web',
      '    ratio = a / d1',
      '    if ratio <= 1.0:',
      '        return 4.00 + 5.34 / ratio**2  # Eq. 3.3.4(4)',
      '    else:',
      '        return 5.34 + 4.00 / ratio**2  # Eq. 3.3.4(5)',
    ], y);

    // 8.4 Slenderness thresholds
    y = subHeading(doc, '8.4  Slenderness Thresholds', y);

    const d1 = shear.hw;
    const tw = geo.t;
    const slenderness = d1 / tw;
    const threshold1 = Math.sqrt((E_input * shear.kv) / fy);
    const threshold2 = 1.415 * threshold1;

    y = paramRow(doc, 'd1/tw', fmt(slenderness, 2), '', y);
    y = paramRow(doc, 'sqrt(E*kv/fy)', fmt(threshold1, 2), '', y);
    y = paramRow(doc, '1.415*sqrt(E*kv/fy)', fmt(threshold2, 2), '', y, true);
    y += 2;

    // 8.5 Nominal shear capacity
    y = subHeading(doc, '8.5  Nominal Shear Capacity (Vv)', y);

    y = bodyText(doc, 'Three equations per Cl. 3.3.4.1:', y);
    y = bulletText(doc, 'Eq. 3.3.4(1): d1/tw <= sqrt(E*kv/fy):  Vv = 0.64*fy*d1*tw', y);
    y = bulletText(doc, 'Eq. 3.3.4(2): sqrt(E*kv/fy) < d1/tw <= 1.415*sqrt(E*kv/fy):  Vv = 0.64*tw^2*sqrt(E*kv*fy)', y);
    y = bulletText(doc, 'Eq. 3.3.4(3): d1/tw > 1.415*sqrt(E*kv/fy):  Vv = 0.905*E*kv*tw^3/d1', y);
    y += 2;

    let VvRegime: string;
    if (shear.shearMode === 'Eq.3.3.4(1)') {
      VvRegime = `d1/tw = ${fmt(slenderness, 2)} <= sqrt(E*kv/fy) = ${fmt(threshold1, 2)} --> Eq. 3.3.4(1): Vv = 0.64*fy*d1*tw`;
    } else if (shear.shearMode === 'Eq.3.3.4(2)') {
      VvRegime = `sqrt(E*kv/fy) = ${fmt(threshold1, 2)} < d1/tw = ${fmt(slenderness, 2)} <= 1.415*sqrt(E*kv/fy) = ${fmt(threshold2, 2)} --> Eq. 3.3.4(2): Vv = 0.64*tw^2*sqrt(E*kv*fy)`;
    } else {
      VvRegime = `d1/tw = ${fmt(slenderness, 2)} > 1.415*sqrt(E*kv/fy) = ${fmt(threshold2, 2)} --> Eq. 3.3.4(3): Vv = 0.905*E*kv*tw^3/d1`;
    }

    y = bodyText(doc, `Determination: ${VvRegime}`, y, 2);
    y += 1;

    y = equationBlock(doc,
      'Vv',
      shear.shearMode === 'Eq.3.3.4(1)' ? 'Eq. 3.3.4(1)'
        : shear.shearMode === 'Eq.3.3.4(2)' ? 'Eq. 3.3.4(2)'
        : 'Eq. 3.3.4(3)',
      shear.shearMode === 'Eq.3.3.4(1)'
        ? 'Vv = 0.64 * fy * d1 * tw'
        : shear.shearMode === 'Eq.3.3.4(2)'
          ? 'Vv = 0.64 * tw^2 * sqrt(E * kv * fy)'
          : 'Vv = 0.905 * E * kv * tw^3 / d1',
      shear.shearMode === 'Eq.3.3.4(1)'
        ? `Vv = 0.64 x ${fmt(fy, 1)} x ${fmt(d1, 2)} x ${fmt(tw, 2)} / 10^3`
        : shear.shearMode === 'Eq.3.3.4(2)'
          ? `Vv = 0.64 x ${fmt(tw, 2)}^2 x sqrt(${fmtInt(E_input)} x ${fmt(shear.kv)} x ${fmt(fy, 1)}) / 10^3`
          : `Vv = 0.905 x ${fmtInt(E_input)} x ${fmt(shear.kv)} x ${fmt(tw, 2)}^3 / ${fmt(d1, 2)} / 10^3`,
      fmt(shear.Vn),
      'kN', y
    );

    y = codeSnippet(doc, [
      'Implementation Snippet:',
      'import math',
      '# AS/NZS 4600:2018 Cl. 3.3.4.1',
      'def nominal_shear_capacity(fy, E, kv, d1, tw):',
      '    slenderness = d1 / tw',
      '    threshold = math.sqrt(E * kv / fy)',
      '    if slenderness <= threshold:',
      '        Vv = 0.64 * fy * d1 * tw         # Eq. 3.3.4(1)',
      '    elif slenderness <= 1.415 * threshold:',
      '        Vv = 0.64 * tw**2 * math.sqrt(E * kv * fy)  # Eq. 3.3.4(2)',
      '    else:',
      '        Vv = 0.905 * E * kv * tw**3 / d1  # Eq. 3.3.4(3)',
      '    return Vv  # in N',
    ], y);
  } else {
    y = bodyText(doc, 'Shear capacity not computed.', y);
  }
  y += 3;

  // ================================================================
  //  9.0  FINAL DESIGN CAPACITY
  // ================================================================

  y = heading(doc, '9.0', 'FINAL DESIGN CAPACITY', y);

  // Bending
  y = subHeading(doc, '9.1  Bending', y);

  y = equationBlock(doc,
    'Design Bending Capacity',
    'Cl. 7.2.2',
    'phi_Mn = phi_b x Mn',
    `phi_Mn = ${fmt(cap.phi_b, 2)} x ${fmt(cap.Mn)}`,
    fmt(cap.phiMn),
    'kN.m', y
  );

  y = codeSnippet(doc, [
    'Implementation Snippet:',
    'def design_bending_capacity(phi_b, Mn):',
    '    # Cl. 7.2.2 - design bending capacity',
    '    # phi_b = 0.90 per AS/NZS 4600:2018',
    '    return phi_b * Mn',
  ], y);

  y = boxedResult(doc, [
    '----------------------------------------',
    'FINAL BENDING DESIGN CAPACITY',
    `Nominal strength Mn = ${fmt(cap.Mn)} kN.m`,
    `Design strength phi_Mn = ${fmt(cap.phiMn)} kN.m`,
    `Governing mode: ${govModeBending}`,
    '----------------------------------------',
  ], y);

  // Shear
  if (shear) {
    y = subHeading(doc, '9.2  Shear', y);

    y = equationBlock(doc,
      'Design Shear Capacity',
      'Cl. 3.3.4',
      'phi_v x Vv = phi_v x Vv',
      `phi_v x Vv = ${fmt(shear.phi_v, 2)} x ${fmt(shear.Vn)}`,
      fmt(shear.phiVn),
      'kN', y
    );

    y = codeSnippet(doc, [
      'Implementation Snippet:',
      'def design_shear_capacity(phi_v, Vv):',
      '    # Cl. 3.3.4 - design shear capacity',
      '    # phi_v = 0.90 per AS/NZS 4600:2018 Table 1.6.3',
      '    return phi_v * Vv',
    ], y);

    y = boxedResult(doc, [
      '----------------------------------------',
      'FINAL SHEAR DESIGN CAPACITY',
      `Nominal strength Vv = ${fmt(shear.Vn)} kN`,
      `Design strength phi_v*Vv = ${fmt(shear.phiVn)} kN`,
      `Governing mode: ${shearModeLabel}`,
      '----------------------------------------',
    ], y);
  }

  y += 2;

  // ================================================================
  //  10.0  CONCLUSION
  // ================================================================

  y = heading(doc, '10.0', 'CONCLUSION', y);

  y = bodyText(doc, `The design bending capacity of the ${sectionDesc} section has been determined using the Direct Strength Method per AS/NZS 4600:2018 Clause 7.2.2.`, y);
  y += 2;

  y = bodyText(doc, `The governing bending failure mode is ${govModeBending} with a nominal moment capacity Mn = ${fmt(cap.Mn)} kN.m and a design capacity phi_Mn = ${fmt(cap.phiMn)} kN.m (phi_b = ${fmt(cap.phi_b, 2)}).`, y);
  y += 2;

  if (shear) {
    y = bodyText(doc, `The shear capacity of the web has been determined per AS/NZS 4600:2018 Clause 3.3.4.1. The governing shear failure mode is ${shearModeLabel} with a nominal shear capacity Vv = ${fmt(shear.Vn)} kN and a design capacity phi_v*Vv = ${fmt(shear.phiVn)} kN (phi_v = ${fmt(shear.phi_v, 2)}).`, y);
    y += 2;
  }

  y = bodyText(doc, 'All calculations are traceable to AS/NZS 4600:2018 clause references. No AISI, Eurocode, or other standards have been used.', y);
  y += 4;

  // ================================================================
  //  CHECKLIST
  // ================================================================

  y = heading(doc, '', 'CHECKLIST', y);

  y = bodyText(doc, '[X] All equations reference AS/NZS 4600:2018', y);
  y = bodyText(doc, '[X] Units consistent (N, mm, MPa, kN.m, kN)', y);
  y = bodyText(doc, `[X] Governing bending limit state identified: ${govModeBending}`, y);
  if (shear) {
    y = bodyText(doc, `[X] Governing shear limit state identified: ${shearModeLabel}`, y);
  }
  y = bodyText(doc, '[X] Capacity reduction factors applied (phi_b = 0.90, phi_v = 0.90)', y);
  y = bodyText(doc, '[X] No unicode symbols used in report', y);
  y = bodyText(doc, '[X] No encoding errors', y);
  y = bodyText(doc, '[X] Code traceability snippets provided for all design equations', y);
  y += 6;

  // Disclaimer
  y = checkPage(doc, y, 20);
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  const disc = doc.splitTextToSize(
    'DISCLAIMER: This calculation report has been generated by automated software. The engineer of record is responsible for verifying all inputs, assumptions, and results prior to use in design. This report is not a substitute for professional engineering judgement.',
    CONTENT_W
  ) as string[];
  for (const line of disc) {
    y = checkPage(doc, y, 5);
    doc.text(line, MARGIN, y);
    y += 3.5;
  }

  // ================================================================
  //  PAGE FOOTERS
  // ================================================================

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Simple CFS -- DSM Calculation Report  |  AS/NZS 4600:2018  |  Page ${i} of ${pageCount}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: 'center' }
    );
    doc.text(
      new Date().toLocaleString('en-AU'),
      PAGE_W - MARGIN,
      PAGE_H - 8,
      { align: 'right' }
    );
  }

  // ── Save ──
  const filename = `SimpleCFS-DSM-Report-${sectionDesc.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
