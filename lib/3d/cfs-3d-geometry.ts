// ============================================================
// CFS 3D Geometry Engine
// ============================================================
// Pure TypeScript module to generate 3D mesh data from 2D
// cross-section profiles. Handles extrusion, buckling mode
// deformation shapes, and stress contour mapping.

import type { CFSProMember, CFSProResults, BucklingMode } from '@/types/cfs-pro';

// ── Types ──

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface MeshData {
  positions: Float32Array;   // 3 floats per vertex
  normals: Float32Array;     // 3 floats per vertex
  indices: Uint32Array;
  colors?: Float32Array;     // 3 floats per vertex (RGB 0-1)
  uvs?: Float32Array;        // 2 floats per vertex
}

export interface Member3D {
  id: string;
  label: string;
  color: string;
  meshData: MeshData;
  deformedMeshData?: MeshData;
  wireframePositions?: Float32Array;
}

export type ViewMode = 'solid' | 'wireframe' | 'transparent' | 'stress';
export type DeformationMode = 'none' | 'local' | 'distortional' | 'lateral-torsional';

// ── Cross-section profile generation ──

/**
 * Generate 2D profile points for a CFS member cross-section.
 * Returns an array of [x, y] points forming a closed polygon.
 * Origin at section mid-depth, web face.
 */
export function generateProfilePoints(
  geo: { d: number; bf: number; t: number; lipLength: number; radius: number },
  numCornerPts: number = 4
): [number, number][] {
  const { d, bf, t, lipLength } = geo;
  const halfD = d / 2;
  const pts: [number, number][] = [];

  // Outer profile (CW from bottom of web)
  pts.push([0, -halfD]);
  pts.push([bf, -halfD]);
  if (lipLength > 0) {
    pts.push([bf, -halfD + lipLength]);
    pts.push([bf - t, -halfD + lipLength]);
  }
  pts.push([bf - t, -halfD + t]);
  if (lipLength <= 0) {
    pts.push([bf, -halfD]);
    pts.push([bf, -halfD + t]);
  }
  
  // We'll use a simpler approach: outer then inner
  // Restart with clean profile
  pts.length = 0;
  
  // Outer clockwise
  const outer: [number, number][] = [];
  outer.push([0, -halfD]);                       // bottom-left web
  outer.push([bf, -halfD]);                      // bottom-right
  if (lipLength > 0) {
    outer.push([bf, -halfD + lipLength]);         // bottom lip tip
  }
  
  // Inner (going back up the inside)
  const inner: [number, number][] = [];
  if (lipLength > 0) {
    inner.push([bf - t, -halfD + lipLength]);
  }
  inner.push([bf - t, -halfD + t]);              // bottom flange inner
  inner.push([t, -halfD + t]);                   // bottom web inner
  inner.push([t, halfD - t]);                    // top web inner
  inner.push([bf - t, halfD - t]);               // top flange inner
  if (lipLength > 0) {
    inner.push([bf - t, halfD - lipLength]);
  }
  
  // Continue outer from top
  const outerTop: [number, number][] = [];
  if (lipLength > 0) {
    outerTop.push([bf, halfD - lipLength]);       // top lip tip
  }
  outerTop.push([bf, halfD]);                    // top-right
  outerTop.push([0, halfD]);                     // top-left web
  
  // Complete closed outer profile + inner cutout
  // For extrusion, we use the outer profile only (thin-walled representation)
  // Build mid-thickness outline for thin-walled extrusion
  
  const midPts: [number, number][] = [];
  const mt = t / 2;

  // Bottom lip (if exists) to bottom flange to web to top flange to top lip
  if (lipLength > 0) {
    midPts.push([bf - mt, -halfD + mt]);           // bottom lip start (bottom-right)
    midPts.push([bf - mt, -halfD + lipLength]);    // bottom lip tip
  }
  // Bottom flange
  midPts.push([bf - mt, -halfD + mt]);
  midPts.push([mt, -halfD + mt]);
  // Web
  midPts.push([mt, -halfD + mt]);
  midPts.push([mt, halfD - mt]);
  // Top flange
  midPts.push([mt, halfD - mt]);
  midPts.push([bf - mt, halfD - mt]);
  // Top lip (if exists)
  if (lipLength > 0) {
    midPts.push([bf - mt, halfD - lipLength]);     // top lip tip
    midPts.push([bf - mt, halfD - mt]);
  }

  return midPts;
}

/**
 * Generate a solid cross-section polygon (outer boundary only) for extrusion.
 */
export function generateSolidProfile(
  geo: { d: number; bf: number; t: number; lipLength: number; radius: number; sectionType?: string }
): [number, number][] {
  const { d, bf, t, lipLength } = geo;
  const halfD = d / 2;
  const type = geo.sectionType || 'C-channel';
  const pts: [number, number][] = [];

  if (type === 'Z-section') {
    // Z-section: bottom flange goes right (+X), top flange goes left (-X)
    // Start at web bottom-left
    pts.push([0, -halfD]);
    // Bottom flange (right)
    pts.push([bf, -halfD]);
    if (lipLength > 0) {
      pts.push([bf, -halfD + lipLength]);
      pts.push([bf - t, -halfD + lipLength]);
    } else {
      pts.push([bf, -halfD + t]);
    }
    pts.push([bf - t, -halfD + t]);
    pts.push([t, -halfD + t]);
    // Web inner
    pts.push([t, halfD - t]);
    // Top flange inner (left)
    pts.push([-(bf - t - t), halfD - t]);
    if (lipLength > 0) {
      pts.push([-(bf - t - t), halfD - lipLength]);
      pts.push([-(bf - t), halfD - lipLength]);
      pts.push([-(bf - t), halfD]);
    } else {
      pts.push([-(bf - t), halfD - t]);
      pts.push([-(bf - t), halfD]);
    }
    // Top web outer
    pts.push([0, halfD]);
    return pts;
  }

  if (type === 'hat') {
    // Hat section: symmetric, flanges go both left and right
    pts.push([-bf, -halfD]);
    pts.push([-bf, -halfD + t]);
    pts.push([-t, -halfD + t]);
    pts.push([-t, halfD - t]);
    pts.push([t, halfD - t]);
    pts.push([t, -halfD + t]);
    pts.push([bf, -halfD + t]);
    pts.push([bf, -halfD]);
    pts.push([t, -halfD]);
    pts.push([t, halfD]);
    pts.push([-t, halfD]);
    pts.push([-t, -halfD]);
    return pts;
  }

  if (type === 'track') {
    // Track: C-channel with no lips
    pts.push([0, -halfD]);
    pts.push([bf, -halfD]);
    pts.push([bf, -halfD + t]);
    pts.push([t, -halfD + t]);
    pts.push([t, halfD - t]);
    pts.push([bf, halfD - t]);
    pts.push([bf, halfD]);
    pts.push([0, halfD]);
    return pts;
  }

  // Default: C-channel (lipped)
  pts.push([0, -halfD]);
  pts.push([bf, -halfD]);
  if (lipLength > 0) {
    pts.push([bf, -halfD + lipLength]);
    pts.push([bf - t, -halfD + lipLength]);
  } else {
    pts.push([bf, -halfD + t]);
  }
  pts.push([bf - t, -halfD + t]);
  pts.push([t, -halfD + t]);
  pts.push([t, halfD - t]);
  pts.push([bf - t, halfD - t]);
  if (lipLength > 0) {
    pts.push([bf - t, halfD - lipLength]);
    pts.push([bf, halfD - lipLength]);
  } else {
    pts.push([bf, halfD - t]);
  }
  pts.push([bf, halfD]);
  pts.push([0, halfD]);

  return pts;
}

// ── Extrusion ──

/**
 * Extrude a 2D profile along the Z axis to create a 3D mesh.
 * @param profile - Array of [x, y] points forming a closed polygon
 * @param length - Extrusion length along Z
 * @param segments - Number of segments along length (for deformation)
 * @returns MeshData with positions, normals, indices
 */
export function extrudeProfile(
  profile: [number, number][],
  length: number,
  segments: number = 20
): MeshData {
  const n = profile.length;
  const numVerts = n * (segments + 1) * 2 + n * 2; // sides + 2 caps
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Sides: extrude each edge of the profile
  for (let s = 0; s <= segments; s++) {
    const z = (s / segments) * length - length / 2;
    for (let i = 0; i < n; i++) {
      const [x, y] = profile[i];
      positions.push(x, y, z);

      // Compute outward normal for this edge
      const next = (i + 1) % n;
      const prev = (i - 1 + n) % n;
      const dx1 = profile[next][0] - profile[i][0];
      const dy1 = profile[next][1] - profile[i][1];
      const dx0 = profile[i][0] - profile[prev][0];
      const dy0 = profile[i][1] - profile[prev][1];
      // Average of adjacent edge normals
      let nx = (dy0 + dy1) / 2;
      let ny = -(dx0 + dx1) / 2;
      const len = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= len;
      ny /= len;
      normals.push(nx, ny, 0);
    }
  }

  // Side faces (quads as two triangles)
  for (let s = 0; s < segments; s++) {
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const a = s * n + i;
      const b = s * n + next;
      const c = (s + 1) * n + next;
      const d = (s + 1) * n + i;
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  // Front cap (z = -length/2)
  const capStartFront = positions.length / 3;
  for (let i = 0; i < n; i++) {
    positions.push(profile[i][0], profile[i][1], -length / 2);
    normals.push(0, 0, -1);
  }
  // Fan triangulation from first vertex
  for (let i = 1; i < n - 1; i++) {
    indices.push(capStartFront, capStartFront + i + 1, capStartFront + i);
  }

  // Back cap (z = +length/2)
  const capStartBack = positions.length / 3;
  for (let i = 0; i < n; i++) {
    positions.push(profile[i][0], profile[i][1], length / 2);
    normals.push(0, 0, 1);
  }
  for (let i = 1; i < n - 1; i++) {
    indices.push(capStartBack, capStartBack + i, capStartBack + i + 1);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
  };
}

/**
 * Generate wireframe edges from a profile and extrusion.
 * Returns flat array of line segment pairs.
 */
export function generateWireframe(
  profile: [number, number][],
  length: number,
  segments: number = 10
): Float32Array {
  const lines: number[] = [];
  const n = profile.length;

  for (let s = 0; s <= segments; s++) {
    const z = (s / segments) * length - length / 2;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      // Profile edge at this z
      lines.push(profile[i][0], profile[i][1], z);
      lines.push(profile[next][0], profile[next][1], z);
    }
  }

  // Longitudinal lines
  for (let i = 0; i < n; i++) {
    lines.push(profile[i][0], profile[i][1], -length / 2);
    lines.push(profile[i][0], profile[i][1], length / 2);
  }

  return new Float32Array(lines);
}

// ── Buckling deformation shapes ──

/**
 * Apply buckling deformation to a mesh.
 * @param mesh - Original mesh data
 * @param mode - Buckling mode type
 * @param scale - Deformation scale factor
 * @param time - Animation time (0 to 2π for cyclic animation)
 * @param halfWavelength - Buckling half-wavelength (mm)
 * @param memberLength - Total member length (mm)
 */
export function applyBucklingDeformation(
  mesh: MeshData,
  mode: DeformationMode,
  scale: number,
  time: number,
  halfWavelength: number,
  memberLength: number,
  sectionDepth: number
): MeshData {
  if (mode === 'none') return mesh;

  const n = mesh.positions.length / 3;
  const deformed = new Float32Array(mesh.positions.length);
  const amplitude = scale * sectionDepth * 0.15;
  const animFactor = Math.sin(time);

  for (let i = 0; i < n; i++) {
    const x = mesh.positions[i * 3];
    const y = mesh.positions[i * 3 + 1];
    const z = mesh.positions[i * 3 + 2];

    // Normalize z to [0, 1] over member length
    const zNorm = (z + memberLength / 2) / memberLength;
    const numWaves = Math.max(1, Math.round(memberLength / (2 * halfWavelength)));

    let dx = 0, dy = 0, dz = 0;

    switch (mode) {
      case 'local': {
        // Local buckling: plate elements buckle in/out of plane
        // Short wavelength sinusoidal deformation of flanges/web
        const localWave = Math.sin(numWaves * Math.PI * zNorm);
        // Flanges move in x, web moves in y
        const yNorm = y / (sectionDepth / 2);
        dx = amplitude * 0.3 * localWave * animFactor * (1 - Math.abs(yNorm));
        dy = amplitude * 0.5 * localWave * animFactor * Math.abs(x / (sectionDepth * 0.3 + 1));
        break;
      }

      case 'distortional': {
        // Distortional: flange-lip rotates about flange-web junction
        // Intermediate wavelength
        const distWave = Math.sin(Math.max(2, numWaves * 0.3) * Math.PI * zNorm);
        const yNorm = y / (sectionDepth / 2);
        // Top and bottom flanges rotate in opposite directions
        dx = amplitude * 0.6 * distWave * animFactor * Math.sign(yNorm) * Math.abs(yNorm);
        dy = amplitude * 0.15 * distWave * animFactor;
        break;
      }

      case 'lateral-torsional': {
        // LTB: lateral displacement + twist about shear center
        // Long wavelength, half-sine over member length
        const ltbWave = Math.sin(Math.PI * zNorm);
        // Lateral displacement (x-direction)
        dx = amplitude * 1.2 * ltbWave * animFactor;
        // Twist effect: rotation about centroid
        const twistAngle = 0.15 * ltbWave * animFactor;
        const cosT = Math.cos(twistAngle);
        const sinT = Math.sin(twistAngle);
        const rx = x * cosT - y * sinT - x;
        const ry = x * sinT + y * cosT - y;
        dx += rx * amplitude * 0.02;
        dy += ry * amplitude * 0.02;
        break;
      }
    }

    deformed[i * 3] = x + dx;
    deformed[i * 3 + 1] = y + dy;
    deformed[i * 3 + 2] = z + dz;
  }

  return {
    positions: deformed,
    normals: mesh.normals, // Approximate: reuse original normals
    indices: mesh.indices,
    colors: mesh.colors,
  };
}

// ── Stress contour mapping ──

/**
 * Generate stress-based vertex colors for a mesh.
 * Maps bending stress distribution to a blue→green→yellow→red colormap.
 */
export function generateStressColors(
  mesh: MeshData,
  sectionDepth: number,
  maxStress: number
): Float32Array {
  const n = mesh.positions.length / 3;
  const colors = new Float32Array(n * 3);

  for (let i = 0; i < n; i++) {
    const y = mesh.positions[i * 3 + 1];
    // Linear bending stress distribution: σ = σ_max * y / (d/2)
    const stress = (y / (sectionDepth / 2)) * maxStress;
    const normalized = (stress + maxStress) / (2 * maxStress); // 0 to 1

    // Colormap: blue (0) → cyan (0.25) → green (0.5) → yellow (0.75) → red (1)
    const [r, g, b] = stressColormap(normalized);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return colors;
}

/**
 * Engineering stress colormap (jet-like).
 */
function stressColormap(t: number): [number, number, number] {
  // Clamp
  const v = Math.max(0, Math.min(1, t));

  let r: number, g: number, b: number;

  if (v < 0.25) {
    r = 0;
    g = v * 4;
    b = 1;
  } else if (v < 0.5) {
    r = 0;
    g = 1;
    b = 1 - (v - 0.25) * 4;
  } else if (v < 0.75) {
    r = (v - 0.5) * 4;
    g = 1;
    b = 0;
  } else {
    r = 1;
    g = 1 - (v - 0.75) * 4;
    b = 0;
  }

  return [r, g, b];
}

// ── Section cut plane ──

export interface CutPlaneResult {
  outlinePoints: [number, number][];
  neutralAxisY: number;
  compressionZoneAbove: boolean;
  stressDistribution: { y: number; stress: number }[];
}

/**
 * Compute section cut plane visualization data.
 */
export function computeSectionCut(
  profile: [number, number][],
  sectionDepth: number,
  neutralAxisShift: number,
  maxStress: number
): CutPlaneResult {
  const stressDistribution: { y: number; stress: number }[] = [];
  const halfD = sectionDepth / 2;
  const steps = 20;

  for (let i = 0; i <= steps; i++) {
    const y = -halfD + (i / steps) * sectionDepth;
    const stress = ((y - neutralAxisShift) / (halfD - neutralAxisShift)) * maxStress;
    stressDistribution.push({ y, stress });
  }

  return {
    outlinePoints: profile,
    neutralAxisY: neutralAxisShift,
    compressionZoneAbove: true,
    stressDistribution,
  };
}

// ── Build complete 3D member data ──

/**
 * Build all 3D mesh data for an assembly of CFS members.
 */
export function buildAssembly3D(
  members: CFSProMember[],
  memberLength: number,
  segments: number = 20
): Member3D[] {
  return members.map((m) => {
    const profile = generateSolidProfile(m.geometry);

    // Apply member transform: offset + rotation + mirror
    const transformedProfile = profile.map(([x, y]): [number, number] => {
      let tx = m.mirrored ? -x : x;
      let ty = y;

      // Rotation (degrees → radians)
      const rad = (m.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = tx * cos - ty * sin;
      const ry = tx * sin + ty * cos;

      return [rx + m.offsetX, ry + m.offsetY];
    });

    const meshData = extrudeProfile(transformedProfile, memberLength, segments);
    const wireframePositions = generateWireframe(transformedProfile, memberLength, Math.min(segments, 10));

    return {
      id: m.id,
      label: m.label,
      color: m.color,
      meshData,
      wireframePositions,
    };
  });
}

// ── Stress color legend data ──

export function getStressLegendStops(): { position: number; color: string }[] {
  return [
    { position: 0, color: 'rgb(0, 0, 255)' },      // Compression (blue)
    { position: 0.25, color: 'rgb(0, 255, 255)' },  // Cyan
    { position: 0.5, color: 'rgb(0, 255, 0)' },     // Neutral (green)
    { position: 0.75, color: 'rgb(255, 255, 0)' },   // Yellow
    { position: 1, color: 'rgb(255, 0, 0)' },        // Tension (red)
  ];
}
