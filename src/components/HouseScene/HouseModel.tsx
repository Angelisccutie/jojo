/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface HouseModelProps {
  customGlbUrl?: string | null;
  onModelLoaded?: (isCustom: boolean) => void;
}

export function HouseModel({
  customGlbUrl,
  onModelLoaded,
}: HouseModelProps) {
  const [loadError, setLoadError] = useState(false);
  const [loadedScene, setLoadedScene] = useState<THREE.Group | null>(null);

  // Attempt to load GLTF if custom URL is provided or check default candidates
  const urlToTry = customGlbUrl || '/house.glb';

  useEffect(() => {
    let active = true;
    const loader = new GLTFLoader();

    loader.load(
      urlToTry,
      (gltf) => {
        if (!active) return;
        const scene = gltf.scene;

        // Auto-scale and center the loaded GLB model using its bounding box
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Desired size across the scene so it fills the viewport nicely (14 units wide)
        const maxDimension = Math.max(size.x, size.z, size.y * 1.4);
        if (maxDimension > 0) {
          const targetDimension = 14.0;
          const scaleFactor = targetDimension / maxDimension;
          scene.scale.set(scaleFactor, scaleFactor, scaleFactor);

          // Re-compute bounding box with scale applied to sit bottom on y = 0
          box.setFromObject(scene);
          box.getCenter(center);
          scene.position.x = -center.x;
          scene.position.y = -box.min.y;
          scene.position.z = -center.z;
        }

        // Ensure all meshes cast and receive shadows and react dynamically to room pointlights
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat: any) => {
                  if (mat && 'roughness' in mat) mat.roughness = Math.max(mat.roughness ?? 0.65, 0.45);
                  if (mat && 'metalness' in mat) mat.metalness = Math.min(mat.metalness ?? 0.1, 0.2);
                });
              } else {
                const mat = mesh.material as any;
                if (mat && 'roughness' in mat) mat.roughness = Math.max(mat.roughness ?? 0.65, 0.45);
                if (mat && 'metalness' in mat) mat.metalness = Math.min(mat.metalness ?? 0.1, 0.2);
              }
            }
          }
        });

        setLoadedScene(scene);
        setLoadError(false);
        onModelLoaded?.(true);
      },
      undefined,
      () => {
        if (!active) return;
        setLoadError(true);
        setLoadedScene(null);
        onModelLoaded?.(false);
      }
    );

    return () => {
      active = false;
    };
  }, [urlToTry, onModelLoaded]);

  // If external GLB is loaded, render the scaled and centered model
  if (loadedScene && !loadError) {
    return <primitive object={loadedScene} />;
  }

  // =========================================================================
  // ARCHITECTURAL PROCEDURAL HOUSE MODEL (CLEAN NON-OVERLAPPING GEOMETRY)
  // Overall Bounds: X: -7.06 to +7.06 (Width 14.12), Z: -6.0 to +6.0 (Depth 12.0)
  // Height: 2.0, Wall thickness: 0.20-0.24, Floor thickness: 0.04
  //
  // Coordinates mapped exactly to ROOM_LIGHT_CONFIGS:
  // - Master Bedroom:  [-4.6, 2.4, 2.8]
  // - Bedroom 2:       [-4.6, 2.4, -2.8]
  // - Living Room:     [-0.5, 2.4, 2.0]
  // - Main Bathroom:   [-1.4, 2.3, -3.7]
  // - Bathroom 2:      [0.6, 2.3, -3.7]
  // - Dining Room:     [2.8, 2.4, 2.6]
  // - Kitchen:         [5.6, 2.4, 2.6]
  // - Bedroom 3/Office:[2.8, 2.4, -2.8]
  // - Garage:          [5.4, 2.4, -2.9]
  // - Front Porch:     [-0.5, 2.0, 6.2]
  // =========================================================================
  return (
    <group position={[0, 0, 0]}>
      {/* ========================================================================= */}
      {/* 0. FOUNDATION SUB-BASE                                                    */}
      {/* ========================================================================= */}
      <mesh position={[0, -0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[14.4, 0.3, 12.4]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* ========================================================================= */}
      {/* 1. ROOM FLOORS (NON-OVERLAPPING DEDICATED TILES AT y = 0.02)              */}
      {/* ========================================================================= */}
      {/* Master Bedroom Floor (South-West: X: -6.82 to -2.44, Z: 0.10 to 5.76) */}
      <mesh position={[-4.63, 0.02, 2.93]} receiveShadow>
        <boxGeometry args={[4.38, 0.04, 5.66]} />
        <meshStandardMaterial color="#78350f" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Bedroom 2 Floor (North-West: X: -6.82 to -2.44, Z: -5.76 to -0.10) */}
      <mesh position={[-4.63, 0.02, -2.93]} receiveShadow>
        <boxGeometry args={[4.38, 0.04, 5.66]} />
        <meshStandardMaterial color="#78350f" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Living Room & Entrance Hallway Floor (Center-South: X: -2.24 to 1.20, Z: -1.60 to 5.76) */}
      <mesh position={[-0.52, 0.02, 2.08]} receiveShadow>
        <boxGeometry args={[3.44, 0.04, 7.36]} />
        <meshStandardMaterial color="#92400e" roughness={0.45} metalness={0.05} />
      </mesh>

      {/* Main Bathroom Floor (North-Center-West: X: -2.24 to -0.50, Z: -5.76 to -1.80) */}
      <mesh position={[-1.37, 0.02, -3.78]} receiveShadow>
        <boxGeometry args={[1.74, 0.04, 3.96]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Bathroom 2 / Guest Bath Floor (North-Center-East: X: -0.34 to 1.20, Z: -5.76 to -1.80) */}
      <mesh position={[0.43, 0.02, -3.78]} receiveShadow>
        <boxGeometry args={[1.54, 0.04, 3.96]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.22} metalness={0.1} />
      </mesh>

      {/* Dining Room Floor (East-Mid-South: X: 1.38 to 3.94, Z: -0.20 to 5.76) */}
      <mesh position={[2.66, 0.02, 2.78]} receiveShadow>
        <boxGeometry args={[2.56, 0.04, 5.96]} />
        <meshStandardMaterial color="#b45309" roughness={0.42} metalness={0.05} />
      </mesh>

      {/* Kitchen Floor (Far-East-South: X: 4.14 to 6.82, Z: -0.20 to 5.76) */}
      <mesh position={[5.48, 0.02, 2.78]} receiveShadow>
        <boxGeometry args={[2.68, 0.04, 5.96]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.12} />
      </mesh>

      {/* Bedroom 3 / Office Studio Floor (East-Mid-North: X: 1.38 to 3.94, Z: -5.76 to -0.40) */}
      <mesh position={[2.66, 0.02, -3.08]} receiveShadow>
        <boxGeometry args={[2.56, 0.04, 5.36]} />
        <meshStandardMaterial color="#78350f" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Garage Bay Floor (Far-East-North: X: 4.14 to 6.82, Z: -5.76 to -0.40) */}
      <mesh position={[5.48, 0.02, -3.08]} receiveShadow>
        <boxGeometry args={[2.68, 0.04, 5.36]} />
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.2} />
      </mesh>

      {/* ========================================================================= */}
      {/* 2. CONTINUOUS EXTERIOR PERIMETER WALLS (NO OVERLAPS, EXACT CORNERS)       */}
      {/* ========================================================================= */}
      {/* West Exterior Wall (Continuous 12.0m outer flank from Z = -6.0 to +6.0) */}
      <mesh position={[-6.94, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.24, 2.0, 12.0]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* East Exterior Wall (Continuous 12.0m outer flank from Z = -6.0 to +6.0) */}
      <mesh position={[6.94, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.24, 2.0, 12.0]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* North Exterior Wall (Fits cleanly between West & East walls: X = -6.82 to +6.82) */}
      {/* North Wall - Solid West Segment (behind Bed 2, Bathrooms & Studio: X = -6.82 to 4.1) */}
      <mesh position={[-1.36, 1.0, -5.88]} castShadow receiveShadow>
        <boxGeometry args={[10.92, 2.0, 0.24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* North Wall - Garage Header above Garage Door (X = 4.1 to 6.82) */}
      <mesh position={[5.46, 1.75, -5.88]} castShadow receiveShadow>
        <boxGeometry args={[2.72, 0.5, 0.24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>

      {/* South Exterior Wall (Fits cleanly between West & East walls: X = -6.82 to +6.82) */}
      {/* South Wall - West Segment (in front of Master Bedroom: X = -6.82 to -1.8) */}
      <mesh position={[-4.31, 1.0, 5.88]} castShadow receiveShadow>
        <boxGeometry args={[5.02, 2.0, 0.24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* South Wall - East Segment (in front of Dining & Kitchen: X = 0.8 to 6.82) */}
      <mesh position={[3.81, 1.0, 5.88]} castShadow receiveShadow>
        <boxGeometry args={[6.02, 2.0, 0.24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* South Wall - Main Entrance Header above Front Door (X = -1.8 to 0.8) */}
      <mesh position={[-0.5, 1.75, 5.88]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.5, 0.24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>

      {/* ========================================================================= */}
      {/* 3. INTERIOR PARTITION WALLS (EXACT BUTTING JOINTS, NO Z-FIGHTING)         */}
      {/* ========================================================================= */}
      {/* West Spine Wall (Separates West Bedrooms from Living Room/Hallway at X = -2.34) */}
      {/* South segment (Living Room to Master Bed) */}
      <mesh position={[-2.34, 1.0, 4.43]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2.0, 2.66]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>
      {/* Door header Master Bed */}
      <mesh position={[-2.34, 1.75, 2.50]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.5, 1.20]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>
      {/* Solid center connector between bedroom doorways */}
      <mesh position={[-2.34, 1.0, 0.0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2.0, 3.80]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>
      {/* Door header Bedroom 2 */}
      <mesh position={[-2.34, 1.75, -2.50]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.5, 1.20]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>
      {/* North segment (Bathroom Hallway to Bedroom 2) */}
      <mesh position={[-2.34, 1.0, -4.43]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2.0, 2.66]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>

      {/* Horizontal Divider between Master Bed and Bedroom 2 (Z = 0, X: -6.82 to -2.44) */}
      <mesh position={[-4.63, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.38, 2.0, 0.2]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>

      {/* Bathroom Hallway South Wall (Separates Bathrooms from Hallway: Z = -1.70, X: -2.24 to 1.20) */}
      <mesh position={[-0.52, 1.0, -1.70]} castShadow receiveShadow>
        <boxGeometry args={[3.44, 2.0, 0.2]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>

      {/* Center Divider between Main Bathroom and Bathroom 2 (X = -0.42, Z: -5.76 to -1.80) */}
      <mesh position={[-0.42, 1.0, -3.78]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 2.0, 3.96]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>

      {/* Divider between Bathroom 2 and Bedroom 3 Studio (X = 1.29, Z: -5.76 to -1.80) */}
      <mesh position={[1.29, 1.0, -3.78]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 2.0, 3.96]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>

      {/* East Spine Wall (Separates Living Room from Dining Room: X = 1.29, Z = -0.3 to 5.76) */}
      {/* South segment */}
      <mesh position={[1.29, 1.0, 4.43]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 2.0, 2.66]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>
      {/* Archway header between Living and Dining */}
      <mesh position={[1.29, 1.75, 1.75]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.5, 2.70]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>
      {/* North segment connecting to Hallway */}
      <mesh position={[1.29, 1.0, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 2.0, 0.70]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>

      {/* Divider between Studio / Garage and Dining / Kitchen (Z = -0.30, X = 1.38 to 6.82) */}
      <mesh position={[4.10, 1.0, -0.30]} castShadow receiveShadow>
        <boxGeometry args={[5.44, 2.0, 0.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Divider between Bedroom 3 (Studio) and Garage Bay (X = 4.04, Z: -5.76 to -0.40) */}
      <mesh position={[4.04, 1.0, -3.08]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2.0, 5.36]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* ========================================================================= */}
      {/* 4. ROOM 1: MASTER BEDROOM (South-West: [-4.6, 2.4, 2.8])                  */}
      {/* ========================================================================= */}
      {/* Bed Headboard (Flush against South Wall at Z = 4.02) */}
      <mesh position={[-4.63, 0.72, 4.02]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.88, 0.16]} />
        <meshStandardMaterial color="#292524" roughness={0.8} />
      </mesh>
      {/* Master Bed Platform Frame */}
      <mesh position={[-4.63, 0.22, 2.74]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.36, 2.4]} />
        <meshStandardMaterial color="#1c1917" roughness={0.85} />
      </mesh>
      {/* Mattress */}
      <mesh position={[-4.63, 0.48, 2.74]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.18, 2.3]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      {/* Dual Pillows */}
      <mesh position={[-5.15, 0.62, 3.55]} castShadow>
        <boxGeometry args={[0.65, 0.10, 0.4]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
      </mesh>
      <mesh position={[-4.11, 0.62, 3.55]} castShadow>
        <boxGeometry args={[0.65, 0.10, 0.4]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
      </mesh>
      {/* Nightstands */}
      <mesh position={[-3.1, 0.28, 3.8]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.5, 0.5]} />
        <meshStandardMaterial color="#1c1917" roughness={0.7} />
      </mesh>
      <mesh position={[-6.16, 0.28, 3.8]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.5, 0.5]} />
        <meshStandardMaterial color="#1c1917" roughness={0.7} />
      </mesh>
      {/* Nightstand Lamps */}
      <mesh position={[-3.1, 0.6, 3.8]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.22, 16]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-6.16, 0.6, 3.8]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.22, 16]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.25} />
      </mesh>
      {/* Master Bedroom Area Rug */}
      <mesh position={[-4.63, 0.046, 2.8]} receiveShadow>
        <boxGeometry args={[3.2, 0.008, 3.4]} />
        <meshStandardMaterial
          color="#44403c"
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* ========================================================================= */}
      {/* 5. ROOM 2: BEDROOM 2 / GUEST (North-West: [-4.6, 2.4, -2.8])              */}
      {/* ========================================================================= */}
      {/* Guest Headboard */}
      <mesh position={[-4.63, 0.65, -4.12]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.80, 0.16]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      {/* Guest Bed Frame */}
      <mesh position={[-4.63, 0.22, -3.0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.36, 2.2]} />
        <meshStandardMaterial color="#1c1917" roughness={0.85} />
      </mesh>
      {/* Guest Mattress */}
      <mesh position={[-4.63, 0.45, -2.95]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.20, 2.0]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
      </mesh>
      {/* Guest Study Desk */}
      <mesh position={[-5.8, 0.42, -1.2]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.76, 1.5]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      {/* Laptop on desk */}
      <mesh position={[-5.8, 0.82, -1.2]} castShadow>
        <boxGeometry args={[0.4, 0.02, 0.3]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ========================================================================= */}
      {/* 6. ROOM 3: LIVING ROOM (Center-South: [-0.5, 2.4, 2.0])                  */}
      {/* ========================================================================= */}
      {/* Sectional Sofa Base */}
      <mesh position={[-0.52, 0.25, 3.6]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.42, 1.0]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>
      {/* Sofa Backrest */}
      <mesh position={[-0.52, 0.68, 4.02]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.44, 0.22]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>
      {/* Coffee Table */}
      <mesh position={[-0.52, 0.22, 2.2]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.36, 0.9]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* TV Media Console (along West spine wall) */}
      <mesh position={[-2.05, 0.35, 2.2]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.6, 2.0]} />
        <meshStandardMaterial color="#020617" roughness={0.4} />
      </mesh>
      {/* Flat Screen TV Display */}
      <mesh position={[-2.21, 1.1, 2.2]} castShadow>
        <boxGeometry args={[0.04, 0.8, 1.8]} />
        <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* Living Room Area Rug */}
      <mesh position={[-0.52, 0.046, 2.6]} receiveShadow>
        <boxGeometry args={[2.6, 0.008, 2.6]} />
        <meshStandardMaterial
          color="#334155"
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* ========================================================================= */}
      {/* 7. ROOM 4: MAIN BATHROOM (North-Center-West: [-1.4, 2.3, -3.7])           */}
      {/* ========================================================================= */}
      {/* Freestanding Bathtub */}
      <mesh position={[-1.37, 0.32, -4.7]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.58, 1.7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.08} />
      </mesh>
      {/* Vanity Basin Cabinet */}
      <mesh position={[-1.37, 0.44, -2.35]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.8, 0.55]} />
        <meshStandardMaterial color="#475569" roughness={0.3} />
      </mesh>
      {/* Ceramic Toilet */}
      <mesh position={[-1.95, 0.28, -3.4]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.5, 0.65]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.15} />
      </mesh>

      {/* ========================================================================= */}
      {/* 8. ROOM 5: BATHROOM 2 / GUEST BATH (North-Center-East: [0.6, 2.3, -3.7]) */}
      {/* ========================================================================= */}
      {/* Walk-in Glass Shower Stall Base */}
      <mesh position={[0.43, 0.08, -4.7]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.12, 1.4]} />
        <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.3} />
      </mesh>
      {/* Shower Glass Enclosure Panel */}
      <mesh position={[0.43, 1.0, -3.98]} castShadow>
        <boxGeometry args={[1.4, 1.7, 0.04]} />
        <meshStandardMaterial color="#bae6fd" transparent opacity={0.35} roughness={0.1} />
      </mesh>
      {/* Guest Vanity Sink */}
      <mesh position={[0.43, 0.44, -2.35]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.8, 0.55]} />
        <meshStandardMaterial color="#475569" roughness={0.3} />
      </mesh>
      {/* Guest Toilet */}
      <mesh position={[0.95, 0.28, -3.4]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.5, 0.65]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.15} />
      </mesh>

      {/* ========================================================================= */}
      {/* 9. ROOM 6: DINING ROOM (East-Mid-South: [2.8, 2.4, 2.6])                 */}
      {/* ========================================================================= */}
      {/* Dining Table Top */}
      <mesh position={[2.66, 0.64, 2.6]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 1.2]} />
        <meshStandardMaterial color="#451a03" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Dining Table Pedestal Legs */}
      <mesh position={[2.66, 0.31, 2.6]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.58, 16]} />
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </mesh>
      {/* Dining Chairs (4 Chairs) */}
      <mesh position={[2.66, 0.38, 1.75]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.55, 0.35]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      <mesh position={[2.66, 0.38, 3.45]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.55, 0.35]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* ========================================================================= */}
      {/* 10. ROOM 7: KITCHEN (Far-East-South: [5.6, 2.4, 2.6])                    */}
      {/* ========================================================================= */}
      {/* Kitchen Island Counter (Luxury Quartz) */}
      <mesh position={[5.48, 0.5, 2.6]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.94, 3.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      {/* Countertop Quartz Slab */}
      <mesh position={[5.48, 0.99, 2.6]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.06, 3.5]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.1} />
      </mesh>
      {/* Stainless Sink Inset */}
      <mesh position={[5.48, 1.025, 1.8]} castShadow>
        <boxGeometry args={[0.8, 0.02, 0.6]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Wall Chimney Hood */}
      <mesh position={[6.65, 1.6, 3.4]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.6, 0.9]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Double Door Refrigerator */}
      <mesh position={[6.5, 0.95, 0.7]} castShadow receiveShadow>
        <boxGeometry args={[0.64, 1.8, 0.9]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* ========================================================================= */}
      {/* 11. ROOM 8: BEDROOM 3 / OFFICE STUDIO (East-Mid-North: [2.8, 2.4, -2.8]) */}
      {/* ========================================================================= */}
      {/* Executive Work Desk */}
      <mesh position={[2.66, 0.45, -2.8]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.82, 1.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      {/* Dual Widescreen Monitors */}
      <mesh position={[2.66, 0.96, -3.2]} castShadow>
        <boxGeometry args={[1.4, 0.42, 0.08]} />
        <meshStandardMaterial color="#020617" roughness={0.15} metalness={0.8} />
      </mesh>
      {/* Studio Bookcase */}
      <mesh position={[1.55, 0.9, -1.0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 1.7, 1.4]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </mesh>

      {/* ========================================================================= */}
      {/* 12. ROOM 9: DEDICATED GARAGE BAY (Far-East-North: [5.4, 2.4, -2.9])      */}
      {/* ========================================================================= */}
      {/* Parked Vehicle - Blue Sedan */}
      <group position={[5.48, 0.0, -2.85]}>
        {/* Chassis */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.58, 3.6]} />
          <meshStandardMaterial color="#0284c7" roughness={0.25} metalness={0.75} />
        </mesh>
        {/* Cabin */}
        <mesh position={[0, 0.82, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.45, 1.9]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* 4 Wheels */}
        {[
          [-0.9, 0.22, 1.1],
          [0.9, 0.22, 1.1],
          [-0.9, 0.22, -1.1],
          [0.9, 0.22, -1.1],
        ].map(([wx, wy, wz], wi) => (
          <mesh key={`wheel-${wi}`} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, 0.16, 16]} />
            <meshStandardMaterial color="#020617" roughness={0.9} />
          </mesh>
        ))}
        {/* Headlights */}
        <mesh position={[-0.55, 0.42, -1.81]} castShadow>
          <boxGeometry args={[0.3, 0.14, 0.04]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.55, 0.42, -1.81]} castShadow>
          <boxGeometry args={[0.3, 0.14, 0.04]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.8} />
        </mesh>
      </group>
      {/* Mechanic Tool Bench */}
      <mesh position={[6.65, 0.48, -1.0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.9, 1.6]} />
        <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.5} />
      </mesh>

      {/* ========================================================================= */}
      {/* 13. ROOM 10: FRONT PORCH & ENTRANCE (South-Center: [-0.5, 2.0, 6.2])      */}
      {/* ========================================================================= */}
      {/* Porch Step Deck */}
      <mesh position={[-0.5, 0.08, 6.45]} receiveShadow castShadow>
        <boxGeometry args={[2.8, 0.16, 1.1]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      {/* Welcome Mat */}
      <mesh position={[-0.5, 0.17, 6.35]} receiveShadow>
        <boxGeometry args={[1.4, 0.02, 0.6]} />
        <meshStandardMaterial
          color="#78350f"
          roughness={0.9}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      {/* Dual Architectural Entrance Columns */}
      <mesh position={[-1.7, 1.0, 6.7]} castShadow>
        <boxGeometry args={[0.22, 2.0, 0.22]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      <mesh position={[0.7, 1.0, 6.7]} castShadow>
        <boxGeometry args={[0.22, 2.0, 0.22]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
    </group>
  );
}
