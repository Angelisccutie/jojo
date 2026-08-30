/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WeatherCondition } from '../../types';

interface WeatherEnvironment3DProps {
  weather: WeatherCondition;
}

export function WeatherEnvironment3D({ weather }: WeatherEnvironment3DProps) {
  // Rain particle system
  const rainCount = 450;
  const rainPositions = useMemo(() => {
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28; // X: -14 to 14
      positions[i * 3 + 1] = Math.random() * 18 + 0.5; // Y: 0.5 to 18.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 28; // Z: -14 to 14
    }
    return positions;
  }, [rainCount]);

  const rainRef = useRef<THREE.Points>(null);

  // Snow particle system
  const snowCount = 350;
  const snowPositions = useMemo(() => {
    const positions = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = Math.random() * 18 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    return positions;
  }, [snowCount]);

  const snowRef = useRef<THREE.Points>(null);

  // Animate precipitation particles
  useFrame((_, delta) => {
    if (weather === 'rainy' && rainRef.current) {
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < rainCount; i++) {
        // Fall fast vertically
        positions[i * 3 + 1] -= delta * 22;
        // Reset when reaching ground
        if (positions[i * 3 + 1] < 0.1) {
          positions[i * 3 + 1] = 18;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (weather === 'winter' && snowRef.current) {
      const positions = snowRef.current.geometry.attributes.position.array as Float32Array;
      const time = Date.now() * 0.001;
      for (let i = 0; i < snowCount; i++) {
        // Gentle downward drift with slight lateral sway
        positions[i * 3 + 1] -= delta * 3.5;
        positions[i * 3] += Math.sin(time + i) * 0.015;
        positions[i * 3 + 2] += Math.cos(time + i * 0.5) * 0.015;

        if (positions[i * 3 + 1] < 0.1) {
          positions[i * 3 + 1] = 18;
          positions[i * 3] = (Math.random() - 0.5) * 28;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 28;
        }
      }
      snowRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Dynamic Lighting Calibration according to Weather */}
      {weather === 'sunny' && (
        <>
          {/* Warm Sun Direct Beam */}
          <directionalLight
            position={[16, 24, 14]}
            intensity={1.15}
            color="#fffbeb"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0006}
          />
          <hemisphereLight args={['#93c5fd', '#fef3c7', 0.5]} />
          <ambientLight intensity={0.35} color="#fef08a" />
        </>
      )}

      {weather === 'rainy' && (
        <>
          {/* Overcast Dark Moody Lighting */}
          <directionalLight
            position={[10, 18, 10]}
            intensity={0.25}
            color="#64748b"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0006}
          />
          <hemisphereLight args={['#334155', '#0f172a', 0.35]} />
          <ambientLight intensity={0.2} color="#475569" />

          {/* 3D Rain Particles */}
          <points ref={rainRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[rainPositions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.16}
              color="#7dd3fc"
              transparent
              opacity={0.65}
              blending={THREE.AdditiveBlending}
            />
          </points>
        </>
      )}

      {weather === 'winter' && (
        <>
          {/* Cold Frosty Crisp Lighting */}
          <directionalLight
            position={[14, 20, 12]}
            intensity={0.65}
            color="#e0f2fe"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0006}
          />
          <hemisphereLight args={['#cbd5e1', '#1e293b', 0.45]} />
          <ambientLight intensity={0.28} color="#e2e8f0" />

          {/* 3D Snow Particles */}
          <points ref={snowRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[snowPositions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.22}
              color="#ffffff"
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
            />
          </points>
        </>
      )}

      {weather === 'night' && (
        <>
          {/* Deep Midnight Moonlight */}
          <directionalLight
            position={[10, 18, 12]}
            intensity={0.3}
            color="#93c5fd"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0006}
          />
          <hemisphereLight args={['#1e293b', '#020617', 0.3]} />
          <ambientLight intensity={0.18} color="#38bdf8" />
        </>
      )}
    </group>
  );
}
