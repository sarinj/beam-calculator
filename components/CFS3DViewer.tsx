'use client';

// ============================================================
// CFS 3D Viewer – React Three Fiber Component
// ============================================================
// Professional-grade 3D viewport for CFS member visualization
// with buckling mode deformation, stress contours, wireframe,
// section cut planes, and animation.

import React, { useRef, useMemo, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Html, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { CFSProMember, CFSProResults } from '@/types/cfs-pro';
import {
  buildAssembly3D,
  applyBucklingDeformation,
  generateStressColors,
  getStressLegendStops,
  type ViewMode,
  type DeformationMode,
  type Member3D,
} from '@/lib/3d/cfs-3d-geometry';

// ── Types ──

export interface CFS3DViewerHandle {
  resetView: (mode?: DeformationMode) => void;
}

interface CFS3DViewerProps {
  members: CFSProMember[];
  results: CFSProResults | null;
  memberLength: number;
  viewMode: ViewMode;
  deformationMode: DeformationMode;
  deformationScale: number;
  animating: boolean;
  showAxes: boolean;
  showGrid: boolean;
  showCutPlane: boolean;
  cutPlanePosition: number; // 0-1 along member length
  className?: string;
}

// ── Member Mesh Component ──

function MemberMesh({
  member3D,
  viewMode,
  deformationMode,
  deformationScale,
  animating,
  memberLength,
  sectionDepth,
  maxStress,
}: {
  member3D: Member3D;
  viewMode: ViewMode;
  deformationMode: DeformationMode;
  deformationScale: number;
  animating: boolean;
  memberLength: number;
  sectionDepth: number;
  maxStress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.LineSegments>(null);
  const timeRef = useRef(0);

  const originalMesh = member3D.meshData;

  // Compute half-wavelength based on mode
  const halfWavelength = useMemo(() => {
    switch (deformationMode) {
      case 'local': return sectionDepth * 0.8;
      case 'distortional': return sectionDepth * 3;
      case 'lateral-torsional': return memberLength;
      default: return memberLength;
    }
  }, [deformationMode, sectionDepth, memberLength]);

  // Geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(originalMesh.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(originalMesh.normals, 3));
    geo.setIndex(new THREE.BufferAttribute(originalMesh.indices, 1));

    if (viewMode === 'stress') {
      const colors = generateStressColors(originalMesh, sectionDepth, maxStress);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    return geo;
  }, [originalMesh, viewMode, sectionDepth, maxStress]);

  // Wireframe geometry
  const wireGeometry = useMemo(() => {
    if (!member3D.wireframePositions) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(member3D.wireframePositions, 3));
    return geo;
  }, [member3D.wireframePositions]);

  // Material
  const material = useMemo(() => {
    const color = new THREE.Color(member3D.color);

    switch (viewMode) {
      case 'solid':
        return new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0.6,
          roughness: 0.3,
          clearcoat: 0.2,
          side: THREE.DoubleSide,
        });
      case 'transparent':
        return new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0.3,
          roughness: 0.4,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      case 'wireframe':
        return new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
        });
      case 'stress':
        return new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          metalness: 0.2,
          roughness: 0.5,
          side: THREE.DoubleSide,
        });
      default:
        return new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0.5,
          roughness: 0.3,
          side: THREE.DoubleSide,
        });
    }
  }, [member3D.color, viewMode]);

  // Animation loop for deformation
  useFrame((_, delta) => {
    if (deformationMode === 'none' || !meshRef.current) return;

    if (animating) {
      timeRef.current += delta * 2;
    }

    const deformed = applyBucklingDeformation(
      originalMesh,
      deformationMode,
      deformationScale,
      timeRef.current,
      halfWavelength,
      memberLength,
      sectionDepth
    );

    const posAttr = meshRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.set(deformed.positions);
    posAttr.needsUpdate = true;
    meshRef.current.geometry.computeBoundingSphere();
  });

  return (
    <group>
      {/* Main mesh */}
      <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />

      {/* Wireframe overlay for transparent/solid modes */}
      {viewMode !== 'wireframe' && wireGeometry && (
        <lineSegments ref={wireRef} geometry={wireGeometry}>
          <lineBasicMaterial
            color={viewMode === 'transparent' ? member3D.color : '#1e293b'}
            opacity={viewMode === 'transparent' ? 0.6 : 0.15}
            transparent
            linewidth={1}
          />
        </lineSegments>
      )}
    </group>
  );
}

// ── Section Cut Plane ──

function SectionCutPlane({
  position,
  memberLength,
  sectionWidth,
  sectionDepth,
}: {
  position: number;
  memberLength: number;
  sectionWidth: number;
  sectionDepth: number;
}) {
  const z = (position - 0.5) * memberLength;
  const extent = Math.max(sectionWidth, sectionDepth) * 1.5;

  return (
    <group position={[0, 0, z]}>
      <mesh rotation={[0, 0, 0]}>
        <planeGeometry args={[extent, extent]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Cut plane border ring */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[extent * 0.49, extent * 0.5, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Axes helper with labels ──

function AxesWithLabels({ size }: { size: number }) {
  return (
    <group>
      <axesHelper args={[size]} />
      <Html position={[size + 5, 0, 0]} center>
        <span className="text-[9px] font-bold text-red-500 select-none">X</span>
      </Html>
      <Html position={[0, size + 5, 0]} center>
        <span className="text-[9px] font-bold text-green-500 select-none">Y</span>
      </Html>
      <Html position={[0, 0, size + 5]} center>
        <span className="text-[9px] font-bold text-blue-500 select-none">Z (length)</span>
      </Html>
    </group>
  );
}

// ── Camera controller with reset ──

function CameraController({
  members,
  memberLength,
  resetSignal,
  resetMode,
  controlsRef,
}: {
  members: CFSProMember[];
  memberLength: number;
  resetSignal: number;
  resetMode: DeformationMode;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const hasSetRef = useRef(false);

  const computeIdealPosition = useCallback((mode: DeformationMode = 'none') => {
    const depth = members[0]?.geometry.d || 200;
    const width = members[0]?.geometry.bf || 75;
    const sectionSize = Math.max(depth, width);
    let maxExtent = Math.max(memberLength, sectionSize * 2);

    switch (mode) {
      case 'local': {
        // Close-up angled view to see plate ripples
        const d = sectionSize * 3;
        return {
          position: new THREE.Vector3(d * 0.7, d * 0.5, d * 0.3),
          target: new THREE.Vector3(0, 0, 0),
        };
      }
      case 'distortional': {
        // Medium distance, slightly elevated side view to see flange rotation
        const d = Math.max(sectionSize * 4, memberLength * 0.4);
        return {
          position: new THREE.Vector3(d * 0.8, d * 0.4, d * 0.5),
          target: new THREE.Vector3(0, 0, 0),
        };
      }
      case 'lateral-torsional': {
        // Wide view from above-side to see full member sweep & twist
        const d = memberLength * 0.8;
        return {
          position: new THREE.Vector3(d * 0.3, d * 0.6, d * 0.8),
          target: new THREE.Vector3(0, 0, 0),
        };
      }
      default: {
        const d = maxExtent * 1.2;
        return {
          position: new THREE.Vector3(d * 0.5, d * 0.35, d * 0.7),
          target: new THREE.Vector3(0, 0, 0),
        };
      }
    }
  }, [members, memberLength]);

  const applyCamera = useCallback((pos: THREE.Vector3, tgt: THREE.Vector3) => {
    camera.position.copy(pos);
    camera.lookAt(tgt);
    if (controlsRef.current) {
      controlsRef.current.target.copy(tgt);
      controlsRef.current.update();
    }
  }, [camera, controlsRef]);

  // Initial camera setup
  useEffect(() => {
    if (members.length === 0 || hasSetRef.current) return;
    const { position, target } = computeIdealPosition();
    applyCamera(position, target);
    hasSetRef.current = true;
  }, [members, memberLength, computeIdealPosition, applyCamera]);

  // Reset on signal (with mode)
  useEffect(() => {
    if (resetSignal === 0) return;
    const { position, target } = computeIdealPosition(resetMode);
    applyCamera(position, target);
  }, [resetSignal, resetMode, computeIdealPosition, applyCamera]);

  // Reset tracker when members change
  useEffect(() => {
    hasSetRef.current = false;
  }, [members.length]);

  return null;
}

// ── Stress Legend Overlay ──

function StressLegend({ maxStress }: { maxStress: number }) {
  const stops = getStressLegendStops();

  return (
    <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border dark:border-slate-700">
      <div className="text-[9px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
        Bending Stress (MPa)
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="w-4 h-24 rounded-sm"
          style={{
            background: `linear-gradient(to top, ${stops.map(s => s.color).join(', ')})`,
          }}
        />
        <div className="flex flex-col justify-between h-24 text-[8px] text-slate-600 dark:text-slate-400">
          <span>{maxStress.toFixed(0)}</span>
          <span>{(maxStress / 2).toFixed(0)}</span>
          <span>0</span>
          <span>{(-maxStress / 2).toFixed(0)}</span>
          <span>{(-maxStress).toFixed(0)}</span>
        </div>
      </div>
      <div className="flex justify-between text-[7px] text-slate-500 mt-0.5">
        <span>Comp.</span>
        <span>Tension</span>
      </div>
    </div>
  );
}

// ── Deformation Mode Indicator ──

function DeformationIndicator({ mode, scale }: { mode: DeformationMode; scale: number }) {
  if (mode === 'none') return null;

  const modeLabels: Record<string, string> = {
    local: 'Local Buckling',
    distortional: 'Distortional Buckling',
    'lateral-torsional': 'Lateral-Torsional Buckling',
  };

  const modeColors: Record<string, string> = {
    local: 'bg-blue-500',
    distortional: 'bg-orange-500',
    'lateral-torsional': 'bg-purple-500',
  };

  return (
    <div className="absolute top-3 left-3 flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${modeColors[mode]} animate-pulse`} />
      <span className="text-[10px] font-medium text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-2 py-0.5 rounded shadow">
        {modeLabels[mode]} (×{scale.toFixed(1)})
      </span>
    </div>
  );
}

// ── Main Scene ──

function Scene({
  members3D,
  members,
  results,
  memberLength,
  viewMode,
  deformationMode,
  deformationScale,
  animating,
  showAxes,
  showGrid,
  showCutPlane,
  cutPlanePosition,
  resetSignal,
  resetMode,
}: CFS3DViewerProps & { members3D: Member3D[]; resetSignal: number; resetMode: DeformationMode }) {
  const controlsRef = useRef<any>(null);

  const maxDim = useMemo(() => {
    let max = memberLength;
    members.forEach((m) => {
      max = Math.max(max, m.geometry.d * 2, m.geometry.bf * 2);
    });
    return max;
  }, [members, memberLength]);

  const sectionDepth = members[0]?.geometry.d || 200;
  const sectionWidth = members[0]?.geometry.bf || 75;
  const maxStress = results?.bending.My
    ? (results.bending.My * 1e6) / (results.sectionProps.gross.Sx || 1)
    : (members[0]?.geometry.d || 200) * 2;

  return (
    <>
      <PerspectiveCamera makeDefault position={[maxDim * 0.5, maxDim * 0.35, maxDim * 0.7]} fov={40} near={1} far={maxDim * 20} />
      <CameraController members={members} memberLength={memberLength} resetSignal={resetSignal} resetMode={resetMode} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.5}
        panSpeed={0.8}
        zoomSpeed={0.8}
        minDistance={10}
        maxDistance={maxDim * 8}
        target={[0, 0, 0]}
        enablePan
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />

      {/* Lighting — 3-point studio setup */}
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#b1e1ff', '#b97a20', 0.5]} />
      <directionalLight
        position={[maxDim * 0.8, maxDim, maxDim * 0.5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={maxDim * 5}
        shadow-camera-near={1}
        shadow-bias={-0.001}
      />
      <directionalLight
        position={[-maxDim * 0.6, maxDim * 0.4, -maxDim * 0.4]}
        intensity={0.5}
        color="#e0e7ff"
      />
      <directionalLight
        position={[0, -maxDim * 0.3, maxDim * 0.5]}
        intensity={0.2}
        color="#fef3c7"
      />

      {/* Environment reflection for physical materials */}
      <Environment preset="city" />

      {/* Ground contact shadows */}
      <ContactShadows
        position={[0, -sectionDepth * 0.8, 0]}
        width={maxDim * 3}
        height={maxDim * 3}
        opacity={0.25}
        blur={2.5}
        far={maxDim * 2}
      />

      {/* Grid */}
      {showGrid && (
        <Grid
          args={[maxDim * 4, maxDim * 4]}
          cellSize={maxDim * 0.2}
          sectionSize={maxDim}
          cellColor="#64748b"
          sectionColor="#475569"
          cellThickness={0.6}
          sectionThickness={1.0}
          fadeDistance={maxDim * 4}
          fadeStrength={2}
          position={[0, -sectionDepth * 0.8, 0]}
        />
      )}

      {/* Axes */}
      {showAxes && <AxesWithLabels size={maxDim * 0.25} />}

      {/* Members */}
      {members3D.map((m3d, idx) => (
        <MemberMesh
          key={m3d.id}
          member3D={m3d}
          viewMode={viewMode}
          deformationMode={deformationMode}
          deformationScale={deformationScale}
          animating={animating}
          memberLength={memberLength}
          sectionDepth={members[idx]?.geometry.d || 200}
          maxStress={maxStress}
        />
      ))}

      {/* Section cut plane */}
      {showCutPlane && (
        <SectionCutPlane
          position={cutPlanePosition}
          memberLength={memberLength}
          sectionWidth={sectionWidth}
          sectionDepth={sectionDepth}
        />
      )}
    </>
  );
}

// ── Main Export Component ──

export const CFS3DViewer = forwardRef<CFS3DViewerHandle, CFS3DViewerProps>(function CFS3DViewer({
  members,
  results,
  memberLength,
  viewMode,
  deformationMode,
  deformationScale,
  animating,
  showAxes,
  showGrid,
  showCutPlane,
  cutPlanePosition,
  className = '',
}, ref) {
  const [resetSignal, setResetSignal] = React.useState(0);
  const [resetMode, setResetMode] = React.useState<DeformationMode>('none');

  // Expose resetView to parent
  useImperativeHandle(ref, () => ({
    resetView: (mode?: DeformationMode) => {
      setResetMode(mode || deformationMode || 'none');
      setResetSignal((s) => s + 1);
    },
  }), [deformationMode]);

  // Build 3D data
  const members3D = useMemo(() => {
    if (members.length === 0) return [];
    return buildAssembly3D(members, memberLength);
  }, [members, memberLength]);

  const maxStress = results?.bending.My
    ? (results.bending.My * 1e6) / (results.sectionProps.gross.Sx || 1)
    : 200;

  if (members.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Add members to see 3D visualization
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 ${className}`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, 2]}
        style={{ touchAction: 'none' }}
        onPointerMissed={() => {}}
      >
        <fog attach="fog" args={['#1e293b', memberLength * 3, memberLength * 10]} />
        <Scene
          members3D={members3D}
          members={members}
          results={results}
          memberLength={memberLength}
          viewMode={viewMode}
          deformationMode={deformationMode}
          deformationScale={deformationScale}
          animating={animating}
          showAxes={showAxes}
          showGrid={showGrid}
          showCutPlane={showCutPlane}
          cutPlanePosition={cutPlanePosition}
          resetSignal={resetSignal}
          resetMode={resetMode}
        />
      </Canvas>

      {/* Overlays */}
      <DeformationIndicator mode={deformationMode} scale={deformationScale} />
      {viewMode === 'stress' && <StressLegend maxStress={maxStress} />}

      {/* View controls watermark */}
      <div className="absolute bottom-3 left-3 text-[8px] text-slate-400 dark:text-slate-500 select-none pointer-events-none">
        Drag to orbit · Scroll to zoom · Right-click to pan
      </div>
    </div>
  );
});
