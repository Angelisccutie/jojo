/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { DeviceHitboxConfig } from '../../config/deviceHitboxes';

interface DeviceHitboxProps {
  config: DeviceHitboxConfig;
  isActive: boolean;
  onToggle: (config: DeviceHitboxConfig) => void;
  devMode?: boolean;
  isSelectedInDev?: boolean;
  onSelectInDev?: (config: DeviceHitboxConfig) => void;
}

export function DeviceHitbox({
  config,
  isActive,
  onToggle,
  devMode,
  isSelectedInDev,
  onSelectInDev,
}: DeviceHitboxProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Smoothly interpolate point light intensity between 0 and maxIntensity
  const targetIntensity = isActive ? (config.maxIntensity ?? 3.0) : 0;
  const currentIntensity = useRef(targetIntensity);

  useFrame((_, delta) => {
    if (lightRef.current && config.type === 'light') {
      // Smooth exponential decay interpolation (e.g. 10 * delta)
      currentIntensity.current = THREE.MathUtils.damp(
        currentIntensity.current,
        targetIntensity,
        8,
        delta
      );
      lightRef.current.intensity = currentIntensity.current;
    }
  });

  const hitboxSize = config.hitboxSize ?? [1.2, 1.2, 1.2];
  const isLight = config.type === 'light';
  const isDoor = config.type === 'door';

  // Distinct debug color based on type
  const devColor = isLight
    ? isActive
      ? '#f59e0b'
      : '#64748b'
    : isDoor
    ? isActive
      ? '#ef4444' // open
      : '#10b981' // closed / secure
    : '#38bdf8';

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (devMode && onSelectInDev) {
      onSelectInDev(config);
      console.log(
        `[KeepSafe 3D Dev Mode] Selected ${config.name} (${config.id}):`,
        config.position
      );
    } else {
      onToggle(config);
    }
  };

  return (
    <group position={config.position}>
      {/* 1. Real Three.js Dynamic PointLight (for lights) */}
      {isLight && (
        <pointLight
          ref={lightRef}
          color={config.lightColor || '#ffeaad'}
          distance={config.lightDistance || 8}
          decay={config.lightDecay || 2}
          castShadow={false}
        />
      )}

      {/* 2. Interactive Hitbox Mesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={hitboxSize} />
        {/* Invisible in normal mode, visible & labeled in dev/positioning mode */}
        <meshStandardMaterial
          color={hovered ? '#ffffff' : devColor}
          wireframe={devMode}
          transparent={true}
          opacity={devMode ? (isSelectedInDev ? 0.85 : 0.4) : hovered ? 0.15 : 0.0}
          emissive={devMode && isSelectedInDev ? devColor : '#000000'}
          emissiveIntensity={devMode && isSelectedInDev ? 0.6 : 0.0}
          depthWrite={devMode}
        />
      </mesh>

      {/* 3. Subtle Indicator Dot for standard view when hovered */}
      {!devMode && hovered && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color={isDoor ? '#38bdf8' : '#fbbf24'} />
        </mesh>
      )}

      {/* 4. Dev Mode 3D Floating Coordinate Tag */}
      {devMode && (
        <Html
          position={[0, (hitboxSize[1] / 2) + 0.35, 0]}
          center
          distanceFactor={18}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            className={`px-2 py-1 rounded text-[11px] font-mono whitespace-nowrap border shadow-xl transition-all ${
              isSelectedInDev
                ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold scale-110'
                : 'bg-slate-950/90 text-slate-200 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: devColor }}
              />
              <span>{config.name}</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
              [{config.position.map((n) => n.toFixed(1)).join(', ')}]
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
